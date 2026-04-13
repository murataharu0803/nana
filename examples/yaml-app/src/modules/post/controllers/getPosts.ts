import { z } from 'zod'

// Filename: getPosts.ts → auto-discovered as GET /
// (default method is GET when no mid-extension)

export const validation = {
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
  }),
}

export const controller = (ctx: { page: number; limit: number }) => {
  return {
    posts: [],
    pagination: { page: ctx.page, limit: ctx.limit },
  }
}
