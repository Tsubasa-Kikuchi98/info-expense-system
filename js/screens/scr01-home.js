/*
 * SCR-01 ホーム（02 の 5.1）。
 */
(function () {
  'use strict';

  var c = InfoExp.ui.components;
  var el = c.el;

  function card(label, count, hash, id) {
    return el('a', { class: 'count-card', href: hash, id: id }, [
      el('div', { class: 'count-label', text: label }),
      el('div', { class: 'count-value' }, [String(count), el('small', { text: '件' })])
    ]);
  }

  function render(container, query, session) {
    var counts = InfoExp.service.reportService.homeCounts(session.userId);
    var cards = [
      card('下書き', counts.draft, '#/reports?status=10', 'scr01-draft'),
      card('差戻し', counts.back, '#/reports?status=30', 'scr01-back'),
      card('承認中', counts.approving, '#/reports?status=20', 'scr01-approving'),
      card('承認待ち（自分が承認する申請）', counts.pending, '#/approvals', 'scr01-pending')
    ];
    if (session.roles.indexOf('ACCT') >= 0) {
      cards.push(card('経理確認待ち', counts.waitAccount, '#/accounting', 'scr01-wait-account'));
    }
    container.appendChild(c.screenTitle('ホーム', 'SCR-01'));
    container.appendChild(c.panel('新規申請', el('div', { class: 'button-bar' }, [
      el('button', { class: 'btn btn-primary', id: 'scr01-new-tr', type: 'button', text: '交通費を申請', onclick: function () { InfoExp.ui.router.go('#/report/edit?type=TR'); } }),
      el('button', { class: 'btn btn-primary', id: 'scr01-new-bt', type: 'button', text: '出張旅費を申請', onclick: function () { InfoExp.ui.router.go('#/report/edit?type=BT'); } }),
      el('button', { class: 'btn btn-primary', id: 'scr01-new-ge', type: 'button', text: '一般経費を申請', onclick: function () { InfoExp.ui.router.go('#/report/edit?type=GE'); } })
    ])));
    container.appendChild(c.panel('自分に関係する申請', el('div', { class: 'home-grid' }, cards)));
  }

  InfoExp.screens.scr01Home = {
    render: render
  };
})();
