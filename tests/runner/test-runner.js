/*
 * 単体試験のテストランナー（06 の 9.3・9.4）。外部ライブラリは使わない。
 * ページの読み込み完了時（load イベント）にすべてのテストを同期的に実行し、結果を表示する。
 * URL に ?filter=文字列 を付けると、テストIDまたはテスト名にその文字列を含むテストだけを実行する。
 */
(function () {
  'use strict';

  var tests = [];
  var loadErrors = [];
  var currentDescribe = '';

  function toText(value) {
    if (value === undefined) {
      return 'undefined';
    }
    if (typeof value === 'function') {
      return 'function';
    }
    try {
      return JSON.stringify(value);
    } catch (e) {
      return String(value);
    }
  }

  function fail(expected, actual, note) {
    throw new Error((note ? note + ' ' : '') + '期待値: ' + expected + ' / 実際の値: ' + actual);
  }

  function isObject(value) {
    return value !== null && typeof value === 'object';
  }

  /** 配列・オブジェクトを中身で比較する（キーの順序は問わない） */
  function deepEqual(a, b) {
    var keysA;
    var keysB;
    var i;
    if (a === b) {
      return true;
    }
    if (typeof a === 'number' && typeof b === 'number' && isNaN(a) && isNaN(b)) {
      return true;
    }
    if (!isObject(a) || !isObject(b)) {
      return false;
    }
    if (Array.isArray(a) !== Array.isArray(b)) {
      return false;
    }
    if (Array.isArray(a)) {
      if (a.length !== b.length) {
        return false;
      }
      for (i = 0; i < a.length; i += 1) {
        if (!deepEqual(a[i], b[i])) {
          return false;
        }
      }
      return true;
    }
    keysA = Object.keys(a).filter(function (k) { return a[k] !== undefined; });
    keysB = Object.keys(b).filter(function (k) { return b[k] !== undefined; });
    if (keysA.length !== keysB.length) {
      return false;
    }
    for (i = 0; i < keysA.length; i += 1) {
      if (!Object.prototype.hasOwnProperty.call(b, keysA[i]) || !deepEqual(a[keysA[i]], b[keysA[i]])) {
        return false;
      }
    }
    return true;
  }

  function describeErrors(errors) {
    if (!Array.isArray(errors)) {
      return toText(errors);
    }
    return toText(errors.map(function (e) {
      return e && e.msgId + (e.itemNo !== null && e.itemNo !== undefined ? '(明細' + e.itemNo + ')' : '');
    }));
  }

  /**
   * 実際の値を受け取り、比較の関数を返す。
   * @param {*} actual
   */
  function expect(actual) {
    return {
      toBe: function (expected) {
        if (actual !== expected) {
          fail(toText(expected), toText(actual));
        }
      },
      toEqual: function (expected) {
        if (!deepEqual(actual, expected)) {
          fail(toText(expected), toText(actual));
        }
      },
      toBeNull: function () {
        if (actual !== null) {
          fail('null', toText(actual));
        }
      },
      toHaveError: function (msgId, itemNo) {
        var isFound = Array.isArray(actual) && actual.some(function (e) {
          return e && e.msgId === msgId && (itemNo === undefined || e.itemNo === itemNo);
        });
        if (!isFound) {
          fail(msgId + (itemNo !== undefined && itemNo !== null ? '(明細' + itemNo + ')' : '') + ' を含む', describeErrors(actual));
        }
      },
      toHaveNoError: function () {
        if (!Array.isArray(actual) || actual.length !== 0) {
          fail('エラーなし（空の配列）', describeErrors(actual));
        }
      },
      toThrowConfigError: function () {
        if (typeof actual !== 'function') {
          fail('関数', toText(actual), 'toThrowConfigError には関数を渡してください。');
        }
        try {
          actual();
        } catch (e) {
          if (e && (e.name === 'ConfigError' || (window.InfoExp && e instanceof InfoExp.core.ConfigError))) {
            return;
          }
          fail('ConfigError', (e && e.name) + ': ' + (e && e.message));
        }
        fail('ConfigError', '例外なし');
      }
    };
  }

  /**
   * テストのまとまり。名前は対象の関数名。
   * @param {string} name
   * @param {Function} fn
   */
  function describe(name, fn) {
    var previous = currentDescribe;
    currentDescribe = name;
    try {
      fn();
    } finally {
      currentDescribe = previous;
    }
  }

  /**
   * 1件のテストケース。fn が例外なく終われば合格。
   * @param {string} name 'UT-XXX-001 条件 → 期待'
   * @param {Function} fn
   */
  function it(name, fn) {
    tests.push({ group: currentDescribe, name: String(name), fn: fn });
  }

  /** 配列・オブジェクトの深い複製（JSON で複製） */
  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function splitName(name) {
    var index = name.indexOf(' ');
    if (index < 0) {
      return { id: name, title: '' };
    }
    return { id: name.substring(0, index), title: name.substring(index + 1) };
  }

  function getFilter() {
    var match = /[?&]filter=([^&]*)/.exec(window.location.search);
    if (!match) {
      return '';
    }
    try {
      return decodeURIComponent(match[1].replace(/\+/g, ' '));
    } catch (e) {
      return match[1];
    }
  }

  function cell(tag, text, className) {
    var el = document.createElement(tag);
    el.textContent = text;
    if (className) {
      el.className = className;
    }
    return el;
  }

  function run() {
    var filter = getFilter();
    var results = [];
    var lines = [];
    var passCount = 0;
    var failCount = 0;
    var i;
    var test;
    var parts;
    var result;
    var table;
    var row;
    var summary;
    var pre;
    var body = document.getElementById('result-body');

    for (i = 0; i < loadErrors.length; i += 1) {
      results.push({ id: 'LOAD-ERROR', title: loadErrors[i].file, group: '', isPass: false, message: loadErrors[i].message });
    }
    for (i = 0; i < tests.length; i += 1) {
      test = tests[i];
      if (filter && test.name.indexOf(filter) < 0 && test.group.indexOf(filter) < 0) {
        continue;
      }
      parts = splitName(test.name);
      result = { id: parts.id, title: parts.title, group: test.group, isPass: true, message: '' };
      try {
        test.fn();
      } catch (e) {
        result.isPass = false;
        result.message = (e && e.message) ? e.message : String(e);
      }
      results.push(result);
    }

    for (i = 0; i < results.length; i += 1) {
      if (results[i].isPass) {
        passCount += 1;
        lines.push('PASS ' + results[i].id + ' ' + results[i].title);
      } else {
        failCount += 1;
        lines.push('FAIL ' + results[i].id + ' ' + results[i].title + ' :: ' + results[i].message);
      }
    }
    lines.push('SUMMARY total=' + results.length + ' pass=' + passCount + ' fail=' + failCount);

    if (body) {
      summary = cell('p', (failCount === 0 ? '全件合格' : '不合格あり') + '　合計 ' + results.length + ' 件、合格 ' + passCount + ' 件、不合格 ' + failCount + ' 件' +
        (filter ? '（絞り込み: ' + filter + '）' : ''), failCount === 0 ? 'summary pass' : 'summary fail');
      body.appendChild(summary);
      table = document.createElement('table');
      row = document.createElement('tr');
      row.appendChild(cell('th', 'テストID'));
      row.appendChild(cell('th', '関数'));
      row.appendChild(cell('th', 'テスト名'));
      row.appendChild(cell('th', '合否'));
      row.appendChild(cell('th', '不一致の内容'));
      table.appendChild(row);
      for (i = 0; i < results.length; i += 1) {
        row = document.createElement('tr');
        row.className = results[i].isPass ? 'pass' : 'fail';
        row.appendChild(cell('td', results[i].id));
        row.appendChild(cell('td', results[i].group));
        row.appendChild(cell('td', results[i].title));
        row.appendChild(cell('td', results[i].isPass ? '合格' : '不合格'));
        row.appendChild(cell('td', results[i].message));
        table.appendChild(row);
      }
      body.appendChild(table);
    }
    pre = document.getElementById('result-text');
    if (pre) {
      pre.textContent = lines.join('\n');
    }
    document.title = (failCount === 0 ? 'PASS ' + passCount : 'FAIL ' + failCount) + '/' + results.length;
  }

  // テストファイルの読み込み時のエラー（構文エラーなど）も不合格として表示する
  window.addEventListener('error', function (event) {
    loadErrors.push({ file: event.filename ? event.filename.replace(/^.*\//, '') : '', message: event.message + '（' + event.lineno + '行目）' });
  });
  window.addEventListener('load', run);

  window.InfoExpTest = {
    describe: describe,
    it: it,
    expect: expect,
    clone: clone,
    fixtures: {}
  };
})();
