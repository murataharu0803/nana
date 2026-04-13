import {
  NextFunction as ExpressNext,
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express'

import {
  Empty,
  NanaErrorHandler,
  NanaLogger,
  NanaMiddlewareCreateContext,
  NanaPostHandler,
  Obj,
} from './types'
import { createContextArgument } from './util'

export class NanaMiddleware<
  NewCTX extends Obj = Empty,
  _ParentCTX extends Obj = Empty,
  _CTX extends NewCTX & _ParentCTX = NewCTX & _ParentCTX,
> {
  public readonly getContext: NanaMiddlewareCreateContext<NewCTX, _ParentCTX>
  public readonly postHandler?: NanaPostHandler<_CTX>
  public readonly errorHandler?: NanaErrorHandler<_CTX>
  public readonly logger: NanaLogger

  readonly handler = async(
    req: ExpressRequest,
    res: ExpressResponse,
    next: ExpressNext,
  ) => {
    try {
      const newCtx = await this.getContext(createContextArgument(req.ctx as _ParentCTX, req, res))
      Object.assign(req.ctx, newCtx || {})
      next()
      res.on('finish', async() => {
        try {
          await this.postHandler?.(createContextArgument(req.ctx as _CTX, req, res))
        } catch(err) {
          this.logger.error(err)
        }
      })
    } catch(err) {
      if (this.errorHandler) {
        await this.errorHandler(
          err,
          createContextArgument(req.ctx as _CTX, req, res),
          this.logger.error,
        )
      } else throw err
    }
  }

  constructor(
    getContext: NanaMiddlewareCreateContext<NewCTX, _ParentCTX> = _ => ({} as NewCTX),
    postHandler?: NanaPostHandler<_CTX>,
    errorHandler?: NanaErrorHandler<_CTX>,
    logger: NanaLogger = console,
  ) {
    this.getContext = getContext
    this.errorHandler = errorHandler
    this.postHandler = postHandler
    this.logger = logger
  }
}
