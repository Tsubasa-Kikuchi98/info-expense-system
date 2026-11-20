/*
 * 領収書の要否（BR-04）。
 */
(function () {
  'use strict';

  var messages = InfoExp.core.messages;
  var ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];

  /**
   * 明細の領収書の要否を判定する（BR-04）。
   * @param {Object} p
   * @param {string} p.itemKind 明細区分
   * @param {number} p.amount 明細の精算額（往復の場合は往復の合計）
   * @param {number} p.minGeneral 設定値 RECEIPT_MIN_GENERAL（利用日で引いた値）
   * @param {number} p.minPublicTransport 設定値 RECEIPT_MIN_PUBLIC_TRANSPORT（利用日で引いた値）
   * @returns {string|null} 'R'=必須、'O'=任意・不要、'X'=添付不可。不明な明細区分は null
   */
  function judgeReceiptRequired(p) {
    switch (p.itemKind) {
      case 'RAIL':
        return 'O';                                                      // BR-04
      case 'PUBT':
        return p.amount >= p.minPublicTransport ? 'R' : 'O';             // BR-04
      case 'TAXI':
      case 'AIR':
      case 'HOTEL':
        return 'R';                                                      // BR-04
      case 'ALLOW':
        return 'X';                                                      // BR-04
      case 'GEN':
        return p.amount > p.minGeneral ? 'R' : 'O';                     // BR-04
      default:
        return null;
    }
  }

  function extensionOf(fileName) {
    var index = fileName.lastIndexOf('.');
    return index < 0 ? '' : fileName.substring(index + 1).toLowerCase();
  }

  /**
   * 領収書区分・添付ファイルの入力チェック（BR-04、CHK-27〜CHK-30）。
   * @param {Object} p
   * @param {number} p.itemNo 明細番号
   * @param {string} p.itemKind 明細区分
   * @param {string} p.required 要否（judgeReceiptRequired の結果）
   * @param {string} p.receiptKind 領収書区分（NONE／RCPT／ICLOG）
   * @param {string} p.payMethod 支払方法（CASH／IC／CARD）
   * @param {string} p.fileName 添付ファイル名
   * @returns {Array<Object>} エラーの配列（E-122・E-123・E-124・E-128 の順）
   */
  function validateReceipt(p) {
    var errors = [];
    var kind = p.receiptKind || 'NONE';
    var fileName = (p.fileName === null || p.fileName === undefined) ? '' : String(p.fileName).trim();

    // CHK-27 必須なのに添付なし
    if (p.required === 'R' && kind === 'NONE') {
      errors.push(messages.error('E-122', [p.itemNo], p.itemNo, 'receiptKind'));
    }
    // CHK-28 IC利用履歴で代替できるのは ICカード払いの PUBT だけ（BR-04）
    if (kind === 'ICLOG' && !(p.itemKind === 'PUBT' && p.payMethod === 'IC')) {
      errors.push(messages.error('E-123', [p.itemNo], p.itemNo, 'receiptKind'));
    }
    // CHK-29 添付なし以外でファイル名がない
    if (kind !== 'NONE' && fileName === '') {
      errors.push(messages.error('E-124', [p.itemNo], p.itemNo, 'receiptFileName'));
    }
    // CHK-30 拡張子
    if (fileName !== '' && ALLOWED_EXTENSIONS.indexOf(extensionOf(fileName)) < 0) {
      errors.push(messages.error('E-128', [p.itemNo], p.itemNo, 'receiptFileName'));
    }
    return errors;
  }

  InfoExp.logic.receiptRule = {
    judgeReceiptRequired: judgeReceiptRequired,
    validateReceipt: validateReceipt
  };
})();
