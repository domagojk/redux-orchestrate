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

const orchestration = (config, options) => store => next => action => {
  if (!Array.isArray(config)) {
    throw new Error('Orchestration config must be an array')
  }

  if (!options || !options.validate) {
    next(action)
  }

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
      const requestConfig = ruleConfig.request
  
      if (typeof ruleConfig.dispatch === 'string') {
        dispatchAction = {...action, type: ruleConfig.dispatch}
      }
  
      if (action.type === c) {
        delayDubounce(action, ruleConfig, () => {
          if (dispatchAction) {
            next(dispatchAction)
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
                  next(onFailAction)
                }
                if (!err && requestConfig.onSuccess) {
                  let onSuccessAction = requestConfig.onSuccess
                  if (typeof requestConfig.onSuccess === 'string') {
                    onSuccessAction = {type: requestConfig.onSuccess}
                  } else if (typeof requestConfig.onSuccess === 'function') {
                    onSuccessAction = requestConfig.onSuccess(res)
                  }
                  next(onSuccessAction)
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
}

export default orchestration
