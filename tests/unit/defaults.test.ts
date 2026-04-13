/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from 'vitest'

import { defaultAction, defaultWrapper } from '@/interface/defaults'
import { testData } from '~/tests/util'

describe('defaults', () => {
  it('defaultAction', async() => {
    const dummyRes = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    }

    defaultAction(testData, { res: dummyRes as any } as any)
    expect(dummyRes.status).toBeCalledWith(200)
    expect(dummyRes.send).toBeCalledWith(testData)
  })

  it('defaultWrapper', async() => {
    const wrappedData = defaultWrapper(testData, {} as any)
    expect(wrappedData).toEqual(testData)
  })

  describe.sequential('defaultErrorHandler', async() => {
    const testError = async(
      env: string,
      errorType: string,
      expectedStatus: number,
      expectedMessage: string,
    ) => {
      vi.stubEnv('NODE_ENV', env)
      vi.resetModules()

      const { defaultErrorHandler } = await import('@/interface/defaults')
      const { NanaError } = await import('@/interface/NanaError')

      const error = errorType === 'NanaError' ? new NanaError(418, 'I\'m a teapot') :
        errorType === 'Error' ? new Error('I\'m a teapot') : 'I\'m a teapot'

      const dummyRes = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      }

      const errorLogger = vi.fn()
      await defaultErrorHandler(error, { res: dummyRes as any } as any, errorLogger)
      expect(dummyRes.status).toBeCalledWith(expectedStatus)
      expect(dummyRes.send).toBeCalledWith({ error: expectedMessage })
      expect(errorLogger).toBeCalledWith(error)

      vi.unstubAllEnvs()
    }

    it('with NanaError in production', async() => {
      await testError('production', 'NanaError', 418, 'I\'m a teapot')
    })

    it('with NanaError in development', async() => {
      await testError('development', 'NanaError', 418, 'I\'m a teapot')
    })

    it('with Error in production', async() => {
      await testError('production', 'Error', 500, 'Unknown Error')
    })

    it('with Error in development', async() => {
      await testError('development', 'Error', 500, 'I\'m a teapot')
    })

    it('with string in production', async() => {
      await testError('production', 'I\'m a teapot', 500, 'Unknown Error')
    })

    it('with string in development', async() => {
      await testError('development', 'I\'m a teapot', 500, 'I\'m a teapot')
    })

    it('should throw error if res.send fails', async() => {
      vi.stubEnv('NODE_ENV', 'development')
      const { defaultErrorHandler } = await import('@/interface/defaults')
      const sendError = new Error('Send failed')
      const dummyRes = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(() => { throw sendError }),
      }

      const errorLogger = vi.fn()
      defaultErrorHandler(new Error(), { res: dummyRes as any } as any, errorLogger)
      expect(errorLogger).toBeCalledWith(sendError)
    })
  })
})
