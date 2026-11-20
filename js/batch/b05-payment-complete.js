/*
 * B05 支払済み更新（05 の7章、BR-10）。
 */
(function () {
  'use strict';

  var common = InfoExp.batch.batchCommon;
  var repos = InfoExp.data.repositories;
  var dateUtil = InfoExp.core.dateUtil;
  var settlement = InfoExp.logic.settlement;

  /**
   * 支払済み更新を実行する。
   * @param {string} payMonth 支給年月 'YYYY-MM'
   * @param {string} userId 実行者
   */
  function run(payMonth, userId) {
    var month = (payMonth === null || payMonth === undefined) ? '' : String(payMonth).trim();
    return common.execute('B05', month, userId, null, function (ctx) {
      var rows;
      var total = 0;
      if (!dateUtil.isValidMonth(month)) {
        common.failOne('E-401', ['支給年月', 0, '支給年月が不正です（値: ' + month + '）']);
      }
      // 手順2 同じ支給年月の B04 が成功済み（E-406）
      if (!repos.batchRunRepository.hasSuccess('B04', month)) {
        common.failOne('E-406', [month]);
      }
      // 手順3 業務日付 ≧ 支給年月の26日（E-405）
      if (!settlement.canRunPaymentComplete({ payMonth: month, operationDate: ctx.operationDate })) {
        common.failOne('E-405', []);
      }
      // 手順4・5 状態 70、支払日時 = 処理日時、支払方法 = P
      rows = repos.expenseReportRepository.findPaymentTargets(month);
      rows.forEach(function (r) {
        repos.expenseReportRepository.update(r.reportId, { status: '70', paidAt: ctx.now, paidMethod: 'P', updatedAt: ctx.now });
        total += r.totalAmount;
      });
      return { recordCount: rows.length, totalAmount: total, warnings: [] };
    });
  }

  InfoExp.batch.b05PaymentComplete = {
    run: run
  };
})();
