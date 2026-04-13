/* eslint-disable @typescript-eslint/no-explicit-any */
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parse as parseYaml } from 'yaml'

import { NanaMiddleware } from '@/interface/NanaMiddleware'
import { NanaRouter } from '@/interface/NanaRouter'
import { NanaServer } from '@/interface/NanaServer'
import { METHOD } from '@/interface/types'

import {
  discoverControllers,
  loadControllerFile,
  loadCrudFile,
  loadMiddlewares,
  resolveMiddlewares,
} from './discovery'
import type {
  NanaLoaderConfig,
  RouteConfig,
  RoutersYaml,
  RoutesYaml,
} from './types'
import { createValidationMiddleware } from './validation'

const DEFAULTS = {
  routersFile: 'routers.yaml',
  middlewaresDir: 'middlewares',
  modulesDir: 'modules',
  routesFile: 'routes.yaml',
  controllersDir: 'controllers',
} as const

export class NanaLoader {
  private config: Required<NanaLoaderConfig>
  private middlewareRegistry: Map<string, NanaMiddleware> = new Map()

  constructor(config: NanaLoaderConfig) {
    this.config = {
      routersFile: config.routersFile ?? DEFAULTS.routersFile,
      middlewaresDir: config.middlewaresDir ?? DEFAULTS.middlewaresDir,
      modulesDir: config.modulesDir ?? DEFAULTS.modulesDir,
      routesFile: config.routesFile ?? DEFAULTS.routesFile,
      controllersDir: config.controllersDir ?? DEFAULTS.controllersDir,
      srcDir: config.srcDir,
    }
  }

  /**
   * Loads the entire application from YAML config and registers onto the server.
   *
   * Flow:
   * 1. Load middleware registry from middlewares/
   * 2. Parse routers.yaml
   * 3. For each router entry:
   *    a. Create a NanaRouter with router-level middlewares
   *    b. Load module routes (from routes.yaml or auto-discovery)
   *    c. Register onto server at the specified path
   */
  async load(server: NanaServer): Promise<void> {
    const { srcDir } = this.config

    // Step 1: Load all named middlewares
    const middlewaresDir = join(srcDir, this.config.middlewaresDir)
    this.middlewareRegistry = await loadMiddlewares(middlewaresDir)

    // Step 2: Parse routers.yaml
    const routersPath = join(srcDir, this.config.routersFile)
    const routersYaml = await this.readYaml<RoutersYaml>(routersPath)

    if (!routersYaml?.routers)
      throw new Error(`[Nana Loader] No routers found in ${routersPath}`)


    // Step 3: Process each router
    for (const routerConfig of routersYaml.routers) {
      const router = new NanaRouter()

      // Apply router-level middlewares
      if (routerConfig.middlewares?.length) {
        const { middlewares } =
          resolveMiddlewares(routerConfig.middlewares, this.middlewareRegistry)
        for (const mw of middlewares)
          router.expressRouter.use(mw.handler)

      }

      // Load module routes
      const moduleDir = join(srcDir, this.config.modulesDir, routerConfig.module)
      await this.loadModule(router, moduleDir)

      // Mount on server
      server.useRoute(routerConfig.path, router)
    }
  }

  /**
   * Loads routes for a single module.
   * Priority: routes.yaml > auto-discovery
   */
  private async loadModule(router: NanaRouter, moduleDir: string): Promise<void> {
    const routesYamlPath = join(moduleDir, this.config.routesFile)

    if (existsSync(routesYamlPath)) {
      // Explicit routes from YAML
      const routesYaml = await this.readYaml<RoutesYaml>(routesYamlPath)
      if (routesYaml?.routes)
        await this.registerYamlRoutes(router, moduleDir, routesYaml.routes)

    } else {
      // Auto-discovery from controller filenames
      await this.registerDiscoveredRoutes(router, moduleDir)
    }
  }

  /**
   * Registers routes defined explicitly in a module's routes.yaml.
   */
  private async registerYamlRoutes(
    router: NanaRouter,
    moduleDir: string,
    routes: RouteConfig[],
  ): Promise<void> {
    for (const route of routes) {
      if (route.method === 'crud')
        await this.registerCrudRoutes(router, moduleDir, route)
      else
        await this.registerSingleRoute(router, moduleDir, route)

    }
  }

  /**
   * Registers a single route (non-CRUD) from YAML config.
   */
  private async registerSingleRoute(
    router: NanaRouter,
    moduleDir: string,
    route: RouteConfig,
  ): Promise<void> {
    const controllerPath = this.resolveControllerPath(moduleDir, route.controller)
    const { validation, controller } = await loadControllerFile(controllerPath)

    // Create a sub-router for this route to scope middlewares
    const routeRouter = new NanaRouter()

    // Apply route-level middlewares
    if (route.middlewares?.length) {
      const { middlewares, isOverride } =
        resolveMiddlewares(route.middlewares, this.middlewareRegistry)
      if (isOverride) {
        // TODO: override parent middlewares — for now just apply these
      }
      for (const mw of middlewares)
        routeRouter.expressRouter.use(mw.handler)

    }

    // Apply validation middleware if schema exists
    if (validation) {
      const validationMw = createValidationMiddleware(validation)
      routeRouter.expressRouter.use(validationMw.handler)
    }

    // Register the controller
    const method = route.method as METHOD
    routeRouter[method](route.path, controller)

    // Mount onto parent router
    router.expressRouter.use(routeRouter.expressRouter)
  }

  /**
   * Registers CRUD routes from a .crud.ts file.
   * Generates: GET /, GET /:id, POST /, PATCH /:id, DELETE /:id
   */
  private async registerCrudRoutes(
    router: NanaRouter,
    moduleDir: string,
    route: RouteConfig,
  ): Promise<void> {
    const crudRef = route.crud || route.controller
    const crudPath = this.resolveControllerPath(moduleDir, crudRef)
    const crudFile = await loadCrudFile(crudPath)
    const { crudOptions } = crudFile

    const operations = this.resolveCrudOperations(crudOptions.only, crudOptions.exclude)

    const basePath = route.path.replace(/\/$/, '') || ''

    const crudRoutes: Array<{
      op: string
      method: METHOD
      path: string
      handler: (ctx: any) => any
    }> = [
      {
        op: 'findMany',
        method: METHOD.GET,
        path: `${basePath}/`,
        handler: crudFile.findMany || this.defaultCrudHandler('findMany', crudOptions.entity),
      },
      {
        op: 'findOne',
        method: METHOD.GET,
        path: `${basePath}/:id`,
        handler: crudFile.findOne || this.defaultCrudHandler('findOne', crudOptions.entity),
      },
      {
        op: 'create',
        method: METHOD.POST,
        path: `${basePath}/`,
        handler: crudFile.create ||
          this.defaultCrudHandler('create', crudOptions.entity, crudFile.beforeCreate),
      },
      {
        op: 'update',
        method: METHOD.PATCH,
        path: `${basePath}/:id`,
        handler: crudFile.update ||
          this.defaultCrudHandler('update', crudOptions.entity, crudFile.beforeUpdate),
      },
      {
        op: 'delete',
        method: METHOD.DELETE,
        path: `${basePath}/:id`,
        handler: crudFile.delete || this.defaultCrudHandler(
          crudOptions.softDelete ? 'softDelete' : 'delete',
          crudOptions.entity,
        ),
      },
    ]

    for (const crudRoute of crudRoutes) {
      if (!operations.has(crudRoute.op)) continue

      // Apply route-level middlewares
      if (route.middlewares?.length) {
        const { middlewares } = resolveMiddlewares(route.middlewares, this.middlewareRegistry)
        for (const mw of middlewares)
          router.expressRouter.use(crudRoute.path, mw.handler)

      }

      router[crudRoute.method](crudRoute.path, crudRoute.handler)
    }
  }

  /**
   * Auto-discovers and registers controller files when no routes.yaml exists.
   */
  private async registerDiscoveredRoutes(
    router: NanaRouter,
    moduleDir: string,
  ): Promise<void> {
    const controllersDir = join(moduleDir, this.config.controllersDir)
    const discovered = await discoverControllers(controllersDir)

    for (const route of discovered) {
      if (route.isCrud) {
        await this.registerCrudRoutes(router, moduleDir, {
          path: '/',
          method: 'crud',
          controller: route.controllerName,
          crud: route.controllerName + '.crud',
        })
      } else {
        const { validation, controller } = await loadControllerFile(route.filePath)

        // Validation middleware
        if (validation) {
          const validationMw = createValidationMiddleware(validation)
          router.expressRouter.use('/', validationMw.handler)
        }

        router[route.method as METHOD]('/', controller)
      }
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────

  /**
   * Resolves a controller name to a file path.
   * Searches for .ts and .js extensions in the controllers directory.
   */
  private resolveControllerPath(moduleDir: string, controllerName: string): string {
    const controllersDir = join(moduleDir, this.config.controllersDir)

    for (const ext of ['.ts', '.js']) {
      const filePath = join(controllersDir, controllerName + ext)
      if (existsSync(filePath)) return filePath
    }

    throw new Error(
      `[Nana Loader] Controller '${controllerName}' not found in ${controllersDir}`,
    )
  }

  /**
   * Determines which CRUD operations to generate.
   */
  private resolveCrudOperations(
    only?: string[],
    exclude?: string[],
  ): Set<string> {
    const all = new Set(['findMany', 'findOne', 'create', 'update', 'delete'])
    if (only) return new Set(only.filter(op => all.has(op)))
    if (exclude)
      for (const op of exclude) all.delete(op)

    return all
  }

  /**
   * Creates a default CRUD handler that delegates to Prisma.
   * The actual Prisma client is expected on ctx.prisma (added via middleware).
   */
  private defaultCrudHandler(
    operation: string,
    entity: string,
    hook?: (ctx: any, data: any) => any,
  ) {
    return async(ctx: any) => {
      const prisma = ctx.prisma
      if (!prisma) {
        throw new Error(
          '[Nana Loader] Prisma client not found in context. ' +
          'Add a middleware that provides ctx.prisma for CRUD operations.',
        )
      }

      const model = prisma[entity]
      if (!model)
        throw new Error(`[Nana Loader] Prisma model '${entity}' not found`)


      switch (operation) {
        case 'findMany':
          return model.findMany({
            where: ctx.query?.where ? JSON.parse(ctx.query.where) : undefined,
            skip: ctx.query?.skip ? Number(ctx.query.skip) : undefined,
            take: ctx.query?.take ? Number(ctx.query.take) : undefined,
            orderBy: ctx.query?.orderBy ? JSON.parse(ctx.query.orderBy) : undefined,
          })
        case 'findOne':
          return model.findUniqueOrThrow({ where: { id: ctx.id } })
        case 'create': {
          const data = hook ? await hook(ctx, ctx.body) : ctx.body
          return model.create({ data })
        }
        case 'update': {
          const data = hook ? await hook(ctx, ctx.body) : ctx.body
          return model.update({ where: { id: ctx.id }, data })
        }
        case 'delete':
          return model.delete({ where: { id: ctx.id } })
        case 'softDelete':
          return model.update({
            where: { id: ctx.id },
            data: { deletedAt: new Date() },
          })
        default:
          throw new Error(`[Nana Loader] Unknown CRUD operation: ${operation}`)
      }
    }
  }

  private async readYaml<T>(filePath: string): Promise<T> {
    if (!existsSync(filePath))
      throw new Error(`[Nana Loader] File not found: ${filePath}`)

    const content = await readFile(filePath, 'utf-8')
    return parseYaml(content) as T
  }
}
