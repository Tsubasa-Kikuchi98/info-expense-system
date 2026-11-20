/*
 * マスタ参照・保守（F-19、02 の 5.7）。更新はシステム管理者（ADMIN）だけ。
 * 期間つきマスタは「新しい期間の追加」と「業務日付より後に始まる期間の削除」だけを行う（02 の 5.7 の更新ルール）。
 */
(function () {
  'use strict';

  var util = InfoExp.service.serviceUtil;
  var clock = InfoExp.service.clockService;
  var repos = InfoExp.data.repositories;
  var dateUtil = InfoExp.core.dateUtil;
  var messages = InfoExp.core.messages;

  // 期間つきマスタの定義（group: 期間をまとめるキー、fields: 期間ごとに入力する項目）
  var PERIOD_DEFS = {
    rule: { repo: 'approvalRuleRepository', group: 'expenseType', isMulti: true,
      fields: [{ name: 'amountFrom', label: '金額下限', min: 0, max: 999999999 }, { name: 'amountTo', label: '金額上限', min: 1, max: 999999999, isOptional: true },
        { name: 'requiredLevel', label: '段数', min: 1, max: 3 }] },
    rate: { repo: 'travelRateRepository', group: 'positionCode', isMulti: false,
      fields: [{ name: 'allowanceDayTrip', label: '日帰り日当', min: 0, max: 999999 }, { name: 'allowanceStayTrip', label: '宿泊出張日当', min: 0, max: 999999 },
        { name: 'hotelLimitA', label: '宿泊費上限 甲地', min: 0, max: 999999 }, { name: 'hotelLimitB', label: '宿泊費上限 乙地', min: 0, max: 999999 }] },
    setting: { repo: 'settingRepository', group: 'settingKey', isMulti: false,
      fields: [{ name: 'settingValue', label: '設定値', isText: true, maxLength: 40 }, { name: 'description', label: '説明', isText: true, maxLength: 100 }] },
    fare: { repo: 'fareRepository', group: 'lineCode', isMulti: true,
      fields: [{ name: 'distanceFromX10', label: 'キロ下限', min: 0, max: 99999 }, { name: 'distanceToX10', label: 'キロ上限', min: 0, max: 99999 },
        { name: 'fare', label: '運賃', min: 1, max: 999999 }] }
  };
  var OPERATION_DATE_KEY = 'OPERATION_DATE';
  Object.keys(PERIOD_DEFS).forEach(function (k) { PERIOD_DEFS[k].kind = k; });

  function textOf(v) {
    return (v === null || v === undefined) ? '' : String(v).trim();
  }

  function requireAdmin(userId) {
    if (repos.userRoleRepository.findRolesOf(userId).indexOf('ADMIN') < 0) {
      util.fail('E-203', []);
    }
  }

  function readField(field, raw, errors, label) {
    var text = textOf(raw);
    if (field.isText) {
      if (text === '') {
        errors.push(messages.error('E-101', [label]));
      } else if (text.length > field.maxLength) {
        errors.push(messages.error('E-102', [label, field.maxLength]));
      }
      return text;
    }
    if (text === '' && field.isOptional) {
      return null;
    }
    if (!/^[0-9]+$/.test(text) || Number(text) < field.min || Number(text) > field.max) {
      errors.push(messages.error('E-103', [label, field.min, field.max]));
      return null;
    }
    return Number(text);
  }

  /** 02 の 5.7 No.5: 金額範囲は 0円から始まり隙間なく続き、最後の行の金額上限は空（03 の 4.9、E-503） */
  function isRuleRangeValid(rows) {
    var i;
    if (rows.length === 0 || rows[0].amountFrom !== 0 || rows[rows.length - 1].amountTo !== null) {
      return false;
    }
    for (i = 0; i < rows.length - 1; i += 1) {
      if (rows[i].amountTo === null || rows[i].amountTo <= rows[i].amountFrom || rows[i].amountTo !== rows[i + 1].amountFrom) {
        return false;
      }
    }
    return true;
  }

  function periodsOf(def, groupValue) {
    var rows = repos[def.repo].findAll().filter(function (r) { return r[def.group] === groupValue; });
    var froms = [];
    rows.forEach(function (r) {
      if (froms.indexOf(r.validFrom) < 0) {
        froms.push(r.validFrom);
      }
    });
    froms.sort();
    return { rows: rows, froms: froms };
  }

  function keyOf(def, row) {
    var keys = {};
    var repoKeys = { rule: ['expenseType', 'validFrom', 'amountFrom'], rate: ['positionCode', 'validFrom'], setting: ['settingKey', 'validFrom'],
      fare: ['lineCode', 'validFrom', 'distanceFromX10'] }[def.kind];
    repoKeys.forEach(function (k) { keys[k] = row[k]; });
    return keys;
  }

  function setValidTo(def, rows, validFrom, validTo, now) {
    rows.filter(function (r) { return r.validFrom === validFrom; }).forEach(function (r) {
      repos[def.repo].update(keyOf(def, r), { validTo: validTo, updatedAt: now });
    });
  }

  /**
   * 期間つきマスタに新しい期間を追加する（02 の 5.7 No.1〜3、No.5）。
   * @param {string} kind 'rule'／'rate'／'setting'／'fare'
   * @param {string} groupValue 経費種別・役職コード・設定キー・路線コード
   * @param {string} validFrom 有効開始日
   * @param {Array<Object>} inputRows 入力行（PERIOD_DEFS の fields の値。文字列でよい）
   */
  function addPeriod(kind, groupValue, validFrom, inputRows, userId) {
    return util.guard(function () {
      var def = PERIOD_DEFS[kind];
      var op = clock.getOperationDate();
      var errors = [];
      var rows = [];
      var existing;
      var prevFrom = null;
      var nextFrom = null;

      requireAdmin(userId);
      if (!def || textOf(groupValue) === '' || (kind === 'setting' && groupValue === OPERATION_DATE_KEY)) {
        util.fail('E-105', ['対象']);
      }
      if (!dateUtil.isValid(textOf(validFrom))) {
        util.fail('E-104', ['有効開始日'], null, 'validFrom');
      }
      if (validFrom <= op) {
        util.fail('E-501', [], null, 'validFrom');                     // 02 の 5.7 No.1
      }
      existing = periodsOf(def, groupValue);
      if (existing.froms.indexOf(validFrom) >= 0) {
        util.fail('E-502', [], null, 'validFrom');                     // 02 の 5.7 No.2
      }
      (inputRows || []).forEach(function (raw, i) {
        var row = {};
        var isBlank = def.fields.every(function (f) { return textOf(raw[f.name]) === ''; });
        if (isBlank && def.isMulti) {
          return;
        }
        def.fields.forEach(function (f) {
          row[f.name] = readField(f, raw[f.name], errors, (def.isMulti ? (i + 1) + '行目の' : '') + f.label);
        });
        rows.push(row);
      });
      if (errors.length > 0) {
        return util.ng(errors);
      }
      if (rows.length === 0) {
        util.fail('E-101', [def.fields[0].label]);
      }
      if (kind === 'rule') {
        rows.sort(function (a, b) { return a.amountFrom - b.amountFrom; });
        if (!isRuleRangeValid(rows)) {
          util.fail('E-503', []);                                       // 02 の 5.7 No.5
        }
      }
      existing.froms.forEach(function (f) {
        if (f < validFrom) { prevFrom = f; }
        if (f > validFrom && nextFrom === null) { nextFrom = f; }
      });
      return util.execute(function () {
        var now = clock.now();
        // 02 の 5.7 No.3 直前の期間の有効終了日 = 新しい有効開始日の前日
        if (prevFrom !== null) {
          setValidTo(def, existing.rows, prevFrom, dateUtil.addDays(validFrom, -1), now);
        }
        rows.forEach(function (row) {
          row[def.group] = groupValue;
          row.validFrom = validFrom;
          row.validTo = nextFrom ? dateUtil.addDays(nextFrom, -1) : null;
          row.updatedAt = now;
          repos[def.repo].insert(row);
        });
        return { msgId: 'I-001' };
      });
    });
  }

  /**
   * 業務日付より後に始まる期間を削除する（02 の 5.7 No.4）。直前の期間の有効終了日を NULL（後の期間があればその前日）に戻す。
   */
  function deletePeriod(kind, groupValue, validFrom, userId) {
    return util.guard(function () {
      var def = PERIOD_DEFS[kind];
      var existing;
      var prevFrom = null;
      var nextFrom = null;

      requireAdmin(userId);
      if (!def) {
        util.fail('E-105', ['対象']);
      }
      if (!(validFrom > clock.getOperationDate())) {
        util.fail('E-501', []);
      }
      existing = periodsOf(def, groupValue);
      existing.froms.forEach(function (f) {
        if (f < validFrom) { prevFrom = f; }
        if (f > validFrom && nextFrom === null) { nextFrom = f; }
      });
      return util.execute(function () {
        var now = clock.now();
        existing.rows.filter(function (r) { return r.validFrom === validFrom; }).forEach(function (r) {
          repos[def.repo].remove(keyOf(def, r));
        });
        if (prevFrom !== null) {
          setValidTo(def, existing.rows, prevFrom, nextFrom ? dateUtil.addDays(nextFrom, -1) : null, now);
        }
        return { msgId: 'I-005' };
      });
    });
  }

  /** 勘定科目の追加・変更（02 の 5.7） */
  function saveAccount(input, isNew, userId) {
    return util.guard(function () {
      var errors = [];
      var row = {
        accountCode: textOf(input.accountCode),
        accountName: textOf(input.accountName),
        generalSelectable: Number(input.generalSelectable) ? 1 : 0,
        minApprovalLevel: readField({ min: 0, max: 3 }, input.minApprovalLevel, errors, '最低承認段数'),
        attendeeRequired: Number(input.attendeeRequired) ? 1 : 0,
        mealCheck: Number(input.mealCheck) ? 1 : 0,
        taxTarget: Number(input.taxTarget) ? 1 : 0,
        defaultTaxRate: readField({ min: 0, max: 10 }, input.defaultTaxRate, errors, '既定の税率'),
        sortOrder: readField({ min: 0, max: 999 }, input.sortOrder, errors, '表示順')
      };
      requireAdmin(userId);
      if (!/^[0-9]{4}$/.test(row.accountCode)) {
        errors.push(messages.error('E-103', ['勘定科目コード', '0000', '9999']));
      }
      if (row.accountName === '' || row.accountName.length > 20) {
        errors.push(messages.error(row.accountName === '' ? 'E-101' : 'E-102', ['勘定科目名', 20]));
      }
      if ([0, 8, 10].indexOf(row.defaultTaxRate) < 0 && row.defaultTaxRate !== null) {
        errors.push(messages.error('E-105', ['既定の税率']));
      }
      if (isNew && repos.accountTitleRepository.findByCode(row.accountCode)) {
        errors.push(messages.error('E-502', []));
      }
      if (errors.length > 0) {
        return util.ng(errors);
      }
      return util.execute(function () {
        row.updatedAt = clock.now();
        if (isNew) {
          repos.accountTitleRepository.insert(row);
        } else {
          repos.accountTitleRepository.update({ accountCode: row.accountCode }, row);
        }
        return { msgId: 'I-001' };
      });
    });
  }

  function deleteAccount(accountCode, userId) {
    return util.guard(function () {
      requireAdmin(userId);
      if (repos.accountTitleRepository.countUsage(accountCode) > 0) {
        util.fail('E-504', []);
      }
      return util.execute(function () {
        repos.accountTitleRepository.remove({ accountCode: accountCode });
        return { msgId: 'I-005' };
      });
    });
  }

  /** 駅の追加・変更（02 の 5.7） */
  function saveStation(input, isNew, userId) {
    return util.guard(function () {
      var errors = [];
      var row = {
        stationCode: textOf(input.stationCode),
        lineCode: textOf(input.lineCode),
        stationName: textOf(input.stationName),
        stationOrder: readField({ min: 1, max: 999 }, input.stationOrder, errors, '駅順'),
        distanceX10: readField({ min: 0, max: 99999 }, input.distanceX10, errors, '営業キロ（0.1km）')
      };
      requireAdmin(userId);
      if (!/^[A-Z]{2}[0-9]{2}$/.test(row.stationCode) || row.stationCode.substring(0, 2) !== row.lineCode) {
        errors.push(messages.error('E-103', ['駅コード（路線コード＋2桁）', '00', '99']));
      }
      if (row.stationName === '' || row.stationName.length > 20) {
        errors.push(messages.error(row.stationName === '' ? 'E-101' : 'E-102', ['駅名', 20]));
      }
      if (isNew && repos.stationRepository.findByCode(row.stationCode)) {
        errors.push(messages.error('E-502', []));
      }
      if (errors.length > 0) {
        return util.ng(errors);
      }
      return util.execute(function () {
        row.updatedAt = clock.now();
        if (isNew) {
          repos.stationRepository.insert(row);
        } else {
          repos.stationRepository.update({ stationCode: row.stationCode }, row);
        }
        return { msgId: 'I-001' };
      });
    });
  }

  function deleteStation(stationCode, userId) {
    return util.guard(function () {
      requireAdmin(userId);
      if (repos.stationRepository.countUsage(stationCode) > 0 || repos.commuterPassRepository.countByStation(stationCode) > 0) {
        util.fail('E-504', []);
      }
      return util.execute(function () {
        repos.stationRepository.remove({ stationCode: stationCode });
        return { msgId: 'I-005' };
      });
    });
  }

  /** ロールの追加・削除（02 の 5.7） */
  function addRole(employeeId, roleCode, userId) {
    return util.guard(function () {
      requireAdmin(userId);
      if (!repos.employeeRepository.findById(textOf(employeeId))) {
        util.fail('E-206', []);
      }
      if (roleCode !== 'ACCT' && roleCode !== 'ADMIN') {
        util.fail('E-105', ['ロール']);
      }
      if (repos.userRoleRepository.exists(textOf(employeeId), roleCode)) {
        util.fail('E-502', []);
      }
      return util.execute(function () {
        repos.userRoleRepository.insert({ employeeId: textOf(employeeId), roleCode: roleCode, updatedAt: clock.now() });
        return { msgId: 'I-001' };
      });
    });
  }

  function deleteRole(employeeId, roleCode, userId) {
    return util.guard(function () {
      requireAdmin(userId);
      return util.execute(function () {
        repos.userRoleRepository.remove({ employeeId: employeeId, roleCode: roleCode });
        return { msgId: 'I-005' };
      });
    });
  }

  /** 参照用の一覧 */
  function list(name) {
    var map = {
      rule: 'approvalRuleRepository', rate: 'travelRateRepository', setting: 'settingRepository', fare: 'fareRepository',
      account: 'accountTitleRepository', station: 'stationRepository', role: 'userRoleRepository', org: 'organizationRepository',
      employee: 'employeeRepository', assignment: 'assignmentRepository', pass: 'commuterPassRepository', code: 'codeRepository'
    };
    return repos[map[name]].findAll();
  }

  InfoExp.service.masterMaintenanceService = {
    PERIOD_DEFS: PERIOD_DEFS,
    list: list,
    addPeriod: addPeriod,
    deletePeriod: deletePeriod,
    saveAccount: saveAccount,
    deleteAccount: deleteAccount,
    saveStation: saveStation,
    deleteStation: deleteStation,
    addRole: addRole,
    deleteRole: deleteRole
  };
})();
