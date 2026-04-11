/**
 * Sales Order routes (ใบสั่งขาย / SO):
 *   POST /api/v1/sales-orders             — create (can reference quotation_id)
 *   GET  /api/v1/sales-orders             — list with filters
 *   GET  /api/v1/sales-orders/:id         — detail
 *   PUT  /api/v1/sales-orders/:id         — update draft
 *   POST /api/v1/sales-orders/:id/confirm — draft → confirmed
 *   POST /api/v1/sales-orders/:id/cancel  — cancel
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, ConflictError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import {
  AR_SO_CREATE,
  AR_SO_READ,
  AR_SO_UPDATE,
  AR_SO_CONFIRM,
} from '../../lib/permissions.js';
import { nextDocNumber } from '@neip/core';

// ---------------------------------------------------------------------------
// JSON Schemas
// ---------------------------------------------------------------------------

const soLineSchema = {
  type: 'object',
  required: ['description', 'quantity', 'unitPriceSatang'],
  additionalProperties: false,
  properties: {
    description: { type: 'string', minLength: 1, maxLength: 500 },
    quantity: { type: 'number', minimum: 0.01 },
    unitPriceSatang: { type: 'string', description: 'Unit price in satang' },
    accountId: { type: 'string', description: 'Revenue account ID' },
  },
} as const;

const createSoBodySchema = {
  type: 'object',
  required: ['customerId', 'customerName', 'orderDate', 'lines'],
  additionalProperties: false,
  properties: {
    customerId: { type: 'string' },
    customerName: { type: 'string', minLength: 1, maxLength: 255 },
    orderDate: { type: 'string', format: 'date' },
    expectedDeliveryDate: { type: 'string', format: 'date' },
    quotationId: { type: 'string', description: 'Optional reference to a quotation' },
    notes: { type: 'string', maxLength: 2000 },
    lines: { type: 'array', minItems: 1, items: soLineSchema },
  },
} as const;

const updateSoBodySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    customerName: { type: 'string', minLength: 1, maxLength: 255 },
    orderDate: { type: 'string', format: 'date' },
    expectedDeliveryDate: { type: 'string', format: 'date' },
    notes: { type: 'string', maxLength: 2000 },
    lines: { type: 'array', minItems: 1, items: soLineSchema },
  },
} as const;

const soResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    documentNumber: { type: 'string' },
    customerId: { type: 'string' },
    customerName: { type: 'string' },
    status: { type: 'string', enum: ['draft', 'confirmed', 'partial_delivered', 'delivered', 'cancelled'] },
    orderDate: { type: 'string', format: 'date' },
    expectedDeliveryDate: { type: 'string', nullable: true },
    totalSatang: { type: 'string' },
    quotationId: { type: 'string', nullable: true },
    notes: { type: 'string', nullable: true },
    lines: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          lineNumber: { type: 'integer' },
          description: { type: 'string' },
          quantity: { type: 'number' },
          unitPriceSatang: { type: 'integer' },
          amountSatang: { type: 'string' },
          accountId: { type: 'string', nullable: true },
          deliveredQuantity: { type: 'number' },
        },
      },
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

const listQuerySchema = {
  type: 'object',
  properties: {
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    offset: { type: 'integer', minimum: 0, default: 0 },
    status: { type: 'string', enum: ['draft', 'confirmed', 'partial_delivered', 'delivered', 'cancelled'] },
    customerId: { type: 'string' },
  },
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateSoBody {
  customerId: string;
  customerName: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  quotationId?: string;
  notes?: string;
  lines: Array<{
    description: string;
    quantity: number;
    unitPriceSatang: string;
    accountId?: string;
  }>;
}

interface UpdateSoBody {
  customerName?: string;
  orderDate?: string;
  expectedDeliveryDate?: string;
  notes?: string;
  lines?: Array<{
    description: string;
    quantity: number;
    unitPriceSatang: string;
    accountId?: string;
  }>;
}

interface SoListQuery {
  limit?: number;
  offset?: number;
  status?: string;
  customerId?: string;
}

interface IdParams {
  id: string;
}

interface SoRow {
  id: string;
  document_number: string;
  customer_id: string;
  customer_name: string;
  status: string;
  order_date: string;
  expected_delivery_date: string | null;
  total_satang: bigint;
  quotation_id: string | null;
  notes: string | null;
  tenant_id: string;
  created_by: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface SoLineRow {
  id: string;
  sales_order_id: string;
  line_number: number;
  description: string;
  quantity: number;
  delivered_quantity: number;
  unit_price_satang: bigint;
  amount_satang: bigint;
  account_id: string | null;
}

interface CountRow {
  count: string;
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export async function salesOrderRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  // -------------------------------------------------------------------------
  // POST /api/v1/sales-orders — create
  // -------------------------------------------------------------------------
  fastify.post<{ Body: CreateSoBody }>(
    `${API_V1_PREFIX}/sales-orders`,
    {
      schema: {
        description: 'Create a new sales order (ใบสั่งขาย)',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        body: createSoBodySchema,
        response: { 201: { description: 'Sales order created', ...soResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AR_SO_CREATE)],
    },
    async (request, reply) => {
      const { customerId, customerName, orderDate, expectedDeliveryDate, quotationId, notes, lines } = request.body;
      const { tenantId, sub: userId } = request.user;

      let totalSatang = 0n;
      const processedLines = lines.map((line, index) => {
        const qty = BigInt(Math.round(line.quantity * 10000));
        const price = BigInt(line.unitPriceSatang);
        const amount = qty * price / 10000n;
        totalSatang += amount;
        return {
          id: crypto.randomUUID(),
          lineNumber: index + 1,
          description: line.description,
          quantity: line.quantity,
          unitPriceSatang: line.unitPriceSatang,
          amountSatang: amount.toString(),
          accountId: line.accountId ?? null,
        };
      });

      const soId = crypto.randomUUID();
      const documentNumber = await nextDocNumber(fastify.sql, tenantId, 'sales_order', new Date().getFullYear());

      await fastify.sql`
        INSERT INTO sales_orders (id, document_number, customer_id, customer_name, status, order_date, expected_delivery_date, total_satang, quotation_id, notes, tenant_id, created_by)
        VALUES (${soId}, ${documentNumber}, ${customerId}, ${customerName}, 'draft',
                ${orderDate}, ${expectedDeliveryDate ?? null}, ${totalSatang.toString()}::bigint,
                ${quotationId ?? null}, ${notes ?? null}, ${tenantId}, ${userId})
      `;

      for (const line of processedLines) {
        await fastify.sql`
          INSERT INTO sales_order_lines (id, sales_order_id, line_number, description, quantity, delivered_quantity, unit_price_satang, amount_satang, account_id)
          VALUES (${line.id}, ${soId}, ${line.lineNumber}, ${line.description}, ${line.quantity}, 0,
                  ${line.unitPriceSatang}::bigint, ${line.amountSatang}::bigint, ${line.accountId})
        `;
      }

      request.log.info({ soId, documentNumber, customerId, tenantId }, 'Sales order created');

      return reply.status(201).send({
        id: soId,
        documentNumber,
        customerId,
        customerName,
        status: 'draft',
        orderDate,
        expectedDeliveryDate: expectedDeliveryDate ?? null,
        totalSatang: totalSatang.toString(),
        quotationId: quotationId ?? null,
        notes: notes ?? null,
        lines: processedLines,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/sales-orders — list
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: SoListQuery }>(
    `${API_V1_PREFIX}/sales-orders`,
    {
      schema: {
        description: 'List sales orders with pagination and filtering',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        querystring: listQuerySchema,
        response: {
          200: {
            type: 'object',
            properties: {
              items: { type: 'array', items: soResponseSchema },
              total: { type: 'integer' },
              limit: { type: 'integer' },
              offset: { type: 'integer' },
              hasMore: { type: 'boolean' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(AR_SO_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const limit = request.query.limit ?? 20;
      const offset = request.query.offset ?? 0;
      const { status, customerId } = request.query;

      let countRows: CountRow[];
      let rows: SoRow[];

      if (status !== undefined && customerId !== undefined) {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM sales_orders WHERE tenant_id = ${tenantId} AND status = ${status} AND customer_id = ${customerId}`;
        rows = await fastify.sql<SoRow[]>`SELECT * FROM sales_orders WHERE tenant_id = ${tenantId} AND status = ${status} AND customer_id = ${customerId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      } else if (status !== undefined) {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM sales_orders WHERE tenant_id = ${tenantId} AND status = ${status}`;
        rows = await fastify.sql<SoRow[]>`SELECT * FROM sales_orders WHERE tenant_id = ${tenantId} AND status = ${status} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      } else if (customerId !== undefined) {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM sales_orders WHERE tenant_id = ${tenantId} AND customer_id = ${customerId}`;
        rows = await fastify.sql<SoRow[]>`SELECT * FROM sales_orders WHERE tenant_id = ${tenantId} AND customer_id = ${customerId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      } else {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM sales_orders WHERE tenant_id = ${tenantId}`;
        rows = await fastify.sql<SoRow[]>`SELECT * FROM sales_orders WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      }

      const total = parseInt(countRows[0]?.count ?? '0', 10);
      const items = rows.map((r) => ({
        id: r.id,
        documentNumber: r.document_number,
        customerId: r.customer_id,
        customerName: r.customer_name,
        status: r.status,
        orderDate: r.order_date,
        expectedDeliveryDate: r.expected_delivery_date,
        totalSatang: r.total_satang.toString(),
        quotationId: r.quotation_id,
        notes: r.notes,
        lines: [],
        createdAt: toISO(r.created_at),
        updatedAt: toISO(r.updated_at),
      }));

      return reply.status(200).send({ items, total, limit, offset, hasMore: offset + limit < total });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/sales-orders/:id — detail
  // -------------------------------------------------------------------------
  fastify.get<{ Params: IdParams }>(
    `${API_V1_PREFIX}/sales-orders/:id`,
    {
      schema: {
        description: 'Get sales order details',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: { 200: { ...soResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AR_SO_READ)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const rows = await fastify.sql<[SoRow?]>`
        SELECT * FROM sales_orders WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      const so = rows[0];
      if (!so) throw new NotFoundError({ detail: `Sales order ${id} not found.` });

      const lines = await fastify.sql<SoLineRow[]>`
        SELECT * FROM sales_order_lines WHERE sales_order_id = ${id} ORDER BY line_number
      `;

      return reply.status(200).send({
        id: so.id,
        documentNumber: so.document_number,
        customerId: so.customer_id,
        customerName: so.customer_name,
        status: so.status,
        orderDate: so.order_date,
        expectedDeliveryDate: so.expected_delivery_date,
        totalSatang: so.total_satang.toString(),
        quotationId: so.quotation_id,
        notes: so.notes,
        lines: lines.map((l) => ({
          id: l.id,
          lineNumber: l.line_number,
          description: l.description,
          quantity: l.quantity,
          deliveredQuantity: l.delivered_quantity,
          unitPriceSatang: l.unit_price_satang.toString(),
          amountSatang: l.amount_satang.toString(),
          accountId: l.account_id,
        })),
        createdAt: toISO(so.created_at),
        updatedAt: toISO(so.updated_at),
      });
    },
  );

  // -------------------------------------------------------------------------
  // PUT /api/v1/sales-orders/:id — update draft
  // -------------------------------------------------------------------------
  fastify.put<{ Params: IdParams; Body: UpdateSoBody }>(
    `${API_V1_PREFIX}/sales-orders/:id`,
    {
      schema: {
        description: 'Update a draft sales order',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        body: updateSoBodySchema,
        response: { 200: { ...soResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AR_SO_UPDATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { customerName, orderDate, expectedDeliveryDate, notes, lines } = request.body;
      const { tenantId } = request.user;

      const existing = await fastify.sql<[SoRow?]>`
        SELECT * FROM sales_orders WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!existing[0]) throw new NotFoundError({ detail: `Sales order ${id} not found.` });
      if (existing[0].status !== 'draft') {
        throw new ValidationError({ detail: `Only draft sales orders can be updated. Current status: "${existing[0].status}".` });
      }

      let totalSatang = existing[0].total_satang;

      if (lines !== undefined) {
        let newTotal = 0n;
        const processedLines = lines.map((line, index) => {
          const qty = BigInt(Math.round(line.quantity * 10000));
          const price = BigInt(line.unitPriceSatang);
          const amount = qty * price / 10000n;
          newTotal += amount;
          return { id: crypto.randomUUID(), lineNumber: index + 1, ...line, amountSatang: amount.toString() };
        });
        totalSatang = newTotal;

        await fastify.sql`DELETE FROM sales_order_lines WHERE sales_order_id = ${id}`;
        for (const line of processedLines) {
          await fastify.sql`
            INSERT INTO sales_order_lines (id, sales_order_id, line_number, description, quantity, delivered_quantity, unit_price_satang, amount_satang, account_id)
            VALUES (${line.id}, ${id}, ${line.lineNumber}, ${line.description}, ${line.quantity}, 0,
                    ${line.unitPriceSatang}::bigint, ${line.amountSatang}::bigint, ${line.accountId ?? null})
          `;
        }
      }

      const updated = await fastify.sql<[SoRow?]>`
        UPDATE sales_orders
        SET customer_name = COALESCE(${customerName ?? null}, customer_name),
            order_date = COALESCE(${orderDate ?? null}, order_date),
            expected_delivery_date = COALESCE(${expectedDeliveryDate ?? null}, expected_delivery_date),
            notes = COALESCE(${notes ?? null}, notes),
            total_satang = ${totalSatang.toString()}::bigint,
            updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `;

      const so = updated[0]!;
      return reply.status(200).send({
        id: so.id,
        documentNumber: so.document_number,
        customerId: so.customer_id,
        customerName: so.customer_name,
        status: so.status,
        orderDate: so.order_date,
        expectedDeliveryDate: so.expected_delivery_date,
        totalSatang: so.total_satang.toString(),
        quotationId: so.quotation_id,
        notes: so.notes,
        lines: [],
        createdAt: toISO(so.created_at),
        updatedAt: toISO(so.updated_at),
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/sales-orders/:id/confirm — confirm
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/sales-orders/:id/confirm`,
    {
      schema: {
        description: 'Confirm a draft sales order',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: { 200: { ...soResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AR_SO_CONFIRM)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const rows = await fastify.sql<[SoRow?]>`
        UPDATE sales_orders
        SET status = 'confirmed', confirmed_at = NOW(), updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'draft'
        RETURNING *
      `;
      const so = rows[0];
      if (!so) {
        const existing = await fastify.sql<[{ id: string; status: string }?]>`
          SELECT id, status FROM sales_orders WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
        `;
        if (!existing[0]) throw new NotFoundError({ detail: `Sales order ${id} not found.` });
        throw new ConflictError({ detail: `Sales order ${id} cannot be confirmed — current status is "${existing[0].status}".` });
      }

      request.log.info({ soId: id, tenantId }, 'Sales order confirmed');
      return reply.status(200).send({
        id: so.id, documentNumber: so.document_number, customerId: so.customer_id,
        customerName: so.customer_name, status: so.status, orderDate: so.order_date,
        expectedDeliveryDate: so.expected_delivery_date, totalSatang: so.total_satang.toString(),
        quotationId: so.quotation_id, notes: so.notes, lines: [],
        createdAt: toISO(so.created_at), updatedAt: toISO(so.updated_at),
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/sales-orders/:id/cancel — cancel
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/sales-orders/:id/cancel`,
    {
      schema: {
        description: 'Cancel a sales order',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: { 200: { ...soResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AR_SO_CONFIRM)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const rows = await fastify.sql<[SoRow?]>`
        UPDATE sales_orders
        SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status IN ('draft', 'confirmed')
        RETURNING *
      `;
      const so = rows[0];
      if (!so) {
        const existing = await fastify.sql<[{ id: string; status: string }?]>`
          SELECT id, status FROM sales_orders WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
        `;
        if (!existing[0]) throw new NotFoundError({ detail: `Sales order ${id} not found.` });
        throw new ConflictError({ detail: `Sales order ${id} cannot be cancelled — current status is "${existing[0].status}".` });
      }

      request.log.info({ soId: id, tenantId }, 'Sales order cancelled');
      return reply.status(200).send({
        id: so.id, documentNumber: so.document_number, customerId: so.customer_id,
        customerName: so.customer_name, status: so.status, orderDate: so.order_date,
        expectedDeliveryDate: so.expected_delivery_date, totalSatang: so.total_satang.toString(),
        quotationId: so.quotation_id, notes: so.notes, lines: [],
        createdAt: toISO(so.created_at), updatedAt: toISO(so.updated_at),
      });
    },
  );
}
