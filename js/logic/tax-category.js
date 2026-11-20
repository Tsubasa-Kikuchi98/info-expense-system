/*
 * 税区分・消費税額・登録番号（BR-08）。
 */
(function () {
  'use strict';

  var INVOICE_NO_PATTERN = /^T[0-9]{13}$/;
  var REDUCED_RATE = 8;

  /**
   * 明細の税区分を判定する（BR-08-2。上から順に最初に当てはまるもの）。
   * @param {Object} p
   * @param {string} p.expenseType 経費種別
   * @param {string} p.itemKind 明細区分
   * @param {number} p.amount 明細の精算額
   * @param {number} p.taxRate 税率（10、8、0。一般経費以外は 10）
   * @param {string} p.invoiceNo 登録番号（未入力は空文字または null）
   * @param {string} p.receiptKind 領収書区分（NONE／RCPT／ICLOG）
   * @param {number} p.accountTaxTarget 勘定科目の「税の対象」（1=対象、0=対象外）
   * @param {number} p.specialLimit 設定値 PUBLIC_TRANSPORT_SPECIAL_LIMIT（利用日で引いた値）
   * @returns {string} 税区分コード
   */
  function judgeTaxCategory(p) {
    var isReduced = p.taxRate === REDUCED_RATE;
    var hasInvoice = p.invoiceNo !== null && p.invoiceNo !== undefined && String(p.invoiceNo).trim() !== '';
    // 順1 税の対象外の科目、または税率が対象外
    if (p.accountTaxTarget === 0 || p.taxRate === 0) {
      return 'X00';
    }
    // 順2 出張旅費（日当・宿泊・交通のすべての明細）
    if (p.expenseType === 'BT') {
      return 'S10';
    }
    // 順3 RAIL、または PUBT で精算額 ＜ 特例の上限（未満）
    if (p.itemKind === 'RAIL' || (p.itemKind === 'PUBT' && p.amount < p.specialLimit)) {
      return 'S10';
    }
    // 順4 登録番号あり
    if (hasInvoice) {
      return isReduced ? 'T08' : 'T10';
    }
    // 順5 領収書あり
    if (p.receiptKind === 'RCPT') {
      return isReduced ? 'N08' : 'N10';
    }
    // 順6 上記以外
    return isReduced ? 'Z08' : 'Z10';
  }

  /**
   * 消費税額を自動計算する（BR-08-3）。切り捨て（精算額 × 税率 ÷ (100 + 税率)）。
   * @param {number} amount 精算額
   * @param {number} taxRate 税率（10、8、0）
   * @returns {number} 消費税額（整数）。税率 0 は 0
   */
  function calcTaxAmount(amount, taxRate) {
    if (typeof amount !== 'number' || typeof taxRate !== 'number' || taxRate <= 0) {
      return 0;
    }
    return Math.floor(amount * taxRate / (100 + taxRate)); // BR-08-3、BR-01-1
  }

  /**
   * 登録番号の形式が正しいか（BR-08-4）。
   * @param {string} text
   * @returns {boolean} 「T」＋半角数字13桁なら true
   */
  function isValidInvoiceNo(text) {
    return typeof text === 'string' && INVOICE_NO_PATTERN.test(text); // BR-08-4
  }

  InfoExp.logic.taxCategory = {
    judgeTaxCategory: judgeTaxCategory,
    calcTaxAmount: calcTaxAmount,
    isValidInvoiceNo: isValidInvoiceNo
  };
})();
