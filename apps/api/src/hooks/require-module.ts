/**
 * require-module.ts — Fastify preHandler factory for module-based access control.
 *
 * Usage:
 *   import { requireModule } from '../../hooks/require-module.js';
 *
 *   fastify.get('/inventory/products', {
 *     preHandler: [requireAuth, requireModule('inventory')],
 *   }, handler);
 *
 * Behaviour:
 *   1. Reads the tenant ID from `request.user.tenantId` (populated by requireAuth).
 *   2. Checks if the specified module is active for that tenant.
 *   3. Returns 403 if the module is not activated.
 *
 * Caching:
 *   Uses an in-memory Map with 5-minute TTL keyed on `tenantId:moduleCode`.
 */

import type { FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';

// ---------------------------------------------------------------------------
// In-memory cache with 5-minute TTL
// ---------------------------------------------------------------------------

interface CacheEntry {
  active: boolean;
  expiresAt: number;
}

const MODULE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const moduleCache = new Map<string, CacheEntry>();

/**
 * Check whether a module is active for a given tenant.
 * Uses in-memory cache to avoid hitting the DB on every request.
 */
async function checkModuleActive(
  request: FastifyRequest,
  tenantId: string,
  moduleCode: string,
): Promise<boolean> {
  const cacheKey = `${tenantId}:${moduleCode}`;
  const now = Date.now();

  const cached = moduleCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.active;
  }

  const rows = await request.server.sql<{ is_active: boolean }[]>`
    SELECT is_active
    FROM tenant_modules
    WHERE tenant_id = ${tenantId}
      AND module_code = ${moduleCode}
    LIMIT 1
  `;

  const active = rows.length > 0 && (rows[0]?.is_active ?? false);

  moduleCache.set(cacheKey, { active, expiresAt: now + MODULE_CACHE_TTL_MS });

  return active;
}

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------

/**
 * Returns a Fastify preHandler that asserts the specified module is activated
 * for the authenticated user's tenant.
 *
 * Must be used **after** `requireAuth` in the preHandler chain.
 */
export function requireModule(moduleCode: string): preHandlerHookHandler {
  return async function checkModule(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const tenantId = request.user.tenantId;
    const active = await checkModuleActive(request, tenantId, moduleCode);

    if (!active) {
      request.log.warn(
        { tenantId, moduleCode },
        'Module access denied — module not activated',
      );

      void reply.status(403).send({
        type: 'https://problems.neip.app/module-not-activated',
        title: 'Module Not Activated',
        status: 403,
        detail: `Module '${moduleCode}' is not activated for this tenant.`,
        module: moduleCode,
      });
    }
  };
}

/**
 * Invalidate cache for a specific tenant+module (call after activate/deactivate).
 */
export function invalidateModuleCache(tenantId: string, moduleCode: string): void {
  moduleCache.delete(`${tenantId}:${moduleCode}`);
}

/**
 * Invalidate all module cache entries for a tenant.
 */
export function invalidateTenantModuleCache(tenantId: string): void {
  for (const key of moduleCache.keys()) {
    if (key.startsWith(`${tenantId}:`)) {
      moduleCache.delete(key);
    }
  }
}
