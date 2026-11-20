/*
 * 共通ヘッダ（02 の 4.1）: システム名、利用者切替、業務日付、メニュー。
 */
(function () {
  'use strict';

  var c = InfoExp.ui.components;
  var el = c.el;

  // メニュー（02 の 4.1。表示する利用者）
  var MENU = [
    { path: '/home', label: 'ホーム', hash: '#/home', show: function () { return true; } },
    { path: '/reports', label: '申請一覧', hash: '#/reports', show: function () { return true; } },
    { path: '/approvals', label: '承認待ち一覧', hash: '#/approvals', show: function () { return true; }, isCount: true },
    { path: '/accounting', label: '経理確認一覧', hash: '#/accounting', show: function (s) { return has(s, 'ACCT') || has(s, 'ADMIN'); } },
    { path: '/masters', label: 'マスタ', hash: '#/masters', show: function (s) { return has(s, 'ACCT') || has(s, 'ADMIN'); } },
    { path: '/batches', label: 'バッチ実行', hash: '#/batches', show: function (s) { return has(s, 'ADMIN'); } },
    { path: '/system', label: 'システム管理', hash: '#/system', show: function (s) { return has(s, 'ADMIN'); } }
  ];

  function has(session, role) {
    return session.roles.indexOf(role) >= 0;
  }

  function userLabel(u) {
    return u.employeeId + ' ' + u.employeeName + '（' + (u.orgName || '') + '・' + (u.positionName || '') + '）';
  }

  /** 利用者を切り替える（F-01）。変更すると SCR-01 に移る */
  function switchUser(employeeId) {
    var session = InfoExp.ui.router.session;
    var user = InfoExp.service.userService.getUser(employeeId);
    session.userId = employeeId;
    session.user = user;
    session.roles = user ? user.roles : [];
    InfoExp.service.userService.storeCurrentUserId(employeeId);
  }

  /**
   * ヘッダを描画する。
   * @param {string} activePath 表示中の画面のパス
   */
  function refresh(activePath) {
    var root = document.getElementById('app-header');
    var session = InfoExp.ui.router.session;
    var clock = InfoExp.service.clockService;
    var users = InfoExp.service.userService.listActiveUsers();
    var pending = InfoExp.service.approvalService.listPending(session.userId).length;
    var userSelect = c.select(users.map(function (u) { return { value: u.employeeId, label: userLabel(u) }; }), session.userId, {
      id: 'header-user',
      'aria-label': '利用者',
      onchange: function (e) {
        switchUser(e.target.value);
        InfoExp.ui.router.goWithMessages('#/home', []);
      }
    });
    root.innerHTML = '';
    root.appendChild(el('div', { class: 'app-header-top' }, [
      el('div', { class: 'app-title' }, ['経費精算システム', el('small', { text: 'インフォ商事株式会社' })]),
      el('div', { class: 'app-header-spacer' }),
      el('span', null, [el('label', { for: 'header-user', text: '利用者' }), userSelect]),
      el('span', { class: 'op-date', id: 'header-op-date', text: '業務日付 ' + clock.getOperationDate() + (clock.isDeviceDate() ? '（端末日付）' : '') })
    ]));
    root.appendChild(el('nav', { class: 'app-menu', 'aria-label': 'メニュー' }, el('ul', null, MENU.filter(function (m) {
      return m.show(session);
    }).map(function (m) {
      return el('li', null, el('a', { href: m.hash, class: activePath === m.path || (m.path === '/reports' && activePath.indexOf('/report') === 0) ? 'is-active' : null }, [
        m.label,
        m.isCount ? el('span', { class: 'menu-count', text: String(pending) }) : null
      ]));
    }))));
  }

  InfoExp.ui.header = {
    refresh: refresh,
    switchUser: switchUser
  };
})();
