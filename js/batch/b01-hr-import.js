/*
 * B01 人事マスタ取込（05 の3章、IF-01〜IF-04）。
 * 組織・所属役職履歴・通勤定期区間は洗い替え、社員は社員番号で登録または更新（ファイルにない社員は変えない）。
 */
(function () {
  'use strict';

  var common = InfoExp.batch.batchCommon;
  var repos = InfoExp.data.repositories;
  var db = InfoExp.data.db;
  var dateUtil = InfoExp.core.dateUtil;
  var csv = InfoExp.core.csv;
  var messages = InfoExp.core.messages;
  var approvalRoute = InfoExp.logic.approvalRoute;
  var masterLookup = InfoExp.logic.masterLookup;

  // 3.2 ファイルレイアウト（見出し行の列名と順序）
  var FILES = [
    { key: 'organization', fileName: 'organization.csv', label: '組織ファイル',
      columns: ['org_code', 'org_name', 'org_level', 'parent_org_code', 'manager_employee_id', 'valid_from', 'valid_to'] },
    { key: 'employee', fileName: 'employee.csv', label: '社員ファイル',
      columns: ['employee_id', 'employee_name', 'employee_name_kana', 'email', 'org_code', 'position_code', 'hire_date', 'retire_date'] },
    { key: 'assignment', fileName: 'assignment.csv', label: '発令ファイル',
      columns: ['employee_id', 'valid_from', 'valid_to', 'org_code', 'position_code'] },
    { key: 'commuter', fileName: 'commuter.csv', label: '通勤経路ファイル',
      columns: ['employee_id', 'valid_from', 'valid_to', 'seq', 'line_code', 'from_station_code', 'to_station_code'] }
  ];

  function blankToNull(value) {
    return value === '' ? null : value;
  }

  /**
   * 人事マスタ取込を実行する。
   * @param {Object} files { organization: { name, text }, employee: ..., assignment: ..., commuter: ... }（未選択は null）
   * @param {string} userId 実行者
   */
  function run(files, userId) {
    var input = files || {};
    var fileNames = FILES.map(function (f) { return input[f.key] ? input[f.key].name : f.fileName; }).join(',');
    return common.execute('B01', null, userId, { foreignKeysOff: true }, function (ctx) {
      var errors = [];
      var parsed = {};
      var positions = InfoExp.service.masterService.codeNames('POSITION');
      var lines = InfoExp.service.masterService.codeNames('LINE');
      var stations = {};
      var orgByCode = {};
      var empById = {};
      var fileOf = {};

      repos.stationRepository.findAll().forEach(function (s) { stations[s.stationCode] = s; });

      // 手順1 4つのファイルがすべて選ばれているか（E-402）
      FILES.forEach(function (f) {
        if (!input[f.key] || typeof input[f.key].text !== 'string') {
          errors.push(messages.error('E-402', [f.label + '（' + f.fileName + '）']));
        }
      });
      if (errors.length > 0) {
        common.fail(errors);
      }

      // 手順2 見出し行（E-401 行=1）
      FILES.forEach(function (f) {
        var rows = csv.parse(input[f.key].text);
        fileOf[f.key] = input[f.key].name || f.fileName;
        if (rows.length === 0 || rows[0].join(',') !== f.columns.join(',')) {
          errors.push(messages.error('E-401', [fileOf[f.key], 1, '見出し行が「' + f.columns.join(',') + '」と一致しません']));
        }
        parsed[f.key] = rows.slice(1).map(function (values, index) {
          var row = { lineNo: index + 2 };
          f.columns.forEach(function (c, i) {
            row[c] = values[i] === undefined ? '' : values[i].trim();
          });
          return row;
        });
      });
      if (errors.length > 0) {
        common.fail(errors);
      }

      function bad(key, row, column) {
        errors.push(messages.error('E-401', [fileOf[key], row.lineNo, column + 'が不正です（値: ' + row[column] + '）']));
      }
      function check(key, row, column, isOk) {
        if (!isOk) {
          bad(key, row, column);
        }
      }
      function isDateOrBlank(value) {
        return value === '' || dateUtil.isValid(value);
      }

      // 手順3 項目ごとの必須・桁・形式・コード値（3.2）
      parsed.organization.forEach(function (r) {
        check('organization', r, 'org_code', /^[0-9]{4}$/.test(r.org_code) && !orgByCode[r.org_code]);
        orgByCode[r.org_code] = r;
        check('organization', r, 'org_name', r.org_name !== '' && r.org_name.length <= 40);
        check('organization', r, 'org_level', /^[123]$/.test(r.org_level));
        check('organization', r, 'parent_org_code', r.org_level === '1' ? r.parent_org_code === '' : /^[0-9]{4}$/.test(r.parent_org_code));
        check('organization', r, 'manager_employee_id', r.manager_employee_id === '' || /^[0-9]{6}$/.test(r.manager_employee_id));
        check('organization', r, 'valid_from', dateUtil.isValid(r.valid_from));
        check('organization', r, 'valid_to', isDateOrBlank(r.valid_to));
      });
      parsed.employee.forEach(function (r) {
        check('employee', r, 'employee_id', /^[0-9]{6}$/.test(r.employee_id) && !empById[r.employee_id]);
        empById[r.employee_id] = r;
        check('employee', r, 'employee_name', r.employee_name !== '' && r.employee_name.length <= 40);
        check('employee', r, 'employee_name_kana', r.employee_name_kana !== '' && r.employee_name_kana.length <= 40);
        check('employee', r, 'email', r.email.length <= 100 && r.email.split('@').length === 2);
        check('employee', r, 'org_code', !!orgByCode[r.org_code]);
        check('employee', r, 'position_code', !!positions[r.position_code]);
        check('employee', r, 'hire_date', dateUtil.isValid(r.hire_date));
        check('employee', r, 'retire_date', r.retire_date === '' || (dateUtil.isValid(r.retire_date) && r.retire_date >= r.hire_date));
      });
      parsed.assignment.forEach(function (r) {
        check('assignment', r, 'employee_id', !!empById[r.employee_id]);
        check('assignment', r, 'valid_from', dateUtil.isValid(r.valid_from));
        check('assignment', r, 'valid_to', r.valid_to === '' || (dateUtil.isValid(r.valid_to) && r.valid_to >= r.valid_from));
        check('assignment', r, 'org_code', !!orgByCode[r.org_code]);
        check('assignment', r, 'position_code', !!positions[r.position_code]);
      });
      parsed.commuter.forEach(function (r) {
        check('commuter', r, 'employee_id', !!empById[r.employee_id]);
        check('commuter', r, 'valid_from', dateUtil.isValid(r.valid_from));
        check('commuter', r, 'valid_to', isDateOrBlank(r.valid_to));
        check('commuter', r, 'seq', /^[123]$/.test(r.seq));
        check('commuter', r, 'line_code', !!lines[r.line_code]);
        check('commuter', r, 'from_station_code', !!stations[r.from_station_code] && stations[r.from_station_code].lineCode === r.line_code);
        check('commuter', r, 'to_station_code', !!stations[r.to_station_code] && stations[r.to_station_code].lineCode === r.line_code &&
          r.to_station_code !== r.from_station_code);
      });
      if (errors.length > 0) {
        common.fail(errors);
      }

      // 手順5 組織・所属役職履歴・通勤定期区間の洗い替え
      repos.organizationRepository.removeAll();
      repos.assignmentRepository.removeAll();
      repos.commuterPassRepository.removeAll();
      parsed.organization.forEach(function (r) {
        repos.organizationRepository.insert({
          orgCode: r.org_code, orgName: r.org_name, orgLevel: Number(r.org_level), parentOrgCode: blankToNull(r.parent_org_code),
          managerEmployeeId: blankToNull(r.manager_employee_id), validFrom: r.valid_from, validTo: blankToNull(r.valid_to), updatedAt: ctx.now
        });
      });
      // 手順6・7 社員は登録または更新。在籍区分: 退職日 ≦ 業務日付 なら 9、それ以外は 1
      parsed.employee.forEach(function (r) {
        repos.employeeRepository.upsert({
          employeeId: r.employee_id, employeeName: r.employee_name, employeeNameKana: r.employee_name_kana, email: r.email,
          orgCode: r.org_code, positionCode: r.position_code, hireDate: r.hire_date, retireDate: blankToNull(r.retire_date),
          status: (r.retire_date !== '' && r.retire_date <= ctx.operationDate) ? '9' : '1', updatedAt: ctx.now
        });
      });
      parsed.assignment.forEach(function (r) {
        repos.assignmentRepository.insert({
          employeeId: r.employee_id, validFrom: r.valid_from, validTo: blankToNull(r.valid_to), orgCode: r.org_code,
          positionCode: r.position_code, updatedAt: ctx.now
        });
      });

      // 手順8 整合チェック（3.3）
      parsed.organization.forEach(function (r) {
        var parent;
        if (r.manager_employee_id !== '' && !repos.employeeRepository.findById(r.manager_employee_id)) {
          errors.push(messages.error('E-401', [fileOf.organization, r.lineNo, '組織長社員番号が社員に存在しません（値: ' + r.manager_employee_id + '）']));
        }
        if (r.parent_org_code !== '') {
          parent = orgByCode[r.parent_org_code];
          if (!parent || Number(parent.org_level) !== Number(r.org_level) - 1) {
            errors.push(messages.error('E-401', [fileOf.organization, r.lineNo, '親組織の組織階層が不正です（値: ' + r.parent_org_code + '）']));
          }
        }
      });
      parsed.assignment.forEach(function (r, i) {
        parsed.assignment.forEach(function (s, j) {
          var rTo = r.valid_to || '9999-12-31';
          var sTo = s.valid_to || '9999-12-31';
          if (j > i && r.employee_id === s.employee_id && r.valid_from <= sTo && s.valid_from <= rTo) {
            errors.push(messages.error('E-401', [fileOf.assignment, s.lineNo, '発令の期間が重なっています（社員番号: ' + s.employee_id + '）']));
          }
        });
      });
      parsed.commuter.forEach(function (r, i) {
        var isDuplicate = parsed.commuter.some(function (s, j) {
          return j < i && s.employee_id === r.employee_id && s.valid_from === r.valid_from && s.seq === r.seq;
        });
        if (isDuplicate) {
          errors.push(messages.error('E-401', [fileOf.commuter, r.lineNo, '区間連番が重複しています（値: ' + r.seq + '）']));
        } else {
          repos.commuterPassRepository.insert({
            employeeId: r.employee_id, validFrom: r.valid_from, seq: Number(r.seq), validTo: blankToNull(r.valid_to), lineCode: r.line_code,
            fromStationCode: r.from_station_code, toStationCode: r.to_station_code, updatedAt: ctx.now
          });
        }
      });
      if (errors.length > 0) {
        common.fail(errors);
      }
      // 手順9 外部キーの確認
      if (db.all('PRAGMA foreign_key_check').length > 0) {
        common.fail([messages.error('E-401', [fileNames, 0, '外部キーの整合性に誤りがあります'])]);
      }

      return {
        recordCount: parsed.employee.length,
        totalAmount: null,
        fileName: fileNames,
        warnings: [],
        afterCommit: checkApprovers
      };
    });
  }

  /**
   * 手順11: 承認待ち・待機の承認段の承認者が、退職者、または BR-02-2 で今判定した組織長と異なる申請を数える（W-402）。
   * @returns {Array} 警告の配列
   */
  function checkApprovers() {
    var orgRows = repos.organizationRepository.findAll();
    var employeeRows = repos.employeeRepository.findAll();
    var settingRows = repos.settingRepository.findAll();
    var op = InfoExp.service.clockService.getOperationDate();
    var employees = {};
    var nos = [];
    var topRows;
    employeeRows.forEach(function (e) { employees[e.employeeId] = e; });
    topRows = settingRows.filter(function (s) { return s.settingKey === 'TOP_APPROVER_ORG'; });
    repos.expenseReportRepository.findApproving().forEach(function (report) {
      var steps = repos.approvalStepRepository.findRound(report.reportId, report.applyCount);
      var applicant = employees[report.applicantId];
      var route = approvalRoute.buildRoute({
        applicantId: report.applicantId,
        applicantOrgCode: applicant ? applicant.orgCode : report.applicantOrgCode,
        requiredLevel: report.requiredLevel,
        orgRows: orgRows,
        employeeRows: employeeRows,
        topApproverOrgCode: String(masterLookup.pickEffective(topRows, op, '設定値 TOP_APPROVER_ORG').settingValue)
      });
      var isStale = steps.some(function (s) {
        var approver = employees[s.approverId];
        if (s.stepKind !== 'APPROVE' || (s.stepStatus !== 'CUR' && s.stepStatus !== 'WAIT')) {
          return false;
        }
        if (!approver || approver.status !== '1') {
          return true;
        }
        return !route.steps.some(function (r) {
          return r.level === s.approvalLevel && r.approverId === s.approverId;
        });
      });
      if (isStale) {
        nos.push(report.reportNo);
      }
    });
    return nos.length > 0 ? [messages.error('W-402', [nos.length, nos.join(',')])] : [];
  }

  InfoExp.batch.b01HrImport = {
    run: run,
    FILES: FILES
  };
})();
