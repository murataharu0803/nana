import { describe, expect, it, vi } from 'vitest'
import { dryRun } from '~/tests/util'

import { NanaServer } from '@/interface/NanaServer'

describe('NanaServerApp', () => {
  it('should use default port', async() => {
    const server = new NanaServer()
    await dryRun(server)
    expect(server.expressApp.listen).toBeCalledWith(7777, expect.any(Function))
  })

  it('should use specified port', async() => {
    const server = new NanaServer({ port: 8888 })
    await dryRun(server)
    expect(server.expressApp.listen).toBeCalledWith(8888, expect.any(Function))
  })

  it('should call onStart', async() => {
    const onStart = vi.fn()
    const server = new NanaServer({ onStart })
    await dryRun(server)
    expect(onStart).toHaveBeenCalledOnce()
  })
})
