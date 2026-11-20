/*
 * SCR-07 マスタ参照・保守（02 の 5.7）。ACCT は参照のみ、ADMIN は更新できる。
 */
(function () {
  'use strict';

  var c = InfoExp.ui.components;
  var el = c.el;
  var router = InfoExp.ui.router;
  var service = InfoExp.service.masterMaintenanceService;

  var TABS = [
    { key: 'rule', label: '承認ルート規則' },
    { key: 'rate', label: '日当・宿泊費基準' },
    { key: 'setting', label: '設定値' },
    { key: 'fare', label: '運賃' },
    { key: 'account', label: '勘定科目' },
    { key: 'station', label: '駅' },
    { key: 'role', label: 'ロール' },
    { key: 'hr', label: '組織・社員（人事由来）' },
    { key: 'code', label: 'コード' }
  ];
  var MULTI_ROWS = 5;

  function done(result, tab) {
    if (result.isOk) {
      router.goWithMessages('#/masters?tab=' + tab, result.messages);
    } else {
      c.showMessages(result.errors);
    }
  }

  function input(id, cls, value) {
    return el('input', { type: 'text', id: id, class: cls || 'w-s', value: value === undefined || value === null ? '' : String(value) });
  }

  // ---------------------------------------------------------------- 期間つきマスタ

  var PERIOD_VIEW = {
    rule: { groupLabel: '経費種別', groupOptions: function () { return codeOptions('EXPENSE_TYPE'); },
      columns: [
        { label: '経費種別', render: function (r) { return c.codeName('EXPENSE_TYPE', r.expenseType); } },
        { label: '金額下限（円）', cls: 'num', render: function (r) { return c.money(r.amountFrom); } },
        { label: '金額上限（円、含まない）', cls: 'num', render: function (r) { return r.amountTo === null ? '（上限なし）' : c.money(r.amountTo); } },
        { label: '段数', cls: 'num', render: function (r) { return String(r.requiredLevel); } }
      ] },
    rate: { groupLabel: '役職', groupOptions: function () { return codeOptions('POSITION'); },
      columns: [
        { label: '役職', render: function (r) { return c.codeName('POSITION', r.positionCode); } },
        { label: '日帰り日当', cls: 'num', render: function (r) { return c.money(r.allowanceDayTrip); } },
        { label: '宿泊出張日当', cls: 'num', render: function (r) { return c.money(r.allowanceStayTrip); } },
        { label: '宿泊費上限 甲地', cls: 'num', render: function (r) { return c.money(r.hotelLimitA); } },
        { label: '宿泊費上限 乙地', cls: 'num', render: function (r) { return c.money(r.hotelLimitB); } }
      ] },
    setting: { groupLabel: '設定キー', groupOptions: function () {
      var keys = [];
      service.list('setting').forEach(function (r) {
        if (r.settingKey !== 'OPERATION_DATE' && keys.indexOf(r.settingKey) < 0) { keys.push(r.settingKey); }
      });
      return keys.map(function (k) { return { value: k, label: k }; });
    },
      columns: [
        { label: '設定キー', render: function (r) { return r.settingKey; } },
        { label: '設定値', render: function (r) { return r.settingValue; } },
        { label: '説明', render: function (r) { return r.description; } }
      ] },
    fare: { groupLabel: '路線', groupOptions: function () { return codeOptions('LINE'); },
      columns: [
        { label: '路線', render: function (r) { return c.codeName('LINE', r.lineCode); } },
        { label: 'キロ下限（0.1km）', cls: 'num', render: function (r) { return String(r.distanceFromX10); } },
        { label: 'キロ上限（0.1km）', cls: 'num', render: function (r) { return String(r.distanceToX10); } },
        { label: '運賃（円）', cls: 'num', render: function (r) { return c.money(r.fare); } }
      ] }
  };

  function codeOptions(type) {
    return InfoExp.service.masterService.codeList(type).map(function (x) { return { value: x.code, label: x.codeName }; });
  }

  function periodTab(container, tab, isAdmin, session) {
    var view = PERIOD_VIEW[tab];
    var def = service.PERIOD_DEFS[tab];
    var op = InfoExp.service.clockService.getOperationDate();
    var rows = service.list(tab);
    var groupSelect;
    var fromInput;
    var lineInputs = [];
    var i;
    var columns = view.columns.concat([
      { label: '有効開始日', cls: 'nowrap', render: function (r) { return r.validFrom; } },
      { label: '有効終了日', cls: 'nowrap', render: function (r) { return r.validTo || ''; } }
    ]);
    if (tab === 'setting') {
      rows = rows.filter(function (r) { return r.settingKey !== 'OPERATION_DATE'; });
    }
    if (isAdmin) {
      columns.push({ label: '操作', render: function (r) {
        if (r.validFrom <= op) {
          return '';
        }
        return el('button', { class: 'btn btn-small btn-danger', type: 'button', text: 'この期間を削除', onclick: function () {
          done(service.deletePeriod(tab, r[def.group], r.validFrom, session.userId), tab);
        } });
      } });
    }
    container.appendChild(c.panel('一覧', c.table(columns, rows)));
    if (!isAdmin) {
      return;
    }
    groupSelect = c.select(view.groupOptions(), '', { id: 'scr07-group' }, '（選択）');
    fromInput = el('input', { type: 'date', id: 'scr07-valid-from' });
    for (i = 0; i < (def.isMulti ? MULTI_ROWS : 1); i += 1) {
      lineInputs.push(def.fields.map(function (f) {
        return { name: f.name, node: input('scr07-row' + (i + 1) + '-' + f.name, f.isText ? 'w-m' : 'w-s') };
      }));
    }
    container.appendChild(c.panel('新しい期間の追加', [
      el('p', { class: 'panel-note', text: '有効開始日は業務日付（' + op + '）の翌日以降。追加すると直前の期間の有効終了日を新しい有効開始日の前日にします。' +
        (tab === 'rule' ? '金額範囲は 0円から始め、前の行の金額上限 = 次の行の金額下限で続け、最後の行の金額上限は空にします。' : '') }),
      el('div', { class: 'search-form' }, [
        el('label', { class: 'field' }, [el('span', { text: view.groupLabel }), groupSelect]),
        el('label', { class: 'field' }, [el('span', { text: '有効開始日' }), fromInput])
      ]),
      el('table', { class: 'list', style: 'margin-top:8px;width:auto' }, [
        el('tr', null, def.fields.map(function (f) { return el('th', { text: f.label + (f.isOptional ? '（空＝上限なし）' : '') }); }))
      ].concat(lineInputs.map(function (cells) {
        return el('tr', null, cells.map(function (x) { return el('td', null, x.node); }));
      }))),
      el('div', { class: 'button-bar' }, [el('button', { class: 'btn btn-primary', type: 'button', id: 'scr07-add-period', text: '追加', onclick: function () {
        var data = lineInputs.map(function (cells) {
          var o = {};
          cells.forEach(function (x) { o[x.name] = x.node.value; });
          return o;
        });
        done(service.addPeriod(tab, groupSelect.value, fromInput.value, data, session.userId), tab);
      } })])
    ]));
  }

  // ---------------------------------------------------------------- 行の追加・変更のマスタ

  function accountTab(container, isAdmin, session) {
    var rows = service.list('account');
    var f = {};
    var codeSelect;
    function flag(v) { return v === 1 ? '○' : ''; }
    container.appendChild(c.panel('一覧', c.table([
      { label: 'コード', render: function (r) { return r.accountCode; } },
      { label: '勘定科目名', render: function (r) { return r.accountName; } },
      { label: '一般経費で選択', render: function (r) { return flag(r.generalSelectable); } },
      { label: '最低承認段数', cls: 'num', render: function (r) { return String(r.minApprovalLevel); } },
      { label: '参加者記入必須', render: function (r) { return flag(r.attendeeRequired); } },
      { label: '会議費上限判定', render: function (r) { return flag(r.mealCheck); } },
      { label: '税の対象', render: function (r) { return flag(r.taxTarget); } },
      { label: '既定の税率', cls: 'num', render: function (r) { return String(r.defaultTaxRate); } },
      { label: '表示順', cls: 'num', render: function (r) { return String(r.sortOrder); } }
    ].concat(isAdmin ? [{ label: '操作', render: function (r) {
      return el('button', { class: 'btn btn-small btn-danger', type: 'button', text: '削除', onclick: function () { done(service.deleteAccount(r.accountCode, session.userId), 'account'); } });
    } }] : []), rows)));
    if (!isAdmin) {
      return;
    }
    codeSelect = c.select(rows.map(function (r) { return { value: r.accountCode, label: r.accountCode + ' ' + r.accountName }; }), '', { id: 'scr07-account-select', onchange: function (e) {
      var r = rows.filter(function (x) { return x.accountCode === e.target.value; })[0] || {};
      Object.keys(f).forEach(function (k) { f[k].value = r[k] === undefined || r[k] === null ? '' : String(r[k]); });
    } }, '（新規）');
    ['accountCode', 'accountName', 'generalSelectable', 'minApprovalLevel', 'attendeeRequired', 'mealCheck', 'taxTarget', 'defaultTaxRate', 'sortOrder'].forEach(function (k) {
      f[k] = input('scr07-account-' + k, k === 'accountName' ? 'w-m' : 'w-xs');
    });
    container.appendChild(c.panel('行の追加・変更', [
      el('div', { class: 'search-form' }, [el('label', { class: 'field' }, [el('span', { text: '対象' }), codeSelect])]),
      el('div', { class: 'search-form', style: 'margin-top:8px' }, [
        ['accountCode', 'コード'], ['accountName', '勘定科目名'], ['generalSelectable', '一般経費で選択（1/0）'], ['minApprovalLevel', '最低承認段数'],
        ['attendeeRequired', '参加者記入必須（1/0）'], ['mealCheck', '会議費上限判定（1/0）'], ['taxTarget', '税の対象（1/0）'], ['defaultTaxRate', '既定の税率'], ['sortOrder', '表示順']
      ].map(function (p) { return el('label', { class: 'field' }, [el('span', { text: p[1] }), f[p[0]]]); })),
      el('div', { class: 'button-bar' }, [el('button', { class: 'btn btn-primary', type: 'button', id: 'scr07-account-save', text: '保存', onclick: function () {
        var data = {};
        Object.keys(f).forEach(function (k) { data[k] = f[k].value; });
        done(service.saveAccount(data, codeSelect.value === '', session.userId), 'account');
      } })])
    ]));
  }

  function stationTab(container, isAdmin, session) {
    var rows = service.list('station');
    var f = {};
    var codeSelect;
    container.appendChild(c.panel('一覧', c.table([
      { label: '駅コード', render: function (r) { return r.stationCode; } },
      { label: '路線', render: function (r) { return c.codeName('LINE', r.lineCode); } },
      { label: '駅名', render: function (r) { return r.stationName; } },
      { label: '駅順', cls: 'num', render: function (r) { return String(r.stationOrder); } },
      { label: '営業キロ（0.1km）', cls: 'num', render: function (r) { return String(r.distanceX10); } }
    ].concat(isAdmin ? [{ label: '操作', render: function (r) {
      return el('button', { class: 'btn btn-small btn-danger', type: 'button', text: '削除', onclick: function () { done(service.deleteStation(r.stationCode, session.userId), 'station'); } });
    } }] : []), rows)));
    if (!isAdmin) {
      return;
    }
    codeSelect = c.select(rows.map(function (r) { return { value: r.stationCode, label: r.stationCode + ' ' + r.stationName }; }), '', { id: 'scr07-station-select', onchange: function (e) {
      var r = rows.filter(function (x) { return x.stationCode === e.target.value; })[0] || {};
      Object.keys(f).forEach(function (k) { f[k].value = r[k] === undefined || r[k] === null ? '' : String(r[k]); });
    } }, '（新規）');
    ['stationCode', 'lineCode', 'stationName', 'stationOrder', 'distanceX10'].forEach(function (k) {
      f[k] = input('scr07-station-' + k, k === 'stationName' ? 'w-m' : 'w-xs');
    });
    container.appendChild(c.panel('行の追加・変更', [
      el('div', { class: 'search-form' }, [el('label', { class: 'field' }, [el('span', { text: '対象' }), codeSelect])]),
      el('div', { class: 'search-form', style: 'margin-top:8px' }, [['stationCode', '駅コード'], ['lineCode', '路線コード'], ['stationName', '駅名'],
        ['stationOrder', '駅順'], ['distanceX10', '営業キロ（0.1km）']].map(function (p) { return el('label', { class: 'field' }, [el('span', { text: p[1] }), f[p[0]]]); })),
      el('div', { class: 'button-bar' }, [el('button', { class: 'btn btn-primary', type: 'button', id: 'scr07-station-save', text: '保存', onclick: function () {
        var data = {};
        Object.keys(f).forEach(function (k) { data[k] = f[k].value; });
        done(service.saveStation(data, codeSelect.value === '', session.userId), 'station');
      } })])
    ]));
  }

  function roleTab(container, isAdmin, session) {
    var rows = service.list('role');
    var empInput;
    var roleSelect;
    container.appendChild(c.panel('一覧', c.table([
      { label: '社員', render: function (r) { var u = InfoExp.service.userService.getUser(r.employeeId); return r.employeeId + ' ' + (u ? u.employeeName : ''); } },
      { label: 'ロール', render: function (r) { return c.codeName('ROLE', r.roleCode); } }
    ].concat(isAdmin ? [{ label: '操作', render: function (r) {
      return el('button', { class: 'btn btn-small btn-danger', type: 'button', text: '削除', onclick: function () { done(service.deleteRole(r.employeeId, r.roleCode, session.userId), 'role'); } });
    } }] : []), rows)));
    if (!isAdmin) {
      return;
    }
    empInput = input('scr07-role-employee', 'w-s');
    roleSelect = c.codeSelect('ROLE', '', { id: 'scr07-role-code' });
    container.appendChild(c.panel('行の追加', el('div', { class: 'search-form' }, [
      el('label', { class: 'field' }, [el('span', { text: '社員番号' }), empInput]),
      el('label', { class: 'field' }, [el('span', { text: 'ロール' }), roleSelect]),
      el('button', { class: 'btn btn-primary', type: 'button', id: 'scr07-role-add', text: '追加', onclick: function () {
        done(service.addRole(empInput.value, roleSelect.value, session.userId), 'role');
      } })
    ])));
  }

  function hrTab(container) {
    container.appendChild(el('p', { class: 'panel-note', text: '人事システムから取り込むマスタです。更新は人事マスタ取込（B01）だけで行います。' }));
    container.appendChild(c.panel('組織', c.table([
      { label: '組織コード', render: function (r) { return r.orgCode; } },
      { label: '組織名', render: function (r) { return r.orgName; } },
      { label: '階層', render: function (r) { return c.codeName('ORG_LEVEL', r.orgLevel); } },
      { label: '親組織', render: function (r) { return r.parentOrgCode || ''; } },
      { label: '組織長', render: function (r) { return r.managerEmployeeId || '（不在）'; } }
    ], service.list('org'))));
    container.appendChild(c.panel('社員', c.table([
      { label: '社員番号', render: function (r) { return r.employeeId; } },
      { label: '氏名', render: function (r) { return r.employeeName; } },
      { label: '所属', render: function (r) { return r.orgCode; } },
      { label: '役職', render: function (r) { return c.codeName('POSITION', r.positionCode); } },
      { label: '入社日', render: function (r) { return r.hireDate; } },
      { label: '退職日', render: function (r) { return r.retireDate || ''; } },
      { label: '在籍区分', render: function (r) { return c.codeName('EMP_STATUS', r.status); } }
    ], service.list('employee'))));
    container.appendChild(c.panel('所属・役職履歴', c.table([
      { label: '社員番号', render: function (r) { return r.employeeId; } },
      { label: '発令日', render: function (r) { return r.validFrom; } },
      { label: '有効終了日', render: function (r) { return r.validTo || ''; } },
      { label: '所属', render: function (r) { return r.orgCode; } },
      { label: '役職', render: function (r) { return c.codeName('POSITION', r.positionCode); } }
    ], service.list('assignment'))));
    container.appendChild(c.panel('通勤定期区間', c.table([
      { label: '社員番号', render: function (r) { return r.employeeId; } },
      { label: '有効開始日', render: function (r) { return r.validFrom; } },
      { label: '有効終了日', render: function (r) { return r.validTo || ''; } },
      { label: '区間連番', render: function (r) { return String(r.seq); } },
      { label: '路線', render: function (r) { return c.codeName('LINE', r.lineCode); } },
      { label: '区間', render: function (r) { return r.fromStationCode + '〜' + r.toStationCode; } }
    ], service.list('pass'))));
  }

  function codeTab(container) {
    container.appendChild(c.panel('コード（初期データのみ）', c.table([
      { label: 'コード種別', render: function (r) { return r.codeType; } },
      { label: 'コード', render: function (r) { return r.code; } },
      { label: '名称', render: function (r) { return r.codeName; } },
      { label: '表示順', cls: 'num', render: function (r) { return String(r.sortOrder); } }
    ], service.list('code'))));
  }

  function render(container, query, session) {
    var tab = query.tab || 'rule';
    var isAdmin = session.roles.indexOf('ADMIN') >= 0;
    var body = el('div', { id: 'scr07-body' });
    container.appendChild(c.screenTitle('マスタ参照・保守', 'SCR-07'));
    container.appendChild(el('div', { class: 'tabs', id: 'scr07-tabs' }, TABS.map(function (t) {
      return el('a', { href: '#/masters?tab=' + t.key, class: t.key === tab ? 'is-active' : null, text: t.label });
    })));
    if (!isAdmin) {
      container.appendChild(el('p', { class: 'panel-note', text: '経理担当者は参照のみです。' }));
    }
    container.appendChild(body);
    if (PERIOD_VIEW[tab]) {
      periodTab(body, tab, isAdmin, session);
    } else if (tab === 'account') {
      accountTab(body, isAdmin, session);
    } else if (tab === 'station') {
      stationTab(body, isAdmin, session);
    } else if (tab === 'role') {
      roleTab(body, isAdmin, session);
    } else if (tab === 'hr') {
      hrTab(body);
    } else {
      codeTab(body);
    }
  }

  InfoExp.screens.scr07Masters = {
    render: render
  };
})();
