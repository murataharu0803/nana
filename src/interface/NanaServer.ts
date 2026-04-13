
/* eslint-disable @typescript-eslint/no-explicit-any */
import express, { Application as ExpressApp } from 'express'

import { defaultAction, defaultErrorHandler, defaultWrapper } from './defaults'
import { NanaRouter } from './NanaRouter'
import { Empty, NanaAction, NanaErrorHandler, NanaLogger, NanaWrapper, Obj } from './types'


// eslint-disable-next-line @stylistic/max-len
export class NanaServer<CTX extends Obj = Empty, WrappedData = any> extends NanaRouter<CTX, WrappedData> {
  public readonly expressApp: ExpressApp
  public readonly port: number
  public onStart?: () => void

  constructor(config?: {
    port?: number
    onStart?: () => void
    action?: NanaAction<CTX>
    wrapper?: NanaWrapper<CTX, WrappedData>
    errorHandler?: NanaErrorHandler<CTX>
    logger?: NanaLogger
  }) {
    super(
      config?.action || defaultAction,
      config?.wrapper || defaultWrapper,
      config?.errorHandler || defaultErrorHandler,
      config?.logger || console,
    )
    this.port = config?.port || 7777
    this.onStart = config?.onStart
    this.expressApp = express()
    this.expressApp.use(express.json())
    this.expressApp.use((req, _, next) => {
      req.ctx = {}
      next()
    }) // Initialize context
    this.expressApp.use('/', this.expressRouter)
  }

  run() {
    return this.expressApp.listen(this.port, this.onStart)
  }
}
