// Filename: check.ts → GET /
// No validation, no auth (health module has no middlewares in routers.yaml)

export const controller = () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
})
