/* eslint-disable @typescript-eslint/no-explicit-any */

import { NanaControllerHandler } from '@/interface/types'
import { ZodType } from 'zod'

// ─── routers.yaml ───────────────────────────────────────────────
export type RouterConfig = {
  path: string
  module: string
  middlewares?: string[]
}

export type RoutersYaml = {
  routers: RouterConfig[]
}

// ─── routes.yaml (per module) ───────────────────────────────────
export type RouteMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head' | 'crud'

export type RouteConfig = {
  path: string
  method: RouteMethod
  controller: string          // filename without extension (e.g. 'getUser')
  middlewares?: string[]       // middleware names, prefix with '!' for override
  // crud-specific
  crud?: string               // crud file reference (e.g. 'user.crud')
}

export type RoutesYaml = {
  routes: RouteConfig[]
}

// ─── Controller file exports ────────────────────────────────────
export type ValidationSchema = {
  params?: ZodType
  query?: ZodType
  body?: ZodType
}

export type ControllerFileExports = {
  validation?: ValidationSchema
  controller: NanaControllerHandler<any, any>
}

// ─── CRUD file exports ──────────────────────────────────────────
export type CrudOperation = 'findMany' | 'findOne' | 'create' | 'update' | 'delete'

export type CrudOptions = {
  entity: string              // Prisma model name
  only?: CrudOperation[]      // whitelist operations
  exclude?: CrudOperation[]   // blacklist operations
  softDelete?: boolean
}

export type CrudFileExports = {
  crudOptions: CrudOptions
  // optional overrides per operation
  findMany?: NanaControllerHandler<any, any>
  findOne?: NanaControllerHandler<any, any>
  create?: NanaControllerHandler<any, any>
  update?: NanaControllerHandler<any, any>
  delete?: NanaControllerHandler<any, any>
  // optional hooks
  beforeCreate?: (ctx: any, data: any) => any
  beforeUpdate?: (ctx: any, data: any) => any
}

// ─── Loader config ──────────────────────────────────────────────
export type NanaLoaderConfig = {
  /** Root directory containing routers.yaml, middlewares/, modules/ */
  srcDir: string
  /** Filename for the top-level router registry (default: 'routers.yaml') */
  routersFile?: string
  /** Directory name for middlewares (default: 'middlewares') */
  middlewaresDir?: string
  /** Directory name for modules (default: 'modules') */
  modulesDir?: string
  /** Filename for per-module route config (default: 'routes.yaml') */
  routesFile?: string
  /** Directory name for controllers within a module (default: 'controllers') */
  controllersDir?: string
}
