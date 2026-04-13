/**
 * Collections Management routes (AR worklist):
 *   GET  /api/v1/ar/collections/worklist      — list overdue invoices
 *   POST /api/v1/ar/collections/promise-to-pay — record promise to pay
 *   GET  /api/v1/ar/collections/dashboard     — overdue summary
 *   POST /api/v1/ar/collections/escalate      — escalate dunning level
 *
 * SAP-gap Phase 1 — Collections Management
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import {
  AR_COLLECTION_READ,
  AR_COLLECTION_MANAGE,
} from '../../lib/permissions.js';

// ---------------------------------------------------------------------------
// JSON Schemas
// ---------------------------------------------------------------------------

const worklistQuerySchema = {
  type: 'object',
  properties: {
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    offset: { type: 'integer', minimum: 0, default: 0 },
    customerId: { type: 'string' },
    minDaysOverdue: { type: 'integer', minimum: 1, default: 1 },
  },
} as const;

const promiseBodySchema = {
  type: 'object',
  required: ['invoiceId', 'promisedDate'],
  additionalProperties: false,
  properties: {
    invoiceId: { type: 'string', description: 'Invoice ID' },
    promisedDate: { type: 'string', format: 'date', description: 'Promised payment date' },
    promisedAmountSatang: { type: 'string', description: 'Promised amount in satang (defaults to outstanding)' },
    notes: { type: 'string', maxLength: 2000 },
  },
} as const;

const escalateBodySchema = {
  type: 'object',
  required: ['invoiceId'],
  additionalProperties: false,
  properties: {
    invoiceId: { type: 'string', description: 'Invoice ID to escalate' },
    notes: { type: 'string', maxLength: 2000 },
  },
} as const;

const promiseResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    invoiceId: { type: 'string' },
    customerId: { type: 'string' },
    promisedDate: { type: 'string', format: 'date' },
    promisedAmountSatang: { type: 'string' },
    status: { type: 'string' },
    dunningLevel: { type: 'integer' },
    notes: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
  },
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WorklistQuery {
  limit?: number;
  offset?: number;
  customerId?: string;
  minDaysOverdue?: number;
}

interface PromiseBody {
  invoiceId: string;
  promisedDate: string;
  promisedAmountSatang?: string;
  notes?: string;
}

interface EscalateBody {
  invoiceId: string;
  notes?: string;
}

interface OverdueRow {
  id: string;
  invoice_number: string;
  customer_id: string;
  total_satang: bigint;
  paid_satang: bigint;
  due_date: string;
  days_overdue: number;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
}

interface CountRow {
  count: string;
}

interface AgingRow {
  bucket: string;
  count: string;
  total_outstanding_satang: string;
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export async function collectionRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  // -------------------------------------------------------------------------
  // GET /api/v1/ar/collections/worklist
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: WorklistQuery }>(
    `${API_V1_PREFIX}/ar/collections/worklist`,
    {
      schema: {
        description: 'List overdue invoices sorted by days overdue, with customer contact info',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        querystring: worklistQuerySchema,
        response: {
          200: {
            description: 'Overdue invoice worklist',
            type: 'object',
            properties: {
              items: { type: 'array', items: { type: 'object' } },
              total: { type: 'integer' },
              limit: { type: 'integer' },
              offset: { type: 'integer' },
              hasMore: { type: 'boolean' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(AR_COLLECTION_READ)],
    },
    async (request, _reply) => {
      const { tenantId } = request.user;
      const { limit = 20, offset = 0, customerId, minDaysOverdue = 1 } = request.query;

      const baseWhere = customerId
        ? fastify.sql`AND i.customer_id = ${customerId}`
        : fastify.sql``;

      const items = await fastify.sql<OverdueRow[]>`
        SELECT
          i.id, i.invoice_number, i.customer_id,
          i.total_satang, i.paid_satang, i.due_date,
          (CURRENT_DATE - i.due_date::date) AS days_overdue,
          c.name AS customer_name,
          c.email AS customer_email,
          c.phone AS customer_phone
        FROM invoices i
        LEFT JOIN contacts c ON c.id = i.customer_id
        WHERE i.tenant_id = ${tenantId}
          AND i.status IN ('posted', 'sent', 'partial', 'overdue')
          AND i.total_satang > i.paid_satang
          AND (CURRENT_DATE - i.due_date::date) >= ${minDaysOverdue}
          AND i.invoice_type = 'standard'
          ${baseWhere}
        ORDER BY days_overdue DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countRows = await fastify.sql<CountRow[]>`
        SELECT count(*)::text AS count
        FROM invoices i
        WHERE i.tenant_id = ${tenantId}
          AND i.status IN ('posted', 'sent', 'partial', 'overdue')
          AND i.total_satang > i.paid_satang
          AND (CURRENT_DATE - i.due_date::date) >= ${minDaysOverdue}
          AND i.invoice_type = 'standard'
          ${baseWhere}
      `;

      const total = parseInt(countRows[0]?.count ?? '0', 10);

      return {
        items: items.map(r => ({
          id: r.id,
          invoiceNumber: r.invoice_number,
          customerId: r.customer_id,
          totalSatang: r.total_satang.toString(),
          paidSatang: r.paid_satang.toString(),
          outstandingSatang: (BigInt(r.total_satang) - BigInt(r.paid_satang)).toString(),
          dueDate: r.due_date,
          daysOverdue: r.days_overdue,
          customerName: r.customer_name,
          customerEmail: r.customer_email,
          customerPhone: r.customer_phone,
        })),
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      };
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/ar/collections/promise-to-pay
  // -------------------------------------------------------------------------
  fastify.post<{ Body: PromiseBody }>(
    `${API_V1_PREFIX}/ar/collections/promise-to-pay`,
    {
      schema: {
        description: 'Record a customer promise to pay',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        body: promiseBodySchema,
        response: { 201: { description: 'Promise recorded', ...promiseResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AR_COLLECTION_MANAGE)],
    },
    async (request, reply) => {
      const { invoiceId, promisedDate, promisedAmountSatang, notes } = request.body;
      const { tenantId, sub: userId } = request.user;

      // Validate invoice exists and is overdue
      const invRows = await fastify.sql<[{ id: string; customer_id: string; total_satang: bigint; paid_satang: bigint; status: string }?]>`
        SELECT id, customer_id, total_satang, paid_satang, status
        FROM invoices
        WHERE id = ${invoiceId} AND tenant_id = ${tenantId} AND invoice_type = 'standard'
        LIMIT 1
      `;
      const inv = invRows[0];
      if (!inv) {
        throw new NotFoundError({ detail: `Invoice ${invoiceId} not found.` });
      }

      const outstanding = BigInt(inv.total_satang) - BigInt(inv.paid_satang);
      if (outstanding <= 0n) {
        throw new ValidationError({ detail: 'Invoice is already fully paid.' });
      }

      const amount = promisedAmountSatang ? BigInt(promisedAmountSatang) : outstanding;
      if (amount <= 0n || amount > outstanding) {
        throw new ValidationError({ detail: `Promised amount must be between 1 and ${outstanding.toString()} satang.` });
      }

      const promiseId = crypto.randomUUID();
      const now = new Date();

      await fastify.sql`
        INSERT INTO collection_promises (id, invoice_id, customer_id, promised_date, promised_amount_satang, status, dunning_level, notes, tenant_id, created_by, created_at, updated_at)
        VALUES (${promiseId}, ${invoiceId}, ${inv.customer_id}, ${promisedDate}::date, ${amount.toString()}::bigint, 'pending', 0, ${notes ?? null}, ${tenantId}, ${userId}, ${now.toISOString()}::timestamptz, ${now.toISOString()}::timestamptz)
      `;

      void reply.status(201);
      return {
        id: promiseId,
        invoiceId,
        customerId: inv.customer_id,
        promisedDate,
        promisedAmountSatang: amount.toString(),
        status: 'pending',
        dunningLevel: 0,
        notes: notes ?? null,
        createdAt: toISO(now),
      };
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/ar/collections/dashboard
  // -------------------------------------------------------------------------
  fastify.get(
    `${API_V1_PREFIX}/ar/collections/dashboard`,
    {
      schema: {
        description: 'Collections dashboard — total overdue by aging bucket and customer',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Collections dashboard summary',
            type: 'object',
            properties: {
              totalOverdueCount: { type: 'integer' },
              totalOverdueSatang: { type: 'string' },
              agingBuckets: { type: 'array', items: { type: 'object' } },
              topCustomers: { type: 'array', items: { type: 'object' } },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(AR_COLLECTION_READ)],
    },
    async (request, _reply) => {
      const { tenantId } = request.user;

      // Total overdue
      const totalRows = await fastify.sql<[{ count: string; total: string }]>`
        SELECT count(*)::text AS count, COALESCE(sum(total_satang - paid_satang), 0)::text AS total
        FROM invoices
        WHERE tenant_id = ${tenantId}
          AND status IN ('posted', 'sent', 'partial', 'overdue')
          AND total_satang > paid_satang
          AND due_date::date < CURRENT_DATE
          AND invoice_type = 'standard'
      `;

      // Aging buckets: 1-30, 31-60, 61-90, 90+
      const agingRows = await fastify.sql<AgingRow[]>`
        SELECT
          CASE
            WHEN (CURRENT_DATE - due_date::date) BETWEEN 1 AND 30 THEN '1-30'
            WHEN (CURRENT_DATE - due_date::date) BETWEEN 31 AND 60 THEN '31-60'
            WHEN (CURRENT_DATE - due_date::date) BETWEEN 61 AND 90 THEN '61-90'
            ELSE '90+'
          END AS bucket,
          count(*)::text AS count,
          sum(total_satang - paid_satang)::text AS total_outstanding_satang
        FROM invoices
        WHERE tenant_id = ${tenantId}
          AND status IN ('posted', 'sent', 'partial', 'overdue')
          AND total_satang > paid_satang
          AND due_date::date < CURRENT_DATE
          AND invoice_type = 'standard'
        GROUP BY bucket
        ORDER BY bucket
      `;

      // Top customers by overdue amount
      const topCustomers = await fastify.sql<{ customer_id: string; customer_name: string | null; total_outstanding_satang: string; invoice_count: string }[]>`
        SELECT
          i.customer_id,
          c.name AS customer_name,
          sum(i.total_satang - i.paid_satang)::text AS total_outstanding_satang,
          count(*)::text AS invoice_count
        FROM invoices i
        LEFT JOIN contacts c ON c.id = i.customer_id
        WHERE i.tenant_id = ${tenantId}
          AND i.status IN ('posted', 'sent', 'partial', 'overdue')
          AND i.total_satang > i.paid_satang
          AND i.due_date::date < CURRENT_DATE
          AND i.invoice_type = 'standard'
        GROUP BY i.customer_id, c.name
        ORDER BY sum(i.total_satang - i.paid_satang) DESC
        LIMIT 10
      `;

      return {
        totalOverdueCount: parseInt(totalRows[0]?.count ?? '0', 10),
        totalOverdueSatang: totalRows[0]?.total ?? '0',
        agingBuckets: agingRows.map(r => ({
          bucket: r.bucket,
          count: parseInt(r.count, 10),
          totalOutstandingSatang: r.total_outstanding_satang,
        })),
        topCustomers: topCustomers.map(r => ({
          customerId: r.customer_id,
          customerName: r.customer_name,
          totalOutstandingSatang: r.total_outstanding_satang,
          invoiceCount: parseInt(r.invoice_count, 10),
        })),
      };
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/ar/collections/escalate
  // -------------------------------------------------------------------------
  fastify.post<{ Body: EscalateBody }>(
    `${API_V1_PREFIX}/ar/collections/escalate`,
    {
      schema: {
        description: 'Escalate dunning level for an overdue invoice',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        body: escalateBodySchema,
        response: { 200: { description: 'Escalated', ...promiseResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AR_COLLECTION_MANAGE)],
    },
    async (request, _reply) => {
      const { invoiceId, notes } = request.body;
      const { tenantId, sub: userId } = request.user;

      // Validate invoice
      const invRows = await fastify.sql<[{ id: string; customer_id: string; total_satang: bigint; paid_satang: bigint }?]>`
        SELECT id, customer_id, total_satang, paid_satang
        FROM invoices
        WHERE id = ${invoiceId} AND tenant_id = ${tenantId} AND invoice_type = 'standard'
        LIMIT 1
      `;
      if (!invRows[0]) {
        throw new NotFoundError({ detail: `Invoice ${invoiceId} not found.` });
      }

      // Get current highest dunning level for this invoice
      const existingRows = await fastify.sql<[{ max_level: number }]>`
        SELECT COALESCE(max(dunning_level), 0) AS max_level
        FROM collection_promises
        WHERE invoice_id = ${invoiceId} AND tenant_id = ${tenantId}
      `;
      const newLevel = (existingRows[0]?.max_level ?? 0) + 1;

      const outstanding = BigInt(invRows[0].total_satang) - BigInt(invRows[0].paid_satang);
      const promiseId = crypto.randomUUID();
      const now = new Date();

      await fastify.sql`
        INSERT INTO collection_promises (id, invoice_id, customer_id, promised_date, promised_amount_satang, status, dunning_level, notes, tenant_id, created_by, created_at, updated_at)
        VALUES (${promiseId}, ${invoiceId}, ${invRows[0].customer_id}, ${now.toISOString().slice(0, 10)}::date, ${outstanding.toString()}::bigint, 'escalated', ${newLevel}, ${notes ?? null}, ${tenantId}, ${userId}, ${now.toISOString()}::timestamptz, ${now.toISOString()}::timestamptz)
      `;

      return {
        id: promiseId,
        invoiceId,
        customerId: invRows[0].customer_id,
        promisedDate: now.toISOString().slice(0, 10),
        promisedAmountSatang: outstanding.toString(),
        status: 'escalated',
        dunningLevel: newLevel,
        notes: notes ?? null,
        createdAt: toISO(now),
      };
    },
  );
}
