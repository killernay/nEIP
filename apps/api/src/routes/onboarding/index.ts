/**
 * Onboarding routes barrel — registers all /api/v1/onboarding/* routes.
 *
 * Routes:
 *   GET  /api/v1/onboarding/templates   — list 7 industry templates (public)
 *   GET  /api/v1/onboarding/status      — get current onboarding state
 *   POST /api/v1/onboarding/step/1      — company profile
 *   POST /api/v1/onboarding/step/2      — select industry template
 *   POST /api/v1/onboarding/step/3      — customize modules
 *   POST /api/v1/onboarding/step/4      — enterprise structure
 *   POST /api/v1/onboarding/step/5      — admin user + roles
 *   POST /api/v1/onboarding/step/6      — complete + seed data
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { getTemplatesRoute } from './get-templates.js';
import { getStatusRoute } from './get-status.js';
import { stepsRoute } from './steps.js';

export async function onboardingRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  await fastify.register(getTemplatesRoute);
  await fastify.register(getStatusRoute);
  await fastify.register(stepsRoute);
}
