import timeTransform from './timeTransform'

it('should invoke callback', (done) => {
  const action = { type: 'TEST_ACTION' }
  const options = {}

  timeTransform(action, options, function () {
    done()
  })
})

it('should invoke callback synchonously', (done) => {
  const action = { type: 'TEST_ACTION' }
  const options = {}

  let async = false
  timeTransform(action, options, function () {
    if (async === false) {
      done()
    } else {
      done.fail('callback not synchronous')
    }
  })
  async = true
})

it('should invoke callback asynchronously (delay)', (done) => {
  const action = { type: 'TEST_ACTION' }
  const options = { 
    delay: 100
  }

  let async = false
  timeTransform(action, options, function () {
    if (async) {
      done()
    } else {
      done.fail('callback not asynchronous')
    }
  })
  async = true
})

it('should not debounce calls', (done) => {
  const action = { type: 'TEST_ACTION' }
  const options = { }

  let called = 0
  timeTransform(action, options, function () {
    called++
  })
  timeTransform(action, options, function () {
    called++
  })
  timeTransform(action, options, function () {
    called++
  })
  timeTransform(action, options, function () {
    called++
  })

  setTimeout(function () {
    if (called === 4) {
      done()
    } else {
      done.fail()
    }
  }, 0)
})

it('should debounce calls', (done) => {
  const action = { type: 'TEST_ACTION' }
  const options = { 
    debounce: 100,
    _debounceTimeoutRefs: {}
  }

  let called = 0
  timeTransform(action, options, function () {
    called++
  })
  timeTransform(action, options, function () {
    called++
  })
  timeTransform(action, options, function () {
    called++
  })
  timeTransform(action, options, function () {
    called++
  })

  setTimeout(function () {
    if (called === 1) {
      done()
    } else {
      done.fail()
    }
  }, 200)
})
