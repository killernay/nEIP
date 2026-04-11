/**
 * Purchase Order routes (ใบสั่งซื้อ / PO):
 *   POST /api/v1/purchase-orders                      — create
 *   GET  /api/v1/purchase-orders                      — list
 *   GET  /api/v1/purchase-orders/:id                  — detail
 *   PUT  /api/v1/purchase-orders/:id                  — update draft
 *   POST /api/v1/purchase-orders/:id/send             — draft → sent
 *   POST /api/v1/purchase-orders/:id/receive          — record received goods (can partial)
 *   POST /api/v1/purchase-orders/:id/convert-to-bill  — create bill from PO
 *   POST /api/v1/purchase-orders/:id/cancel           — cancel
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, ConflictError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import {
  AP_PO_CREATE,
  AP_PO_READ,
  AP_PO_UPDATE,
  AP_PO_SEND,
  AP_PO_RECEIVE,
  AP_PO_CONVERT,
} from '../../lib/permissions.js';
import { nextDocNumber } from '@neip/core';

// ---------------------------------------------------------------------------
// JSON Schemas
// ---------------------------------------------------------------------------

const poLineSchema = {
  type: 'object',
  required: ['description', 'quantity', 'unitPriceSatang'],
  additionalProperties: false,
  properties: {
    description: { type: 'string', minLength: 1, maxLength: 500 },
    quantity: { type: 'number', minimum: 0.01 },
    unitPriceSatang: { type: 'string', description: 'Unit price in satang' },
    accountId: { type: 'string' },
    productId: { type: 'string', nullable: true },
    warehouseId: { type: 'string', nullable: true },
  },
} as const;

const receiveLineSchema = {
  type: 'object',
  required: ['lineId', 'quantityReceived'],
  additionalProperties: false,
  properties: {
    lineId: { type: 'string' },
    quantityReceived: { type: 'number', minimum: 0.01 },
    productId: { type: 'string', nullable: true },
    warehouseId: { type: 'string', nullable: true },
  },
} as const;

const createPoBodySchema = {
  type: 'object',
  required: ['vendorId', 'orderDate', 'lines'],
  additionalProperties: false,
  properties: {
    vendorId: { type: 'string' },
    orderDate: { type: 'string', format: 'date' },
    expectedDate: { type: 'string', format: 'date' },
    notes: { type: 'string', maxLength: 2000 },
    lines: { type: 'array', minItems: 1, items: poLineSchema },
  },
} as const;

const updatePoBodySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    orderDate: { type: 'string', format: 'date' },
    expectedDate: { type: 'string', format: 'date' },
    notes: { type: 'string', maxLength: 2000 },
    lines: { type: 'array', minItems: 1, items: poLineSchema },
  },
} as const;

const receiveBodySchema = {
  type: 'object',
  required: ['lines'],
  additionalProperties: false,
  properties: {
    lines: { type: 'array', minItems: 1, items: receiveLineSchema },
  },
} as const;

const poLineResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    lineNumber: { type: 'integer' },
    description: { type: 'string' },
    quantity: { type: 'number' },
    receivedQuantity: { type: 'number' },
    unitPriceSatang: { type: 'string' },
    amountSatang: { type: 'string' },
    accountId: { type: 'string', nullable: true },
  },
} as const;

const poResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    documentNumber: { type: 'string' },
    vendorId: { type: 'string' },
    status: { type: 'string', enum: ['draft', 'sent', 'partial_received', 'received', 'cancelled', 'converted'] },
    orderDate: { type: 'string', format: 'date' },
    expectedDate: { type: 'string', nullable: true },
    totalSatang: { type: 'string' },
    notes: { type: 'string', nullable: true },
    convertedBillId: { type: 'string', nullable: true },
    lines: { type: 'array', items: poLineResponseSchema },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

const listQuerySchema = {
  type: 'object',
  properties: {
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    offset: { type: 'integer', minimum: 0, default: 0 },
    status: { type: 'string', enum: ['draft', 'sent', 'partial_received', 'received', 'cancelled', 'converted'] },
    vendorId: { type: 'string' },
  },
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreatePoBody {
  vendorId: string;
  orderDate: string;
  expectedDate?: string;
  notes?: string;
  lines: Array<{
    description: string;
    quantity: number;
    unitPriceSatang: string;
    accountId?: string;
    productId?: string;
    warehouseId?: string;
  }>;
}

interface UpdatePoBody {
  orderDate?: string;
  expectedDate?: string;
  notes?: string;
  lines?: Array<{
    description: string;
    quantity: number;
    unitPriceSatang: string;
    accountId?: string;
  }>;
}

interface ReceiveBody {
  lines: Array<{
    lineId: string;
    quantityReceived: number;
    productId?: string;
    warehouseId?: string;
  }>;
}

interface PoListQuery {
  limit?: number;
  offset?: number;
  status?: string;
  vendorId?: string;
}

interface IdParams {
  id: string;
}

interface PoRow {
  id: string;
  document_number: string;
  vendor_id: string;
  status: string;
  order_date: string;
  expected_date: string | null;
  total_satang: bigint;
  notes: string | null;
  tenant_id: string;
  created_by: string;
  converted_bill_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface PoLineRow {
  id: string;
  purchase_order_id: string;
  line_number: number;
  description: string;
  quantity: number;
  received_quantity: number;
  unit_price_satang: bigint;
  amount_satang: bigint;
  product_id: string | null;
  warehouse_id: string | null;
  account_id: string | null;
}

interface CountRow {
  count: string;
}

function mapPo(r: PoRow, lines: PoLineRow[] = []) {
  return {
    id: r.id,
    documentNumber: r.document_number,
    vendorId: r.vendor_id,
    status: r.status,
    orderDate: r.order_date,
    expectedDate: r.expected_date,
    totalSatang: r.total_satang.toString(),
    notes: r.notes,
    convertedBillId: r.converted_bill_id,
    lines: lines.map((l) => ({
      id: l.id,
      lineNumber: l.line_number,
      description: l.description,
      quantity: l.quantity,
      receivedQuantity: l.received_quantity,
      unitPriceSatang: l.unit_price_satang.toString(),
      amountSatang: l.amount_satang.toString(),
      accountId: l.account_id,
    })),
    createdAt: toISO(r.created_at),
    updatedAt: toISO(r.updated_at),
  };
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export async function purchaseOrderRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  // -------------------------------------------------------------------------
  // POST /api/v1/purchase-orders — create
  // -------------------------------------------------------------------------
  fastify.post<{ Body: CreatePoBody }>(
    `${API_V1_PREFIX}/purchase-orders`,
    {
      schema: {
        description: 'Create a purchase order (ใบสั่งซื้อ)',
        tags: ['ap'],
        security: [{ bearerAuth: [] }],
        body: createPoBodySchema,
        response: { 201: { description: 'Purchase order created', ...poResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AP_PO_CREATE)],
    },
    async (request, reply) => {
      const { vendorId, orderDate, expectedDate, notes, lines } = request.body;
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
          productId: line.productId ?? null,
          warehouseId: line.warehouseId ?? null,
        };
      });

      const poId = crypto.randomUUID();
      const documentNumber = await nextDocNumber(fastify.sql, tenantId, 'purchase_order', new Date().getFullYear());

      await fastify.sql`
        INSERT INTO purchase_orders (id, document_number, vendor_id, status, order_date, expected_date, total_satang, notes, tenant_id, created_by)
        VALUES (${poId}, ${documentNumber}, ${vendorId}, 'draft', ${orderDate},
                ${expectedDate ?? null}, ${totalSatang.toString()}::bigint, ${notes ?? null}, ${tenantId}, ${userId})
      `;

      for (const line of processedLines) {
        await fastify.sql`
          INSERT INTO purchase_order_lines (id, purchase_order_id, line_number, description, quantity, received_quantity, unit_price_satang, amount_satang, account_id, product_id, warehouse_id)
          VALUES (${line.id}, ${poId}, ${line.lineNumber}, ${line.description}, ${line.quantity}, 0,
                  ${line.unitPriceSatang}::bigint, ${line.amountSatang}::bigint, ${line.accountId}, ${line.productId}, ${line.warehouseId})
        `;
      }

      request.log.info({ poId, documentNumber, vendorId, tenantId }, 'Purchase order created');

      return reply.status(201).send({
        id: poId, documentNumber, vendorId, status: 'draft', orderDate,
        expectedDate: expectedDate ?? null, totalSatang: totalSatang.toString(),
        notes: notes ?? null, convertedBillId: null,
        lines: processedLines.map((l) => ({
          id: l.id, lineNumber: l.lineNumber, description: l.description,
          quantity: l.quantity, receivedQuantity: 0, unitPriceSatang: l.unitPriceSatang,
          amountSatang: l.amountSatang, accountId: l.accountId,
        })),
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/purchase-orders — list
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: PoListQuery }>(
    `${API_V1_PREFIX}/purchase-orders`,
    {
      schema: {
        description: 'List purchase orders',
        tags: ['ap'],
        security: [{ bearerAuth: [] }],
        querystring: listQuerySchema,
        response: {
          200: {
            type: 'object',
            properties: {
              items: { type: 'array', items: poResponseSchema },
              total: { type: 'integer' },
              limit: { type: 'integer' },
              offset: { type: 'integer' },
              hasMore: { type: 'boolean' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(AP_PO_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const limit = request.query.limit ?? 20;
      const offset = request.query.offset ?? 0;
      const { status, vendorId } = request.query;

      let countRows: CountRow[];
      let rows: PoRow[];

      if (status !== undefined && vendorId !== undefined) {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM purchase_orders WHERE tenant_id = ${tenantId} AND status = ${status} AND vendor_id = ${vendorId}`;
        rows = await fastify.sql<PoRow[]>`SELECT * FROM purchase_orders WHERE tenant_id = ${tenantId} AND status = ${status} AND vendor_id = ${vendorId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      } else if (status !== undefined) {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM purchase_orders WHERE tenant_id = ${tenantId} AND status = ${status}`;
        rows = await fastify.sql<PoRow[]>`SELECT * FROM purchase_orders WHERE tenant_id = ${tenantId} AND status = ${status} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      } else if (vendorId !== undefined) {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM purchase_orders WHERE tenant_id = ${tenantId} AND vendor_id = ${vendorId}`;
        rows = await fastify.sql<PoRow[]>`SELECT * FROM purchase_orders WHERE tenant_id = ${tenantId} AND vendor_id = ${vendorId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      } else {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM purchase_orders WHERE tenant_id = ${tenantId}`;
        rows = await fastify.sql<PoRow[]>`SELECT * FROM purchase_orders WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      }

      const total = parseInt(countRows[0]?.count ?? '0', 10);
      return reply.status(200).send({ items: rows.map((r) => mapPo(r)), total, limit, offset, hasMore: offset + limit < total });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/purchase-orders/:id — detail
  // -------------------------------------------------------------------------
  fastify.get<{ Params: IdParams }>(
    `${API_V1_PREFIX}/purchase-orders/:id`,
    {
      schema: {
        description: 'Get purchase order details',
        tags: ['ap'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: { 200: { ...poResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AP_PO_READ)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const rows = await fastify.sql<[PoRow?]>`
        SELECT * FROM purchase_orders WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      const po = rows[0];
      if (!po) throw new NotFoundError({ detail: `Purchase order ${id} not found.` });

      const lines = await fastify.sql<PoLineRow[]>`
        SELECT * FROM purchase_order_lines WHERE purchase_order_id = ${id} ORDER BY line_number
      `;

      return reply.status(200).send(mapPo(po, lines));
    },
  );

  // -------------------------------------------------------------------------
  // PUT /api/v1/purchase-orders/:id — update draft
  // -------------------------------------------------------------------------
  fastify.put<{ Params: IdParams; Body: UpdatePoBody }>(
    `${API_V1_PREFIX}/purchase-orders/:id`,
    {
      schema: {
        description: 'Update a draft purchase order',
        tags: ['ap'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        body: updatePoBodySchema,
        response: { 200: { ...poResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AP_PO_UPDATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { orderDate, expectedDate, notes, lines } = request.body;
      const { tenantId } = request.user;

      const existing = await fastify.sql<[PoRow?]>`
        SELECT * FROM purchase_orders WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!existing[0]) throw new NotFoundError({ detail: `Purchase order ${id} not found.` });
      if (existing[0].status !== 'draft') {
        throw new ValidationError({ detail: `Only draft purchase orders can be updated. Current: "${existing[0].status}".` });
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

        await fastify.sql`DELETE FROM purchase_order_lines WHERE purchase_order_id = ${id}`;
        for (const line of processedLines) {
          await fastify.sql`
            INSERT INTO purchase_order_lines (id, purchase_order_id, line_number, description, quantity, received_quantity, unit_price_satang, amount_satang, account_id, product_id, warehouse_id)
            VALUES (${line.id}, ${id}, ${line.lineNumber}, ${line.description}, ${line.quantity}, 0,
                    ${line.unitPriceSatang}::bigint, ${line.amountSatang}::bigint, ${line.accountId ?? null},
                    ${(line as { productId?: string }).productId ?? null}, ${(line as { warehouseId?: string }).warehouseId ?? null})
          `;
        }
      }

      const updated = await fastify.sql<[PoRow?]>`
        UPDATE purchase_orders
        SET order_date = COALESCE(${orderDate ?? null}, order_date),
            expected_date = COALESCE(${expectedDate ?? null}, expected_date),
            notes = COALESCE(${notes ?? null}, notes),
            total_satang = ${totalSatang.toString()}::bigint,
            updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `;

      return reply.status(200).send(mapPo(updated[0]!));
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/purchase-orders/:id/send — draft → sent
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/purchase-orders/:id/send`,
    {
      schema: {
        description: 'Send a purchase order to vendor',
        tags: ['ap'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: { 200: { ...poResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AP_PO_SEND)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const rows = await fastify.sql<[PoRow?]>`
        UPDATE purchase_orders
        SET status = 'sent', sent_at = NOW(), updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'draft'
        RETURNING *
      `;
      const po = rows[0];
      if (!po) {
        const existing = await fastify.sql<[{ id: string; status: string }?]>`
          SELECT id, status FROM purchase_orders WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
        `;
        if (!existing[0]) throw new NotFoundError({ detail: `Purchase order ${id} not found.` });
        throw new ConflictError({ detail: `Purchase order ${id} cannot be sent — current status is "${existing[0].status}".` });
      }

      request.log.info({ poId: id, tenantId }, 'Purchase order sent');
      return reply.status(200).send(mapPo(po));
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/purchase-orders/:id/receive — record received goods
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams; Body: ReceiveBody }>(
    `${API_V1_PREFIX}/purchase-orders/:id/receive`,
    {
      schema: {
        description: 'Record received goods for a purchase order (can be partial)',
        tags: ['ap'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        body: receiveBodySchema,
        response: { 200: { ...poResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AP_PO_RECEIVE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { lines } = request.body;
      const { tenantId } = request.user;

      const poRows = await fastify.sql<[PoRow?]>`
        SELECT * FROM purchase_orders WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      const po = poRows[0];
      if (!po) throw new NotFoundError({ detail: `Purchase order ${id} not found.` });
      if (!['sent', 'partial_received'].includes(po.status)) {
        throw new ConflictError({ detail: `Purchase order must be in sent or partial_received status to receive goods. Current: "${po.status}".` });
      }

      // Update received quantities for specified lines and create stock movements
      for (const receive of lines) {
        await fastify.sql`
          UPDATE purchase_order_lines
          SET received_quantity = received_quantity + ${receive.quantityReceived}
          WHERE id = ${receive.lineId} AND purchase_order_id = ${id}
        `;

        // Get product/warehouse from line or override from receive body
        const productId = receive.productId ?? null;
        const warehouseId = receive.warehouseId ?? null;

        if (!productId || !warehouseId) {
          // Try to get from the PO line itself
          const lineRows = await fastify.sql<[{ product_id: string | null; warehouse_id: string | null }?]>`
            SELECT product_id, warehouse_id FROM purchase_order_lines WHERE id = ${receive.lineId} LIMIT 1
          `;
          const lineProductId = lineRows[0]?.product_id ?? null;
          const lineWarehouseId = lineRows[0]?.warehouse_id ?? null;

          if (lineProductId && lineWarehouseId) {
            const qty = Math.round(receive.quantityReceived);
            await fastify.sql`
              INSERT INTO stock_levels (product_id, warehouse_id, quantity_on_hand, quantity_reserved, quantity_available)
              VALUES (${lineProductId}, ${lineWarehouseId}, ${qty}, 0, ${qty})
              ON CONFLICT (product_id, warehouse_id)
              DO UPDATE SET
                quantity_on_hand = stock_levels.quantity_on_hand + ${qty},
                quantity_available = stock_levels.quantity_available + ${qty}
            `;
            const balanceRows = await fastify.sql<[{ quantity_on_hand: number }]>`
              SELECT quantity_on_hand FROM stock_levels WHERE product_id = ${lineProductId} AND warehouse_id = ${lineWarehouseId}
            `;
            const balanceAfter = balanceRows[0]?.quantity_on_hand ?? 0;
            await fastify.sql`
              INSERT INTO stock_movements (id, product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, balance_after, tenant_id, created_by)
              VALUES (${crypto.randomUUID()}, ${lineProductId}, ${lineWarehouseId}, 'receive', ${qty}, 'purchase_order', ${id}, ${balanceAfter}, ${tenantId}, ${request.user.sub})
            `;
          }
        } else {
          const qty = Math.round(receive.quantityReceived);
          await fastify.sql`
            INSERT INTO stock_levels (product_id, warehouse_id, quantity_on_hand, quantity_reserved, quantity_available)
            VALUES (${productId}, ${warehouseId}, ${qty}, 0, ${qty})
            ON CONFLICT (product_id, warehouse_id)
            DO UPDATE SET
              quantity_on_hand = stock_levels.quantity_on_hand + ${qty},
              quantity_available = stock_levels.quantity_available + ${qty}
          `;
          const balanceRows = await fastify.sql<[{ quantity_on_hand: number }]>`
            SELECT quantity_on_hand FROM stock_levels WHERE product_id = ${productId} AND warehouse_id = ${warehouseId}
          `;
          const balanceAfter = balanceRows[0]?.quantity_on_hand ?? 0;
          await fastify.sql`
            INSERT INTO stock_movements (id, product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, balance_after, tenant_id, created_by)
            VALUES (${crypto.randomUUID()}, ${productId}, ${warehouseId}, 'receive', ${qty}, 'purchase_order', ${id}, ${balanceAfter}, ${tenantId}, ${request.user.sub})
          `;
        }
      }

      // Recalculate PO status
      const poLines = await fastify.sql<PoLineRow[]>`
        SELECT quantity, received_quantity FROM purchase_order_lines WHERE purchase_order_id = ${id}
      `;

      const totalQty = poLines.reduce((sum, l) => sum + l.quantity, 0);
      const receivedQty = poLines.reduce((sum, l) => sum + l.received_quantity, 0);

      let newStatus: string;
      if (receivedQty >= totalQty) {
        newStatus = 'received';
      } else if (receivedQty > 0) {
        newStatus = 'partial_received';
      } else {
        newStatus = 'sent';
      }

      const updated = await fastify.sql<[PoRow?]>`
        UPDATE purchase_orders SET status = ${newStatus}, updated_at = NOW()
        WHERE id = ${id} RETURNING *
      `;

      const allLines = await fastify.sql<PoLineRow[]>`
        SELECT * FROM purchase_order_lines WHERE purchase_order_id = ${id} ORDER BY line_number
      `;

      request.log.info({ poId: id, newStatus, tenantId }, 'Purchase order goods received');
      return reply.status(200).send(mapPo(updated[0]!, allLines));
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/purchase-orders/:id/convert-to-bill — create bill from PO
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/purchase-orders/:id/convert-to-bill`,
    {
      schema: {
        description: 'Convert purchase order to a bill (creates AP bill from PO)',
        tags: ['ap'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: {
          201: {
            description: 'Bill created from PO',
            type: 'object',
            properties: {
              billId: { type: 'string' },
              billDocumentNumber: { type: 'string' },
              purchaseOrder: poResponseSchema,
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(AP_PO_CONVERT)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId, sub: userId } = request.user;

      const poRows = await fastify.sql<[PoRow?]>`
        SELECT * FROM purchase_orders WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      const po = poRows[0];
      if (!po) throw new NotFoundError({ detail: `Purchase order ${id} not found.` });
      if (po.converted_bill_id) {
        throw new ConflictError({ detail: `Purchase order ${id} has already been converted to bill ${po.converted_bill_id}.` });
      }
      if (!['sent', 'partial_received', 'received'].includes(po.status)) {
        throw new ConflictError({ detail: `Purchase order must be sent or received to convert to bill. Current: "${po.status}".` });
      }

      const poLines = await fastify.sql<PoLineRow[]>`
        SELECT * FROM purchase_order_lines WHERE purchase_order_id = ${id} ORDER BY line_number
      `;

      // Resolve a fallback account for bill lines where account_id is not set on the PO line.
      // We look up the first expense-type account for the tenant as a sensible default.
      const defaultAccountRows = await fastify.sql<[{ id: string }?]>`
        SELECT id FROM chart_of_accounts
        WHERE tenant_id = ${tenantId} AND account_type = 'expense' AND is_active = true
        ORDER BY code LIMIT 1
      `;
      const defaultAccountId = defaultAccountRows[0]?.id ?? null;

      // Create the bill
      const billId = crypto.randomUUID();
      const billDocumentNumber = await nextDocNumber(fastify.sql, tenantId, 'bill', new Date().getFullYear());
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      await fastify.sql`
        INSERT INTO bills (id, document_number, vendor_id, total_satang, paid_satang, due_date, notes, status, tenant_id, created_by)
        VALUES (${billId}, ${billDocumentNumber}, ${po.vendor_id}, ${po.total_satang.toString()}::bigint,
                0, ${dueDate}, ${`Converted from PO ${po.document_number}`}, 'draft', ${tenantId}, ${userId})
      `;

      for (let i = 0; i < poLines.length; i++) {
        const line = poLines[i]!;
        // Use the line's account_id when present, fall back to the default expense account.
        const lineAccountId = line.account_id ?? defaultAccountId;
        if (!lineAccountId) {
          throw new ValidationError({
            detail: 'Cannot convert PO to bill: no account_id on PO line and no expense account found in chart of accounts.',
          });
        }
        await fastify.sql`
          INSERT INTO bill_line_items (id, bill_id, line_number, description, amount_satang, account_id)
          VALUES (${crypto.randomUUID()}, ${billId}, ${i + 1}, ${line.description},
                  ${line.amount_satang.toString()}::bigint, ${lineAccountId})
        `;
      }

      // Link PO to the created bill and update status to converted
      const updatedPo = await fastify.sql<[PoRow?]>`
        UPDATE purchase_orders SET converted_bill_id = ${billId}, status = 'converted', updated_at = NOW()
        WHERE id = ${id} RETURNING *
      `;

      request.log.info({ poId: id, billId, billDocumentNumber, tenantId }, 'Purchase order converted to bill');

      return reply.status(201).send({
        billId,
        billDocumentNumber,
        purchaseOrder: mapPo(updatedPo[0]!, poLines),
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/purchase-orders/:id/cancel — cancel
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/purchase-orders/:id/cancel`,
    {
      schema: {
        description: 'Cancel a purchase order',
        tags: ['ap'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: { 200: { ...poResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AP_PO_SEND)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const rows = await fastify.sql<[PoRow?]>`
        UPDATE purchase_orders
        SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status IN ('draft', 'sent')
        RETURNING *
      `;
      const po = rows[0];
      if (!po) {
        const existing = await fastify.sql<[{ id: string; status: string }?]>`
          SELECT id, status FROM purchase_orders WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
        `;
        if (!existing[0]) throw new NotFoundError({ detail: `Purchase order ${id} not found.` });
        throw new ConflictError({ detail: `Purchase order ${id} cannot be cancelled — current status is "${existing[0].status}".` });
      }

      request.log.info({ poId: id, tenantId }, 'Purchase order cancelled');
      return reply.status(200).send(mapPo(po));
    },
  );
}
