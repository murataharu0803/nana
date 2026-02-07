# Nana

A minimal, type-safe Node.js backend framework built on Express with composable middleware and context flow.

```ts
import { NanaServer } from '@harlos/nana'

const server = new NanaServer({ port: 3000 }) // default port is 7777

server.get<{ message: string }>('/hello', () => ({ message: 'Hello World!' }))

server.run()
```

## Features
- **Based on Express** - Leverages the power of Express.js
- **Everything in Single Context** - Grab query, params, body, and more from a single context object (or add your own)
- **Type-Safe** - Type everything
- **Custom Action, Wrapper, and Error Handler** - Organize and unify how responses are sent

## Installation

```bash
npm install @harlos/nana
# or
yarn add @harlos/nana
# or
pnpm add @harlos/nana
```

## Core Concepts
### Basic usage
```ts
import { NanaServer, NanaRouter } from '@harlos/nana'

const server = new NanaServer() // extends NanaRouter

// Create sub-routers directly
const apiRouter = server.use('/api')

// or you can create router first
const userRouter = new NanaRouter()
userRouter.get('/', () => ({ userId: 1, name: 'Harlos' }))

// Then mount it
apiRouter.use('/users', userRouter)

server.run()
```

### Middleware - everything in Context
```ts
// A NanaMiddleware adds new context to current request
const authMiddleware = new NanaMiddleware<{ userId: number }>(
  async ({ req }) => {
    const token = req.headers.authorization
    const userId = await validateToken(token)
    return { userId } // this saves to req.ctx under the hood
  }
)

// for now you need to type the context for the router
// this seems verbose, but it helps when you have multiple middlewares
const apiRouter = server.use<{ userId: number }>('/api')
apiRouter.use(authMiddleware)

// get userId directly from context
// also you can type the controller
apiRouter.get<{ profile: Profile }>('/profile', ({ userId }) => {
  return { profile: await getProfile(userId) }
})

// default available context includes (be aware of overriding):
type CTXArgument<CustomCTX> = {
  ...CustomCTX, // additional context from middleware
  ...req.query, // auto expanded query parameters
  ...req.params, // auto expanded route parameters
  body: req.body as any, // request body
  req, // Express Request object
  res, // Express Response object
}
```

### NanaRouter - Action & Wrapper & Error Handler
```ts
// everything will be awaited
const router = new NanaRouter<{ message: string }>(
  action?: (data, ctx) => void | Promise<void>,
  wrapper?: (raw, ctx) => ResponseData | Promise<ResponseData>,
  errorHandler?: (err, ctx, errorLogger?) => void | Promise<void>,
)

// Action is the response handler
// By default, the action sends the data returned by the handler with 200 status code
server.get('/data', ({ res }) => ({ message: 'Hello World' }))
// This sends { message: 'Hello World' } with 200 status code
// You can also use a custom action
const customAction = (data, { res }) => { res.status(201).send(data) }
const customRedirectAction = (url, { res }) => { res.redirect(url) }
// actions can be overridden in nested routers
// remember to send the response, otherwise it will hang!

// Wrapper is used to wrap the response data
// By default, it just returns the data as is
// You can also use a custom Wrapper
const customWrapper = (data, { req }) => {
  // Wrap data based on request
  return { data, id: req.id }
}
// Wrappers will be wrapped recursively for nested routers
// e.g. finalData = WrapperC(WrapperB(WrapperA(data, ctx), ctx), ctx) // route A/B/C

server.get('/error', () => {
  // throw a NanaError to return a specific HTTP error
  throw new NanaError(400, 'Something went wrong')
  // if somehow other error occurs, default error handler automatically sends a 500 response
})
// of course, you can implement your own error handler
// error handler can be overridden in nested routers
// remember to send the response, otherwise it will hang!
```

### Extending Nana classes
I will not cover this in detail (yet), but you can extend Nana into your own classes.

## API Reference
### NanaServer
```ts
const server = new NanaServer({
  port?: number, // Default: 7777
  onStart?: () => void, // Callback when server starts
})

server.run() // Start the server

// inherits NanaRouter methods
const router = server.use(path) // create sub-router
server.use(path, router) // mount sub-router
server.use(middleware) // Add middleware
server.get(route, handler) // HTTP methods
server.post(route, handler)
```

### NanaMiddleware
```ts
// these can also be promises
const middleware = new NanaMiddleware<ContextType>(
  contextCreator, // (currentContext) => addedContext | void
  errorHandler?, // middleware specific, same behavior as NanaRouter error handler
  postHandler?, // runs after request completion
)

router.use(middleware) // Add middleware to a router
```

### NanaController
```ts
// handler: (context) => rawData | void
const controller = new NanaController<ContextType>(handler)
// the returned data from handler will be wrapped before sending to action.

router.get(route, controller) // Use controller in a route
router.get(route, handler) // or directly pass a handler function
```

## Examples
### REST API
```ts
const server = new NanaServer()
const api = server.use('/api')

// Add request logging
api.use(new NanaMiddleware(({ req }) => {
  console.log(`${req.method} ${req.path}`)
}))

// Users endpoint
const users = api.use('/users')
users.get('/', () => getAllUsers())
users.get('/:id', ({ id }) => getUser(id))
users.post('/', ({ body }) => createUser(body))
```

### Authentication Flow
```ts
const authMiddleware = new NanaMiddleware<{ user: User }>(
  async ({ req }) => {
    const user = await authenticateRequest(req)
    if (!user) throw new NanaError(401, 'Unauthorized')
    return { user }
  }
)

const apiRouter = server.use('/api')
apiRouter.use(authMiddleware)
apiRouter.get('/dashboard', ({ user }) => ({ welcome: `Hello ${user.name}!` }))
```

## License
[MIT](LICENSE)
