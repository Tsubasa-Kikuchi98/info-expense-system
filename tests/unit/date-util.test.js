/*
 * core/date-util.js の単体試験
 *
 * | テストID   | 観点ID      | 分類           | 入力                              | 期待値            | 根拠          |
 * |------------|-------------|----------------|-----------------------------------|-------------------|---------------|
 * | UT-DAT-001 | G-05        | 正常           | parse '2026-11-30'                | 2026年11月30日     | 06 の8章      |
 * | UT-DAT-002 | G-02        | 異常           | parse '2026-02-30'                | null              | 06 の8章      |
 * | UT-DAT-003 | G-02        | 異常           | parse '2026/11/30'                | null              | 06 の8章      |
 * | UT-DAT-004 | G-01        | 異常           | parse ''                          | null              | 06 の8章      |
 * | UT-DAT-005 | G-01        | 異常           | parse null                        | null              | 06 の8章      |
 * | UT-DAT-006 | S-13        | 境界（ちょうど） | isValid '2028-02-29'（うるう年）   | true              | BR-01-2       |
 * | UT-DAT-007 | S-13        | 境界（後）     | isValid '2027-02-29'（平年）       | false             | BR-01-2       |
 * | UT-DAT-008 | G-02        | 異常           | isValid '2026-13-01'              | false             | BR-01-2       |
 * | UT-DAT-009 | G-02        | 異常           | isValid '2026-11-00'              | false             | BR-01-2       |
 * | UT-DAT-010 | G-02        | 正常           | isValidMonth '2026-12'            | true              | BR-10         |
 * | UT-DAT-011 | G-02        | 異常           | isValidMonth '2026-13'            | false             | BR-10         |
 * | UT-DAT-012 | G-05        | 正常           | format(new Date(2026, 0, 5))      | '2026-01-05'      | 06 の8章      |
 * | UT-DAT-013 | G-05        | 正常           | formatDateTime(2026-11-30 09:05:07) | '2026-11-30 09:05:07' | BR-01-2 |
 * | UT-DAT-014 | G-05        | 正常           | addDays '2026-11-09' +2           | '2026-11-11'      | BR-06-2       |
 * | UT-DAT-015 | S-13        | 境界           | addDays '2026-11-30' +1（月末）    | '2026-12-01'      | 06 の8章      |
 * | UT-DAT-016 | S-13        | 境界           | addDays '2026-12-31' +1（年末）    | '2027-01-01'      | 06 の8章      |
 * | UT-DAT-017 | S-13        | 境界           | addDays '2028-02-28' +1（うるう年）| '2028-02-29'      | 06 の8章      |
 * | UT-DAT-018 | G-05        | 正常           | addDays '2026-12-01' −1           | '2026-11-30'      | 06 の8章      |
 * | UT-DAT-019 | G-02        | 異常           | addDays '2026-02-30' +1           | null              | 06 の8章      |
 * | UT-DAT-020 | S-13        | 正常           | addMonths '2026-09' +1            | '2026-10'         | BR-03         |
 * | UT-DAT-021 | S-13        | 境界           | addMonths '2026-12' +1（年またぎ） | '2027-01'         | BR-03         |
 * | UT-DAT-022 | S-13        | 境界           | addMonths '2027-01' −1（年またぎ） | '2026-12'         | BR-10         |
 * | UT-DAT-023 | S-13        | 境界           | addMonths '2026-01-31' +1         | '2026-02-28'      | 06 の8章      |
 * | UT-DAT-024 | S-13        | 境界           | addMonths '2028-01-31' +1（うるう年）| '2028-02-29'    | 06 の8章      |
 * | UT-DAT-025 | G-02        | 異常           | addMonths '2026-13' +1            | null              | 06 の8章      |
 * | UT-DAT-026 | S-14        | 正常           | endOfMonth '2026-11'              | '2026-11-30'      | BR-10         |
 * | UT-DAT-027 | S-14        | 正常           | endOfMonth '2026-12'              | '2026-12-31'      | BR-10         |
 * | UT-DAT-028 | S-13        | 境界           | endOfMonth '2027-02'（平年）       | '2027-02-28'      | BR-03         |
 * | UT-DAT-029 | S-13        | 境界           | endOfMonth '2028-02'（うるう年）   | '2028-02-29'      | BR-03         |
 * | UT-DAT-030 | G-02        | 異常           | endOfMonth '2026-00'              | null              | 06 の8章      |
 * | UT-DAT-031 | G-05        | 正常           | diffDays '2026-11-09'→'2026-11-11' | 2                | BR-06-2       |
 * | UT-DAT-032 | S-13        | 境界           | diffDays '2026-09-29'→'2026-10-02'（月またぎ） | 3     | BR-06-4       |
 * | UT-DAT-033 | S-13        | 境界           | diffDays '2028-02-28'→'2028-03-01'（うるう年） | 2     | 06 の8章      |
 * | UT-DAT-034 | G-05        | 正常           | diffDays 同じ日                    | 0                 | BR-06-1       |
 * | UT-DAT-035 | G-05        | 正常           | diffDays 逆順                      | −2                | BR-06-1       |
 * | UT-DAT-036 | S-14        | 正常           | monthOf '2026-11-30 23:59:59'     | '2026-11'         | BR-10         |
 * | UT-DAT-037 | S-14        | 境界           | nextMonth '2026-12'（年またぎ）    | '2027-01'         | BR-10         |
 * | UT-DAT-038 | S-14        | 正常           | nextMonth '2026-11'               | '2026-12'         | BR-10         |
 * | UT-DAT-039 | S-14        | 境界           | prevMonth '2027-01'（年またぎ）    | '2026-12'         | 05 の 1.1     |
 * | UT-DAT-040 | G-05        | 正常           | compact '2026-11-30 22:00:00'     | '20261130220000'  | 05 の 4.2     |
 */
(function () {
  'use strict';
  var t = InfoExpTest;
  var du = InfoExp.core.dateUtil;

  t.describe('parse', function () {
    t.it('UT-DAT-001 2026-11-30 → 2026年11月30日の Date', function () {
      var input = '2026-11-30';

      var actual = du.parse(input);

      t.expect([actual.getFullYear(), actual.getMonth() + 1, actual.getDate()]).toEqual([2026, 11, 30]);
    });

    t.it('UT-DAT-002 存在しない日付 2026-02-30 → null', function () {
      var input = '2026-02-30';

      var actual = du.parse(input);

      t.expect(actual).toBeNull();
    });

    t.it('UT-DAT-003 区切りがスラッシュ 2026/11/30 → null', function () {
      var input = '2026/11/30';

      var actual = du.parse(input);

      t.expect(actual).toBeNull();
    });

    t.it('UT-DAT-004 空文字 → null', function () {
      var input = '';

      var actual = du.parse(input);

      t.expect(actual).toBeNull();
    });

    t.it('UT-DAT-005 null → null', function () {
      var input = null;

      var actual = du.parse(input);

      t.expect(actual).toBeNull();
    });
  });

  t.describe('isValid', function () {
    t.it('UT-DAT-006 うるう年の 2028-02-29 → true', function () {
      var input = '2028-02-29';

      var actual = du.isValid(input);

      t.expect(actual).toBe(true);
    });

    t.it('UT-DAT-007 平年の 2027-02-29 → false', function () {
      var input = '2027-02-29';

      var actual = du.isValid(input);

      t.expect(actual).toBe(false);
    });

    t.it('UT-DAT-008 13月 2026-13-01 → false', function () {
      var input = '2026-13-01';

      var actual = du.isValid(input);

      t.expect(actual).toBe(false);
    });

    t.it('UT-DAT-009 0日 2026-11-00 → false', function () {
      var input = '2026-11-00';

      var actual = du.isValid(input);

      t.expect(actual).toBe(false);
    });
  });

  t.describe('isValidMonth', function () {
    t.it('UT-DAT-010 2026-12 → true', function () {
      var input = '2026-12';

      var actual = du.isValidMonth(input);

      t.expect(actual).toBe(true);
    });

    t.it('UT-DAT-011 13月 2026-13 → false', function () {
      var input = '2026-13';

      var actual = du.isValidMonth(input);

      t.expect(actual).toBe(false);
    });
  });

  t.describe('format', function () {
    t.it('UT-DAT-012 2026年1月5日 → 2026-01-05（ゼロ埋め）', function () {
      var input = new Date(2026, 0, 5);

      var actual = du.format(input);

      t.expect(actual).toBe('2026-01-05');
    });
  });

  t.describe('formatDateTime', function () {
    t.it('UT-DAT-013 2026年11月30日 9時5分7秒 → 2026-11-30 09:05:07', function () {
      var input = new Date(2026, 10, 30, 9, 5, 7);

      var actual = du.formatDateTime(input);

      t.expect(actual).toBe('2026-11-30 09:05:07');
    });
  });

  t.describe('addDays', function () {
    t.it('UT-DAT-014 2026-11-09 に 2日 → 2026-11-11', function () {
      var input = '2026-11-09';

      var actual = du.addDays(input, 2);

      t.expect(actual).toBe('2026-11-11');
    });

    t.it('UT-DAT-015 月末 2026-11-30 に 1日 → 2026-12-01', function () {
      var input = '2026-11-30';

      var actual = du.addDays(input, 1);

      t.expect(actual).toBe('2026-12-01');
    });

    t.it('UT-DAT-016 年末 2026-12-31 に 1日 → 2027-01-01', function () {
      var input = '2026-12-31';

      var actual = du.addDays(input, 1);

      t.expect(actual).toBe('2027-01-01');
    });

    t.it('UT-DAT-017 うるう年 2028-02-28 に 1日 → 2028-02-29', function () {
      var input = '2028-02-28';

      var actual = du.addDays(input, 1);

      t.expect(actual).toBe('2028-02-29');
    });

    t.it('UT-DAT-018 2026-12-01 から 1日引く → 2026-11-30', function () {
      var input = '2026-12-01';

      var actual = du.addDays(input, -1);

      t.expect(actual).toBe('2026-11-30');
    });

    t.it('UT-DAT-019 不正な日付 2026-02-30 → null', function () {
      var input = '2026-02-30';

      var actual = du.addDays(input, 1);

      t.expect(actual).toBeNull();
    });
  });

  t.describe('addMonths', function () {
    t.it('UT-DAT-020 年月 2026-09 に 1か月 → 2026-10', function () {
      var input = '2026-09';

      var actual = du.addMonths(input, 1);

      t.expect(actual).toBe('2026-10');
    });

    t.it('UT-DAT-021 年月 2026-12 に 1か月（年またぎ） → 2027-01', function () {
      var input = '2026-12';

      var actual = du.addMonths(input, 1);

      t.expect(actual).toBe('2027-01');
    });

    t.it('UT-DAT-022 年月 2027-01 から 1か月引く（年またぎ） → 2026-12', function () {
      var input = '2027-01';

      var actual = du.addMonths(input, -1);

      t.expect(actual).toBe('2026-12');
    });

    t.it('UT-DAT-023 日付 2026-01-31 に 1か月（2月に31日がない） → 2026-02-28', function () {
      var input = '2026-01-31';

      var actual = du.addMonths(input, 1);

      t.expect(actual).toBe('2026-02-28');
    });

    t.it('UT-DAT-024 日付 2028-01-31 に 1か月（うるう年） → 2028-02-29', function () {
      var input = '2028-01-31';

      var actual = du.addMonths(input, 1);

      t.expect(actual).toBe('2028-02-29');
    });

    t.it('UT-DAT-025 不正な年月 2026-13 → null', function () {
      var input = '2026-13';

      var actual = du.addMonths(input, 1);

      t.expect(actual).toBeNull();
    });
  });

  t.describe('endOfMonth', function () {
    t.it('UT-DAT-026 2026-11 → 2026-11-30', function () {
      var input = '2026-11';

      var actual = du.endOfMonth(input);

      t.expect(actual).toBe('2026-11-30');
    });

    t.it('UT-DAT-027 2026-12 → 2026-12-31', function () {
      var input = '2026-12';

      var actual = du.endOfMonth(input);

      t.expect(actual).toBe('2026-12-31');
    });

    t.it('UT-DAT-028 平年の 2027-02 → 2027-02-28', function () {
      var input = '2027-02';

      var actual = du.endOfMonth(input);

      t.expect(actual).toBe('2027-02-28');
    });

    t.it('UT-DAT-029 うるう年の 2028-02 → 2028-02-29', function () {
      var input = '2028-02';

      var actual = du.endOfMonth(input);

      t.expect(actual).toBe('2028-02-29');
    });

    t.it('UT-DAT-030 不正な年月 2026-00 → null', function () {
      var input = '2026-00';

      var actual = du.endOfMonth(input);

      t.expect(actual).toBeNull();
    });
  });

  t.describe('diffDays', function () {
    t.it('UT-DAT-031 2026-11-09 から 2026-11-11 → 2', function () {
      var input = { a: '2026-11-09', b: '2026-11-11' };

      var actual = du.diffDays(input.a, input.b);

      t.expect(actual).toBe(2);
    });

    t.it('UT-DAT-032 月をまたぐ 2026-09-29 から 2026-10-02 → 3', function () {
      var input = { a: '2026-09-29', b: '2026-10-02' };

      var actual = du.diffDays(input.a, input.b);

      t.expect(actual).toBe(3);
    });

    t.it('UT-DAT-033 うるう年の 2028-02-28 から 2028-03-01 → 2', function () {
      var input = { a: '2028-02-28', b: '2028-03-01' };

      var actual = du.diffDays(input.a, input.b);

      t.expect(actual).toBe(2);
    });

    t.it('UT-DAT-034 同じ日 → 0', function () {
      var input = { a: '2026-11-20', b: '2026-11-20' };

      var actual = du.diffDays(input.a, input.b);

      t.expect(actual).toBe(0);
    });

    t.it('UT-DAT-035 逆順 2026-11-11 から 2026-11-09 → -2', function () {
      var input = { a: '2026-11-11', b: '2026-11-09' };

      var actual = du.diffDays(input.a, input.b);

      t.expect(actual).toBe(-2);
    });
  });

  t.describe('monthOf', function () {
    t.it('UT-DAT-036 日時 2026-11-30 23:59:59 → 2026-11', function () {
      var input = '2026-11-30 23:59:59';

      var actual = du.monthOf(input);

      t.expect(actual).toBe('2026-11');
    });
  });

  t.describe('nextMonth', function () {
    t.it('UT-DAT-037 2026-12（年またぎ） → 2027-01', function () {
      var input = '2026-12';

      var actual = du.nextMonth(input);

      t.expect(actual).toBe('2027-01');
    });

    t.it('UT-DAT-038 2026-11 → 2026-12', function () {
      var input = '2026-11';

      var actual = du.nextMonth(input);

      t.expect(actual).toBe('2026-12');
    });
  });

  t.describe('prevMonth', function () {
    t.it('UT-DAT-039 2027-01（年またぎ） → 2026-12', function () {
      var input = '2027-01';

      var actual = du.prevMonth(input);

      t.expect(actual).toBe('2026-12');
    });
  });

  t.describe('compact', function () {
    t.it('UT-DAT-040 日時 2026-11-30 22:00:00 → 20261130220000', function () {
      var input = '2026-11-30 22:00:00';

      var actual = du.compact(input);

      t.expect(actual).toBe('20261130220000');
    });
  });
})();
