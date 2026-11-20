/*
 * m_setting 設定値（03 の 4.11）。
 */
(function () {
  'use strict';

  var util = InfoExp.data.repositories.repositoryUtil;
  var base = util.simple({
    table: 'm_setting',
    keys: ['settingKey', 'validFrom'],
    columns: ['validTo', 'settingValue', 'description', 'updatedAt'],
    orderBy: 'setting_key, valid_from'
  });

  InfoExp.data.repositories.settingRepository = {
    findAll: base.findAll,
    insert: base.insert,
    update: base.update,
    remove: base.remove,
    findByKey: function (key) {
      return InfoExp.data.db.all('SELECT * FROM m_setting WHERE setting_key = ? ORDER BY valid_from', [key]);
    }
  };
})();
