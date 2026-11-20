/*
 * m_travel_rate 日当・宿泊費基準（03 の 4.10）。
 */
(function () {
  'use strict';

  var util = InfoExp.data.repositories.repositoryUtil;
  var base = util.simple({
    table: 'm_travel_rate',
    keys: ['positionCode', 'validFrom'],
    columns: ['validTo', 'allowanceDayTrip', 'allowanceStayTrip', 'hotelLimitA', 'hotelLimitB', 'updatedAt'],
    orderBy: 'position_code, valid_from'
  });

  InfoExp.data.repositories.travelRateRepository = {
    findAll: base.findAll,
    insert: base.insert,
    update: base.update,
    remove: base.remove
  };
})();
