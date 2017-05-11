function timeTransform (action, options, callback) {
  const { debounce, delay, _debounceTimeoutRefs } = options
  let cb = callback
  if (delay) {
    cb = (action) => setTimeout(() => callback(), delay)
  }

  if (debounce) {
    clearTimeout(_debounceTimeoutRefs[action.type])
    _debounceTimeoutRefs[action.type] = setTimeout(() => {
      delete _debounceTimeoutRefs[action.type]
      cb()
    }, debounce)

  } else {
    cb()
  }
}

export default timeTransform
