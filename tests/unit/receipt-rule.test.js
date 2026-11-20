/*
 * receipt-rule.js の単体試験
 *
 * | テストID   | 観点ID | 分類 | 入力            | 期待値 | 根拠  |
 * |------------|--------|------|-----------------|--------|-------|
 * | UT-RCP-001 | S-01   | 正常 | GEN、3,000      | 'O'    | BR-04 |
 * | UT-RCP-002 | S-01   | 正常 | GEN、8,000      | 'R'    | BR-04 |
 * | UT-RCP-003 | —      | 正常 | TAXI、980       | 'R'    | BR-04 |
 */
(function () {
  'use strict';
  var t = InfoExpTest;
  var rule = InfoExp.logic.receiptRule;

  t.describe('judgeReceiptRequired', function () {
    t.it('UT-RCP-001 一般経費 3,000円 → 任意', function () {
      var input = { itemKind: 'GEN', amount: 3000, minGeneral: 5000, minPublicTransport: 30000 };

      var actual = rule.judgeReceiptRequired(input);

      t.expect(actual).toBe('O');
    });

    t.it('UT-RCP-002 一般経費 8,000円 → 必須', function () {
      var input = { itemKind: 'GEN', amount: 8000, minGeneral: 5000, minPublicTransport: 30000 };

      var actual = rule.judgeReceiptRequired(input);

      t.expect(actual).toBe('R');
    });

    t.it('UT-RCP-003 タクシー 980円 → 必須', function () {
      var input = { itemKind: 'TAXI', amount: 980, minGeneral: 5000, minPublicTransport: 30000 };

      var actual = rule.judgeReceiptRequired(input);

      t.expect(actual).toBe('R');
    });
  });
})();
