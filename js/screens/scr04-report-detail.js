/*
 * SCR-04 申請詳細（02 の 5.4）: 表示と、承認・差戻し・否認・取下げ・経理確認・経理差戻し・個別支払済み登録・承認者変更。
 */
(function () {
  'use strict';

  var c = InfoExp.ui.components;
  var el = c.el;
  var router = InfoExp.ui.router;
  var BACK_TARGETS = { reports: '#/reports', approvals: '#/approvals', accounting: '#/accounting' };

  function nameOf(employeeId) {
    var u;
    if (!employeeId) {
      return '';
    }
    u = InfoExp.service.userService.getUser(employeeId);
    return employeeId + ' ' + (u ? u.employeeName : '');
  }

  function label(text) {
    return el('div', { class: 'label', text: text });
  }

  function value(content, span) {
    return el('div', { class: 'value' + (span ? ' span' + span : '') }, content);
  }

  function headerPanel(d) {
    var r = d.report;
    return c.panel('申請', el('div', { class: 'form-grid', id: 'scr04-header' }, [
      label('申請番号'), value(el('span', { id: 'scr04-report-no', text: r.reportNo })),
      label('状態'), value(el('span', { id: 'scr04-status' }, c.statusBadge(r.status, r.lateFlag))),
      label('経費種別'), value(c.codeName('EXPENSE_TYPE', r.expenseType)),
      label('申請者'), value(r.applicantId + ' ' + (r.applicantName || '')),
      label('申請時所属'), value(r.applicantOrgCode + ' ' + (r.applicantOrgName || '')),
      label('合計金額'), value(el('span', { class: 'total-amount', id: 'scr04-total', text: c.money(r.totalAmount) + ' 円' })),
      label('件名'), value(r.title, 3),
      label('申請理由・備考'), value(r.remarks || '', 3),
      label('必要段数'), value(r.requiredLevel ? r.requiredLevel + ' 段' : '—'),
      label('申請回次'), value(String(r.applyCount)),
      label('初回申請日時'), value(r.firstSubmittedAt || '—'),
      label('申請日時'), value(r.submittedAt || '—'),
      label('遅延申請'), value(r.lateFlag === 1 ? '遅延（理由: ' + (r.lateReason || '') + '）' : 'なし', 3),
      label('経理確認日時'), value(r.accountingCheckedAt || '—'),
      label('経理確認者'), value(nameOf(r.accountingCheckerId) || '—'),
      label('支給年月'), value(r.payMonth || '—'),
      label('仕訳連携'), value(r.journalRunId ? '済' : '未'),
      label('支払日時'), value(r.paidAt || '—'),
      label('支払方法'), value(r.paidMethod ? c.codeName('PAID_METHOD', r.paidMethod) : '—')
    ]));
  }

  function tripPanel(r) {
    return c.panel('出張情報', el('div', { class: 'form-grid' }, [
      label('出張先'), value(r.tripDestination || ''),
      label('出張区分'), value(c.codeName('TRIP_TYPE', r.tripType)),
      label('出発日'), value(r.tripStartDate || ''),
      label('帰着日'), value(r.tripEndDate || ''),
      label('片道距離'), value(r.tripDistanceKm !== null ? r.tripDistanceKm + ' km' : '—'),
      label('日当算定役職'), value(c.codeName('POSITION', r.allowancePositionCode))
    ]));
  }

  function itemsPanel(d, editable) {
    var stations = {};
    var generalAccounts = [];
    var accounts = {};
    InfoExp.service.masterService.stations().forEach(function (s) { stations[s.stationCode] = s.stationName; });
    InfoExp.service.masterService.accounts().forEach(function (a) {
      accounts[a.accountCode] = a.accountName;
      if (a.generalSelectable === 1) {
        generalAccounts.push({ value: a.accountCode, label: a.accountName });
      }
    });
    function routeOf(i) {
      if (i.itemKind === 'RAIL') {
        return c.codeName('LINE', i.lineCode) + ' ' + (stations[i.fromStationCode] || '') + '→' + (stations[i.toStationCode] || '');
      }
      return i.routeText || '';
    }
    var table = c.table([
      { label: 'No', cls: 'num', render: function (i) { return String(i.itemNo); } },
      { label: '明細区分', render: function (i) { return c.codeName('ITEM_KIND', i.itemKind); } },
      { label: '利用日', cls: 'nowrap', render: function (i) { return i.useDate; } },
      { label: '用務・内容（支払先）', render: function (i) { return i.description + (i.payeeName ? '（' + i.payeeName + '）' : ''); } },
      { label: '区間・経路', render: function (i) {
        return [routeOf(i), i.tripWay ? '（' + c.codeName('TRIP_WAY', i.tripWay) + '）' : ''].join('');
      } },
      { label: '運賃・控除額（片道）', cls: 'num', render: function (i) {
        if (i.itemKind === 'RAIL') { return c.money(i.fareAmount) + ' / ' + (i.deductionAmount === null ? '—' : c.money(i.deductionAmount)); }
        if (i.itemKind === 'PUBT') { return c.money(i.unitAmount); }
        if (i.itemKind === 'HOTEL') { return '実費 ' + c.money(i.actualAmount) + '（上限 ' + c.money(i.limitAmount) + '）'; }
        if (i.itemKind === 'ALLOW') { return c.money(i.unitAmount) + ' × ' + i.days + '日'; }
        return '';
      } },
      { label: '勘定科目', render: function (i) {
        if (editable && i.itemKind === 'GEN') {
          return c.select(generalAccounts, i.accountCode, { 'data-account-item': String(i.itemNo), 'data-field': 'accountCode', 'data-item': String(i.itemNo) });
        }
        return accounts[i.accountCode] || i.accountCode;
      } },
      { label: '税区分・税率・消費税額・登録番号', render: function (i) {
        return el('div', null, [
          editable ? c.codeSelect('TAX_CATEGORY', i.taxCategory, { 'data-tax-item': String(i.itemNo) }) : c.codeName('TAX_CATEGORY', i.taxCategory),
          el('div', { text: c.codeName('TAX_RATE', i.taxRate) + '　税 ' + c.money(i.taxAmount) + '円' }),
          i.invoiceNo ? el('div', { text: i.invoiceNo }) : null
        ]);
      } },
      { label: '参加人数・参加者', render: function (i) { return i.attendeeCount ? i.attendeeCount + '人 ' + (i.attendeeNames || '') : ''; } },
      { label: '支払方法・領収書（要否）', render: function (i) {
        return el('div', null, [
          el('div', { text: c.codeName('PAY_METHOD', i.payMethod) }),
          el('div', { text: c.codeName('RECEIPT_KIND', i.receiptKind) + '（' + c.codeName('RECEIPT_REQUIRED', i.receiptRequired) + '）' }),
          i.receiptFileName ? el('div', { class: 'file-name', text: i.receiptFileName }) : null
        ]);
      } },
      { label: '精算額（円）', cls: 'num', render: function (i) { return el('b', { text: c.money(i.amount) }); } }
    ], d.items);
    table.className = 'list compact';
    table.id = 'scr04-items';
    return c.panel('明細', el('div', { class: 'table-scroll' }, table));
  }

  function roundsPanel(d) {
    var body = [];
    if (d.rounds.length === 0) {
      body.push(el('p', { class: 'empty', text: '承認経路はありません（未申請）。' }));
    }
    d.rounds.forEach(function (round) {
      body.push(el('div', { class: 'round-title', text: '申請回次 ' + round.applyCount + (round.applyCount === d.report.applyCount ? '（最新）' : '') }));
      body.push(c.table([
        { label: '段順', cls: 'num', render: function (s) { return String(s.stepNo); } },
        { label: '段', cls: 'nowrap', render: function (s) { return s.stepKind === 'ACCOUNT' ? '経理確認' : c.codeName('APPROVAL_LEVEL', s.approvalLevel); } },
        { label: '承認者', render: function (s) { return s.approverId ? s.approverId + ' ' + (s.approverName || '') : '経理担当者'; } },
        { label: '段状態', cls: 'nowrap', render: function (s) { return c.codeName('STEP_STATUS', s.stepStatus); } },
        { label: '処理者', render: function (s) { return s.actedBy ? s.actedBy + ' ' + (s.actedByName || '') : ''; } },
        { label: '処理日時', cls: 'nowrap', render: function (s) { return s.actedAt || ''; } },
        { label: 'コメント', render: function (s) { return s.actionComment || ''; } },
        { label: '承認者変更記録', render: function (s) { return s.changedNote ? el('div', { class: 'note-pre', text: s.changedNote }) : ''; } }
      ], round.steps));
    });
    return c.panel('承認経路', body);
  }

  function run(result, reportId, from) {
    if (result.isOk) {
      router.goWithMessages('#/report?id=' + reportId + (from ? '&from=' + from : ''), result.messages);
    } else {
      c.showMessages(result.errors);
      c.markErrors(document.getElementById('screen'), result.errors);
    }
  }

  function actionsPanel(d, session, from) {
    var r = d.report;
    var boxes = [];
    var userId = session.userId;
    var comment;
    var accountComment;
    var stepSelect;
    var approverInput;
    var reasonInput;
    var candidates;

    if (d.can.EDIT) {
      boxes.push(el('div', { class: 'button-bar' }, [el('button', { class: 'btn btn-primary', type: 'button', id: 'scr04-edit', text: '編集',
        onclick: function () { router.go('#/report/edit?id=' + r.reportId); } })]));
    }
    if (d.can.WITHDRAW) {
      boxes.push(el('div', { class: 'button-bar' }, [el('button', { class: 'btn btn-danger', type: 'button', id: 'scr04-withdraw', text: '取下げ',
        onclick: function () {
          c.confirm('C-002', [], function () { run(InfoExp.service.reportService.withdraw(r.reportId, userId, r.updatedAt), r.reportId, from); });
        } })]));
    }
    if (d.can.APPROVE) {
      comment = el('textarea', { id: 'scr04-comment', 'data-field': 'comment', maxlength: '200', placeholder: '差戻し・否認の場合は必須（200文字以内）' });
      boxes.push(el('div', { class: 'action-box', id: 'scr04-approval-box' }, [
        el('h3', { text: '承認（' + c.codeName('APPROVAL_LEVEL', d.currentStep.approvalLevel) + '）' }),
        el('div', null, [el('div', { class: 'panel-note', text: 'コメント' }), comment]),
        el('div', { class: 'button-bar' }, [
          el('button', { class: 'btn btn-primary', type: 'button', id: 'scr04-approve', text: '承認', onclick: function () {
            c.confirm('C-004', [], function () { run(InfoExp.service.approvalService.approve(r.reportId, userId, comment.value, r.updatedAt), r.reportId, from); });
          } }),
          el('button', { class: 'btn', type: 'button', id: 'scr04-back', text: '差戻し', onclick: function () {
            c.confirm('C-005', [], function () { run(InfoExp.service.approvalService.back(r.reportId, userId, comment.value, r.updatedAt), r.reportId, from); });
          } }),
          el('button', { class: 'btn btn-danger', type: 'button', id: 'scr04-reject', text: '否認', onclick: function () {
            c.confirm('C-006', [], function () { run(InfoExp.service.approvalService.reject(r.reportId, userId, comment.value, r.updatedAt), r.reportId, from); });
          } })
        ])
      ]));
    }
    if (d.can.ACCOUNT_CHECK) {
      accountComment = el('textarea', { id: 'scr04-account-comment', 'data-field': 'comment', maxlength: '200', placeholder: '経理差戻しの場合は必須（200文字以内）' });
      boxes.push(el('div', { class: 'action-box', id: 'scr04-account-box' }, [
        el('h3', { text: '経理確認' }),
        el('p', { class: 'panel-note', text: '明細の勘定科目（一般経費のみ）・税区分は上の明細の表で変更できます。変更した値をそのまま保存します（自動判定し直しません）。' }),
        el('div', null, [el('div', { class: 'panel-note', text: 'コメント' }), accountComment]),
        el('div', { class: 'button-bar' }, [
          el('button', { class: 'btn btn-primary', type: 'button', id: 'scr04-account-check', text: '経理確認', onclick: function () {
            c.confirm('C-007', [], function () {
              var changes = d.items.map(function (i) {
                var acc = document.querySelector('[data-account-item="' + i.itemNo + '"]');
                var tax = document.querySelector('[data-tax-item="' + i.itemNo + '"]');
                return { itemNo: i.itemNo, accountCode: acc ? acc.value : null, taxCategory: tax ? tax.value : null };
              });
              run(InfoExp.service.accountingService.accountCheck(r.reportId, userId, changes, accountComment.value, r.updatedAt), r.reportId, from);
            });
          } }),
          el('button', { class: 'btn', type: 'button', id: 'scr04-account-back', text: '経理差戻し', onclick: function () {
            c.confirm('C-005', [], function () { run(InfoExp.service.approvalService.accountBack(r.reportId, userId, accountComment.value, r.updatedAt), r.reportId, from); });
          } })
        ])
      ]));
    }
    if (d.can.MANUAL_PAID) {
      boxes.push(el('div', { class: 'action-box', id: 'scr04-manual-paid-box' }, [
        el('h3', { text: '個別支払済み登録' }),
        el('p', { class: 'panel-note', text: '給与連携の対象外（退職者など）の申請を、個別に振り込んだ後に登録します。' }),
        el('button', { class: 'btn btn-primary', type: 'button', id: 'scr04-manual-paid', text: '個別支払済み登録', onclick: function () {
          c.confirm('C-011', [], function () { run(InfoExp.service.accountingService.manualPaid(r.reportId, userId, r.updatedAt), r.reportId, from); });
        } })
      ]));
    }
    if (d.can.CHANGE_APPROVER) {
      candidates = d.currentSteps.filter(function (s) { return s.stepKind === 'APPROVE' && (s.stepStatus === 'CUR' || s.stepStatus === 'WAIT'); });
      stepSelect = c.select(candidates.map(function (s) {
        return { value: String(s.stepId), label: '段順' + s.stepNo + ' ' + c.codeName('APPROVAL_LEVEL', s.approvalLevel) + '（' + s.approverId + ' ' + (s.approverName || '') + '）' };
      }), candidates.length ? String(candidates[0].stepId) : '', { id: 'scr04-change-step', 'data-field': 'stepId' });
      approverInput = el('input', { type: 'text', class: 'w-s', id: 'scr04-change-approver', 'data-field': 'newApproverId', maxlength: '6', placeholder: '社員番号' });
      reasonInput = el('input', { type: 'text', class: 'w-l', id: 'scr04-change-reason', 'data-field': 'reason', maxlength: '100' });
      boxes.push(el('div', { class: 'action-box', id: 'scr04-change-box' }, [
        el('h3', { text: '承認者変更（システム管理者）' }),
        el('div', { class: 'form-grid' }, [
          label('対象の段'), value(stepSelect, 3),
          label('変更後の社員番号'), value(approverInput, 3),
          label('変更理由'), value(reasonInput, 3)
        ]),
        el('div', { class: 'button-bar' }, [el('button', { class: 'btn', type: 'button', id: 'scr04-change', text: '承認者を変更', onclick: function () {
          run(InfoExp.service.approvalService.changeApprover(r.reportId, stepSelect.value, approverInput.value, reasonInput.value, userId, r.updatedAt), r.reportId, from);
        } })])
      ]));
    }
    boxes.push(el('div', { class: 'button-bar' }, [el('span', { class: 'spacer' }), el('button', { class: 'btn', type: 'button', id: 'scr04-return', text: '戻る',
      onclick: function () { router.go(BACK_TARGETS[from] || '#/reports'); } })]));
    return boxes;
  }

  function render(container, query, session) {
    var result = InfoExp.service.reportService.getDetail(query.id, session.userId);
    var d;
    if (!result.isOk) {
      router.goWithMessages('#/home', result.errors);
      return;
    }
    d = result.data;
    container.appendChild(c.screenTitle('申請詳細', 'SCR-04'));
    container.appendChild(headerPanel(d));
    if (d.report.expenseType === 'BT') {
      container.appendChild(tripPanel(d.report));
    }
    container.appendChild(itemsPanel(d, d.can.ACCOUNT_CHECK));
    container.appendChild(roundsPanel(d));
    actionsPanel(d, session, query.from).forEach(function (n) { container.appendChild(n); });
  }

  InfoExp.screens.scr04ReportDetail = {
    render: render
  };
})();
