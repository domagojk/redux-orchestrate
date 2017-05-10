import orchestration from './index'
import { createStore, applyMiddleware } from 'redux'

function getLastAction(config, options, testAction) {
  let lastAction
  const reducer = (state = {testState: 'testState'}, action) => {
    lastAction = action
    return state
  }
  const store = createStore(reducer, applyMiddleware(orchestration(config, options)))
  store.dispatch(testAction)
  return lastAction
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

it('should transform action', () => {
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

it('should transform action (case array format)', () => {
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

it('should transform action (case array format, dispatch object)', () => {
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

it('should transform action (dispatch function)', () => {
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

it('multiple rules', () => {
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