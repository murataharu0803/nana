// Simple controller — no validation needed
// The userId comes from the auth middleware context

export const controller = (ctx: { userId: string }) => {
  return {
    id: ctx.userId,
    name: 'Current User',
  }
}
