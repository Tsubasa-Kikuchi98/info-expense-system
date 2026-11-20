/*
 * SCR-08 バッチ実行（02 の 5.8）。B01〜B05 を手動で実行し、実行履歴を表示する。
 */
(function () {
  'use strict';

  var c = InfoExp.ui.components;
  var el = c.el;
  var lastResult = null;

  function showResult(name, result) {
    lastResult = { name: name, result: result };
    if (result.fileContent && result.result !== 'NG') {
      // 出力ファイルは実行したときにだけダウンロードする
      c.download(result.fileName, result.fileContent);
    }
    InfoExp.ui.router.goWithMessages('#/batches', result.messages);
  }

  function confirmRun(name, fn) {
    c.confirm('C-008', [name], function () {
      showResult(name, fn());
    });
  }

  /** ファイル選択の内容を UTF-8 の文字列で読む */
  function readFiles(inputs, done) {
    var keys = Object.keys(inputs);
    var files = {};
    var remaining = keys.length;
    keys.forEach(function (key) {
      var file = inputs[key].files && inputs[key].files[0];
      var reader;
      if (!file) {
        files[key] = null;
        remaining -= 1;
        if (remaining === 0) { done(files); }
        return;
      }
      reader = new FileReader();
      reader.onload = function () {
        files[key] = { name: file.name, text: String(reader.result) };
        remaining -= 1;
        if (remaining === 0) { done(files); }
      };
      reader.readAsText(file, 'UTF-8');
    });
  }

  function resultPanel() {
    var r;
    if (!lastResult) {
      return null;
    }
    r = lastResult.result;
    return c.panel('実行結果（' + lastResult.name + '）', el('div', { class: 'form-grid', id: 'scr08-result' }, [
      el('div', { class: 'label', text: '結果' }), el('div', { class: 'value', id: 'scr08-result-status', text: c.codeName('BATCH_RESULT', r.result) }),
      el('div', { class: 'label', text: '件数' }), el('div', { class: 'value', id: 'scr08-result-count', text: String(r.recordCount) }),
      el('div', { class: 'label', text: '金額合計（円）' }), el('div', { class: 'value', id: 'scr08-result-amount', text: r.totalAmount === null ? '—' : c.money(r.totalAmount) }),
      el('div', { class: 'label', text: 'ファイル名' }), el('div', { class: 'value', text: r.fileName || '—' }),
      el('div', { class: 'label', text: 'メッセージ' }), el('div', { class: 'value span3' }, el('div', { class: 'note-pre', text: r.messages.map(function (m) {
        return InfoExp.core.messages.format(m.msgId, m.params);
      }).join('\n') }))
    ]));
  }

  function row(no, name, inputs, button, note) {
    return el('tr', null, [
      el('td', { class: 'nowrap', text: no }),
      el('td', { class: 'nowrap', text: name }),
      el('td', null, inputs),
      el('td', { class: 'nowrap' }, button),
      el('td', { class: 'panel-note', text: note })
    ]);
  }

  function render(container, query, session) {
    var userId = session.userId;
    var op = InfoExp.service.clockService.getOperationDate();
    var dateUtil = InfoExp.core.dateUtil;
    var hrInputs = {};
    var b03Month = el('input', { type: 'month', id: 'scr08-b03-month', value: dateUtil.prevMonth(op.substring(0, 7)) });
    var b04Month = el('input', { type: 'month', id: 'scr08-b04-month', value: op.substring(0, 7) });
    var b05Month = el('input', { type: 'month', id: 'scr08-b05-month', value: op.substring(0, 7) });
    var B = InfoExp.batch;
    var table;
    var history;

    InfoExp.batch.b01HrImport.FILES.forEach(function (f) {
      hrInputs[f.key] = el('input', { type: 'file', accept: '.csv', id: 'scr08-b01-' + f.key });
    });

    container.appendChild(c.screenTitle('バッチ実行', 'SCR-08'));
    table = el('table', { class: 'list', id: 'scr08-batches' }, [
      el('tr', null, ['No', 'バッチ', '入力', '実行', '内容'].map(function (h) { return el('th', { text: h }); })),
      row('B01', '人事マスタ取込', el('div', null, InfoExp.batch.b01HrImport.FILES.map(function (f) {
        return el('div', null, [el('span', { style: 'display:inline-block;width:150px', text: f.label + '（' + f.fileName + '）' }), hrInputs[f.key]]);
      })), el('button', { class: 'btn btn-primary', type: 'button', id: 'scr08-run-b01', text: '実行', onclick: function () {
        readFiles(hrInputs, function (files) {
          confirmRun('人事マスタ取込', function () { return B.b01HrImport.run(files, userId); });
        });
      } }), '組織・社員・発令・通勤経路を取り込みます。サンプルは samples/hr/ にあります。'),
      row('B02', '仕訳連携', '—', el('button', { class: 'btn btn-primary', type: 'button', id: 'scr08-run-b02', text: '実行', onclick: function () {
        confirmRun('仕訳連携', function () { return B.b02JournalExport.run(userId); });
      } }), '経理確認済みで未連携の申請の仕訳ファイルを出力（ダウンロード）します。'),
      row('B03', '月次締め', el('label', null, ['対象年月 ', b03Month]), el('button', { class: 'btn btn-primary', type: 'button', id: 'scr08-run-b03', text: '実行', onclick: function () {
        confirmRun('月次締め', function () { return B.b03MonthlyClose.run(b03Month.value, userId); });
      } }), '対象年月の末日までに経理確認した申請を締め、支給年月を決めます。'),
      row('B04', '給与連携', el('label', null, ['支給年月 ', b04Month]), el('button', { class: 'btn btn-primary', type: 'button', id: 'scr08-run-b04', text: '実行', onclick: function () {
        confirmRun('給与連携', function () { return B.b04PayrollExport.run(b04Month.value, userId); });
      } }), '支給年月の精算額を社員ごとに集計し、給与連携ファイルを出力（ダウンロード）します。'),
      row('B05', '支払済み更新', el('label', null, ['支給年月 ', b05Month]), el('button', { class: 'btn btn-primary', type: 'button', id: 'scr08-run-b05', text: '実行', onclick: function () {
        confirmRun('支払済み更新', function () { return B.b05PaymentComplete.run(b05Month.value, userId); });
      } }), '給与連携済みの申請を支払済みにします（支給年月の26日以降）。')
    ]);
    container.appendChild(c.panel('バッチ', table));
    if (resultPanel()) {
      container.appendChild(resultPanel());
    }
    history = c.table([
      { label: '実行ID', cls: 'num', render: function (h) { return String(h.runId); } },
      { label: 'バッチ', cls: 'nowrap', render: function (h) { return h.batchId + ' ' + c.codeName('BATCH_ID', h.batchId); } },
      { label: '業務日付', cls: 'nowrap', render: function (h) { return h.operationDate; } },
      { label: 'パラメータ', cls: 'nowrap', render: function (h) { return h.param || ''; } },
      { label: '開始日時', cls: 'nowrap', render: function (h) { return h.startedAt; } },
      { label: '終了日時', cls: 'nowrap', render: function (h) { return h.endedAt || ''; } },
      { label: '結果', cls: 'nowrap', render: function (h) { return c.codeName('BATCH_RESULT', h.result); } },
      { label: '件数', cls: 'num', render: function (h) { return String(h.recordCount); } },
      { label: '金額合計（円）', cls: 'num', render: function (h) { return c.money(h.totalAmount); } },
      { label: 'ファイル名', cls: 'break', render: function (h) { return (h.fileName || '').split(',').join(', '); } },
      { label: 'メッセージ', cls: 'msg-col', render: function (h) { return el('div', { class: 'note-pre', text: h.message || '' }); } },
      { label: '実行者', render: function (h) { return h.executedBy + ' ' + (h.executedByName || ''); } }
    ], InfoExp.batch.batchCommon.history(InfoExp.core.config.BATCH_HISTORY_MAX_ROWS));
    history.className = 'list compact';
    history.id = 'scr08-history';
    container.appendChild(c.panel('実行履歴（最新 50 件）', el('div', { class: 'table-scroll' }, history)));
  }

  InfoExp.screens.scr08Batches = {
    render: render
  };
})();
