import { describe, expect, it, vi } from 'vitest'
import { testCtx, testNana } from '~/tests/util'

import { defaultErrorHandler } from '@/defaults'
import { NanaError } from '@/NanaError'
import { NanaMiddleware } from '@/NanaMiddleware'
import { NanaServer } from '@/NanaServer'
import { GET } from '@/types'

describe('NanaMiddleware', () => {
  it('should construct', async() => {
    const dummyGetContext = vi.fn()
    const dummyErrorHandler = vi.fn()
    const dummyPostHandler = vi.fn()
    const middleware = new NanaMiddleware(
      dummyGetContext,
      dummyPostHandler,
      dummyErrorHandler,
    )

    expect(middleware.getContext).toBe(dummyGetContext)
    expect(middleware.postHandler).toBe(dummyPostHandler)
    expect(middleware.errorHandler).toBe(dummyErrorHandler)
  })

  it('should handle', async() => {
    const dummyPostHandler = vi.fn()
    const server = new NanaServer()
    server
      .useMiddleware<{ foo: string }>(() => testCtx, dummyPostHandler)
      .get<{ user: string }>('/user', ({ foo }) => ({ user: foo }))

    await testNana(server, GET, '/user', 200, { user: testCtx.foo })
    expect(dummyPostHandler).toBeCalledTimes(1)
  })

  it('should handle with no new context', async() => {
    const dummyPostHandler = vi.fn()
    const server = new NanaServer()
    server
      .useMiddleware<{ foo: string }>(() => {}, dummyPostHandler)
      .get('/user', () => ({ user: 'bar' }))

    await testNana(server, GET, '/user', 200, { user: 'bar' })
    expect(dummyPostHandler).toBeCalledTimes(1)
  })

  it('should handle error', async() => {
    const dummyErrorHandler = vi.fn(defaultErrorHandler)
    const server = new NanaServer({ errorHandler: dummyErrorHandler })
    server.useMiddleware(
      () => { throw new NanaError(500, 'Test Error') },
      undefined,
    )
    server.get('/error', () => ({ error: 'This should not be reached' }))

    await testNana(server, GET, '/error', 500, { error: 'Test Error' })
    expect(dummyErrorHandler).toBeCalledTimes(1)
  })
})
