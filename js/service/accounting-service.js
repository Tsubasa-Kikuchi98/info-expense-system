/*
 * 経理確認・個別支払済み登録・経理確認一覧（F-14、F-16、F-17）。経理差戻し（F-15）は approval-service.js。
 */
(function () {
  'use strict';

  var util = InfoExp.service.serviceUtil;
  var clock = InfoExp.service.clockService;
  var masterService = InfoExp.service.masterService;
  var repos = InfoExp.data.repositories;
  var reportStatus = InfoExp.logic.reportStatus;
  var approvalRoute = InfoExp.logic.approvalRoute;
  var masterLookup = InfoExp.logic.masterLookup;
  var dateUtil = InfoExp.core.dateUtil;
  var messages = InfoExp.core.messages;
  var config = InfoExp.core.config;

  var COMMENT_MAX = 200;

  function textOf(value) {
    return (value === null || value === undefined) ? '' : String(value).trim();
  }

  /**
   * 経理確認（F-14、02 の 5.4.3、BR-09-3、BR-09-4、BR-10）。
   * @param {number} reportId
   * @param {string} userId 経理担当者
   * @param {Array<{itemNo: number, accountCode: string, taxCategory: string}>} itemChanges 明細ごとの勘定科目（GEN のみ）・税区分
   * @param {string} comment コメント（任意）
   * @param {string} expectedUpdatedAt
   */
  function accountCheck(reportId, userId, itemChanges, comment, expectedUpdatedAt) {
    return util.guard(function () {
      var report = repos.expenseReportRepository.findById(reportId);
      var roles = repos.userRoleRepository.findRolesOf(userId);
      var op = clock.getOperationDate();
      var items;
      var steps;
      var state;
      var changes = {};
      var accountCodes = [];
      var changedGeneral = [];
      var accounts;
      var newLevel;
      var errors = [];
      util.checkUnchanged(report, expectedUpdatedAt);
      // E-305 自分の申請は経理確認できない
      if (roles.indexOf('ACCT') >= 0 && report.applicantId === userId) {
        util.fail('E-305', []);
      }
      steps = repos.approvalStepRepository.findRound(reportId, report.applyCount);
      if (!reportStatus.canDo({ action: 'ACCOUNT_CHECK', status: report.status, userId: userId, applicantId: report.applicantId,
        currentStep: reportStatus.findCurrentStep(steps), roles: roles })) {
        util.fail('E-203', []);
      }
      // E-303 業務日付の属する月が締め済み（BR-10）
      if (repos.batchRunRepository.hasSuccess('B03', dateUtil.monthOf(op))) {
        util.fail('E-303', [dateUtil.monthOf(op)]);
      }
      if (textOf(comment).length > COMMENT_MAX) {
        util.fail('E-102', ['コメント', COMMENT_MAX], null, 'comment');
      }
      (itemChanges || []).forEach(function (c) {
        changes[c.itemNo] = c;
      });
      items = repos.expenseItemRepository.findByReport(reportId);
      items.forEach(function (item) {
        var c = changes[item.itemNo];
        var code = item.accountCode;
        if (item.itemKind === 'GEN' && c && c.accountCode && c.accountCode !== item.accountCode) {
          code = c.accountCode;
          changedGeneral.push({ itemNo: item.itemNo, accountCode: code });
        }
        if (item.itemKind === 'GEN') {
          accountCodes.push(code);
        }
      });
      // BR-09-4 勘定科目を変えたら必要段数を再計算し、申請時の段数を超えるなら変更しない（E-304）
      if (changedGeneral.length > 0) {
        accounts = masterService.accounts();
        newLevel = approvalRoute.calcRequiredLevel({
          expenseType: report.expenseType,
          totalAmount: report.totalAmount,
          applyDate: report.submittedAt.substring(0, 10),
          ruleRows: repos.approvalRuleRepository.findAll(),
          accountCodes: accountCodes,
          accountRows: accounts,
          isLate: report.lateFlag === 1,
          lateMinLevel: masterLookup.getSettingNumber(repos.settingRepository.findAll(), 'LATE_MIN_APPROVAL_LEVEL', report.submittedAt.substring(0, 10))
        });
        if (newLevel > report.requiredLevel) {
          changedGeneral.forEach(function (c) {
            errors.push(messages.error('E-304', [c.itemNo, newLevel], c.itemNo, 'accountCode'));
          });
          return util.ng(errors);
        }
      }
      state = reportStatus.nextStateOnAccountCheck(steps);
      if (!state) {
        util.fail('E-202', []);
      }
      return util.execute(function () {
        var now = clock.now();
        var current = reportStatus.findCurrentStep(steps);
        items.forEach(function (item) {
          var c = changes[item.itemNo];
          var fields = {};
          if (!c) {
            return;
          }
          // 02 の 5.4.3 経理担当者が選んだ値をそのまま保存する（自動判定し直さない）
          if (item.itemKind === 'GEN' && c.accountCode && c.accountCode !== item.accountCode) {
            fields.accountCode = c.accountCode;
          }
          if (c.taxCategory && c.taxCategory !== item.taxCategory) {
            fields.taxCategory = c.taxCategory;
          }
          if (fields.accountCode || fields.taxCategory) {
            fields.updatedAt = now;
            repos.expenseItemRepository.updateAccounting(reportId, item.itemNo, fields);
          }
        });
        InfoExp.service.approvalService.saveStepChanges(steps, state.steps, { stepId: current.stepId, actedBy: userId, comment: textOf(comment) }, now);
        repos.expenseReportRepository.update(reportId, {
          status: state.status,
          accountingCheckedAt: now,
          accountingCheckerId: userId,
          updatedAt: now
        });
        return { msgId: 'I-301' };
      });
    });
  }

  /** 個別支払済み登録（F-17、BR-10）: 状態 70、支払方法 M、支払日時 = 処理日時 */
  function manualPaid(reportId, userId, expectedUpdatedAt) {
    return util.guard(function () {
      var report = repos.expenseReportRepository.findById(reportId);
      util.checkUnchanged(report, expectedUpdatedAt);
      if (!reportStatus.canDo({ action: 'MANUAL_PAID', status: report.status, userId: userId, applicantId: report.applicantId,
        currentStep: null, roles: repos.userRoleRepository.findRolesOf(userId), payrollRunId: report.payrollRunId })) {
        util.fail('E-203', []);
      }
      return util.execute(function () {
        var now = clock.now();
        repos.expenseReportRepository.update(reportId, { status: '70', paidAt: now, paidMethod: 'M', updatedAt: now });
        return { msgId: 'I-302' };
      });
    });
  }

  /** 経理確認一覧（F-16、02 の 5.6）。data: { rows, isOver } */
  function search(cond) {
    return util.guard(function () {
      var rows = repos.expenseReportRepository.searchForAccounting(cond || {}, config.LIST_MAX_ROWS + 1);
      return util.ok({ rows: rows.slice(0, config.LIST_MAX_ROWS), isOver: rows.length > config.LIST_MAX_ROWS });
    });
  }

  InfoExp.service.accountingService = {
    accountCheck: accountCheck,
    manualPaid: manualPaid,
    search: search
  };
})();
