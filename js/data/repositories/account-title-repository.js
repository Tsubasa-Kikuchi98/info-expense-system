/*
 * m_account_title 勘定科目（03 の 4.8）。
 */
(function () {
  'use strict';

  var util = InfoExp.data.repositories.repositoryUtil;
  var base = util.simple({
    table: 'm_account_title',
    keys: ['accountCode'],
    columns: ['accountName', 'generalSelectable', 'minApprovalLevel', 'attendeeRequired', 'mealCheck', 'taxTarget', 'defaultTaxRate', 'sortOrder', 'updatedAt'],
    orderBy: 'sort_order, account_code'
  });

  InfoExp.data.repositories.accountTitleRepository = {
    findAll: base.findAll,
    insert: base.insert,
    update: base.update,
    remove: base.remove,
    findByCode: function (code) {
      return InfoExp.data.db.get('SELECT * FROM m_account_title WHERE account_code = ?', [code]);
    },
    /** 明細から参照されている件数（E-504） */
    countUsage: function (code) {
      return InfoExp.data.db.get('SELECT COUNT(*) AS n FROM t_expense_item WHERE account_code = ?', [code]).n;
    }
  };
})();
