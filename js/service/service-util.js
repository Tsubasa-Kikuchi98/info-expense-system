/*
 * サービス層の共通処理: 結果の形、エラーの投げ方、トランザクションと保存。
 * サービスの関数は { isOk, data, messages, errors } を返す。
 *   messages: 完了・警告メッセージ（{ msgId, params }）。errors: エラーの配列（{ msgId, params, itemNo, field }）
 */
(function () {
  'use strict';

  var messages = InfoExp.core.messages;
  var db = InfoExp.data.db;

  function ok(data, msgList) {
    return { isOk: true, data: data === undefined ? null : data, messages: msgList || [], errors: [] };
  }

  function ng(errors) {
    return { isOk: false, data: null, messages: [], errors: errors };
  }

  /** 処理を中止するエラーを投げる（guard で結果に変換する） */
  function fail(msgId, params, itemNo, field) {
    throw { isServiceError: true, errors: [messages.error(msgId, params, itemNo, field)] };
  }

  function failAll(errors) {
    throw { isServiceError: true, errors: errors };
  }

  /**
   * 例外を結果に変換する。マスタの設定誤り（ConfigError）は E-901 にする（BR-01-4）。
   * @param {Function} fn 結果を返す関数
   */
  function guard(fn) {
    try {
      return fn();
    } catch (e) {
      if (e && e.isServiceError) {
        return ng(e.errors);
      }
      if (e && e.name === 'ConfigError') {
        return ng([messages.error('E-901', e.params, null, null)]);
      }
      throw e;
    }
  }

  /**
   * トランザクションで更新し、コミット後に DB 全体を保存する（06 の 6.3）。
   * 保存できなかった場合は E-902 をメッセージに加える（メモリ上の DB は更新済み）。
   * @param {Function} fn { data, msgId, params } を返す関数
   */
  function execute(fn) {
    return guard(function () {
      var r = db.transaction(fn) || {};
      var list = r.msgId ? [{ msgId: r.msgId, params: r.params || [] }] : [];
      try {
        db.persist();
      } catch (e) {
        list.push({ msgId: 'E-902', params: [] });
      }
      return ok(r.data, list);
    });
  }

  /** 画面で開いたときから状態・更新日時が変わっていないか確認する（02 の 4.2、E-202） */
  function checkUnchanged(row, expectedUpdatedAt) {
    if (!row || (expectedUpdatedAt !== undefined && expectedUpdatedAt !== null && row.updatedAt !== expectedUpdatedAt)) {
      fail('E-202', []);
    }
  }

  InfoExp.service.serviceUtil = {
    ok: ok,
    ng: ng,
    fail: fail,
    failAll: failAll,
    guard: guard,
    execute: execute,
    checkUnchanged: checkUnchanged
  };
})();
