/*
 * m_assignment 所属・役職履歴（03 の 4.3）。人事マスタ取込（B01）だけが更新する。
 * 行は必ず発令日（valid_from）の昇順で返す。
 */
(function () {
  'use strict';

  var util = InfoExp.data.repositories.repositoryUtil;
  var base = util.simple({
    table: 'm_assignment',
    keys: ['employeeId', 'validFrom'],
    columns: ['validTo', 'orgCode', 'positionCode', 'updatedAt'],
    orderBy: 'valid_from, employee_id'
  });

  InfoExp.data.repositories.assignmentRepository = {
    findAll: base.findAll,
    insert: base.insert,
    removeAll: base.removeAll,
    /** 社員の所属・役職履歴（発令日の昇順） */
    findByEmployee: function (employeeId) {
      return InfoExp.data.db.all('SELECT * FROM m_assignment WHERE employee_id = ? ORDER BY valid_from', [employeeId]);
    }
  };
})();
