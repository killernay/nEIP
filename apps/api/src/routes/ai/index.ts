/**
 * AI routes barrel — registers all /api/v1/ai/* routes.
 *
 * Routes:
 *   POST /api/v1/ai/anomaly-scan       — Run anomaly detection scan
 *   GET  /api/v1/ai/cash-forecast      — Cash flow forecast
 *   POST /api/v1/ai/categorize         — Smart categorization
 *   POST /api/v1/ai/bank-reconcile/:id — Bank auto-reconciliation
 *   POST /api/v1/ai/parse-document     — NLP document parsing
 *   GET  /api/v1/ai/predictions        — Predictive analytics
 *
 * Story 6.1-6.5, 6.8 — AI Agents API
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { aiHandlers } from './ai-routes.js';

export async function aiRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  await fastify.register(aiHandlers);
}
