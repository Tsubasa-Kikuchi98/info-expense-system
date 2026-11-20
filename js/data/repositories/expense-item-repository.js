/*
 * t_expense_item 経費明細（03 の 4.14）。
 */
(function () {
  'use strict';

  var util = InfoExp.data.repositories.repositoryUtil;
  var db = InfoExp.data.db;
  var COLUMNS = ['reportId', 'itemNo', 'itemKind', 'useDate', 'description', 'lineCode', 'fromStationCode', 'toStationCode',
    'routeText', 'tripWay', 'fareAmount', 'deductionAmount', 'unitAmount', 'days', 'regionCode', 'actualAmount', 'limitAmount',
    'accountCode', 'payeeName', 'taxRate', 'taxAmount', 'invoiceNo', 'mealFlag', 'attendeeCount', 'attendeeNames', 'payMethod',
    'receiptKind', 'receiptFileName', 'receiptRequired', 'taxCategory', 'amount', 'updatedAt'];

  InfoExp.data.repositories.expenseItemRepository = {
    /** 申請の明細（明細番号の順） */
    findByReport: function (reportId) {
      return db.all('SELECT * FROM t_expense_item WHERE report_id = ? ORDER BY item_no', [reportId]);
    },
    insert: function (row) {
      return util.insert('t_expense_item', COLUMNS, row);
    },
    /** 経理確認時の勘定科目・税区分の変更（02 の 5.4.3） */
    updateAccounting: function (reportId, itemNo, fields) {
      return util.update('t_expense_item', ['reportId', 'itemNo'], ['accountCode', 'taxCategory', 'updatedAt'],
        { reportId: reportId, itemNo: itemNo }, fields);
    },
    removeByReport: function (reportId) {
      return db.run('DELETE FROM t_expense_item WHERE report_id = ?', [reportId]);
    }
  };
})();
