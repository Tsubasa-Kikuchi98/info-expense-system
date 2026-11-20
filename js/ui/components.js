/*
 * 画面部品（06 の8章）: 要素の作成、一覧表、プルダウン、金額表示、確認ダイアログ、メッセージ欄、ファイルのダウンロード。
 * SQL を書かない。業務ルールの計算をしない。
 */
(function () {
  'use strict';

  var messages = InfoExp.core.messages;
  var codeCache = {};
  var pendingFlash = [];

  /**
   * 要素を作る。
   * @param {string} tag
   * @param {Object} [attrs] class・text・value・checked・disabled・on{イベント名}・その他の属性
   * @param {Array|Node|string} [children]
   */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    var key;
    var list;
    var i;
    attrs = attrs || {};
    for (key in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, key) || attrs[key] === undefined || attrs[key] === null || attrs[key] === false) {
        continue;
      }
      if (key === 'class') {
        node.className = attrs[key];
      } else if (key === 'text') {
        node.textContent = attrs[key];
      } else if (key === 'value') {
        node.value = attrs[key];
      } else if (key === 'checked' || key === 'disabled' || key === 'selected') {
        node[key] = !!attrs[key];
      } else if (key.indexOf('on') === 0) {
        node.addEventListener(key.substring(2), attrs[key]);
      } else {
        node.setAttribute(key, attrs[key] === true ? '' : attrs[key]);
      }
    }
    list = (children === undefined || children === null) ? [] : (Array.isArray(children) ? children : [children]);
    for (i = 0; i < list.length; i += 1) {
      if (list[i] === null || list[i] === undefined || list[i] === false) {
        continue;
      }
      node.appendChild(typeof list[i] === 'object' ? list[i] : document.createTextNode(String(list[i])));
    }
    return node;
  }

  /** 金額の表示（3桁カンマ）。null は空 */
  function money(value) {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /** コードの名称（m_code。画面を開くたびに読み直す） */
  function codeName(codeType, code) {
    if (!codeCache[codeType]) {
      codeCache[codeType] = InfoExp.service.masterService.codeNames(codeType);
    }
    if (code === null || code === undefined || code === '') {
      return '';
    }
    return codeCache[codeType][code] || String(code);
  }

  function clearCodeCache() {
    codeCache = {};
  }

  /**
   * プルダウン。
   * @param {Array<{value: string, label: string}>} options
   * @param {string} value 選択値
   * @param {Object} [attrs]
   * @param {string} [blankLabel] 先頭に空の選択肢を付ける場合の表示
   */
  function select(options, value, attrs, blankLabel) {
    var node = el('select', attrs);
    var current = value === null || value === undefined ? '' : String(value);
    if (blankLabel !== undefined) {
      node.appendChild(el('option', { value: '', text: blankLabel }));
    }
    options.forEach(function (o) {
      node.appendChild(el('option', { value: String(o.value), text: o.label, selected: String(o.value) === current }));
    });
    node.value = current;
    return node;
  }

  /** m_code のコード種別からプルダウンを作る */
  function codeSelect(codeType, value, attrs, blankLabel, filter) {
    var list = InfoExp.service.masterService.codeList(codeType).filter(function (c) {
      return !filter || filter(c.code);
    });
    return select(list.map(function (c) { return { value: c.code, label: c.codeName }; }), value, attrs, blankLabel);
  }

  /** ラジオボタンの組 */
  function radios(name, options, value, attrs) {
    var group = el('span', { class: 'radio-group', 'data-field': attrs && attrs['data-field'], 'data-item': attrs && attrs['data-item'] });
    options.forEach(function (o) {
      var input = el('input', { type: 'radio', name: name, value: String(o.value), checked: String(o.value) === String(value),
        onchange: attrs && attrs.onchange });
      group.appendChild(el('label', null, [input, ' ' + o.label]));
    });
    return group;
  }

  /**
   * 一覧表。
   * @param {Array<{label: string, cls: string, render: Function}>} columns
   * @param {Array<Object>} rows
   * @param {string} [emptyText]
   */
  function table(columns, rows, emptyText) {
    var t = el('table', { class: 'list' });
    var head = el('tr');
    columns.forEach(function (c) {
      head.appendChild(el('th', { class: c.cls || null, text: c.label }));
    });
    t.appendChild(head);
    if (rows.length === 0) {
      t.appendChild(el('tr', null, el('td', { class: 'empty', colspan: String(columns.length), text: emptyText || '該当するデータはありません。' })));
    }
    rows.forEach(function (row) {
      var tr = el('tr');
      columns.forEach(function (c) {
        var v = c.render(row);
        tr.appendChild(el('td', { class: c.cls || null }, (v === null || v === undefined) ? '' : v));
      });
      t.appendChild(tr);
    });
    return t;
  }

  /** 状態の表示（遅延申請は「（遅延）」を付ける） */
  function statusBadge(status, lateFlag) {
    return el('span', null, [
      el('span', { class: 'badge badge-s' + status, text: codeName('REPORT_STATUS', status) }),
      lateFlag === 1 ? el('span', { class: 'badge badge-late', text: '（遅延）' }) : null
    ]);
  }

  /** 画面の見出し */
  function screenTitle(title, screenId) {
    return el('div', { class: 'screen-title' }, [el('h1', { text: title }), el('span', { class: 'screen-id', text: screenId })]);
  }

  function panel(title, body, headExtra) {
    return el('div', { class: 'panel' }, [
      title ? el('div', { class: 'panel-head' }, [title].concat(headExtra || [])) : null,
      el('div', { class: 'panel-body' }, body)
    ]);
  }

  // ---------------------------------------------------------------- メッセージ欄

  /**
   * メッセージ欄に表示する（エラー・警告・完了を種別ごとにまとめる）。
   * @param {Array<{msgId: string, params: Array}>} list
   * @param {boolean} [isAppend] 既存の表示に追加する
   */
  function showMessages(list, isAppend) {
    var area = document.getElementById('message-area');
    var groups = { E: [], W: [], I: [] };
    if (!area) {
      return;
    }
    if (!isAppend) {
      area.innerHTML = '';
    }
    (list || []).forEach(function (m) {
      var kind = messages.kindOf(m.msgId);
      (groups[kind] || groups.I).push(messages.format(m.msgId, m.params));
    });
    [['E', 'msg msg-error'], ['W', 'msg msg-warn'], ['I', 'msg msg-info']].forEach(function (g) {
      if (groups[g[0]].length > 0) {
        area.appendChild(el('div', { class: g[1], role: g[0] === 'E' ? 'alert' : 'status' },
          el('ul', null, groups[g[0]].map(function (t) { return el('li', { text: t }); }))));
      }
    });
    if ((list || []).length > 0) {
      window.scrollTo(0, 0);
    }
  }

  function clearMessages() {
    showMessages([]);
  }

  /** 次の画面を表示したときに出すメッセージ */
  function flash(list) {
    pendingFlash = pendingFlash.concat(list || []);
  }

  function takeFlash() {
    var list = pendingFlash;
    pendingFlash = [];
    return list;
  }

  /** エラーの項目の枠を赤くする（data-field・data-item で探す） */
  function markErrors(container, errors) {
    Array.prototype.forEach.call(container.querySelectorAll('.is-error'), function (n) {
      n.classList.remove('is-error');
    });
    (errors || []).forEach(function (e) {
      var selector;
      if (!e.field) {
        return;
      }
      selector = '[data-field="' + e.field + '"]' + (e.itemNo ? '[data-item="' + e.itemNo + '"]' : ':not([data-item])');
      Array.prototype.forEach.call(container.querySelectorAll(selector), function (n) {
        n.classList.add('is-error');
      });
    });
  }

  // ---------------------------------------------------------------- 確認ダイアログ

  /**
   * 確認ダイアログ（C-xxx）。「OK」で onOk を呼ぶ。
   * @param {string} msgId
   * @param {Array} params
   * @param {Function} onOk
   */
  function confirm(msgId, params, onOk) {
    var root = document.getElementById('dialog-root');
    var okButton;
    function close() {
      root.innerHTML = '';
    }
    okButton = el('button', { class: 'btn btn-primary', type: 'button', id: 'dialog-ok', text: 'OK', onclick: function () {
      close();
      onOk();
    } });
    root.innerHTML = '';
    root.appendChild(el('div', { class: 'dialog-backdrop' }, el('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'true' }, [
      el('div', { class: 'dialog-body', text: messages.format(msgId, params) }),
      el('div', { class: 'dialog-buttons' }, [
        el('button', { class: 'btn', type: 'button', id: 'dialog-cancel', text: 'キャンセル', onclick: close }),
        okButton
      ])
    ])));
    okButton.focus();
  }

  // ---------------------------------------------------------------- ダウンロード

  /**
   * ファイルをダウンロードする（06 の 1章: 出力はダウンロード）。
   * @param {string} fileName
   * @param {string|Uint8Array} content 文字列は UTF-8（BOM なし）
   * @param {string} [mime]
   */
  function download(fileName, content, mime) {
    var blob = new Blob([content], { type: mime || 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = el('a', { href: url, download: fileName });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /** 日時の日付部分 */
  function dateOf(dateTime) {
    return dateTime ? String(dateTime).substring(0, 10) : '';
  }

  InfoExp.ui.components = {
    el: el,
    money: money,
    codeName: codeName,
    clearCodeCache: clearCodeCache,
    select: select,
    codeSelect: codeSelect,
    radios: radios,
    table: table,
    statusBadge: statusBadge,
    screenTitle: screenTitle,
    panel: panel,
    showMessages: showMessages,
    clearMessages: clearMessages,
    flash: flash,
    takeFlash: takeFlash,
    markErrors: markErrors,
    confirm: confirm,
    download: download,
    dateOf: dateOf
  };
})();
