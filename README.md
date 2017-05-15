[![Build Status](https://travis-ci.org/domagojk/redux-orchestrate.svg?branch=master)](https://travis-ci.org/domagojk/redux-orchestrate)
[![codecov](https://codecov.io/gh/domagojk/redux-orchestrate/branch/master/graph/badge.svg)](https://codecov.io/gh/domagojk/redux-orchestrate)
[![NPM Status](https://img.shields.io/npm/v/redux-orchestrate.svg?style=flat-square)](https://www.npmjs.com/package/redux-orchestrate)
[![NPM Status](https://img.shields.io/npm/l/redux-orchestrate.svg?style=flat-square)](https://github.com/domagojk/redux-orchestrate/blob/master/LICENSE)

# Redux Orchestrate
The main idea behind this middleware is to implement a "process manager pattern" ([1](https://msdn.microsoft.com/en-us/library/jj591569.aspx), [2](https://survivejs.com/blog/redux-saga-interview/#sagas)) and support the most common operations with a simple config object.

This includes:
- intercepting and transforming actions
- making a network request
- cancelling pending network requests
- debouncing
- delaying

redux-orchestrate uses similar (DDD/ES/CQRS inspired) solution as in [redux-saga](https://github.com/redux-saga/redux-saga) and [redux-observable](https://github.com/redux-observable/redux-observable), but rather than using generators or Observables, everything is defined with an array of objects.

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

Why would you do this?

Well, suppose you are building a facebook-like chat app.
Every time the `ADD_MESSAGE` action is dispatched, redux reducer is pushing new messages to an array.

But, this approach forces component to be aware of its environment.
So, even though someone "had clicked on a send button", this fact is never dispatched and a decision on what should happen next is made at "the component level".

If however, there is a layer where you can **transform** `SEND_MESSAGE_BUTTON_CLICKED` to `ADD_MESSAGE`,
you would end up decoupling reducers from components, making both more isolated and reusable.

### Handling side-effects
What if, later on, you wish to do some analytics on your app?

For example, how often is *send button* used compared to pressing the enter key?

This is another benefit of dispatching **facts** rather then **intents**. You don't have to make a lot changes to your codebase, because you had already distinguish the enter key from a button click. 

All you need to do is define server endpoint which will collect these events:

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

But what if a network response is an integral part of your app?

For example, chat apps often have a feature of flagging messages based on its status (`sending`, `sent`, `error_sending`),
and to confirm whether a message has been sent, you need to know if a network request succeeded or failed.

For this kind of async operations you can use [observables](https://github.com/redux-observable/redux-observable), [generator functions](https://github.com/redux-saga/redux-saga) or [plain callbacks](https://github.com/gaearon/redux-thunk). 

But since using a network response for dispatching another action is so common, why not abstracting it?

```javascript
const processManager = [
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
### More complex logic
If you need to perform some kind of logic before dispatching another action, you can use the fact that `dispatch` and `request` (or aliases like `post`, `get`, etc.) can be defined as a function:

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

You can also "cascade definitions" to perform even more complex logic:

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

This term is borrowed from [CQRS/ES terminology](https://msdn.microsoft.com/en-us/library/jj591569.aspx) where the same concept is also reffered as "saga" - "a piece of code that coordinates and routes messages between *bounded contexts* and *aggregates*".

Also, the idea of using **facts** rather then **intents** suggested in examples, originates [from event sourced systems](https://www.youtube.com/watch?v=8JKjvY4etTY).

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
