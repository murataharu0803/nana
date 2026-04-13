import { z } from 'zod'

// Validation schema — automatically wired as middleware by the loader
export const validation = {
  params: z.object({
    id: z.string().uuid(),
  }),
}

// Controller only runs if validation passes
// ctx.id is guaranteed to be a valid UUID string
export const controller = (ctx: { id: string }) => {
  // In real app: fetch from database
  return {
    id: ctx.id,
    name: 'Some User',
    email: 'user@example.com',
  }
}
