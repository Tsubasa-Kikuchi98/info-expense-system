/*
 * リポジトリ共通の補助。列名は各リポジトリに固定で書いた配列だけを使い、値は必ずバインド変数で渡す。
 */
(function () {
  'use strict';

  function toSnake(name) {
    return name.replace(/[A-Z]/g, function (ch) {
      return '_' + ch.toLowerCase();
    });
  }

  function valueOf(row, column) {
    var value = row[column];
    return value === undefined ? null : value;
  }

  /**
   * 1行を INSERT する。
   * @param {string} table テーブル名（リポジトリに固定で書いた値）
   * @param {Array<string>} columns 列名（camelCase。リポジトリに固定で書いた値）
   * @param {Object} row 値
   * @returns {number} 変更行数
   */
  function insert(table, columns, row) {
    var names = columns.map(toSnake);
    var marks = columns.map(function () { return '?'; });
    var values = columns.map(function (c) { return valueOf(row, c); });
    return InfoExp.data.db.run('INSERT INTO ' + table + ' (' + names.join(', ') + ') VALUES (' + marks.join(', ') + ')', values);
  }

  /**
   * 主キーで1行を UPDATE する。
   * @param {string} table テーブル名
   * @param {Array<string>} keyColumns 主キーの列名（camelCase）
   * @param {Array<string>} columns 更新する列名（camelCase。fields に含まれるものだけ更新）
   * @param {Object} keys 主キーの値
   * @param {Object} fields 更新する値
   * @returns {number} 変更行数
   */
  function update(table, keyColumns, columns, keys, fields) {
    var sets = [];
    var values = [];
    var i;
    for (i = 0; i < columns.length; i += 1) {
      if (Object.prototype.hasOwnProperty.call(fields, columns[i])) {
        sets.push(toSnake(columns[i]) + ' = ?');
        values.push(valueOf(fields, columns[i]));
      }
    }
    if (sets.length === 0) {
      return 0;
    }
    for (i = 0; i < keyColumns.length; i += 1) {
      values.push(valueOf(keys, keyColumns[i]));
    }
    return InfoExp.data.db.run('UPDATE ' + table + ' SET ' + sets.join(', ') + ' WHERE ' +
      keyColumns.map(function (c) { return toSnake(c) + ' = ?'; }).join(' AND '), values);
  }

  /**
   * 主キーで1行を DELETE する。
   */
  function remove(table, keyColumns, keys) {
    return InfoExp.data.db.run('DELETE FROM ' + table + ' WHERE ' +
      keyColumns.map(function (c) { return toSnake(c) + ' = ?'; }).join(' AND '),
      keyColumns.map(function (c) { return valueOf(keys, c); }));
  }

  /**
   * 単純なリポジトリ（全件取得・追加・更新・削除）を作る。
   * @param {Object} def { table, keys: [...], columns: [...], orderBy: 'SQL の ORDER BY 句（固定）' }
   */
  function simple(def) {
    var all = def.keys.concat(def.columns);
    return {
      findAll: function () {
        return InfoExp.data.db.all('SELECT * FROM ' + def.table + ' ORDER BY ' + def.orderBy);
      },
      insert: function (row) {
        return insert(def.table, all, row);
      },
      update: function (keys, fields) {
        return update(def.table, def.keys, def.columns, keys, fields);
      },
      remove: function (keys) {
        return remove(def.table, def.keys, keys);
      },
      removeAll: function () {
        return InfoExp.data.db.run('DELETE FROM ' + def.table);
      }
    };
  }

  InfoExp.data.repositories.repositoryUtil = {
    toSnake: toSnake,
    insert: insert,
    update: update,
    remove: remove,
    simple: simple
  };
})();
