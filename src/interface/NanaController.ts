import {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express'

import { defaultAction, defaultErrorHandler, defaultWrapper } from './defaults'
import {
  Empty,
  NanaAction,
  NanaControllerHandler,
  NanaErrorHandler,
  NanaLogger,
  NanaWrapper,
  Obj,
} from './types'
import { createContextArgument } from './util'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class NanaController<CTX extends Obj = Empty, Result = any> {
  public handler: NanaControllerHandler<CTX, Result>
  public action?: NanaAction<CTX>
  public errorHandler?: NanaErrorHandler<CTX>
  public wrapper?: NanaWrapper<CTX>
  public logger: NanaLogger

  readonly finalHandler = async(req: ExpressRequest, res: ExpressResponse) => {
    const allCtx = createContextArgument<CTX>(req.ctx as CTX, req, res)
    try {
      const result: Result = await this.handler(allCtx)
      const data = await this.wrapper?.(result, allCtx) || defaultWrapper(result, allCtx)
      res.locals.body = data
      await (this.action || defaultAction)(data, allCtx)
    } catch(err) {
      await (this.errorHandler || defaultErrorHandler)(err, allCtx)
    }
  }

  constructor(
    handler: NanaControllerHandler<CTX, Result>,
    action?: typeof this.action,
    wrapper?: typeof this.wrapper,
    errorHandler?: typeof this.errorHandler,
    logger?: typeof this.logger,
  ) {
    this.handler = handler
    this.action = action
    this.wrapper = wrapper
    this.errorHandler = errorHandler
    this.logger = logger || console
  }
}
