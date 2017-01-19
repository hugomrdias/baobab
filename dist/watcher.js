'use strict';

exports.__esModule = true;

var _emmett = require('emmett');

var _emmett2 = _interopRequireDefault(_emmett);

var _cursor = require('./cursor');

var _cursor2 = _interopRequireDefault(_cursor);

var _type = require('./type');

var _type2 = _interopRequireDefault(_type);

var _helpers = require('./helpers');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * Baobab Watchers
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * ================
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                *
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * Abstraction used to listen and retrieve data from multiple parts of a
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * Baobab tree at once.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                */


/**
 * Watcher class.
 *
 * @constructor
 * @param {Baobab} tree     - The watched tree.
 * @param {object} mapping  - A mapping of the paths to watch in the tree.
 */
var Watcher = function (_Emitter) {
  _inherits(Watcher, _Emitter);

  function Watcher(tree, mapping) {
    _classCallCheck(this, Watcher);

    // Properties
    var _this = _possibleConstructorReturn(this, _Emitter.call(this));

    _this.tree = tree;
    _this.mapping = null;

    _this.state = {
      killed: false
    };

    // Initializing
    _this.refresh(mapping);

    // Listening
    _this.handler = function (e) {
      if (_this.state.killed) return;

      var watchedPaths = _this.getWatchedPaths();

      if ((0, _helpers.solveUpdate)(e.data.paths, watchedPaths)) return _this.emit('update', e);
    };

    _this.tree.on('update', _this.handler);
    return _this;
  }

  /**
   * Method used to get the current watched paths.
   *
   * @return {array} - The array of watched paths.
   */


  Watcher.prototype.getWatchedPaths = function getWatchedPaths() {
    var _this2 = this;

    var rawPaths = Object.keys(this.mapping).map(function (k) {
      var v = _this2.mapping[k];

      // Watcher mappings can accept a cursor
      if (v instanceof _cursor2.default) return v.solvedPath;

      return _this2.mapping[k];
    });

    return rawPaths.reduce(function (cp, p) {

      // Handling path polymorphisms
      p = [].concat(p);

      // Dynamic path?
      if (_type2.default.dynamicPath(p)) p = (0, _helpers.getIn)(_this2.tree._data, p).solvedPath;

      if (!p) return cp;

      // Facet path?
      var monkeyPath = _type2.default.monkeyPath(_this2.tree._monkeys, p);

      if (monkeyPath) return cp.concat((0, _helpers.getIn)(_this2.tree._monkeys, monkeyPath).data.relatedPaths());

      return cp.concat([p]);
    }, []);
  };

  /**
   * Method used to return a map of the watcher's cursors.
   *
   * @return {object} - TMap of relevant cursors.
   */


  Watcher.prototype.getCursors = function getCursors() {
    var _this3 = this;

    var cursors = {};

    Object.keys(this.mapping).forEach(function (k) {
      var path = _this3.mapping[k];

      if (path instanceof _cursor2.default) cursors[k] = path;else cursors[k] = _this3.tree.select(path);
    });

    return cursors;
  };

  /**
   * Method used to refresh the watcher's mapping.
   *
   * @param  {object}  mapping  - The new mapping to apply.
   * @return {Watcher}          - Itself for chaining purposes.
   */


  Watcher.prototype.refresh = function refresh(mapping) {

    if (!_type2.default.watcherMapping(mapping)) throw (0, _helpers.makeError)('Baobab.watch: invalid mapping.', { mapping: mapping });

    this.mapping = mapping;

    // Creating the get method
    var projection = {};

    for (var k in mapping) {
      projection[k] = mapping[k] instanceof _cursor2.default ? mapping[k].path : mapping[k];
    }this.get = this.tree.project.bind(this.tree, projection);
  };

  /**
   * Methods releasing the watcher from memory.
   */


  Watcher.prototype.release = function release() {

    this.tree.off('update', this.handler);
    this.state.killed = true;
    this.kill();
  };

  return Watcher;
}(_emmett2.default);

exports.default = Watcher;