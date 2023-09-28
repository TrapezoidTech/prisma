import { toMatchInlineSnapshot, toMatchSnapshot } from 'jest-snapshot'
import stripAnsi from 'strip-ansi'

process.env.PRISMA_HIDE_PREVIEW_FLAG_WARNINGS = 'true'

expect.extend({
  toMatchPrismaErrorSnapshot(received: unknown) {
    if (!(received instanceof Error)) {
      return {
        message: () => 'Expected instance of error',
        pass: false,
      }
    }
    // @ts-expect-error: jest-snapshot and jest typings are incompatible,
    // even though custom snapshot matchers supposed to work this way
    return toMatchSnapshot.call(this, sanitizeLineNumbers(received.message))
  },

  toMatchPrismaErrorInlineSnapshot(received: unknown, ...rest: unknown[]) {
    if (!(received instanceof Error)) {
      return {
        message: () => 'Expected instance of error',
        pass: false,
      }
    }

    // @ts-expect-error: jest-snapshot and jest typings are incompatible,
    // even though custom snapshot matchers supposed to work this way
    return toMatchInlineSnapshot.call(this, sanitizeLineNumbers(received.message), ...rest)
  },
})

function sanitizeLineNumbers(message: string) {
  return stripAnsi(message).replace(/^(\s*→?\s+)\d+/gm, '$1XX')
}

/**
 * Utility that busts test flakiness by running the same test multiple times.
 * This is especially useful for tests that fail locally but not on CI.
 * @param n Number of times to repeat the test
 * @returns
 */
function testRepeat(n: number) {
  const getRepeatProxy = (jestCall: jest.It) => {
    return new Proxy(jestCall, {
      // re-wrap the jest call to be repeated
      apply(target, thisArg, [name, cb, timeout]) {
        for (let i = 0; i < n; i++) {
          target(`${name} #${i}`, cb, timeout)
        }
      },
      // if not a call but eg. jest.concurrent
      get(target, prop) {
        return getRepeatProxy(target[prop])
      },
    })
  }

  return getRepeatProxy(test)
}

// allows to .skip.skip.skip... a test
const skip = new Proxy(it.skip, {
  get(target, prop) {
    if (prop === 'skip') return it.skip
    return target[prop]
  },
})

globalThis.beforeAll = process.env.TEST_GENERATE_ONLY === 'true' ? () => {} : beforeAll
globalThis.afterAll = process.env.TEST_GENERATE_ONLY === 'true' ? () => {} : afterAll
globalThis.beforeEach = process.env.TEST_GENERATE_ONLY === 'true' ? () => {} : beforeEach
globalThis.afterEach = process.env.TEST_GENERATE_ONLY === 'true' ? () => {} : afterEach
globalThis.test = process.env.TEST_GENERATE_ONLY === 'true' ? skip : test
globalThis.testIf = (condition) => (condition && process.env.TEST_GENERATE_ONLY !== 'true' ? test : skip)
globalThis.describeIf = (condition) => (condition ? describe : describe.skip)
globalThis.testRepeat = testRepeat
globalThis.$test = (config) => {
  // the order of the if statements is important here
  if (process.env.TEST_GENERATE_ONLY === 'true') return skip
  if (config.runIf === false) return test.skip
  if (config.skipIf === true) return test.skip
  if (config.failIf === true) return test.failing

  return test
}
globalThis.$beforeAll = (config) => createCustomJestLifecycleFunction(config, beforeAll)
globalThis.$beforeEach = (config) => createCustomJestLifecycleFunction(config, beforeEach)
globalThis.$afterAll = (config) => createCustomJestLifecycleFunction(config, afterAll)
globalThis.$afterEach = (config) => createCustomJestLifecycleFunction(config, afterEach)

function createCustomJestLifecycleFunction(config: any, jestCall: jest.Lifecycle): jest.Lifecycle {
  return (fn, timeout) => {
    if (config.failIf === true) {
      return jestCall(async () => {
        try {
          await (jestCall as any)()
        } catch (e) {}
      }, timeout)
    }

    return jestCall(fn, timeout)
  }
}

export {}
