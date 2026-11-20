/*
 * 名前空間 window.InfoExp を作る。最初に読み込むこと（06 の4章）。
 */
(function () {
  'use strict';

  var root = window.InfoExp || {};
  root.core = root.core || {};
  root.logic = root.logic || {};
  root.data = root.data || {};
  root.data.repositories = root.data.repositories || {};
  root.service = root.service || {};
  root.batch = root.batch || {};
  root.ui = root.ui || {};
  root.screens = root.screens || {};

  window.InfoExp = root;
})();
