import { existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { join, parse as parsePath } from 'node:path'
import { pathToFileURL } from 'node:url'

import { NanaMiddleware } from '@/interface/NanaMiddleware'
import type { ControllerFileExports, CrudFileExports, RouteMethod } from './types'

// ─── Middleware resolution ───────────────────────────────────────

/**
 * Scans the middlewares directory and builds a name → NanaMiddleware map.
 *
 * Each middleware file should default-export or named-export a NanaMiddleware instance.
 * The name is derived from the filename (e.g. auth1.ts → 'auth1').
 */
export const loadMiddlewares = async(
  middlewaresDir: string,
): Promise<Map<string, NanaMiddleware>> => {
  const map = new Map<string, NanaMiddleware>()

  if (!existsSync(middlewaresDir)) return map

  const files = await readdir(middlewaresDir)

  for (const file of files) {
    if (!file.endsWith('.ts') && !file.endsWith('.js')) continue

    const name = parsePath(file).name
    const filePath = join(middlewaresDir, file)
    const mod = await importFile(filePath)

    // Support: export default middleware, or export const middleware
    const middleware = mod.default || mod.middleware
    if (middleware instanceof NanaMiddleware) map.set(name, middleware)

    // Support: export default (ctx) => { ... } as a shorthand
    else if (typeof middleware === 'function') map.set(name, new NanaMiddleware(middleware))
  }

  return map
}

/**
 * Resolves middleware names to instances, handling the '!override' prefix.
 * Returns { middlewares, isOverride }.
 */
export const resolveMiddlewares = (
  names: string[],
  registry: Map<string, NanaMiddleware>,
): { middlewares: NanaMiddleware[], isOverride: boolean } => {
  const isOverride = names[0] === '!override'
  const actualNames = isOverride ? names.slice(1) : names

  const middlewares = actualNames.map(name => {
    const mw = registry.get(name)
    if (!mw) throw new Error(`[Nana Loader] Middleware '${name}' not found in registry`)
    return mw
  })

  return { middlewares, isOverride }
}

// ─── Controller file loading ────────────────────────────────────

/**
 * Dynamically imports a controller file and extracts validation + controller exports.
 */
export const loadControllerFile = async(
  filePath: string,
): Promise<ControllerFileExports> => {
  const mod = await importFile(filePath)

  const controller = mod.controller || mod.default
  if (typeof controller !== 'function')
    // eslint-disable-next-line @stylistic/max-len
    throw new Error(`[Nana Loader] Controller file '${filePath}' must export a 'controller' function`)


  return {
    validation: mod.validation,
    controller,
  }
}

/**
 * Dynamically imports a CRUD file and extracts crud options + overrides.
 */
export const loadCrudFile = async(
  filePath: string,
): Promise<CrudFileExports> => {
  const mod = await importFile(filePath)

  if (!mod.crudOptions)
    throw new Error(`[Nana Loader] CRUD file '${filePath}' must export 'crudOptions'`)


  return {
    crudOptions: mod.crudOptions,
    findMany: mod.findMany,
    findOne: mod.findOne,
    create: mod.create,
    update: mod.update,
    delete: mod.delete,
    beforeCreate: mod.beforeCreate,
    beforeUpdate: mod.beforeUpdate,
  }
}

// ─── Auto-discovery ─────────────────────────────────────────────

/** Method extracted from filename: getUser.post.ts → 'post', getUser.ts → 'get' */
const METHOD_EXTENSIONS = new Set(['get', 'post', 'put', 'delete', 'patch', 'options', 'head'])

export type DiscoveredRoute = {
  method: RouteMethod
  controllerName: string
  filePath: string
  isCrud: boolean
}

/**
 * Auto-discovers controller files in a module's controllers directory.
 *
 * Naming conventions:
 *   - getUser.ts         → GET (default method)
 *   - updateUser.post.ts → POST (method from mid-extension)
 *   - user.crud.ts       → CRUD macro
 */
export const discoverControllers = async(
  controllersDir: string,
): Promise<DiscoveredRoute[]> => {
  if (!existsSync(controllersDir)) return []

  const files = await readdir(controllersDir)
  const routes: DiscoveredRoute[] = []

  for (const file of files) {
    if (!file.endsWith('.ts') && !file.endsWith('.js')) continue

    const filePath = join(controllersDir, file)
    const parts = parsePath(file).name.split('.')

    // user.crud.ts → CRUD macro
    if (parts.length >= 2 && parts[parts.length - 1] === 'crud') {
      routes.push({
        method: 'crud',
        controllerName: parts.slice(0, -1).join('.'),
        filePath,
        isCrud: true,
      })
      continue
    }

    // updateUser.post.ts → POST method
    if (parts.length >= 2 && METHOD_EXTENSIONS.has(parts[parts.length - 1])) {
      routes.push({
        method: parts[parts.length - 1] as RouteMethod,
        controllerName: parts.slice(0, -1).join('.'),
        filePath,
        isCrud: false,
      })
      continue
    }

    // getUser.ts → default to GET
    routes.push({
      method: 'get',
      controllerName: parts[0],
      filePath,
      isCrud: false,
    })
  }

  return routes
}

// ─── Helpers ────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
const importFile = async(filePath: string): Promise<Record<string, any>> => {
  const fileUrl = pathToFileURL(filePath).href
  return import(fileUrl)
}
