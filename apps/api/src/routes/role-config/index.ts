/**
 * Role config routes barrel — role templates + UI config endpoint.
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { roleTemplateRoutes } from './role-templates.js';
import { uiConfigRoute } from './ui-config.js';

export async function roleConfigRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  await fastify.register(roleTemplateRoutes);
  await fastify.register(uiConfigRoute);
}
