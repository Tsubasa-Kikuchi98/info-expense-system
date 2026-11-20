/*
 * m_approval_rule 承認ルート規則（03 の 4.9）。
 */
(function () {
  'use strict';

  var util = InfoExp.data.repositories.repositoryUtil;
  var base = util.simple({
    table: 'm_approval_rule',
    keys: ['expenseType', 'validFrom', 'amountFrom'],
    columns: ['amountTo', 'validTo', 'requiredLevel', 'updatedAt'],
    orderBy: 'expense_type, valid_from, amount_from'
  });

  InfoExp.data.repositories.approvalRuleRepository = {
    findAll: base.findAll,
    insert: base.insert,
    update: base.update,
    remove: base.remove
  };
})();
