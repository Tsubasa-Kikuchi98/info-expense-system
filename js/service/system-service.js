/*
 * システム管理（F-21 業務日付設定、F-22 データ初期化、F-23 DB ファイル出力）。
 */
(function () {
  'use strict';

  var util = InfoExp.service.serviceUtil;
  var clock = InfoExp.service.clockService;
  var db = InfoExp.data.db;
  var dateUtil = InfoExp.core.dateUtil;
  var config = InfoExp.core.config;

  function requireAdmin(userId) {
    if (InfoExp.data.repositories.userRoleRepository.findRolesOf(userId).indexOf('ADMIN') < 0) {
      util.fail('E-203', []);
    }
  }

  /**
   * 業務日付を設定する（F-21）。空文字なら端末の日付を使う。
   * @param {string} value 'YYYY-MM-DD' または空文字
   */
  function setOperationDate(value, userId) {
    return util.guard(function () {
      var text = (value === null || value === undefined) ? '' : String(value).trim();
      requireAdmin(userId);
      if (text !== '' && !dateUtil.isValid(text)) {
        util.fail('E-104', ['業務日付'], null, 'operationDate');
      }
      return util.execute(function () {
        clock.setOperationDate(text);
        return { msgId: 'I-901', params: [text === '' ? '（端末日付）' : text] };
      });
    });
  }

  /** データ初期化（F-22）: info-expense: で始まるキーを削除し、DDL と初期データで作り直す */
  function resetData(userId) {
    try {
      if (db.isOpen()) {
        requireAdmin(userId);
      }
      db.reset();
      return util.ok(null, [{ msgId: 'I-902', params: [] }]);
    } catch (e) {
      if (e && e.isServiceError) {
        return util.ng(e.errors);
      }
      return util.ng([{ msgId: 'E-902', params: [], itemNo: null, field: null }]);
    }
  }

  /** DB ファイル出力（F-23）。data: { fileName, bytes } */
  function exportDbFile(userId) {
    return util.guard(function () {
      requireAdmin(userId);
      return util.ok({
        fileName: 'info-expense-' + dateUtil.compact(clock.getOperationDate()) + '.sqlite',
        bytes: db.exportBinary()
      });
    });
  }

  /** 保存サイズ（KB）とスキーマ版数（SCR-09） */
  function storageInfo() {
    return {
      sizeKb: Math.ceil(db.storedLength() / 1024),
      schemaVersion: config.SCHEMA_VERSION
    };
  }

  InfoExp.service.systemService = {
    setOperationDate: setOperationDate,
    resetData: resetData,
    exportDbFile: exportDbFile,
    storageInfo: storageInfo
  };
})();
