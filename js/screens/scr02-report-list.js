/*
 * SCR-02 申請一覧（02 の 5.2）。申請者 = 利用者の申請を更新日時の降順で表示する。
 */
(function () {
  'use strict';

  var c = InfoExp.ui.components;
  var el = c.el;

  function linkOf(row) {
    // 状態 10・30 は SCR-03、それ以外は SCR-04
    var hash = (row.status === '10' || row.status === '30') ? '#/report/edit?id=' + row.reportId : '#/report?id=' + row.reportId + '&from=reports';
    return el('a', { href: hash, text: row.reportNo });
  }

  function render(container, query, session) {
    var cond = {
      status: query.status || '',
      expenseType: query.type || '',
      dateFrom: query.from || '',
      dateTo: query.to || '',
      title: query.title || ''
    };
    var statusSel = c.codeSelect('REPORT_STATUS', cond.status, { id: 'scr02-status' }, 'すべて');
    var typeSel = c.codeSelect('EXPENSE_TYPE', cond.expenseType, { id: 'scr02-type' }, 'すべて');
    var fromInput = el('input', { type: 'date', id: 'scr02-date-from', value: cond.dateFrom });
    var toInput = el('input', { type: 'date', id: 'scr02-date-to', value: cond.dateTo });
    var titleInput = el('input', { type: 'text', id: 'scr02-title', class: 'w-m', value: cond.title });
    var result = InfoExp.service.reportService.search(session.userId, cond);
    var rows;

    function search() {
      var parts = [];
      if (statusSel.value) { parts.push('status=' + encodeURIComponent(statusSel.value)); }
      if (typeSel.value) { parts.push('type=' + encodeURIComponent(typeSel.value)); }
      if (fromInput.value) { parts.push('from=' + encodeURIComponent(fromInput.value)); }
      if (toInput.value) { parts.push('to=' + encodeURIComponent(toInput.value)); }
      if (titleInput.value.trim()) { parts.push('title=' + encodeURIComponent(titleInput.value.trim())); }
      InfoExp.ui.router.go('#/reports' + (parts.length ? '?' + parts.join('&') : ''));
    }

    container.appendChild(c.screenTitle('申請一覧', 'SCR-02'));
    container.appendChild(c.panel('検索条件', [
      el('div', { class: 'search-form' }, [
        el('label', { class: 'field' }, [el('span', { text: '状態' }), statusSel]),
        el('label', { class: 'field' }, [el('span', { text: '経費種別' }), typeSel]),
        el('span', { class: 'field' }, [el('span', { text: '申請日' }), fromInput, '〜', toInput]),
        el('label', { class: 'field' }, [el('span', { text: '件名' }), titleInput])
      ]),
      el('div', { class: 'button-bar' }, [
        el('button', { class: 'btn btn-primary', type: 'button', id: 'scr02-search', text: '検索', onclick: search }),
        el('button', { class: 'btn', type: 'button', id: 'scr02-clear', text: '条件クリア', onclick: function () { InfoExp.ui.router.go('#/reports'); } }),
        el('span', { class: 'spacer' }),
        el('button', { class: 'btn', type: 'button', id: 'scr02-new-tr', text: '交通費を申請', onclick: function () { InfoExp.ui.router.go('#/report/edit?type=TR'); } }),
        el('button', { class: 'btn', type: 'button', id: 'scr02-new-bt', text: '出張旅費を申請', onclick: function () { InfoExp.ui.router.go('#/report/edit?type=BT'); } }),
        el('button', { class: 'btn', type: 'button', id: 'scr02-new-ge', text: '一般経費を申請', onclick: function () { InfoExp.ui.router.go('#/report/edit?type=GE'); } })
      ])
    ]));

    if (!result.isOk) {
      c.showMessages(result.errors);
      return;
    }
    rows = result.data.rows;
    container.appendChild(el('div', { class: 'panel' }, [
      el('div', { class: 'panel-head' }, ['申請（' + rows.length + '件）']),
      el('div', { class: 'panel-body' }, [
        result.data.isOver ? el('p', { class: 'list-note', text: '検索条件を絞ってください（200件まで表示）' }) : null,
        c.table([
          { label: '申請番号', cls: 'nowrap', render: linkOf },
          { label: '経費種別', render: function (r) { return c.codeName('EXPENSE_TYPE', r.expenseType); } },
          { label: '件名', render: function (r) { return r.title; } },
          { label: '合計金額（円）', cls: 'num', render: function (r) { return c.money(r.totalAmount); } },
          { label: '状態', render: function (r) { return c.statusBadge(r.status, r.lateFlag); } },
          { label: '申請日', cls: 'nowrap', render: function (r) { return c.dateOf(r.submittedAt); } },
          { label: '更新日時', cls: 'nowrap', render: function (r) { return r.updatedAt; } }
        ], rows)
      ])
    ]));
    container.querySelector('table').id = 'scr02-list';
  }

  InfoExp.screens.scr02ReportList = {
    render: render
  };
})();
