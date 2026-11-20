/*
 * 締め・支給年月・支払（BR-10）。
 */
(function () {
  'use strict';

  var dateUtil = InfoExp.core.dateUtil;

  // 支払済み更新（B05）を実行できる日（支給年月の26日以降。05 の 1.1・7章）。
  // 給与支給日（25日）は給与システムが持つ値で、本システムの設定値マスタには項目がない
  var PAYMENT_COMPLETE_DAY = '26';

  /**
   * 経理確認日時から支給年月を求める（BR-10）。支給年月 = 経理確認日の属する月の翌月。
   * @param {string} checkedAt 経理確認日時 'YYYY-MM-DD HH:MM:SS'
   * @returns {string|null} 'YYYY-MM'
   */
  function payMonthOf(checkedAt) {
    var month = dateUtil.monthOf(checkedAt);
    return month === null ? null : dateUtil.nextMonth(month); // BR-10
  }

  /**
   * 月次締めの対象か（BR-10）。状態 50 かつ 経理確認日時の日付部分 ≦ 対象年月の末日。
   * @param {Object} p
   * @param {string} p.status 申請の状態
   * @param {string} p.checkedAt 経理確認日時 'YYYY-MM-DD HH:MM:SS'
   * @param {string} p.targetMonth 対象年月 'YYYY-MM'
   * @returns {boolean}
   */
  function isCloseTarget(p) {
    var end = dateUtil.endOfMonth(p.targetMonth);  // 'YYYY-MM-DD'
    if (end === null || typeof p.checkedAt !== 'string' || p.checkedAt === '') {
      return false;
    }
    return p.status === '50' && p.checkedAt <= end;  // BR-10
  }

  /**
   * 月次締めを実行できるか（BR-10、E-409）。業務日付 ＞ 対象年月の末日。
   * @param {Object} p
   * @param {string} p.targetMonth 対象年月 'YYYY-MM'
   * @param {string} p.operationDate 業務日付
   * @returns {boolean}
   */
  function canCloseMonth(p) {
    var end = dateUtil.endOfMonth(p.targetMonth);
    if (end === null || !dateUtil.isValid(p.operationDate)) {
      return false;
    }
    return p.operationDate > end; // BR-10、05 の 1.1
  }

  /**
   * 支払済み更新を実行できるか（BR-10、E-405）。業務日付 ≧ 支給年月の26日。
   * @param {Object} p
   * @param {string} p.payMonth 支給年月 'YYYY-MM'
   * @param {string} p.operationDate 業務日付
   * @returns {boolean}
   */
  function canRunPaymentComplete(p) {
    if (!dateUtil.isValidMonth(p.payMonth) || !dateUtil.isValid(p.operationDate)) {
      return false;
    }
    return p.operationDate >= p.payMonth + '-' + PAYMENT_COMPLETE_DAY; // BR-10、05 の 1.1
  }

  InfoExp.logic.settlement = {
    payMonthOf: payMonthOf,
    isCloseTarget: isCloseTarget,
    canCloseMonth: canCloseMonth,
    canRunPaymentComplete: canRunPaymentComplete
  };
})();
