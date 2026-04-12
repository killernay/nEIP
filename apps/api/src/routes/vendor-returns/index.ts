/**
 * Vendor Return routes (Phase 5.4):
 *   POST /api/v1/vendor-returns            — create return
 *   GET  /api/v1/vendor-returns            — list returns
 *   GET  /api/v1/vendor-returns/:id        — get return detail
 *   POST /api/v1/vendor-returns/:id/ship   — ship back (creates stock_movement)
 *   POST /api/v1/vendor-returns/:id/credit — receive credit memo (creates AP credit)
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import {
  AP_VENDOR_READ,
  INV_MOVEMENT_CREATE,
  AP_BILL_CREATE,
} from '../../lib/permissions.js';

interface VendorReturnRow {
  id: string;
  vendor_id: string;
  po_id: string | null;
  status: string;
  reason: string | null;
  tenant_id: string;
  created_by: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface LineRow {
  id: string;
  vendor_return_id: string;
  product_id: string;
  quantity: number;
  unit_price_satang: string;
}

function mapReturn(r: VendorReturnRow) {
  return {
    id: r.id,
    vendorId: r.vendor_id,
    poId: r.po_id,
    status: r.status,
    reason: r.reason,
    createdBy: r.created_by,
    createdAt: toISO(r.created_at),
    updatedAt: toISO(r.updated_at),
  };
}

export async function vendorReturnRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // POST /vendor-returns
  fastify.post<{ Body: { vendorId: string; poId?: string; reason?: string; lines: Array<{ productId: string; quantity: number; unitPriceSatang: string }> } }>(
    `${API_V1_PREFIX}/vendor-returns`,
    {
      schema: {
        description: 'Create vendor return',
        tags: ['vendor-returns'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['vendorId', 'lines'],
          properties: {
            vendorId: { type: 'string' },
            poId: { type: 'string' },
            reason: { type: 'string' },
            lines: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                required: ['productId', 'quantity', 'unitPriceSatang'],
                properties: {
                  productId: { type: 'string' },
                  quantity: { type: 'integer', minimum: 1 },
                  unitPriceSatang: { type: 'string' },
                },
              },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(AP_VENDOR_READ)],
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user;
      const { vendorId, poId, reason, lines } = request.body;
      const id = crypto.randomUUID();

      await fastify.sql`
        INSERT INTO vendor_returns (id, vendor_id, po_id, status, reason, tenant_id, created_by)
        VALUES (${id}, ${vendorId}, ${poId ?? null}, 'draft', ${reason ?? null}, ${tenantId}, ${userId})
      `;

      for (const line of lines) {
        await fastify.sql`
          INSERT INTO vendor_return_lines (id, vendor_return_id, product_id, quantity, unit_price_satang)
          VALUES (${crypto.randomUUID()}, ${id}, ${line.productId}, ${line.quantity}, ${line.unitPriceSatang}::bigint)
        `;
      }

      const row = await fastify.sql<[VendorReturnRow]>`SELECT * FROM vendor_returns WHERE id = ${id}`;
      const lineRows = await fastify.sql<LineRow[]>`SELECT * FROM vendor_return_lines WHERE vendor_return_id = ${id}`;

      return reply.status(201).send({
        ...mapReturn(row[0]),
        lines: lineRows.map((l) => ({
          id: l.id,
          productId: l.product_id,
          quantity: l.quantity,
          unitPriceSatang: l.unit_price_satang.toString(),
        })),
      });
    },
  );

  // GET /vendor-returns
  fastify.get(
    `${API_V1_PREFIX}/vendor-returns`,
    {
      schema: { description: 'List vendor returns', tags: ['vendor-returns'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(AP_VENDOR_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const rows = await fastify.sql<VendorReturnRow[]>`
        SELECT * FROM vendor_returns WHERE tenant_id = ${tenantId} ORDER BY created_at DESC
      `;
      return reply.send({ items: rows.map(mapReturn), total: rows.length });
    },
  );

  // GET /vendor-returns/:id
  fastify.get<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/vendor-returns/:id`,
    {
      schema: {
        description: 'Get vendor return detail',
        tags: ['vendor-returns'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      },
      preHandler: [requireAuth, requirePermission(AP_VENDOR_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const row = await fastify.sql<[VendorReturnRow?]>`
        SELECT * FROM vendor_returns WHERE id = ${request.params.id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!row[0]) throw new NotFoundError({ detail: 'Vendor return not found.' });

      const lines = await fastify.sql<LineRow[]>`
        SELECT * FROM vendor_return_lines WHERE vendor_return_id = ${request.params.id}
      `;

      return reply.send({
        ...mapReturn(row[0]),
        lines: lines.map((l) => ({
          id: l.id,
          productId: l.product_id,
          quantity: l.quantity,
          unitPriceSatang: l.unit_price_satang.toString(),
        })),
      });
    },
  );

  // POST /vendor-returns/:id/ship — ship back, create stock_movement type=return
  fastify.post<{ Params: { id: string }; Body: { warehouseId: string } }>(
    `${API_V1_PREFIX}/vendor-returns/:id/ship`,
    {
      schema: {
        description: 'Ship vendor return back (creates inventory return movements)',
        tags: ['vendor-returns'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        body: {
          type: 'object',
          required: ['warehouseId'],
          properties: { warehouseId: { type: 'string' } },
        },
      },
      preHandler: [requireAuth, requirePermission(INV_MOVEMENT_CREATE)],
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user;
      const { id } = request.params;
      const { warehouseId } = request.body;

      const ret = await fastify.sql<[VendorReturnRow?]>`
        SELECT * FROM vendor_returns WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'draft' LIMIT 1
      `;
      if (!ret[0]) throw new NotFoundError({ detail: 'Draft vendor return not found.' });

      const lines = await fastify.sql<LineRow[]>`
        SELECT * FROM vendor_return_lines WHERE vendor_return_id = ${id}
      `;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await fastify.sql.begin(async (sql: any) => {
        // Create stock movements (negative = outbound return)
        for (const line of lines) {
          const mvtId = crypto.randomUUID();
          await sql`
            INSERT INTO stock_movements (id, product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, notes, tenant_id, created_by)
            VALUES (${mvtId}, ${line.product_id}, ${warehouseId}, 'return', ${-line.quantity}, 'purchase_order', ${ret[0]!.po_id ?? null}, ${'Vendor return: ' + id}, ${tenantId}, ${userId})
          `;
        }

        await sql`
          UPDATE vendor_returns SET status = 'shipped', updated_at = NOW() WHERE id = ${id} AND tenant_id = ${tenantId}
        `;
      });

      return reply.send({ id, status: 'shipped', message: `Shipped ${lines.length} items back to vendor.` });
    },
  );

  // POST /vendor-returns/:id/credit — receive credit memo, create AP credit
  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/vendor-returns/:id/credit`,
    {
      schema: {
        description: 'Receive credit memo from vendor (creates AP credit entry)',
        tags: ['vendor-returns'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      },
      preHandler: [requireAuth, requirePermission(AP_BILL_CREATE)],
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user;
      const { id } = request.params;

      const ret = await fastify.sql<[VendorReturnRow?]>`
        SELECT * FROM vendor_returns WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'shipped' LIMIT 1
      `;
      if (!ret[0]) throw new NotFoundError({ detail: 'Shipped vendor return not found.' });

      const lines = await fastify.sql<LineRow[]>`
        SELECT * FROM vendor_return_lines WHERE vendor_return_id = ${id}
      `;

      // Calculate total credit
      let totalSatang = 0n;
      for (const line of lines) {
        totalSatang += BigInt(line.unit_price_satang) * BigInt(line.quantity);
      }

      const billId = crypto.randomUUID();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await fastify.sql.begin(async (sql: any) => {
        // Create credit bill (negative bill)
        await sql`
          INSERT INTO bills (id, document_number, vendor_id, total_satang, paid_satang, due_date, notes, status, tenant_id, created_by)
          VALUES (${billId}, ${'VR-CREDIT-' + Date.now()}, ${ret[0]!.vendor_id}, ${(-totalSatang).toString()}::bigint, 0, ${new Date().toISOString().slice(0, 10)}, ${'Credit from vendor return ' + id}, 'posted', ${tenantId}, ${userId})
        `;

        await sql`
          UPDATE vendor_returns SET status = 'received_credit', updated_at = NOW() WHERE id = ${id} AND tenant_id = ${tenantId}
        `;
      });

      return reply.send({
        id,
        status: 'received_credit',
        creditBillId: billId,
        totalCreditSatang: totalSatang.toString(),
        message: 'Credit memo received and AP credit created.',
      });
    },
  );
}
