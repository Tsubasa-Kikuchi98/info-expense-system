/*
 * 鉄道運賃と通勤定期区間の控除（BR-05）。
 */
(function () {
  'use strict';

  var ConfigError = InfoExp.core.ConfigError;

  function isEffective(row, baseDate) {
    return row.validFrom <= baseDate && (row.validTo === null || row.validTo === undefined || row.validTo === '' || baseDate <= row.validTo);
  }

  /**
   * 運賃を求める（BR-05-1）。
   * 運賃マスタで、路線・基準日（利用日）・キロ下限 ≦ 乗車キロ ≦ キロ上限 の行の運賃。
   * @param {Object} p
   * @param {string} p.lineCode 路線コード
   * @param {number} p.distanceX10 乗車キロ（0.1km 単位の整数）
   * @param {string} p.useDate 利用日（基準日）
   * @param {Array<Object>} p.fareRows m_fare の行の配列
   * @returns {number|null} 運賃。該当なしは null（E-131）
   * @throws {InfoExp.core.ConfigError} 該当する行が2件以上（BR-01-4）
   */
  function calcFare(p) {
    var hits = [];
    var rows = p.fareRows || [];
    var i;
    var row;
    for (i = 0; i < rows.length; i += 1) {
      row = rows[i];
      if (row.lineCode === p.lineCode && row.distanceFromX10 <= p.distanceX10 && p.distanceX10 <= row.distanceToX10 &&
          isEffective(row, p.useDate)) {
        hits.push(row); // BR-05-1
      }
    }
    if (hits.length === 0) {
      return null;
    }
    if (hits.length > 1) {
      throw new ConfigError('運賃 ' + p.lineCode, p.useDate, hits.length);
    }
    return hits[0].fare;
  }

  function findStation(stationRows, code) {
    var i;
    for (i = 0; i < (stationRows || []).length; i += 1) {
      if (stationRows[i].stationCode === code) {
        return stationRows[i];
      }
    }
    return null;
  }

  function resultOf(result, fare, deduction, unitAfter, amount) {
    return { result: result, fare: fare, deduction: deduction, unitAfter: unitAfter, amount: amount };
  }

  /**
   * 鉄道（運賃算定）の明細の運賃・控除額・精算額を求める（BR-05-1、BR-05-2）。
   * @param {Object} p
   * @param {string} p.lineCode 路線コード
   * @param {string} p.fromStationCode 乗車駅
   * @param {string} p.toStationCode 降車駅
   * @param {string} p.useDate 利用日（基準日）
   * @param {number} p.tripWay 1=片道、2=往復
   * @param {Array<Object>} p.stationRows m_station の行の配列
   * @param {Array<Object>} p.fareRows m_fare の行の配列
   * @param {Array<Object>} p.passRows 申請者の通勤定期区間（m_commuter_pass の行の配列。全期間を渡してよい）
   * @returns {{result: string, fare: (number|null), deduction: (number|null), unitAfter: (number|null), amount: number}}
   *   result: 'OK'（控除なしを含む）／'ALL_INSIDE'（全区間が定期区間内。E-113）／
   *   'NO_FARE'（運賃を算定できない。E-131）／'SAME_STATION'（同じ駅。E-112）。
   *   OK 以外の amount は 0。ALL_INSIDE の fare は控除前の運賃、deduction・unitAfter は null
   */
  function calcRailItem(p) {
    var from;
    var to;
    var tMin;
    var tMax;
    var fare;
    var way = Number(p.tripWay) === 2 ? 2 : 1;
    var passes = [];
    var passRows = p.passRows || [];
    var i;
    var a;
    var b;
    var cursor;
    var parts = [];
    var isOverlapped = false;
    var outsideFare = 0;
    var partFare;
    var unitAfter;
    var deduction;

    if (p.fromStationCode === p.toStationCode) {
      return resultOf('SAME_STATION', null, null, null, 0); // CHK-21
    }
    from = findStation(p.stationRows, p.fromStationCode);
    to = findStation(p.stationRows, p.toStationCode);
    if (!from || !to || from.lineCode !== p.lineCode || to.lineCode !== p.lineCode) {
      return resultOf('NO_FARE', null, null, null, 0);
    }

    // BR-05-1 乗車キロ = |降車駅の営業キロ − 乗車駅の営業キロ|。向きは関係しない
    tMin = Math.min(from.distanceX10, to.distanceX10);
    tMax = Math.max(from.distanceX10, to.distanceX10);
    fare = calcFare({ lineCode: p.lineCode, distanceX10: tMax - tMin, useDate: p.useDate, fareRows: p.fareRows });
    if (fare === null) {
      return resultOf('NO_FARE', null, null, null, 0); // BR-05-1 該当なしは E-131
    }

    // BR-05-2 利用日に有効な、同じ路線の定期区間
    for (i = 0; i < passRows.length; i += 1) {
      if (passRows[i].lineCode === p.lineCode && isEffective(passRows[i], p.useDate)) {
        a = findStation(p.stationRows, passRows[i].fromStationCode);
        b = findStation(p.stationRows, passRows[i].toStationCode);
        if (a && b) {
          passes.push([Math.min(a.distanceX10, b.distanceX10), Math.max(a.distanceX10, b.distanceX10)]);
        }
      }
    }
    passes.sort(function (x, y) { return x[0] - y[0]; });

    // 乗車区間 T のうち定期区間 P に含まれない部分を求める（端で接するだけは重ならない）
    cursor = tMin;
    for (i = 0; i < passes.length; i += 1) {
      if (passes[i][1] > tMin && passes[i][0] < tMax) {
        isOverlapped = true;
        if (passes[i][0] > cursor) {
          parts.push([cursor, passes[i][0]]);
        }
        cursor = Math.max(cursor, passes[i][1]);
      }
    }
    if (!isOverlapped) {
      // BR-05-2 定期区間なし・重なりなし → 控除なし
      return resultOf('OK', fare, 0, fare, fare * way);
    }
    if (cursor < tMax) {
      parts.push([cursor, tMax]);
    }
    if (parts.length === 0) {
      return resultOf('ALL_INSIDE', fare, null, null, 0); // BR-05-2 全区間が定期区間内（E-113）
    }

    // BR-05-2 一部重なる: 定期区間外の部分ごとの運賃の合計
    for (i = 0; i < parts.length; i += 1) {
      partFare = calcFare({ lineCode: p.lineCode, distanceX10: parts[i][1] - parts[i][0], useDate: p.useDate, fareRows: p.fareRows });
      if (partFare === null) {
        return resultOf('NO_FARE', null, null, null, 0);
      }
      outsideFare += partFare;
    }
    unitAfter = Math.min(outsideFare, fare);     // BR-05-2
    deduction = fare - unitAfter;
    return resultOf('OK', fare, deduction, unitAfter, unitAfter * way);
  }

  InfoExp.logic.railFare = {
    calcFare: calcFare,
    calcRailItem: calcRailItem
  };
})();
