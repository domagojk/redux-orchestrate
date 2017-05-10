import orchestration from './index'
import { createStore, applyMiddleware } from 'redux'

/*
[
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

function getActions(config, options, dispatcher) {
  const actions = []
  const reducer = (state = {testState: 'testState'}, action) => {
    actions.push(action)
    return state
  }
  const store = createStore(reducer, applyMiddleware(orchestration(config, options)))
  
  dispatcher(store.dispatch)

  return actions
}

function getLastAction(config, options, testAction) {
  const actions = getActions(config, options, function (dispatch) {
    dispatch(testAction)
  })
  return actions[actions.length - 1]
}


it('should dispatch action', () => {
  const testAction = { type: 'TEST' }
  const options = { validate: false }
  const config = []

  expect(getLastAction(config, options, testAction))
    .toEqual(testAction)
})

it('should not dispatch action', () => {
  const testAction = { type: 'TEST' }
  const options = { validate: true }
  const config = []

  expect(getLastAction(config, options, testAction))
    .not.toEqual(testAction)
})

it('should transform actions', () => {
  const testAction = { type: 'TEST' }
  const options = { validate: true }
  const config = [
    {
      case: 'TEST',
      dispatch: 'AFTER_ORCHESTRATION'
    }
  ]

  expect(getLastAction(config, options, testAction))
    .toEqual({ type: 'AFTER_ORCHESTRATION' })
})

it('should transform actions - case array format', () => {
  const options = { validate: true }
  const config = [
    {
      case: ['TEST', 'TEST2'],
      dispatch: 'AFTER_ORCHESTRATION'
    }
  ]

  expect(getLastAction(config, options, { type: 'TEST' }))
    .toEqual({ type: 'AFTER_ORCHESTRATION' })

  expect(getLastAction(config, options, { type: 'TEST2' }))
    .toEqual({ type: 'AFTER_ORCHESTRATION' })
})

it('should transform actions - dispatch object', () => {
  const options = { validate: true }
  const config = [
    {
      case: ['TEST', 'TEST2'],
      dispatch: { type: 'AFTER_ORCHESTRATION' }
    }
  ]

  expect(getLastAction(config, options, { type: 'TEST' }))
    .toEqual({ type: 'AFTER_ORCHESTRATION' })

  expect(getLastAction(config, options, { type: 'TEST2' }))
    .toEqual({ type: 'AFTER_ORCHESTRATION' })
})

it('should transform actions - dispatch function', () => {
  const testAction = { type: 'TEST' }
  const options = { validate: true }
  const config = [
    {
      case: 'TEST',
      dispatch: (a, s) => `AFTER_ORCHESTRATION_${a.type}_${s.testState}`
    }
  ]

  expect(getLastAction(config, options, testAction))
    .toEqual({ type: 'AFTER_ORCHESTRATION_TEST_testState' })
})

it('should transform actions - multiple rules', () => {
  const options = { validate: true }
  const config = [
    {
      case: 'TEST',
      dispatch: 'AFTER_ORCHESTRATION'
    },
    {
      case: 'TEST2',
      dispatch: 'AFTER_ORCHESTRATION2'
    }
  ]

  expect(getLastAction(config, options, { type: 'TEST' }))
    .toEqual({ type: 'AFTER_ORCHESTRATION' })
  
  expect(getLastAction(config, options, { type: 'TEST2' }))
    .toEqual({ type: 'AFTER_ORCHESTRATION2' })
})

it('should transform actions - delay', (done) => {
  const options = { validate: true }
  const config = [
    {
      case: 'TEST',
      dispatch: 'DEBOUNCED',
      delay: 50
    }
  ]

  const actions = []
  const reducer = (state, action) => {
    actions.push(action)
    return state
  }
  const store = createStore(reducer, applyMiddleware(orchestration(config, options)))
  store.dispatch({ type: 'TEST' })
    
  if (actions.length !== 1) {
    done.fail(`expected 1 dispatched action, got ${actions.length}`)
  }

  setTimeout(() => {
    if (actions.length === 2) {
      done()
    } else {
      done.fail(`expected 2 dispatched actions, got ${actions.length}`)
    }
  }, 100)
})

it('should transform actions - debounce', (done) => {
  const options = { validate: true }
  const config = [
    {
      case: 'TEST',
      dispatch: 'DEBOUNCED',
      debounce: 50
    },
    {
      case: 'TEST2',
      dispatch: 'DEBOUNCED',
      debounce: 50
    }
  ]

  const actions = []
  const reducer = (state, action) => {
    actions.push(action)
    return state
  }
  const store = createStore(reducer, applyMiddleware(orchestration(config, options)))
  
  store.dispatch({ type: 'TEST' })
  store.dispatch({ type: 'TEST' })
  store.dispatch({ type: 'TEST' })
  store.dispatch({ type: 'TEST2' })
  store.dispatch({ type: 'TEST2' })
  store.dispatch({ type: 'TEST2' })

  setTimeout(() => {
    const expectedNum = 3
    if (actions.length === expectedNum) {
      done()
    } else {
      done.fail(`expected ${expectedNum} dispatched actions, got ${actions.length}`)
    }
  }, 200)
})

it('should transform actions - delay debounce', (done) => {
  const options = { validate: true }
  const config = [
    {
      case: 'TEST',
      dispatch: 'DEBOUNCED',
      delay: 50,
      debounce: 50
    }
  ]

  const actions = []
  const reducer = (state, action) => {
    actions.push(action)
    return state
  }
  const store = createStore(reducer, applyMiddleware(orchestration(config, options)))
  
  store.dispatch({ type: 'TEST' })
  store.dispatch({ type: 'TEST' })
  store.dispatch({ type: 'TEST' })
  store.dispatch({ type: 'TEST' })
  store.dispatch({ type: 'TEST' })

  if (actions.length !== 1) {
    done.fail(`expected 1 dispatched action, got ${actions.length}`)
  }

  setTimeout(() => {
    const expectedNum = 2
    if (actions.length === expectedNum) {
      done()
    } else {
      done.fail(`expected ${expectedNum} dispatched actions, got ${actions.length}`)
    }
  }, 110)
})