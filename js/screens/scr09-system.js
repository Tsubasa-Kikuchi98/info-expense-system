/*
 * SCR-09 システム管理（02 の 5.9）: 業務日付設定、データ初期化、DB ファイル出力、保存サイズ、スキーマ版数。
 */
(function () {
  'use strict';

  var c = InfoExp.ui.components;
  var el = c.el;
  var router = InfoExp.ui.router;

  function resetData(userId) {
    c.confirm('C-009', [], function () {
      var result = InfoExp.service.systemService.resetData(userId);
      if (!result.isOk) {
        c.showMessages(result.errors);
        return;
      }
      router.session.isDbFailed = false;
      InfoExp.ui.header.switchUser(InfoExp.service.userService.resolveCurrentUserId());
      router.goWithMessages('#/home', result.messages);
    });
  }

  function render(container, query, session) {
    var clock = InfoExp.service.clockService;
    var info = InfoExp.service.systemService.storageInfo();
    var dateInput = el('input', { type: 'date', id: 'scr09-operation-date', 'data-field': 'operationDate', value: clock.isDeviceDate() ? '' : clock.getOperationDate() });

    container.appendChild(c.screenTitle('システム管理', 'SCR-09'));
    container.appendChild(c.panel('業務日付', [
      el('div', { class: 'button-bar' }, [
        dateInput,
        el('button', { class: 'btn btn-primary', type: 'button', id: 'scr09-set-date', text: '設定', onclick: function () {
          var result = InfoExp.service.systemService.setOperationDate(dateInput.value, session.userId);
          if (result.isOk) {
            router.goWithMessages('#/system', result.messages);
          } else {
            c.showMessages(result.errors);
          }
        } }),
        el('span', { class: 'panel-note', text: '現在: ' + clock.getOperationDate() + (clock.isDeviceDate() ? '（端末日付）' : '') + '。空にして設定すると端末の日付を使います。' })
      ])
    ]));
    container.appendChild(c.panel('データ初期化', [
      el('p', { class: 'panel-note', text: 'ブラウザに保存しているデータ（info-expense: で始まるキー）を削除し、初期データで作り直します。業務日付も初期値（2026-11-30）に戻ります。' }),
      el('button', { class: 'btn btn-danger', type: 'button', id: 'scr09-reset', text: 'データ初期化', onclick: function () { resetData(session.userId); } })
    ]));
    container.appendChild(c.panel('DB ファイル出力', [
      el('p', { class: 'panel-note', text: 'データベースを SQLite のファイルとしてダウンロードします。' }),
      el('button', { class: 'btn', type: 'button', id: 'scr09-export', text: 'DB ファイル出力', onclick: function () {
        var result = InfoExp.service.systemService.exportDbFile(session.userId);
        if (result.isOk) {
          c.download(result.data.fileName, result.data.bytes, 'application/vnd.sqlite3');
        } else {
          c.showMessages(result.errors);
        }
      } })
    ]));
    container.appendChild(c.panel('保存状況', el('div', { class: 'form-grid' }, [
      el('div', { class: 'label', text: '保存サイズ' }), el('div', { class: 'value', id: 'scr09-size', text: c.money(info.sizeKb) + ' KB' }),
      el('div', { class: 'label', text: 'スキーマ版数' }), el('div', { class: 'value', id: 'scr09-schema', text: String(info.schemaVersion) })
    ])));
  }

  /** E-903（DB を読み込めない）のときの表示: データ初期化だけ操作できる */
  function renderRecovery(container) {
    document.getElementById('app-header').innerHTML = '';
    container.appendChild(c.screenTitle('システム管理', 'SCR-09'));
    container.appendChild(c.panel('データ初期化', [
      el('p', { class: 'panel-note', text: '保存されているデータを読み込めませんでした。データ初期化を行うと初期データで作り直します。' }),
      el('button', { class: 'btn btn-danger', type: 'button', id: 'scr09-reset', text: 'データ初期化', onclick: function () { resetData(null); } })
    ]));
  }

  InfoExp.screens.scr09System = {
    render: render,
    renderRecovery: renderRecovery
  };
})();
