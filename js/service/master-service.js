/*
 * マスタの読み込み（logic に渡す配列、画面のプルダウン用のコード）。
 */
(function () {
  'use strict';

  var repos = InfoExp.data.repositories;

  /**
   * 申請の再計算・入力チェックに使うマスタ一式（report-validator.js の masters）。
   * @param {string} applicantId 申請者（通勤定期区間・所属役職履歴を絞る）
   */
  function loadReportMasters(applicantId) {
    return {
      settingRows: repos.settingRepository.findAll(),
      ruleRows: repos.approvalRuleRepository.findAll(),
      accountRows: repos.accountTitleRepository.findAll(),
      stationRows: repos.stationRepository.findAll(),
      fareRows: repos.fareRepository.findAll(),
      rateRows: repos.travelRateRepository.findAll(),
      orgRows: repos.organizationRepository.findAll(),
      employeeRows: repos.employeeRepository.findAll(),
      passRows: repos.commuterPassRepository.findByEmployee(applicantId),
      assignmentRows: repos.assignmentRepository.findByEmployee(applicantId),
      taxCategoryNames: codeNames('TAX_CATEGORY')
    };
  }

  /** コード種別の { コード: 名称 } */
  function codeNames(codeType) {
    var map = {};
    repos.codeRepository.findByType(codeType).forEach(function (row) {
      map[row.code] = row.codeName;
    });
    return map;
  }

  /** コード種別の行の配列（表示順） */
  function codeList(codeType) {
    return repos.codeRepository.findByType(codeType);
  }

  InfoExp.service.masterService = {
    loadReportMasters: loadReportMasters,
    codeNames: codeNames,
    codeList: codeList,
    stations: function () { return repos.stationRepository.findAll(); },
    accounts: function () { return repos.accountTitleRepository.findAll(); },
    organizations: function () { return repos.organizationRepository.findAll(); }
  };
})();
