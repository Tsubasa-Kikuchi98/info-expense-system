/*
 * m_commuter_pass 通勤定期区間（03 の 4.4）。人事マスタ取込（B01）だけが更新する。
 */
(function () {
  'use strict';

  var util = InfoExp.data.repositories.repositoryUtil;
  var base = util.simple({
    table: 'm_commuter_pass',
    keys: ['employeeId', 'validFrom', 'seq'],
    columns: ['validTo', 'lineCode', 'fromStationCode', 'toStationCode', 'updatedAt'],
    orderBy: 'employee_id, valid_from, seq'
  });

  InfoExp.data.repositories.commuterPassRepository = {
    findAll: base.findAll,
    insert: base.insert,
    removeAll: base.removeAll,
    findByEmployee: function (employeeId) {
      return InfoExp.data.db.all('SELECT * FROM m_commuter_pass WHERE employee_id = ? ORDER BY valid_from, seq', [employeeId]);
    },
    /** 駅を参照している件数（E-504） */
    countByStation: function (stationCode) {
      return InfoExp.data.db.get('SELECT COUNT(*) AS n FROM m_commuter_pass WHERE from_station_code = ? OR to_station_code = ?', [stationCode, stationCode]).n;
    }
  };
})();
