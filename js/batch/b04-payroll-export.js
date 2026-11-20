/*
 * B04 給与連携（05 の6章、IF-21、BR-10）。
 */
(function () {
  'use strict';

  var common = InfoExp.batch.batchCommon;
  var repos = InfoExp.data.repositories;
  var dateUtil = InfoExp.core.dateUtil;
  var csv = InfoExp.core.csv;
  var messages = InfoExp.core.messages;

  var SYSTEM_CODE = 'EXP';
  var PAY_ITEM_CODE = 'K501';       // 立替経費精算・非課税支給（05 の 6.2）
  var TYPES_H = ['X', 'X', 'X', 'X'];
  var TYPES_D = ['X', 'X', 'X', 'X', '9', '9'];
  var TYPES_T = ['X', '9', '9'];

  /**
   * 給与連携を実行する。
   * @param {string} payMonth 支給年月 'YYYY-MM'
   * @param {string} userId 実行者
   */
  function run(payMonth, userId) {
    var month = (payMonth === null || payMonth === undefined) ? '' : String(payMonth).trim();
    return common.execute('B04', month, userId, null, function (ctx) {
      var rows;
      var retired;
      var targets;
      var groups = [];
      var byEmployee = {};
      var records;
      var types;
      var total = 0;
      var warnings = [];
      var ym;
      if (!dateUtil.isValidMonth(month)) {
        common.failOne('E-401', ['支給年月', 0, '支給年月が不正です（値: ' + month + '）']);
      }
      ym = month.replace('-', '');
      // 手順2 前月を対象年月とする B03 が成功済み（E-407）
      if (!repos.batchRunRepository.hasSuccess('B03', dateUtil.prevMonth(month))) {
        common.failOne('E-407', [dateUtil.prevMonth(month)]);
      }
      // 手順3 同じ支給年月の B04 が未実行（E-408）
      if (repos.batchRunRepository.hasSuccess('B04', month)) {
        common.failOne('E-408', [month]);
      }
      // 手順4・5 対象から退職者（在籍区分 9、または退職日 ≦ 業務日付）を外す（BR-10）
      rows = repos.expenseReportRepository.findPayrollTargets(month);
      retired = rows.filter(function (r) {
        return r.applicantStatus === '9' || (r.applicantRetireDate && r.applicantRetireDate <= ctx.operationDate);
      });
      targets = rows.filter(function (r) { return retired.indexOf(r) < 0; });
      if (retired.length > 0) {
        warnings.push(messages.error('W-403', [retired.length, retired.map(function (r) { return r.reportNo; }).join(',')]));
      }
      // 手順6 社員番号ごとに集計（社員番号の順）
      targets.forEach(function (r) {
        if (!byEmployee[r.applicantId]) {
          byEmployee[r.applicantId] = { employeeId: r.applicantId, amount: 0, count: 0 };
          groups.push(byEmployee[r.applicantId]);
        }
        byEmployee[r.applicantId].amount += r.totalAmount;
        byEmployee[r.applicantId].count += 1;
        repos.expenseReportRepository.update(r.reportId, { payrollRunId: ctx.runId, updatedAt: ctx.now }); // 手順7
      });
      groups.sort(function (a, b) { return a.employeeId < b.employeeId ? -1 : 1; });
      records = [['H', dateUtil.compact(ctx.now), SYSTEM_CODE, ym]];
      types = [TYPES_H];
      groups.forEach(function (g) {
        records.push(['D', g.employeeId, ym, PAY_ITEM_CODE, g.amount, g.count]);
        types.push(TYPES_D);
        total += g.amount;
      });
      records.push(['T', groups.length, total]);
      types.push(TYPES_T);
      if (groups.length === 0) {
        warnings.push(messages.error('W-401', []));
      }
      return {
        recordCount: groups.length,
        totalAmount: total,
        fileName: 'PAY_EXP_' + ym + '.csv',
        fileContent: csv.build(records, types),
        warnings: warnings
      };
    });
  }

  InfoExp.batch.b04PayrollExport = {
    run: run
  };
})();
