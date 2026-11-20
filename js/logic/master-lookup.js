/*
 * 期間つきマスタの引き方（BR-01-4）。
 */
(function () {
  'use strict';

  var ConfigError = InfoExp.core.ConfigError;

  /**
   * 行が基準日に有効か。
   * BR-01-4: 有効開始日 ≦ 基準日 かつ（有効終了日 IS NULL または 基準日 ≦ 有効終了日）
   */
  function isEffective(row, baseDate) {
    var validTo = row.validTo;
    return row.validFrom <= baseDate && (validTo === null || validTo === undefined || validTo === '' || baseDate <= validTo);
  }

  /**
   * 期間つきマスタの行の配列から、基準日に有効な1行を返す。
   * 呼び出し側でキー（設定キー・経費種別など）を絞ってから渡す。
   * @param {Array<Object>} rows validFrom・validTo を持つ行の配列
   * @param {string} baseDate 基準日 'YYYY-MM-DD'
   * @param {string} masterName マスタ名（E-901 の表示用）
   * @returns {Object} 有効な1行
   * @throws {InfoExp.core.ConfigError} 有効な行が0件・2件以上（BR-01-4）
   */
  function pickEffective(rows, baseDate, masterName) {
    var hits = [];
    var i;
    for (i = 0; i < (rows || []).length; i += 1) {
      if (isEffective(rows[i], baseDate)) {
        hits.push(rows[i]);
      }
    }
    // BR-01-4 0件・2件以上はマスタの設定誤り
    if (hits.length !== 1) {
      throw new ConfigError(masterName, baseDate, hits.length);
    }
    return hits[0];
  }

  /**
   * m_setting から設定値を整数で引く。
   * @param {Array<Object>} settingRows m_setting の行の配列（settingKey・settingValue・validFrom・validTo）
   * @param {string} key 設定キー
   * @param {string} baseDate 基準日
   * @returns {number} 整数
   * @throws {InfoExp.core.ConfigError} 有効な行が0件・2件以上、または値が整数でない
   */
  function getSettingNumber(settingRows, key, baseDate) {
    var rows = [];
    var row;
    var i;
    for (i = 0; i < (settingRows || []).length; i += 1) {
      if (settingRows[i].settingKey === key) {
        rows.push(settingRows[i]);
      }
    }
    row = pickEffective(rows, baseDate, '設定値 ' + key); // BR-01-4
    if (!/^-?[0-9]+$/.test(String(row.settingValue))) {
      throw new ConfigError('設定値 ' + key, baseDate, 1);
    }
    return parseInt(row.settingValue, 10);
  }

  InfoExp.logic.masterLookup = {
    pickEffective: pickEffective,
    getSettingNumber: getSettingNumber
  };
})();
