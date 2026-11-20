/*
 * 承認ルート判定（BR-02）。
 */
(function () {
  'use strict';

  var masterLookup = InfoExp.logic.masterLookup;
  var messages = InfoExp.core.messages;

  // 承認段 → 承認者の役職の下限（BR-02-1 の「段と承認者の対応」）
  var MIN_POSITION_BY_LEVEL = { 1: '30', 2: '40', 3: '50', 4: '50' };
  // 段1〜段3 に対応する組織階層（段k の組織 = 組織階層 4-k）
  var MAX_ORG_STAGE = 3;
  var TOP_STAGE = 4;
  var EMP_STATUS_ACTIVE = '1';

  /**
   * 必要段数 N を求める（BR-02-1）。
   * N = max（金額による段数, 勘定科目による段数, 遅延による段数）
   * @param {Object} p
   * @param {string} p.expenseType 経費種別（TR／BT／GE）
   * @param {number} p.totalAmount 申請の合計金額
   * @param {string} p.applyDate 申請日（再申請時は再申請日）。承認ルート規則の基準日（BR-01-3）
   * @param {Array<Object>} p.ruleRows m_approval_rule の行の配列
   * @param {Array<string>} p.accountCodes 一般経費の明細の勘定科目コードの配列（交通費・出張旅費は空配列でよい）
   * @param {Array<Object>} p.accountRows m_account_title の行の配列
   * @param {boolean} p.isLate 遅延申請か（BR-03）
   * @param {number} p.lateMinLevel 設定値 LATE_MIN_APPROVAL_LEVEL
   * @returns {number} 必要段数（1〜3）
   * @throws {InfoExp.core.ConfigError} 承認ルート規則に該当する行が0件・2件以上
   */
  function calcRequiredLevel(p) {
    var candidates = [];
    var rules = p.ruleRows || [];
    var codes = p.accountCodes || [];
    var accounts = p.accountRows || [];
    var amountLevel;
    var accountLevel = 0;
    var lateLevel = 0;
    var i;
    var j;
    var rule;

    // 金額による段数: 金額下限 ≦ 合計金額 ＜ 金額上限（NULL は上限なし）
    for (i = 0; i < rules.length; i += 1) {
      rule = rules[i];
      if (rule.expenseType === p.expenseType && rule.amountFrom <= p.totalAmount &&
          (rule.amountTo === null || rule.amountTo === undefined || p.totalAmount < rule.amountTo)) {
        candidates.push(rule);
      }
    }
    amountLevel = masterLookup.pickEffective(candidates, p.applyDate, '承認ルート規則 ' + p.expenseType).requiredLevel; // BR-02-1

    // 勘定科目による段数: 明細の科目の最低承認段数の最大値
    for (i = 0; i < codes.length; i += 1) {
      for (j = 0; j < accounts.length; j += 1) {
        if (accounts[j].accountCode === codes[i] && accounts[j].minApprovalLevel > accountLevel) {
          accountLevel = accounts[j].minApprovalLevel; // BR-02-1
        }
      }
    }

    // 遅延による段数
    if (p.isLate) {
      lateLevel = p.lateMinLevel; // BR-02-1、BR-03
    }

    return Math.max(amountLevel, accountLevel, lateLevel);
  }

  function indexBy(rows, key) {
    var map = {};
    var i;
    for (i = 0; i < (rows || []).length; i += 1) {
      map[rows[i][key]] = rows[i];
    }
    return map;
  }

  /**
   * 組織長が承認者になれるか（組織長が設定され、在籍し、申請者本人でない）。BR-02-2
   */
  function managerOf(org, employees, applicantId) {
    var managerId;
    var employee;
    if (!org) {
      return null;
    }
    managerId = org.managerEmployeeId;
    if (!managerId) {
      return null;
    }
    employee = employees[managerId];
    if (!employee || employee.status !== EMP_STATUS_ACTIVE) {
      return null;
    }
    if (managerId === applicantId) {
      return null;
    }
    return managerId;
  }

  /**
   * 承認者を決める（BR-02-2）。
   * @param {Object} p
   * @param {string} p.applicantId 申請者の社員番号
   * @param {string} p.applicantOrgCode 申請者の所属組織コード
   * @param {number} p.requiredLevel 必要段数 N（calcRequiredLevel の結果）
   * @param {Array<Object>} p.orgRows m_organization の行の配列
   * @param {Array<Object>} p.employeeRows m_employee の行の配列
   * @param {string} p.topApproverOrgCode 設定値 TOP_APPROVER_ORG（段4 の組織）
   * @returns {{steps: Array<{stepNo: number, level: number, approverId: string}>, error: (Object|null)}}
   *   決定できない場合は steps が空、error が E-129 のエラー
   */
  function buildRoute(p) {
    var orgs = indexBy(p.orgRows, 'orgCode');
    var employees = indexBy(p.employeeRows, 'employeeId');
    var stageApprover = {};
    var steps = [];
    var org = orgs[p.applicantOrgCode];
    var guard = 0;
    var n = p.requiredLevel;
    var k;
    var found;
    var topApprover;

    function add(level, approverId) {
      var last = steps[steps.length - 1];
      // 直前の承認者と同じ人（兼務など）は1つにまとめる。段は上の段にする
      if (last && last.approverId === approverId) {
        last.level = level;
        return;
      }
      steps.push({ stepNo: steps.length + 1, level: level, approverId: approverId });
    }

    // 申請者の所属組織から親をたどり、段k の組織（組織階層 = 4 - k）を探す
    while (org && guard < 10) {
      k = 4 - org.orgLevel;
      if (k >= 1 && k <= MAX_ORG_STAGE && !(k in stageApprover)) {
        stageApprover[k] = managerOf(org, employees, p.applicantId);
      }
      org = org.parentOrgCode ? orgs[org.parentOrgCode] : null;
      guard += 1;
    }

    // BR-02-2 手順1: 段1〜段N の有効な段を並べる
    for (k = 1; k <= n; k += 1) {
      if (stageApprover[k]) {
        add(k, stageApprover[k]);
      }
    }

    // BR-02-2 手順2〜4: 段N が無効なら上の段から1人繰り上げる
    if (!stageApprover[n]) {
      found = false;
      for (k = n + 1; k <= MAX_ORG_STAGE; k += 1) {
        if (stageApprover[k]) {
          add(k, stageApprover[k]);
          found = true;
          break;
        }
      }
      if (!found) {
        topApprover = managerOf(orgs[p.topApproverOrgCode], employees, p.applicantId);
        if (!topApprover) {
          return { steps: [], error: messages.error('E-129', [], null, null) };
        }
        add(TOP_STAGE, topApprover);
      }
    }

    return { steps: steps, error: null };
  }

  /**
   * 承認段に必要な役職コードの下限（BR-02-1。承認者変更 E-208 で使う）。
   * @param {number} level 承認段（1〜4）
   * @returns {string|null} 役職コード（'30'〜'50'）。範囲外は null
   */
  function minPositionForLevel(level) {
    return MIN_POSITION_BY_LEVEL[level] || null;
  }

  InfoExp.logic.approvalRoute = {
    calcRequiredLevel: calcRequiredLevel,
    buildRoute: buildRoute,
    minPositionForLevel: minPositionForLevel
  };
})();
