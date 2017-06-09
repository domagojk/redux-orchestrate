[![Build Status](https://travis-ci.org/domagojk/redux-orchestrate.svg?branch=master)](https://travis-ci.org/domagojk/redux-orchestrate)
[![codecov](https://codecov.io/gh/domagojk/redux-orchestrate/branch/master/graph/badge.svg)](https://codecov.io/gh/domagojk/redux-orchestrate)
[![NPM Status](https://img.shields.io/npm/v/redux-orchestrate.svg?style=flat-square)](https://www.npmjs.com/package/redux-orchestrate)
[![NPM Status](https://img.shields.io/npm/l/redux-orchestrate.svg?style=flat-square)](https://github.com/domagojk/redux-orchestrate/blob/master/LICENSE)

# Redux Orchestrate
Simple alternative to [redux-saga](https://github.com/redux-saga/redux-saga) or [redux-observable](https://github.com/redux-observable/redux-observable).

Rather than using generators or Observables, most common operations are defined with a simple config object.

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

### Tranform
In case  of action(s) `X` -> dispatch action(s) `Y`

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

### Cascade
In case of action(s) `X` -> dispatch action(s) `Y`

In case of action(s) `Y` -> dispatch action(s) `Z`

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
    dispatch: [
      ANOTHER_ACTION,
      ONE_MORE
    ]
  }
]
```

### Delay
In case of action(s) `X` -> wait for `k` miliseconds -> dispatch action(s) `Y`

```javascript
const processManager = [
  {
    case: [
      SEND_MESSAGE_BUTTON_CLICKED,
      MESSAGE_INPUT_ENTER_KEY_PRESSED
    ],
    delay: 500
    dispatch: ADD_MESSAGE
  }
]
```

### Debounce
In case of action(s) `X` -> debounce for `k` miliseconds -> dispatch action(s) `Y`

```javascript
const processManager = [
  {
    case: [
      SEND_MESSAGE_BUTTON_CLICKED,
      MESSAGE_INPUT_ENTER_KEY_PRESSED
    ],
    debounce: 500
    dispatch: ADD_MESSAGE
  }
]
```

### Dispatch Logic
In case of action(s) `X` -> perform logic using orignal `action` and `state` -> dispatch action(s) `Y`

```javascript
const processManager = [
  {
    case: [
      SEND_MESSAGE_BUTTON_CLICKED,
      MESSAGE_INPUT_ENTER_KEY_PRESSED
    ],
    dispatch: (action, state) => {
      if (state.canAddMessage) {
        return { ...action, type: ADD_MESSAGE }
      }
    }
  }
]
```

### Ajax Request
In case of action(s) `X` -> make an ajax request -> 

  -> in case of `success` -> dispatch `Y`

  -> in case of `failure` -> dispatch `Z`

```javascript
const processManager = [
  {
    case: ADD_MESSAGE,
    get: {
      url: 'https://server.com',
      onSuccess: MESSAGE_SENT,
      onFail: MESSAGE_SENDING_ERROR,
    }
  }
]
```

```javascript
const processManager = [
  {
    case: ADD_MESSAGE,
    post: action => ({
      url: 'https://server.com/new',
      data: {
        content: action.payload
      },
      onSuccess: { type: MESSAGE_SENT, id: a.id },
      onFail: { type: MESSAGE_SENDING_ERROR, id: a.id }
    })
  }
]
```

```javascript
const processManager = [
  {
    case: ADD_MESSAGE,
    post: action => ({
      url: 'https://server.com/new',
      data: {
        content: action.payload
      },
      onSuccess: res => ({ 
        type: MESSAGE_SENT,
        dataFromRes: res.data
        id: a.id 
      }),
      onFail: err => ({
        type: MESSAGE_SENDING_ERROR,
        errorMessage: err.message
        id: a.id 
      })
    })
  }
]
```

### Request Cancelation
In case of action(s) `X` -> make an ajax request -> 

in case of action(s) `Y` -> cancel ajax request

```javascript
const processManager = [
  {
    case: ADD_MESSAGE,
    post: {
      url: `http://server.com`,
      cancelWhen: [
        STOP_SENDING
      ],
      onSuccess: MESSAGE_SENT
    }
  }
]
```

### Autocomplete example
Now let's say we need to implement an autocomplete feature.
In short, these are feature requirements:
- Any time the user changes an input field, make a network request
- If network request is not completed, but user had changed the input field again, cancel the previous request
- Don't spam "suggestion server". Make the request when user had stopped typing, by debouncing its events.

```javascript
const processManager = [
  {
    case: SEARCH_INPUT_CHARACTER_ENTERED,   // in case user has changed an input field
    debounce: 500,                          // wait for user to stop typing (debouncing by 500ms)
    get: action => ({
      url: `http://s.co/${action.payload}`, // make a get request to a "suggestion server"
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

### Cascade - more complex example 

```javascript
const processManager = [
  {
    case: ADD_MESSAGE,
    post: (action, state) => ({
      url: 'https://chat.app.com/new',
      data: {
        content: action.payload
      },
      onSuccess: () => {
        if (state.canMarkAsSent) {
          return { ...action, type: MESSAGE_SENT }
        } else {
          return { ...action, type: FOR_SOME_REASON_THIS_IS_DISPATHCED }
        }
       }
    })
  },
  {
    case: FOR_SOME_REASON_THIS_IS_DISPATHCED
    post: (action, state) => ({
      url: 'https://what.is.happening',
      data: {
        content: action.payload
      },
      onSuccess: MESSAGE_SENT,
      onFail: MESSAGE_SENDING_ERROR
    })
  }
]
```

## FAQ

### Ok, but what about other kind of async operations?
This middleware is not an attempt to solve all your problems. If you need to handle more complex async operations which are better solved by some other tools (generators, observables), then you should use middlewares that supports them or define your own ([it's not that hard](http://redux.js.org/docs/advanced/Middleware.html)). 

Also, don't forget that you can combine multiple middlewares.

**Note**: additional operators could be supported in the future (but only if they don't significantly complicate the existing API).

### Can I use custom headers or similar options for ajax requests?
Yes.

redux-orchestrate uses [axios](https://github.com/mzabriskie/axios) for making network requests.

All options passed in `request` (or aliases like `post`, `get`, etc.) is mapped with [axios request config](https://github.com/mzabriskie/axios#request-config)

### What is a process manager?
Config object which defines the middleware logic is here reffered as "process manager".

This term is borrowed from [CQRS/ES terminology](https://msdn.microsoft.com/en-us/library/jj591569.aspx) where the same concept is also referred as "saga" - "a piece of code that coordinates and routes messages between *bounded contexts* and *aggregates*".

### Why "orchestrate"?
Term "orchestrate" is used to reffer to a single, central point for coordinating multiple entities and making them less coupled.

This is a broad term, usually used in [service-oriented arhitectures](https://en.wikipedia.org/wiki/Service-oriented_architecture) and [compared with its opossite concept](https://www.infoq.com/news/2008/09/Orchestration) - "choreography"

## API

### Applying middleware:
`orchestrate(processManager, options)`

### Process Manager
The main array of objects defining action coordination.

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
