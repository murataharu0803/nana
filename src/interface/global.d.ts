import 'express'

declare global {
  namespace Express {
    interface Request {
      ctx: Record<string, any>
    }
  }
}
