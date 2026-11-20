/*
 * ルーター（06 の8章）: URL のハッシュ（#/reports など）で画面を切り替え、権限がなければ E-203 を出して SCR-01 に移る。
 */
(function () {
  'use strict';

  var c = InfoExp.ui.components;

  function hasRole(session, role) {
    return session.roles.indexOf(role) >= 0;
  }
  function all() {
    return true;
  }
  function acctOrAdmin(session) {
    return hasRole(session, 'ACCT') || hasRole(session, 'ADMIN');
  }
  function admin(session) {
    return hasRole(session, 'ADMIN');
  }

  // 02 の2章 画面一覧
  var ROUTES = [
    { path: '/home', screen: 'scr01Home', allow: all },
    { path: '/reports', screen: 'scr02ReportList', allow: all },
    { path: '/report/edit', screen: 'scr03ReportEdit', allow: all },
    { path: '/report', screen: 'scr04ReportDetail', allow: all },
    { path: '/approvals', screen: 'scr05ApprovalList', allow: all },
    { path: '/accounting', screen: 'scr06AccountingList', allow: acctOrAdmin },
    { path: '/masters', screen: 'scr07Masters', allow: acctOrAdmin },
    { path: '/batches', screen: 'scr08Batches', allow: admin },
    { path: '/system', screen: 'scr09System', allow: admin }
  ];

  var session = { userId: null, user: null, roles: [], isDbFailed: false };

  function parseHash() {
    var hash = window.location.hash.replace(/^#/, '') || '/home';
    var index = hash.indexOf('?');
    var path = index < 0 ? hash : hash.substring(0, index);
    var query = {};
    if (index >= 0) {
      hash.substring(index + 1).split('&').forEach(function (pair) {
        var kv = pair.split('=');
        if (kv[0]) {
          query[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || '').replace(/\+/g, ' '));
        }
      });
    }
    return { path: path, query: query, hash: '#' + hash };
  }

  function findRoute(path) {
    var i;
    for (i = 0; i < ROUTES.length; i += 1) {
      if (ROUTES[i].path === path) {
        return ROUTES[i];
      }
    }
    return null;
  }

  /** 現在のハッシュの画面を表示する */
  function render() {
    var parsed = parseHash();
    var route = findRoute(parsed.path);
    var container = document.getElementById('screen');
    var flashList;
    c.clearCodeCache();
    if (session.isDbFailed) {
      // E-903: データベースを読み込めない場合は SCR-09 だけ操作できる
      container.innerHTML = '';
      InfoExp.screens.scr09System.renderRecovery(container);
      return;
    }
    if (!route) {
      go('#/home');
      return;
    }
    if (!route.allow(session)) {
      c.flash([{ msgId: 'E-203', params: [] }]);
      go('#/home');
      return;
    }
    flashList = c.takeFlash();
    c.showMessages(flashList);
    container.innerHTML = '';
    InfoExp.ui.header.refresh(parsed.path);
    try {
      InfoExp.screens[route.screen].render(container, parsed.query, session);
    } catch (e) {
      if (e && e.name === 'ConfigError') {
        c.showMessages([{ msgId: 'E-901', params: e.params }]);
      } else {
        c.showMessages([{ msgId: 'E-903', params: [] }]);
        if (window.console) {
          window.console.error(e);
        }
      }
    }
  }

  /**
   * 画面を移る。同じハッシュなら表示し直す。
   * @param {string} hash 例: '#/reports?status=10'
   */
  function go(hash) {
    if (window.location.hash === hash) {
      render();
    } else {
      window.location.hash = hash;
    }
  }

  /** 処理結果のメッセージを次の画面に引き継いで移る */
  function goWithMessages(hash, list) {
    c.flash(list);
    go(hash);
  }

  function start() {
    window.addEventListener('hashchange', render);
    render();
  }

  InfoExp.ui.router = {
    session: session,
    start: start,
    render: render,
    go: go,
    goWithMessages: goWithMessages,
    hasRole: function (role) { return hasRole(session, role); }
  };
})();
