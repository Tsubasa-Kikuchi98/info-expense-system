/*
 * m_fare 運賃（03 の 4.7）。
 */
(function () {
  'use strict';

  var util = InfoExp.data.repositories.repositoryUtil;
  var base = util.simple({
    table: 'm_fare',
    keys: ['lineCode', 'validFrom', 'distanceFromX10'],
    columns: ['distanceToX10', 'validTo', 'fare', 'updatedAt'],
    orderBy: 'line_code, valid_from, distance_from_x10'
  });

  InfoExp.data.repositories.fareRepository = {
    findAll: base.findAll,
    insert: base.insert,
    update: base.update,
    remove: base.remove
  };
})();
