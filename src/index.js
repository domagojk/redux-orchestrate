import axios from 'axios'
import forceArray from './forceArray'
import timeTransform from './timeTransform'

const CancelToken = axios.CancelToken

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

        const supportMethods = {
          get: 'get',
          post: 'post',
          put: 'put',
          patch: 'patch',
          del: 'delete',
          head: 'head',
          options: 'options'
        }
        Object.keys(supportMethods).forEach(method => {
          if (ruleConfig[method]) {
            requestConfig = {...ruleConfig[method], method: supportMethods[method]}
          }
        })
        
        if (
          rule._cancelFn &&
          requestConfig && 
          requestConfig.cancelWhen && 
          requestConfig.cancelWhen.indexOf(action.type) !== -1
        ) {
          rule._cancelFn()
        }

        if (action.type === c) {
          timeTransform(action, ruleConfig, () => {
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
                      onSuccessAction = requestConfig.onSuccess(res, action)
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
                      onFailAction = requestConfig.onFail(err, action)
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
  }
  checkAction(originalAction)
}


export default orchestrate
