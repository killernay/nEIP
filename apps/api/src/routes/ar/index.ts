/**
 * AR routes barrel — registers all /api/v1/ AR-related routes.
 *
 * Routes:
 *   POST /api/v1/invoices                      — create invoice
 *   GET  /api/v1/invoices                      — list invoices
 *   GET  /api/v1/invoices/:id                  — get invoice detail
 *   POST /api/v1/invoices/:id/void             — void invoice
 *   POST /api/v1/payments                      — record payment
 *   GET  /api/v1/payments                      — list payments
 *   POST /api/v1/payments/:id/match            — match payment to invoices
 *   POST /api/v1/sales-orders                  — create sales order
 *   GET  /api/v1/sales-orders                  — list sales orders
 *   GET  /api/v1/sales-orders/:id              — detail
 *   PUT  /api/v1/sales-orders/:id              — update draft
 *   POST /api/v1/sales-orders/:id/confirm      — confirm
 *   POST /api/v1/sales-orders/:id/cancel       — cancel
 *   POST /api/v1/delivery-notes                — create delivery note
 *   GET  /api/v1/delivery-notes                — list
 *   GET  /api/v1/delivery-notes/:id            — detail
 *   POST /api/v1/delivery-notes/:id/deliver    — mark delivered
 *   POST /api/v1/receipts                      — issue receipt
 *   GET  /api/v1/receipts                      — list
 *   GET  /api/v1/receipts/:id                  — detail
 *   POST /api/v1/receipts/:id/void             — void receipt
 *   POST /api/v1/credit-notes                  — create credit note
 *   GET  /api/v1/credit-notes                  — list
 *   GET  /api/v1/credit-notes/:id              — detail
 *   POST /api/v1/credit-notes/:id/issue        — issue
 *   POST /api/v1/credit-notes/:id/void         — void
 *   GET  /api/v1/ar/collections/worklist       — overdue invoice worklist
 *   POST /api/v1/ar/collections/promise-to-pay — record promise to pay
 *   GET  /api/v1/ar/collections/dashboard      — collections dashboard
 *   POST /api/v1/ar/collections/escalate       — escalate dunning level
 *   POST /api/v1/ar/down-payments              — create AR down payment
 *   POST /api/v1/ar/down-payments/:id/receive  — record receipt
 *   POST /api/v1/ar/down-payments/:id/clear    — clear against invoice
 *   POST /api/v1/invoices/:id/convert-to-standard — convert proforma
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { invoiceRoutes } from './invoices.js';
import { paymentRoutes } from './payments.js';
import { salesOrderRoutes } from '../sales-orders/index.js';
import { deliveryNoteRoutes } from '../delivery-notes/index.js';
import { receiptRoutes } from '../receipts/index.js';
import { creditNoteRoutes } from '../credit-notes/index.js';
import { collectionRoutes } from './collections.js';
import { arDownPaymentRoutes } from './down-payments.js';
import { proformaRoutes } from './proforma.js';

export async function arRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  await fastify.register(invoiceRoutes);
  await fastify.register(paymentRoutes);
  await fastify.register(salesOrderRoutes);
  await fastify.register(deliveryNoteRoutes);
  await fastify.register(receiptRoutes);
  await fastify.register(creditNoteRoutes);
  await fastify.register(collectionRoutes);
  await fastify.register(arDownPaymentRoutes);
  await fastify.register(proformaRoutes);
}
