/*
 * 出張旅費（BR-06）: 出張の要件・日当・宿泊費。
 */
(function () {
  'use strict';

  var dateUtil = InfoExp.core.dateUtil;
  var messages = InfoExp.core.messages;

  // 出張日数の上限（E-136。設定値マスタに項目がないため、02 の CHK-12 の値をここに置く）
  var MAX_TRIP_DAYS = 31;

  /**
   * 指定日時点の役職を所属・役職履歴から引く（BR-06-2）。
   * @param {Array<Object>} assignmentRows 申請者の m_assignment の行の配列
   * @param {string} date 日付（出発日）
   * @returns {string|null} 役職コード。該当なしは null（E-137）
   */
  function findPositionAt(assignmentRows, date) {
    var rows = assignmentRows || [];
    var i;
    if (!dateUtil.isValid(date)) {
      return null;
    }
    for (i = 0; i < rows.length; i += 1) {
      if (rows[i].validFrom <= date) {
        return rows[i].positionCode; // BR-06-2 出発日時点の役職
      }
    }
    return null;
  }

  /**
   * 日当を求める（BR-06-2）。
   * @param {Object} p
   * @param {string} p.tripType 出張区分（DAY／STAY）
   * @param {string} p.startDate 出発日
   * @param {string} p.endDate 帰着日
   * @param {Object} p.rateRow m_travel_rate の1行（算定役職・出発日で引いたもの）
   * @returns {{unit: number, days: number, amount: number}|null} 計算できない場合は null
   */
  function calcAllowance(p) {
    var unit;
    var days;
    if (!p.rateRow || !dateUtil.isValid(p.startDate) || !dateUtil.isValid(p.endDate)) {
      return null;
    }
    if (p.tripType === 'DAY') {
      unit = p.rateRow.allowanceDayTrip;   // BR-06-2 日帰りは日帰り日当
      days = 1;
    } else if (p.tripType === 'STAY') {
      unit = p.rateRow.allowanceStayTrip;  // BR-06-2 宿泊は宿泊出張日当
      days = dateUtil.diffDays(p.startDate, p.endDate) + 1;
    } else {
      return null;
    }
    if (days < 1) {
      return null;
    }
    return { unit: unit, days: days, amount: unit * days };
  }

  /**
   * 宿泊費の精算額を求める（BR-06-3）。
   * @param {Object} p
   * @param {number} p.actualAmount 実費
   * @param {string} p.regionCode 地域区分（A=甲地、B=乙地）
   * @param {Object} p.rateRow m_travel_rate の1行
   * @returns {{limit: number, amount: number, selfBurden: number}|null} 計算できない場合は null
   */
  function calcHotel(p) {
    var limit;
    if (!p.rateRow || typeof p.actualAmount !== 'number') {
      return null;
    }
    if (p.regionCode === 'A') {
      limit = p.rateRow.hotelLimitA;
    } else if (p.regionCode === 'B') {
      limit = p.rateRow.hotelLimitB;
    } else {
      return null;
    }
    // BR-06-3 精算額 = min（実費, 上限額）、自己負担額 = 実費 − 精算額
    return { limit: limit, amount: Math.min(p.actualAmount, limit), selfBurden: p.actualAmount - Math.min(p.actualAmount, limit) };
  }

  /**
   * 出張の要件と明細の日付のチェック（BR-06-1、BR-06-3、CHK-07〜CHK-12、CHK-17〜CHK-20）。
   * @param {Object} p
   * @param {string} p.tripType 出張区分（DAY／STAY）
   * @param {string} p.startDate 出発日
   * @param {string} p.endDate 帰着日
   * @param {number|null} p.distanceKm 片道距離（km）
   * @param {number} p.dayTripMinKm 設定値 DAY_TRIP_MIN_KM（出発日で引いた値）
   * @param {string} p.operationDate 業務日付
   * @param {Array<{itemNo: number, itemKind: string, useDate: string}>} p.items 明細（日当明細は含めなくてよい）
   * @returns {Array<Object>} エラーの配列（CHK の順）
   */
  function validateTrip(p) {
    var errors = [];
    var items = p.items || [];
    var isStartValid = dateUtil.isValid(p.startDate);
    var isEndValid = dateUtil.isValid(p.endDate);
    var isRangeValid = isStartValid && isEndValid && p.startDate <= p.endDate;
    var hotelDates = {};
    var i;
    var item;

    // CHK-07 E-121 業務日付より後（BR-01-2）
    if ((isStartValid && p.startDate > p.operationDate) || (isEndValid && p.endDate > p.operationDate)) {
      errors.push(messages.error('E-121', [p.operationDate], null, 'tripStartDate'));
    }
    if (isStartValid && isEndValid) {
      // CHK-08 E-114 帰着日 ≧ 出発日（BR-06-1）
      if (p.endDate < p.startDate) {
        errors.push(messages.error('E-114', [], null, 'tripEndDate'));
      }
      // CHK-09 E-115 宿泊は帰着日 ≧ 出発日 + 1（BR-06-1）
      if (p.tripType === 'STAY' && p.endDate === p.startDate) {
        errors.push(messages.error('E-115', [], null, 'tripEndDate'));
      }
      // CHK-10 E-116 日帰りは出発日 = 帰着日（BR-06-1）
      if (p.tripType === 'DAY' && p.endDate !== p.startDate) {
        errors.push(messages.error('E-116', [], null, 'tripEndDate'));
      }
    }
    // CHK-11 E-117 日帰りの片道距離（BR-06-1。「以上」なので下限ちょうどは可）
    if (p.tripType === 'DAY' && typeof p.distanceKm === 'number' && p.distanceKm < p.dayTripMinKm) {
      errors.push(messages.error('E-117', [p.dayTripMinKm], null, 'tripDistanceKm'));
    }
    // CHK-12 E-136 出張日数 31日以内（BR-06-1）
    if (isRangeValid && dateUtil.diffDays(p.startDate, p.endDate) + 1 > MAX_TRIP_DAYS) {
      errors.push(messages.error('E-136', [], null, 'tripEndDate'));
    }
    // CHK-17 E-118 明細の利用日は出張期間内（BR-06-1。宿泊明細は CHK-19 で見る）
    for (i = 0; i < items.length; i += 1) {
      item = items[i];
      if (isRangeValid && item.itemKind !== 'HOTEL' && item.itemKind !== 'ALLOW' && dateUtil.isValid(item.useDate) &&
          (item.useDate < p.startDate || item.useDate > p.endDate)) {
        errors.push(messages.error('E-118', [item.itemNo, p.startDate, p.endDate], item.itemNo, 'useDate'));
      }
    }
    // CHK-18 E-138 宿泊明細は宿泊出張のみ（BR-06-3）
    for (i = 0; i < items.length; i += 1) {
      if (items[i].itemKind === 'HOTEL' && p.tripType === 'DAY') {
        errors.push(messages.error('E-138', [items[i].itemNo], items[i].itemNo, 'itemKind'));
      }
    }
    // CHK-19 E-119 出発日 ≦ 宿泊日 ＜ 帰着日（BR-06-3）
    for (i = 0; i < items.length; i += 1) {
      item = items[i];
      if (item.itemKind === 'HOTEL' && p.tripType === 'STAY' && isStartValid && isEndValid && dateUtil.isValid(item.useDate) &&
          !(p.startDate <= item.useDate && item.useDate < p.endDate)) {
        errors.push(messages.error('E-119', [item.itemNo], item.itemNo, 'useDate'));
      }
    }
    // CHK-20 E-120 同じ宿泊日は1明細まで（BR-06-3）。2件目以降をエラーにする
    for (i = 0; i < items.length; i += 1) {
      item = items[i];
      if (item.itemKind === 'HOTEL' && dateUtil.isValid(item.useDate)) {
        if (hotelDates[item.useDate]) {
          errors.push(messages.error('E-120', [item.itemNo, item.useDate], item.itemNo, 'useDate'));
        }
        hotelDates[item.useDate] = true;
      }
    }
    return errors;
  }

  InfoExp.logic.travelExpense = {
    findPositionAt: findPositionAt,
    calcAllowance: calcAllowance,
    calcHotel: calcHotel,
    validateTrip: validateTrip
  };
})();
