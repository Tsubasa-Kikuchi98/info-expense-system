/*
 * m_station 駅（03 の 4.6）。
 */
(function () {
  'use strict';

  var util = InfoExp.data.repositories.repositoryUtil;
  var base = util.simple({
    table: 'm_station',
    keys: ['stationCode'],
    columns: ['lineCode', 'stationName', 'stationOrder', 'distanceX10', 'updatedAt'],
    orderBy: 'line_code, station_order'
  });

  InfoExp.data.repositories.stationRepository = {
    findAll: base.findAll,
    insert: base.insert,
    update: base.update,
    remove: base.remove,
    findByCode: function (code) {
      return InfoExp.data.db.get('SELECT * FROM m_station WHERE station_code = ?', [code]);
    },
    /** 明細から参照されている件数（E-504） */
    countUsage: function (code) {
      return InfoExp.data.db.get('SELECT COUNT(*) AS n FROM t_expense_item WHERE from_station_code = ? OR to_station_code = ?', [code, code]).n;
    }
  };
})();
