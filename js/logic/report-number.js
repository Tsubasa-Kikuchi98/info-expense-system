/*
 * 申請番号の採番（BR-11）。
 */
(function () {
  'use strict';

  var PREFIX = 'EX';
  var SEQ_LENGTH = 6;

  /**
   * 次の申請番号を返す（BR-11）。
   * 形式: 'EX' ＋ 西暦4桁 ＋ '-' ＋ 連番6桁。連番は同じ西暦の申請番号の連番の最大値 + 1（年が変わると 000001 から）。
   * @param {Array<string>} existingNos 既存の申請番号の配列
   * @param {number|string} year 西暦（採番時点の業務日付の年）
   * @returns {string} 例: 'EX2026-000027'
   */
  function nextReportNo(existingNos, year) {
    var head = PREFIX + String(year) + '-';
    var pattern = /^[0-9]{6}$/;
    var max = 0;
    var nos = existingNos || [];
    var seq;
    var text;
    var i;
    for (i = 0; i < nos.length; i += 1) {
      if (typeof nos[i] === 'string' && nos[i].indexOf(head) === 0 && pattern.test(nos[i].substring(head.length))) {
        seq = parseInt(nos[i].substring(head.length), 10);
        if (seq > max) {
          max = seq;
        }
      }
    }
    text = String(max + 1); // BR-11
    while (text.length < SEQ_LENGTH) {
      text = '0' + text;
    }
    return head + text;
  }

  InfoExp.logic.reportNumber = {
    nextReportNo: nextReportNo
  };
})();
