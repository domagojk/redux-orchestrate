import axios from 'axios'
const CancelToken = axios.CancelToken

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
    
        let requestConfig = ruleConfig.request
        if (ruleConfig.get) {
          requestConfig = {...ruleConfig.get, method: 'get'}
        }
        if (ruleConfig.post) {
          requestConfig = {...ruleConfig.post, method: 'post'}
        }
        if (ruleConfig.put) {
          requestConfig = {...ruleConfig.put, method: 'put'}
        }
        if (ruleConfig.patch) {
          requestConfig = {...ruleConfig.patch, method: 'patch'}
        }
        if (ruleConfig.del) {
          requestConfig = {...ruleConfig.del, method: 'delete'}
        }
        if (ruleConfig.head) {
          requestConfig = {...ruleConfig.head, method: 'head'}
        }
        if (ruleConfig.options) {
          requestConfig = {...ruleConfig.options, method: 'options'}
        }
        
        if (
          rule._cancelFn &&
          requestConfig && 
          requestConfig.cancelWhen && 
          requestConfig.cancelWhen.indexOf(action.type) !== -1
        ) {
          rule._cancelFn()
        }

        if (action.type === c) {
          matched = true
          delayDubounce(action, ruleConfig, () => {
            if (dispatchAction) {
              internalNext(dispatchAction)
            }

            if (requestConfig) {
              axios({
                ...requestConfig,
                cancelToken: new CancelToken(c => rule._cancelFn = c)
              })
                .then(res => {
                  if (requestConfig.onSuccess) {
                    let onSuccessAction = requestConfig.onSuccess
                    if (typeof requestConfig.onSuccess === 'string') {
                      onSuccessAction = {type: requestConfig.onSuccess}
                    } else if (typeof requestConfig.onSuccess === 'function') {
                      onSuccessAction = requestConfig.onSuccess(res)
                    }
                    internalNext(onSuccessAction)
                  }

                  if (requestConfig.callback) {
                    requestConfig.callback(null, res)
                  }
                })
                .catch(err => {
                  if (
                    requestConfig.onFail &&
                    !(err && err.message && err.message.type === 'CANCEL_EVENT')
                  ) {
                    let onFailAction = requestConfig.onFail
                    if (typeof requestConfig.onFail === 'string') {
                      onFailAction = {type: requestConfig.onFail}
                    } else if (typeof requestConfig.onFail === 'function') {
                      onFailAction = requestConfig.onFail(res)
                    }
                    internalNext(onFailAction)
                  }

                  if (requestConfig.callback) {
                    requestConfig.callback(err)
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
