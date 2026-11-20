/*
 * DB 管理（06 の 6章）: sql.js の初期化、DDL・初期データの投入、localStorage への保存、データ初期化、
 * トランザクションと SQL 実行の補助。SQL の値は必ずバインド変数で渡す。
 */
(function () {
  'use strict';

  var config = InfoExp.core.config;
  var SQL_ENGINE = null;
  var database = null;
  var isLoadFailed = false;
  var CHUNK = 0x8000;

  function toCamel(name) {
    return name.replace(/_([a-z0-9])/g, function (all, ch) {
      return ch.toUpperCase();
    });
  }

  function base64ToBytes(text) {
    var binary = window.atob(text);
    var bytes = new Uint8Array(binary.length);
    var i;
    for (i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  function bytesToBase64(bytes) {
    var parts = [];
    var i;
    for (i = 0; i < bytes.length; i += CHUNK) {
      parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK)));
    }
    return window.btoa(parts.join(''));
  }

  function storageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function storageSet(key, value) {
    window.localStorage.setItem(key, value);
  }

  function normalizeParams(params) {
    var result = [];
    var i;
    for (i = 0; i < (params || []).length; i += 1) {
      result.push(params[i] === undefined ? null : params[i]);
    }
    return result;
  }

  function createFresh() {
    var db = new SQL_ENGINE.Database();
    db.exec(InfoExp.data.schema.SQL);
    db.exec(InfoExp.data.seedMaster.SQL);
    db.exec(InfoExp.data.seedTransaction.SQL);
    return db;
  }

  /**
   * sql.js を初期化し、保存済みの DB を開く（なければ初期データで作る）。06 の 6.2
   * @returns {Promise<{isCreated: boolean, isLoadFailed: boolean}>}
   */
  function init() {
    var wasm = base64ToBytes(window.INFO_EXP_SQL_WASM_BASE64);
    return window.initSqlJs({ wasmBinary: wasm }).then(function (engine) {
      var saved = storageGet(config.STORAGE_KEY_DB);
      var savedVersion = storageGet(config.STORAGE_KEY_SCHEMA_VERSION);
      var isCreated = false;
      SQL_ENGINE = engine;
      isLoadFailed = false;
      if (saved && savedVersion === String(config.SCHEMA_VERSION)) {
        try {
          database = new SQL_ENGINE.Database(base64ToBytes(saved));
          database.exec('SELECT COUNT(*) FROM t_expense_report');
        } catch (e) {
          database = null;
          isLoadFailed = true; // E-903
        }
      } else {
        database = createFresh();
        isCreated = true;
      }
      if (database) {
        database.exec('PRAGMA foreign_keys = ON');
        if (isCreated) {
          try {
            persist();
          } catch (e2) {
            // 保存できなくてもメモリ上の DB で動かす（E-902 は画面で表示する）
          }
        }
      }
      return { isCreated: isCreated, isLoadFailed: isLoadFailed };
    });
  }

  function requireDb() {
    if (!database) {
      throw new Error('データベースが開かれていません。');
    }
    return database;
  }

  /**
   * SELECT を実行し、行を camelCase のオブジェクトの配列で返す。
   * @param {string} sql
   * @param {Array} [params]
   * @returns {Array<Object>}
   */
  function all(sql, params) {
    var stmt = requireDb().prepare(sql);
    var rows = [];
    var raw;
    var row;
    var key;
    try {
      stmt.bind(normalizeParams(params));
      while (stmt.step()) {
        raw = stmt.getAsObject();
        row = {};
        for (key in raw) {
          if (Object.prototype.hasOwnProperty.call(raw, key)) {
            row[toCamel(key)] = raw[key];
          }
        }
        rows.push(row);
      }
    } finally {
      stmt.free();
    }
    return rows;
  }

  /**
   * SELECT を実行し、最初の行（なければ null）を返す。
   */
  function get(sql, params) {
    var rows = all(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * INSERT・UPDATE・DELETE を実行し、変更した行数を返す。
   */
  function run(sql, params) {
    var db = requireDb();
    db.run(sql, normalizeParams(params));
    return db.getRowsModified();
  }

  /** 直前の INSERT の自動採番値 */
  function lastInsertId() {
    return get('SELECT last_insert_rowid() AS id').id;
  }

  /**
   * トランザクション（BEGIN → fn → COMMIT、例外時 ROLLBACK）。06 の 6.4
   * @param {Function} fn
   * @returns {*} fn の戻り値
   */
  function transaction(fn) {
    var db = requireDb();
    var result;
    db.exec('BEGIN');
    try {
      result = fn();
      db.exec('COMMIT');
    } catch (e) {
      try {
        db.exec('ROLLBACK');
      } catch (ignore) {
        // ROLLBACK 済み
      }
      throw e;
    }
    return result;
  }

  /** PRAGMA などを実行する（値を持たない SQL 用） */
  function exec(sql) {
    return requireDb().exec(sql);
  }

  /**
   * DB 全体を localStorage に保存する（06 の 6.3）。
   * @throws {Error} 保存できない（容量超過）場合。呼び出し側で E-902 を表示する
   */
  function persist() {
    var text = bytesToBase64(requireDb().export());
    // export() は外部キー設定を戻すため、再設定する
    database.exec('PRAGMA foreign_keys = ON');
    storageSet(config.STORAGE_KEY_DB, text);
    storageSet(config.STORAGE_KEY_SCHEMA_VERSION, String(config.SCHEMA_VERSION));
  }

  /**
   * データ初期化（F-22）: info-expense: で始まるキーをすべて削除し、DDL と初期データで作り直して保存する。
   */
  function reset() {
    var keys = [];
    var i;
    try {
      for (i = 0; i < window.localStorage.length; i += 1) {
        if (window.localStorage.key(i).indexOf(config.STORAGE_PREFIX) === 0) {
          keys.push(window.localStorage.key(i));
        }
      }
      for (i = 0; i < keys.length; i += 1) {
        window.localStorage.removeItem(keys[i]);
      }
    } catch (e) {
      // localStorage が使えない環境ではメモリ上の DB だけ作り直す
    }
    if (database) {
      database.close();
    }
    database = createFresh();
    database.exec('PRAGMA foreign_keys = ON');
    isLoadFailed = false;
    persist();
  }

  /** DB を SQLite ファイルのバイト列で返す（F-23） */
  function exportBinary() {
    var bytes = requireDb().export();
    database.exec('PRAGMA foreign_keys = ON');
    return bytes;
  }

  /** localStorage に保存している DB の文字数 */
  function storedLength() {
    var text = storageGet(config.STORAGE_KEY_DB);
    return text ? text.length : 0;
  }

  InfoExp.data.db = {
    init: init,
    all: all,
    get: get,
    run: run,
    exec: exec,
    lastInsertId: lastInsertId,
    transaction: transaction,
    persist: persist,
    reset: reset,
    exportBinary: exportBinary,
    storedLength: storedLength,
    isOpen: function () { return database !== null; },
    isLoadFailed: function () { return isLoadFailed; }
  };
})();
