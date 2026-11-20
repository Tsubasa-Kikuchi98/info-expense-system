/*
 * 申請の再計算と入力チェック（02 の 5.3.5・5.3.7）。
 * 他の logic の関数を組み合わせるだけで、業務ルールの判定を自前で持たない。
 * 画面の再計算（SCR-03）とサービス層の保存・申請時のチェックは、どちらも本ファイルの関数を使う。
 *
 * 引数 p の形（calcReport・validateReport 共通）:
 * {
 *   timing: 'DRAFT'|'SUBMIT',          // validateReport のみ。DRAFT=下書き保存時、SUBMIT=申請・再申請時
 *   operationDate: 'YYYY-MM-DD',       // 業務日付
 *   report: { expenseType, applicantId, applicantOrgCode, title, remarks, lateReason,
 *             tripDestination, tripStartDate, tripEndDate, tripType, tripDistanceKm, firstSubmittedAt },
 *   items: [ { itemKind, useDate, description, lineCode, fromStationCode, toStationCode, routeText, tripWay,
 *              unitAmount, regionCode, actualAmount, accountCode, payeeName, taxRate, amount, taxAmount,
 *              invoiceNo, mealFlag, attendeeCount, attendeeNames, payMethod, receiptKind, receiptFileName } ],
 *            // 画面の並び順。日当明細（ALLOW）は渡しても無視し、出張情報から作り直す。
 *            // 数値の項目は画面の入力値（文字列）のままでよい
 *   masters: { settingRows, ruleRows, accountRows, stationRows, fareRows, rateRows, orgRows, employeeRows,
 *              passRows（申請者の通勤定期区間）, assignmentRows（申請者の所属・役職履歴）,
 *              taxCategoryNames（{ T10: '課税10% 適格', ... }。W-103 の表示用。省略可） }
 * }
 */
(function () {
  'use strict';

  var dateUtil = InfoExp.core.dateUtil;
  var messages = InfoExp.core.messages;
  var masterLookup = InfoExp.logic.masterLookup;
  var approvalRoute = InfoExp.logic.approvalRoute;
  var applyDeadline = InfoExp.logic.applyDeadline;
  var receiptRule = InfoExp.logic.receiptRule;
  var railFare = InfoExp.logic.railFare;
  var travelExpense = InfoExp.logic.travelExpense;
  var generalExpense = InfoExp.logic.generalExpense;
  var taxCategory = InfoExp.logic.taxCategory;

  var TRAVEL_ACCOUNT_CODE = '6110';   // 交通費・出張旅費の明細の勘定科目（03 の 4.14）
  var NON_GENERAL_TAX_RATE = 10;      // 一般経費以外の明細の税率（BR-08-2）
  var ALLOWANCE_DESCRIPTION = '日当';
  var WARN_TAX_CATEGORIES = ['N10', 'N08', 'Z10', 'Z08'];

  // 明細の項目（02 の 5.3.4）。type: date／text／int／select／invoice
  var ITEM_FIELDS = {
    useDate: { label: '利用日', type: 'date' },
    description: { label: '用務・内容', type: 'text', max: 100 },
    lineCode: { label: '路線', type: 'select' },
    fromStationCode: { label: '乗車駅', type: 'select' },
    toStationCode: { label: '降車駅', type: 'select' },
    routeText: { label: '経路', type: 'text', max: 100 },
    tripWay: { label: '片道・往復', type: 'select' },
    unitAmount: { label: '片道運賃', type: 'int', min: 1, max: 999999 },
    regionCode: { label: '地域区分', type: 'select' },
    actualAmount: { label: '実費', type: 'int', min: 1, max: 999999 },
    accountCode: { label: '勘定科目', type: 'select' },
    payeeName: { label: '支払先', type: 'text', max: 40 },
    taxRate: { label: '税率', type: 'select' },
    amount: { label: '金額（税込）', type: 'int', min: 1, max: 9999999 },
    taxAmount: { label: '消費税額', type: 'int', min: 0, max: 9999999 },
    invoiceNo: { label: '登録番号', type: 'invoice' },
    attendeeCount: { label: '参加人数', type: 'int', min: 1, max: 999 },
    attendeeNames: { label: '参加者', type: 'text', max: 200 },
    payMethod: { label: '支払方法', type: 'select' },
    receiptKind: { label: '領収書区分', type: 'select' }
  };

  // 明細区分ごとの入力項目と必須項目（02 の 5.3.4。参加人数・参加者は科目による条件つき必須のため BR-07 で見る）
  var KIND_FIELDS = {
    RAIL: {
      fields: ['useDate', 'description', 'lineCode', 'fromStationCode', 'toStationCode', 'tripWay', 'payMethod', 'receiptKind'],
      required: ['useDate', 'description', 'lineCode', 'fromStationCode', 'toStationCode', 'tripWay', 'payMethod', 'receiptKind']
    },
    PUBT: {
      fields: ['useDate', 'description', 'routeText', 'tripWay', 'unitAmount', 'invoiceNo', 'payMethod', 'receiptKind'],
      required: ['useDate', 'description', 'routeText', 'tripWay', 'unitAmount', 'payMethod', 'receiptKind']
    },
    TAXI: {
      fields: ['useDate', 'description', 'routeText', 'amount', 'invoiceNo', 'payMethod', 'receiptKind'],
      required: ['useDate', 'description', 'routeText', 'amount', 'payMethod', 'receiptKind']
    },
    AIR: {
      fields: ['useDate', 'description', 'routeText', 'amount', 'invoiceNo', 'payMethod', 'receiptKind'],
      required: ['useDate', 'description', 'routeText', 'amount', 'payMethod', 'receiptKind']
    },
    HOTEL: {
      fields: ['useDate', 'description', 'regionCode', 'actualAmount', 'invoiceNo', 'payMethod', 'receiptKind'],
      required: ['useDate', 'description', 'regionCode', 'actualAmount', 'payMethod', 'receiptKind']
    },
    GEN: {
      fields: ['useDate', 'description', 'accountCode', 'payeeName', 'taxRate', 'amount', 'taxAmount', 'invoiceNo',
        'attendeeCount', 'attendeeNames', 'payMethod', 'receiptKind'],
      required: ['useDate', 'description', 'accountCode', 'payeeName', 'taxRate', 'amount', 'payMethod', 'receiptKind']
    }
  };

  // 経費種別ごとに使える明細区分（03 の 4.14）
  var KINDS_BY_TYPE = {
    TR: ['RAIL', 'PUBT', 'TAXI'],
    BT: ['RAIL', 'PUBT', 'TAXI', 'AIR', 'HOTEL'],
    GE: ['GEN']
  };

  // ---------------------------------------------------------------- 入力値の読み取り

  function textOf(value) {
    return (value === null || value === undefined) ? '' : String(value).trim();
  }

  /** 半角数字の入力値を読む。{ isEmpty, isValid, value } */
  function readInt(value) {
    var text;
    if (value === null || value === undefined) {
      return { isEmpty: true, isValid: true, value: null };
    }
    if (typeof value === 'number') {
      if (isFinite(value) && value % 1 === 0 && value >= 0) {
        return { isEmpty: false, isValid: true, value: value };
      }
      return { isEmpty: false, isValid: false, value: null };
    }
    text = String(value).trim();
    if (text === '') {
      return { isEmpty: true, isValid: true, value: null };
    }
    if (/^[0-9]+$/.test(text)) {
      return { isEmpty: false, isValid: true, value: parseInt(text, 10) };
    }
    return { isEmpty: false, isValid: false, value: null };
  }

  function intOrNull(value) {
    return readInt(value).value;
  }

  function choiceInt(value, allowed) {
    var v = intOrNull(value);
    return allowed.indexOf(v) >= 0 ? v : null;
  }

  function isOn(value) {
    return value === true || value === 1 || value === '1' || value === 'on';
  }

  function withComma(value) {
    return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function findRow(rows, key, value) {
    var i;
    for (i = 0; i < (rows || []).length; i += 1) {
      if (rows[i][key] === value) {
        return rows[i];
      }
    }
    return null;
  }

  function settingNumber(masters, key, baseDate) {
    return masterLookup.getSettingNumber(masters.settingRows, key, baseDate);
  }

  function settingText(masters, key, baseDate) {
    var rows = [];
    var i;
    for (i = 0; i < (masters.settingRows || []).length; i += 1) {
      if (masters.settingRows[i].settingKey === key) {
        rows.push(masters.settingRows[i]);
      }
    }
    return String(masterLookup.pickEffective(rows, baseDate, '設定値 ' + key).settingValue); // BR-01-4
  }

  function pickRate(masters, positionCode, baseDate) {
    var rows = [];
    var i;
    for (i = 0; i < (masters.rateRows || []).length; i += 1) {
      if (masters.rateRows[i].positionCode === positionCode) {
        rows.push(masters.rateRows[i]);
      }
    }
    return masterLookup.pickEffective(rows, baseDate, '日当・宿泊費基準 ' + positionCode); // BR-01-4、BR-06
  }

  /** 画面の入力値を計算用の値にする（文字列は前後の空白を除き、数値は整数または null） */
  function normalizeItem(raw, itemNo) {
    return {
      itemNo: itemNo,
      itemKind: textOf(raw.itemKind),
      useDate: textOf(raw.useDate),
      description: textOf(raw.description),
      lineCode: textOf(raw.lineCode),
      fromStationCode: textOf(raw.fromStationCode),
      toStationCode: textOf(raw.toStationCode),
      routeText: textOf(raw.routeText),
      tripWay: choiceInt(raw.tripWay, [1, 2]),
      unitAmount: intOrNull(raw.unitAmount),
      regionCode: textOf(raw.regionCode),
      actualAmount: intOrNull(raw.actualAmount),
      accountCode: textOf(raw.accountCode),
      payeeName: textOf(raw.payeeName),
      taxRate: choiceInt(raw.taxRate, [10, 8, 0]),
      inputAmount: intOrNull(raw.amount),
      inputTaxAmount: intOrNull(raw.taxAmount),
      invoiceNo: textOf(raw.invoiceNo),
      mealFlag: isOn(raw.mealFlag) ? 1 : 0,
      attendeeCount: intOrNull(raw.attendeeCount),
      attendeeNames: textOf(raw.attendeeNames),
      payMethod: textOf(raw.payMethod),
      receiptKind: textOf(raw.receiptKind) || 'NONE',
      receiptFileName: textOf(raw.receiptFileName)
    };
  }

  // ---------------------------------------------------------------- 再計算

  /** 1明細の精算額・領収書要否・税区分・消費税額を求める（BR-04〜BR-08） */
  function calcItem(item, ctx) {
    var kind = item.itemKind;
    var isDateValid = dateUtil.isValid(item.useDate);
    var account;
    var rail;
    var hotel;
    var specialLimit = null;
    var canJudgeTax;

    item.accountCode = (kind === 'GEN') ? item.accountCode : TRAVEL_ACCOUNT_CODE;
    item.taxRate = (kind === 'GEN') ? item.taxRate : NON_GENERAL_TAX_RATE;
    item.amount = null;
    item.fareAmount = null;
    item.deductionAmount = null;
    item.limitAmount = null;
    item.selfBurden = null;
    item.days = null;
    item.railResult = null;
    if (kind !== 'PUBT') {
      item.unitAmount = null;
    }

    switch (kind) {
      case 'RAIL':
        // BR-05
        if (item.lineCode && item.fromStationCode && item.toStationCode &&
            (item.fromStationCode === item.toStationCode || (isDateValid && item.tripWay !== null))) {
          rail = railFare.calcRailItem({
            lineCode: item.lineCode,
            fromStationCode: item.fromStationCode,
            toStationCode: item.toStationCode,
            useDate: item.useDate,
            tripWay: item.tripWay,
            stationRows: ctx.masters.stationRows,
            fareRows: ctx.masters.fareRows,
            passRows: ctx.masters.passRows
          });
          item.railResult = rail.result;
          item.fareAmount = rail.fare;
          item.deductionAmount = rail.deduction;
          item.amount = rail.amount;
        }
        break;
      case 'PUBT':
        // 精算額 = 片道運賃 × 片道往復
        if (item.unitAmount !== null && item.tripWay !== null) {
          item.amount = item.unitAmount * item.tripWay;
        }
        break;
      case 'HOTEL':
        // BR-06-3
        if (ctx.rateRow && item.actualAmount !== null) {
          hotel = travelExpense.calcHotel({ actualAmount: item.actualAmount, regionCode: item.regionCode, rateRow: ctx.rateRow });
          if (hotel) {
            item.amount = hotel.amount;
            item.limitAmount = hotel.limit;
            item.selfBurden = hotel.selfBurden;
          }
        }
        break;
      default:
        item.amount = item.inputAmount;
    }

    // BR-04 領収書の要否（基準日 = 利用日）
    item.receiptRequired = null;
    if (kind === 'PUBT' || kind === 'GEN') {
      if (item.amount !== null && isDateValid) {
        item.receiptRequired = receiptRule.judgeReceiptRequired({
          itemKind: kind,
          amount: item.amount,
          minGeneral: settingNumber(ctx.masters, 'RECEIPT_MIN_GENERAL', item.useDate),
          minPublicTransport: settingNumber(ctx.masters, 'RECEIPT_MIN_PUBLIC_TRANSPORT', item.useDate)
        });
      }
    } else {
      item.receiptRequired = receiptRule.judgeReceiptRequired({ itemKind: kind, amount: item.amount, minGeneral: null, minPublicTransport: null });
    }

    // BR-08 税区分・消費税額（基準日 = 利用日）
    account = findRow(ctx.masters.accountRows, 'accountCode', item.accountCode);
    item.taxCategory = null;
    item.taxAmount = null;
    canJudgeTax = item.amount !== null && item.taxRate !== null && (kind !== 'GEN' || account !== null);
    if (canJudgeTax && kind === 'PUBT' && !ctx.isTrip) {
      if (isDateValid) {
        specialLimit = settingNumber(ctx.masters, 'PUBLIC_TRANSPORT_SPECIAL_LIMIT', item.useDate);
      } else {
        canJudgeTax = false;
      }
    }
    if (canJudgeTax) {
      item.taxCategory = taxCategory.judgeTaxCategory({
        expenseType: ctx.expenseType,
        itemKind: kind,
        amount: item.amount,
        taxRate: item.taxRate,
        invoiceNo: item.invoiceNo,
        receiptKind: item.receiptKind,
        accountTaxTarget: account ? account.taxTarget : 1,
        specialLimit: specialLimit
      });
      if (item.taxCategory === 'X00') {
        item.taxAmount = 0;                                  // BR-08-3
      } else if (kind === 'GEN' && item.inputTaxAmount !== null) {
        item.taxAmount = item.inputTaxAmount;                // BR-08-3 一般経費は申請者の入力値
      } else {
        item.taxAmount = taxCategory.calcTaxAmount(item.amount, item.taxRate); // BR-08-3
      }
    }
    return item;
  }

  /**
   * 申請を再計算する（02 の 5.3.5）。保存はしない。
   * @param {Object} p 本ファイル冒頭の形（timing は使わない）
   * @returns {{
   *   items: Array<Object>,              // 計算後の明細（日当明細を最後に含む）。各明細に amount・fareAmount・deductionAmount・
   *                                      // unitAmount・days・limitAmount・selfBurden・receiptRequired・taxCategory・taxAmount・
   *                                      // accountCode・taxRate・railResult を持つ。計算できない値は null
   *   allowancePositionCode: (string|null),
   *   totalAmount: number,
   *   deadline: (string|null),
   *   isLate: boolean,
   *   requiredLevel: number,
   *   route: {steps: Array, error: (Object|null)},
   *   warnings: Array<Object>            // W-101・W-102・W-103
   * }}
   * @throws {InfoExp.core.ConfigError} マスタの設定誤り（BR-01-4）
   */
  function calcReport(p) {
    var masters = p.masters || {};
    var report = p.report || {};
    var op = p.operationDate;
    var isTrip = report.expenseType === 'BT';
    var startDate = textOf(report.tripStartDate);
    var endDate = textOf(report.tripEndDate);
    var tripType = textOf(report.tripType);
    var firstSubmittedDate = report.firstSubmittedAt ? String(report.firstSubmittedAt).substring(0, 10) : null;
    var positionCode = null;
    var rateRow = null;
    var source = p.items || [];
    var items = [];
    var useDates = [];
    var accountCodes = [];
    var total = 0;
    var ctx;
    var allowance;
    var allowItem;
    var deadline;
    var isLateReport;
    var requiredLevel;
    var applicant;
    var applicantOrgCode;
    var route;
    var warnings = [];
    var names = masters.taxCategoryNames || {};
    var i;
    var item;

    // BR-06-2 日当算定役職と日当・宿泊費基準（基準日 = 出発日）
    if (isTrip && dateUtil.isValid(startDate)) {
      positionCode = travelExpense.findPositionAt(masters.assignmentRows, startDate);
      if (positionCode !== null) {
        rateRow = pickRate(masters, positionCode, startDate);
      }
    }
    ctx = { masters: masters, expenseType: report.expenseType, isTrip: isTrip, rateRow: rateRow };

    for (i = 0; i < source.length; i += 1) {
      if (textOf(source[i].itemKind) !== 'ALLOW') {
        items.push(calcItem(normalizeItem(source[i], items.length + 1), ctx));
      }
    }

    // BR-06-2 日当明細を最後に1行作る
    if (rateRow && dateUtil.isValid(endDate) && startDate <= endDate) {
      allowance = travelExpense.calcAllowance({ tripType: tripType, startDate: startDate, endDate: endDate, rateRow: rateRow });
      if (allowance) {
        allowItem = normalizeItem({ itemKind: 'ALLOW', useDate: startDate, description: ALLOWANCE_DESCRIPTION, receiptKind: 'NONE' }, items.length + 1);
        calcItem(allowItem, ctx);
        allowItem.unitAmount = allowance.unit;
        allowItem.days = allowance.days;
        allowItem.amount = allowance.amount;
        allowItem.payMethod = '';
        allowItem.receiptRequired = receiptRule.judgeReceiptRequired({ itemKind: 'ALLOW', amount: allowance.amount, minGeneral: null, minPublicTransport: null });
        allowItem.taxCategory = taxCategory.judgeTaxCategory({
          expenseType: report.expenseType, itemKind: 'ALLOW', amount: allowance.amount, taxRate: NON_GENERAL_TAX_RATE,
          invoiceNo: '', receiptKind: 'NONE', accountTaxTarget: (findRow(masters.accountRows, 'accountCode', TRAVEL_ACCOUNT_CODE) || { taxTarget: 1 }).taxTarget,
          specialLimit: null
        });
        allowItem.taxAmount = allowItem.taxCategory === 'X00' ? 0 : taxCategory.calcTaxAmount(allowance.amount, NON_GENERAL_TAX_RATE);
        items.push(allowItem);
      }
    }

    // BR-01-1 合計金額 = 明細の精算額の合計
    for (i = 0; i < items.length; i += 1) {
      item = items[i];
      total += item.amount || 0;
      if (item.itemKind !== 'ALLOW') {
        useDates.push(item.useDate);
      }
      if (item.itemKind === 'GEN' && item.accountCode) {
        accountCodes.push(item.accountCode);
      }
    }

    // BR-03 申請期限（設定値の基準日 = 初回申請日、未申請なら業務日付）と遅延
    deadline = applyDeadline.calcDeadline({
      expenseType: report.expenseType,
      itemUseDates: useDates,
      tripEndDate: endDate,
      months: settingNumber(masters, 'APPLY_DEADLINE_MONTHS', firstSubmittedDate || op)
    });
    isLateReport = applyDeadline.isLate({ deadline: deadline, firstSubmittedDate: firstSubmittedDate, operationDate: op });

    // BR-02 承認ルート（申請日 = 業務日付として判定）
    requiredLevel = approvalRoute.calcRequiredLevel({
      expenseType: report.expenseType,
      totalAmount: total,
      applyDate: op,
      ruleRows: masters.ruleRows,
      accountCodes: accountCodes,
      accountRows: masters.accountRows,
      isLate: isLateReport,
      lateMinLevel: settingNumber(masters, 'LATE_MIN_APPROVAL_LEVEL', op)
    });
    applicant = findRow(masters.employeeRows, 'employeeId', report.applicantId);
    applicantOrgCode = report.applicantOrgCode || (applicant ? applicant.orgCode : null);
    route = approvalRoute.buildRoute({
      applicantId: report.applicantId,
      applicantOrgCode: applicantOrgCode,
      requiredLevel: requiredLevel,
      orgRows: masters.orgRows,
      employeeRows: masters.employeeRows,
      topApproverOrgCode: settingText(masters, 'TOP_APPROVER_ORG', op)
    });

    // 警告（W-101・W-102・W-103）
    if (isLateReport) {
      warnings.push(messages.error('W-101', [deadline], null, 'lateReason'));
    }
    for (i = 0; i < items.length; i += 1) {
      item = items[i];
      if (item.itemKind === 'HOTEL' && item.selfBurden > 0) {
        warnings.push(messages.error('W-102', [item.itemNo, withComma(item.limitAmount), withComma(item.selfBurden)], item.itemNo, 'actualAmount'));
      }
      if (WARN_TAX_CATEGORIES.indexOf(item.taxCategory) >= 0) {
        warnings.push(messages.error('W-103', [item.itemNo, names[item.taxCategory] || item.taxCategory], item.itemNo, 'invoiceNo'));
      }
    }

    return {
      items: items,
      allowancePositionCode: positionCode,
      totalAmount: total,
      deadline: deadline,
      isLate: isLateReport,
      requiredLevel: requiredLevel,
      route: route,
      warnings: warnings
    };
  }

  // ---------------------------------------------------------------- 入力チェック

  function itemLabel(item, field) {
    var label = ITEM_FIELDS[field].label;
    if (field === 'useDate' && item.itemKind === 'HOTEL') {
      label = '宿泊日';
    }
    return '明細' + item.itemNo + 'の' + label;
  }

  /**
   * 申請の入力チェック（02 の 5.3.7 の CHK-01〜CHK-32）。
   * @param {Object} p 本ファイル冒頭の形
   * @returns {Array<Object>} エラーの配列（CHK-01〜CHK-32 の順。同じ CHK の中は明細番号の順）
   * @throws {InfoExp.core.ConfigError} マスタの設定誤り（BR-01-4）
   */
  function validateReport(p) {
    var isSubmit = p.timing === 'SUBMIT';
    var report = p.report || {};
    var masters = p.masters || {};
    var op = p.operationDate;
    var isTrip = report.expenseType === 'BT';
    var calc = calcReport(p);
    var buckets = {};
    var rawItems = [];
    var errors = [];
    var allowedKinds = KINDS_BY_TYPE[report.expenseType] || [];
    var tripMap = { 'E-121': 7, 'E-114': 8, 'E-115': 9, 'E-116': 10, 'E-117': 11, 'E-136': 12, 'E-118': 17, 'E-138': 18, 'E-119': 19, 'E-120': 20 };
    var receiptMap = { 'E-122': 27, 'E-123': 28, 'E-124': 29, 'E-128': 30 };
    var generalMap = { 'E-101': 15, 'E-127': 24, 'E-126': 26 };
    var startDate = textOf(report.tripStartDate);
    var endDate = textOf(report.tripEndDate);
    var tripType = textOf(report.tripType);
    var distance = readInt(report.tripDistanceKm);
    var i;
    var j;
    var chk;
    var item;
    var raw;
    var kindDef;
    var field;
    var def;
    var value;
    var parsed;
    var found;
    var tripErrors;
    var receiptErrors;
    var generalErrors;
    var account;
    var dayTripMinKm;

    function push(chkNo, error) {
      if (!buckets[chkNo]) {
        buckets[chkNo] = [];
      }
      buckets[chkNo].push(error);
    }

    function checkText(value, max, label, fieldName, itemNo) {
      if (textOf(value).length > max) {
        push(2, messages.error('E-102', [label, max], itemNo, fieldName));
      }
    }

    // 画面の明細（日当を除く）と、計算後の明細を対応づける
    for (i = 0; i < (p.items || []).length; i += 1) {
      if (textOf(p.items[i].itemKind) !== 'ALLOW') {
        rawItems.push(p.items[i]);
      }
    }

    // CHK-01 件名
    if (textOf(report.title) === '') {
      push(1, messages.error('E-101', ['件名'], null, 'title'));
    }
    // CHK-02 ヘッダの桁
    checkText(report.title, 40, '件名', 'title', null);
    checkText(report.remarks, 200, '申請理由・備考', 'remarks', null);
    checkText(report.lateReason, 200, '遅延理由', 'lateReason', null);
    if (isTrip) {
      checkText(report.tripDestination, 40, '出張先', 'tripDestination', null);
      // CHK-03 片道距離
      if (!distance.isValid || (distance.value !== null && (distance.value < 1 || distance.value > 9999))) {
        push(3, messages.error('E-103', ['片道距離（km）', 1, withComma(9999)], null, 'tripDistanceKm'));
      }
      // CHK-04 出発日・帰着日
      if (startDate !== '' && !dateUtil.isValid(startDate)) {
        push(4, messages.error('E-104', ['出発日'], null, 'tripStartDate'));
      }
      if (endDate !== '' && !dateUtil.isValid(endDate)) {
        push(4, messages.error('E-104', ['帰着日'], null, 'tripEndDate'));
      }
    }

    // 明細ごとの形式チェック（CHK-02〜CHK-04、CHK-25、CHK-30）
    for (i = 0; i < calc.items.length; i += 1) {
      item = calc.items[i];
      if (item.itemKind === 'ALLOW') {
        continue;
      }
      raw = rawItems[i];
      kindDef = KIND_FIELDS[item.itemKind];
      if (!kindDef || allowedKinds.indexOf(item.itemKind) < 0) {
        continue;
      }
      for (j = 0; j < kindDef.fields.length; j += 1) {
        field = kindDef.fields[j];
        def = ITEM_FIELDS[field];
        value = raw[field];
        if (def.type === 'text') {
          checkText(value, def.max, itemLabel(item, field), field, item.itemNo);
        } else if (def.type === 'int') {
          parsed = readInt(value);
          if (!parsed.isValid || (parsed.value !== null && (parsed.value < def.min || parsed.value > def.max))) {
            push(3, messages.error('E-103', [itemLabel(item, field), withComma(def.min), withComma(def.max)], item.itemNo, field));
          }
        } else if (def.type === 'date') {
          if (textOf(value) !== '' && !dateUtil.isValid(textOf(value))) {
            push(4, messages.error('E-104', [itemLabel(item, field)], item.itemNo, field));
          }
        } else if (def.type === 'invoice') {
          // CHK-25 登録番号の形式（BR-08-4）
          if (item.invoiceNo !== '' && !taxCategory.isValidInvoiceNo(item.invoiceNo)) {
            push(25, messages.error('E-125', [item.itemNo], item.itemNo, 'invoiceNo'));
          }
        }
      }
      // CHK-27〜CHK-30 領収書（BR-04）。下書き保存時は CHK-30 だけ
      receiptErrors = receiptRule.validateReceipt({
        itemNo: item.itemNo,
        itemKind: item.itemKind,
        required: item.receiptRequired,
        receiptKind: item.receiptKind,
        payMethod: item.payMethod,
        fileName: item.receiptFileName
      });
      for (j = 0; j < receiptErrors.length; j += 1) {
        chk = receiptMap[receiptErrors[j].msgId];
        if (isSubmit || chk === 30) {
          push(chk, receiptErrors[j]);
        }
      }
    }

    if (isSubmit) {
      if (isTrip) {
        // CHK-05 出張情報の必須
        if (textOf(report.tripDestination) === '') {
          push(5, messages.error('E-101', ['出張先'], null, 'tripDestination'));
        }
        if (startDate === '') {
          push(5, messages.error('E-101', ['出発日'], null, 'tripStartDate'));
        }
        if (endDate === '') {
          push(5, messages.error('E-101', ['帰着日'], null, 'tripEndDate'));
        }
        if (tripType !== 'DAY' && tripType !== 'STAY') {
          push(5, messages.error('E-105', ['出張区分'], null, 'tripType'));
        }
        // CHK-06 日帰りの片道距離
        if (tripType === 'DAY' && distance.isEmpty) {
          push(6, messages.error('E-101', ['片道距離（km）'], null, 'tripDistanceKm'));
        }
        // CHK-07〜CHK-12、CHK-17〜CHK-20 出張の要件（BR-06-1、BR-06-3。片道距離の下限の基準日 = 出発日）
        dayTripMinKm = settingNumber(masters, 'DAY_TRIP_MIN_KM', dateUtil.isValid(startDate) ? startDate : op);
        tripErrors = travelExpense.validateTrip({
          tripType: tripType,
          startDate: startDate,
          endDate: endDate,
          distanceKm: distance.value,
          dayTripMinKm: dayTripMinKm,
          operationDate: op,
          items: calc.items
        });
        for (j = 0; j < tripErrors.length; j += 1) {
          push(tripMap[tripErrors[j].msgId], tripErrors[j]);
        }
        // CHK-13 日当算定役職（BR-06-2）
        if (dateUtil.isValid(startDate) && calc.allowancePositionCode === null) {
          push(13, messages.error('E-137', [], null, 'tripStartDate'));
        }
      }

      // CHK-14 明細0件（出張旅費は日当明細だけでもよい）
      if (calc.items.length === 0) {
        push(14, messages.error('E-110', [], null, null));
      }

      for (i = 0; i < calc.items.length; i += 1) {
        item = calc.items[i];
        if (item.itemKind === 'ALLOW') {
          continue;
        }
        if (!KIND_FIELDS[item.itemKind] || allowedKinds.indexOf(item.itemKind) < 0) {
          // 経費種別で使えない明細区分（03 の 4.14）
          push(15, messages.error('E-105', ['明細' + item.itemNo + 'の明細区分'], item.itemNo, 'itemKind'));
          continue;
        }
        raw = rawItems[i];
        kindDef = KIND_FIELDS[item.itemKind];
        // CHK-15 明細の必須項目
        for (j = 0; j < kindDef.required.length; j += 1) {
          field = kindDef.required[j];
          def = ITEM_FIELDS[field];
          found = (def.type === 'int') ? !readInt(raw[field]).isEmpty : textOf(raw[field]) !== '';
          if (!found) {
            push(15, messages.error(def.type === 'select' ? 'E-105' : 'E-101', [itemLabel(item, field)], item.itemNo, field));
          }
        }
        // CHK-15・CHK-24・CHK-26 一般経費（BR-07）
        if (item.itemKind === 'GEN') {
          account = findRow(masters.accountRows, 'accountCode', item.accountCode);
          generalErrors = generalExpense.validateGeneralItem({
            itemNo: item.itemNo,
            item: {
              amount: item.amount,
              taxAmount: item.inputTaxAmount,
              mealFlag: dateUtil.isValid(item.useDate) ? item.mealFlag : 0,
              attendeeCount: item.attendeeCount,
              attendeeNames: item.attendeeNames
            },
            accountRow: account,
            mealLimit: dateUtil.isValid(item.useDate) ? settingNumber(masters, 'MEAL_LIMIT_PER_PERSON', item.useDate) : null
          });
          for (j = 0; j < generalErrors.length; j += 1) {
            push(generalMap[generalErrors[j].msgId], generalErrors[j]);
          }
        }
        // CHK-16 利用日は業務日付以前（BR-01-2）
        if (dateUtil.isValid(item.useDate) && item.useDate > op) {
          push(16, messages.error('E-111', [item.itemNo, op], item.itemNo, 'useDate'));
        }
        // CHK-21〜CHK-23 鉄道（BR-05）
        if (item.railResult === 'SAME_STATION') {
          push(21, messages.error('E-112', [item.itemNo], item.itemNo, 'toStationCode'));
        } else if (item.railResult === 'NO_FARE') {
          push(22, messages.error('E-131', [item.itemNo], item.itemNo, 'toStationCode'));
        } else if (item.railResult === 'ALL_INSIDE') {
          push(23, messages.error('E-113', [item.itemNo], item.itemNo, 'toStationCode'));
        }
      }

      // CHK-31 遅延理由（BR-03）
      if (calc.isLate && textOf(report.lateReason) === '') {
        push(31, messages.error('E-130', [calc.deadline], null, 'lateReason'));
      }
    }

    for (chk = 1; chk <= 31; chk += 1) {
      if (buckets[chk]) {
        errors = errors.concat(buckets[chk]);
      }
    }
    // CHK-32 承認ルート（CHK-01〜CHK-31 にエラーがない場合だけ。BR-02）
    if (isSubmit && errors.length === 0 && calc.route.error) {
      errors.push(calc.route.error);
    }
    return errors;
  }

  InfoExp.logic.reportValidator = {
    calcReport: calcReport,
    validateReport: validateReport
  };
})();
