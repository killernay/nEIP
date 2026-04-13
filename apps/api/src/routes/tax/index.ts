/**
 * Tax routes barrel — registers all /api/v1/tax-* routes.
 *
 * Routes:
 *   GET    /api/v1/tax-rates          — list tax rates
 *   POST   /api/v1/tax-rates          — create tax rate
 *   PUT    /api/v1/tax-rates/:id      — update tax rate
 *   DELETE /api/v1/tax-rates/:id      — delete tax rate
 *
 * Story: 11.2
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { taxRateRoutes } from './tax-rates.js';
import { deferredTaxRoutes } from './deferred-tax.js';

export async function taxRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  await fastify.register(taxRateRoutes);
  await fastify.register(deferredTaxRoutes);
}
