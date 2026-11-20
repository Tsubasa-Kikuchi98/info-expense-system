/*
 * t_batch_run バッチ実行履歴（03 の 4.16）。
 */
(function () {
  'use strict';

  var util = InfoExp.data.repositories.repositoryUtil;
  var db = InfoExp.data.db;
  var COLUMNS = ['batchId', 'operationDate', 'param', 'startedAt', 'endedAt', 'result', 'recordCount', 'totalAmount',
    'fileName', 'message', 'executedBy', 'updatedAt'];

  InfoExp.data.repositories.batchRunRepository = {
    /** 実行履歴を登録し、実行IDを返す */
    insert: function (row) {
      util.insert('t_batch_run', COLUMNS, row);
      return db.lastInsertId();
    },
    update: function (runId, fields) {
      return util.update('t_batch_run', ['runId'], COLUMNS, { runId: runId }, fields);
    },
    /** 実行履歴（実行IDの降順） */
    findRecent: function (limit) {
      return db.all('SELECT b.*, e.employee_name AS executed_by_name FROM t_batch_run b ' +
        'LEFT JOIN m_employee e ON e.employee_id = b.executed_by ORDER BY b.run_id DESC LIMIT ?', [limit]);
    },
    /** 同じバッチID・同じパラメータで結果が OK または WARN の行があるか（05 の 1.1「成功済み」） */
    hasSuccess: function (batchId, param) {
      return db.get("SELECT 1 AS x FROM t_batch_run WHERE batch_id = ? AND param = ? AND result IN ('OK', 'WARN') LIMIT 1", [batchId, param]) !== null;
    }
  };
})();
