/**
 * Module management routes:
 *   GET    /api/v1/modules                  — list all modules from registry
 *   GET    /api/v1/modules/tenant           — list active modules for current tenant
 *   POST   /api/v1/modules/activate         — activate module (checks dependencies)
 *   POST   /api/v1/modules/deactivate       — deactivate module (checks dependents)
 *   GET    /api/v1/modules/dependencies/:code — get dependency tree for a module
 *
 * Module Toggle System — allows per-tenant activation/deactivation of ERP modules.
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { API_V1_PREFIX, ConflictError, NotFoundError } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { MODULE_MANAGE } from '../../lib/permissions.js';
import { invalidateModuleCache } from '../../hooks/require-module.js';

// ---------------------------------------------------------------------------
// JSON Schemas
// ---------------------------------------------------------------------------

const moduleRegistrySchema = {
  type: 'object',
  properties: {
    code: { type: 'string' },
    name_th: { type: 'string' },
    name_en: { type: 'string' },
    description: { type: ['string', 'null'] },
    tier: { type: 'string' },
    dependencies: { type: 'array', items: { type: 'string' } },
    is_default: { type: 'boolean' },
    sort_order: { type: 'integer' },
  },
} as const;

const tenantModuleSchema = {
  type: 'object',
  properties: {
    module_code: { type: 'string' },
    is_active: { type: 'boolean' },
    activated_at: { type: ['string', 'null'], format: 'date-time' },
    deactivated_at: { type: ['string', 'null'], format: 'date-time' },
  },
} as const;

// ---------------------------------------------------------------------------
// DB row types
// ---------------------------------------------------------------------------

interface ModuleRegistryRow {
  code: string;
  name_th: string;
  name_en: string;
  description: string | null;
  tier: string;
  dependencies: string[];
  is_default: boolean;
  sort_order: number;
}

interface TenantModuleRow {
  module_code: string;
  is_active: boolean;
  activated_at: string | null;
  deactivated_at: string | null;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

async function moduleRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  // -----------------------------------------------------------------------
  // GET /api/v1/modules — list all modules from registry
  // -----------------------------------------------------------------------
  fastify.get(`${API_V1_PREFIX}/modules`, {
    preHandler: [requireAuth],
    schema: {
      tags: ['modules'],
      summary: 'List all available modules',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            data: { type: 'array', items: moduleRegistrySchema },
          },
        },
      },
    },
  }, async (request, _reply) => {
    const rows = await request.server.sql<ModuleRegistryRow[]>`
      SELECT code, name_th, name_en, description, tier, dependencies, is_default, sort_order
      FROM module_registry
      ORDER BY sort_order ASC
    `;
    return { data: rows };
  });

  // -----------------------------------------------------------------------
  // GET /api/v1/modules/tenant — list active modules for current tenant
  // -----------------------------------------------------------------------
  fastify.get(`${API_V1_PREFIX}/modules/tenant`, {
    preHandler: [requireAuth],
    schema: {
      tags: ['modules'],
      summary: 'List activated modules for current tenant',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            data: { type: 'array', items: tenantModuleSchema },
          },
        },
      },
    },
  }, async (request, _reply) => {
    const { tenantId } = request.user;
    const rows = await request.server.sql<TenantModuleRow[]>`
      SELECT module_code, is_active, activated_at, deactivated_at
      FROM tenant_modules
      WHERE tenant_id = ${tenantId}
      ORDER BY module_code ASC
    `;
    return { data: rows };
  });

  // -----------------------------------------------------------------------
  // POST /api/v1/modules/activate — activate module for tenant
  // -----------------------------------------------------------------------
  fastify.post<{ Body: { module_code: string } }>(`${API_V1_PREFIX}/modules/activate`, {
    preHandler: [requireAuth, requirePermission(MODULE_MANAGE)],
    schema: {
      tags: ['modules'],
      summary: 'Activate a module for the current tenant',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['module_code'],
        additionalProperties: false,
        properties: {
          module_code: { type: 'string', minLength: 1 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            module_code: { type: 'string' },
            activated_dependencies: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  }, async (request, _reply) => {
    const { tenantId } = request.user;
    const { module_code } = request.body;

    // Verify module exists
    const modules = await request.server.sql<ModuleRegistryRow[]>`
      SELECT code, dependencies FROM module_registry WHERE code = ${module_code}
    `;
    if (modules.length === 0) {
      throw new NotFoundError({ detail: `Module '${module_code}' not found in registry.` });
    }

    const mod = modules[0]!;

    // Check dependencies are active
    const missingDeps: string[] = [];
    if (mod.dependencies && mod.dependencies.length > 0) {
      const activeDeps = await request.server.sql<{ module_code: string }[]>`
        SELECT module_code FROM tenant_modules
        WHERE tenant_id = ${tenantId}
          AND module_code = ANY(${mod.dependencies})
          AND is_active = TRUE
      `;
      const activeSet = new Set(activeDeps.map(r => r.module_code));
      for (const dep of mod.dependencies) {
        if (!activeSet.has(dep)) {
          missingDeps.push(dep);
        }
      }
    }

    if (missingDeps.length > 0) {
      throw new ConflictError({
        detail: `Cannot activate '${module_code}': missing dependencies [${missingDeps.join(', ')}]. Activate them first.`,
      });
    }

    // Upsert activation
    await request.server.sql`
      INSERT INTO tenant_modules (id, tenant_id, module_code, is_active, activated_at, deactivated_at)
      VALUES (gen_random_uuid()::text, ${tenantId}, ${module_code}, TRUE, NOW(), NULL)
      ON CONFLICT (tenant_id, module_code)
      DO UPDATE SET is_active = TRUE, activated_at = NOW(), deactivated_at = NULL
    `;

    invalidateModuleCache(tenantId, module_code);

    request.log.info({ tenantId, module_code }, 'Module activated');

    return {
      message: `Module '${module_code}' activated successfully.`,
      module_code,
      activated_dependencies: [],
    };
  });

  // -----------------------------------------------------------------------
  // POST /api/v1/modules/deactivate — deactivate module for tenant
  // -----------------------------------------------------------------------
  fastify.post<{ Body: { module_code: string } }>(`${API_V1_PREFIX}/modules/deactivate`, {
    preHandler: [requireAuth, requirePermission(MODULE_MANAGE)],
    schema: {
      tags: ['modules'],
      summary: 'Deactivate a module for the current tenant',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['module_code'],
        additionalProperties: false,
        properties: {
          module_code: { type: 'string', minLength: 1 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            module_code: { type: 'string' },
          },
        },
      },
    },
  }, async (request, _reply) => {
    const { tenantId } = request.user;
    const { module_code } = request.body;

    // Verify module exists
    const modules = await request.server.sql<ModuleRegistryRow[]>`
      SELECT code FROM module_registry WHERE code = ${module_code}
    `;
    if (modules.length === 0) {
      throw new NotFoundError({ detail: `Module '${module_code}' not found in registry.` });
    }

    // Check no active module depends on this one
    const dependents = await request.server.sql<{ code: string }[]>`
      SELECT mr.code
      FROM module_registry mr
      JOIN tenant_modules tm ON tm.module_code = mr.code AND tm.tenant_id = ${tenantId}
      WHERE ${module_code} = ANY(mr.dependencies)
        AND tm.is_active = TRUE
    `;

    if (dependents.length > 0) {
      const depCodes = dependents.map(d => d.code).join(', ');
      throw new ConflictError({
        detail: `Cannot deactivate '${module_code}': active modules [${depCodes}] depend on it. Deactivate them first.`,
      });
    }

    // Deactivate
    await request.server.sql`
      UPDATE tenant_modules
      SET is_active = FALSE, deactivated_at = NOW()
      WHERE tenant_id = ${tenantId} AND module_code = ${module_code}
    `;

    invalidateModuleCache(tenantId, module_code);

    request.log.info({ tenantId, module_code }, 'Module deactivated');

    return {
      message: `Module '${module_code}' deactivated successfully.`,
      module_code,
    };
  });

  // -----------------------------------------------------------------------
  // GET /api/v1/modules/dependencies/:code — dependency tree
  // -----------------------------------------------------------------------
  fastify.get<{ Params: { code: string } }>(`${API_V1_PREFIX}/modules/dependencies/:code`, {
    preHandler: [requireAuth],
    schema: {
      tags: ['modules'],
      summary: 'Get dependency tree for a module',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['code'],
        properties: {
          code: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            module: { type: 'string' },
            dependencies: { type: 'array', items: { type: 'string' } },
            dependents: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  }, async (request, _reply) => {
    const { code } = request.params;

    // Verify module exists
    const modules = await request.server.sql<ModuleRegistryRow[]>`
      SELECT code, dependencies FROM module_registry WHERE code = ${code}
    `;
    if (modules.length === 0) {
      throw new NotFoundError({ detail: `Module '${code}' not found in registry.` });
    }

    // Recursive dependency resolution
    const allModules = await request.server.sql<ModuleRegistryRow[]>`
      SELECT code, dependencies FROM module_registry
    `;
    const moduleMap = new Map(allModules.map(m => [m.code, m]));

    // Get full dependency tree (transitive)
    const deps = new Set<string>();
    function collectDeps(moduleCode: string): void {
      const mod = moduleMap.get(moduleCode);
      if (!mod?.dependencies) return;
      for (const dep of mod.dependencies) {
        if (!deps.has(dep)) {
          deps.add(dep);
          collectDeps(dep);
        }
      }
    }
    collectDeps(code);

    // Get dependents (modules that depend on this one)
    const dependents: string[] = [];
    for (const [mCode, mod] of moduleMap) {
      if (mod.dependencies?.includes(code)) {
        dependents.push(mCode);
      }
    }

    return {
      module: code,
      dependencies: [...deps],
      dependents,
    };
  });
}

// ---------------------------------------------------------------------------
// Plugin export
// ---------------------------------------------------------------------------

export async function moduleRoutesPlugin(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  await fastify.register(moduleRoutes);
}
