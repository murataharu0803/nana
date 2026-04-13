import { NanaError } from '@/interface/NanaError'
import { NanaMiddleware } from '@/interface/NanaMiddleware'
import { ZodError } from 'zod'
import { ValidationSchema } from './types'

interface ParsedParams {
  [key: string]: string
}

interface ParsedQuery {
  [key: string]: undefined | string | ParsedQuery | (string | ParsedQuery)[]
}

/**
 * Creates a NanaMiddleware that validates params, query, and body
 * against the given Zod schemas before the controller runs.
 *
 * On validation failure, throws a NanaError(400) with field-level details.
 */
export const createValidationMiddleware = (schema: ValidationSchema) => {
  return new NanaMiddleware(ctx => {
    try {
      if (schema.params) ctx.req.params = schema.params.parse(ctx.req.params) as ParsedParams
      if (schema.query) ctx.req.query = schema.query.parse(ctx.req.query) as ParsedQuery
      if (schema.body) ctx.req.body = schema.body.parse(ctx.req.body)
    } catch(err) {
      if (err instanceof ZodError) {
        const details = err.issues.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        }))
        throw new NanaError(400, JSON.stringify({
          message: 'Validation failed',
          errors: details,
        }))
      }
      throw err
    }
  })
}
