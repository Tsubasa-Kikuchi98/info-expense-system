/*
 * バッチの共通処理（05 の2章）: 1回の実行を1トランザクションとし、結果にかかわらず t_batch_run に1行記録する。
 * エラー時はロールバックし、ロールバックの後に結果 NG の行を記録する。
 *
 * 各バッチの処理関数 body(ctx) は ctx = { runId, operationDate, now, userId } を受け取り、
 * { recordCount, totalAmount, fileName, fileContent, warnings: [{ msgId, params }] } を返す。
 * 処理を中止するときは fail(errors) で投げる。
 */
(function () {
  'use strict';

  var db = InfoExp.data.db;
  var messages = InfoExp.core.messages;
  var clock = InfoExp.service.clockService;
  var repos = InfoExp.data.repositories;
  var masterService = InfoExp.service.masterService;

  /** 処理を中止する（E-4xx） */
  function fail(errors) {
    throw { isBatchError: true, errors: errors };
  }

  function failOne(msgId, params) {
    fail([messages.error(msgId, params, null, null)]);
  }

  function messageText(list) {
    return list.map(function (m) {
      return messages.format(m.msgId, m.params);
    }).join('\n');
  }

  /**
   * バッチを実行する。
   * @param {string} batchId B01〜B05
   * @param {string|null} param 対象年月・支給年月
   * @param {string} userId 実行者
   * @param {Object} options { foreignKeysOff: true（B01） }
   * @param {Function} body 処理
   * @returns {{ result: string, recordCount: number, totalAmount: (number|null), fileName: (string|null),
   *            fileContent: (string|null), messages: Array<{msgId, params}>, runId: number }}
   */
  function execute(batchId, param, userId, options, body) {
    var batchName = masterService.codeNames('BATCH_ID')[batchId] || batchId;
    var op = clock.getOperationDate();
    var startedAt = clock.now();
    var outcome;
    var list;
    var result;
    var runId = null;
    var extra;
    var isFkOff = !!(options && options.foreignKeysOff);

    if (InfoExp.data.repositories.userRoleRepository.findRolesOf(userId).indexOf('ADMIN') < 0) {
      return { result: 'NG', recordCount: 0, totalAmount: null, fileName: null, fileContent: null,
        messages: [{ msgId: 'E-203', params: [] }], runId: null };
    }

    try {
      if (isFkOff) {
        db.exec('PRAGMA foreign_keys = OFF');   // 05 の 3.1 手順4（トランザクションの外で切り替える）
      }
      outcome = db.transaction(function () {
        var r;
        // 実行中の行は結果 NG で登録し、終了時に更新する（実行中の行を「成功済み」と数えないため）
        runId = repos.batchRunRepository.insert({
          batchId: batchId, operationDate: op, param: param, startedAt: startedAt, endedAt: null, result: 'NG',
          recordCount: 0, totalAmount: null, fileName: null, message: null, executedBy: userId, updatedAt: startedAt
        });
        r = body({ runId: runId, operationDate: op, now: startedAt, userId: userId });
        list = (r.warnings || []).slice();
        if (list.length === 0) {
          list.push({ msgId: 'I-401', params: [batchName, r.recordCount] });
        }
        result = (r.warnings && r.warnings.length > 0) ? 'WARN' : 'OK';
        repos.batchRunRepository.update(runId, {
          endedAt: clock.now(), result: result, recordCount: r.recordCount,
          totalAmount: r.totalAmount === undefined ? null : r.totalAmount,
          fileName: r.fileName || null, message: messageText(list), updatedAt: clock.now()
        });
        return r;
      });
    } catch (e) {
      if (isFkOff) {
        db.exec('PRAGMA foreign_keys = ON');
      }
      if (!(e && e.isBatchError)) {
        if (e && e.name === 'ConfigError') {
          e = { errors: [messages.error('E-901', e.params, null, null)] };
        } else {
          throw e;
        }
      }
      // エラー時はロールバックの後に記録する（05 の2章）
      db.transaction(function () {
        runId = repos.batchRunRepository.insert({
          batchId: batchId, operationDate: op, param: param, startedAt: startedAt, endedAt: clock.now(), result: 'NG',
          recordCount: 0, totalAmount: null, fileName: null, message: messageText(e.errors), executedBy: userId, updatedAt: clock.now()
        });
      });
      persistQuietly();
      return { result: 'NG', recordCount: 0, totalAmount: null, fileName: null, fileContent: null, messages: e.errors, runId: runId };
    }
    if (isFkOff) {
      db.exec('PRAGMA foreign_keys = ON');      // 05 の 3.1 手順10
    }
    if (outcome.afterCommit) {
      // B01 の W-402 のように、コミットの後に行う確認。警告があれば結果を WARN にする
      extra = outcome.afterCommit() || [];
      if (extra.length > 0) {
        list = list.filter(function (m) { return m.msgId !== 'I-401'; }).concat(extra);
        result = 'WARN';
        db.transaction(function () {
          repos.batchRunRepository.update(runId, { result: result, message: messageText(list), updatedAt: clock.now() });
        });
      }
    }
    if (!persistQuietly()) {
      list.push({ msgId: 'E-902', params: [] });
    }
    return {
      result: result, recordCount: outcome.recordCount, totalAmount: outcome.totalAmount === undefined ? null : outcome.totalAmount,
      fileName: outcome.fileName || null, fileContent: outcome.fileContent || null, messages: list, runId: runId
    };
  }

  function persistQuietly() {
    try {
      db.persist();
      return true;
    } catch (e) {
      return false;
    }
  }

  /** 実行履歴（SCR-08） */
  function history(limit) {
    return repos.batchRunRepository.findRecent(limit);
  }

  InfoExp.batch.batchCommon = {
    execute: execute,
    fail: fail,
    failOne: failOne,
    history: history
  };
})();
