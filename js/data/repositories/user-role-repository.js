/*
 * m_user_role 利用者ロール（03 の 4.5）。
 */
(function () {
  'use strict';

  var util = InfoExp.data.repositories.repositoryUtil;
  var base = util.simple({ table: 'm_user_role', keys: ['employeeId', 'roleCode'], columns: ['updatedAt'], orderBy: 'employee_id, role_code' });

  InfoExp.data.repositories.userRoleRepository = {
    findAll: base.findAll,
    insert: base.insert,
    remove: base.remove,
    /** 社員のロールコードの配列 */
    findRolesOf: function (employeeId) {
      return InfoExp.data.db.all('SELECT role_code FROM m_user_role WHERE employee_id = ? ORDER BY role_code', [employeeId])
        .map(function (r) { return r.roleCode; });
    },
    exists: function (employeeId, roleCode) {
      return InfoExp.data.db.get('SELECT 1 AS x FROM m_user_role WHERE employee_id = ? AND role_code = ?', [employeeId, roleCode]) !== null;
    }
  };
})();
