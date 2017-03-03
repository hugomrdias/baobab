'use strict';

exports.__esModule = true;
exports.uniqid = exports.deepMerge = exports.shallowMerge = exports.deepFreeze = exports.freeze = exports.deepClone = exports.shallowClone = exports.Archive = undefined;
exports.arrayFrom = arrayFrom;
exports.before = before;
exports.coercePath = coercePath;
exports.getIn = getIn;
exports.makeError = makeError;
exports.solveRelativePath = solveRelativePath;
exports.solveUpdate = solveUpdate;
exports.splice = splice;

var _monkey = require('./monkey');

var _type = require('./type');

var _type2 = _interopRequireDefault(_type);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } } /* eslint eqeqeq: 0 */

/**
 * Baobab Helpers
 * ===============
 *
 * Miscellaneous helper functions.
 */


/**
 * Noop function
 */
var noop = Function.prototype;

var hasOwnProp = {}.hasOwnProperty;

/**
 * Function returning the index of the first element of a list matching the
 * given predicate.
 *
 * @param  {array}     a  - The target array.
 * @param  {function}  fn - The predicate function.
 * @return {mixed}        - The index of the first matching item or -1.
 */
function index(a, fn) {
  var i = void 0,
      l = void 0;
  for (i = 0, l = a.length; i < l; i++) {
    if (fn(a[i])) return i;
  }
  return -1;
}

/**
 * Efficient slice function used to clone arrays or parts of them.
 *
 * @param  {array} array - The array to slice.
 * @return {array}       - The sliced array.
 */
function slice(array) {
  var newArray = new Array(array.length);

  var i = void 0,
      l = void 0;

  for (i = 0, l = array.length; i < l; i++) {
    newArray[i] = array[i];
  }return newArray;
}

/**
 * Archive abstraction
 *
 * @constructor
 * @param {integer} size - Maximum number of records to store.
 */

var Archive = exports.Archive = function () {
  function Archive(size) {
    _classCallCheck(this, Archive);

    this.size = size;
    this.records = [];
  }

  /**
   * Method retrieving the records.
   *
   * @return {array} - The records.
   */


  Archive.prototype.get = function get() {
    return this.records;
  };

  /**
   * Method adding a record to the archive
   *
   * @param {object}  record - The record to store.
   * @return {Archive}       - The archive itself for chaining purposes.
   */


  Archive.prototype.add = function add(record) {
    this.records.unshift(record);

    // If the number of records is exceeded, we truncate the records
    if (this.records.length > this.size) this.records.length = this.size;

    return this;
  };

  /**
   * Method clearing the records.
   *
   * @return {Archive} - The archive itself for chaining purposes.
   */


  Archive.prototype.clear = function clear() {
    this.records = [];
    return this;
  };

  /**
   * Method to go back in time.
   *
   * @param {integer} steps - Number of steps we should go back by.
   * @return {number}       - The last record.
   */


  Archive.prototype.back = function back(steps) {
    var record = this.records[steps - 1];

    if (record) this.records = this.records.slice(steps);
    return record;
  };

  return Archive;
}();

/**
 * Function creating a real array from what should be an array but is not.
 * I'm looking at you nasty `arguments`...
 *
 * @param  {mixed} culprit - The culprit to convert.
 * @return {array}         - The real array.
 */


function arrayFrom(culprit) {
  return slice(culprit);
}

/**
 * Function decorating one function with another that will be called before the
 * decorated one.
 *
 * @param  {function} decorator - The decorating function.
 * @param  {function} fn        - The function to decorate.
 * @return {function}           - The decorated function.
 */
function before(decorator, fn) {
  return function () {
    decorator.apply(null, arguments);
    fn.apply(null, arguments);
  };
}

/**
 * Function cloning the given regular expression. Supports `y` and `u` flags
 * already.
 *
 * @param  {RegExp} re - The target regular expression.
 * @return {RegExp}    - The cloned regular expression.
 */
function cloneRegexp(re) {
  var pattern = re.source;

  var flags = '';

  if (re.global) flags += 'g';
  if (re.multiline) flags += 'm';
  if (re.ignoreCase) flags += 'i';
  if (re.sticky) flags += 'y';
  if (re.unicode) flags += 'u';

  return new RegExp(pattern, flags);
}

/**
 * Function cloning the given variable.
 *
 * @todo: implement a faster way to clone an array.
 *
 * @param  {boolean} deep - Should we deep clone the variable.
 * @param  {mixed}   item - The variable to clone
 * @return {mixed}        - The cloned variable.
 */
function cloner(deep, item) {
  if (!item || typeof item !== 'object' || item instanceof Error || item instanceof _monkey.MonkeyDefinition || item instanceof _monkey.Monkey || typeof ArrayBuffer === 'function' && item instanceof ArrayBuffer) return item;

  // Array
  if (_type2.default.array(item)) {
    if (deep) {
      var a = [];

      var i = void 0,
          l = void 0;

      for (i = 0, l = item.length; i < l; i++) {
        a.push(cloner(true, item[i]));
      }return a;
    }

    return slice(item);
  }

  // Date
  if (item instanceof Date) return new Date(item.getTime());

  // RegExp
  if (item instanceof RegExp) return cloneRegexp(item);

  // Object
  if (_type2.default.object(item)) {
    var o = {};

    var _i = void 0,
        _l = void 0,
        k = void 0;

    // NOTE: could be possible to erase computed properties through `null`.
    var props = Object.getOwnPropertyNames(item);
    for (_i = 0, _l = props.length; _i < _l; _i++) {
      k = props[_i];
      if (_type2.default.lazyGetter(item, k)) {
        Object.defineProperty(o, k, {
          get: Object.getOwnPropertyDescriptor(item, k).get,
          enumerable: true,
          configurable: true
        });
      } else {
        Object.defineProperty(o, k, {
          value: deep ? cloner(true, item[k]) : item[k],
          enumerable: Object.getOwnPropertyDescriptor(item, k).enumerable,
          writable: true,
          configurable: true
        });
      }
    }
    return o;
  }

  return item;
}

/**
 * Exporting shallow and deep cloning functions.
 */
var shallowClone = cloner.bind(null, false),
    deepClone = cloner.bind(null, true);

exports.shallowClone = shallowClone;
exports.deepClone = deepClone;

/**
 * Coerce the given variable into a full-fledged path.
 *
 * @param  {mixed} target - The variable to coerce.
 * @return {array}        - The array path.
 */

function coercePath(target) {
  if (target || target === 0 || target === '') return target;
  return [];
}

/**
 * Function comparing an object's properties to a given descriptive
 * object.
 *
 * @param  {object} object      - The object to compare.
 * @param  {object} description - The description's mapping.
 * @return {boolean}            - Whether the object matches the description.
 */
function compare(object, description) {
  var ok = true,
      k = void 0;

  // If we reached here via a recursive call, object may be undefined because
  // not all items in a collection will have the same deep nesting structure.
  if (!object) return false;

  for (k in description) {
    if (_type2.default.object(description[k])) {
      ok = ok && compare(object[k], description[k]);
    } else if (_type2.default.array(description[k])) {
      ok = ok && !!~description[k].indexOf(object[k]);
    } else {
      if (object[k] !== description[k]) return false;
    }
  }

  return ok;
}

/**
 * Function freezing the given variable if possible.
 *
 * @param  {boolean} deep - Should we recursively freeze the given objects?
 * @param  {object}  o    - The variable to freeze.
 * @return {object}    - The merged object.
 */
function freezer(deep, o) {
  if (typeof o !== 'object' || o === null || o instanceof _monkey.Monkey) return;

  Object.freeze(o);

  if (!deep) return;

  if (Array.isArray(o)) {

    // Iterating through the elements
    var i = void 0,
        l = void 0;

    for (i = 0, l = o.length; i < l; i++) {
      freezer(true, o[i]);
    }
  } else {
    var p = void 0,
        k = void 0;

    for (k in o) {
      if (_type2.default.lazyGetter(o, k)) continue;

      p = o[k];

      if (!p || !hasOwnProp.call(o, k) || typeof p !== 'object' || Object.isFrozen(p)) continue;

      freezer(true, p);
    }
  }
}

/**
 * Exporting both `freeze` and `deepFreeze` functions.
 * Note that if the engine does not support `Object.freeze` then this will
 * export noop functions instead.
 */
var isFreezeSupported = typeof Object.freeze === 'function';

var freeze = isFreezeSupported ? freezer.bind(null, false) : noop,
    deepFreeze = isFreezeSupported ? freezer.bind(null, true) : noop;

exports.freeze = freeze;
exports.deepFreeze = deepFreeze;

/**
 * Function retrieving nested data within the given object and according to
 * the given path.
 *
 * @todo: work if dynamic path hit objects also.
 * @todo: memoized perfgetters.
 *
 * @param  {object}  object - The object we need to get data from.
 * @param  {array}   path   - The path to follow.
 * @return {object}  result            - The result.
 * @return {mixed}   result.data       - The data at path, or `undefined`.
 * @return {array}   result.solvedPath - The solved path or `null`.
 * @return {boolean} result.exists     - Does the path exists in the tree?
 */

var NOT_FOUND_OBJECT = { data: undefined, solvedPath: null, exists: false };

function getIn(object, path) {
  if (!path) return NOT_FOUND_OBJECT;

  var solvedPath = [];

  var exists = true,
      c = object,
      idx = void 0,
      i = void 0,
      l = void 0;

  for (i = 0, l = path.length; i < l; i++) {
    if (!c) return {
      data: undefined,
      solvedPath: solvedPath.concat(path.slice(i)),
      exists: false
    };

    if (typeof path[i] === 'function') {
      if (!_type2.default.array(c)) return NOT_FOUND_OBJECT;

      idx = index(c, path[i]);
      if (!~idx) return NOT_FOUND_OBJECT;

      solvedPath.push(idx);
      c = c[idx];
    } else if (typeof path[i] === 'object') {
      if (!_type2.default.array(c)) return NOT_FOUND_OBJECT;

      idx = index(c, function (e) {
        return compare(e, path[i]);
      });
      if (!~idx) return NOT_FOUND_OBJECT;

      solvedPath.push(idx);
      c = c[idx];
    } else {
      solvedPath.push(path[i]);
      exists = typeof c === 'object' && path[i] in c;
      c = c[path[i]];
    }
  }

  return { data: c, solvedPath: solvedPath, exists: exists };
}

/**
 * Little helper returning a JavaScript error carrying some data with it.
 *
 * @param  {string} message - The error message.
 * @param  {object} [data]  - Optional data to assign to the error.
 * @return {Error}          - The created error.
 */
function makeError(message, data) {
  var err = new Error(message);

  for (var k in data) {
    err[k] = data[k];
  }return err;
}

/**
 * Function taking n objects to merge them together.
 * Note 1): the latter object will take precedence over the first one.
 * Note 2): the first object will be mutated to allow for perf scenarios.
 * Note 3): this function will consider monkeys as leaves.
 *
 * @param  {boolean}   deep    - Whether the merge should be deep or not.
 * @param  {...object} objects - Objects to merge.
 * @return {object}            - The merged object.
 */
function merger(deep) {
  for (var _len = arguments.length, objects = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    objects[_key - 1] = arguments[_key];
  }

  var o = objects[0];

  var t = void 0,
      i = void 0,
      l = void 0,
      k = void 0;

  for (i = 1, l = objects.length; i < l; i++) {
    t = objects[i];

    for (k in t) {
      if (deep && _type2.default.object(t[k]) && !(t[k] instanceof _monkey.Monkey)) {
        o[k] = merger(true, o[k] || {}, t[k]);
      } else {
        o[k] = t[k];
      }
    }
  }

  return o;
}

/**
 * Exporting both `shallowMerge` and `deepMerge` functions.
 */
var shallowMerge = merger.bind(null, false),
    deepMerge = merger.bind(null, true);

exports.shallowMerge = shallowMerge;
exports.deepMerge = deepMerge;

/**
 * Solving a potentially relative path.
 *
 * @param  {array} base - The base path from which to solve the path.
 * @param  {array} to   - The subpath to reach.
 * @param  {array}      - The solved absolute path.
 */

function solveRelativePath(base, to) {
  var solvedPath = [];

  // Coercing to array
  to = [].concat(to);

  for (var i = 0, l = to.length; i < l; i++) {
    var step = to[i];

    if (step === '.') {
      if (!i) solvedPath = base.slice(0);
    } else if (step === '..') {
      solvedPath = (!i ? base : solvedPath).slice(0, -1);
    } else {
      solvedPath.push(step);
    }
  }

  return solvedPath;
}

/**
 * Function determining whether some paths in the tree were affected by some
 * updates that occurred at the given paths. This helper is mainly used at
 * cursor level to determine whether the cursor is concerned by the updates
 * fired at tree level.
 *
 * NOTES: 1) If performance become an issue, the following threefold loop
 *           can be simplified to a complex twofold one.
 *        2) A regex version could also work but I am not confident it would
 *           be faster.
 *        3) Another solution would be to keep a register of cursors like with
 *           the monkeys and update along this tree.
 *
 * @param  {array} affectedPaths - The paths that were updated.
 * @param  {array} comparedPaths - The paths that we are actually interested in.
 * @return {boolean}             - Is the update relevant to the compared
 *                                 paths?
 */
function solveUpdate(affectedPaths, comparedPaths) {
  var i = void 0,
      j = void 0,
      k = void 0,
      l = void 0,
      m = void 0,
      n = void 0,
      p = void 0,
      c = void 0,
      s = void 0;

  // Looping through possible paths
  for (i = 0, l = affectedPaths.length; i < l; i++) {
    p = affectedPaths[i];

    if (!p.length) return true;

    // Looping through logged paths
    for (j = 0, m = comparedPaths.length; j < m; j++) {
      c = comparedPaths[j];

      if (!c || !c.length) return true;

      // Looping through steps
      for (k = 0, n = c.length; k < n; k++) {
        s = c[k];

        // If path is not relevant, we break
        // NOTE: the '!=' instead of '!==' is required here!
        if (s != p[k]) break;

        // If we reached last item and we are relevant
        if (k + 1 === n || k + 1 === p.length) return true;
      }
    }
  }

  return false;
}

/**
 * Non-mutative version of the splice array method.
 *
 * @param  {array}    array        - The array to splice.
 * @param  {integer}  startIndex   - The start index.
 * @param  {integer}  nb           - Number of elements to remove.
 * @param  {...mixed} elements     - Elements to append after splicing.
 * @return {array}                 - The spliced array.
 */
function splice(array, startIndex, nb) {
  for (var _len2 = arguments.length, elements = Array(_len2 > 3 ? _len2 - 3 : 0), _key2 = 3; _key2 < _len2; _key2++) {
    elements[_key2 - 3] = arguments[_key2];
  }

  if (nb === undefined && arguments.length === 2) nb = array.length - startIndex;else if (nb === null || nb === undefined) nb = 0;else if (isNaN(+nb)) throw new Error('argument nb ' + nb + ' can not be parsed into a number!');
  nb = Math.max(0, nb);

  // Solving startIndex
  if (_type2.default.function(startIndex)) startIndex = index(array, startIndex);
  if (_type2.default.object(startIndex)) startIndex = index(array, function (e) {
    return compare(e, startIndex);
  });

  // Positive index
  if (startIndex >= 0) return array.slice(0, startIndex).concat(elements).concat(array.slice(startIndex + nb));

  // Negative index
  return array.slice(0, array.length + startIndex).concat(elements).concat(array.slice(array.length + startIndex + nb));
}

/**
 * Function returning a unique incremental id each time it is called.
 *
 * @return {integer} - The latest unique id.
 */
var uniqid = function () {
  var i = 0;

  return function () {
    return i++;
  };
}();

exports.uniqid = uniqid;