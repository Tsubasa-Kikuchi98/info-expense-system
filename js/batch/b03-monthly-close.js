/*
 * B03 月次締め（05 の5章、BR-10）。
 * SQL では状態 50 の行だけを読み、締め対象の判定は必ず logic の isCloseTarget で行う（SQL の WHERE で日付を絞らない）。
 */
(function () {
  'use strict';

  var common = InfoExp.batch.batchCommon;
  var repos = InfoExp.data.repositories;
  var dateUtil = InfoExp.core.dateUtil;
  var settlement = InfoExp.logic.settlement;

  /**
   * 月次締めを実行する。
   * @param {string} targetMonth 対象年月 'YYYY-MM'
   * @param {string} userId 実行者
   */
  function run(targetMonth, userId) {
    var month = (targetMonth === null || targetMonth === undefined) ? '' : String(targetMonth).trim();
    return common.execute('B03', month, userId, null, function (ctx) {
      var rows;
      var targets;
      var unlinked;
      var payMonth;
      var total = 0;
      // 手順1 パラメータの形式
      if (!dateUtil.isValidMonth(month)) {
        common.failOne('E-401', ['対象年月', 0, '対象年月が不正です（値: ' + month + '）']);
      }
      // 手順2 対象年月が終わっていること（E-409）
      if (!settlement.canCloseMonth({ targetMonth: month, operationDate: ctx.operationDate })) {
        common.failOne('E-409', [month, ctx.operationDate]);
      }
      // 手順3 二重締め（E-403）
      if (repos.batchRunRepository.hasSuccess('B03', month)) {
        common.failOne('E-403', [month]);
      }
      // 手順4 状態 50 の申請を読み、isCloseTarget で絞る（BR-10）
      rows = repos.expenseReportRepository.findByStatus('50');
      targets = rows.filter(function (r) {
        return settlement.isCloseTarget({ status: r.status, checkedAt: r.accountingCheckedAt, targetMonth: month });
      });
      // 手順5 仕訳未連携があればエラー（E-404）
      unlinked = targets.filter(function (r) { return r.journalRunId === null; });
      if (unlinked.length > 0) {
        common.failOne('E-404', [unlinked.length]);
      }
      // 手順6 状態 60、支給年月 = 対象年月の翌月、締め日時 = 処理日時
      payMonth = dateUtil.nextMonth(month);
      targets.forEach(function (r) {
        repos.expenseReportRepository.update(r.reportId, { status: '60', payMonth: payMonth, closedAt: ctx.now, updatedAt: ctx.now });
        total += r.totalAmount;
      });
      return { recordCount: targets.length, totalAmount: total, warnings: [] };
    });
  }

  InfoExp.batch.b03MonthlyClose = {
    run: run
  };
})();
