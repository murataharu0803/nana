/* eslint-disable @stylistic/max-len */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Router as ExpressRouter } from 'express'

import { defaultAction, defaultErrorHandler } from './defaults'
import { NanaController } from './NanaController'
import { NanaMiddleware } from './NanaMiddleware'
import {
  CTXArgument,
  Empty,
  METHOD,
  NanaAction,
  NanaControllerHandler,
  NanaErrorHandler,
  NanaLogger,
  NanaMiddlewareCreateContext,
  NanaPostHandler,
  NanaWrapper,
  Obj,
} from './types'

export class NanaRouter<CTX extends Obj = Empty, WrappedData = any> {
  public parent?: NanaRouter<any, WrappedData> | ExpressRouter
  public readonly expressRouter: ExpressRouter
  public action?: NanaAction<CTX>
  public wrapper?: NanaWrapper<CTX, WrappedData>
  public errorHandler?: NanaErrorHandler<CTX>
  public logger: NanaLogger

  readonly combinedWrapper: NanaWrapper<CTX, WrappedData> = async(data: any, ctx: CTXArgument<CTX>) => {
    const wrapped: WrappedData = this.wrapper ? await this.wrapper(data, ctx) : data as unknown as WrappedData
    if (this.parent instanceof NanaRouter) return this.parent.combinedWrapper(wrapped, ctx)
    return wrapped
  }

  readonly finalAction: NanaAction<CTX> = (data, ctx) => {
    if (this.action) return this.action(data, ctx)
    if (this.parent instanceof NanaRouter) return this.parent.finalAction(data, ctx)
    return defaultAction(data, ctx)
  }

  readonly finalErrorHandler: NanaErrorHandler<CTX> = (err, ctx) => {
    if (this.errorHandler) return this.errorHandler(err, ctx)
    if (this.parent instanceof NanaRouter) return this.parent.finalErrorHandler(err, ctx)
    return defaultErrorHandler(err, ctx)
  }

  constructor(
    action?: typeof this.action,
    wrapper?: typeof this.wrapper,
    errorHandler?: typeof this.errorHandler,
    logger?: typeof this.logger,
  ) {
    this.action = action
    this.wrapper = wrapper
    this.errorHandler = errorHandler
    this.logger = logger || console
    this.expressRouter = ExpressRouter()
  }

  useRoute(route: string, router: NanaRouter<CTX, any>) {
    this.expressRouter.use(route, router.expressRouter)
    router.parent = this
    return this // for chaining
  }

  useMiddleware<NewCTX extends Obj = CTX>(
    getContext: NanaMiddlewareCreateContext<NewCTX, CTX> = _ => ({} as NewCTX),
    postHandler?: NanaPostHandler<NewCTX & CTX>,
  ) {
    const middleware = new NanaMiddleware<NewCTX, CTX>(
      getContext,
      postHandler,
      this.finalErrorHandler,
      this.logger,
    )
    this.expressRouter.use(middleware.handler)
    return this.useContext<NewCTX>() // for chaining
  }

  useContext<NewCTX extends Obj = CTX>() {
    return this as unknown as NanaRouter<NewCTX, WrappedData>
  }

  private _createController<Result>(
    method: METHOD,
    route: string,
    handler: NanaControllerHandler<CTX, Result>,
  ) {
    const controller = new NanaController<CTX, Result>(
      handler,
      this.finalAction,
      this.combinedWrapper,
      this.finalErrorHandler,
      this.logger,
    )
    this.expressRouter[method](route, controller.finalHandler.bind(controller))
    return controller
  }

  get<Result = any>(route: string, handler: NanaControllerHandler<CTX, Result>) {
    return this._createController<Result>(METHOD.GET, route, handler)
  }

  post<Result = any>(route: string, handler: NanaControllerHandler<CTX, Result>) {
    return this._createController<Result>(METHOD.POST, route, handler)
  }

  put<Result = any>(route: string, handler: NanaControllerHandler<CTX, Result>) {
    return this._createController<Result>(METHOD.PUT, route, handler)
  }

  delete<Result = any>(route: string, handler: NanaControllerHandler<CTX, Result>) {
    return this._createController<Result>(METHOD.DELETE, route, handler)
  }

  patch<Result = any>(route: string, handler: NanaControllerHandler<CTX, Result>) {
    return this._createController<Result>(METHOD.PATCH, route, handler)
  }

  options<Result = any>(route: string, handler: NanaControllerHandler<CTX, Result>) {
    return this._createController<Result>(METHOD.OPTIONS, route, handler)
  }

  head<Result = any>(route: string, handler: NanaControllerHandler<CTX, Result>) {
    return this._createController<Result>(METHOD.HEAD, route, handler)
  }
}
