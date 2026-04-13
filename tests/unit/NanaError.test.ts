import { describe, expect, it } from 'vitest'

import { NanaError } from '@/interface/NanaError'

describe('NanaError', () => {
  it('should construct', async() => {
    const error = new NanaError(418, 'I\'m a teapot')
    expect(error).toBeInstanceOf(NanaError)
    expect(error.status).toBe(418)
    expect(error.message).toBe('I\'m a teapot')
  })

  it('should construct with no message', async() => {
    const error = new NanaError(418)
    expect(error).toBeInstanceOf(NanaError)
    expect(error.status).toBe(418)
    expect(error.message).toBe('Unknown NanaError')
  })
})
