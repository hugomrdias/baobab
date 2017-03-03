'use strict';

exports.__esModule = true;
exports.helpers = exports.type = exports.Monkey = exports.MonkeyDefinition = exports.Cursor = exports.dynamicNode = exports.monkey = undefined;

var _emmett = require('emmett');

var _emmett2 = _interopRequireDefault(_emmett);

var _cursor = require('./cursor');

var _cursor2 = _interopRequireDefault(_cursor);

var _monkey = require('./monkey');

var _watcher = require('./watcher');

var _watcher2 = _interopRequireDefault(_watcher);

var _type = require('./type');

var _type2 = _interopRequireDefault(_type);

var _update2 = require('./update');

var _update3 = _interopRequireDefault(_update2);

var _helpers = require('./helpers');

var helpers = _interopRequireWildcard(_helpers);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * Baobab Data Structure
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * ======================
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                *
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * A handy data tree with cursors.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                */


var arrayFrom = helpers.arrayFrom,
    coercePath = helpers.coercePath,
    deepFreeze = helpers.deepFreeze,
    getIn = helpers.getIn,
    makeError = helpers.makeError,
    deepClone = helpers.deepClone,
    deepMerge = helpers.deepMerge,
    shallowClone = helpers.shallowClone,
    shallowMerge = helpers.shallowMerge,
    uniqid = helpers.uniqid;

/**
 * Baobab defaults
 */

var DEFAULTS = {

  // Should the tree handle its transactions on its own?
  autoCommit: true,

  // Should the transactions be handled asynchronously?
  asynchronous: true,

  // Should the tree's data be immutable?
  immutable: true,

  // Should the monkeys be lazy?
  lazyMonkeys: true,

  // Should the tree be persistent?
  persistent: true,

  // Should the tree's update be pure?
  pure: true,

  // Validation specifications
  validate: null,

  // Validation behavior 'rollback' or 'notify'
  validationBehavior: 'rollback'
};

/**
 * Function returning a string hash from a non-dynamic path expressed as an
 * array.
 *
 * @param  {array}  path - The path to hash.
 * @return {string} string - The resultant hash.
 */
function hashPath(path) {
  return 'λ' + path.map(function (step) {
    if (_type2.default.function(step) || _type2.default.object(step)) return '#' + uniqid() + '#';

    return step;
  }).join('λ');
}

/**
 * Baobab class
 *
 * @constructor
 * @param {object|array} [initialData={}]    - Initial data passed to the tree.
 * @param {object}       [opts]              - Optional options.
 * @param {boolean}      [opts.autoCommit]   - Should the tree auto-commit?
 * @param {boolean}      [opts.asynchronous] - Should the tree's transactions
 *                                             handled asynchronously?
 * @param {boolean}      [opts.immutable]    - Should the tree be immutable?
 * @param {boolean}      [opts.persistent]   - Should the tree be persistent?
 * @param {boolean}      [opts.pure]         - Should the tree be pure?
 * @param {function}     [opts.validate]     - Validation function.
 * @param {string}       [opts.validationBehaviour] - "rollback" or "notify".
 */

var Baobab = function (_Emitter) {
  _inherits(Baobab, _Emitter);

  function Baobab(initialData, opts) {
    _classCallCheck(this, Baobab);

    // Setting initialData to an empty object if no data is provided by use
    var _this = _possibleConstructorReturn(this, _Emitter.call(this));

    if (arguments.length < 1) initialData = {};

    // Checking whether given initial data is valid
    if (!_type2.default.object(initialData) && !_type2.default.array(initialData)) throw makeError('Baobab: invalid data.', { data: initialData });

    // Merging given options with defaults
    _this.options = shallowMerge({}, DEFAULTS, opts);

    // Disabling immutability & persistence if persistence if disabled
    if (!_this.options.persistent) {
      _this.options.immutable = false;
      _this.options.pure = false;
    }

    // Privates
    _this._identity = '[object Baobab]';
    _this._cursors = {};
    _this._future = null;
    _this._transaction = [];
    _this._affectedPathsIndex = {};
    _this._monkeys = {};
    _this._previousData = null;
    _this._data = initialData;

    // Properties
    _this.root = new _cursor2.default(_this, [], 'λ');
    delete _this.root.release;

    // Does the user want an immutable tree?
    if (_this.options.immutable) deepFreeze(_this._data);

    // Bootstrapping root cursor's getters and setters
    var bootstrap = function bootstrap(name) {
      _this[name] = function () {
        var r = this.root[name].apply(this.root, arguments);
        return r instanceof _cursor2.default ? this : r;
      };
    };

    ['apply', 'clone', 'concat', 'deepClone', 'deepMerge', 'exists', 'get', 'push', 'merge', 'pop', 'project', 'serialize', 'set', 'shift', 'splice', 'unset', 'unshift'].forEach(bootstrap);

    // Registering the initial monkeys
    _this._refreshMonkeys();

    // Initial validation
    var validationError = _this.validate();

    if (validationError) throw Error('Baobab: invalid data.', { error: validationError });
    return _this;
  }

  /**
   * Internal method used to refresh the tree's monkey register on every
   * update.
   * Note 1) For the time being, placing monkeys beneath array nodes is not
   * allowed for performance reasons.
   *
   * @param  {mixed}   node      - The starting node.
   * @param  {array}   path      - The starting node's path.
   * @param  {string}  operation - The operation that lead to a refreshment.
   * @return {Baobab}            - The tree instance for chaining purposes.
   */


  Baobab.prototype._refreshMonkeys = function _refreshMonkeys(node, path, operation) {
    var _this2 = this;

    var clean = function clean(data) {
      var p = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

      if (data instanceof _monkey.Monkey) {
        data.release();
        (0, _update3.default)(_this2._monkeys, p, { type: 'unset' }, {
          immutable: false,
          persistent: false,
          pure: false
        });

        return;
      }

      if (_type2.default.object(data)) {
        for (var k in data) {
          clean(data[k], p.concat(k));
        }
      }
    };

    var walk = function walk(data) {
      var p = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];


      // Should we sit a monkey in the tree?
      if (data instanceof _monkey.MonkeyDefinition || data instanceof _monkey.Monkey) {
        var monkeyInstance = new _monkey.Monkey(_this2, p, data instanceof _monkey.Monkey ? data.definition : data);

        (0, _update3.default)(_this2._monkeys, p, { type: 'set', value: monkeyInstance }, {
          immutable: false,
          persistent: false,
          pure: false
        });

        return;
      }

      // Object iteration
      if (_type2.default.object(data)) {
        for (var k in data) {
          walk(data[k], p.concat(k));
        }
      }
    };

    // Walking the whole tree
    if (!arguments.length) {
      walk(this._data);
    } else {
      var monkeysNode = getIn(this._monkeys, path).data;

      // Is this required that we clean some already existing monkeys?
      if (monkeysNode) clean(monkeysNode, path);

      // Let's walk the tree only from the updated point
      if (operation !== 'unset') {
        walk(node, path);
      }
    }

    return this;
  };

  /**
   * Method used to validate the tree's data.
   *
   * @return {boolean} - Is the tree valid?
   */


  Baobab.prototype.validate = function validate(affectedPaths) {
    var _options = this.options,
        validate = _options.validate,
        behavior = _options.validationBehavior;


    if (typeof validate !== 'function') return null;

    var error = validate.call(this, this._previousData, this._data, affectedPaths || [[]]);

    if (error instanceof Error) {

      if (behavior === 'rollback') {
        this._data = this._previousData;
        this._affectedPathsIndex = {};
        this._transaction = [];
        this._previousData = this._data;
      }

      this.emit('invalid', { error: error });

      return error;
    }

    return null;
  };

  /**
   * Method used to select data within the tree by creating a cursor. Cursors
   * are kept as singletons by the tree for performance and hygiene reasons.
   *
   * Arity (1):
   * @param {path}    path - Path to select in the tree.
   *
   * Arity (*):
   * @param {...step} path - Path to select in the tree.
   *
   * @return {Cursor}      - The resultant cursor.
   */


  Baobab.prototype.select = function select(path) {

    // If no path is given, we simply return the root
    path = path || [];

    // Variadic
    if (arguments.length > 1) path = arrayFrom(arguments);

    // Checking that given path is valid
    if (!_type2.default.path(path)) throw makeError('Baobab.select: invalid path.', { path: path });

    // Casting to array
    path = [].concat(path);

    // Computing hash (done here because it would be too late to do it in the
    // cursor's constructor since we need to hit the cursors' index first).
    var hash = hashPath(path);

    // Creating a new cursor or returning the already existing one for the
    // requested path.
    var cursor = this._cursors[hash];

    if (!cursor) {
      cursor = new _cursor2.default(this, path, hash);
      this._cursors[hash] = cursor;
    }

    // Emitting an event to notify that a part of the tree was selected
    this.emit('select', { path: path, cursor: cursor });
    return cursor;
  };

  /**
   * Method used to update the tree. Updates are simply expressed by a path,
   * dynamic or not, and an operation.
   *
   * This is where path solving should happen and not in the cursor.
   *
   * @param  {path}   path      - The path where we'll apply the operation.
   * @param  {object} operation - The operation to apply.
   * @return {mixed} - Return the result of the update.
   */


  Baobab.prototype.update = function update(path, operation) {
    var _this3 = this;

    // Coercing path
    path = coercePath(path);

    if (!_type2.default.operationType(operation.type)) throw makeError('Baobab.update: unknown operation type "' + operation.type + '".', { operation: operation });

    // Solving the given path

    var _getIn = getIn(this._data, path),
        solvedPath = _getIn.solvedPath,
        exists = _getIn.exists;

    // If we couldn't solve the path, we throw


    if (!solvedPath) throw makeError('Baobab.update: could not solve the given path.', {
      path: solvedPath
    });

    // Read-only path?
    var monkeyPath = _type2.default.monkeyPath(this._monkeys, solvedPath);
    if (monkeyPath && solvedPath.length > monkeyPath.length) throw makeError('Baobab.update: attempting to update a read-only path.', {
      path: solvedPath
    });

    // We don't unset irrelevant paths
    if (operation.type === 'unset' && !exists) return;

    // If we merge data, we need to acknowledge monkeys
    var realOperation = operation;
    if (/merge/i.test(operation.type)) {
      var monkeysNode = getIn(this._monkeys, solvedPath).data;

      if (_type2.default.object(monkeysNode)) {

        // Cloning the operation not to create weird behavior for the user
        realOperation = shallowClone(realOperation);

        // Fetching the existing node in the current data
        var currentNode = getIn(this._data, solvedPath).data;

        if (/deep/i.test(realOperation.type)) realOperation.value = deepMerge({}, deepMerge({}, currentNode, deepClone(monkeysNode)), realOperation.value);else realOperation.value = shallowMerge({}, deepMerge({}, currentNode, deepClone(monkeysNode)), realOperation.value);
      }
    }

    // Stashing previous data if this is the frame's first update
    if (!this._transaction.length) this._previousData = this._data;

    // Applying the operation
    var result = (0, _update3.default)(this._data, solvedPath, realOperation, this.options);

    var data = result.data,
        node = result.node;

    // If because of purity, the update was moot, we stop here

    if (!('data' in result)) return node;

    // If the operation is push, the affected path is slightly different
    var affectedPath = solvedPath.concat(operation.type === 'push' ? node.length - 1 : []);

    var hash = hashPath(affectedPath);

    // Updating data and transaction
    this._data = data;
    this._affectedPathsIndex[hash] = true;
    this._transaction.push(shallowMerge({}, operation, { path: affectedPath }));

    // Updating the monkeys
    this._refreshMonkeys(node, solvedPath, operation.type);

    // Emitting a `write` event
    this.emit('write', { path: affectedPath });

    // Should we let the user commit?
    if (!this.options.autoCommit) return node;

    // Should we update asynchronously?
    if (!this.options.asynchronous) {
      this.commit();
      return node;
    }

    // Updating asynchronously
    if (!this._future) this._future = setTimeout(function () {
      return _this3.commit();
    }, 0);

    // Finally returning the affected node
    return node;
  };

  /**
   * Method committing the updates of the tree and firing the tree's events.
   *
   * @return {Baobab} - The tree instance for chaining purposes.
   */


  Baobab.prototype.commit = function commit() {

    // Do not fire update if the transaction is empty
    if (!this._transaction.length) return this;

    // Clearing timeout if one was defined
    if (this._future) this._future = clearTimeout(this._future);

    var affectedPaths = Object.keys(this._affectedPathsIndex).map(function (h) {
      return h !== 'λ' ? h.split('λ').slice(1) : [];
    });

    // Is the tree still valid?
    var validationError = this.validate(affectedPaths);

    if (validationError) return this;

    // Caching to keep original references before we change them
    var transaction = this._transaction,
        previousData = this._previousData;

    this._affectedPathsIndex = {};
    this._transaction = [];
    this._previousData = this._data;

    // Emitting update event
    this.emit('update', {
      paths: affectedPaths,
      currentData: this._data,
      transaction: transaction,
      previousData: previousData
    });

    return this;
  };

  /**
   * Method returning a monkey at the given path or else `null`.
   *
   * @param  {path}        path - Path of the monkey to retrieve.
   * @return {Monkey|null}      - The Monkey instance of `null`.
   */


  Baobab.prototype.getMonkey = function getMonkey(path) {
    path = coercePath(path);

    var monkey = getIn(this._monkeys, [].concat(path)).data;

    if (monkey instanceof _monkey.Monkey) return monkey;

    return null;
  };

  /**
   * Method used to watch a collection of paths within the tree. Very useful
   * to bind UI components and such to the tree.
   *
   * @param  {object} mapping - Mapping of paths to listen.
   * @return {Cursor}         - The created watcher.
   */


  Baobab.prototype.watch = function watch(mapping) {
    return new _watcher2.default(this, mapping);
  };

  /**
   * Method releasing the tree and its attached data from memory.
   */


  Baobab.prototype.release = function release() {
    var k = void 0;

    this.emit('release');

    delete this.root;

    delete this._data;
    delete this._previousData;
    delete this._transaction;
    delete this._affectedPathsIndex;
    delete this._monkeys;

    // Releasing cursors
    for (k in this._cursors) {
      this._cursors[k].release();
    }delete this._cursors;

    // Killing event emitter
    this.kill();
  };

  /**
   * Overriding the `toJSON` method for convenient use with JSON.stringify.
   *
   * @return {mixed} - Data at cursor.
   */


  Baobab.prototype.toJSON = function toJSON() {
    return this.serialize();
  };

  /**
   * Overriding the `toString` method for debugging purposes.
   *
   * @return {string} - The baobab's identity.
   */


  Baobab.prototype.toString = function toString() {
    return this._identity;
  };

  return Baobab;
}(_emmett2.default);

/**
 * Monkey helper.
 */


exports.default = Baobab;
var monkey = exports.monkey = function monkey() {
  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  if (!args.length) throw new Error('Baobab.monkey: missing definition.');

  if (args.length === 1 && typeof args[0] !== 'function') return new _monkey.MonkeyDefinition(args[0]);

  return new _monkey.MonkeyDefinition(args);
};

exports.dynamicNode = monkey;
exports.Cursor = _cursor2.default;
exports.MonkeyDefinition = _monkey.MonkeyDefinition;
exports.Monkey = _monkey.Monkey;
exports.type = _type2.default;
exports.helpers = helpers;

/**
 * Version
 */

Baobab.VERSION = '2.4.3';