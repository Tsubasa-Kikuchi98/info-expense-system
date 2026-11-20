/*
 * 日付の計算（06 の8章）。
 * 日付は 'YYYY-MM-DD'、年月は 'YYYY-MM'、日時は 'YYYY-MM-DD HH:MM:SS' の文字列で受け渡す。
 * 内部では new Date(年, 月-1, 日) の現地時刻で扱い、new Date('YYYY-MM-DD')（UTC 解釈）は使わない。
 * 不正な値を渡した場合は null を返す（例外は投げない）。
 */
(function () {
  'use strict';

  var DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
  var MONTH_PATTERN = /^(\d{4})-(\d{2})$/;
  var MS_PER_DAY = 24 * 60 * 60 * 1000;

  function pad(value, length) {
    var text = String(value);
    while (text.length < length) {
      text = '0' + text;
    }
    return text;
  }

  /**
   * 'YYYY-MM-DD' を Date（現地時刻の 0:00）にする。
   * @param {string} text
   * @returns {Date|null} 形式が違う、または存在しない日付（2026-02-30 など）は null
   */
  function parse(text) {
    var m;
    var y;
    var mo;
    var d;
    var date;
    if (typeof text !== 'string') {
      return null;
    }
    m = DATE_PATTERN.exec(text);
    if (!m) {
      return null;
    }
    y = Number(m[1]);
    mo = Number(m[2]);
    d = Number(m[3]);
    if (mo < 1 || mo > 12 || d < 1) {
      return null;
    }
    date = new Date(y, mo - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) {
      return null;
    }
    return date;
  }

  /**
   * 日付として正しい 'YYYY-MM-DD' か。
   * @param {string} text
   * @returns {boolean}
   */
  function isValid(text) {
    return parse(text) !== null;
  }

  /**
   * 年月として正しい 'YYYY-MM' か。
   * @param {string} text
   * @returns {boolean}
   */
  function isValidMonth(text) {
    var m;
    if (typeof text !== 'string') {
      return false;
    }
    m = MONTH_PATTERN.exec(text);
    if (!m) {
      return false;
    }
    return Number(m[2]) >= 1 && Number(m[2]) <= 12;
  }

  /**
   * Date を 'YYYY-MM-DD' にする。
   * @param {Date} date
   * @returns {string|null}
   */
  function format(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return null;
    }
    return pad(date.getFullYear(), 4) + '-' + pad(date.getMonth() + 1, 2) + '-' + pad(date.getDate(), 2);
  }

  /**
   * Date を 'YYYY-MM-DD HH:MM:SS' にする。
   * @param {Date} date
   * @returns {string|null}
   */
  function formatDateTime(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return null;
    }
    return format(date) + ' ' + pad(date.getHours(), 2) + ':' + pad(date.getMinutes(), 2) + ':' + pad(date.getSeconds(), 2);
  }

  /**
   * 日付に日数を足す。
   * @param {string} text 'YYYY-MM-DD'
   * @param {number} days 足す日数（負数で引く）
   * @returns {string|null}
   */
  function addDays(text, days) {
    var date = parse(text);
    if (date === null || typeof days !== 'number' || days % 1 !== 0) {
      return null;
    }
    return format(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
  }

  /**
   * 年月から1か月単位でずらす（内部用）。
   * @returns {string} 'YYYY-MM'
   */
  function shiftMonth(year, month, months) {
    var index = year * 12 + (month - 1) + months;
    var y = Math.floor(index / 12);
    var mo = index - y * 12 + 1;
    return pad(y, 4) + '-' + pad(mo, 2);
  }

  /**
   * 月を足す。
   * 'YYYY-MM' を渡すと 'YYYY-MM' を返す。'YYYY-MM-DD' を渡すと日付を返し、
   * 足した先の月にその日がなければ月末日にする（2026-01-31 + 1か月 → 2026-02-28）。
   * @param {string} text 'YYYY-MM' または 'YYYY-MM-DD'
   * @param {number} months 足す月数（負数で引く）
   * @returns {string|null}
   */
  function addMonths(text, months) {
    var date;
    var shifted;
    var last;
    if (typeof months !== 'number' || months % 1 !== 0) {
      return null;
    }
    if (isValidMonth(text)) {
      return shiftMonth(Number(text.substring(0, 4)), Number(text.substring(5, 7)), months);
    }
    date = parse(text);
    if (date === null) {
      return null;
    }
    shifted = shiftMonth(date.getFullYear(), date.getMonth() + 1, months);
    last = endOfMonth(shifted);
    if (date.getDate() > Number(last.substring(8, 10))) {
      return last;
    }
    return shifted + '-' + pad(date.getDate(), 2);
  }

  /**
   * 月の末日を返す。
   * @param {string} yyyyMm 'YYYY-MM'（'YYYY-MM-DD' や日時を渡した場合は先頭7文字を使う）
   * @returns {string|null} 'YYYY-MM-DD'
   */
  function endOfMonth(yyyyMm) {
    var text = (typeof yyyyMm === 'string') ? yyyyMm.substring(0, 7) : null;
    var y;
    var mo;
    if (!isValidMonth(text)) {
      return null;
    }
    y = Number(text.substring(0, 4));
    mo = Number(text.substring(5, 7));
    // 翌月の0日 = 当月の末日
    return format(new Date(y, mo, 0));
  }

  /**
   * 2つの日付の差（b − a）を日数で返す。
   * @param {string} a 'YYYY-MM-DD'
   * @param {string} b 'YYYY-MM-DD'
   * @returns {number|null} 例: diffDays('2026-11-09', '2026-11-11') → 2
   */
  function diffDays(a, b) {
    var da = parse(a);
    var db = parse(b);
    if (da === null || db === null) {
      return null;
    }
    return Math.round((db.getTime() - da.getTime()) / MS_PER_DAY);
  }

  /**
   * 日付・日時の年月を返す。
   * @param {string} text 'YYYY-MM-DD' または 'YYYY-MM-DD HH:MM:SS'
   * @returns {string|null} 'YYYY-MM'
   */
  function monthOf(text) {
    if (typeof text !== 'string' || !isValid(text.substring(0, 10))) {
      return null;
    }
    return text.substring(0, 7);
  }

  /**
   * 翌月を返す。
   * @param {string} yyyyMm
   * @returns {string|null}
   */
  function nextMonth(yyyyMm) {
    if (!isValidMonth(yyyyMm)) {
      return null;
    }
    return addMonths(yyyyMm, 1);
  }

  /**
   * 前月を返す。
   * @param {string} yyyyMm
   * @returns {string|null}
   */
  function prevMonth(yyyyMm) {
    if (!isValidMonth(yyyyMm)) {
      return null;
    }
    return addMonths(yyyyMm, -1);
  }

  /**
   * 区切り文字を除く（'2026-11-30' → '20261130'、'2026-11-30 22:00:00' → '20261130220000'）。
   * @param {string} text
   * @returns {string}
   */
  function compact(text) {
    return String(text || '').replace(/[-: ]/g, '');
  }

  InfoExp.core.dateUtil = {
    parse: parse,
    isValid: isValid,
    isValidMonth: isValidMonth,
    format: format,
    formatDateTime: formatDateTime,
    addDays: addDays,
    addMonths: addMonths,
    endOfMonth: endOfMonth,
    diffDays: diffDays,
    monthOf: monthOf,
    nextMonth: nextMonth,
    prevMonth: prevMonth,
    compact: compact
  };
})();
