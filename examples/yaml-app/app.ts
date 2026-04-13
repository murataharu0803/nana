import { NanaServer } from '@harlos/nana'
import { NanaLoader } from '@harlos/nana/loader'
import { join } from 'node:path'

const server = new NanaServer({ port: 3000 })

const loader = new NanaLoader({
  srcDir: join(import.meta.dirname, 'src'),
})

await loader.load(server)

server.run()

// This registers:
//
// GET  /users/me          → auth → getMe.ts
// GET  /users/:id         → auth → validation(params.id: uuid) → getUserById.ts
// PATCH /users/:id        → auth → validation(params + body) → updateUser.ts
//
// GET  /posts/            → auth → validation(query: page, limit) → getPosts.ts
// POST /posts/            → auth → validation(body: title, content) → createPost.post.ts
//
// GET  /health/           → check.ts (no auth)
