/*
 * report-number.js の単体試験
 *
 * | テストID   | 観点ID | 分類           | 前提・入力                                                   | 期待値            | 根拠  |
 * |------------|--------|----------------|--------------------------------------------------------------|-------------------|-------|
 * | UT-RNO-001 | G-04   | 正常           | 既存 EX2026-000001〜000026、2026年                            | 'EX2026-000027'   | BR-11 |
 * | UT-RNO-002 | G-04   | 境界（0件）    | 既存なし（空配列）、2026年                                    | 'EX2026-000001'   | BR-11 |
 * | UT-RNO-003 | G-04   | 境界（1件）    | 既存 EX2026-000001 のみ、2026年                               | 'EX2026-000002'   | BR-11 |
 * | UT-RNO-004 | —      | 正常           | 年が変わる: 既存は 2026年のみ、2027年                          | 'EX2027-000001'   | BR-11 |
 * | UT-RNO-005 | —      | 正常           | 前年の番号のほうが大きい: EX2026-000500 と EX2027-000003、2027年 | 'EX2027-000004' | BR-11 |
 * | UT-RNO-006 | —      | 正常           | 最大値 + 1（欠番は埋めない）: 000001・000005、2026年            | 'EX2026-000006'   | BR-11 |
 * | UT-RNO-007 | —      | 正常           | 順不同: 000010・000002・000009、2026年                         | 'EX2026-000011'   | BR-11 |
 * | UT-RNO-008 | G-03   | 境界（桁上がり）| 既存 EX2026-000999、2026年                                     | 'EX2026-001000'   | BR-11 |
 * | UT-RNO-009 | G-02   | 異常           | 形式が違う番号（EX2026-12、XX2026-000050）は無視、2026年         | 'EX2026-000001'   | BR-11 |
 * | UT-RNO-010 | G-02   | 正常           | 西暦を文字列 '2026' で渡す                                     | 'EX2026-000027'   | BR-11 |
 * | UT-RNO-011 | G-01   | 異常           | 既存の配列が null、2026年                                      | 'EX2026-000001'   | BR-11 |
 * | UT-RNO-012 | G-06   | 正常           | 実行後に既存の配列が変わっていない                              | 実行前と同じ配列   | 06 の 5.1 |
 */
(function () {
  'use strict';
  var t = InfoExpTest;
  var rn = InfoExp.logic.reportNumber;

  var SEED_NOS = [
    'EX2026-000001', 'EX2026-000002', 'EX2026-000003', 'EX2026-000004', 'EX2026-000005', 'EX2026-000006',
    'EX2026-000007', 'EX2026-000008', 'EX2026-000009', 'EX2026-000010', 'EX2026-000011', 'EX2026-000012',
    'EX2026-000013', 'EX2026-000014', 'EX2026-000015', 'EX2026-000016', 'EX2026-000017', 'EX2026-000018',
    'EX2026-000019', 'EX2026-000020', 'EX2026-000021', 'EX2026-000022', 'EX2026-000023', 'EX2026-000024',
    'EX2026-000025', 'EX2026-000026'
  ];

  t.describe('nextReportNo', function () {
    t.it('UT-RNO-001 初期データ（000001〜000026）で 2026年 → EX2026-000027', function () {
      var existingNos = t.clone(SEED_NOS);

      var actual = rn.nextReportNo(existingNos, 2026);

      t.expect(actual).toBe('EX2026-000027');
    });

    t.it('UT-RNO-002 既存なし → EX2026-000001', function () {
      var existingNos = [];

      var actual = rn.nextReportNo(existingNos, 2026);

      t.expect(actual).toBe('EX2026-000001');
    });

    t.it('UT-RNO-003 既存1件（000001） → EX2026-000002', function () {
      var existingNos = ['EX2026-000001'];

      var actual = rn.nextReportNo(existingNos, 2026);

      t.expect(actual).toBe('EX2026-000002');
    });

    t.it('UT-RNO-004 年が変わる（既存は2026年のみ）で 2027年 → EX2027-000001', function () {
      var existingNos = t.clone(SEED_NOS);

      var actual = rn.nextReportNo(existingNos, 2027);

      t.expect(actual).toBe('EX2027-000001');
    });

    t.it('UT-RNO-005 前年の連番のほうが大きくても同じ西暦の最大値 + 1 → EX2027-000004', function () {
      var existingNos = ['EX2026-000500', 'EX2027-000003'];

      var actual = rn.nextReportNo(existingNos, 2027);

      t.expect(actual).toBe('EX2027-000004');
    });

    t.it('UT-RNO-006 欠番があっても最大値 + 1（000001・000005） → EX2026-000006', function () {
      var existingNos = ['EX2026-000001', 'EX2026-000005'];

      var actual = rn.nextReportNo(existingNos, 2026);

      t.expect(actual).toBe('EX2026-000006');
    });

    t.it('UT-RNO-007 順不同（000010・000002・000009） → EX2026-000011', function () {
      var existingNos = ['EX2026-000010', 'EX2026-000002', 'EX2026-000009'];

      var actual = rn.nextReportNo(existingNos, 2026);

      t.expect(actual).toBe('EX2026-000011');
    });

    t.it('UT-RNO-008 桁上がり（000999） → EX2026-001000', function () {
      var existingNos = ['EX2026-000999'];

      var actual = rn.nextReportNo(existingNos, 2026);

      t.expect(actual).toBe('EX2026-001000');
    });

    t.it('UT-RNO-009 形式が違う番号は無視（EX2026-12、XX2026-000050） → EX2026-000001', function () {
      var existingNos = ['EX2026-12', 'XX2026-000050'];

      var actual = rn.nextReportNo(existingNos, 2026);

      t.expect(actual).toBe('EX2026-000001');
    });

    t.it('UT-RNO-010 西暦を文字列 2026 で渡す → EX2026-000027', function () {
      var existingNos = t.clone(SEED_NOS);

      var actual = rn.nextReportNo(existingNos, '2026');

      t.expect(actual).toBe('EX2026-000027');
    });

    t.it('UT-RNO-011 既存の配列が null → EX2026-000001', function () {
      var existingNos = null;

      var actual = rn.nextReportNo(existingNos, 2026);

      t.expect(actual).toBe('EX2026-000001');
    });

    t.it('UT-RNO-012 実行後に既存の配列が変わっていない → 実行前と同じ', function () {
      var existingNos = ['EX2026-000010', 'EX2026-000002'];

      rn.nextReportNo(existingNos, 2026);

      t.expect(existingNos).toEqual(['EX2026-000010', 'EX2026-000002']);
    });
  });
})();
