/*
 * 一般経費（BR-07）: 会議費の1人当たり上限・参加者の記入。
 */
(function () {
  'use strict';

  var messages = InfoExp.core.messages;

  function withComma(value) {
    return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function isBlank(value) {
    return value === null || value === undefined || String(value).trim() === '';
  }

  /**
   * 会議費（飲食）が1人当たり上限以内か（BR-07-2）。
   * 割り算をせず「精算額 ≦ 上限 × 参加人数」で判定する（BR-01-1）。
   * @param {Object} p
   * @param {number} p.amount 精算額
   * @param {number} p.attendeeCount 参加人数
   * @param {number} p.limitPerPerson 設定値 MEAL_LIMIT_PER_PERSON（利用日で引いた値）
   * @returns {boolean} 参加人数が1以上の整数でない場合は true（参加人数の未入力は別のチェックで止める）
   */
  function isMealWithinLimit(p) {
    if (typeof p.attendeeCount !== 'number' || p.attendeeCount < 1) {
      return true;
    }
    return p.amount <= p.limitPerPerson * p.attendeeCount; // BR-07-2、BR-01-1
  }

  /**
   * 一般経費の明細のチェック（BR-07、CHK-15 の参加者、CHK-24、CHK-26）。
   * @param {Object} p
   * @param {number} p.itemNo 明細番号
   * @param {Object} p.item 明細（amount・taxAmount・mealFlag・attendeeCount・attendeeNames。数値は整数または null）
   * @param {Object} p.accountRow 明細の勘定科目の m_account_title の行（未選択は null）
   * @param {number} p.mealLimit 設定値 MEAL_LIMIT_PER_PERSON（利用日で引いた値）
   * @returns {Array<Object>} エラーの配列（E-101 参加人数・参加者、E-127、E-126 の順）
   */
  function validateGeneralItem(p) {
    var errors = [];
    var item = p.item || {};
    var account = p.accountRow;
    var isMeal = item.mealFlag === true || item.mealFlag === 1 || item.mealFlag === '1';

    // CHK-15 参加者記入必須の科目（BR-07-1）
    if (account && account.attendeeRequired === 1) {
      if (isBlank(item.attendeeCount)) {
        errors.push(messages.error('E-101', ['明細' + p.itemNo + 'の参加人数'], p.itemNo, 'attendeeCount'));
      }
      if (isBlank(item.attendeeNames)) {
        errors.push(messages.error('E-101', ['明細' + p.itemNo + 'の参加者'], p.itemNo, 'attendeeNames'));
      }
    }
    // CHK-24 消費税額は精算額以下（BR-08-3）
    if (typeof item.taxAmount === 'number' && typeof item.amount === 'number' && item.taxAmount > item.amount) {
      errors.push(messages.error('E-127', [p.itemNo], p.itemNo, 'taxAmount'));
    }
    // CHK-26 会議費（飲食）の1人当たり上限（BR-07-2）
    if (account && account.mealCheck === 1 && isMeal && typeof item.amount === 'number' &&
        !isMealWithinLimit({ amount: item.amount, attendeeCount: item.attendeeCount, limitPerPerson: p.mealLimit })) {
      errors.push(messages.error('E-126', [p.itemNo, withComma(p.mealLimit)], p.itemNo, 'amount'));
    }
    return errors;
  }

  InfoExp.logic.generalExpense = {
    isMealWithinLimit: isMealWithinLimit,
    validateGeneralItem: validateGeneralItem
  };
})();
