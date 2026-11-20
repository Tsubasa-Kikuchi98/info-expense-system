/*
 * m_employee 社員（03 の 4.2）。人事マスタ取込（B01）だけが更新する。
 */
(function () {
  'use strict';

  var util = InfoExp.data.repositories.repositoryUtil;
  var db = InfoExp.data.db;
  var COLUMNS = ['employeeName', 'employeeNameKana', 'email', 'orgCode', 'positionCode', 'hireDate', 'retireDate', 'status', 'updatedAt'];
  var base = util.simple({ table: 'm_employee', keys: ['employeeId'], columns: COLUMNS, orderBy: 'employee_id' });

  /** 組織名・役職名つきの一覧（社員番号順） */
  function findAllWithNames() {
    return db.all(
      'SELECT e.*, o.org_name, c.code_name AS position_name FROM m_employee e ' +
      'LEFT JOIN m_organization o ON o.org_code = e.org_code ' +
      'LEFT JOIN m_code c ON c.code_type = ? AND c.code = e.position_code ' +
      'ORDER BY e.employee_id', ['POSITION']);
  }

  function findById(employeeId) {
    return db.get('SELECT * FROM m_employee WHERE employee_id = ?', [employeeId]);
  }

  /** 社員番号で登録または更新する（B01） */
  function upsert(row) {
    if (findById(row.employeeId)) {
      return base.update({ employeeId: row.employeeId }, row);
    }
    return base.insert(row);
  }

  InfoExp.data.repositories.employeeRepository = {
    findAll: base.findAll,
    findAllWithNames: findAllWithNames,
    findById: findById,
    upsert: upsert
  };
})();
