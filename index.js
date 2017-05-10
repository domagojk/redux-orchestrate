'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function forceArray(arr) {
  if (!Array.isArray(arr)) return [arr];
  return arr;
}

function delayDubounce(action, options, callback) {
  var debounce = options.debounce,
      delay = options.delay,
      _debounceTimeoutRefs = options._debounceTimeoutRefs;

  var cb = callback;
  if (delay) {
    cb = function cb(action) {
      return setTimeout(function () {
        return callback();
      }, delay);
    };
  }

  if (debounce) {
    clearTimeout(_debounceTimeoutRefs[action.type]);
    _debounceTimeoutRefs[action.type] = setTimeout(function () {
      delete _debounceTimeoutRefs[action.type];
      cb();
    }, debounce);
  } else {
    cb();
  }
}

var orchestrate = function orchestrate(config, options) {
  return function (store) {
    return function (next) {
      return function (originalAction) {
        if (!Array.isArray(config)) {
          throw new Error('Orchestrate config must be an array');
        }

        if (!options || !options.validate) {
          next(originalAction);
        }

        function internalNext(action) {
          next(action);
          checkAction(action);
        }

        function checkAction(action) {
          var matched = false;
          config.forEach(function (rule) {
            if (_typeof(rule._debounceTimeoutRefs) !== 'object') {
              rule._debounceTimeoutRefs = {};
            }

            var ruleConfig = {};
            Object.keys(rule).forEach(function (ruleKey) {
              if (typeof rule[ruleKey] === 'function') {
                ruleConfig[ruleKey] = rule[ruleKey](action, store.getState());
              } else {
                ruleConfig[ruleKey] = rule[ruleKey];
              }
            });
            var testCase = forceArray(ruleConfig.case);
            testCase.forEach(function (c) {
              var dispatchAction = ruleConfig.dispatch;

              if (typeof ruleConfig.dispatch === 'string') {
                dispatchAction = _extends({}, action, { type: ruleConfig.dispatch });
              }

              var requestConfig = ruleConfig.request;
              if (ruleConfig.get) {
                requestConfig = _extends({}, ruleConfig.get, { method: 'GET' });
              }
              if (ruleConfig.post) {
                requestConfig = _extends({}, ruleConfig.post, { method: 'POST' });
              }
              if (ruleConfig.put) {
                requestConfig = _extends({}, ruleConfig.put, { method: 'PUT' });
              }
              if (ruleConfig.patch) {
                requestConfig = _extends({}, ruleConfig.patch, { method: 'PATCH' });
              }
              if (ruleConfig.del) {
                requestConfig = _extends({}, ruleConfig.del, { method: 'DELETE' });
              }
              if (ruleConfig.head) {
                requestConfig = _extends({}, ruleConfig.head, { method: 'HEAD' });
              }
              if (ruleConfig.options) {
                requestConfig = _extends({}, ruleConfig.options, { method: 'OPTIONS' });
              }

              if (rule._req && requestConfig && requestConfig.cancelWhen && requestConfig.cancelWhen.indexOf(action.type) !== -1) {
                rule._req.abort();
              }

              if (action.type === c) {
                matched = true;
                delayDubounce(action, ruleConfig, function () {
                  if (dispatchAction) {
                    internalNext(dispatchAction);
                  }

                  if (requestConfig) {
                    rule._req = (0, _request2.default)(_extends({
                      json: true
                    }, requestConfig, {
                      callback: function callback(err, res) {
                        if (err && requestConfig.onFail) {
                          var onFailAction = requestConfig.onFail;
                          if (typeof requestConfig.onFail === 'string') {
                            onFailAction = { type: requestConfig.onFail };
                          } else if (typeof requestConfig.onFail === 'function') {
                            onFailAction = requestConfig.onFail(res);
                          }
                          internalNext(onFailAction);
                        }
                        if (!err && requestConfig.onSuccess) {
                          var onSuccessAction = requestConfig.onSuccess;
                          if (typeof requestConfig.onSuccess === 'string') {
                            onSuccessAction = { type: requestConfig.onSuccess };
                          } else if (typeof requestConfig.onSuccess === 'function') {
                            onSuccessAction = requestConfig.onSuccess(res);
                          }
                          internalNext(onSuccessAction);
                        }

                        if (requestConfig.callback) {
                          requestConfig.callback(err, res);
                        }
                      }
                    }));
                  }
                });
              }
            });
          });
          return matched;
        }
        checkAction(originalAction);
      };
    };
  };
};

exports.default = orchestrate;