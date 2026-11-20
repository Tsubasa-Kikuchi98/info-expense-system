/*
 * t_expense_report 経費申請（03 の 4.13）。
 */
(function () {
  'use strict';

  var util = InfoExp.data.repositories.repositoryUtil;
  var db = InfoExp.data.db;
  var TABLE = 't_expense_report';
  var COLUMNS = ['reportNo', 'expenseType', 'applicantId', 'applicantOrgCode', 'title', 'remarks', 'status', 'totalAmount',
    'requiredLevel', 'applyCount', 'firstSubmittedAt', 'submittedAt', 'lateFlag', 'lateReason', 'tripDestination',
    'tripStartDate', 'tripEndDate', 'tripType', 'tripDistanceKm', 'allowancePositionCode', 'accountingCheckedAt',
    'accountingCheckerId', 'payMonth', 'closedAt', 'journalRunId', 'payrollRunId', 'paidAt', 'paidMethod', 'createdAt', 'updatedAt'];
  // SCR-06 の「すべて」で対象にする状態（02 の 5.6）
  var ACCOUNTING_STATUSES = ['30', '40', '50', '60', '70'];

  var SELECT_WITH_NAMES = 'SELECT r.*, e.employee_name AS applicant_name, o.org_name AS applicant_org_name ' +
    'FROM t_expense_report r ' +
    'LEFT JOIN m_employee e ON e.employee_id = r.applicant_id ' +
    'LEFT JOIN m_organization o ON o.org_code = r.applicant_org_code ';

  function findById(reportId) {
    return db.get(SELECT_WITH_NAMES + 'WHERE r.report_id = ?', [reportId]);
  }

  /** 新しい申請を登録し、申請IDを返す */
  function insert(row) {
    util.insert(TABLE, COLUMNS, row);
    return db.lastInsertId();
  }

  function update(reportId, fields) {
    return util.update(TABLE, ['reportId'], COLUMNS, { reportId: reportId }, fields);
  }

  function remove(reportId) {
    return db.run('DELETE FROM t_expense_report WHERE report_id = ?', [reportId]);
  }

  /** 西暦の申請番号の一覧（BR-11 の採番用） */
  function findReportNosOfYear(year) {
    return db.all('SELECT report_no FROM t_expense_report WHERE report_no LIKE ?', ['EX' + year + '-%'])
      .map(function (r) { return r.reportNo; });
  }

  /**
   * 申請一覧（SCR-02）: 申請者 = 利用者。更新日時の降順。
   * @param {string} applicantId
   * @param {Object} cond { status, expenseType, dateFrom, dateTo, title }
   * @param {number} limit
   */
  function searchByApplicant(applicantId, cond, limit) {
    var where = ['r.applicant_id = ?'];
    var params = [applicantId];
    if (cond.status) {
      where.push('r.status = ?');
      params.push(cond.status);
    }
    if (cond.expenseType) {
      where.push('r.expense_type = ?');
      params.push(cond.expenseType);
    }
    if (cond.dateFrom) {
      where.push('substr(r.submitted_at, 1, 10) >= ?');
      params.push(cond.dateFrom);
    }
    if (cond.dateTo) {
      where.push('substr(r.submitted_at, 1, 10) <= ?');
      params.push(cond.dateTo);
    }
    if (cond.title) {
      where.push("r.title LIKE '%' || ? || '%'");
      params.push(cond.title);
    }
    params.push(limit);
    return db.all(SELECT_WITH_NAMES + 'WHERE ' + where.join(' AND ') + ' ORDER BY r.updated_at DESC, r.report_id DESC LIMIT ?', params);
  }

  /**
   * 経理確認一覧（SCR-06）。申請日時の昇順。
   * @param {Object} cond { status, expenseType, applicant, checkedFrom, checkedTo, payMonth, journal: ''|'DONE'|'NOT' }
   * @param {number} limit
   */
  function searchForAccounting(cond, limit) {
    var where = [];
    var params = [];
    if (cond.status) {
      where.push('r.status = ?');
      params.push(cond.status);
    } else {
      where.push('r.status IN (?, ?, ?, ?, ?)');
      params = params.concat(ACCOUNTING_STATUSES);
    }
    if (cond.expenseType) {
      where.push('r.expense_type = ?');
      params.push(cond.expenseType);
    }
    if (cond.applicant) {
      where.push("(r.applicant_id LIKE ? || '%' OR e.employee_name LIKE '%' || ? || '%')");
      params.push(cond.applicant, cond.applicant);
    }
    if (cond.checkedFrom) {
      where.push('substr(r.accounting_checked_at, 1, 10) >= ?');
      params.push(cond.checkedFrom);
    }
    if (cond.checkedTo) {
      where.push('substr(r.accounting_checked_at, 1, 10) <= ?');
      params.push(cond.checkedTo);
    }
    if (cond.payMonth) {
      where.push('r.pay_month = ?');
      params.push(cond.payMonth);
    }
    if (cond.journal === 'DONE') {
      where.push('r.journal_run_id IS NOT NULL');
    } else if (cond.journal === 'NOT') {
      where.push('r.journal_run_id IS NULL');
    }
    params.push(limit);
    return db.all(SELECT_WITH_NAMES + 'WHERE ' + where.join(' AND ') + ' ORDER BY r.submitted_at, r.report_id LIMIT ?', params);
  }

  function countByApplicantAndStatus(applicantId, status) {
    return db.get('SELECT COUNT(*) AS n FROM t_expense_report WHERE applicant_id = ? AND status = ?', [applicantId, status]).n;
  }

  function countByStatus(status) {
    return db.get('SELECT COUNT(*) AS n FROM t_expense_report WHERE status = ?', [status]).n;
  }

  /** 仕訳連携の対象（B02、05 の 4.1）: 状態 50・60・70、未連携、経理確認日 ≦ 業務日付。経理確認日時・申請番号の順 */
  function findJournalTargets(operationDate) {
    return db.all(SELECT_WITH_NAMES +
      "WHERE r.status IN ('50', '60', '70') AND r.journal_run_id IS NULL AND substr(r.accounting_checked_at, 1, 10) <= ? " +
      'ORDER BY r.accounting_checked_at, r.report_no', [operationDate]);
  }

  /** 状態で申請を読む（B03 は状態 50 の行を読み、締めの判定は logic で行う）。経理確認日時・申請番号の順 */
  function findByStatus(status) {
    return db.all(SELECT_WITH_NAMES + 'WHERE r.status = ? ORDER BY r.accounting_checked_at, r.report_no', [status]);
  }

  /** 給与連携の対象（B04、05 の 6.1）: 状態 60、支給年月 = パラメータ、未連携。社員番号・申請番号の順 */
  function findPayrollTargets(payMonth) {
    return db.all('SELECT r.*, e.status AS applicant_status, e.retire_date AS applicant_retire_date FROM t_expense_report r ' +
      'LEFT JOIN m_employee e ON e.employee_id = r.applicant_id ' +
      "WHERE r.status = '60' AND r.pay_month = ? AND r.payroll_run_id IS NULL ORDER BY r.applicant_id, r.report_no", [payMonth]);
  }

  /** 支払済み更新の対象（B05、05 の7章）: 状態 60、支給年月 = パラメータ、給与連携済み */
  function findPaymentTargets(payMonth) {
    return db.all("SELECT * FROM t_expense_report WHERE status = '60' AND pay_month = ? AND payroll_run_id IS NOT NULL ORDER BY report_no", [payMonth]);
  }

  /** 状態 20 の申請（B01 の W-402 判定用） */
  function findApproving() {
    return db.all("SELECT * FROM t_expense_report WHERE status = '20' ORDER BY report_no");
  }

  InfoExp.data.repositories.expenseReportRepository = {
    findById: findById,
    insert: insert,
    update: update,
    remove: remove,
    findReportNosOfYear: findReportNosOfYear,
    searchByApplicant: searchByApplicant,
    searchForAccounting: searchForAccounting,
    countByApplicantAndStatus: countByApplicantAndStatus,
    countByStatus: countByStatus,
    findJournalTargets: findJournalTargets,
    findByStatus: findByStatus,
    findPayrollTargets: findPayrollTargets,
    findPaymentTargets: findPaymentTargets,
    findApproving: findApproving
  };
})();
