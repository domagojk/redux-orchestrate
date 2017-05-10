import request from 'request'

function forceArray (arr) {
  if (!Array.isArray(arr)) return [arr]
  return arr
}

function delayDubounce (action, options, callback) {
  const { debounce, delay, _debounceTimeoutRefs } = options
  let cb = callback
  if (delay) {
    cb = (action) => setTimeout(() => callback(), delay)
  }

  if (debounce) {
    clearTimeout(_debounceTimeoutRefs[action.type])
    _debounceTimeoutRefs[action.type] = setTimeout(() => {
      delete _debounceTimeoutRefs[action.type]
      cb()
    }, debounce)

  } else {
    cb()
  }
}

const orchestrate = (config, options) => store => next => originalAction => {
  if (!Array.isArray(config)) {
    throw new Error('Orchestrate config must be an array')
  }

  if (!options || !options.validate) {
    next(originalAction)
  }

  function internalNext (action) {
    next(action)
    checkAction(action)
  }

  function checkAction (action) {
    let matched = false
    config.forEach(rule => {
      if (typeof rule._debounceTimeoutRefs !== 'object') {
        rule._debounceTimeoutRefs = {}
      }

      const ruleConfig = {}
      Object.keys(rule).forEach(ruleKey => {
        if (typeof rule[ruleKey] === 'function') {
          ruleConfig[ruleKey] = rule[ruleKey](action, store.getState())
        } else {
          ruleConfig[ruleKey] = rule[ruleKey]
        }
      })
      const testCase = forceArray(ruleConfig.case)
      testCase.forEach( c => {
        let dispatchAction = ruleConfig.dispatch
    
        if (typeof ruleConfig.dispatch === 'string') {
          dispatchAction = {...action, type: ruleConfig.dispatch}
        }
    
        if (action.type === c) {
          matched = true
          delayDubounce(action, ruleConfig, () => {
            if (dispatchAction) {
              internalNext(dispatchAction)
            }

            let requestConfig = ruleConfig.request
            if (ruleConfig.get) {
              requestConfig = {...ruleConfig.get, method: 'GET'}
            }
            if (ruleConfig.post) {
              requestConfig = {...ruleConfig.post, method: 'POST'}
            }
            if (ruleConfig.put) {
              requestConfig = {...ruleConfig.put, method: 'PUT'}
            }
            if (ruleConfig.patch) {
              requestConfig = {...ruleConfig.patch, method: 'PATCH'}
            }
            if (ruleConfig.del) {
              requestConfig = {...ruleConfig.del, method: 'DELETE'}
            }
            if (ruleConfig.head) {
              requestConfig = {...ruleConfig.head, method: 'HEAD'}
            }
            if (ruleConfig.options) {
              requestConfig = {...ruleConfig.options, method: 'OPTIONS'}
            }

            if (requestConfig) {
              request({
                json: true,
                ...requestConfig,
                callback: function (err, res) {
                  if (err && requestConfig.onFail) {
                    let onFailAction = requestConfig.onFail
                    if (typeof requestConfig.onFail === 'string') {
                      onFailAction = {type: requestConfig.onFail}
                    } else if (typeof requestConfig.onFail === 'function') {
                      onFailAction = requestConfig.onFail(res)
                    }
                    internalNext(onFailAction)
                  }
                  if (!err && requestConfig.onSuccess) {
                    let onSuccessAction = requestConfig.onSuccess
                    if (typeof requestConfig.onSuccess === 'string') {
                      onSuccessAction = {type: requestConfig.onSuccess}
                    } else if (typeof requestConfig.onSuccess === 'function') {
                      onSuccessAction = requestConfig.onSuccess(res)
                    }
                    internalNext(onSuccessAction)
                  }

                  if (requestConfig.callback) {
                    requestConfig.callback(err, res)
                  }
                }
              })
            }
          })
          
        }
      })
    })
    return matched
  }
  checkAction(originalAction)
}


export default orchestrate
