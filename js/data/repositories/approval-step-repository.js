/*
 * t_approval_step 承認経路（03 の 4.15）。
 */
(function () {
  'use strict';

  var util = InfoExp.data.repositories.repositoryUtil;
  var db = InfoExp.data.db;
  var COLUMNS = ['reportId', 'applyCount', 'stepNo', 'stepKind', 'approvalLevel', 'approverId', 'stepStatus', 'actedBy',
    'actedAt', 'actionComment', 'changedNote', 'updatedAt'];
  var UPDATE_COLUMNS = ['approverId', 'stepStatus', 'actedBy', 'actedAt', 'actionComment', 'changedNote', 'updatedAt'];

  var SELECT_WITH_NAMES = 'SELECT s.*, a.employee_name AS approver_name, b.employee_name AS acted_by_name ' +
    'FROM t_approval_step s ' +
    'LEFT JOIN m_employee a ON a.employee_id = s.approver_id ' +
    'LEFT JOIN m_employee b ON b.employee_id = s.acted_by ';

  InfoExp.data.repositories.approvalStepRepository = {
    /** 申請の全回次の承認経路（最新の回次を先に、段順） */
    findByReport: function (reportId) {
      return db.all(SELECT_WITH_NAMES + 'WHERE s.report_id = ? ORDER BY s.apply_count DESC, s.step_no', [reportId]);
    },
    /** 1つの申請回次の承認経路（段順） */
    findRound: function (reportId, applyCount) {
      return db.all(SELECT_WITH_NAMES + 'WHERE s.report_id = ? AND s.apply_count = ? ORDER BY s.step_no', [reportId, applyCount]);
    },
    insert: function (row) {
      return util.insert('t_approval_step', COLUMNS, row);
    },
    update: function (stepId, fields) {
      return util.update('t_approval_step', ['stepId'], UPDATE_COLUMNS, { stepId: stepId }, fields);
    },
    /** 承認待ち一覧（SCR-05）: 承認者 = 利用者、承認待ち。申請日時の昇順 */
    findPendingForApprover: function (approverId) {
      return db.all('SELECT s.step_id, s.approval_level, r.*, e.employee_name AS applicant_name FROM t_approval_step s ' +
        'JOIN t_expense_report r ON r.report_id = s.report_id ' +
        'LEFT JOIN m_employee e ON e.employee_id = r.applicant_id ' +
        "WHERE s.approver_id = ? AND s.step_status = 'CUR' AND s.step_kind = 'APPROVE' " +
        'ORDER BY r.submitted_at, r.report_id', [approverId]);
    },
    countPendingForApprover: function (approverId) {
      return db.get("SELECT COUNT(*) AS n FROM t_approval_step WHERE approver_id = ? AND step_status = 'CUR' AND step_kind = 'APPROVE'", [approverId]).n;
    },
    /** いずれかの申請回次の承認経路に承認者として設定されているか（02 の 5.4.1） */
    isApproverOf: function (reportId, employeeId) {
      return db.get('SELECT 1 AS x FROM t_approval_step WHERE report_id = ? AND approver_id = ? LIMIT 1', [reportId, employeeId]) !== null;
    }
  };
})();
