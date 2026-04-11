/**
 * Bill Payment routes:
 *   POST /api/v1/bill-payments         — record bill payment
 *   GET  /api/v1/bill-payments         — list bill payments
 *   GET  /api/v1/bill-payments/:id     — get payment detail
 *
 * Story 10.2 — Bill Payment Recording + Matching
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import {
  AP_PAYMENT_CREATE,
  AP_PAYMENT_READ,
} from '../../lib/permissions.js';
import { nextDocNumber } from '@neip/core';

// ---------------------------------------------------------------------------
// JSON Schemas
// ---------------------------------------------------------------------------

const createBillPaymentBodySchema = {
  type: 'object',
  required: ['billId', 'amountSatang', 'paymentDate', 'paymentMethod'],
  additionalProperties: false,
  properties: {
    billId: { type: 'string', description: 'Bill ID to pay' },
    amountSatang: { type: 'string', description: 'Payment amount in satang' },
    paymentDate: { type: 'string', format: 'date', description: 'Date of payment (YYYY-MM-DD)' },
    paymentMethod: {
      type: 'string',
      enum: ['cash', 'bank_transfer', 'cheque', 'promptpay'],
      description: 'Payment method',
    },
    apAccountId: { type: 'string', description: 'AP account to debit (optional)' },
    cashAccountId: { type: 'string', description: 'Cash/Bank account to credit (optional)' },
    reference: { type: 'string', maxLength: 255, description: 'External reference number' },
    notes: { type: 'string', maxLength: 2000 },
  },
} as const;

const billPaymentResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    documentNumber: { type: 'string' },
    billId: { type: 'string' },
    amountSatang: { type: 'string' },
    paymentDate: { type: 'string', format: 'date' },
    paymentMethod: { type: 'string' },
    reference: { type: 'string', nullable: true },
    notes: { type: 'string', nullable: true },
    journalEntryId: { type: 'string', nullable: true },
    billStatus: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
  },
} as const;

const listQuerySchema = {
  type: 'object',
  properties: {
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    offset: { type: 'integer', minimum: 0, default: 0 },
    billId: { type: 'string' },
    sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
  },
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateBillPaymentBody {
  billId: string;
  amountSatang: string;
  paymentDate: string;
  paymentMethod: string;
  apAccountId?: string;
  cashAccountId?: string;
  reference?: string;
  notes?: string;
}

interface BillPaymentListQuery {
  limit?: number;
  offset?: number;
  billId?: string;
  sortOrder?: string;
}

interface IdParams {
  id: string;
}

interface BillPaymentRow {
  id: string;
  document_number: string;
  bill_id: string;
  amount_satang: bigint;
  payment_date: string;
  payment_method: string;
  reference: string | null;
  notes: string | null;
  journal_entry_id: string | null;
  tenant_id: string;
  created_by: string;
  created_at: Date | string;
}

interface BillRow {
  id: string;
  total_satang: bigint;
  paid_satang: bigint;
  status: string;
}

interface CountRow {
  count: string;
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export async function billPaymentRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  // -------------------------------------------------------------------------
  // POST /api/v1/bill-payments — record bill payment
  // -------------------------------------------------------------------------
  fastify.post<{ Body: CreateBillPaymentBody }>(
    `${API_V1_PREFIX}/bill-payments`,
    {
      schema: {
        description: 'Record a payment against a bill',
        tags: ['ap'],
        security: [{ bearerAuth: [] }],
        body: createBillPaymentBodySchema,
        response: { 201: { description: 'Bill payment recorded', ...billPaymentResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AP_PAYMENT_CREATE)],
    },
    async (request, reply) => {
      const {
        billId, amountSatang, paymentDate, paymentMethod, reference, notes,
      } = request.body;
      const { tenantId, sub: userId } = request.user;

      // Verify bill exists.
      const billRows = await fastify.sql<[BillRow?]>`
        SELECT id, total_satang, paid_satang, status FROM bills WHERE id = ${billId} AND tenant_id = ${tenantId} LIMIT 1
      `;
      const bill = billRows[0];
      if (!bill) {
        throw new NotFoundError({ detail: `Bill ${billId} not found.` });
      }

      const amountBigInt = BigInt(amountSatang);
      const currentPaid = BigInt(bill.paid_satang);
      const totalSatang = BigInt(bill.total_satang);

      // Overpayment check
      if (currentPaid + amountBigInt > totalSatang) {
        throw new ValidationError({
          detail: `Payment amount ${amountSatang} exceeds outstanding balance ${(totalSatang - currentPaid).toString()} satang.`,
        });
      }

      const paymentId = crypto.randomUUID();
      const documentNumber = await nextDocNumber(fastify.sql, tenantId, 'bill_payment', new Date().getFullYear());

      await fastify.sql`
        INSERT INTO bill_payments (id, document_number, bill_id, amount_satang, payment_date, payment_method, reference, notes, tenant_id, created_by)
        VALUES (${paymentId}, ${documentNumber}, ${billId}, ${amountBigInt.toString()}::bigint, ${paymentDate}, ${paymentMethod}, ${reference ?? null}, ${notes ?? null}, ${tenantId}, ${userId})
      `;

      // Update bill paid_satang and status.
      const newPaid = currentPaid + amountBigInt;
      const newStatus = newPaid >= bill.total_satang ? 'paid' : 'partial';

      await fastify.sql`
        UPDATE bills SET paid_satang = ${newPaid.toString()}::bigint, status = ${newStatus}, updated_at = NOW()
        WHERE id = ${billId} AND tenant_id = ${tenantId}
      `;

      request.log.info({ paymentId, documentNumber, billId, tenantId, userId }, 'Bill payment recorded');

      return reply.status(201).send({
        id: paymentId,
        documentNumber,
        billId,
        amountSatang,
        paymentDate,
        paymentMethod,
        reference: reference ?? null,
        notes: notes ?? null,
        journalEntryId: null,
        billStatus: newStatus,
        createdAt: new Date().toISOString(),
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/bill-payments — list bill payments
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: BillPaymentListQuery }>(
    `${API_V1_PREFIX}/bill-payments`,
    {
      schema: {
        description: 'List bill payments with pagination',
        tags: ['ap'],
        security: [{ bearerAuth: [] }],
        querystring: listQuerySchema,
        response: {
          200: {
            description: 'Paginated list of bill payments',
            type: 'object',
            properties: {
              items: { type: 'array', items: billPaymentResponseSchema },
              total: { type: 'integer' },
              limit: { type: 'integer' },
              offset: { type: 'integer' },
              hasMore: { type: 'boolean' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(AP_PAYMENT_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const limit = request.query.limit ?? 20;
      const offset = request.query.offset ?? 0;
      const { billId } = request.query;

      let countRows: CountRow[];
      let payments: BillPaymentRow[];

      if (billId !== undefined) {
        countRows = await fastify.sql<CountRow[]>`
          SELECT COUNT(*)::text as count FROM bill_payments WHERE tenant_id = ${tenantId} AND bill_id = ${billId}
        `;
        payments = await fastify.sql<BillPaymentRow[]>`
          SELECT * FROM bill_payments WHERE tenant_id = ${tenantId} AND bill_id = ${billId}
          ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        countRows = await fastify.sql<CountRow[]>`
          SELECT COUNT(*)::text as count FROM bill_payments WHERE tenant_id = ${tenantId}
        `;
        payments = await fastify.sql<BillPaymentRow[]>`
          SELECT * FROM bill_payments WHERE tenant_id = ${tenantId}
          ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
      }

      const total = parseInt(countRows[0]?.count ?? '0', 10);
      const items = payments.map((p) => ({
        id: p.id,
        documentNumber: p.document_number,
        billId: p.bill_id,
        amountSatang: p.amount_satang.toString(),
        paymentDate: p.payment_date,
        paymentMethod: p.payment_method,
        reference: p.reference,
        notes: p.notes,
        journalEntryId: p.journal_entry_id,
        billStatus: 'paid',
        createdAt: toISO(p.created_at),
      }));

      return reply.status(200).send({ items, total, limit, offset, hasMore: offset + limit < total });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/bill-payments/:id — get payment detail
  // -------------------------------------------------------------------------
  fastify.get<{ Params: IdParams }>(
    `${API_V1_PREFIX}/bill-payments/:id`,
    {
      schema: {
        description: 'Get bill payment details by ID',
        tags: ['ap'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: { 200: { description: 'Bill payment details', ...billPaymentResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AP_PAYMENT_READ)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const rows = await fastify.sql<[BillPaymentRow?]>`
        SELECT * FROM bill_payments WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      const payment = rows[0];
      if (!payment) {
        throw new NotFoundError({ detail: `Bill payment ${id} not found.` });
      }

      return reply.status(200).send({
        id: payment.id,
        documentNumber: payment.document_number,
        billId: payment.bill_id,
        amountSatang: payment.amount_satang.toString(),
        paymentDate: payment.payment_date,
        paymentMethod: payment.payment_method,
        reference: payment.reference,
        notes: payment.notes,
        journalEntryId: payment.journal_entry_id,
        billStatus: 'posted',
        createdAt: toISO(payment.created_at),
      });
    },
  );
}
