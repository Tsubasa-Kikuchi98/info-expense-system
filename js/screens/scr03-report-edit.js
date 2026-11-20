/*
 * SCR-03 経費申請入力（02 の 5.3）。
 * 入力のたびにサービス層の recalc（logic の calcReport）で再計算して表示する。画面では業務ルールを計算しない。
 */
(function () {
  'use strict';

  var c = InfoExp.ui.components;
  var el = c.el;
  var router = InfoExp.ui.router;

  // 02 の 5.3.4 明細の追加ボタン
  var ADD_KINDS = { TR: ['RAIL', 'PUBT', 'TAXI'], BT: ['RAIL', 'PUBT', 'TAXI', 'AIR', 'HOTEL'], GE: ['GEN'] };
  var ADD_LABELS = { RAIL: '鉄道（運賃算定）', PUBT: '鉄道・バス（手入力）', TAXI: 'タクシー', AIR: '航空', HOTEL: '宿泊', GEN: '明細を追加' };
  // 明細の再描画が必要な項目（表示する項目が変わるもの）
  var LAYOUT_FIELDS = ['lineCode', 'accountCode', 'receiptKind'];

  var state = null;

  function str(v) {
    return (v === null || v === undefined) ? '' : String(v);
  }

  function newItem(kind) {
    var isTransit = kind === 'RAIL' || kind === 'PUBT';
    return {
      itemKind: kind,
      useDate: state.report.expenseType === 'BT' ? str(state.report.tripStartDate) : '',
      description: '', lineCode: '', fromStationCode: '', toStationCode: '', routeText: '',
      tripWay: isTransit ? '2' : '', unitAmount: '', regionCode: '', actualAmount: '',
      accountCode: '', payeeName: '', taxRate: '', amount: '', taxAmount: '', invoiceNo: '',
      mealFlag: false, attendeeCount: '', attendeeNames: '',
      payMethod: isTransit ? 'IC' : 'CASH', receiptKind: 'NONE', receiptFileName: ''
    };
  }

  /** サービス層に渡す入力 */
  function buildInput() {
    var r = state.report;
    return {
      reportId: r.reportId, expenseType: r.expenseType, title: r.title, remarks: r.remarks, lateReason: r.lateReason,
      tripDestination: r.tripDestination, tripStartDate: r.tripStartDate, tripEndDate: r.tripEndDate, tripType: r.tripType,
      tripDistanceKm: r.tripDistanceKm, items: state.items, expectedUpdatedAt: r.updatedAt
    };
  }

  function markDirty() {
    state.isDirty = true;
  }

  // ---------------------------------------------------------------- 入力部品

  function headerInput(name, type, cls, maxLength) {
    var attrs = { type: type, class: cls, 'data-field': name, id: 'scr03-' + name, value: str(state.report[name]),
      oninput: function (e) { state.report[name] = e.target.value; markDirty(); recalc(); },
      onchange: function (e) { state.report[name] = e.target.value; markDirty(); recalc(); } };
    if (maxLength) {
      attrs.maxlength = String(maxLength);
    }
    return el('input', attrs);
  }

  function headerTextarea(name, maxLength) {
    return el('textarea', { 'data-field': name, id: 'scr03-' + name, maxlength: String(maxLength), value: str(state.report[name]),
      oninput: function (e) { state.report[name] = e.target.value; markDirty(); } });
  }

  function itemAttrs(item, index, name, extra) {
    var attrs = { 'data-field': name, 'data-item': String(index + 1), id: 'scr03-item' + (index + 1) + '-' + name };
    var key;
    for (key in extra || {}) {
      if (Object.prototype.hasOwnProperty.call(extra, key)) {
        attrs[key] = extra[key];
      }
    }
    return attrs;
  }

  function onItemChange(item, name, value) {
    item[name] = value;
    markDirty();
    if (name === 'lineCode') {
      item.fromStationCode = '';
      item.toStationCode = '';
    }
    if (name === 'accountCode') {
      applyAccountDefaults(item);
    }
    if (name === 'receiptKind' && value === 'NONE') {
      item.receiptFileName = '';
    }
    if (LAYOUT_FIELDS.indexOf(name) >= 0) {
      renderItems();
    }
    recalc();
  }

  function itemText(item, index, name, cls, maxLength) {
    return el('input', itemAttrs(item, index, name, { type: 'text', class: cls, value: str(item[name]), maxlength: maxLength ? String(maxLength) : null,
      oninput: function (e) { onItemChange(item, name, e.target.value); } }));
  }

  function itemDate(item, index, name) {
    return el('input', itemAttrs(item, index, name, { type: 'date', value: str(item[name]),
      onchange: function (e) { onItemChange(item, name, e.target.value); },
      oninput: function (e) { item[name] = e.target.value; } }));
  }

  function itemSelect(item, index, name, options, blankLabel) {
    return c.select(options, item[name], itemAttrs(item, index, name, {
      onchange: function (e) { onItemChange(item, name, e.target.value); } }), blankLabel);
  }

  function itemCodeSelect(item, index, name, codeType, blankLabel, filter) {
    return c.codeSelect(codeType, item[name], itemAttrs(item, index, name, {
      onchange: function (e) { onItemChange(item, name, e.target.value); } }), blankLabel, filter);
  }

  function itemRadios(item, index, name, codeType) {
    return c.radios('scr03-item' + (index + 1) + '-' + name + '-' + state.renderSeq, InfoExp.service.masterService.codeList(codeType).map(function (x) {
      return { value: x.code, label: x.codeName };
    }), item[name], { 'data-field': name, 'data-item': String(index + 1), onchange: function (e) { onItemChange(item, name, e.target.value); } });
  }

  function applyAccountDefaults(item) {
    var account = state.accounts[item.accountCode];
    // 02 の 5.3.4 税率の初期値は科目の既定の税率
    item.taxRate = account ? str(account.defaultTaxRate) : '';
    if (!account || account.mealCheck !== 1) {
      item.mealFlag = false;
    }
  }

  function fileField(item, index) {
    var input = el('input', itemAttrs(item, index, 'receiptFileName', { type: 'file', accept: '.pdf,.jpg,.jpeg,.png',
      onchange: function (e) {
        // 添付ファイルはファイル名だけを記録する（02 の 5.3.4）
        item.receiptFileName = e.target.files && e.target.files[0] ? e.target.files[0].name : item.receiptFileName;
        markDirty();
        renderItems();
        recalc();
      } }));
    return el('span', null, [input, item.receiptFileName ? el('span', { class: 'file-name', text: '記録済み: ' + item.receiptFileName }) : null]);
  }

  // ---------------------------------------------------------------- 明細

  function label(text, isRequired) {
    return el('div', { class: 'label' }, [text, isRequired ? el('span', { class: 'req', text: '*' }) : null]);
  }

  function cell(text, node, isRequired, span) {
    var head = label(text, isRequired);
    if (span === 5) {
      head.className += ' row-start';   // 1行全体を使う項目は行の先頭から置く
    }
    return [head, el('div', { class: 'value' + (span ? ' span' + span : '') }, node)];
  }

  function stationOptions(lineCode) {
    return state.stations.filter(function (s) { return s.lineCode === lineCode; }).map(function (s) {
      return { value: s.stationCode, label: s.stationName };
    });
  }

  function itemCells(item, index) {
    var kind = item.itemKind;
    var account = state.accounts[item.accountCode];
    var cells = [];
    var payment = cell('支払方法', itemCodeSelect(item, index, 'payMethod', 'PAY_METHOD', '（選択）'), true);
    // 領収書区分: IC利用履歴は PUBT 以外では表示しない（02 の 5.3.4）
    var receipt = cell('領収書区分', itemCodeSelect(item, index, 'receiptKind', 'RECEIPT_KIND', undefined, function (code) {
      return code !== 'ICLOG' || kind === 'PUBT';
    }), true);
    var file = item.receiptKind && item.receiptKind !== 'NONE' ? cell('添付ファイル', fileField(item, index), true, 5) : [];
    var invoice = cell('登録番号', itemText(item, index, 'invoiceNo', 'w-m', 14));
    cells = cells.concat(cell(kind === 'HOTEL' ? '宿泊日' : '利用日', itemDate(item, index, 'useDate'), true));
    cells = cells.concat(cell(kind === 'HOTEL' ? '宿泊先' : (kind === 'GEN' ? '品名・内容' : '用務・内容'), itemText(item, index, 'description', 'w-l', 100), true, 3));
    if (kind === 'RAIL') {
      cells = cells.concat(cell('路線', itemCodeSelect(item, index, 'lineCode', 'LINE', '（選択）'), true));
      cells = cells.concat(cell('乗車駅', itemSelect(item, index, 'fromStationCode', stationOptions(item.lineCode), '（選択）'), true));
      cells = cells.concat(cell('降車駅', itemSelect(item, index, 'toStationCode', stationOptions(item.lineCode), '（選択）'), true));
      cells = cells.concat(cell('片道・往復', itemRadios(item, index, 'tripWay', 'TRIP_WAY'), true), payment, receipt);
    } else if (kind === 'PUBT') {
      cells = cells.concat(cell('経路', itemText(item, index, 'routeText', 'w-l', 100), true, 3));
      cells = cells.concat(cell('片道・往復', itemRadios(item, index, 'tripWay', 'TRIP_WAY'), true));
      cells = cells.concat(cell('片道運賃（円）', itemText(item, index, 'unitAmount', 'w-s'), true), invoice, payment, receipt);
    } else if (kind === 'TAXI' || kind === 'AIR') {
      cells = cells.concat(cell('経路', itemText(item, index, 'routeText', 'w-l', 100), true, 3));
      cells = cells.concat(cell('金額（税込・円）', itemText(item, index, 'amount', 'w-s'), true), invoice, payment, receipt);
    } else if (kind === 'HOTEL') {
      cells = cells.concat(cell('地域区分', itemRadios(item, index, 'regionCode', 'REGION'), true));
      cells = cells.concat(cell('実費（円）', itemText(item, index, 'actualAmount', 'w-s'), true), invoice, payment, receipt);
    } else if (kind === 'GEN') {
      cells = cells.concat(cell('勘定科目', itemSelect(item, index, 'accountCode', state.generalAccounts, '（選択）'), true));
      cells = cells.concat(cell('支払先', itemText(item, index, 'payeeName', 'w-m', 40), true));
      cells = cells.concat(cell('税率', itemCodeSelect(item, index, 'taxRate', 'TAX_RATE', '（選択）'), true));
      cells = cells.concat(cell('金額（税込・円）', itemText(item, index, 'amount', 'w-s'), true));
      cells = cells.concat(cell('消費税額（円）', [itemText(item, index, 'taxAmount', 'w-s'), el('span', { class: 'panel-note', text: ' 空欄なら自動計算' })]));
      cells = cells.concat(invoice);
      if (account && account.mealCheck === 1) {
        cells = cells.concat(cell('飲食を伴う', el('label', { class: 'check-label' }, [el('input', itemAttrs(item, index, 'mealFlag', { type: 'checkbox', checked: !!item.mealFlag,
          onchange: function (e) { onItemChange(item, 'mealFlag', e.target.checked); } })), ' 伴う'])));
      }
      cells = cells.concat(cell('参加人数', itemText(item, index, 'attendeeCount', 'w-xs'), !!(account && account.attendeeRequired === 1)));
      cells = cells.concat(cell('参加者', itemText(item, index, 'attendeeNames', 'w-l', 200), !!(account && account.attendeeRequired === 1), account && account.mealCheck === 1 ? null : 3));
      cells = cells.concat(payment, receipt);
    }
    return cells.concat(file);
  }

  function renderItems() {
    var box = state.refs.items;
    state.renderSeq += 1;
    box.innerHTML = '';
    state.refs.itemCalc = [];
    if (state.items.length === 0) {
      box.appendChild(el('p', { class: 'empty', text: '明細がありません。上のボタンで明細を追加してください。' }));
    }
    state.items.forEach(function (item, index) {
      var calcBox = el('div', { class: 'item-calc', id: 'scr03-item' + (index + 1) + '-calc' });
      state.refs.itemCalc.push(calcBox);
      box.appendChild(el('div', { class: 'item-card', id: 'scr03-item' + (index + 1) }, [
        el('div', { class: 'item-card-head' }, [
          el('span', { class: 'item-no', text: '明細' + (index + 1) }),
          el('span', { class: 'item-kind', text: c.codeName('ITEM_KIND', item.itemKind) }),
          el('span', { class: 'spacer' }),
          el('button', { class: 'btn btn-small btn-danger', type: 'button', text: '削除', id: 'scr03-item' + (index + 1) + '-delete', onclick: function () {
            state.items.splice(index, 1);
            markDirty();
            renderItems();
            recalc();
          } })
        ]),
        el('div', { class: 'item-grid' }, itemCells(item, index)),
        calcBox
      ]));
    });
    state.refs.addButtons.forEach(function (b) {
      b.disabled = state.items.length >= InfoExp.core.config.ITEM_MAX_ROWS;
    });
  }

  // ---------------------------------------------------------------- 再計算の表示

  function receiptText(item) {
    if (item.receiptRequired === 'R') {
      return '必須';
    }
    if (item.receiptRequired === 'X') {
      return '不要（添付不可）';
    }
    if (item.receiptRequired === 'O') {
      return item.itemKind === 'GEN' ? '任意' : '不要';
    }
    return '—';
  }

  function calcContent(item) {
    var parts = [];
    var fmt = InfoExp.core.messages.format;
    if (item.itemKind === 'RAIL') {
      if (item.railResult === 'OK') {
        parts.push(el('span', null, ['運賃（片道） ', el('b', { text: c.money(item.fareAmount) }), '円　控除額（片道） ', el('b', { text: c.money(item.deductionAmount) }), '円']));
      } else if (item.railResult === 'ALL_INSIDE') {
        parts.push(el('span', { class: 'item-alert', text: fmt('E-113', [item.itemNo]) }));
      } else if (item.railResult === 'NO_FARE') {
        parts.push(el('span', { class: 'item-alert', text: fmt('E-131', [item.itemNo]) }));
      } else if (item.railResult === 'SAME_STATION') {
        parts.push(el('span', { class: 'item-alert', text: fmt('E-112', [item.itemNo]) }));
      }
    }
    if (item.itemKind === 'HOTEL' && item.limitAmount !== null) {
      parts.push(el('span', null, ['上限額 ', el('b', { text: c.money(item.limitAmount) }), '円　自己負担額 ', el('b', { text: c.money(item.selfBurden) }), '円']));
    }
    if (item.itemKind === 'ALLOW') {
      parts.push(el('span', null, ['日当単価 ', el('b', { text: c.money(item.unitAmount) }), '円 × 日数 ', el('b', { text: String(item.days) }), '日']));
    }
    parts.push(el('span', null, ['領収書 ', el('b', { text: receiptText(item) })]));
    parts.push(el('span', null, ['税区分 ', el('b', { text: item.taxCategory ? c.codeName('TAX_CATEGORY', item.taxCategory) : '—' })]));
    parts.push(el('span', null, ['消費税額 ', el('b', { text: item.taxAmount === null ? '—' : c.money(item.taxAmount) }), item.taxAmount === null ? '' : '円']));
    parts.push(el('span', { class: 'amount' }, ['精算額 ', el('b', { text: item.amount === null ? '—' : c.money(item.amount) }), item.amount === null ? '' : '円']));
    return parts;
  }

  function routeText(route) {
    if (route.error) {
      return el('span', { class: 'item-alert', text: InfoExp.core.messages.format(route.error.msgId, route.error.params) });
    }
    return route.steps.map(function (s) {
      var u = state.employees[s.approverId];
      return (u ? u.employeeName.split(' ')[0] : s.approverId) + '（' + c.codeName('APPROVAL_LEVEL', s.level) + '）';
    }).concat(['経理確認']).join(' → ');
  }

  function recalc() {
    var result = InfoExp.service.reportService.recalc(buildInput(), state.userId);
    var calc;
    var refs = state.refs;
    var allowance;
    var route;
    var warnings;
    if (!result.isOk) {
      refs.calcError.innerHTML = '';
      refs.calcError.appendChild(el('div', { class: 'msg msg-error', text: InfoExp.core.messages.format(result.errors[0].msgId, result.errors[0].params) }));
      return;
    }
    refs.calcError.innerHTML = '';
    calc = result.data;
    state.calc = calc;
    calc.items.forEach(function (item, i) {
      if (item.itemKind === 'ALLOW') {
        allowance = item;
      } else if (refs.itemCalc[i]) {
        refs.itemCalc[i].innerHTML = '';
        calcContent(item).forEach(function (n) { refs.itemCalc[i].appendChild(n); });
      }
    });
    // 日当明細（出発日・帰着日・出張区分が揃ったときだけ。常に最後の行）
    if (refs.allowance) {
      refs.allowance.innerHTML = '';
      if (allowance) {
        refs.allowance.appendChild(el('div', { class: 'item-card', id: 'scr03-allowance' }, [
          el('div', { class: 'item-card-head' }, [el('span', { class: 'item-no', text: '明細' + allowance.itemNo }), el('span', { class: 'item-kind', text: '日当' }),
            el('span', { class: 'panel-note', text: '（出張情報から自動で作成します）' })]),
          el('div', { class: 'item-calc' }, calcContent(allowance))
        ]));
      }
    }
    if (refs.position) {
      refs.position.textContent = calc.allowancePositionCode ? c.codeName('POSITION', calc.allowancePositionCode) : '—';
    }
    refs.deadline.textContent = calc.deadline || '—';
    refs.lateRow.forEach(function (n) { n.style.display = calc.isLate ? '' : 'none'; });
    // W-101 は遅延理由の欄に、W-102・W-103 は集計部に表示する
    document.getElementById('scr03-late-warning').textContent = calc.isLate ? InfoExp.core.messages.format('W-101', [calc.deadline]) : '';
    refs.total.textContent = c.money(calc.totalAmount);
    refs.route.innerHTML = '';
    route = routeText(calc.route);
    refs.route.appendChild(typeof route === 'string' ? document.createTextNode(route) : route);
    warnings = calc.warnings.filter(function (w) { return w.msgId !== 'W-101'; });
    refs.warnings.innerHTML = '';
    if (warnings.length > 0) {
      refs.warnings.appendChild(el('div', { class: 'msg msg-warn', id: 'scr03-warnings' }, el('ul', null, warnings.map(function (w) {
        return el('li', { text: InfoExp.core.messages.format(w.msgId, w.params) });
      }))));
    }
  }

  // ---------------------------------------------------------------- ボタン

  function handleResult(result, onOk) {
    if (result.isOk) {
      state.isDirty = false;
      onOk(result);
      return;
    }
    c.showMessages(result.errors);
    c.markErrors(state.container, result.errors);
  }

  function saveDraft() {
    handleResult(InfoExp.service.reportService.saveDraft(buildInput(), state.userId), function (r) {
      router.goWithMessages('#/report/edit?id=' + r.data.reportId, r.messages);
    });
  }

  function submit(isResubmit) {
    c.confirm('C-001', [], function () {
      var service = InfoExp.service.reportService;
      var result = isResubmit ? service.resubmit(buildInput(), state.userId) : service.submit(buildInput(), state.userId);
      handleResult(result, function (r) {
        router.goWithMessages('#/report?id=' + r.data.reportId + '&from=reports', r.messages);
      });
    });
  }

  function deleteDraft() {
    c.confirm('C-003', [], function () {
      handleResult(InfoExp.service.reportService.deleteDraft(state.report.reportId, state.userId, state.report.updatedAt), function (r) {
        router.goWithMessages('#/reports', r.messages);
      });
    });
  }

  function back() {
    if (state.isDirty) {
      c.confirm('C-010', [], function () { router.go('#/reports'); });
    } else {
      router.go('#/reports');
    }
  }

  // ---------------------------------------------------------------- 描画

  function passText(passes) {
    if (passes.length === 0) {
      return '登録なし';
    }
    return passes.map(function (p) {
      return c.codeName('LINE', p.lineCode) + ' ' + p.fromName + '〜' + p.toName + '（' + p.validFrom + '〜' + (p.validTo || '') + '）';
    }).join('、');
  }

  function render(container, query, session) {
    var result = InfoExp.service.reportService.getEditModel({ id: query.id, type: query.type }, session.userId);
    var model;
    var r;
    var isTrip;
    var refs = { lateRow: [] };
    var headerCells;
    var buttons = [];
    var stepRow;
    if (!result.isOk) {
      router.goWithMessages('#/home', result.errors);
      return;
    }
    model = result.data;
    if (model.mode === 'DETAIL') {
      router.go('#/report?id=' + model.report.reportId + '&from=reports');
      return;
    }
    r = model.report;
    state = {
      userId: session.userId,
      container: container,
      mode: model.mode,
      isDirty: false,
      renderSeq: 0,
      refs: refs,
      report: {
        reportId: r.reportId, reportNo: r.reportNo, expenseType: r.expenseType, status: r.status, updatedAt: r.updatedAt,
        title: str(r.title), remarks: str(r.remarks), lateReason: str(r.lateReason), tripDestination: str(r.tripDestination),
        tripStartDate: str(r.tripStartDate), tripEndDate: str(r.tripEndDate), tripType: str(r.tripType) || 'STAY',
        tripDistanceKm: str(r.tripDistanceKm)
      },
      items: model.items,
      stations: InfoExp.service.masterService.stations(),
      accounts: {},
      generalAccounts: [],
      employees: {}
    };
    InfoExp.service.masterService.accounts().forEach(function (a) {
      state.accounts[a.accountCode] = a;
      if (a.generalSelectable === 1) {
        state.generalAccounts.push({ value: a.accountCode, label: a.accountName });
      }
    });
    InfoExp.service.userService.listActiveUsers().forEach(function (u) { state.employees[u.employeeId] = u; });
    isTrip = r.expenseType === 'BT';

    container.appendChild(c.screenTitle('経費申請入力（' + c.codeName('EXPENSE_TYPE', r.expenseType) + '）', 'SCR-03'));

    // 5.3.2 ヘッダ部
    refs.deadline = el('span', { id: 'scr03-deadline' });
    headerCells = [
      label('申請番号'), el('div', { class: 'value', id: 'scr03-report-no', text: r.reportNo || '（保存時に採番）' }),
      label('経費種別'), el('div', { class: 'value', text: c.codeName('EXPENSE_TYPE', r.expenseType) }),
      label('申請者'), el('div', { class: 'value', text: model.applicant.employeeId + ' ' + model.applicant.employeeName }),
      label('所属'), el('div', { class: 'value', text: model.applicant.orgName }),
      label('状態'), el('div', { class: 'value span3' }, [
        r.status ? c.statusBadge(r.status, r.lateFlag) : el('span', { class: 'badge badge-s10', text: '下書き（新規）' }),
        model.backStep ? el('div', { class: 'back-comment', id: 'scr03-back-comment' }, [
          '差戻し: ' + (model.backStep.stepKind === 'ACCOUNT' ? '経理確認' : c.codeName('APPROVAL_LEVEL', model.backStep.approvalLevel)) +
          '　' + (model.backStep.actedByName || model.backStep.actedBy) + '　' + model.backStep.actedAt,
          el('br'), model.backStep.actionComment || ''
        ]) : null
      ]),
      label('件名', true), el('div', { class: 'value span3' }, headerInput('title', 'text', 'w-l', 40)),
      label('申請理由・備考'), el('div', { class: 'value span3' }, headerTextarea('remarks', 200)),
      label('申請期限'), el('div', { class: 'value span3' }, refs.deadline)
    ];
    stepRow = [label('遅延理由', true), el('div', { class: 'value span3' }, [
      el('div', { class: 'msg msg-warn', id: 'scr03-late-warning', text: '' }), headerTextarea('lateReason', 200)])];
    refs.lateRow = stepRow;
    headerCells = headerCells.concat(stepRow);
    if (r.expenseType !== 'GE') {
      headerCells = headerCells.concat([label('通勤定期区間'), el('div', { class: 'value span3' }, [passText(model.passes),
        el('div', { class: 'panel-note', text: '控除は明細の利用日時点の区間で計算します' })])]);
    }
    container.appendChild(c.panel('申請', el('div', { class: 'form-grid' }, headerCells)));

    // 5.3.3 出張情報部
    if (isTrip) {
      refs.position = el('span', { id: 'scr03-position' });
      refs.distanceCells = [label('片道距離（km）', true), el('div', { class: 'value' }, headerInput('tripDistanceKm', 'text', 'w-xs'))];
      container.appendChild(c.panel('出張情報', el('div', { class: 'form-grid' }, [
        label('出張先', true), el('div', { class: 'value span3' }, headerInput('tripDestination', 'text', 'w-m', 40)),
        label('出発日', true), el('div', { class: 'value' }, headerInput('tripStartDate', 'date', '')),
        label('帰着日', true), el('div', { class: 'value' }, headerInput('tripEndDate', 'date', '')),
        label('出張区分', true), el('div', { class: 'value' }, c.radios('scr03-tripType', InfoExp.service.masterService.codeList('TRIP_TYPE').map(function (x) {
          return { value: x.code, label: x.codeName };
        }), state.report.tripType, { 'data-field': 'tripType', onchange: function (e) {
          state.report.tripType = e.target.value;
          markDirty();
          refs.distanceCells.forEach(function (n) { n.style.display = state.report.tripType === 'DAY' ? '' : 'none'; });
          recalc();
        } })),
        label('日当算定役職'), el('div', { class: 'value' }, refs.position)
      ].concat(refs.distanceCells))));
      refs.distanceCells.forEach(function (n) { n.style.display = state.report.tripType === 'DAY' ? '' : 'none'; });
    }

    // 5.3.4 明細部
    refs.addButtons = ADD_KINDS[r.expenseType].map(function (kind) {
      return el('button', { class: 'btn', type: 'button', id: 'scr03-add-' + kind.toLowerCase(), text: '＋ ' + ADD_LABELS[kind], onclick: function () {
        state.items.push(newItem(kind));
        markDirty();
        renderItems();
        recalc();
      } });
    });
    refs.items = el('div', { id: 'scr03-items' });
    refs.allowance = isTrip ? el('div', { id: 'scr03-allowance-box' }) : null;
    container.appendChild(c.panel('明細', [
      el('div', { class: 'add-buttons' }, refs.addButtons.concat([el('span', { class: 'panel-note', text: '明細は最大 50 行。' +
        (isTrip ? '日当明細は出発日・帰着日・出張区分が揃うと自動で作成します。' : '') })])),
      el('div', { style: 'height:8px' }),
      refs.items,
      refs.allowance
    ]));

    // 5.3.6 集計部
    refs.total = el('span', { class: 'total-amount', id: 'scr03-total' });
    refs.route = el('span', { id: 'scr03-route' });
    refs.warnings = el('div');
    refs.calcError = el('div');
    container.appendChild(c.panel('集計', [
      el('div', { class: 'summary-grid' }, [
        el('div', { class: 'label', text: '合計金額' }), el('div', null, [refs.total, ' 円']),
        el('div', { class: 'label', text: '承認ルート（予定）' }), el('div', null, refs.route)
      ]),
      refs.warnings,
      refs.calcError
    ]));

    // ボタン
    if (model.mode === 'NEW' || model.mode === 'EDIT' || model.mode === 'RESUBMIT') {
      buttons.push(el('button', { class: 'btn', type: 'button', id: 'scr03-save', text: '下書き保存', onclick: saveDraft }));
    }
    if (model.mode === 'NEW' || model.mode === 'EDIT') {
      buttons.push(el('button', { class: 'btn btn-primary', type: 'button', id: 'scr03-submit', text: '申請', onclick: function () { submit(false); } }));
    }
    if (model.mode === 'RESUBMIT') {
      buttons.push(el('button', { class: 'btn btn-primary', type: 'button', id: 'scr03-resubmit', text: '再申請', onclick: function () { submit(true); } }));
    }
    if (model.mode === 'EDIT') {
      buttons.push(el('button', { class: 'btn btn-danger', type: 'button', id: 'scr03-delete', text: '下書き削除', onclick: deleteDraft }));
    }
    buttons.push(el('span', { class: 'spacer' }));
    buttons.push(el('button', { class: 'btn', type: 'button', id: 'scr03-back', text: '戻る', onclick: back }));
    container.appendChild(el('div', { class: 'button-bar' }, buttons));

    renderItems();
    recalc();
  }

  InfoExp.screens.scr03ReportEdit = {
    render: render
  };
})();
