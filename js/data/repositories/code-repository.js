/*
 * m_code コード（03 の 4.12・6章）。初期データのみ。
 */
(function () {
  'use strict';

  var util = InfoExp.data.repositories.repositoryUtil;
  var base = util.simple({ table: 'm_code', keys: ['codeType', 'code'], columns: ['codeName', 'sortOrder', 'updatedAt'], orderBy: 'code_type, sort_order' });

  InfoExp.data.repositories.codeRepository = {
    findAll: base.findAll,
    findByType: function (codeType) {
      return InfoExp.data.db.all('SELECT * FROM m_code WHERE code_type = ? ORDER BY sort_order', [codeType]);
    }
  };
})();
