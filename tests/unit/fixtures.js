/*
 * テスト用のマスタデータ（team/unit-test-guide.md の 4.6）。
 * 基本設計書 03 の8章（初期データ）と同じ値を JS のオブジェクトで持つ。DB・localStorage は使わない。
 * 初期データ（js/data/seed-*.js）を変えたら、本ファイルも同じように変える。
 * テストの中で値を変える場合は InfoExpTest.clone() で複製してから変えること。
 * assignmentRows（所属・役職履歴）は、DB から読む場合（ORDER BY valid_from）と同じく発令日の昇順に並べる。
 */
(function () {
  'use strict';

  var orgRows = [
    { orgCode: '1000', orgName: '営業本部', orgLevel: 1, parentOrgCode: null, managerEmployeeId: '100001', validFrom: '2023-04-01', validTo: null },
    { orgCode: '1100', orgName: '第一営業部', orgLevel: 2, parentOrgCode: '1000', managerEmployeeId: '100002', validFrom: '2023-04-01', validTo: null },
    { orgCode: '1110', orgName: '営業一課', orgLevel: 3, parentOrgCode: '1100', managerEmployeeId: '100003', validFrom: '2023-04-01', validTo: null },
    { orgCode: '1120', orgName: '営業二課', orgLevel: 3, parentOrgCode: '1100', managerEmployeeId: '100004', validFrom: '2023-04-01', validTo: null },
    { orgCode: '1200', orgName: '第二営業部', orgLevel: 2, parentOrgCode: '1000', managerEmployeeId: '100005', validFrom: '2023-04-01', validTo: null },
    { orgCode: '1210', orgName: '営業三課', orgLevel: 3, parentOrgCode: '1200', managerEmployeeId: null, validFrom: '2023-04-01', validTo: null },
    { orgCode: '2000', orgName: '管理本部', orgLevel: 1, parentOrgCode: null, managerEmployeeId: '200001', validFrom: '2023-04-01', validTo: null },
    { orgCode: '2100', orgName: '経理部', orgLevel: 2, parentOrgCode: '2000', managerEmployeeId: '200002', validFrom: '2023-04-01', validTo: null },
    { orgCode: '2110', orgName: '経理課', orgLevel: 3, parentOrgCode: '2100', managerEmployeeId: '200003', validFrom: '2023-04-01', validTo: null },
    { orgCode: '2200', orgName: '情報システム部', orgLevel: 2, parentOrgCode: '2000', managerEmployeeId: '200004', validFrom: '2023-04-01', validTo: null },
    { orgCode: '2210', orgName: 'システム課', orgLevel: 3, parentOrgCode: '2200', managerEmployeeId: '200005', validFrom: '2023-04-01', validTo: null }
  ];

  var employeeRows = [
    { employeeId: '100001', employeeName: '山本 健一', orgCode: '1000', positionCode: '50', hireDate: '1992-04-01', retireDate: null, status: '1' },
    { employeeId: '100002', employeeName: '高橋 誠', orgCode: '1100', positionCode: '40', hireDate: '1996-04-01', retireDate: null, status: '1' },
    { employeeId: '100003', employeeName: '鈴木 一郎', orgCode: '1110', positionCode: '30', hireDate: '2003-04-01', retireDate: null, status: '1' },
    { employeeId: '100004', employeeName: '伊藤 直樹', orgCode: '1120', positionCode: '30', hireDate: '2008-04-01', retireDate: null, status: '1' },
    { employeeId: '100005', employeeName: '中村 浩二', orgCode: '1200', positionCode: '40', hireDate: '1998-04-01', retireDate: null, status: '1' },
    { employeeId: '100011', employeeName: '佐藤 美咲', orgCode: '1110', positionCode: '20', hireDate: '2014-04-01', retireDate: null, status: '1' },
    { employeeId: '100012', employeeName: '田中 翔太', orgCode: '1110', positionCode: '10', hireDate: '2020-04-01', retireDate: null, status: '1' },
    { employeeId: '100013', employeeName: '渡辺 優子', orgCode: '1110', positionCode: '10', hireDate: '2021-04-01', retireDate: null, status: '1' },
    { employeeId: '100014', employeeName: '小林 大輔', orgCode: '1120', positionCode: '10', hireDate: '2019-04-01', retireDate: null, status: '1' },
    { employeeId: '100015', employeeName: '斎藤 由美', orgCode: '1210', positionCode: '10', hireDate: '2018-04-01', retireDate: null, status: '1' },
    { employeeId: '100016', employeeName: '清水 拓也', orgCode: '1210', positionCode: '10', hireDate: '2022-04-01', retireDate: '2026-11-15', status: '9' },
    { employeeId: '200001', employeeName: '加藤 正人', orgCode: '2000', positionCode: '50', hireDate: '1990-04-01', retireDate: null, status: '1' },
    { employeeId: '200002', employeeName: '吉田 恵子', orgCode: '2100', positionCode: '40', hireDate: '1997-04-01', retireDate: null, status: '1' },
    { employeeId: '200003', employeeName: '山田 隆', orgCode: '2110', positionCode: '30', hireDate: '2005-04-01', retireDate: null, status: '1' },
    { employeeId: '200004', employeeName: '井上 修', orgCode: '2200', positionCode: '40', hireDate: '1999-04-01', retireDate: null, status: '1' },
    { employeeId: '200005', employeeName: '木村 聡', orgCode: '2210', positionCode: '30', hireDate: '2006-04-01', retireDate: null, status: '1' },
    { employeeId: '200011', employeeName: '森 彩', orgCode: '2110', positionCode: '20', hireDate: '2015-04-01', retireDate: null, status: '1' },
    { employeeId: '200012', employeeName: '池田 真一', orgCode: '2110', positionCode: '10', hireDate: '2023-04-01', retireDate: null, status: '1' },
    { employeeId: '200021', employeeName: '林 千尋', orgCode: '2210', positionCode: '10', hireDate: '2019-04-01', retireDate: null, status: '1' }
  ];

  var assignmentRows = [
    { employeeId: '100001', validFrom: '2023-04-01', validTo: null, orgCode: '1000', positionCode: '50' },
    { employeeId: '100002', validFrom: '2023-04-01', validTo: null, orgCode: '1100', positionCode: '40' },
    { employeeId: '100003', validFrom: '2023-04-01', validTo: null, orgCode: '1110', positionCode: '30' },
    { employeeId: '100004', validFrom: '2023-04-01', validTo: '2026-09-30', orgCode: '1120', positionCode: '20' },
    { employeeId: '100005', validFrom: '2023-04-01', validTo: null, orgCode: '1200', positionCode: '40' },
    { employeeId: '100011', validFrom: '2023-04-01', validTo: null, orgCode: '1110', positionCode: '20' },
    { employeeId: '100012', validFrom: '2023-04-01', validTo: null, orgCode: '1110', positionCode: '10' },
    { employeeId: '100013', validFrom: '2023-04-01', validTo: null, orgCode: '1110', positionCode: '10' },
    { employeeId: '100014', validFrom: '2023-04-01', validTo: null, orgCode: '1120', positionCode: '10' },
    { employeeId: '100015', validFrom: '2023-04-01', validTo: null, orgCode: '1210', positionCode: '10' },
    { employeeId: '100016', validFrom: '2023-04-01', validTo: null, orgCode: '1210', positionCode: '10' },
    { employeeId: '200001', validFrom: '2023-04-01', validTo: null, orgCode: '2000', positionCode: '50' },
    { employeeId: '200002', validFrom: '2023-04-01', validTo: null, orgCode: '2100', positionCode: '40' },
    { employeeId: '200003', validFrom: '2023-04-01', validTo: null, orgCode: '2110', positionCode: '30' },
    { employeeId: '200004', validFrom: '2023-04-01', validTo: null, orgCode: '2200', positionCode: '40' },
    { employeeId: '200005', validFrom: '2023-04-01', validTo: null, orgCode: '2210', positionCode: '30' },
    { employeeId: '200011', validFrom: '2023-04-01', validTo: null, orgCode: '2110', positionCode: '20' },
    { employeeId: '200012', validFrom: '2023-04-01', validTo: null, orgCode: '2110', positionCode: '10' },
    { employeeId: '200021', validFrom: '2023-04-01', validTo: null, orgCode: '2210', positionCode: '10' },
    { employeeId: '100004', validFrom: '2026-10-01', validTo: null, orgCode: '1120', positionCode: '30' }
  ];

  var passRows = [
    { employeeId: '100011', validFrom: '2024-04-01', seq: 1, validTo: '2026-09-30', lineCode: 'MD', fromStationCode: 'MD02', toStationCode: 'MD05' },
    { employeeId: '100011', validFrom: '2026-10-01', seq: 1, validTo: null, lineCode: 'MD', fromStationCode: 'MD03', toStationCode: 'MD05' },
    { employeeId: '100012', validFrom: '2025-04-01', seq: 1, validTo: null, lineCode: 'SK', fromStationCode: 'SK02', toStationCode: 'SK03' },
    { employeeId: '100003', validFrom: '2023-04-01', seq: 1, validTo: null, lineCode: 'MD', fromStationCode: 'MD05', toStationCode: 'MD08' },
    { employeeId: '100014', validFrom: '2023-04-01', seq: 1, validTo: null, lineCode: 'MD', fromStationCode: 'MD05', toStationCode: 'MD07' }
  ];

  var userRoleRows = [
    { employeeId: '200003', roleCode: 'ACCT' },
    { employeeId: '200011', roleCode: 'ACCT' },
    { employeeId: '200012', roleCode: 'ACCT' },
    { employeeId: '200005', roleCode: 'ADMIN' },
    { employeeId: '200021', roleCode: 'ADMIN' }
  ];

  var stationRows = [
    { stationCode: 'MD01', lineCode: 'MD', stationName: 'みどり北', stationOrder: 1, distanceX10: 0 },
    { stationCode: 'MD02', lineCode: 'MD', stationName: '青葉町', stationOrder: 2, distanceX10: 21 },
    { stationCode: 'MD03', lineCode: 'MD', stationName: '若松台', stationOrder: 3, distanceX10: 40 },
    { stationCode: 'MD04', lineCode: 'MD', stationName: '東公園', stationOrder: 4, distanceX10: 58 },
    { stationCode: 'MD05', lineCode: 'MD', stationName: '中央', stationOrder: 5, distanceX10: 75 },
    { stationCode: 'MD06', lineCode: 'MD', stationName: '港町', stationOrder: 6, distanceX10: 99 },
    { stationCode: 'MD07', lineCode: 'MD', stationName: '南浜', stationOrder: 7, distanceX10: 126 },
    { stationCode: 'MD08', lineCode: 'MD', stationName: '汐見ヶ浜', stationOrder: 8, distanceX10: 152 },
    { stationCode: 'SK01', lineCode: 'SK', stationName: '西の森', stationOrder: 1, distanceX10: 0 },
    { stationCode: 'SK02', lineCode: 'SK', stationName: '桜坂上', stationOrder: 2, distanceX10: 32 },
    { stationCode: 'SK03', lineCode: 'SK', stationName: '中央', stationOrder: 3, distanceX10: 60 },
    { stationCode: 'SK04', lineCode: 'SK', stationName: '川端町', stationOrder: 4, distanceX10: 81 },
    { stationCode: 'SK05', lineCode: 'SK', stationName: '東港', stationOrder: 5, distanceX10: 115 }
  ];

  var fareRows = [
    { lineCode: 'MD', validFrom: '2023-04-01', distanceFromX10: 1, distanceToX10: 30, validTo: null, fare: 160 },
    { lineCode: 'MD', validFrom: '2023-04-01', distanceFromX10: 31, distanceToX10: 60, validTo: null, fare: 200 },
    { lineCode: 'MD', validFrom: '2023-04-01', distanceFromX10: 61, distanceToX10: 100, validTo: null, fare: 240 },
    { lineCode: 'MD', validFrom: '2023-04-01', distanceFromX10: 101, distanceToX10: 150, validTo: null, fare: 290 },
    { lineCode: 'MD', validFrom: '2023-04-01', distanceFromX10: 151, distanceToX10: 200, validTo: null, fare: 330 },
    { lineCode: 'SK', validFrom: '2023-04-01', distanceFromX10: 1, distanceToX10: 40, validTo: null, fare: 180 },
    { lineCode: 'SK', validFrom: '2023-04-01', distanceFromX10: 41, distanceToX10: 80, validTo: null, fare: 230 },
    { lineCode: 'SK', validFrom: '2023-04-01', distanceFromX10: 81, distanceToX10: 120, validTo: null, fare: 280 }
  ];

  var accountRows = [
    { accountCode: '6110', accountName: '旅費交通費', generalSelectable: 0, minApprovalLevel: 0, attendeeRequired: 0, mealCheck: 0, taxTarget: 1, defaultTaxRate: 10, sortOrder: 10 },
    { accountCode: '6120', accountName: '会議費', generalSelectable: 1, minApprovalLevel: 0, attendeeRequired: 1, mealCheck: 1, taxTarget: 1, defaultTaxRate: 10, sortOrder: 20 },
    { accountCode: '6130', accountName: '接待交際費', generalSelectable: 1, minApprovalLevel: 2, attendeeRequired: 1, mealCheck: 0, taxTarget: 1, defaultTaxRate: 10, sortOrder: 30 },
    { accountCode: '6140', accountName: '消耗品費', generalSelectable: 1, minApprovalLevel: 0, attendeeRequired: 0, mealCheck: 0, taxTarget: 1, defaultTaxRate: 10, sortOrder: 40 },
    { accountCode: '6150', accountName: '新聞図書費', generalSelectable: 1, minApprovalLevel: 0, attendeeRequired: 0, mealCheck: 0, taxTarget: 1, defaultTaxRate: 10, sortOrder: 50 },
    { accountCode: '6160', accountName: '通信費', generalSelectable: 1, minApprovalLevel: 0, attendeeRequired: 0, mealCheck: 0, taxTarget: 1, defaultTaxRate: 10, sortOrder: 60 },
    { accountCode: '6170', accountName: '研修費', generalSelectable: 1, minApprovalLevel: 0, attendeeRequired: 0, mealCheck: 0, taxTarget: 1, defaultTaxRate: 10, sortOrder: 70 },
    { accountCode: '6180', accountName: '租税公課', generalSelectable: 1, minApprovalLevel: 0, attendeeRequired: 0, mealCheck: 0, taxTarget: 0, defaultTaxRate: 0, sortOrder: 80 },
    { accountCode: '6190', accountName: '雑費', generalSelectable: 1, minApprovalLevel: 0, attendeeRequired: 0, mealCheck: 0, taxTarget: 1, defaultTaxRate: 10, sortOrder: 90 },
    { accountCode: '2150', accountName: '未払金', generalSelectable: 0, minApprovalLevel: 0, attendeeRequired: 0, mealCheck: 0, taxTarget: 0, defaultTaxRate: 0, sortOrder: 900 }
  ];

  var ruleRows = [
    { expenseType: 'TR', validFrom: '2023-04-01', amountFrom: 0, amountTo: 30000, validTo: null, requiredLevel: 1 },
    { expenseType: 'TR', validFrom: '2023-04-01', amountFrom: 30000, amountTo: null, validTo: null, requiredLevel: 2 },
    { expenseType: 'BT', validFrom: '2023-04-01', amountFrom: 0, amountTo: 50000, validTo: null, requiredLevel: 1 },
    { expenseType: 'BT', validFrom: '2023-04-01', amountFrom: 50000, amountTo: 200000, validTo: null, requiredLevel: 2 },
    { expenseType: 'BT', validFrom: '2023-04-01', amountFrom: 200000, amountTo: null, validTo: null, requiredLevel: 3 },
    { expenseType: 'GE', validFrom: '2023-04-01', amountFrom: 0, amountTo: 50000, validTo: null, requiredLevel: 1 },
    { expenseType: 'GE', validFrom: '2023-04-01', amountFrom: 50000, amountTo: 300000, validTo: null, requiredLevel: 2 },
    { expenseType: 'GE', validFrom: '2023-04-01', amountFrom: 300000, amountTo: null, validTo: null, requiredLevel: 3 }
  ];

  var rateRows = [
    { positionCode: '10', validFrom: '2023-04-01', validTo: null, allowanceDayTrip: 1000, allowanceStayTrip: 2000, hotelLimitA: 11000, hotelLimitB: 9800 },
    { positionCode: '20', validFrom: '2023-04-01', validTo: null, allowanceDayTrip: 1000, allowanceStayTrip: 2000, hotelLimitA: 11000, hotelLimitB: 9800 },
    { positionCode: '30', validFrom: '2023-04-01', validTo: null, allowanceDayTrip: 1500, allowanceStayTrip: 2500, hotelLimitA: 13000, hotelLimitB: 11000 },
    { positionCode: '40', validFrom: '2023-04-01', validTo: null, allowanceDayTrip: 2000, allowanceStayTrip: 3000, hotelLimitA: 15000, hotelLimitB: 13000 },
    { positionCode: '50', validFrom: '2023-04-01', validTo: null, allowanceDayTrip: 2500, allowanceStayTrip: 3500, hotelLimitA: 18000, hotelLimitB: 16000 }
  ];

  var settingRows = [
    { settingKey: 'RECEIPT_MIN_GENERAL', validFrom: '2023-04-01', validTo: null, settingValue: '5000' },
    { settingKey: 'RECEIPT_MIN_PUBLIC_TRANSPORT', validFrom: '2023-04-01', validTo: null, settingValue: '30000' },
    { settingKey: 'PUBLIC_TRANSPORT_SPECIAL_LIMIT', validFrom: '2023-10-01', validTo: null, settingValue: '30000' },
    { settingKey: 'MEAL_LIMIT_PER_PERSON', validFrom: '2023-04-01', validTo: '2024-03-31', settingValue: '5000' },
    { settingKey: 'MEAL_LIMIT_PER_PERSON', validFrom: '2024-04-01', validTo: null, settingValue: '10000' },
    { settingKey: 'DAY_TRIP_MIN_KM', validFrom: '2023-04-01', validTo: null, settingValue: '100' },
    { settingKey: 'APPLY_DEADLINE_MONTHS', validFrom: '2023-04-01', validTo: null, settingValue: '1' },
    { settingKey: 'LATE_MIN_APPROVAL_LEVEL', validFrom: '2023-04-01', validTo: null, settingValue: '2' },
    { settingKey: 'TOP_APPROVER_ORG', validFrom: '2023-04-01', validTo: null, settingValue: '2000' },
    { settingKey: 'OPERATION_DATE', validFrom: '1900-01-01', validTo: null, settingValue: '2026-11-30' }
  ];

  function rowsOf(rows, employeeId) {
    return rows.filter(function (row) { return row.employeeId === employeeId; });
  }

  InfoExpTest.fixtures = {
    orgRows: orgRows,
    employeeRows: employeeRows,
    assignmentRows: assignmentRows,
    passRows: passRows,
    userRoleRows: userRoleRows,
    stationRows: stationRows,
    fareRows: fareRows,
    accountRows: accountRows,
    ruleRows: ruleRows,
    rateRows: rateRows,
    settingRows: settingRows,

    // 社員番号の別名
    emp: {
      yamamoto: '100001', takahashi: '100002', suzuki: '100003', ito: '100004', nakamura: '100005',
      sato: '100011', tanaka: '100012', watanabe: '100013', kobayashi: '100014', saito: '100015', shimizu: '100016',
      kato: '200001', yoshida: '200002', yamada: '200003', inoue: '200004', kimura: '200005',
      mori: '200011', ikeda: '200012', hayashi: '200021'
    },
    // 組織コードの別名
    org: {
      salesHq: '1000', sales1Dept: '1100', sales1Sec: '1110', sales2Sec: '1120', sales2Dept: '1200', sales3Sec: '1210',
      adminHq: '2000', accountingDept: '2100', accountingSec: '2110', itDept: '2200', systemSec: '2210'
    },
    // 駅コードの別名（みどり線は ...Md、さくら線は ...Sk）
    st: {
      midorikitaMd: 'MD01', aobachoMd: 'MD02', wakamatsudaiMd: 'MD03', higashikoenMd: 'MD04', chuoMd: 'MD05',
      minatomachiMd: 'MD06', minamihamaMd: 'MD07', shiomigahamaMd: 'MD08',
      nishinomoriSk: 'SK01', sakurazakaueSk: 'SK02', chuoSk: 'SK03', kawabatachoSk: 'SK04', higashiminatoSk: 'SK05'
    },

    /** 社員の通勤定期区間（passRows の複製） */
    passRowsOf: function (employeeId) {
      return InfoExpTest.clone(rowsOf(passRows, employeeId));
    },
    /** 社員の所属・役職履歴（assignmentRows の複製） */
    assignmentRowsOf: function (employeeId) {
      return InfoExpTest.clone(rowsOf(assignmentRows, employeeId));
    },
    /** 役職の日当・宿泊費基準（rateRows の1行の複製） */
    rateRowOf: function (positionCode) {
      return InfoExpTest.clone(rateRows.filter(function (row) { return row.positionCode === positionCode; })[0]);
    }
  };
})();
