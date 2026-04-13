import { z } from 'zod'

// Filename: createPost.post.ts → auto-discovered as POST /

export const validation = {
  body: z.object({
    title: z.string().min(1).max(200),
    content: z.string().min(1),
    tags: z.array(z.string()).optional(),
  }),
}

export const controller = (ctx: { body: { title: string; content: string; tags?: string[] }; userId: string }) => {
  return {
    id: 'new-post-id',
    ...ctx.body,
    authorId: ctx.userId,
    createdAt: new Date().toISOString(),
  }
}
