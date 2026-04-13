import { z } from 'zod'

export const validation = {
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    email: z.string().email().optional(),
  }).refine(data => data.name || data.email, {
    message: 'At least one field must be provided',
  }),
}

export const controller = (ctx: { id: string; body: { name?: string; email?: string }; userId: string }) => {
  // userId from auth middleware, id from params, body validated
  return {
    updated: true,
    id: ctx.id,
    updatedBy: ctx.userId,
    ...ctx.body,
  }
}
