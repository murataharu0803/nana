import { defaultAction, defaultErrorHandler, defaultWrapper } from '@/interface/defaults'
import { NanaController } from '@/interface/NanaController'
import { NanaError } from '@/interface/NanaError'
import { NanaRouter } from '@/interface/NanaRouter'
import { NanaServer } from '@/interface/NanaServer'
import { Empty, GET } from '@/interface/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { testData, testNana } from '~/tests/util'

vi.mock('@/defaults', { spy: true })

describe('NanaController', () => {
  beforeEach(() => {
    vi.mock('@/defaults', { spy: true })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should construct', async() => {
    const dummyHandler = vi.fn()
    const middleware = new NanaController(dummyHandler)

    expect(middleware.handler).toBe(dummyHandler)
  })

  it('should handle with default functions', async() => {
    const server = new NanaServer()
    const dummyHandler = vi.fn(() => testData)
    server.get('/test', dummyHandler)

    await testNana(server, GET, '/test', 200, testData)
    expect(dummyHandler).toBeCalledTimes(1)
    expect(defaultAction).toBeCalledTimes(1)
    expect(defaultWrapper).toBeCalledTimes(1)
    expect(defaultErrorHandler).toBeCalledTimes(0)
  })

  it('should handle with no functions (typically this should not happen)', async() => {
    const server = new NanaServer()
    const dummyHandler = vi.fn(() => testData)
    const controller = new NanaController(dummyHandler)
    server.expressApp.get('/test', controller.finalHandler)

    await testNana(server, GET, '/test', 200, testData)
    expect(dummyHandler).toBeCalledTimes(1)
    expect(defaultAction).toBeCalledTimes(1)
    expect(defaultWrapper).toBeCalledTimes(1)
    expect(defaultErrorHandler).toBeCalledTimes(0)
  })

  it('should handle with custom functions', async() => {
    const server = new NanaServer()
    const dummyAction = vi.fn(defaultAction)
    const dummyWrapper = vi.fn(data => ({ nested: data }))
    const router = new NanaRouter<Empty>(
      dummyAction,
      dummyWrapper,
    )
    const dummyHandler = vi.fn(() => testData)
    router.get('/test', dummyHandler)

    server.useRoute('/api', router)

    await testNana(server, GET, '/api/test', 200, { nested: testData })
    expect(dummyHandler).toBeCalledTimes(1)
    expect(dummyAction).toBeCalledTimes(1)
    expect(dummyWrapper).toBeCalledTimes(1)
  })

  it('should handle error', async() => {
    const server = new NanaServer()
    const dummyAction = vi.fn(defaultAction)
    const dummyWrapper = vi.fn(defaultWrapper)
    const dummyErrorHandler = vi.fn(defaultErrorHandler)
    const router = new NanaRouter<Empty>(
      dummyAction,
      dummyWrapper,
      dummyErrorHandler,
    )
    const dummyHandler = vi.fn(() => { throw new NanaError(500, 'Test Error') })
    router.get('/test', dummyHandler)

    server.useRoute('/api', router)

    await testNana(server, GET, '/api/test', 500, { error: 'Test Error' })
    expect(dummyHandler).toBeCalledTimes(1)
    expect(dummyAction).toBeCalledTimes(0)
    expect(dummyWrapper).toBeCalledTimes(0)
    expect(dummyErrorHandler).toBeCalledTimes(1)
  })

  it('should handle error with no functions (typically this should not happen)', async() => {
    const server = new NanaServer()
    const dummyHandler = vi.fn(() => { throw new NanaError(500, 'Test Error') })
    const controller = new NanaController(dummyHandler)
    server.expressApp.get('/test', controller.finalHandler)

    await testNana(server, GET, '/test', 500, { error: 'Test Error' })
    expect(dummyHandler).toBeCalledTimes(1)
    expect(defaultAction).toBeCalledTimes(0)
    expect(defaultWrapper).toBeCalledTimes(0)
    expect(defaultErrorHandler).toBeCalledTimes(1)
  })
})
