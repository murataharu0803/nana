/* eslint-disable @typescript-eslint/no-explicit-any */

import { Request, Response } from 'express'
import { CTXArgument, Empty, Obj } from './types'

export const createContextArgument = <CTX extends Obj = Empty>(
  ctx: CTX,
  req: Request,
  res: Response,
): CTXArgument<CTX> => {
  return {
    ...req.query as Obj<string | string[]>,
    ...req.params as Obj<string>,
    ...ctx,
    body: req.body as any,
    req,
    res,
  }
}
