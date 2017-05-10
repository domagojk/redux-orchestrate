import orchestrate from '../src/index'
import { createStore, applyMiddleware } from 'redux'

function getActions(config, options, dispatcher) {
  const actions = []
  const reducer = (state = {testState: 'testState'}, action) => {
    actions.push(action)
    return state
  }
  const store = createStore(reducer, applyMiddleware(orchestrate(config, options)))
  
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

it('should transform actions - cascade', () => {
  const options = { validate: true }
  const config = [
    {
      case: 'TEST',
      dispatch: 'AFTER_ORCHESTRATION'
    },
    {
      case: 'AFTER_ORCHESTRATION',
      dispatch: 'AFTER_AFTER_ORCHESTRATION'
    }
  ]

  expect(getLastAction(config, options, { type: 'TEST' }))
    .toEqual({ type: 'AFTER_AFTER_ORCHESTRATION' })
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
  const store = createStore(reducer, applyMiddleware(orchestrate(config, options)))
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
  const store = createStore(reducer, applyMiddleware(orchestrate(config, options)))
  
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
  const store = createStore(reducer, applyMiddleware(orchestrate(config, options)))
  
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

it('should fail sending request', (done) => {
  const actions = []
  const options = { validate: true }
  const config = [
    {
      case: 'ADD_MESSAGE_REQUESTED',
      request: {
        url: 'https://non.existing.c',
        headers: {
          'User-Agent': 'jest-test-request'
        },
        onSuccess: 'ADD_MESSAGE_SUCCEEDED',
        onFail: 'ADD_MESSAGE_FAILED',
        callback: () => {
          if (actions[1].type === 'ADD_MESSAGE_FAILED') {
            done()
          }
        }
      }
    }
  ]

  const reducer = (state, action) => {
    actions.push(action)
    return state
  }
  const store = createStore(reducer, applyMiddleware(orchestrate(config, options)))
  store.dispatch({ type: 'ADD_MESSAGE_REQUESTED' })
})

it('should fail sending request - post', (done) => {
  const actions = []
  const options = { validate: true }
  const config = [
    {
      case: 'ADD_MESSAGE_REQUESTED',
      post: {
        url: 'https://non.existing.c',
        headers: {
          'User-Agent': 'jest-test-request'
        },
        onSuccess: 'ADD_MESSAGE_SUCCEEDED',
        onFail: 'ADD_MESSAGE_FAILED',
        callback: (err) => {
          if (actions[1].type === 'ADD_MESSAGE_FAILED') {
            done()
          }
        }
      }
    }
  ]

  const reducer = (state, action) => {
    actions.push(action)
    return state
  }
  const store = createStore(reducer, applyMiddleware(orchestrate(config, options)))
  store.dispatch({ type: 'ADD_MESSAGE_REQUESTED' })
})

it('should send request', (done) => {
  // this test is depending on github api
  const actions = []
  const options = { validate: true }
  const config = [
    {
      case: 'ADD_MESSAGE_REQUESTED',
      request: {
        url: 'https://api.github.com/users/test',
        headers: {
          'User-Agent': 'jest-test-request'
        },
        onSuccess: res => ({ type: 'ADD_MESSAGE_SUCCEEDED', payload: res.body }),
        onFail: 'ADD_MESSAGE_FAILED',
        callback: () => {
          if (actions[1].type === 'ADD_MESSAGE_SUCCEEDED' && actions[1].payload.login === 'test') {
            done()
          }
        }
      }
    }
  ]

  const reducer = (state, action) => {
    actions.push(action)
    return state
  }
  const store = createStore(reducer, applyMiddleware(orchestrate(config, options)))
  store.dispatch({ type: 'ADD_MESSAGE_REQUESTED' })
})

it('should transform actions - cascade debounce', (done) => {
  const options = { validate: true }
  const config = [
    {
      case: [
			  'CHAT_INPUT_SUBMITTED',
			  'MESSANGER_INPUT_SUBMITED'
		  ],
      dispatch: 'ADD_MESSAGE_REQUESTED'
    },
    {
      case: 'ADD_MESSAGE_REQUESTED',
      dispatch: 'SECOND',
      debounce: 100
    }
  ]

  const actions = []
  const reducer = (state, action) => {
    actions.push(action)
    return state
  }
  const store = createStore(reducer, applyMiddleware(orchestrate(config, options)))
  store.dispatch({ type: 'CHAT_INPUT_SUBMITTED' })
  store.dispatch({ type: 'MESSANGER_INPUT_SUBMITED' })
  store.dispatch({ type: 'CHAT_INPUT_SUBMITTED' })
  
  setTimeout(() => {
    if (
      actions[1].type === 'ADD_MESSAGE_REQUESTED',
      actions[2].type === 'ADD_MESSAGE_REQUESTED',
      actions[3].type === 'ADD_MESSAGE_REQUESTED',
      actions[4].type === 'SECOND'
    ) {
      done()
    } else {
      done.fail()
    }
  }, 200)
  
})

it('should fail sending request - debounce', (done) => {
  const actions = []
  const options = { validate: true }
  const config = [
    {
      case: [
			  'CHAT_INPUT_SUBMITTED',
			  'MESSANGER_INPUT_SUBMITED'
		  ],
      dispatch: 'ADD_MESSAGE_REQUESTED'
    },
    {
      case: 'ADD_MESSAGE_REQUESTED',
      debounce: 200,
      request: {
        url: 'https://non.existing.c',
        headers: {
          'User-Agent': 'jest-test-request'
        },
        onSuccess: 'ADD_MESSAGE_SUCCEEDED',
        onFail: 'ADD_MESSAGE_FAILED',
        callback: () => {
          if (
            actions[1].type === 'ADD_MESSAGE_REQUESTED',
            actions[2].type === 'ADD_MESSAGE_REQUESTED',
            actions[3].type === 'ADD_MESSAGE_REQUESTED',
            actions[4].type === 'ADD_MESSAGE_FAILED'
          ) {
            done()
          } else {
            done.fail()
          }
        }
      }
    }
  ]

  const reducer = (state, action) => {
    actions.push(action)
    return state
  }
  const store = createStore(reducer, applyMiddleware(orchestrate(config, options)))
  store.dispatch({ type: 'CHAT_INPUT_SUBMITTED' })
  store.dispatch({ type: 'MESSANGER_INPUT_SUBMITED' })
  store.dispatch({ type: 'CHAT_INPUT_SUBMITTED' })
})

it('should cancel sending request', (done) => {
  const actions = []
  const options = { validate: true }
  const config = [
    {
      case: 'ADD_MESSAGE_REQUESTED',
      request: {
        url: 'https://api.github.com/users/test',
        headers: {
          'User-Agent': 'jest-test-request'
        },
        onFail: 'ON_FAIL',
        onSuccess: 'ON_SUCCESS',
        cancelWhen: [
          'CANCEL_EVENT',
          'CANCEL_EVENT_SECOND'
        ]
      }
    }
  ]

  const reducer = (state, action) => {
    actions.push(action)
    return state
  }
  const store = createStore(reducer, applyMiddleware(orchestrate(config, options)))
  store.dispatch({ type: 'ADD_MESSAGE_REQUESTED' })

  setTimeout(() => {
    store.dispatch({ type: 'CANCEL_EVENT' })
  }, 50)

  setTimeout(() => {
    if (actions.length === 1) {
      done()
    } else {
      done.fail()
    }
  }, 100)
})