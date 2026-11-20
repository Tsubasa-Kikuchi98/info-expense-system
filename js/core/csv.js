/*
 * CSV の解析・作成（05 の 2.1）。
 * 入力: UTF-8。先頭の BOM は読み飛ばす。改行は CRLF・LF のどちらも受け付ける。
 * 出力: 型 X（文字）は必ず " で囲み、値の中の " は "" にする。型 9（数値）は囲まない。改行は CRLF。
 */
(function () {
  'use strict';

  var CRLF = '\r\n';

  /**
   * CSV の文字列を行の配列（各行は文字列の配列）にする。
   * 最後の空行は読み飛ばす。引用符の中の改行・カンマ・"" に対応する。
   * @param {string} text
   * @returns {Array<Array<string>>}
   */
  function parse(text) {
    var source = String(text === undefined || text === null ? '' : text);
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;
    var i;
    var ch;
    if (source.charCodeAt(0) === 0xFEFF) {
      source = source.substring(1);
    }
    for (i = 0; i < source.length; i += 1) {
      ch = source.charAt(i);
      if (inQuotes) {
        if (ch === '"') {
          if (source.charAt(i + 1) === '"') {
            field += '"';
            i += 1;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\r' || ch === '\n') {
        if (ch === '\r' && source.charAt(i + 1) === '\n') {
          i += 1;
        }
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }
    if (field !== '' || row.length > 0) {
      row.push(field);
      rows.push(row);
    }
    return rows;
  }

  function formatValue(value, type) {
    if (type === '9') {
      return (value === null || value === undefined || value === '') ? '' : String(value);
    }
    if (value === null || value === undefined) {
      return '""';
    }
    return '"' + String(value).replace(/"/g, '""') + '"';
  }

  /**
   * 行の配列から CSV の文字列を作る。各行の末尾に CRLF を付ける。
   * @param {Array<Array>} records 行の配列
   * @param {Array<string>|Array<Array<string>>} types 列の型（'X' または '9'）。
   *   全行で共通なら ['X', '9', ...]、行ごとに違うなら行と同じ数の配列を渡す。省略した列は 'X'
   * @returns {string}
   */
  function build(records, types) {
    var perRecord = Array.isArray(types) && types.length > 0 && Array.isArray(types[0]);
    var lines = [];
    var r;
    var c;
    var rowTypes;
    var values;
    for (r = 0; r < records.length; r += 1) {
      rowTypes = perRecord ? (types[r] || []) : (types || []);
      values = [];
      for (c = 0; c < records[r].length; c += 1) {
        values.push(formatValue(records[r][c], rowTypes[c] || 'X'));
      }
      lines.push(values.join(',') + CRLF);
    }
    return lines.join('');
  }

  InfoExp.core.csv = {
    parse: parse,
    build: build
  };
})();
