'use strict';

exports.__esModule = true;
exports.default = update;

var _type = require('./type');

var _type2 = _interopRequireDefault(_type);

var _helpers = require('./helpers');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Baobab Update
 * ==============
 *
 * The tree's update scheme.
 */
function err(operation, expectedTarget, path) {
  return (0, _helpers.makeError)('Baobab.update: cannot apply the "' + operation + '" on ' + ('a non ' + expectedTarget + ' (path: /' + path.join('/') + ').'), { path: path });
}

/**
 * Function aiming at applying a single update operation on the given tree's
 * data.
 *
 * @param  {mixed}  data      - The tree's data.
 * @param  {path}   path      - Path of the update.
 * @param  {object} operation - The operation to apply.
 * @param  {object} [opts]    - Optional options.
 * @return {mixed}            - Both the new tree's data and the updated node.
 */
function update(data, path, operation) {
  var opts = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  var operationType = operation.type,
      value = operation.value,
      _operation$options = operation.options,
      operationOptions = _operation$options === undefined ? {} : _operation$options;

  // Dummy root, so we can shift and alter the root

  var dummy = { root: data },
      dummyPath = ['root'].concat(path),
      currentPath = [];

  // Walking the path
  var p = dummy,
      i = void 0,
      l = void 0,
      s = void 0;

  for (i = 0, l = dummyPath.length; i < l; i++) {

    // Current item's reference is therefore p[s]
    // The reason why we don't create a variable here for convenience
    // is because we actually need to mutate the reference.
    s = dummyPath[i];

    // Updating the path
    if (i > 0) currentPath.push(s);

    // If we reached the end of the path, we apply the operation
    if (i === l - 1) {

      /**
       * Set
       */
      if (operationType === 'set') {

        // Purity check
        if (opts.pure && p[s] === value) return { node: p[s] };

        if (_type2.default.lazyGetter(p, s)) {
          Object.defineProperty(p, s, {
            value: value,
            enumerable: true,
            configurable: true
          });
        } else if (opts.persistent && !operationOptions.mutableLeaf) {
          p[s] = (0, _helpers.shallowClone)(value);
        } else {
          p[s] = value;
        }
      }

      /**
       * Monkey
       */
      else if (operationType === 'monkey') {
          Object.defineProperty(p, s, {
            get: value,
            enumerable: true,
            configurable: true
          });
        }

        /**
         * Apply
         */
        else if (operationType === 'apply') {
            var result = value(p[s]);

            // Purity check
            if (opts.pure && p[s] === result) return { node: p[s] };

            if (_type2.default.lazyGetter(p, s)) {
              Object.defineProperty(p, s, {
                value: result,
                enumerable: true,
                configurable: true
              });
            } else if (opts.persistent) {
              p[s] = (0, _helpers.shallowClone)(result);
            } else {
              p[s] = result;
            }
          }

          /**
           * Push
           */
          else if (operationType === 'push') {
              if (!_type2.default.array(p[s])) throw err('push', 'array', currentPath);

              if (opts.persistent) p[s] = p[s].concat([value]);else p[s].push(value);
            }

            /**
             * Unshift
             */
            else if (operationType === 'unshift') {
                if (!_type2.default.array(p[s])) throw err('unshift', 'array', currentPath);

                if (opts.persistent) p[s] = [value].concat(p[s]);else p[s].unshift(value);
              }

              /**
               * Concat
               */
              else if (operationType === 'concat') {
                  if (!_type2.default.array(p[s])) throw err('concat', 'array', currentPath);

                  if (opts.persistent) p[s] = p[s].concat(value);else p[s].push.apply(p[s], value);
                }

                /**
                 * Splice
                 */
                else if (operationType === 'splice') {
                    if (!_type2.default.array(p[s])) throw err('splice', 'array', currentPath);

                    if (opts.persistent) p[s] = _helpers.splice.apply(null, [p[s]].concat(value));else p[s].splice.apply(p[s], value);
                  }

                  /**
                   * Pop
                   */
                  else if (operationType === 'pop') {
                      if (!_type2.default.array(p[s])) throw err('pop', 'array', currentPath);

                      if (opts.persistent) p[s] = (0, _helpers.splice)(p[s], -1, 1);else p[s].pop();
                    }

                    /**
                     * Shift
                     */
                    else if (operationType === 'shift') {
                        if (!_type2.default.array(p[s])) throw err('shift', 'array', currentPath);

                        if (opts.persistent) p[s] = (0, _helpers.splice)(p[s], 0, 1);else p[s].shift();
                      }

                      /**
                       * Unset
                       */
                      else if (operationType === 'unset') {
                          if (_type2.default.object(p)) delete p[s];else if (_type2.default.array(p)) p.splice(s, 1);
                        }

                        /**
                         * Merge
                         */
                        else if (operationType === 'merge') {
                            if (!_type2.default.object(p[s])) throw err('merge', 'object', currentPath);

                            if (opts.persistent) p[s] = (0, _helpers.shallowMerge)({}, p[s], value);else p[s] = (0, _helpers.shallowMerge)(p[s], value);
                          }

                          /**
                           * Deep merge
                           */
                          else if (operationType === 'deepMerge') {
                              if (!_type2.default.object(p[s])) throw err('deepMerge', 'object', currentPath);

                              if (opts.persistent) p[s] = (0, _helpers.deepMerge)({}, p[s], value);else p[s] = (0, _helpers.deepMerge)(p[s], value);
                            }

      // Deep freezing the resulting value
      if (opts.immutable && !operationOptions.mutableLeaf) (0, _helpers.deepFreeze)(p);

      break;
    }

    // If we reached a leaf, we override by setting an empty object
    else if (_type2.default.primitive(p[s])) {
        p[s] = {};
      }

      // Else, we shift the reference and continue the path
      else if (opts.persistent) {
          p[s] = (0, _helpers.shallowClone)(p[s]);
        }

    // Should we freeze the current step before continuing?
    if (opts.immutable && l > 0) (0, _helpers.freeze)(p);

    p = p[s];
  }

  // If we are updating a dynamic node, we need not return the affected node
  if (_type2.default.lazyGetter(p, s)) return { data: dummy.root };

  // Returning new data object
  return { data: dummy.root, node: p[s] };
}