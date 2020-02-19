const { MyPromise } = require('../output')

const testRunner = require('promises-aplus-tests')

testRunner(
  {
    // https://github.com/promises-aplus/promises-tests#adapters
    // only `deferred` is required
    deferred() {
      const struct = {}
      struct.promise = new MyPromise((resolve, reject) => {
        struct.resolve = resolve
        struct.reject = reject
      })
      return struct
    },
  },
  {
	  timeout: 2000,
  },
  function(err) {
    // All done; output is in the console. Or check `err` for number of failures.
  }
)
