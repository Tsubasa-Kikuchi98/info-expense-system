/*
 * SCR-05 承認待ち一覧（02 の 5.5）。
 */
(function () {
  'use strict';

  var c = InfoExp.ui.components;
  var el = c.el;

  function render(container, query, session) {
    var rows = InfoExp.service.approvalService.listPending(session.userId);
    container.appendChild(c.screenTitle('承認待ち一覧', 'SCR-05'));
    container.appendChild(el('div', { class: 'panel' }, [
      el('div', { class: 'panel-head' }, ['自分が承認する申請（' + rows.length + '件）']),
      el('div', { class: 'panel-body' }, c.table([
        { label: '申請番号', cls: 'nowrap', render: function (r) { return el('a', { href: '#/report?id=' + r.reportId + '&from=approvals', text: r.reportNo }); } },
        { label: '申請日時', cls: 'nowrap', render: function (r) { return r.submittedAt; } },
        { label: '申請者', render: function (r) { return r.applicantId + ' ' + (r.applicantName || ''); } },
        { label: '経費種別', render: function (r) { return c.codeName('EXPENSE_TYPE', r.expenseType); } },
        { label: '件名', render: function (r) { return r.title; } },
        { label: '合計金額（円）', cls: 'num', render: function (r) { return c.money(r.totalAmount); } },
        { label: '段', cls: 'nowrap', render: function (r) { return c.codeName('APPROVAL_LEVEL', r.approvalLevel); } },
        { label: '遅延', render: function (r) { return r.lateFlag === 1 ? el('span', { class: 'badge badge-late', text: '遅延' }) : ''; } },
        { label: '申請回次', render: function (r) { return r.applyCount >= 2 ? '再申請' : ''; } }
      ], rows, '承認待ちの申請はありません。'))
    ]));
    container.querySelector('table').id = 'scr05-list';
  }

  InfoExp.screens.scr05ApprovalList = {
    render: render
  };
})();
