/**
 * GL routes barrel — registers all /api/v1/ GL-related routes.
 *
 * Routes:
 *   POST /api/v1/journal-entries              — create journal entry
 *   GET  /api/v1/journal-entries              — list journal entries
 *   POST /api/v1/journal-entries/:id/post     — post entry
 *   POST /api/v1/journal-entries/:id/reverse  — reverse entry
 *   GET  /api/v1/accounts                     — list accounts
 *   POST /api/v1/accounts                     — create account
 *   PUT  /api/v1/accounts/:id                 — update account
 *   GET  /api/v1/fiscal-years                 — list fiscal years
 *   POST /api/v1/fiscal-years                 — create fiscal year
 *   POST /api/v1/fiscal-periods/:id/close     — close period
 *   POST /api/v1/fiscal-periods/:id/reopen    — reopen period
 *   GET  /api/v1/budgets                      — list budgets
 *   POST /api/v1/budgets                      — create budget
 *   PUT  /api/v1/budgets/:id                  — update budget
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { journalEntryRoutes } from './journal-entries.js';
import { accountRoutes } from './accounts.js';
import { fiscalRoutes } from './fiscal.js';
import { budgetRoutes } from './budgets.js';
import { parallelAccountingRoutes } from './parallel-accounting.js';

export async function glRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  await fastify.register(journalEntryRoutes);
  await fastify.register(accountRoutes);
  await fastify.register(fiscalRoutes);
  await fastify.register(budgetRoutes);
  await fastify.register(parallelAccountingRoutes);
}
