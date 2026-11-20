/*
 * 申請の作成・下書き保存・申請・再申請・下書き削除・取下げ・表示（F-03〜F-09）。
 * 判定・計算は logic（report-validator.js ほか）を呼ぶ。DOM に触らない。
 *
 * 画面から受け取る入力 input の形:
 * { reportId（新規は null）, expenseType, title, remarks, lateReason, tripDestination, tripStartDate, tripEndDate,
 *   tripType, tripDistanceKm, items: [画面の明細（report-validator.js の items の形）], expectedUpdatedAt（既存のみ） }
 */
(function () {
  'use strict';

  var util = InfoExp.service.serviceUtil;
  var clock = InfoExp.service.clockService;
  var masterService = InfoExp.service.masterService;
  var repos = InfoExp.data.repositories;
  var validator = InfoExp.logic.reportValidator;
  var reportStatus = InfoExp.logic.reportStatus;
  var reportNumber = InfoExp.logic.reportNumber;
  var config = InfoExp.core.config;
  var messages = InfoExp.core.messages;

  var STATUS = reportStatus.STATUS;
  // 一般経費で勘定科目が未選択のまま下書き保存する場合に、列 account_code（NOT NULL・外部キー）に入れる値。
  // 一般経費では選べない科目のため、編集画面では未選択として表示する
  var UNSELECTED_ACCOUNT = '6110';

  function textOrNull(value) {
    var text = (value === null || value === undefined) ? '' : String(value).trim();
    return text === '' ? null : text;
  }

  function intOrNull(value) {
    var text = (value === null || value === undefined) ? '' : String(value).trim();
    return /^[0-9]+$/.test(text) ? parseInt(text, 10) : null;
  }

  function loadUser(userId) {
    var user = repos.employeeRepository.findById(userId);
    if (!user) {
      util.fail('E-203', []);
    }
    return user;
  }

  function rolesOf(userId) {
    return repos.userRoleRepository.findRolesOf(userId);
  }

  /** logic に渡す引数を作る */
  function buildParams(input, applicant, existing, timing) {
    return {
      timing: timing,
      operationDate: clock.getOperationDate(),
      report: {
        expenseType: existing ? existing.expenseType : input.expenseType,
        applicantId: applicant.employeeId,
        applicantOrgCode: applicant.orgCode,
        title: input.title,
        remarks: input.remarks,
        lateReason: input.lateReason,
        tripDestination: input.tripDestination,
        tripStartDate: input.tripStartDate,
        tripEndDate: input.tripEndDate,
        tripType: input.tripType,
        tripDistanceKm: input.tripDistanceKm,
        firstSubmittedAt: existing ? existing.firstSubmittedAt : null
      },
      items: input.items || [],
      masters: masterService.loadReportMasters(applicant.employeeId)
    };
  }

  /** 計算後の明細を DB の行にする */
  function toItemRow(reportId, item, accountRows, now) {
    var kind = item.itemKind;
    var account = null;
    var i;
    for (i = 0; i < accountRows.length; i += 1) {
      if (accountRows[i].accountCode === item.accountCode) {
        account = accountRows[i];
      }
    }
    return {
      reportId: reportId,
      itemNo: item.itemNo,
      itemKind: kind,
      useDate: item.useDate || '',
      description: item.description || '',
      lineCode: kind === 'RAIL' ? textOrNull(item.lineCode) : null,
      fromStationCode: kind === 'RAIL' ? textOrNull(item.fromStationCode) : null,
      toStationCode: kind === 'RAIL' ? textOrNull(item.toStationCode) : null,
      routeText: (kind === 'PUBT' || kind === 'TAXI' || kind === 'AIR') ? textOrNull(item.routeText) : null,
      tripWay: (kind === 'RAIL' || kind === 'PUBT') ? item.tripWay : null,
      fareAmount: item.fareAmount,
      deductionAmount: item.deductionAmount,
      unitAmount: (kind === 'PUBT' || kind === 'ALLOW') ? item.unitAmount : null,
      days: item.days,
      regionCode: kind === 'HOTEL' ? textOrNull(item.regionCode) : null,
      actualAmount: kind === 'HOTEL' ? item.actualAmount : null,
      limitAmount: item.limitAmount,
      accountCode: item.accountCode || UNSELECTED_ACCOUNT,
      payeeName: kind === 'GEN' ? textOrNull(item.payeeName) : null,
      taxRate: item.taxRate !== null && item.taxRate !== undefined ? item.taxRate : (account ? account.defaultTaxRate : 10),
      taxAmount: item.taxAmount !== null && item.taxAmount !== undefined ? item.taxAmount : 0,
      invoiceNo: (kind === 'RAIL' || kind === 'ALLOW') ? null : textOrNull(item.invoiceNo),
      mealFlag: (kind === 'GEN' && account && account.mealCheck === 1) ? item.mealFlag : 0,
      attendeeCount: kind === 'GEN' ? item.attendeeCount : null,
      attendeeNames: kind === 'GEN' ? textOrNull(item.attendeeNames) : null,
      payMethod: kind === 'ALLOW' ? null : textOrNull(item.payMethod),
      receiptKind: kind === 'ALLOW' ? 'NONE' : (item.receiptKind || 'NONE'),
      receiptFileName: (kind !== 'ALLOW' && item.receiptKind && item.receiptKind !== 'NONE') ? textOrNull(item.receiptFileName) : null,
      receiptRequired: item.receiptRequired || 'O',
      taxCategory: item.taxCategory || '',
      amount: item.amount !== null && item.amount !== undefined ? item.amount : 0,
      updatedAt: now
    };
  }

  function replaceItems(reportId, calc, masters, now) {
    repos.expenseItemRepository.removeByReport(reportId);
    calc.items.forEach(function (item) {
      repos.expenseItemRepository.insert(toItemRow(reportId, item, masters.accountRows, now));
    });
  }

  function insertSteps(reportId, applyCount, steps, now) {
    steps.forEach(function (s) {
      repos.approvalStepRepository.insert({
        reportId: reportId, applyCount: applyCount, stepNo: s.stepNo, stepKind: s.stepKind, approvalLevel: s.approvalLevel,
        approverId: s.approverId, stepStatus: s.stepStatus, actedBy: null, actedAt: null, actionComment: null,
        changedNote: null, updatedAt: now
      });
    });
  }

  function headerFields(input, isTrip, calc) {
    return {
      title: textOrNull(input.title) || '',
      remarks: textOrNull(input.remarks),
      lateReason: textOrNull(input.lateReason),
      tripDestination: isTrip ? textOrNull(input.tripDestination) : null,
      tripStartDate: isTrip ? textOrNull(input.tripStartDate) : null,
      tripEndDate: isTrip ? textOrNull(input.tripEndDate) : null,
      tripType: isTrip ? textOrNull(input.tripType) : null,
      tripDistanceKm: (isTrip && textOrNull(input.tripType) === 'DAY') ? intOrNull(input.tripDistanceKm) : null,
      allowancePositionCode: isTrip ? calc.allowancePositionCode : null,
      totalAmount: calc.totalAmount
    };
  }

  function loadExisting(input) {
    var existing = repos.expenseReportRepository.findById(input.reportId);
    util.checkUnchanged(existing, input.expectedUpdatedAt);
    return existing;
  }

  /**
   * 再計算（02 の 5.3.5）。保存はしない。
   * @returns {Object} 結果の data は calcReport の戻り値
   */
  function recalc(input, userId) {
    return util.guard(function () {
      var applicant = loadUser(userId);
      var existing = input.reportId ? repos.expenseReportRepository.findById(input.reportId) : null;
      return util.ok(validator.calcReport(buildParams(input, applicant, existing, 'DRAFT')));
    });
  }

  /**
   * 下書き保存（F-04）。新規は BR-11 で採番する。再申請モード（状態 30）は状態 30 のまま保存する。
   */
  function saveDraft(input, userId) {
    return util.guard(function () {
      var applicant = loadUser(userId);
      var existing = input.reportId ? loadExisting(input) : null;
      var params;
      var errors;
      var calc;
      if (!reportStatus.canDo({ action: 'SAVE_DRAFT', status: existing ? existing.status : null, userId: userId,
        applicantId: existing ? existing.applicantId : userId, currentStep: null, roles: rolesOf(userId) })) {
        util.fail('E-203', []);
      }
      params = buildParams(input, applicant, existing, 'DRAFT');
      errors = validator.validateReport(params);
      if (errors.length > 0) {
        return util.ng(errors);
      }
      calc = validator.calcReport(params);
      return util.execute(function () {
        var now = clock.now();
        var year = clock.getOperationDate().substring(0, 4);
        var fields = headerFields(input, params.report.expenseType === 'BT', calc);
        var reportId;
        if (existing) {
          reportId = existing.reportId;
          fields.updatedAt = now;
          repos.expenseReportRepository.update(reportId, fields);
        } else {
          fields.reportNo = reportNumber.nextReportNo(repos.expenseReportRepository.findReportNosOfYear(year), year); // BR-11
          fields.expenseType = input.expenseType;
          fields.applicantId = userId;
          fields.applicantOrgCode = applicant.orgCode;
          fields.status = STATUS.DRAFT;
          fields.applyCount = 0;
          fields.lateFlag = 0;
          fields.createdAt = now;
          fields.updatedAt = now;
          reportId = repos.expenseReportRepository.insert(fields);
        }
        replaceItems(reportId, calc, params.masters, now);
        return { data: { reportId: reportId }, msgId: 'I-001' };
      });
    });
  }

  /** 申請・再申請の共通処理（BR-09-3） */
  function submitCommon(input, userId, action) {
    return util.guard(function () {
      var applicant = loadUser(userId);
      var existing = input.reportId ? loadExisting(input) : null;
      var params;
      var errors;
      var calc;
      var state;
      if (!reportStatus.canDo({ action: action, status: existing ? existing.status : null, userId: userId,
        applicantId: existing ? existing.applicantId : userId, currentStep: null, roles: rolesOf(userId) })) {
        util.fail('E-203', []);
      }
      params = buildParams(input, applicant, existing, 'SUBMIT');
      errors = validator.validateReport(params);
      if (errors.length > 0) {
        return util.ng(errors);
      }
      calc = validator.calcReport(params);
      state = reportStatus.nextStateOnSubmit(calc.route.steps); // BR-09-3、BR-02-2
      return util.execute(function () {
        var now = clock.now();
        var year = clock.getOperationDate().substring(0, 4);
        var fields = headerFields(input, params.report.expenseType === 'BT', calc);
        var reportId;
        var applyCount;
        var reportNo;
        fields.status = state.status;
        fields.requiredLevel = calc.requiredLevel;
        fields.lateFlag = calc.isLate ? 1 : 0;
        fields.applicantOrgCode = applicant.orgCode;   // 申請時・再申請時の所属で更新（03 の 4.13）
        fields.submittedAt = now;
        fields.updatedAt = now;
        if (action === 'RESUBMIT') {
          reportId = existing.reportId;
          reportNo = existing.reportNo;
          applyCount = existing.applyCount + 1;       // BR-09-3 再申請: 申請回次 +1、初回申請日は変えない
          fields.applyCount = applyCount;
          repos.expenseReportRepository.update(reportId, fields);
        } else {
          applyCount = 1;
          fields.applyCount = 1;
          fields.firstSubmittedAt = now;
          if (existing) {
            reportId = existing.reportId;
            reportNo = existing.reportNo;
            repos.expenseReportRepository.update(reportId, fields);
          } else {
            reportNo = reportNumber.nextReportNo(repos.expenseReportRepository.findReportNosOfYear(year), year); // BR-11
            fields.reportNo = reportNo;
            fields.expenseType = input.expenseType;
            fields.applicantId = userId;
            fields.createdAt = now;
            reportId = repos.expenseReportRepository.insert(fields);
          }
        }
        replaceItems(reportId, calc, params.masters, now);
        insertSteps(reportId, applyCount, state.steps, now);
        return action === 'RESUBMIT'
          ? { data: { reportId: reportId }, msgId: 'I-003' }
          : { data: { reportId: reportId }, msgId: 'I-002', params: [reportNo] };
      });
    });
  }

  /** 申請（F-05） */
  function submit(input, userId) {
    return submitCommon(input, userId, 'SUBMIT');
  }

  /** 再申請（F-06） */
  function resubmit(input, userId) {
    return submitCommon(input, userId, 'RESUBMIT');
  }

  /** 下書き削除（F-08）: 申請・明細を物理削除する */
  function deleteDraft(reportId, userId, expectedUpdatedAt) {
    return util.guard(function () {
      var report = repos.expenseReportRepository.findById(reportId);
      util.checkUnchanged(report, expectedUpdatedAt);
      if (!reportStatus.canDo({ action: 'DELETE_DRAFT', status: report.status, userId: userId, applicantId: report.applicantId, currentStep: null, roles: [] })) {
        util.fail('E-203', []);
      }
      return util.execute(function () {
        repos.expenseItemRepository.removeByReport(reportId);
        repos.expenseReportRepository.remove(reportId);
        return { msgId: 'I-005' };
      });
    });
  }

  /** 取下げ（F-07、BR-09-3） */
  function withdraw(reportId, userId, expectedUpdatedAt) {
    return util.guard(function () {
      var report = repos.expenseReportRepository.findById(reportId);
      var steps;
      var state;
      util.checkUnchanged(report, expectedUpdatedAt);
      if (!reportStatus.canDo({ action: 'WITHDRAW', status: report.status, userId: userId, applicantId: report.applicantId, currentStep: null, roles: [] })) {
        util.fail('E-203', []);
      }
      steps = repos.approvalStepRepository.findRound(reportId, report.applyCount);
      state = reportStatus.nextStateOnWithdraw(steps);
      return util.execute(function () {
        var now = clock.now();
        InfoExp.service.approvalService.saveStepChanges(steps, state.steps, null, now);
        repos.expenseReportRepository.update(reportId, { status: state.status, updatedAt: now });
        return { msgId: 'I-004' };
      });
    });
  }

  /** 明細の DB の行を画面の入力の形にする */
  function toEditItem(row) {
    function str(v) {
      return (v === null || v === undefined) ? '' : String(v);
    }
    return {
      itemKind: row.itemKind,
      useDate: row.useDate,
      description: row.description,
      lineCode: str(row.lineCode),
      fromStationCode: str(row.fromStationCode),
      toStationCode: str(row.toStationCode),
      routeText: str(row.routeText),
      tripWay: str(row.tripWay),
      unitAmount: row.itemKind === 'PUBT' ? str(row.unitAmount) : '',
      regionCode: str(row.regionCode),
      actualAmount: str(row.actualAmount),
      accountCode: (row.itemKind === 'GEN' && row.accountCode === UNSELECTED_ACCOUNT) ? '' : str(row.accountCode),
      payeeName: str(row.payeeName),
      taxRate: str(row.taxRate),
      amount: (row.itemKind === 'TAXI' || row.itemKind === 'AIR' || row.itemKind === 'GEN') ? str(row.amount) : '',
      taxAmount: row.itemKind === 'GEN' ? str(row.taxAmount) : '',
      invoiceNo: str(row.invoiceNo),
      mealFlag: row.mealFlag === 1,
      attendeeCount: str(row.attendeeCount),
      attendeeNames: str(row.attendeeNames),
      payMethod: str(row.payMethod),
      receiptKind: row.receiptKind,
      receiptFileName: str(row.receiptFileName)
    };
  }

  /** 業務日付で有効な通勤定期区間（SCR-03 の表示用） */
  function passesAt(employeeId, date) {
    var stations = {};
    repos.stationRepository.findAll().forEach(function (s) {
      stations[s.stationCode] = s;
    });
    return repos.commuterPassRepository.findByEmployee(employeeId).filter(function (p) {
      return p.validFrom <= date && (!p.validTo || date <= p.validTo);
    }).map(function (p) {
      return {
        lineCode: p.lineCode,
        fromName: stations[p.fromStationCode] ? stations[p.fromStationCode].stationName : p.fromStationCode,
        toName: stations[p.toStationCode] ? stations[p.toStationCode].stationName : p.toStationCode,
        validFrom: p.validFrom,
        validTo: p.validTo
      };
    });
  }

  /**
   * SCR-03 を開くときの内容（02 の 5.3.1）。
   * @param {Object} q { id } または { type }
   * @returns data: { mode: 'NEW'|'EDIT'|'RESUBMIT'|'DETAIL', report, items, applicant, passes, backStep }
   */
  function getEditModel(q, userId) {
    return util.guard(function () {
      var applicant = InfoExp.service.userService.getUser(userId);
      var report;
      var backStep = null;
      var op = clock.getOperationDate();
      if (!q.id) {
        if (['TR', 'BT', 'GE'].indexOf(q.type) < 0) {
          util.fail('E-203', []);
        }
        return util.ok({
          mode: 'NEW',
          report: { reportId: null, reportNo: null, expenseType: q.type, status: null, applicantId: userId, tripType: 'STAY' },
          items: [],
          applicant: applicant,
          passes: passesAt(userId, op)
        });
      }
      report = repos.expenseReportRepository.findById(Number(q.id));
      if (!report || report.applicantId !== userId) {
        util.fail('E-203', []);
      }
      if (report.status !== STATUS.DRAFT && report.status !== STATUS.BACK) {
        return util.ok({ mode: 'DETAIL', report: report });
      }
      if (report.status === STATUS.BACK) {
        repos.approvalStepRepository.findRound(report.reportId, report.applyCount).forEach(function (s) {
          if (s.stepStatus === 'BACK') {
            backStep = s;
          }
        });
      }
      return util.ok({
        mode: report.status === STATUS.DRAFT ? 'EDIT' : 'RESUBMIT',
        report: report,
        items: repos.expenseItemRepository.findByReport(report.reportId)
          .filter(function (r) { return r.itemKind !== 'ALLOW'; })
          .map(toEditItem),
        applicant: applicant,
        passes: passesAt(userId, op),
        backStep: backStep
      });
    });
  }

  /**
   * 申請詳細（F-09、02 の 5.4）。表示できる利用者でなければ E-203。
   * @returns data: { report, items, rounds: [{ applyCount, steps }], currentStep, can: { ... } }
   */
  function getDetail(reportId, userId) {
    return util.guard(function () {
      var report = repos.expenseReportRepository.findById(Number(reportId));
      var roles = rolesOf(userId);
      var allSteps;
      var rounds = [];
      var byCount = {};
      var currentSteps;
      var currentStep;
      var can = {};
      if (!report) {
        util.fail('E-203', []);
      }
      // 02 の 5.4.1 申請者本人、承認者として設定された者、ACCT、ADMIN
      if (report.applicantId !== userId && !repos.approvalStepRepository.isApproverOf(report.reportId, userId) &&
          roles.indexOf('ACCT') < 0 && roles.indexOf('ADMIN') < 0) {
        util.fail('E-203', []);
      }
      allSteps = repos.approvalStepRepository.findByReport(report.reportId);
      allSteps.forEach(function (s) {
        if (!byCount[s.applyCount]) {
          byCount[s.applyCount] = { applyCount: s.applyCount, steps: [] };
          rounds.push(byCount[s.applyCount]);
        }
        byCount[s.applyCount].steps.push(s);
      });
      currentSteps = byCount[report.applyCount] ? byCount[report.applyCount].steps : [];
      currentStep = reportStatus.findCurrentStep(currentSteps);
      ['EDIT', 'WITHDRAW', 'APPROVE', 'BACK', 'REJECT', 'ACCOUNT_CHECK', 'ACCOUNT_BACK', 'MANUAL_PAID', 'CHANGE_APPROVER'].forEach(function (action) {
        can[action] = reportStatus.canDo({ action: action, status: report.status, userId: userId, applicantId: report.applicantId,
          currentStep: currentStep, roles: roles, payrollRunId: report.payrollRunId });
      });
      return util.ok({
        report: report,
        items: repos.expenseItemRepository.findByReport(report.reportId),
        rounds: rounds,
        currentSteps: currentSteps,
        currentStep: currentStep,
        roles: roles,
        isOwnReport: report.applicantId === userId,
        can: can
      });
    });
  }

  /** 申請一覧（F-03、02 の 5.2）。data: { rows, isOver } */
  function search(userId, cond) {
    return util.guard(function () {
      var rows = repos.expenseReportRepository.searchByApplicant(userId, cond || {}, config.LIST_MAX_ROWS + 1);
      return util.ok({ rows: rows.slice(0, config.LIST_MAX_ROWS), isOver: rows.length > config.LIST_MAX_ROWS });
    });
  }

  /** ホームの件数（F-02、02 の 5.1） */
  function homeCounts(userId) {
    var r = repos.expenseReportRepository;
    return {
      draft: r.countByApplicantAndStatus(userId, STATUS.DRAFT),
      back: r.countByApplicantAndStatus(userId, STATUS.BACK),
      approving: r.countByApplicantAndStatus(userId, STATUS.APPROVING),
      pending: repos.approvalStepRepository.countPendingForApprover(userId),
      waitAccount: r.countByStatus(STATUS.WAIT_ACCOUNT)
    };
  }

  InfoExp.service.reportService = {
    recalc: recalc,
    saveDraft: saveDraft,
    submit: submit,
    resubmit: resubmit,
    deleteDraft: deleteDraft,
    withdraw: withdraw,
    getEditModel: getEditModel,
    getDetail: getDetail,
    search: search,
    homeCounts: homeCounts,
    errorText: function (e) { return messages.format(e.msgId, e.params); }
  };
})();
