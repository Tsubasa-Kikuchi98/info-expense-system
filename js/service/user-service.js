/*
 * 利用者（F-01 利用者切替）。認証は行わない（研修・検証用環境）。
 */
(function () {
  'use strict';

  var config = InfoExp.core.config;
  var repos = InfoExp.data.repositories;
  var EMP_STATUS_ACTIVE = '1';

  /** 在籍の社員（組織名・役職名つき、社員番号順） */
  function listActiveUsers() {
    return repos.employeeRepository.findAllWithNames().filter(function (e) {
      return e.status === EMP_STATUS_ACTIVE;
    });
  }

  /** 社員（組織名・役職名・ロールつき）。いなければ null */
  function getUser(employeeId) {
    var list = repos.employeeRepository.findAllWithNames().filter(function (e) {
      return e.employeeId === employeeId;
    });
    if (list.length === 0) {
      return null;
    }
    list[0].roles = repos.userRoleRepository.findRolesOf(employeeId);
    return list[0];
  }

  function readStored() {
    try {
      return window.localStorage.getItem(config.STORAGE_KEY_CURRENT_USER);
    } catch (e) {
      return null;
    }
  }

  /**
   * 利用者の初期値（02 の 4.1）: 前回選んだ利用者。保存がない、または在籍でない場合は社員番号が最小の在籍者。
   * @returns {string|null}
   */
  function resolveCurrentUserId() {
    var stored = readStored();
    var users = listActiveUsers();
    var i;
    for (i = 0; i < users.length; i += 1) {
      if (users[i].employeeId === stored) {
        return stored;
      }
    }
    return users.length > 0 ? users[0].employeeId : null;
  }

  /** 選んだ利用者を保存する */
  function storeCurrentUserId(employeeId) {
    try {
      window.localStorage.setItem(config.STORAGE_KEY_CURRENT_USER, employeeId);
    } catch (e) {
      // 保存できなくても操作は続ける
    }
  }

  InfoExp.service.userService = {
    listActiveUsers: listActiveUsers,
    getUser: getUser,
    resolveCurrentUserId: resolveCurrentUserId,
    storeCurrentUserId: storeCurrentUserId
  };
})();
