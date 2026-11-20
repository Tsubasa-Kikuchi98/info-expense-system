/*
 * B02 仕訳連携（05 の4章、IF-11）。
 */
(function () {
  'use strict';

  var common = InfoExp.batch.batchCommon;
  var repos = InfoExp.data.repositories;
  var dateUtil = InfoExp.core.dateUtil;
  var csv = InfoExp.core.csv;
  var messages = InfoExp.core.messages;

  var SYSTEM_CODE = 'EXP';
  var CREDIT_ACCOUNT = '2150';      // 未払金（05 の 4.2 貸方）
  var SUMMARY_MAX = 40;
  var TYPES_H = ['X', 'X', 'X', 'X'];
  var TYPES_D = ['X', 'X', 'X', '9', 'X', 'X', 'X', 'X', 'X', '9', '9', 'X', 'X'];
  var TYPES_T = ['X', '9', '9', '9'];

  function summaryOf(item) {
    var text = item.itemKind === 'GEN' ? (item.payeeName || '') + ' ' + item.description : item.description;
    return text.substring(0, SUMMARY_MAX);   // 05 の 2.1 出力は桁で切り捨て（摘要のみ）
  }

  /**
   * 仕訳連携を実行する。
   * @param {string} userId 実行者
   * @returns {Object} batchCommon.execute の結果（fileContent に IF-11 の CSV）
   */
  function run(userId) {
    return common.execute('B02', null, userId, null, function (ctx) {
      var reports = repos.expenseReportRepository.findJournalTargets(ctx.operationDate); // 05 の 4.1 手順1
      var records = [['H', dateUtil.compact(ctx.now), SYSTEM_CODE, dateUtil.compact(ctx.operationDate)]];
      var types = [TYPES_H];
      var debitTotal = 0;
      var creditTotal = 0;
      var detailCount = 0;

      reports.forEach(function (report) {
        var items = repos.expenseItemRepository.findByReport(report.reportId);
        var voucherDate = dateUtil.compact(report.accountingCheckedAt.substring(0, 10));
        // 借方: 明細ごと
        items.forEach(function (item) {
          records.push(['D', voucherDate, report.reportNo, item.itemNo, '1', item.accountCode, '', report.applicantOrgCode,
            item.taxCategory, item.amount, item.taxAmount, item.invoiceNo || '', summaryOf(item)]);
          types.push(TYPES_D);
          debitTotal += item.amount;
          detailCount += 1;
        });
        // 貸方: 申請ごとに1行
        records.push(['D', voucherDate, report.reportNo, items.length + 1, '2', CREDIT_ACCOUNT, report.applicantId, report.applicantOrgCode,
          '', report.totalAmount, 0, '', ('立替経費 ' + (report.applicantName || '')).substring(0, SUMMARY_MAX)]);
        types.push(TYPES_D);
        creditTotal += report.totalAmount;
        detailCount += 1;
        repos.expenseReportRepository.update(report.reportId, { journalRunId: ctx.runId, updatedAt: ctx.now }); // 手順3
      });
      records.push(['T', detailCount, debitTotal, creditTotal]);
      types.push(TYPES_T);

      return {
        recordCount: reports.length,
        totalAmount: debitTotal,
        fileName: 'JRNL_EXP_' + dateUtil.compact(ctx.operationDate) + '_' + dateUtil.compact(ctx.now).substring(8) + '.csv',
        fileContent: csv.build(records, types),
        warnings: reports.length === 0 ? [messages.error('W-401', [])] : []
      };
    });
  }

  InfoExp.batch.b02JournalExport = {
    run: run
  };
})();
