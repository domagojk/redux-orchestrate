import request from 'request'

function forceArray (arr) {
  if (!Array.isArray(arr)) return [arr]
  return arr
}


function dispatch (next, action, { debounce, delay, _debounceTimeoutRefs }) {
  let dispatch = next
  if (delay) {
    dispatch = (action) => setTimeout(() => next(action), delay)
  }

  if (debounce) {
    clearTimeout(_debounceTimeoutRefs[action.type])
    _debounceTimeoutRefs[action.type] = setTimeout(() => {
      delete _debounceTimeoutRefs[action.type]
      dispatch(action)
    }, debounce)

  } else {
    dispatch(action)
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
      if (typeof ruleConfig.dispatch === 'string') {
        dispatchAction = {...action, type: ruleConfig.dispatch}
      }
      if (action.type === c) {
        dispatch(next, dispatchAction, ruleConfig)
      }
    })
  })
}

export default orchestration
