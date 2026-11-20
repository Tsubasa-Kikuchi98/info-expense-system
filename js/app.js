/*
 * 起動処理（06 の 6.2）。最後に読み込む。
 */
(function () {
  'use strict';

  var c = InfoExp.ui.components;

  function start() {
    InfoExp.data.db.init().then(function (result) {
      var router = InfoExp.ui.router;
      if (result.isLoadFailed) {
        // E-903: SCR-09 のデータ初期化だけ操作できる
        router.session.isDbFailed = true;
        c.showMessages([{ msgId: 'E-903', params: [] }]);
        router.start();
        return;
      }
      InfoExp.ui.header.switchUser(InfoExp.service.userService.resolveCurrentUserId());
      router.start();
    }).catch(function (e) {
      document.getElementById('screen').innerHTML = '';
      c.showMessages([{ msgId: 'E-903', params: [] }]);
      if (window.console) {
        window.console.error(e);
      }
    });
  }

  start();
})();
