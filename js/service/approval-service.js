/*
 * 承認・差戻し・否認・承認者変更・承認待ち一覧（F-10〜F-13、F-18）。
 */
(function () {
  'use strict';

  var util = InfoExp.service.serviceUtil;
  var clock = InfoExp.service.clockService;
  var repos = InfoExp.data.repositories;
  var reportStatus = InfoExp.logic.reportStatus;
  var approvalRoute = InfoExp.logic.approvalRoute;
  var messages = InfoExp.core.messages;

  var COMMENT_MAX = 200;
  var CHANGE_REASON_MAX = 100;
  var EMP_STATUS_ACTIVE = '1';

  /**
   * logic が返した段の配列と元の配列を比べ、変わった段を更新する。
   * @param {Array} before DB から読んだ段
   * @param {Array} after logic の結果
   * @param {Object|null} acted { stepId, actedBy, comment }（処理した段）
   * @param {string} now 処理日時
   */
  function saveStepChanges(before, after, acted, now) {
    var i;
    var fields;
    for (i = 0; i < after.length; i += 1) {
      fields = null;
      if (after[i].stepStatus !== before[i].stepStatus) {
        fields = { stepStatus: after[i].stepStatus, updatedAt: now };
      }
      if (acted && after[i].stepId === acted.stepId) {
        fields = fields || { updatedAt: now };
        fields.actedBy = acted.actedBy;
        fields.actedAt = now;
        fields.actionComment = acted.comment || null;
      }
      if (fields) {
        repos.approvalStepRepository.update(after[i].stepId, fields);
      }
    }
  }

  function textOf(value) {
    return (value === null || value === undefined) ? '' : String(value).trim();
  }

  function checkComment(action, comment) {
    var isRequired = action === 'BACK' || action === 'REJECT' || action === 'ACCOUNT_BACK';
    if (isRequired && textOf(comment) === '') {
      util.fail('E-201', [], null, 'comment');
    }
    if (textOf(comment).length > COMMENT_MAX) {
      util.fail('E-102', ['コメント', COMMENT_MAX], null, 'comment');
    }
  }

  /**
   * 状態遷移を伴う操作の共通処理（BR-09-3）。
   * @param {string} action APPROVE／BACK／REJECT／ACCOUNT_BACK
   */
  function act(action, reportId, userId, comment, expectedUpdatedAt) {
    return util.guard(function () {
      var report = repos.expenseReportRepository.findById(reportId);
      var steps;
      var current;
      var state;
      util.checkUnchanged(report, expectedUpdatedAt);
      steps = repos.approvalStepRepository.findRound(reportId, report.applyCount);
      current = reportStatus.findCurrentStep(steps);
      if (!reportStatus.canDo({ action: action, status: report.status, userId: userId, applicantId: report.applicantId,
        currentStep: current, roles: repos.userRoleRepository.findRolesOf(userId) })) {
        util.fail('E-203', []);
      }
      checkComment(action, comment);
      if (action === 'APPROVE') {
        state = reportStatus.nextStateOnApprove(steps);
      } else if (action === 'REJECT') {
        state = reportStatus.nextStateOnReject(steps);
      } else {
        state = reportStatus.nextStateOnBack(steps);
      }
      if (!state) {
        util.fail('E-202', []);
      }
      return util.execute(function () {
        var now = clock.now();
        saveStepChanges(steps, state.steps, { stepId: current.stepId, actedBy: userId, comment: textOf(comment) }, now);
        repos.expenseReportRepository.update(reportId, { status: state.status, updatedAt: now });
        return { msgId: action === 'APPROVE' ? 'I-201' : (action === 'REJECT' ? 'I-203' : 'I-202') };
      });
    });
  }

  /**
   * 承認者変更（F-18、02 の 5.4.4）。
   * @param {number} reportId
   * @param {number} stepId 対象の段（承認待ち・待機の承認段）
   * @param {string} newApproverId 変更後の社員番号
   * @param {string} reason 変更理由
   */
  function changeApprover(reportId, stepId, newApproverId, reason, userId, expectedUpdatedAt) {
    return util.guard(function () {
      var report = repos.expenseReportRepository.findById(reportId);
      var steps;
      var step = null;
      var employee;
      var errors = [];
      var minPosition;
      var positionNames;
      util.checkUnchanged(report, expectedUpdatedAt);
      if (!reportStatus.canDo({ action: 'CHANGE_APPROVER', status: report.status, userId: userId, applicantId: report.applicantId,
        currentStep: null, roles: repos.userRoleRepository.findRolesOf(userId) })) {
        util.fail('E-203', []);
      }
      steps = repos.approvalStepRepository.findRound(reportId, report.applyCount);
      steps.forEach(function (s) {
        if (s.stepId === Number(stepId) && s.stepKind === 'APPROVE' && (s.stepStatus === 'CUR' || s.stepStatus === 'WAIT')) {
          step = s;
        }
      });
      if (!step) {
        util.fail('E-105', ['対象の段'], null, 'stepId');
      }
      employee = repos.employeeRepository.findById(textOf(newApproverId));
      if (!employee || employee.status !== EMP_STATUS_ACTIVE) {
        errors.push(messages.error('E-206', [], null, 'newApproverId'));
      } else if (employee.employeeId === report.applicantId) {
        errors.push(messages.error('E-207', [], null, 'newApproverId'));
      } else {
        minPosition = approvalRoute.minPositionForLevel(step.approvalLevel); // BR-02-1
        if (Number(employee.positionCode) < Number(minPosition)) {
          positionNames = InfoExp.service.masterService.codeNames('POSITION');
          errors.push(messages.error('E-208', [positionNames[minPosition] || minPosition], null, 'newApproverId'));
        }
      }
      if (textOf(reason) === '') {
        errors.push(messages.error('E-101', ['変更理由'], null, 'reason'));
      } else if (textOf(reason).length > CHANGE_REASON_MAX) {
        errors.push(messages.error('E-102', ['変更理由', CHANGE_REASON_MAX], null, 'reason'));
      }
      if (errors.length > 0) {
        return util.ng(errors);
      }
      return util.execute(function () {
        var now = clock.now();
        var note = step.approverId + '→' + employee.employeeId + ' ' + now + ' ' + userId + ' ' + textOf(reason);
        repos.approvalStepRepository.update(step.stepId, {
          approverId: employee.employeeId,
          changedNote: step.changedNote ? step.changedNote + '\n' + note : note,
          updatedAt: now
        });
        repos.expenseReportRepository.update(reportId, { updatedAt: now });
        return { msgId: 'I-204' };
      });
    });
  }

  InfoExp.service.approvalService = {
    saveStepChanges: saveStepChanges,
    approve: function (reportId, userId, comment, expectedUpdatedAt) {
      return act('APPROVE', reportId, userId, comment, expectedUpdatedAt);
    },
    back: function (reportId, userId, comment, expectedUpdatedAt) {
      return act('BACK', reportId, userId, comment, expectedUpdatedAt);
    },
    reject: function (reportId, userId, comment, expectedUpdatedAt) {
      return act('REJECT', reportId, userId, comment, expectedUpdatedAt);
    },
    accountBack: function (reportId, userId, comment, expectedUpdatedAt) {
      return act('ACCOUNT_BACK', reportId, userId, comment, expectedUpdatedAt);
    },
    changeApprover: changeApprover,
    /** 承認待ち一覧（F-13、02 の 5.5） */
    listPending: function (userId) {
      return repos.approvalStepRepository.findPendingForApprover(userId);
    }
  };
})();
