
import { NanaError } from './NanaError'
import { NanaAction, NanaErrorHandler, NanaWrapper, Obj } from './types'

const DEV = process.env.NODE_ENV !== 'production'

export const defaultAction: NanaAction<Obj> =
  (data, { res }) => { res.status(200).send(data) }

export const defaultWrapper: NanaWrapper<Obj> = <T, U>(data: T) => data as unknown as U

export const defaultErrorHandler: NanaErrorHandler<Obj> =
  (err, { res }, errorLogger = console.error) => {
    errorLogger(err)
    try {
      const status = err instanceof NanaError ? err.status : 500
      const htmlMsg = DEV
        ? (err instanceof Error ? err.message : String(err))
        : (err instanceof NanaError ? err.message : 'Unknown Error')
      res.status(status).send({ error: htmlMsg })
    } catch(error) {
      errorLogger(error)
    }
  }
