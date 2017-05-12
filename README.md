[![Build Status](https://travis-ci.org/domagojk/redux-orchestrate.svg?branch=master)](https://travis-ci.org/domagojk/redux-orchestrate)
[![codecov](https://codecov.io/gh/domagojk/redux-orchestrate/branch/master/graph/badge.svg)](https://codecov.io/gh/domagojk/redux-orchestrate)
[![NPM Status](https://img.shields.io/npm/v/redux-orchestrate.svg?style=flat-square)](https://www.npmjs.com/package/redux-orchestrate)
[![NPM Status](https://img.shields.io/npm/l/redux-orchestrate.svg?style=flat-square)](https://github.com/domagojk/redux-orchestrate/blob/master/LICENSE)

# Redux Orchestrate
redux-orchestrate acts like a central coordinator for dispatched actions.

The concept is similar to middlewares like [redux-observable](https://github.com/redux-observable/redux-observable) and [redux-saga](https://github.com/redux-saga/redux-saga) however it is **less powerful**, but **more simple**.

Rather then using generators or Observables, everything is defined using an array of objects.

## Installation
```bash
npm install --save redux-orchestrate
```

## Usage
```javascript
import { createStore, applyMiddleware } from 'redux'
import orchestrate from 'redux-orchestrate'
import reducer from './reducers'

const processManager = [
  // process manager logic
]

const store = createStore(reducer, applyMiddleware(orchestrate(processManager)))
```

### Tranforming actions
Suppose you are building a facebook-like chat app.
Any time `ADD_MESSAGE` action is dispatched, redux reducer is pushing messages in an array.

`ADD_MESSAGE` is dispatched when an user clicks on a *send button* or hits the enter key.

But by directly dispatching `ADD_MESSAGE`, your component must be aware of its enviroment.
What if, later on, you decide to ignore enter key strokes or better still, change `ADD_MESSAGE` to something like `SHOW_MESSAGE_PREVIEW`?

It's probably better to **describe what actually happened** rather than expressing your intent and **trasform** those actions into something you will use in reducer:

```javascript
const processManager = [
  {
    case: [
      SEND_MESSAGE_BUTTON_CLICKED,
      MESSAGE_INPUT_ENTER_KEY_PRESSED
    ],
    dispatch: ADD_MESSAGE
  }
]
```

### Handling side-effects
Suppose this *send button* in our imaginary app is used much more rarely than pressing the enter key.
Maybe we should remove it then?

Luckily, we decided to dispatch facts rather then intents, so we can distinguish an enter key from a button click.

All we need to do now, is send this data to some server:

```javascript
const processManager = [
  {
    case: [
      SEND_MESSAGE_BUTTON_CLICKED,
      MESSAGE_INPUT_ENTER_KEY_PRESSED
    ],
    dispatch: ADD_MESSAGE
  },
  {
   case: [
      // list of all events we wish to track
      SEND_MESSAGE_BUTTON_CLICKED,
      MESSAGE_INPUT_ENTER_KEY_PRESSED,
      MESSAGE_DELETE_BUTTON_CLICKED
    ],
    post: action => ({
      url: 'https://analytics.server.com',
      data: {
        event: action.type
      }
    })
  }
]
```

But what if a network response is an integral part of our app?

For example, chat apps often have a feature of flagging messages based on its status (`sending`, `sent`, `error_sending`).

But, to confirm whether a message has been sent, we need to know if a network request succeeded or failed.

By default, new messages can be rendered with `sending` flag,
then if an ajax request is completed we flag it to `sent` or `error_sending` by dispatching appropriate actions:

```javascript
const processManager = [
  {
    case: [
      SEND_MESSAGE_BUTTON_CLICKED,
      MESSAGE_INPUT_ENTER_KEY_PRESSED
    ],
    dispatch: ADD_MESSAGE
  },
  {
    case: ADD_MESSAGE,
    post: a => ({
      url: 'https://chat.app.com/new',
      data: {
        content: a.payload
      },
      onSuccess: { type: MESSAGE_SENT, id: a.id },
      onFail: { type: MESSAGE_SENDING_ERROR, id: a.id },
    })
  }
]
```

### Debouncing and canceling
Now let's say we need to implement an autocomplete feature.
In short, these are feature requirements:
- Any time the user changes an input field, make a network request
- If network request is not completed, but user had changed the input field again, cancel the previous request
- Don't spam "suggestion server". Make the request when user had stopped typing, by debouncing its events.

```javascript
const processManager = [
  {
    case: SEARCH_INPUT_CHARACTER_ENTERED,   // in case user has changed an input field
    debounce: 500,                            // wait for user to stop typing (debouncing by 500ms)
    get: action => ({
      url: `http://s.com/${action.payload}`,  // make a get request to a "suggestion server"
      cancelWhen: [
        SEARCH_INPUT_CHARACTER_ENTERED,     // in case user starts typing again, cancel request
        SEARCH_INPUT_BLURED                 // in case user is not using an input field, cancel request
      ],
      onSuccess: res => ({
        type: AUTOCOMPLETE_SUGGESTION,      // if query was successful, dispatch an event
        payload: res.data 
      })
    })
  }
]
```

## FAQ

### What about other kind of async operations?
For handling side-effects, this middleware supports:
- making a network request
- canceling pending network requests
- debouncing
- delaying

If these operations are not enough for your use-case, you should use another middleware (alongside this one or all together).
My suggestion is [redux-observable](https://github.com/redux-observable/redux-observable).

**Note**: additional operators could be supported in the future (but only if they will not require for current API to change, making it more complex).

### Can I use custom headers or similar options for ajax requests?
Yes.

redux-orchestrate uses [axios](https://github.com/mzabriskie/axios) for making network requests.

All options passed in `request` (or aliases like `post`, `get`, etc.) is mapped with [axios request config](https://github.com/mzabriskie/axios#request-config)

## API

### Applying middleware:
`orchestrate(processManager, options)`

### Process Manager
The main array of objects defining action coordination.

A term "process manager" is borrowed from [CQRS/ES terminology](https://msdn.microsoft.com/en-us/library/jj591569.aspx) which has a similar function in these systems.

```javascript
const processManager = [
  {
    case: [
      IN_CASE_THIS_EVENT_IS_DISPATCHED,
      OR_THIS_EVENT
    ],
    dispatch: DISPATCH_THAT_EVENT,
    debounce: 500,
    delay: 500,
    request: {
      method: 'get',
      url: 'url',
      cancelWhen: [
        IF_REQUEST_IS_PENDING_CANCEL_IT_WHEN_THIS_IS_DISPATCHED,
        OR_THIS
      ],
      onSuccess: DISPATCH_THIS_IF_AJAX_SUCCEDED
      onFail: DISPATCH_THIS_IF_AJAX_FAILED,
      // other axios props
    }
  }
]
```

#### Case
Proceed with dispatching or making a request if action type is matched with the one defined in `case`.

```javascript
{
  // string
  case: 'EVENT',
  // array
  case: [
    'EVENT_1',
    'EVENT_2'
  ],
  // function
  case: (action, state) => `PREFIX_${action.type}`
}
```

#### Dispatch
Synchronously dispatch an action

```javascript
{
  // string
  dispatch: 'EVENT', // dispatch action results in { type: 'EVENT' }
  // function
  dispatch: (action, state) => ({ type: `PREFIX_${action.type}` })
}
```

#### Request
Make an ajax request using [axios](https://github.com/mzabriskie/axios) library.

```javascript
{
  // object
  request: {
    method: 'get',
    url: 'url',
    cancelWhen: [
      'IF_REQUEST_IS_PENDING_CANCEL_IT_WHEN_THIS_IS_DISPATCHED',
      'OR_THIS'
    ],
    onSuccess: 'DISPATCH_THIS_IF_AJAX_SUCCEDED'
    onFail: 'DISPATCH_THIS_IF_AJAX_FAILED',
    // other axios props
  },
  // function
  request: (action, state) => { ... }
}
```
For convenience aliases have been provided for all supported request methods:

```javascript
{
  post: { ... },
  get: { ... },
  del: { ... },
  head: { ... },
  options: { ... },
  put: { ... }
  patch: { ... }
}
```

#### Debounce
Dispatch event or make a request, after an action is debounced

```javascript
{
  // integer
  debounce: 500, // in ms
  // function
  debounce: (action, state) => state.debounceConfig
}
```

#### Delay
Dispatch event or make a request, after an action is delayed

```javascript
{
  // integer
  delay: 500, // in ms
  // function
  delay: (action, state) => state.delayConfig
}
```

### Options

#### Validate
If defined, no events will reach a reducer unless it's defined in a process manager.

```javascript
{
  validate: false // default
}
```