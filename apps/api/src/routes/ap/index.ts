/**
 * AP routes barrel — registers all /api/v1/ AP-related routes.
 *
 * Routes:
 *   POST /api/v1/bills                             — create bill
 *   GET  /api/v1/bills                             — list bills
 *   GET  /api/v1/bills/:id                         — get bill detail
 *   PUT  /api/v1/bills/:id                         — update bill
 *   POST /api/v1/bills/:id/post                    — post bill
 *   POST /api/v1/bills/:id/void                    — void bill
 *   POST /api/v1/bill-payments                     — record bill payment
 *   GET  /api/v1/bill-payments                     — list bill payments
 *   GET  /api/v1/bill-payments/:id                 — get payment detail
 *   GET  /api/v1/vendors                           — list vendors
 *   POST /api/v1/vendors                           — create vendor
 *   PUT  /api/v1/vendors/:id                       — update vendor
 *   POST /api/v1/purchase-orders                   — create purchase order
 *   GET  /api/v1/purchase-orders                   — list purchase orders
 *   GET  /api/v1/purchase-orders/:id               — detail
 *   PUT  /api/v1/purchase-orders/:id               — update draft
 *   POST /api/v1/purchase-orders/:id/send          — send to vendor
 *   POST /api/v1/purchase-orders/:id/receive       — record received goods
 *   POST /api/v1/purchase-orders/:id/convert-to-bill — create bill from PO
 *   POST /api/v1/purchase-orders/:id/cancel        — cancel
 *   POST /api/v1/ap/batch-payment/propose          — create payment proposal
 *   POST /api/v1/ap/batch-payment/execute          — execute proposal
 *   GET  /api/v1/ap/batch-payment/history          — list past runs
 *   POST /api/v1/ap/down-payments                  — create vendor down payment
 *   POST /api/v1/ap/down-payments/:id/pay          — pay vendor advance
 *   POST /api/v1/ap/down-payments/:id/clear        — clear against bill
 *
 * Story 10.1, 10.2 — Accounts Payable
 * Story 10.3       — AP Vendor Management
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { billRoutes } from './bills.js';
import { billPaymentRoutes } from './bill-payments.js';
import { vendorRoutes } from './vendors.js';
import { purchaseOrderRoutes } from '../purchase-orders/index.js';
import { threeWayMatchRoutes } from './three-way-match.js';
import { batchPaymentRoutes } from './batch-payment.js';
import { apDownPaymentRoutes } from './down-payments.js';

export async function apRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  await fastify.register(billRoutes);
  await fastify.register(billPaymentRoutes);
  await fastify.register(vendorRoutes);
  await fastify.register(purchaseOrderRoutes);
  await fastify.register(threeWayMatchRoutes);
  await fastify.register(batchPaymentRoutes);
  await fastify.register(apDownPaymentRoutes);
}
