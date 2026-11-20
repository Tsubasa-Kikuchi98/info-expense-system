/*
 * 申請などの初期データ（03 の 8.4・8.5）。業務日付 2026-11-30 時点の状態。
 * 金額は BR-05〜BR-08 の計算どおり。登録番号は T0000000000 で始まる架空の値。
 * 変えたら tests/unit/fixtures.js と docs/03-data.md の8章も合わせる。
 */
(function () {
  'use strict';

  var SQL = [
    // 8.5 バッチ実行履歴
    'INSERT INTO t_batch_run (run_id, batch_id, operation_date, param, started_at, ended_at, result, record_count, total_amount, file_name, message, executed_by, updated_at) VALUES',
    "(1, 'B02', '2026-10-28', NULL, '2026-10-28 22:00:00', '2026-10-28 22:00:01', 'OK', 2, 50680, 'JRNL_EXP_20261028_220000.csv', '仕訳連携が正常に終了しました。（件数: 2）', '200021', '2026-10-28 22:00:01'),",
    "(2, 'B03', '2026-11-01', '2026-10', '2026-11-01 01:00:00', '2026-11-01 01:00:01', 'OK', 2, 50680, NULL, '月次締めが正常に終了しました。（件数: 2）', '200021', '2026-11-01 01:00:01'),",
    "(3, 'B04', '2026-11-01', '2026-11', '2026-11-01 02:00:00', '2026-11-01 02:00:01', 'OK', 2, 50680, 'PAY_EXP_202611.csv', '給与連携が正常に終了しました。（件数: 2）', '200021', '2026-11-01 02:00:01'),",
    "(4, 'B05', '2026-11-26', '2026-11', '2026-11-26 01:00:00', '2026-11-26 01:00:01', 'OK', 2, 50680, NULL, '支払済み更新が正常に終了しました。（件数: 2）', '200021', '2026-11-26 01:00:01'),",
    "(5, 'B02', '2026-11-27', NULL, '2026-11-27 22:00:00', '2026-11-27 22:00:01', 'OK', 3, 122320, 'JRNL_EXP_20261127_220000.csv', '仕訳連携が正常に終了しました。（件数: 3）', '200021', '2026-11-27 22:00:01'),",
    "(6, 'B01', '2026-11-30', NULL, '2026-11-30 05:00:00', '2026-11-30 05:00:02', 'OK', 19, NULL, 'organization.csv,employee.csv,assignment.csv,commuter.csv', '人事マスタ取込が正常に終了しました。（件数: 19）', '200021', '2026-11-30 05:00:02');",

    // 8.4 経費申請
    'INSERT INTO t_expense_report (report_id, report_no, expense_type, applicant_id, applicant_org_code, title, remarks, status, total_amount, required_level, apply_count,',
    '  first_submitted_at, submitted_at, late_flag, late_reason, trip_destination, trip_start_date, trip_end_date, trip_type, trip_distance_km, allowance_position_code,',
    '  accounting_checked_at, accounting_checker_id, pay_month, closed_at, journal_run_id, payroll_run_id, paid_at, paid_method, created_at, updated_at) VALUES',
    // No.1 伊藤 出張（出発日時点は主任）
    "(1, 'EX2026-000001', 'BT', '100004', '1120', '西部市 出張（取引先への新製品説明）', NULL, '70', 50200, 2, 1,",
    "  '2026-10-05 09:12:00', '2026-10-05 09:12:00', 0, NULL, '西部市', '2026-09-29', '2026-10-02', 'STAY', NULL, '20',",
    "  '2026-10-20 14:05:00', '200011', '2026-11', '2026-11-01 01:00:00', 1, 3, '2026-11-26 01:00:00', 'P', '2026-10-05 09:05:00', '2026-11-26 01:00:00'),",
    // No.2 佐藤 交通費（定期区間の変更日）
    "(2, 'EX2026-000002', 'TR', '100011', '1110', '10月 客先訪問の交通費', NULL, '70', 480, 1, 1,",
    "  '2026-10-20 17:30:00', '2026-10-20 17:30:00', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL,",
    "  '2026-10-28 11:20:00', '200003', '2026-11', '2026-11-01 01:00:00', 1, 3, '2026-11-26 01:00:00', 'P', '2026-10-20 17:25:00', '2026-11-26 01:00:00'),",
    // No.3 佐藤 一般経費 4,999（領収書なし）
    "(3, 'EX2026-000003', 'GE', '100011', '1110', '事務用品の購入（トナー）', NULL, '20', 4999, 1, 1,",
    "  '2026-11-25 10:00:00', '2026-11-25 10:00:00', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL,",
    "  NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-11-25 09:50:00', '2026-11-25 10:00:00'),",
    // No.4 佐藤 一般経費 5,000（領収書・登録番号あり）
    "(4, 'EX2026-000004', 'GE', '100011', '1110', '事務用品の購入（コピー用紙）', NULL, '20', 5000, 1, 1,",
    "  '2026-11-25 10:10:00', '2026-11-25 10:10:00', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL,",
    "  NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-11-25 10:05:00', '2026-11-25 10:10:00'),",
    // No.5 佐藤 一般経費 49,999
    "(5, 'EX2026-000005', 'GE', '100011', '1110', '業務用モニターの購入', NULL, '20', 49999, 1, 1,",
    "  '2026-11-26 09:30:00', '2026-11-26 09:30:00', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL,",
    "  NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-11-26 09:20:00', '2026-11-26 09:30:00'),",
    // No.6 佐藤 一般経費 50,000（研修費）
    "(6, 'EX2026-000006', 'GE', '100011', '1110', '外部研修（提案力強化講座）の受講料', NULL, '20', 50000, 2, 1,",
    "  '2026-11-26 09:45:00', '2026-11-26 09:45:00', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL,",
    "  NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-11-26 09:40:00', '2026-11-27 09:10:00'),",
    // No.7 佐藤 会議費 30,000 3人
    "(7, 'EX2026-000007', 'GE', '100011', '1110', '取引先との打合せ（昼食）', NULL, '40', 30000, 1, 1,",
    "  '2026-11-19 16:00:00', '2026-11-19 16:00:00', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL,",
    "  NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-11-19 15:50:00', '2026-11-20 10:00:00'),",
    // No.8 佐藤 会議費 30,001 3人（下書き）
    "(8, 'EX2026-000008', 'GE', '100011', '1110', '取引先との打合せ（夕食）', NULL, '10', 30001, NULL, 0,",
    "  NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL,",
    "  NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-11-27 18:00:00', '2026-11-27 18:00:00'),",
    // No.9 渡辺 接待交際費 8,000
    "(9, 'EX2026-000009', 'GE', '100013', '1110', '取引先との会食', NULL, '20', 8000, 2, 1,",
    "  '2026-11-24 09:00:00', '2026-11-24 09:00:00', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL,",
    "  NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-11-24 08:55:00', '2026-11-25 09:00:00'),",
    // No.10 渡辺 交通費（遅延申請）
    "(10, 'EX2026-000010', 'TR', '100013', '1110', '9月 展示会会場への移動（バス）', NULL, '20', 2000, 2, 1,",
    "  '2026-11-02 10:00:00', '2026-11-02 10:00:00', 1, '展示会の後に出張が続き、申請を失念していました。', NULL, NULL, NULL, NULL, NULL, NULL,",
    "  NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-11-02 09:50:00', '2026-11-04 09:00:00'),",
    // No.11 田中 交通費（片側が定期区間外）
    "(11, 'EX2026-000011', 'TR', '100012', '1110', '客先訪問（川端町）', NULL, '40', 360, 1, 1,",
    "  '2026-11-16 17:00:00', '2026-11-16 17:00:00', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL,",
    "  NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-11-16 16:55:00', '2026-11-17 09:15:00'),",
    // No.12 田中 日帰り出張 100km（11-30 経理確認、仕訳未連携）
    "(12, 'EX2026-000012', 'BT', '100012', '1110', '東部市 日帰り出張（設備見学）', NULL, '50', 5800, 1, 1,",
    "  '2026-11-24 09:20:00', '2026-11-24 09:20:00', 0, NULL, '東部市', '2026-11-20', '2026-11-20', 'DAY', 100, '10',",
    "  '2026-11-30 09:40:00', '200011', NULL, NULL, NULL, NULL, NULL, NULL, '2026-11-24 09:10:00', '2026-11-30 09:40:00'),",
    // No.13 鈴木 交通費（本人が段1 の組織長）
    "(13, 'EX2026-000013', 'TR', '100003', '1110', '客先訪問（みどり北）', NULL, '20', 1280, 1, 1,",
    "  '2026-11-27 09:00:00', '2026-11-27 09:00:00', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL,",
    "  NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-11-27 08:50:00', '2026-11-27 09:00:00'),",
    // No.14 鈴木 出張 2泊3日 甲地（11-30 経理確認、仕訳未連携）
    "(14, 'EX2026-000014', 'BT', '100003', '1110', '北部市 出張（支店との営業会議）', NULL, '50', 53040, 2, 1,",
    "  '2026-11-16 09:00:00', '2026-11-16 09:00:00', 0, NULL, '北部市', '2026-11-09', '2026-11-11', 'STAY', NULL, '30',",
    "  '2026-11-30 10:15:00', '200011', NULL, NULL, NULL, NULL, NULL, NULL, '2026-11-16 08:50:00', '2026-11-30 10:15:00'),",
    // No.15 斎藤 タクシー（課長不在）
    "(15, 'EX2026-000015', 'TR', '100015', '1210', '客先訪問（資料の運搬）', NULL, '20', 5000, 1, 1,",
    "  '2026-11-26 13:00:00', '2026-11-26 13:00:00', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL,",
    "  NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-11-26 12:55:00', '2026-11-26 13:00:00'),",
    // No.16 小林 交通費（差戻し後に再申請、遅延にしない。仕訳連携済み）
    "(16, 'EX2026-000016', 'TR', '100014', '1120', '9月 客先訪問（汐見ヶ浜）', NULL, '50', 320, 1, 2,",
    "  '2026-10-30 17:00:00', '2026-11-04 09:30:00', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL,",
    "  '2026-11-10 15:00:00', '200003', NULL, NULL, 5, NULL, NULL, NULL, '2026-10-30 16:50:00', '2026-11-27 22:00:00'),",
    // No.17 小林 タクシー（経理差戻し）
    "(17, 'EX2026-000017', 'TR', '100014', '1120', '客先訪問（タクシー）', NULL, '30', 3200, 1, 1,",
    "  '2026-11-20 18:00:00', '2026-11-20 18:00:00', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL,",
    "  NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-11-20 17:55:00', '2026-11-27 14:00:00'),",
    // No.18 山本 出張 2泊3日 甲地（段4）
    "(18, 'EX2026-000018', 'BT', '100001', '1000', '南部市 出張（地域代理店会議）', NULL, '20', 80000, 2, 1,",
    "  '2026-11-27 10:00:00', '2026-11-27 10:00:00', 0, NULL, '南部市', '2026-11-16', '2026-11-18', 'STAY', NULL, '50',",
    "  NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-11-27 09:50:00', '2026-11-27 10:00:00'),",
    // No.19 高橋 研修費 120,000（部長本人。仕訳連携済み）
    "(19, 'EX2026-000019', 'GE', '100002', '1100', '管理職研修（評価者研修）の受講料', NULL, '50', 120000, 2, 1,",
    "  '2026-11-16 09:00:00', '2026-11-16 09:00:00', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL,",
    "  '2026-11-24 13:30:00', '200003', NULL, NULL, 5, NULL, NULL, NULL, '2026-11-16 08:55:00', '2026-11-27 22:00:00'),",
    // No.20 清水 交通費（2026-11-15 退職。仕訳連携済み）
    "(20, 'EX2026-000020', 'TR', '100016', '1210', '客先訪問（バス）', NULL, '50', 2000, 1, 1,",
    "  '2026-11-09 10:00:00', '2026-11-09 10:00:00', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL,",
    "  '2026-11-12 11:00:00', '200011', NULL, NULL, 5, NULL, NULL, NULL, '2026-11-09 09:55:00', '2026-11-27 22:00:00'),",
    // No.21 森 消耗品費 300,000（段数3、否認）
    "(21, 'EX2026-000021', 'GE', '200011', '2110', '経理課 書庫の購入', NULL, '90', 300000, 3, 1,",
    "  '2026-11-17 10:00:00', '2026-11-17 10:00:00', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL,",
    "  NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-11-17 09:55:00', '2026-11-19 10:00:00'),",
    // No.22 田中 交通費（取下げ）
    "(22, 'EX2026-000022', 'TR', '100012', '1110', '客先訪問（東港）', NULL, '80', 230, 1, 1,",
    "  '2026-11-05 09:00:00', '2026-11-05 09:00:00', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL,",
    "  NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-11-05 08:55:00', '2026-11-06 10:00:00'),",
    // No.23 池田 会議費 3,240 税率8%（11-30 経理確認、仕訳未連携）
    "(23, 'EX2026-000023', 'GE', '200012', '2110', '経理課 打合せの茶菓', NULL, '50', 3240, 1, 1,",
    "  '2026-11-26 15:00:00', '2026-11-26 15:00:00', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL,",
    "  '2026-11-30 11:00:00', '200011', NULL, NULL, NULL, NULL, NULL, NULL, '2026-11-26 14:55:00', '2026-11-30 11:00:00'),",
    // No.24 渡辺 消耗品費 6,600（登録番号なし）
    "(24, 'EX2026-000024', 'GE', '100013', '1110', '事務用品の購入（ファイル）', NULL, '40', 6600, 1, 1,",
    "  '2026-11-26 11:00:00', '2026-11-26 11:00:00', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL,",
    "  NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-11-26 10:55:00', '2026-11-27 09:30:00'),",
    // No.25 佐藤 交通費（旧定期区間の全区間内、期限超過。下書き）
    "(25, 'EX2026-000025', 'TR', '100011', '1110', '9月 客先訪問（中央）', NULL, '10', 0, NULL, 0,",
    "  NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL,",
    "  NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-11-28 17:00:00', '2026-11-28 17:00:00'),",
    // No.26 伊藤 日帰り出張 250km（公共交通の必須額ちょうど・IC利用履歴）
    "(26, 'EX2026-000026', 'BT', '100004', '1120', '東部市 日帰り出張（展示会の視察）', NULL, '20', 31500, 1, 1,",
    "  '2026-11-26 10:30:00', '2026-11-26 10:30:00', 0, NULL, '東部市', '2026-11-12', '2026-11-12', 'DAY', 250, '30',",
    "  NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-11-26 10:20:00', '2026-11-26 10:30:00');",

    // 経費明細
    'INSERT INTO t_expense_item (report_id, item_no, item_kind, use_date, description, line_code, from_station_code, to_station_code, route_text, trip_way,',
    '  fare_amount, deduction_amount, unit_amount, days, region_code, actual_amount, limit_amount, account_code, payee_name, tax_rate, tax_amount, invoice_no,',
    '  meal_flag, attendee_count, attendee_names, pay_method, receipt_kind, receipt_file_name, receipt_required, tax_category, amount, updated_at) VALUES',
    // No.1
    "(1, 1, 'PUBT', '2026-09-29', '西部市 取引先訪問（往路）', NULL, NULL, NULL, '中央→西部市（新幹線）', 1, NULL, NULL, 6400, NULL, NULL, NULL, NULL, '6110', NULL, 10, 581, NULL, 0, NULL, NULL, 'CASH', 'NONE', NULL, 'O', 'S10', 6400, '2026-10-05 09:05:00'),",
    "(1, 2, 'HOTEL', '2026-09-29', '西部市ステーションホテル', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'B', 9800, 9800, '6110', NULL, 10, 890, 'T0000000000201', 0, NULL, NULL, 'CARD', 'RCPT', 'hotel_20260929.pdf', 'R', 'S10', 9800, '2026-10-05 09:05:00'),",
    "(1, 3, 'HOTEL', '2026-09-30', '西部市ステーションホテル', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'B', 9800, 9800, '6110', NULL, 10, 890, 'T0000000000201', 0, NULL, NULL, 'CARD', 'RCPT', 'hotel_20260930.pdf', 'R', 'S10', 9800, '2026-10-05 09:05:00'),",
    "(1, 4, 'HOTEL', '2026-10-01', '西部市ステーションホテル', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'B', 9800, 9800, '6110', NULL, 10, 890, 'T0000000000201', 0, NULL, NULL, 'CARD', 'RCPT', 'hotel_20261001.pdf', 'R', 'S10', 9800, '2026-10-05 09:05:00'),",
    "(1, 5, 'PUBT', '2026-10-02', '西部市 取引先訪問（復路）', NULL, NULL, NULL, '西部市→中央（新幹線）', 1, NULL, NULL, 6400, NULL, NULL, NULL, NULL, '6110', NULL, 10, 581, NULL, 0, NULL, NULL, 'CASH', 'NONE', NULL, 'O', 'S10', 6400, '2026-10-05 09:05:00'),",
    "(1, 6, 'ALLOW', '2026-09-29', '日当', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2000, 4, NULL, NULL, NULL, '6110', NULL, 10, 727, NULL, 0, NULL, NULL, NULL, 'NONE', NULL, 'X', 'S10', 8000, '2026-10-05 09:05:00'),",
    // No.2
    "(2, 1, 'RAIL', '2026-10-01', '客先訪問（中央）', 'MD', 'MD02', 'MD05', NULL, 1, 200, 40, NULL, NULL, NULL, NULL, NULL, '6110', NULL, 10, 14, NULL, 0, NULL, NULL, 'IC', 'NONE', NULL, 'O', 'S10', 160, '2026-10-20 17:25:00'),",
    "(2, 2, 'RAIL', '2026-10-15', '客先訪問（港町）', 'MD', 'MD04', 'MD06', NULL, 2, 200, 40, NULL, NULL, NULL, NULL, NULL, '6110', NULL, 10, 29, NULL, 0, NULL, NULL, 'IC', 'NONE', NULL, 'O', 'S10', 320, '2026-10-20 17:25:00'),",
    // No.3
    "(3, 1, 'GEN', '2026-11-20', 'プリンタートナー', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '6140', '文具のひかり堂', 10, 454, NULL, 0, NULL, NULL, 'CASH', 'NONE', NULL, 'O', 'Z10', 4999, '2026-11-25 09:50:00'),",
    // No.4
    "(4, 1, 'GEN', '2026-11-21', 'コピー用紙（A4 10箱）', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '6140', '文具のひかり堂', 10, 454, 'T0000000000101', 0, NULL, NULL, 'CASH', 'RCPT', 'receipt_20261121.pdf', 'R', 'T10', 5000, '2026-11-25 10:05:00'),",
    // No.5
    "(5, 1, 'GEN', '2026-11-24', 'モニター（24型）', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '6140', 'オフィス家電みどり', 10, 4545, 'T0000000000102', 0, NULL, NULL, 'CARD', 'RCPT', 'receipt_20261124.pdf', 'R', 'T10', 49999, '2026-11-26 09:20:00'),",
    // No.6
    "(6, 1, 'GEN', '2026-11-25', '提案力強化講座 受講料', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '6170', '未来ビジネス研修センター', 10, 4545, 'T0000000000103', 0, NULL, NULL, 'CARD', 'RCPT', 'invoice_20261125.pdf', 'R', 'T10', 50000, '2026-11-26 09:40:00'),",
    // No.7
    "(7, 1, 'GEN', '2026-11-18', '新製品の打合せ（昼食）', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '6120', 'レストラン中央', 10, 2727, 'T0000000000104', 1, 3, '佐藤（当社）、港町商会 青木様、港町商会 野口様', 'CARD', 'RCPT', 'receipt_20261118.pdf', 'R', 'T10', 30000, '2026-11-19 15:50:00'),",
    // No.8
    "(8, 1, 'GEN', '2026-11-26', '新製品の打合せ（夕食）', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '6120', 'レストラン中央', 10, 2727, 'T0000000000104', 1, 3, '佐藤（当社）、港町商会 青木様、港町商会 野口様', 'CARD', 'RCPT', 'receipt_20261126.pdf', 'R', 'T10', 30001, '2026-11-27 18:00:00'),",
    // No.9
    "(9, 1, 'GEN', '2026-11-20', '取引先との会食', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '6130', '割烹さくら', 10, 727, 'T0000000000105', 0, 2, '渡辺（当社）、東港物産 西川様', 'CARD', 'RCPT', 'receipt_20261120.pdf', 'R', 'T10', 8000, '2026-11-24 08:55:00'),",
    // No.10
    "(10, 1, 'PUBT', '2026-09-30', '展示会会場への移動', NULL, NULL, NULL, '中央→臨海展示場（バス）', 2, NULL, NULL, 1000, NULL, NULL, NULL, NULL, '6110', NULL, 10, 181, NULL, 0, NULL, NULL, 'IC', 'NONE', NULL, 'O', 'S10', 2000, '2026-11-02 09:50:00'),",
    // No.11
    "(11, 1, 'RAIL', '2026-11-13', '客先訪問（川端町）', 'SK', 'SK02', 'SK04', NULL, 2, 230, 50, NULL, NULL, NULL, NULL, NULL, '6110', NULL, 10, 32, NULL, 0, NULL, NULL, 'IC', 'NONE', NULL, 'O', 'S10', 360, '2026-11-16 16:55:00'),",
    // No.12
    "(12, 1, 'PUBT', '2026-11-20', '中央→東部市（特急）往復', NULL, NULL, NULL, '中央→東部市（特急）', 2, NULL, NULL, 2400, NULL, NULL, NULL, NULL, '6110', NULL, 10, 436, NULL, 0, NULL, NULL, 'CASH', 'NONE', NULL, 'O', 'S10', 4800, '2026-11-24 09:10:00'),",
    "(12, 2, 'ALLOW', '2026-11-20', '日当', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1000, 1, NULL, NULL, NULL, '6110', NULL, 10, 90, NULL, 0, NULL, NULL, NULL, 'NONE', NULL, 'X', 'S10', 1000, '2026-11-24 09:10:00'),",
    // No.13
    "(13, 1, 'RAIL', '2026-11-25', '客先訪問（みどり北）', 'MD', 'MD05', 'MD01', NULL, 2, 240, 0, NULL, NULL, NULL, NULL, NULL, '6110', NULL, 10, 43, NULL, 0, NULL, NULL, 'IC', 'NONE', NULL, 'O', 'S10', 480, '2026-11-27 08:50:00'),",
    "(13, 2, 'TAXI', '2026-11-25', '客先から中央駅への移動', NULL, NULL, NULL, 'みどり北→中央駅', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '6110', NULL, 10, 72, 'T0000000000106', 0, NULL, NULL, 'CASH', 'RCPT', 'taxi_20261125.jpg', 'R', 'T10', 800, '2026-11-27 08:50:00'),",
    // No.14（05 の 4.3 の出力例）
    "(14, 1, 'PUBT', '2026-11-09', '中央→北部市（特急）', NULL, NULL, NULL, '中央→北部市（特急）', 1, NULL, NULL, 9870, NULL, NULL, NULL, NULL, '6110', NULL, 10, 897, NULL, 0, NULL, NULL, 'CASH', 'NONE', NULL, 'O', 'S10', 9870, '2026-11-16 08:50:00'),",
    "(14, 2, 'HOTEL', '2026-11-09', '北部市駅前ホテル', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'A', 14500, 13000, '6110', NULL, 10, 1181, NULL, 0, NULL, NULL, 'CARD', 'RCPT', 'hotel_20261109.pdf', 'R', 'S10', 13000, '2026-11-16 08:50:00'),",
    "(14, 3, 'HOTEL', '2026-11-10', '北部市駅前ホテル', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'A', 12800, 13000, '6110', NULL, 10, 1163, NULL, 0, NULL, NULL, 'CARD', 'RCPT', 'hotel_20261110.pdf', 'R', 'S10', 12800, '2026-11-16 08:50:00'),",
    "(14, 4, 'PUBT', '2026-11-11', '北部市→中央（特急）', NULL, NULL, NULL, '北部市→中央（特急）', 1, NULL, NULL, 9870, NULL, NULL, NULL, NULL, '6110', NULL, 10, 897, NULL, 0, NULL, NULL, 'CASH', 'NONE', NULL, 'O', 'S10', 9870, '2026-11-16 08:50:00'),",
    "(14, 5, 'ALLOW', '2026-11-09', '日当', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2500, 3, NULL, NULL, NULL, '6110', NULL, 10, 681, NULL, 0, NULL, NULL, NULL, 'NONE', NULL, 'X', 'S10', 7500, '2026-11-16 08:50:00'),",
    // No.15
    "(15, 1, 'TAXI', '2026-11-24', '客先訪問（大型資料の運搬）', NULL, NULL, NULL, '中央駅→西の森（取引先）', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '6110', NULL, 10, 454, 'T0000000000108', 0, NULL, NULL, 'CASH', 'RCPT', 'taxi_20261124.pdf', 'R', 'T10', 5000, '2026-11-26 12:55:00'),",
    // No.16
    "(16, 1, 'RAIL', '2026-09-25', '客先訪問（汐見ヶ浜）', 'MD', 'MD07', 'MD08', NULL, 2, 160, 0, NULL, NULL, NULL, NULL, NULL, '6110', NULL, 10, 29, NULL, 0, NULL, NULL, 'IC', 'NONE', NULL, 'O', 'S10', 320, '2026-11-04 09:25:00'),",
    // No.17
    "(17, 1, 'TAXI', '2026-11-19', '客先訪問後の帰社（終電後）', NULL, NULL, NULL, '港町→中央', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '6110', NULL, 10, 290, 'T0000000000109', 0, NULL, NULL, 'CASH', 'RCPT', 'taxi_20261119.jpg', 'R', 'T10', 3200, '2026-11-20 17:55:00'),",
    // No.18
    "(18, 1, 'AIR', '2026-11-16', '南部市 地域代理店会議（往路）', NULL, NULL, NULL, '中央空港→南部空港', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '6110', NULL, 10, 1545, 'T0000000000110', 0, NULL, NULL, 'CARD', 'RCPT', 'air_20261116.pdf', 'R', 'S10', 17000, '2026-11-27 09:50:00'),",
    "(18, 2, 'HOTEL', '2026-11-16', '南部市グランドホテル', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'A', 19000, 18000, '6110', NULL, 10, 1636, NULL, 0, NULL, NULL, 'CARD', 'RCPT', 'hotel_20261116.pdf', 'R', 'S10', 18000, '2026-11-27 09:50:00'),",
    "(18, 3, 'HOTEL', '2026-11-17', '南部市グランドホテル', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'A', 17500, 18000, '6110', NULL, 10, 1590, NULL, 0, NULL, NULL, 'CARD', 'RCPT', 'hotel_20261117.pdf', 'R', 'S10', 17500, '2026-11-27 09:50:00'),",
    "(18, 4, 'AIR', '2026-11-18', '南部市 地域代理店会議（復路）', NULL, NULL, NULL, '南部空港→中央空港', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '6110', NULL, 10, 1545, 'T0000000000110', 0, NULL, NULL, 'CARD', 'RCPT', 'air_20261118.pdf', 'R', 'S10', 17000, '2026-11-27 09:50:00'),",
    "(18, 5, 'ALLOW', '2026-11-16', '日当', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 3500, 3, NULL, NULL, NULL, '6110', NULL, 10, 954, NULL, 0, NULL, NULL, NULL, 'NONE', NULL, 'X', 'S10', 10500, '2026-11-27 09:50:00'),",
    // No.19
    "(19, 1, 'GEN', '2026-11-13', '管理職研修（評価者研修）受講料', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '6170', '未来ビジネス研修センター', 10, 10909, 'T0000000000103', 0, NULL, NULL, 'CARD', 'RCPT', 'invoice_20261113.pdf', 'R', 'T10', 120000, '2026-11-16 08:55:00'),",
    // No.20
    "(20, 1, 'PUBT', '2026-11-05', '客先訪問', NULL, NULL, NULL, '中央→西の森（バス）', 2, NULL, NULL, 1000, NULL, NULL, NULL, NULL, '6110', NULL, 10, 181, NULL, 0, NULL, NULL, 'IC', 'NONE', NULL, 'O', 'S10', 2000, '2026-11-09 09:55:00'),",
    // No.21
    "(21, 1, 'GEN', '2026-11-16', '書庫（スチール製 2台）', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '6140', 'オフィス家具の森田', 10, 27272, 'T0000000000111', 0, NULL, NULL, 'CARD', 'RCPT', 'receipt_20261116.pdf', 'R', 'T10', 300000, '2026-11-17 09:55:00'),",
    // No.22
    "(22, 1, 'RAIL', '2026-11-04', '客先訪問（東港）', 'SK', 'SK03', 'SK05', NULL, 1, 230, 0, NULL, NULL, NULL, NULL, NULL, '6110', NULL, 10, 20, NULL, 0, NULL, NULL, 'IC', 'NONE', NULL, 'O', 'S10', 230, '2026-11-05 08:55:00'),",
    // No.23
    "(23, 1, 'GEN', '2026-11-26', '経理課 打合せの茶菓', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '6120', '喫茶みなと', 8, 240, 'T0000000000112', 1, 2, '池田、森', 'CASH', 'RCPT', 'receipt_20261126.jpg', 'O', 'T08', 3240, '2026-11-26 14:55:00'),",
    // No.24
    "(24, 1, 'GEN', '2026-11-25', 'ファイル・バインダー', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '6140', '文具のひかり堂', 10, 600, NULL, 0, NULL, NULL, 'CASH', 'RCPT', 'receipt_20261125.jpg', 'R', 'N10', 6600, '2026-11-26 10:55:00'),",
    // No.25
    "(25, 1, 'RAIL', '2026-09-30', '客先訪問（中央）', 'MD', 'MD02', 'MD05', NULL, 2, 200, NULL, NULL, NULL, NULL, NULL, NULL, '6110', NULL, 10, 0, NULL, 0, NULL, NULL, 'IC', 'NONE', NULL, 'O', 'S10', 0, '2026-11-28 17:00:00'),",
    // No.26
    "(26, 1, 'PUBT', '2026-11-12', '展示会の視察（往復）', NULL, NULL, NULL, '中央→東部市（新幹線）', 2, NULL, NULL, 15000, NULL, NULL, NULL, NULL, '6110', NULL, 10, 2727, NULL, 0, NULL, NULL, 'IC', 'ICLOG', 'ic_history_20261112.pdf', 'R', 'S10', 30000, '2026-11-26 10:20:00'),",
    "(26, 2, 'ALLOW', '2026-11-12', '日当', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1500, 1, NULL, NULL, NULL, '6110', NULL, 10, 136, NULL, 0, NULL, NULL, NULL, 'NONE', NULL, 'X', 'S10', 1500, '2026-11-26 10:20:00');",

    // 承認経路
    'INSERT INTO t_approval_step (report_id, apply_count, step_no, step_kind, approval_level, approver_id, step_status, acted_by, acted_at, action_comment, changed_note, updated_at) VALUES',
    "(1, 1, 1, 'APPROVE', 2, '100002', 'OK', '100002', '2026-10-06 10:00:00', NULL, NULL, '2026-10-06 10:00:00'),",
    "(1, 1, 2, 'ACCOUNT', NULL, NULL, 'OK', '200011', '2026-10-20 14:05:00', NULL, NULL, '2026-10-20 14:05:00'),",
    "(2, 1, 1, 'APPROVE', 1, '100003', 'OK', '100003', '2026-10-21 09:30:00', NULL, NULL, '2026-10-21 09:30:00'),",
    "(2, 1, 2, 'ACCOUNT', NULL, NULL, 'OK', '200003', '2026-10-28 11:20:00', NULL, NULL, '2026-10-28 11:20:00'),",
    "(3, 1, 1, 'APPROVE', 1, '100003', 'CUR', NULL, NULL, NULL, NULL, '2026-11-25 10:00:00'),",
    "(3, 1, 2, 'ACCOUNT', NULL, NULL, 'WAIT', NULL, NULL, NULL, NULL, '2026-11-25 10:00:00'),",
    "(4, 1, 1, 'APPROVE', 1, '100003', 'CUR', NULL, NULL, NULL, NULL, '2026-11-25 10:10:00'),",
    "(4, 1, 2, 'ACCOUNT', NULL, NULL, 'WAIT', NULL, NULL, NULL, NULL, '2026-11-25 10:10:00'),",
    "(5, 1, 1, 'APPROVE', 1, '100003', 'CUR', NULL, NULL, NULL, NULL, '2026-11-26 09:30:00'),",
    "(5, 1, 2, 'ACCOUNT', NULL, NULL, 'WAIT', NULL, NULL, NULL, NULL, '2026-11-26 09:30:00'),",
    "(6, 1, 1, 'APPROVE', 1, '100003', 'OK', '100003', '2026-11-27 09:10:00', NULL, NULL, '2026-11-27 09:10:00'),",
    "(6, 1, 2, 'APPROVE', 2, '100002', 'CUR', NULL, NULL, NULL, NULL, '2026-11-27 09:10:00'),",
    "(6, 1, 3, 'ACCOUNT', NULL, NULL, 'WAIT', NULL, NULL, NULL, NULL, '2026-11-26 09:45:00'),",
    "(7, 1, 1, 'APPROVE', 1, '100003', 'OK', '100003', '2026-11-20 10:00:00', NULL, NULL, '2026-11-20 10:00:00'),",
    "(7, 1, 2, 'ACCOUNT', NULL, NULL, 'CUR', NULL, NULL, NULL, NULL, '2026-11-20 10:00:00'),",
    "(9, 1, 1, 'APPROVE', 1, '100003', 'OK', '100003', '2026-11-25 09:00:00', NULL, NULL, '2026-11-25 09:00:00'),",
    "(9, 1, 2, 'APPROVE', 2, '100002', 'CUR', NULL, NULL, NULL, NULL, '2026-11-25 09:00:00'),",
    "(9, 1, 3, 'ACCOUNT', NULL, NULL, 'WAIT', NULL, NULL, NULL, NULL, '2026-11-24 09:00:00'),",
    "(10, 1, 1, 'APPROVE', 1, '100003', 'OK', '100003', '2026-11-04 09:00:00', NULL, NULL, '2026-11-04 09:00:00'),",
    "(10, 1, 2, 'APPROVE', 2, '100002', 'CUR', NULL, NULL, NULL, NULL, '2026-11-04 09:00:00'),",
    "(10, 1, 3, 'ACCOUNT', NULL, NULL, 'WAIT', NULL, NULL, NULL, NULL, '2026-11-02 10:00:00'),",
    "(11, 1, 1, 'APPROVE', 1, '100003', 'OK', '100003', '2026-11-17 09:15:00', NULL, NULL, '2026-11-17 09:15:00'),",
    "(11, 1, 2, 'ACCOUNT', NULL, NULL, 'CUR', NULL, NULL, NULL, NULL, '2026-11-17 09:15:00'),",
    "(12, 1, 1, 'APPROVE', 1, '100003', 'OK', '100003', '2026-11-25 09:20:00', NULL, NULL, '2026-11-25 09:20:00'),",
    "(12, 1, 2, 'ACCOUNT', NULL, NULL, 'OK', '200011', '2026-11-30 09:40:00', NULL, NULL, '2026-11-30 09:40:00'),",
    "(13, 1, 1, 'APPROVE', 2, '100002', 'CUR', NULL, NULL, NULL, NULL, '2026-11-27 09:00:00'),",
    "(13, 1, 2, 'ACCOUNT', NULL, NULL, 'WAIT', NULL, NULL, NULL, NULL, '2026-11-27 09:00:00'),",
    "(14, 1, 1, 'APPROVE', 2, '100002', 'OK', '100002', '2026-11-18 09:00:00', NULL, NULL, '2026-11-18 09:00:00'),",
    "(14, 1, 2, 'ACCOUNT', NULL, NULL, 'OK', '200011', '2026-11-30 10:15:00', NULL, NULL, '2026-11-30 10:15:00'),",
    "(15, 1, 1, 'APPROVE', 2, '100005', 'CUR', NULL, NULL, NULL, NULL, '2026-11-26 13:00:00'),",
    "(15, 1, 2, 'ACCOUNT', NULL, NULL, 'WAIT', NULL, NULL, NULL, NULL, '2026-11-26 13:00:00'),",
    "(16, 1, 1, 'APPROVE', 1, '100004', 'BACK', '100004', '2026-10-31 10:00:00', '降車駅が訪問先と合っていません。確認して再申請してください。', NULL, '2026-10-31 10:00:00'),",
    "(16, 1, 2, 'ACCOUNT', NULL, NULL, 'CANCEL', NULL, NULL, NULL, NULL, '2026-10-31 10:00:00'),",
    "(16, 2, 1, 'APPROVE', 1, '100004', 'OK', '100004', '2026-11-05 09:00:00', NULL, NULL, '2026-11-05 09:00:00'),",
    "(16, 2, 2, 'ACCOUNT', NULL, NULL, 'OK', '200003', '2026-11-10 15:00:00', NULL, NULL, '2026-11-10 15:00:00'),",
    "(17, 1, 1, 'APPROVE', 1, '100004', 'OK', '100004', '2026-11-21 09:00:00', NULL, NULL, '2026-11-21 09:00:00'),",
    "(17, 1, 2, 'ACCOUNT', NULL, NULL, 'BACK', '200011', '2026-11-27 14:00:00', '領収書の画像が不鮮明です。読み取れる画像を添付し直してください。', NULL, '2026-11-27 14:00:00'),",
    "(18, 1, 1, 'APPROVE', 4, '200001', 'CUR', NULL, NULL, NULL, NULL, '2026-11-27 10:00:00'),",
    "(18, 1, 2, 'ACCOUNT', NULL, NULL, 'WAIT', NULL, NULL, NULL, NULL, '2026-11-27 10:00:00'),",
    "(19, 1, 1, 'APPROVE', 3, '100001', 'OK', '100001', '2026-11-17 10:00:00', NULL, NULL, '2026-11-17 10:00:00'),",
    "(19, 1, 2, 'ACCOUNT', NULL, NULL, 'OK', '200003', '2026-11-24 13:30:00', NULL, NULL, '2026-11-24 13:30:00'),",
    "(20, 1, 1, 'APPROVE', 2, '100005', 'OK', '100005', '2026-11-10 09:00:00', NULL, NULL, '2026-11-10 09:00:00'),",
    "(20, 1, 2, 'ACCOUNT', NULL, NULL, 'OK', '200011', '2026-11-12 11:00:00', NULL, NULL, '2026-11-12 11:00:00'),",
    "(21, 1, 1, 'APPROVE', 1, '200003', 'OK', '200003', '2026-11-18 09:00:00', NULL, NULL, '2026-11-18 09:00:00'),",
    "(21, 1, 2, 'APPROVE', 2, '200002', 'NG', '200002', '2026-11-19 10:00:00', '書庫は総務課の備品購入手続で申請してください。', NULL, '2026-11-19 10:00:00'),",
    "(21, 1, 3, 'APPROVE', 3, '200001', 'CANCEL', NULL, NULL, NULL, NULL, '2026-11-19 10:00:00'),",
    "(21, 1, 4, 'ACCOUNT', NULL, NULL, 'CANCEL', NULL, NULL, NULL, NULL, '2026-11-19 10:00:00'),",
    "(22, 1, 1, 'APPROVE', 1, '100003', 'CANCEL', NULL, NULL, NULL, NULL, '2026-11-06 10:00:00'),",
    "(22, 1, 2, 'ACCOUNT', NULL, NULL, 'CANCEL', NULL, NULL, NULL, NULL, '2026-11-06 10:00:00'),",
    "(23, 1, 1, 'APPROVE', 1, '200003', 'OK', '200003', '2026-11-27 09:00:00', NULL, NULL, '2026-11-27 09:00:00'),",
    "(23, 1, 2, 'ACCOUNT', NULL, NULL, 'OK', '200011', '2026-11-30 11:00:00', NULL, NULL, '2026-11-30 11:00:00'),",
    "(24, 1, 1, 'APPROVE', 1, '100003', 'OK', '100003', '2026-11-27 09:30:00', NULL, NULL, '2026-11-27 09:30:00'),",
    "(24, 1, 2, 'ACCOUNT', NULL, NULL, 'CUR', NULL, NULL, NULL, NULL, '2026-11-27 09:30:00'),",
    "(26, 1, 1, 'APPROVE', 2, '100002', 'CUR', NULL, NULL, NULL, NULL, '2026-11-26 10:30:00'),",
    "(26, 1, 2, 'ACCOUNT', NULL, NULL, 'WAIT', NULL, NULL, NULL, NULL, '2026-11-26 10:30:00');"
  ].join('\n');

  InfoExp.data.seedTransaction = {
    SQL: SQL
  };
})();
