/*
 * 業務日付と処理日時（BR-01-2、06 の8章）。logic には値を引数で渡す。
 */
(function () {
  'use strict';

  var dateUtil = InfoExp.core.dateUtil;
  var settingRepository = InfoExp.data.repositories.settingRepository;
  var KEY = 'OPERATION_DATE';

  function settingRow() {
    var rows = settingRepository.findByKey(KEY);
    return rows.length > 0 ? rows[rows.length - 1] : null;
  }

  /** 設定値 OPERATION_DATE が空（端末の日付を使う）か */
  function isDeviceDate() {
    var row = settingRow();
    return !row || !row.settingValue;
  }

  /**
   * 業務日付。設定値 OPERATION_DATE があればその日付、空なら端末の日付（BR-01-2）。
   * @returns {string} 'YYYY-MM-DD'
   */
  function getOperationDate() {
    var row = settingRow();
    if (row && dateUtil.isValid(row.settingValue)) {
      return row.settingValue;
    }
    return dateUtil.format(new Date());
  }

  /**
   * 処理日時 = 業務日付 ＋ 端末の現在時刻（BR-01-2）。
   * @returns {string} 'YYYY-MM-DD HH:MM:SS'
   */
  function now() {
    return getOperationDate() + dateUtil.formatDateTime(new Date()).substring(10);
  }

  /**
   * 業務日付を設定する（F-21）。トランザクションの中で呼ぶ。
   * @param {string} value 'YYYY-MM-DD' または空文字（端末の日付）
   */
  function setOperationDate(value) {
    var row = settingRow();
    settingRepository.update({ settingKey: KEY, validFrom: row.validFrom }, {
      settingValue: value,
      updatedAt: dateUtil.formatDateTime(new Date())
    });
  }

  InfoExp.service.clockService = {
    getOperationDate: getOperationDate,
    isDeviceDate: isDeviceDate,
    now: now,
    setOperationDate: setOperationDate
  };
})();
