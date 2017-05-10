import request from 'request'
/*
[
	{
		case: CHAT_INPUT_SUBMITTED,
		dispatch: ADD_MESSAGE_REQUESTED
	},
	{
		case: CHAT_INPUT_SUBMITTED,
		debounce: 400,
		delay: 400,
		dispatch: (a) => ({ ADD_MESSAGE_REQUESTED }),
	},
	{
		case: [
			CHAT_INPUT_SUBMITTED,
			MESSANGER_INPUT_SUBMITED
		],
		dispatch: ADD_MESSAGE_REQUESTED
	},
	{
		case: ADD_MESSAGE_REQUESTED,
		post: {
			url: something,
			onSuccess: ADD_MESSAGE_SUCCEEDED,
			onFail: ADD_MESSAGE_FAILED
		}
	},
	{
		case: SEARCH_INPUT_CHARACTER_ENTERED,
		debounce: 500,
		get: (a, s) => ({
			url: autocomplete/a.payload,
			cancelWhen: [
				SEARCH_INPUT_CHARACTER_ENTERED,
				SEARCH_INPUT_BLURED
			],
			onSuccess: AUTOCOMPLETE_SUGGESTION
		})
	},
	{
		case: [
			CHAT_INPUT_SUBMITTED,
			MESSANGER_INPUT_SUBMITED
		],
		debounce: 1000,
		post: {
			url: 'analyticsDb/action.type'
		}
	}
	{
		case: [
			CHAT_INPUT_SUBMITTED,
			MESSANGER_INPUT_SUBMITED
		],
		dispatch: { type: ADD_MESSAGE_REQUESTED, message: a.payload }
	},
	{
		case: MESSAGE_NOTIFICATION_RECIEVED,
		dispatch: { type: ADD_MESSAGE_SUCCEEDED, message: a.payload }
	},
	{
		case: ADD_MESSAGE_REQUESTED,
		request: {
			url: url,
			onSuccess: res => ({ type: ADD_MESSAGE_SUCCEEDED }),
			onFail: res => ({ type: ADD_MESSAGE_FAILED })
		}
	},
	{
		case: SEARCH_INPUT_CHARACTER_ENTERED,
		debounce: 500,
		post: {
			url: autocomplete/a.payload,
			cancelWhen: [
				SEARCH_INPUT_CHARACTER_ENTERED,
				SEARCH_INPUT_BLURED
			],
			onSuccess: res => ({ type: AUTOCOMPLETE_SUGGESTION })
		}
	},
	{
		case: SEARCH_INPUT_CHARACTER_ENTERED,
		dispatch: { type: AUTOCOMPLETE_SUGGESTION, payload: [] }
	},
	{
		case: [
			CHAT_INPUT_SUBMITTED,
			MESSANGER_INPUT_SUBMITED
		],
		debounce: 1000,
		request: {
			url: 'analyticsDb/a.type',
			onSuccess: null
			onFail:  null
		}
	}
]
*/
function forceArray (arr) {
  if (!Array.isArray(arr)) return [arr]
  return arr
}

const orchestration = (config, options) => store => next => action => {
  if (!Array.isArray(config)) {
    throw new Error('Orchestration config must be an array')
  }

  if (!options || !options.validate) {
    next(action)
  }

  config.forEach(rule => {
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
        next(dispatchAction)
      }
    })
  })
}

export default orchestration
