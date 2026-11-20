/*
 * システム全体の設定（06 の 6.1）。規程の数値はここに書かない（m_setting などのマスタに持つ）。
 */
(function () {
  'use strict';

  var PREFIX = 'info-expense:';

  InfoExp.core.config = {
    // DB の構造を変えたら上げる。保存済み DB の版数と違う場合は初期データから作り直す
    SCHEMA_VERSION: 1,
    STORAGE_PREFIX: PREFIX,
    STORAGE_KEY_DB: PREFIX + 'db',
    STORAGE_KEY_SCHEMA_VERSION: PREFIX + 'schema-version',
    STORAGE_KEY_CURRENT_USER: PREFIX + 'current-user',
    // 画面の一覧の最大表示件数（02 の 4.2）
    LIST_MAX_ROWS: 200,
    // バッチ実行履歴の表示件数（02 の 5.8）
    BATCH_HISTORY_MAX_ROWS: 50,
    // 明細の最大行数（02 の 5.3.4）
    ITEM_MAX_ROWS: 50
  };
})();
