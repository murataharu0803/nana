import { describe, expect, it, vi } from 'vitest'

import { NanaRouter } from '@/NanaRouter'
import { METHOD } from '@/types'

describe('NanaRouter', () => {
  describe('constructor', async() => {
    it('should construct with no arguments', async() => {
      const router = new NanaRouter()

      expect(router.action).toBe(undefined)
      expect(router.wrapper).toBe(undefined)
      expect(router.errorHandler).toBe(undefined)
    })

    it('should construct with specified functions', async() => {
      const dummyAction = vi.fn()
      const dummyWrapper = vi.fn(data => ({ nested: data }))
      const dummyErrorHandler = vi.fn()
      const router = new NanaRouter(dummyAction, dummyWrapper, dummyErrorHandler)

      expect(router.parent).toBe(undefined)
      expect(router.action).toBe(dummyAction)
      expect(router.wrapper).toEqual(dummyWrapper)
      expect(router.errorHandler).toBe(dummyErrorHandler)
    })
  })

  describe('use', async() => {
    it('should mount a NanaRouter', async() => {
      const parent = new NanaRouter()
      parent.expressRouter.use = vi.fn()
      const child = new NanaRouter()
      parent.useRoute('/test', child)

      expect(child.parent).toBe(parent)
      expect(parent.expressRouter.use).toBeCalledWith('/test', child.expressRouter)
    })

    it('should use a middleware', async() => {
      const parent = new NanaRouter()
      parent.expressRouter.use = vi.fn()
      const middlewareHandler = vi.fn(_ => { })
      parent.useMiddleware(middlewareHandler)

      expect(parent.expressRouter.use).toBeCalledTimes(1)
    })

    describe('methods with handler', async() => {
      const testMethod = (method: METHOD) => {
        const parent = new NanaRouter()
        const dummyMethod = vi.fn()
        parent.expressRouter[method] = dummyMethod
        const dummyHandler = vi.fn(() => ({}))
        parent[method]('/test', dummyHandler)

        expect(dummyMethod).toBeCalledTimes(1)
      }

      it('get', async() => { testMethod(METHOD.GET) })
      it('post', async() => { testMethod(METHOD.POST) })
      it('put', async() => { testMethod(METHOD.PUT) })
      it('delete', async() => { testMethod(METHOD.DELETE) })
      it('patch', async() => { testMethod(METHOD.PATCH) })
      it('options', async() => { testMethod(METHOD.OPTIONS) })
      it('head', async() => { testMethod(METHOD.HEAD) })
    })
  })
})
