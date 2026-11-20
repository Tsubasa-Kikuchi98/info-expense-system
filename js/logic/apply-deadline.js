/*
 * 申請期限と遅延申請（BR-03）。
 */
(function () {
  'use strict';

  var dateUtil = InfoExp.core.dateUtil;
  var EXPENSE_TYPE_TRIP = 'BT';

  /**
   * 申請期限を求める（BR-03）。
   * 起算日: 交通費・一般経費は明細の利用日のうち最も古い日、出張旅費は帰着日。
   * 申請期限: 起算日の属する月から months か月後の月の末日。
   * @param {Object} p
   * @param {string} p.expenseType 経費種別
   * @param {Array<string>} p.itemUseDates 明細の利用日の配列（不正な日付・空は無視する）
   * @param {string} p.tripEndDate 帰着日（出張旅費のみ）
   * @param {number} p.months 設定値 APPLY_DEADLINE_MONTHS
   * @returns {string|null} 申請期限 'YYYY-MM-DD'。起算日がなければ null
   */
  function calcDeadline(p) {
    var baseDate = null;
    var dates = p.itemUseDates || [];
    var i;
    if (p.expenseType === EXPENSE_TYPE_TRIP) {
      baseDate = dateUtil.isValid(p.tripEndDate) ? p.tripEndDate : null; // BR-03 出張旅費は帰着日
    } else {
      for (i = 0; i < dates.length; i += 1) {
        if (dateUtil.isValid(dates[i]) && (baseDate === null || dates[i] < baseDate)) {
          baseDate = dates[i]; // BR-03 利用日のうち最も古い日
        }
      }
    }
    if (baseDate === null) {
      return null;
    }
    return dateUtil.endOfMonth(dateUtil.addMonths(dateUtil.monthOf(baseDate), p.months)); // BR-03
  }

  /**
   * 遅延申請か（BR-03）。
   * 判定日 = 初回申請日（未申請なら業務日付）。判定日 ＞ 申請期限 なら遅延。
   * 差戻し後の再申請でも判定日は初回申請日のまま。
   * @param {Object} p
   * @param {string|null} p.deadline 申請期限
   * @param {string|null} p.firstSubmittedDate 初回申請日（日時を渡した場合は日付部分を使う）
   * @param {string} p.operationDate 業務日付
   * @returns {boolean}
   */
  function isLate(p) {
    var judgeDate;
    if (!p.deadline) {
      return false;
    }
    judgeDate = p.firstSubmittedDate ? String(p.firstSubmittedDate).substring(0, 10) : p.operationDate; // BR-03
    return judgeDate > p.deadline;
  }

  InfoExp.logic.applyDeadline = {
    calcDeadline: calcDeadline,
    isLate: isLate
  };
})();
