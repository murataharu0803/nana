import { NanaMiddleware } from '@harlos/nana'
import { NanaError } from '@harlos/nana'

// Middleware must export default or named 'middleware'
// Filename becomes the middleware name: auth.ts → 'auth'
export default new NanaMiddleware<{ userId: string }>(
  async ({ req }) => {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) throw new NanaError(401, 'Unauthorized')

    // In real app: validate JWT, look up user, etc.
    const userId = 'user-from-token'
    return { userId }
  },
)
