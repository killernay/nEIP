/**
 * Delivery Note routes (ใบส่งของ / DO):
 *   POST /api/v1/delivery-notes              — create from sales order
 *   GET  /api/v1/delivery-notes              — list
 *   GET  /api/v1/delivery-notes/:id          — detail
 *   POST /api/v1/delivery-notes/:id/deliver             — mark as delivered (updates SO line delivered_quantity)
 *   POST /api/v1/delivery-notes/:id/convert-to-invoice  — create invoice from delivered DO
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ConflictError, ValidationError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import {
  AR_DO_CREATE,
  AR_DO_READ,
  AR_DO_DELIVER,
  AR_INVOICE_CREATE,
} from '../../lib/permissions.js';
import { nextDocNumber } from '@neip/core';

// ---------------------------------------------------------------------------
// JSON Schemas
// ---------------------------------------------------------------------------

const doLineSchema = {
  type: 'object',
  required: ['salesOrderLineId', 'description', 'quantityDelivered'],
  additionalProperties: false,
  properties: {
    salesOrderLineId: { type: 'string' },
    description: { type: 'string', minLength: 1, maxLength: 500 },
    quantityDelivered: { type: 'number', minimum: 0.01 },
    productId: { type: 'string', nullable: true },
    warehouseId: { type: 'string', nullable: true },
  },
} as const;

const createDoBodySchema = {
  type: 'object',
  required: ['salesOrderId', 'customerId', 'customerName', 'deliveryDate', 'lines'],
  additionalProperties: false,
  properties: {
    salesOrderId: { type: 'string' },
    customerId: { type: 'string' },
    customerName: { type: 'string', minLength: 1, maxLength: 255 },
    deliveryDate: { type: 'string', format: 'date' },
    notes: { type: 'string', maxLength: 2000 },
    lines: { type: 'array', minItems: 1, items: doLineSchema },
  },
} as const;

const doResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    documentNumber: { type: 'string' },
    salesOrderId: { type: 'string' },
    customerId: { type: 'string' },
    customerName: { type: 'string' },
    status: { type: 'string', enum: ['draft', 'delivered', 'cancelled'] },
    deliveryDate: { type: 'string', format: 'date' },
    notes: { type: 'string', nullable: true },
    lines: { type: 'array', items: { type: 'object' } },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

const listQuerySchema = {
  type: 'object',
  properties: {
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    offset: { type: 'integer', minimum: 0, default: 0 },
    status: { type: 'string', enum: ['draft', 'delivered', 'cancelled'] },
    salesOrderId: { type: 'string' },
  },
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateDoBody {
  salesOrderId: string;
  customerId: string;
  customerName: string;
  deliveryDate: string;
  notes?: string;
  lines: Array<{
    salesOrderLineId: string;
    description: string;
    quantityDelivered: number;
    productId?: string;
    warehouseId?: string;
  }>;
}

interface DoListQuery {
  limit?: number;
  offset?: number;
  status?: string;
  salesOrderId?: string;
}

interface IdParams {
  id: string;
}

interface DoRow {
  id: string;
  document_number: string;
  sales_order_id: string;
  customer_id: string;
  customer_name: string;
  status: string;
  delivery_date: string;
  notes: string | null;
  tenant_id: string;
  created_by: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface DoLineRow {
  id: string;
  delivery_note_id: string;
  sales_order_line_id: string;
  description: string;
  quantity_delivered: number;
  product_id: string | null;
  warehouse_id: string | null;
}

interface SoRow {
  id: string;
  status: string;
  customer_id: string;
  customer_name: string;
}

interface SoLineRow {
  id: string;
  quantity: number;
  delivered_quantity: number;
}

interface CountRow {
  count: string;
}

// Document numbering now uses DocumentNumberingService via nextDocNumber()

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export async function deliveryNoteRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  // -------------------------------------------------------------------------
  // POST /api/v1/delivery-notes — create
  // -------------------------------------------------------------------------
  fastify.post<{ Body: CreateDoBody }>(
    `${API_V1_PREFIX}/delivery-notes`,
    {
      schema: {
        description: 'Create a delivery note from a sales order (ใบส่งของ)',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        body: createDoBodySchema,
        response: { 201: { description: 'Delivery note created', ...doResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AR_DO_CREATE)],
    },
    async (request, reply) => {
      const { salesOrderId, customerId, customerName, deliveryDate, notes, lines } = request.body;
      const { tenantId, sub: userId } = request.user;

      // Validate sales order exists and is in confirmable state
      const soRows = await fastify.sql<[SoRow?]>`
        SELECT id, status, customer_id, customer_name FROM sales_orders
        WHERE id = ${salesOrderId} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!soRows[0]) throw new NotFoundError({ detail: `Sales order ${salesOrderId} not found.` });
      if (!['confirmed', 'partial_delivered'].includes(soRows[0].status)) {
        throw new ConflictError({ detail: `Sales order must be in confirmed or partial_delivered status to create a delivery note. Current: "${soRows[0].status}".` });
      }

      const doId = crypto.randomUUID();
      const fiscalYear = new Date().getFullYear();
      const documentNumber = await nextDocNumber(fastify.sql, tenantId, 'delivery_note', fiscalYear);

      await fastify.sql`
        INSERT INTO delivery_notes (id, document_number, sales_order_id, customer_id, customer_name, status, delivery_date, notes, tenant_id, created_by)
        VALUES (${doId}, ${documentNumber}, ${salesOrderId}, ${customerId}, ${customerName},
                'draft', ${deliveryDate}, ${notes ?? null}, ${tenantId}, ${userId})
      `;

      for (const line of lines) {
        await fastify.sql`
          INSERT INTO delivery_note_lines (id, delivery_note_id, sales_order_line_id, description, quantity_delivered, product_id, warehouse_id)
          VALUES (${crypto.randomUUID()}, ${doId}, ${line.salesOrderLineId}, ${line.description}, ${line.quantityDelivered}, ${line.productId ?? null}, ${line.warehouseId ?? null})
        `;
      }

      request.log.info({ doId, documentNumber, salesOrderId, tenantId }, 'Delivery note created');

      return reply.status(201).send({
        id: doId,
        documentNumber,
        salesOrderId,
        customerId,
        customerName,
        status: 'draft',
        deliveryDate,
        notes: notes ?? null,
        lines: lines.map((l) => ({
          salesOrderLineId: l.salesOrderLineId,
          description: l.description,
          quantityDelivered: l.quantityDelivered,
          productId: l.productId ?? null,
          warehouseId: l.warehouseId ?? null,
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/delivery-notes — list
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: DoListQuery }>(
    `${API_V1_PREFIX}/delivery-notes`,
    {
      schema: {
        description: 'List delivery notes',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        querystring: listQuerySchema,
        response: {
          200: {
            type: 'object',
            properties: {
              items: { type: 'array', items: doResponseSchema },
              total: { type: 'integer' },
              limit: { type: 'integer' },
              offset: { type: 'integer' },
              hasMore: { type: 'boolean' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(AR_DO_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const limit = request.query.limit ?? 20;
      const offset = request.query.offset ?? 0;
      const { status, salesOrderId } = request.query;

      let countRows: CountRow[];
      let rows: DoRow[];

      if (status !== undefined && salesOrderId !== undefined) {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM delivery_notes WHERE tenant_id = ${tenantId} AND status = ${status} AND sales_order_id = ${salesOrderId}`;
        rows = await fastify.sql<DoRow[]>`SELECT * FROM delivery_notes WHERE tenant_id = ${tenantId} AND status = ${status} AND sales_order_id = ${salesOrderId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      } else if (status !== undefined) {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM delivery_notes WHERE tenant_id = ${tenantId} AND status = ${status}`;
        rows = await fastify.sql<DoRow[]>`SELECT * FROM delivery_notes WHERE tenant_id = ${tenantId} AND status = ${status} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      } else if (salesOrderId !== undefined) {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM delivery_notes WHERE tenant_id = ${tenantId} AND sales_order_id = ${salesOrderId}`;
        rows = await fastify.sql<DoRow[]>`SELECT * FROM delivery_notes WHERE tenant_id = ${tenantId} AND sales_order_id = ${salesOrderId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      } else {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM delivery_notes WHERE tenant_id = ${tenantId}`;
        rows = await fastify.sql<DoRow[]>`SELECT * FROM delivery_notes WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      }

      const total = parseInt(countRows[0]?.count ?? '0', 10);
      const items = rows.map((r) => ({
        id: r.id,
        documentNumber: r.document_number,
        salesOrderId: r.sales_order_id,
        customerId: r.customer_id,
        customerName: r.customer_name,
        status: r.status,
        deliveryDate: r.delivery_date,
        notes: r.notes,
        lines: [],
        createdAt: toISO(r.created_at),
        updatedAt: toISO(r.updated_at),
      }));

      return reply.status(200).send({ items, total, limit, offset, hasMore: offset + limit < total });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/delivery-notes/:id — detail
  // -------------------------------------------------------------------------
  fastify.get<{ Params: IdParams }>(
    `${API_V1_PREFIX}/delivery-notes/:id`,
    {
      schema: {
        description: 'Get delivery note details',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: { 200: { ...doResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AR_DO_READ)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const rows = await fastify.sql<[DoRow?]>`
        SELECT * FROM delivery_notes WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      const doc = rows[0];
      if (!doc) throw new NotFoundError({ detail: `Delivery note ${id} not found.` });

      const lines = await fastify.sql<DoLineRow[]>`
        SELECT * FROM delivery_note_lines WHERE delivery_note_id = ${id}
      `;

      return reply.status(200).send({
        id: doc.id,
        documentNumber: doc.document_number,
        salesOrderId: doc.sales_order_id,
        customerId: doc.customer_id,
        customerName: doc.customer_name,
        status: doc.status,
        deliveryDate: doc.delivery_date,
        notes: doc.notes,
        lines: lines.map((l) => ({
          id: l.id,
          salesOrderLineId: l.sales_order_line_id,
          description: l.description,
          quantityDelivered: l.quantity_delivered,
          productId: l.product_id,
          warehouseId: l.warehouse_id,
        })),
        createdAt: toISO(doc.created_at),
        updatedAt: toISO(doc.updated_at),
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/delivery-notes/:id/deliver — mark as delivered
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/delivery-notes/:id/deliver`,
    {
      schema: {
        description: 'Mark delivery note as delivered and update SO line quantities',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: { 200: { ...doResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AR_DO_DELIVER)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const doRows = await fastify.sql<[DoRow?]>`
        SELECT * FROM delivery_notes WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      const doc = doRows[0];
      if (!doc) throw new NotFoundError({ detail: `Delivery note ${id} not found.` });
      if (doc.status !== 'draft') {
        throw new ConflictError({ detail: `Delivery note ${id} cannot be delivered — current status is "${doc.status}".` });
      }

      // Get lines to update SO line delivered quantities
      const doLines = await fastify.sql<DoLineRow[]>`
        SELECT * FROM delivery_note_lines WHERE delivery_note_id = ${id}
      `;

      // Check stock availability for lines with product_id
      for (const line of doLines) {
        if (line.product_id && line.warehouse_id) {
          const stockRows = await fastify.sql<[{ quantity_on_hand: number }?]>`
            SELECT quantity_on_hand FROM stock_levels
            WHERE product_id = ${line.product_id} AND warehouse_id = ${line.warehouse_id}
            LIMIT 1
          `;
          const onHand = stockRows[0]?.quantity_on_hand ?? 0;
          if (onHand < line.quantity_delivered) {
            throw new ConflictError({
              detail: `Insufficient stock for product ${line.product_id} in warehouse ${line.warehouse_id}. Available: ${onHand}, required: ${line.quantity_delivered}.`,
            });
          }
        }
      }

      // Update each SO line's delivered_quantity and create stock movements
      for (const line of doLines) {
        await fastify.sql`
          UPDATE sales_order_lines
          SET delivered_quantity = delivered_quantity + ${line.quantity_delivered}
          WHERE id = ${line.sales_order_line_id}
        `;

        // Create stock movement and update stock level if product/warehouse linked
        if (line.product_id && line.warehouse_id) {
          const qty = Math.round(line.quantity_delivered);
          // Update stock_levels
          await fastify.sql`
            INSERT INTO stock_levels (product_id, warehouse_id, quantity_on_hand, quantity_reserved, quantity_available)
            VALUES (${line.product_id}, ${line.warehouse_id}, ${-qty}, 0, ${-qty})
            ON CONFLICT (product_id, warehouse_id)
            DO UPDATE SET
              quantity_on_hand = stock_levels.quantity_on_hand - ${qty},
              quantity_available = stock_levels.quantity_available - ${qty}
          `;
          const newBalanceRows = await fastify.sql<[{ quantity_on_hand: number }]>`
            SELECT quantity_on_hand FROM stock_levels WHERE product_id = ${line.product_id} AND warehouse_id = ${line.warehouse_id}
          `;
          const balanceAfter = newBalanceRows[0]?.quantity_on_hand ?? 0;
          await fastify.sql`
            INSERT INTO stock_movements (id, product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, balance_after, tenant_id, created_by)
            VALUES (${crypto.randomUUID()}, ${line.product_id}, ${line.warehouse_id}, 'issue', ${-qty}, 'delivery_note', ${id}, ${balanceAfter}, ${tenantId}, ${request.user.sub})
          `;
        }
      }

      // Mark delivery note as delivered
      await fastify.sql`
        UPDATE delivery_notes
        SET status = 'delivered', delivered_at = NOW(), updated_at = NOW()
        WHERE id = ${id}
      `;

      // Recalculate SO status based on delivered quantities
      const soLines = await fastify.sql<SoLineRow[]>`
        SELECT quantity, delivered_quantity FROM sales_order_lines WHERE sales_order_id = ${doc.sales_order_id}
      `;

      const totalQty = soLines.reduce((sum, l) => sum + l.quantity, 0);
      const deliveredQty = soLines.reduce((sum, l) => sum + l.delivered_quantity, 0);

      let newSoStatus: string;
      if (deliveredQty >= totalQty) {
        newSoStatus = 'delivered';
      } else if (deliveredQty > 0) {
        newSoStatus = 'partial_delivered';
      } else {
        newSoStatus = 'confirmed';
      }

      await fastify.sql`
        UPDATE sales_orders SET status = ${newSoStatus}, updated_at = NOW()
        WHERE id = ${doc.sales_order_id}
      `;

      request.log.info({ doId: id, salesOrderId: doc.sales_order_id, newSoStatus, tenantId }, 'Delivery note marked delivered');

      return reply.status(200).send({
        id: doc.id,
        documentNumber: doc.document_number,
        salesOrderId: doc.sales_order_id,
        customerId: doc.customer_id,
        customerName: doc.customer_name,
        status: 'delivered',
        deliveryDate: doc.delivery_date,
        notes: doc.notes,
        lines: doLines.map((l) => ({
          id: l.id,
          salesOrderLineId: l.sales_order_line_id,
          description: l.description,
          quantityDelivered: l.quantity_delivered,
          productId: l.product_id,
          warehouseId: l.warehouse_id,
        })),
        createdAt: toISO(doc.created_at),
        updatedAt: new Date().toISOString(),
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/delivery-notes/:id/convert-to-invoice — delivered → create invoice
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/delivery-notes/:id/convert-to-invoice`,
    {
      schema: {
        description: 'Convert a delivered delivery note to an invoice (DO → INV)',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: {
          201: {
            description: 'Invoice created from delivery note',
            type: 'object',
            properties: {
              deliveryNoteId: { type: 'string' },
              invoiceId: { type: 'string' },
              invoiceNumber: { type: 'string' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(AR_DO_READ), requirePermission(AR_INVOICE_CREATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId, sub: userId } = request.user;

      // Fetch delivery note
      const doRows = await fastify.sql<[DoRow?]>`
        SELECT * FROM delivery_notes WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      const doc = doRows[0];
      if (!doc) throw new NotFoundError({ detail: `Delivery note ${id} not found.` });

      if (doc.status !== 'delivered') {
        throw new ConflictError({
          detail: `Delivery note ${id} cannot be converted — current status is "${doc.status}". Only delivered delivery notes can be converted to invoice.`,
        });
      }

      // Check if already converted (prevent double-conversion)
      const existingInvRows = await fastify.sql<[{ id: string }?]>`
        SELECT id FROM invoices WHERE delivery_note_id = ${id} LIMIT 1
      `;
      if (existingInvRows[0]) {
        throw new ConflictError({
          detail: `Delivery note ${id} has already been converted to invoice ${existingInvRows[0].id}.`,
        });
      }

      // Fetch DO lines
      const doLines = await fastify.sql<DoLineRow[]>`
        SELECT * FROM delivery_note_lines WHERE delivery_note_id = ${id}
      `;

      // Fetch SO line prices to build invoice lines
      interface SoLinePriceRow {
        id: string;
        description: string;
        unit_price_satang: bigint;
      }
      const soLineIds = doLines.map((l) => l.sales_order_line_id);
      let soLinePrices: SoLinePriceRow[] = [];
      if (soLineIds.length > 0) {
        // Fetch each SO line individually (tagged template doesn't support IN arrays easily)
        soLinePrices = [];
        for (const soLineId of soLineIds) {
          const rows = await fastify.sql<SoLinePriceRow[]>`
            SELECT id, description, unit_price_satang FROM sales_order_lines WHERE id = ${soLineId}
          `;
          if (rows[0]) soLinePrices.push(rows[0]);
        }
      }
      const priceMap = new Map(soLinePrices.map((r) => [r.id, r]));

      // Build invoice lines with prices from SO lines
      let totalSatang = 0n;
      const invoiceLines: Array<{
        id: string;
        lineNumber: number;
        description: string;
        quantity: number;
        unitPriceSatang: string;
        totalSatang: string;
        accountId: string | null;
      }> = [];

      for (let i = 0; i < doLines.length; i++) {
        const doLine = doLines[i]!;
        const soLine = priceMap.get(doLine.sales_order_line_id);
        if (!soLine) {
          throw new ValidationError({
            detail: `Sales order line ${doLine.sales_order_line_id} not found for DO line.`,
          });
        }
        const unitPrice = BigInt(soLine.unit_price_satang);
        const qty = BigInt(Math.round(doLine.quantity_delivered * 100));
        const lineTotal = unitPrice * qty / 100n;
        totalSatang += lineTotal;

        invoiceLines.push({
          id: crypto.randomUUID(),
          lineNumber: i + 1,
          description: doLine.description,
          quantity: doLine.quantity_delivered,
          unitPriceSatang: unitPrice.toString(),
          totalSatang: lineTotal.toString(),
          accountId: null,
        });
      }

      // Create the invoice
      const invoiceId = crypto.randomUUID();
      const invFiscalYear = new Date().getFullYear();
      const invoiceNumber = await nextDocNumber(fastify.sql, tenantId, 'invoice', invFiscalYear);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      const dueDateStr = dueDate.toISOString().slice(0, 10);

      await fastify.sql`
        INSERT INTO invoices (
          id, invoice_number, customer_id, status, total_satang, paid_satang,
          due_date, notes, delivery_note_id, sales_order_id, tenant_id, created_by
        ) VALUES (
          ${invoiceId}, ${invoiceNumber}, ${doc.customer_id}, 'draft',
          ${totalSatang.toString()}::bigint, 0,
          ${dueDateStr}, ${doc.notes ?? null}, ${id}, ${doc.sales_order_id},
          ${tenantId}, ${userId}
        )
      `;

      // Insert invoice line items
      for (const line of invoiceLines) {
        await fastify.sql`
          INSERT INTO invoice_line_items (
            id, invoice_id, line_number, description, quantity,
            unit_price_satang, total_satang, account_id
          ) VALUES (
            ${line.id}, ${invoiceId}, ${line.lineNumber}, ${line.description},
            ${line.quantity}, ${line.unitPriceSatang}::bigint,
            ${line.totalSatang}::bigint, ${line.accountId}
          )
        `;
      }

      request.log.info(
        { deliveryNoteId: id, invoiceId, invoiceNumber, salesOrderId: doc.sales_order_id, tenantId },
        'Delivery note converted to invoice',
      );

      return reply.status(201).send({
        deliveryNoteId: id,
        invoiceId,
        invoiceNumber,
      });
    },
  );
}
