/*
 * 状態遷移と操作の可否（BR-09、02 の 5.4.3・7章）。
 * 承認経路の配列（steps）は1つの申請回次の段の配列。各段は
 * { stepNo, stepKind: 'APPROVE'|'ACCOUNT', approvalLevel, approverId, stepStatus } を持つ。
 * 状態の変更だけを返し、処理者・処理日時の記録はサービス層が行う。
 */
(function () {
  'use strict';

  var STATUS = {
    DRAFT: '10',
    APPROVING: '20',
    BACK: '30',
    WAIT_ACCOUNT: '40',
    CHECKED: '50',
    PAYING: '60',
    PAID: '70',
    WITHDRAWN: '80',
    REJECTED: '90'
  };

  function hasRole(roles, role) {
    return (roles || []).indexOf(role) >= 0;
  }

  function isNewReport(status) {
    return status === null || status === undefined || status === '';
  }

  /**
   * 操作できるか（BR-09、02 の 5.4.3・7章）。画面のボタン表示とサービス層の実行前チェックの両方で使う。
   * @param {Object} p
   * @param {string} p.action 操作。'SAVE_DRAFT'／'SUBMIT'／'RESUBMIT'／'EDIT'／'DELETE_DRAFT'／'WITHDRAW'／
   *   'APPROVE'／'BACK'／'REJECT'／'ACCOUNT_CHECK'／'ACCOUNT_BACK'／'MANUAL_PAID'／'CHANGE_APPROVER'
   * @param {string|null} p.status 申請の状態（新規は null）
   * @param {string} p.userId 操作する利用者の社員番号
   * @param {string} p.applicantId 申請者の社員番号
   * @param {Object|null} p.currentStep 承認待ち（CUR）の段（なければ null）
   * @param {Array<string>} p.roles 利用者のロール（ACCT・ADMIN）
   * @param {number|null} [p.payrollRunId] 給与連携実行ID（MANUAL_PAID の判定に使う）
   * @returns {boolean}
   */
  function canDo(p) {
    var isApplicant = !!p.userId && p.userId === p.applicantId;
    var step = p.currentStep;
    var isCurrentApprover = !!step && step.stepKind === 'APPROVE' && step.stepStatus === 'CUR' && step.approverId === p.userId;
    switch (p.action) {
      case 'SAVE_DRAFT':
        return isApplicant && (isNewReport(p.status) || p.status === STATUS.DRAFT || p.status === STATUS.BACK);
      case 'SUBMIT':
        return isApplicant && (isNewReport(p.status) || p.status === STATUS.DRAFT);
      case 'RESUBMIT':
        return isApplicant && p.status === STATUS.BACK;
      case 'EDIT':
        return isApplicant && (p.status === STATUS.DRAFT || p.status === STATUS.BACK);
      case 'DELETE_DRAFT':
        return isApplicant && p.status === STATUS.DRAFT;
      case 'WITHDRAW':
        return isApplicant && (p.status === STATUS.APPROVING || p.status === STATUS.BACK); // BR-09-3
      case 'APPROVE':
      case 'BACK':
      case 'REJECT':
        return p.status === STATUS.APPROVING && isCurrentApprover; // BR-09-3
      case 'ACCOUNT_CHECK':
      case 'ACCOUNT_BACK':
        // BR-09-3 経理担当者（申請者本人を除く）
        return hasRole(p.roles, 'ACCT') && p.status === STATUS.WAIT_ACCOUNT && !isApplicant;
      case 'MANUAL_PAID':
        // BR-10 給与連携の対象外となった申請
        return hasRole(p.roles, 'ACCT') && p.status === STATUS.PAYING && (p.payrollRunId === null || p.payrollRunId === undefined);
      case 'CHANGE_APPROVER':
        return hasRole(p.roles, 'ADMIN') && p.status === STATUS.APPROVING;
      default:
        return false;
    }
  }

  function copySteps(steps) {
    var result = [];
    var i;
    var key;
    var copy;
    for (i = 0; i < (steps || []).length; i += 1) {
      copy = {};
      for (key in steps[i]) {
        if (Object.prototype.hasOwnProperty.call(steps[i], key)) {
          copy[key] = steps[i][key];
        }
      }
      result.push(copy);
    }
    return result;
  }

  /**
   * 承認待ち（CUR）の段を返す。
   * @param {Array<Object>} steps
   * @returns {Object|null}
   */
  function findCurrentStep(steps) {
    var i;
    for (i = 0; i < (steps || []).length; i += 1) {
      if (steps[i].stepStatus === 'CUR') {
        return steps[i];
      }
    }
    return null;
  }

  function cancelWaiting(steps) {
    var i;
    for (i = 0; i < steps.length; i += 1) {
      if (steps[i].stepStatus === 'WAIT') {
        steps[i].stepStatus = 'CANCEL';
      }
    }
  }

  /**
   * 申請・再申請: 承認ルート（buildRoute の steps）から新しい申請回次の承認経路を作る（BR-09-3、BR-02-2 手順5）。
   * 段1 を承認待ち、他の段を待機にし、最後に経理確認の段を付ける。
   * @param {Array<{stepNo: number, level: number, approverId: string}>} routeSteps
   * @returns {{steps: Array<Object>, status: string}}
   */
  function nextStateOnSubmit(routeSteps) {
    var steps = [];
    var route = routeSteps || [];
    var i;
    for (i = 0; i < route.length; i += 1) {
      steps.push({
        stepNo: i + 1,
        stepKind: 'APPROVE',
        approvalLevel: route[i].level,
        approverId: route[i].approverId,
        stepStatus: i === 0 ? 'CUR' : 'WAIT'
      });
    }
    steps.push({
      stepNo: route.length + 1,
      stepKind: 'ACCOUNT',
      approvalLevel: null,
      approverId: null,
      stepStatus: route.length === 0 ? 'CUR' : 'WAIT'
    });
    return { steps: steps, status: route.length === 0 ? STATUS.WAIT_ACCOUNT : STATUS.APPROVING };
  }

  /**
   * 承認（BR-09-3）。承認待ちの段を承認にし、次の段を承認待ちにする。次が経理確認の段なら状態 40。
   * @param {Array<Object>} steps
   * @returns {{steps: Array<Object>, status: string}|null} 承認待ちの承認段がなければ null
   */
  function nextStateOnApprove(steps) {
    var result = copySteps(steps);
    var current = findCurrentStep(result);
    var next = null;
    var i;
    if (!current || current.stepKind !== 'APPROVE') {
      return null;
    }
    current.stepStatus = 'OK';
    for (i = 0; i < result.length; i += 1) {
      if (result[i].stepNo === current.stepNo + 1) {
        next = result[i];
      }
    }
    if (next) {
      next.stepStatus = 'CUR';
    }
    return { steps: result, status: (!next || next.stepKind === 'ACCOUNT') ? STATUS.WAIT_ACCOUNT : STATUS.APPROVING };
  }

  /**
   * 差戻し（承認者・経理担当者）（BR-09-3）。承認待ちの段を差戻し、残りの段を取消にし、状態 30。
   * @param {Array<Object>} steps
   * @returns {{steps: Array<Object>, status: string}|null} 承認待ちの段がなければ null
   */
  function nextStateOnBack(steps) {
    var result = copySteps(steps);
    var current = findCurrentStep(result);
    if (!current) {
      return null;
    }
    current.stepStatus = 'BACK';
    cancelWaiting(result);
    return { steps: result, status: STATUS.BACK };
  }

  /**
   * 否認（BR-09-3）。承認待ちの段を否認、残りの段を取消にし、状態 90。
   * @param {Array<Object>} steps
   * @returns {{steps: Array<Object>, status: string}|null} 承認待ちの承認段がなければ null
   */
  function nextStateOnReject(steps) {
    var result = copySteps(steps);
    var current = findCurrentStep(result);
    if (!current || current.stepKind !== 'APPROVE') {
      return null;
    }
    current.stepStatus = 'NG';
    cancelWaiting(result);
    return { steps: result, status: STATUS.REJECTED };
  }

  /**
   * 取下げ（BR-09-3）。承認待ち・待機の段を取消にし、状態 80。
   * @param {Array<Object>} steps
   * @returns {{steps: Array<Object>, status: string}}
   */
  function nextStateOnWithdraw(steps) {
    var result = copySteps(steps);
    var i;
    for (i = 0; i < result.length; i += 1) {
      if (result[i].stepStatus === 'CUR' || result[i].stepStatus === 'WAIT') {
        result[i].stepStatus = 'CANCEL';
      }
    }
    return { steps: result, status: STATUS.WITHDRAWN };
  }

  /**
   * 経理確認（BR-09-3）。経理確認の段を承認にし、状態 50。
   * @param {Array<Object>} steps
   * @returns {{steps: Array<Object>, status: string}|null} 承認待ちの経理確認の段がなければ null
   */
  function nextStateOnAccountCheck(steps) {
    var result = copySteps(steps);
    var current = findCurrentStep(result);
    if (!current || current.stepKind !== 'ACCOUNT') {
      return null;
    }
    current.stepStatus = 'OK';
    return { steps: result, status: STATUS.CHECKED };
  }

  InfoExp.logic.reportStatus = {
    STATUS: STATUS,
    canDo: canDo,
    findCurrentStep: findCurrentStep,
    nextStateOnSubmit: nextStateOnSubmit,
    nextStateOnApprove: nextStateOnApprove,
    nextStateOnBack: nextStateOnBack,
    nextStateOnReject: nextStateOnReject,
    nextStateOnWithdraw: nextStateOnWithdraw,
    nextStateOnAccountCheck: nextStateOnAccountCheck
  };
})();
