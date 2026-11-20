/*
 * m_organization 組織（03 の 4.1）。人事マスタ取込（B01）だけが更新する。
 */
(function () {
  'use strict';

  var util = InfoExp.data.repositories.repositoryUtil;
  var base = util.simple({
    table: 'm_organization',
    keys: ['orgCode'],
    columns: ['orgName', 'orgLevel', 'parentOrgCode', 'managerEmployeeId', 'validFrom', 'validTo', 'updatedAt'],
    orderBy: 'org_code'
  });

  InfoExp.data.repositories.organizationRepository = {
    findAll: base.findAll,
    insert: base.insert,
    removeAll: base.removeAll,
    findByCode: function (orgCode) {
      return InfoExp.data.db.get('SELECT * FROM m_organization WHERE org_code = ?', [orgCode]);
    }
  };
})();
