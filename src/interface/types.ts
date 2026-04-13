/* eslint-disable @stylistic/max-len */
/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express'

export type Promisable<Result> = Result | Promise<Result>
export type Obj<Result = any> = Record<string, Result>
export type Dict = Obj<string>
export type Empty = Obj<never>

export enum METHOD {
  GET = 'get',
  POST = 'post',
  PUT = 'put',
  DELETE = 'delete',
  PATCH = 'patch',
  OPTIONS = 'options',
  HEAD = 'head',
}
export const GET = METHOD.GET
export const POST = METHOD.POST
export const PUT = METHOD.PUT
export const DELETE = METHOD.DELETE
export const PATCH = METHOD.PATCH
export const OPTIONS = METHOD.OPTIONS
export const HEAD = METHOD.HEAD

export type CTXArgument<CTX extends Obj = Empty> = CTX & {
  body: any
  req: Request
  res: Response
}

export type NanaLogger = {
  log: (...args: any[]) => void
  error: (...args: any[]) => void
}

export type NanaMiddlewareCreateContext<NewCTX extends Obj = Empty, _ParentCTX extends Obj = Empty> = (
  _ctx: CTXArgument<_ParentCTX>,
) => Promisable<NewCTX | void>

export type NanaPostHandler<CTX extends Obj = Empty> = (
  _ctx: CTXArgument<CTX>,
) => Promisable<void>

export type NanaControllerHandler<CTX extends Obj = Empty, Data = any> = (
  _ctx: CTXArgument<CTX>,
) => Promisable<Data>

export type NanaAction<CTX extends Obj = Empty> = (
  data: any,
  _ctx: CTXArgument<CTX>,
) => Promisable<void>

export type NanaWrapper<CTX extends Obj = Empty, TargetData = any> = (
  data: any,
  _ctx: CTXArgument<CTX>,
) => Promisable<TargetData>

export type NanaErrorHandler<CTX extends Obj = Empty> = (
  _err: unknown,
  _ctx: CTXArgument<CTX>,
  _errorLogger?: (_err: unknown) => void,
) => Promisable<void>
