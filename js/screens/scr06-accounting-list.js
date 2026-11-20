/*
 * SCR-06 経理確認一覧（02 の 5.6）。ADMIN は参照のみ（経理確認は SCR-04 で ACCT が行う）。
 */
(function () {
  'use strict';

  var c = InfoExp.ui.components;
  var el = c.el;
  // 状態の選択肢（「すべて」または 40・50・60・70・30）
  var STATUS_OPTIONS = ['40', '50', '60', '70', '30'];
  var JOURNAL_OPTIONS = [{ value: 'DONE', label: '済' }, { value: 'NOT', label: '未' }];

  function render(container, query) {
    var status = query.status === undefined ? '40' : (query.status === 'ALL' ? '' : query.status);
    var cond = {
      status: status,
      expenseType: query.type || '',
      applicant: query.applicant || '',
      checkedFrom: query.from || '',
      checkedTo: query.to || '',
      payMonth: query.payMonth || '',
      journal: query.journal || ''
    };
    var statusSel = c.select(STATUS_OPTIONS.map(function (s) { return { value: s, label: c.codeName('REPORT_STATUS', s) }; }), cond.status, { id: 'scr06-status' }, 'すべて');
    var typeSel = c.codeSelect('EXPENSE_TYPE', cond.expenseType, { id: 'scr06-type' }, 'すべて');
    var applicantInput = el('input', { type: 'text', class: 'w-s', id: 'scr06-applicant', value: cond.applicant, placeholder: '社員番号・氏名' });
    var fromInput = el('input', { type: 'date', id: 'scr06-date-from', value: cond.checkedFrom });
    var toInput = el('input', { type: 'date', id: 'scr06-date-to', value: cond.checkedTo });
    var payMonthInput = el('input', { type: 'text', class: 'w-xs', id: 'scr06-pay-month', value: cond.payMonth, placeholder: 'YYYY-MM', maxlength: '7' });
    var journalSel = c.select(JOURNAL_OPTIONS, cond.journal, { id: 'scr06-journal' }, 'すべて');
    var result = InfoExp.service.accountingService.search(cond);
    var rows;

    function search() {
      var parts = ['status=' + encodeURIComponent(statusSel.value || 'ALL')];
      if (typeSel.value) { parts.push('type=' + encodeURIComponent(typeSel.value)); }
      if (applicantInput.value.trim()) { parts.push('applicant=' + encodeURIComponent(applicantInput.value.trim())); }
      if (fromInput.value) { parts.push('from=' + encodeURIComponent(fromInput.value)); }
      if (toInput.value) { parts.push('to=' + encodeURIComponent(toInput.value)); }
      if (payMonthInput.value.trim()) { parts.push('payMonth=' + encodeURIComponent(payMonthInput.value.trim())); }
      if (journalSel.value) { parts.push('journal=' + encodeURIComponent(journalSel.value)); }
      InfoExp.ui.router.go('#/accounting?' + parts.join('&'));
    }

    container.appendChild(c.screenTitle('経理確認一覧', 'SCR-06'));
    container.appendChild(c.panel('検索条件', [
      el('div', { class: 'search-form' }, [
        el('label', { class: 'field' }, [el('span', { text: '状態' }), statusSel]),
        el('label', { class: 'field' }, [el('span', { text: '経費種別' }), typeSel]),
        el('label', { class: 'field' }, [el('span', { text: '申請者' }), applicantInput]),
        el('span', { class: 'field' }, [el('span', { text: '経理確認日' }), fromInput, '〜', toInput]),
        el('label', { class: 'field' }, [el('span', { text: '支給年月' }), payMonthInput]),
        el('label', { class: 'field' }, [el('span', { text: '仕訳連携' }), journalSel])
      ]),
      el('div', { class: 'button-bar' }, [
        el('button', { class: 'btn btn-primary', type: 'button', id: 'scr06-search', text: '検索', onclick: search }),
        el('button', { class: 'btn', type: 'button', id: 'scr06-clear', text: '条件クリア', onclick: function () { InfoExp.ui.router.go('#/accounting'); } })
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
          { label: '申請番号', cls: 'nowrap', render: function (r) { return el('a', { href: '#/report?id=' + r.reportId + '&from=accounting', text: r.reportNo }); } },
          { label: '状態', render: function (r) { return c.statusBadge(r.status, r.lateFlag); } },
          { label: '申請者', render: function (r) { return r.applicantId + ' ' + (r.applicantName || ''); } },
          { label: '申請時所属', render: function (r) { return r.applicantOrgName || r.applicantOrgCode; } },
          { label: '経費種別', render: function (r) { return c.codeName('EXPENSE_TYPE', r.expenseType); } },
          { label: '件名', render: function (r) { return r.title; } },
          { label: '合計金額（円）', cls: 'num', render: function (r) { return c.money(r.totalAmount); } },
          { label: '申請日時', cls: 'nowrap', render: function (r) { return r.submittedAt || ''; } },
          { label: '経理確認日時', cls: 'nowrap', render: function (r) { return r.accountingCheckedAt || ''; } },
          { label: '仕訳連携', render: function (r) { return r.journalRunId ? '済' : '未'; } },
          { label: '支給年月', cls: 'nowrap', render: function (r) { return r.payMonth || ''; } }
        ], rows)
      ])
    ]));
    container.querySelector('table').id = 'scr06-list';
  }

  InfoExp.screens.scr06AccountingList = {
    render: render
  };
})();
