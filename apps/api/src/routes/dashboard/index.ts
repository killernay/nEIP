/**
 * Dashboard routes barrel — registers all /api/v1/dashboard/* routes.
 *
 * Routes:
 *   GET /api/v1/dashboard/executive    — Executive dashboard metrics
 *   GET /api/v1/dashboard/consolidated — Cross-org consolidated view
 *
 * Stories 14.2, 14.3 — Executive Dashboard & Consolidated Overview
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { dashboardRoutes as dashboardHandlers } from './dashboard.js';
import { dashboardDrilldownRoutes } from './dashboard-drilldown.js';

export async function dashboardRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  await fastify.register(dashboardHandlers);
  await fastify.register(dashboardDrilldownRoutes);
}
