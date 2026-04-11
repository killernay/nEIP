/**
 * RFQ (Request for Quotation) routes:
 *   POST /api/v1/rfqs                             — create RFQ (optionally from PR)
 *   GET  /api/v1/rfqs                             — list
 *   GET  /api/v1/rfqs/:id                         — detail with vendor responses
 *   POST /api/v1/rfqs/:id/send                    — draft → sent
 *   POST /api/v1/rfqs/:id/vendors                 — add vendor response
 *   POST /api/v1/rfqs/:id/compare                 — compare vendor responses
 *   POST /api/v1/rfqs/:id/select-winner           — select winner → create PO
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, ConflictError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';

const MM_RFQ_CREATE = 'mm:rfq:create' as const;
const MM_RFQ_READ   = 'mm:rfq:read'   as const;

interface RfqRow {
  id: string; document_number: string; pr_id: string | null;
  status: string; notes: string | null; tenant_id: string;
  created_by: string | null;
  created_at: Date | string; updated_at: Date | string;
}

interface RfqVendorRow {
  id: string; rfq_id: string; vendor_id: string;
  response_date: string | null; total_amount_satang: bigint;
  selected: boolean; notes: string | null;
  created_at: Date | string; updated_at: Date | string;
}

interface CountRow { count: string; }

function generateDocNumber(prefix: string): string {
  const yyyymmdd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seq = String(Date.now()).slice(-3);
  return `${prefix}-${yyyymmdd}-${seq}`;
}

function mapRfq(r: RfqRow, vendors: RfqVendorRow[] = []) {
  return {
    id: r.id, documentNumber: r.document_number, prId: r.pr_id,
    status: r.status, notes: r.notes,
    vendors: vendors.map((v) => ({
      id: v.id, vendorId: v.vendor_id,
      responseDate: v.response_date,
      totalAmountSatang: v.total_amount_satang.toString(),
      selected: v.selected, notes: v.notes,
    })),
    createdAt: toISO(r.created_at), updatedAt: toISO(r.updated_at),
  };
}

export async function rfqRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // POST — create
  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/rfqs`,
    {
      schema: { description: 'สร้างใบขอใบเสนอราคา — Create an RFQ', tags: ['rfqs'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(MM_RFQ_CREATE)],
    },
    async (request, reply) => {
      const b = request.body;
      const { tenantId, sub: userId } = request.user;
      const id = crypto.randomUUID();
      const documentNumber = generateDocNumber('RFQ');

      await fastify.sql`
        INSERT INTO rfqs (id, document_number, pr_id, status, notes, tenant_id, created_by)
        VALUES (${id}, ${documentNumber}, ${(b['prId'] as string | undefined) ?? null},
                'draft', ${(b['notes'] as string | undefined) ?? null}, ${tenantId}, ${userId})
      `;

      // Add initial vendors if provided
      const vendorIds = b['vendorIds'] as string[] | undefined;
      if (vendorIds) {
        for (const vid of vendorIds) {
          await fastify.sql`
            INSERT INTO rfq_vendors (id, rfq_id, vendor_id)
            VALUES (${crypto.randomUUID()}, ${id}, ${vid})
          `;
        }
      }

      const rows = await fastify.sql<[RfqRow]>`SELECT * FROM rfqs WHERE id = ${id} LIMIT 1`;
      const vendors = await fastify.sql<RfqVendorRow[]>`SELECT * FROM rfq_vendors WHERE rfq_id = ${id}`;
      return reply.status(201).send(mapRfq(rows[0], vendors));
    },
  );

  // GET — list
  fastify.get<{ Querystring: Record<string, string> }>(
    `${API_V1_PREFIX}/rfqs`,
    {
      schema: { description: 'รายการใบขอใบเสนอราคา — List RFQs', tags: ['rfqs'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(MM_RFQ_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const limit = parseInt(request.query['limit'] ?? '20', 10);
      const offset = parseInt(request.query['offset'] ?? '0', 10);

      const countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM rfqs WHERE tenant_id = ${tenantId}`;
      const rows = await fastify.sql<RfqRow[]>`SELECT * FROM rfqs WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;

      const total = parseInt(countRows[0]?.count ?? '0', 10);
      return reply.status(200).send({ items: rows.map((r) => mapRfq(r)), total, limit, offset, hasMore: offset + limit < total });
    },
  );

  // GET /:id — detail
  fastify.get<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/rfqs/:id`,
    {
      schema: { description: 'ดูรายละเอียด RFQ — Get RFQ detail', tags: ['rfqs'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(MM_RFQ_READ)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;
      const rows = await fastify.sql<[RfqRow?]>`SELECT * FROM rfqs WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
      if (!rows[0]) throw new NotFoundError({ detail: `RFQ ${id} not found.` });
      const vendors = await fastify.sql<RfqVendorRow[]>`SELECT * FROM rfq_vendors WHERE rfq_id = ${id} ORDER BY total_amount_satang`;
      return reply.status(200).send(mapRfq(rows[0], vendors));
    },
  );

  // POST /:id/send — draft → sent
  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/rfqs/:id/send`,
    {
      schema: { description: 'ส่ง RFQ ให้ผู้ขาย — Send RFQ to vendors', tags: ['rfqs'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(MM_RFQ_CREATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;
      const rows = await fastify.sql<[RfqRow?]>`
        UPDATE rfqs SET status = 'sent', updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'draft' RETURNING *
      `;
      if (!rows[0]) {
        const existing = await fastify.sql<[{ id: string; status: string }?]>`SELECT id, status FROM rfqs WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
        if (!existing[0]) throw new NotFoundError({ detail: `RFQ ${id} not found.` });
        throw new ConflictError({ detail: `RFQ cannot be sent — current status is "${existing[0].status}".` });
      }
      return reply.status(200).send(mapRfq(rows[0]));
    },
  );

  // POST /:id/vendors — add vendor response
  fastify.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/rfqs/:id/vendors`,
    {
      schema: { description: 'เพิ่มการตอบกลับจากผู้ขาย — Add vendor response to RFQ', tags: ['rfqs'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(MM_RFQ_CREATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const b = request.body;
      const { tenantId } = request.user;

      const rfqRows = await fastify.sql<[RfqRow?]>`SELECT * FROM rfqs WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
      if (!rfqRows[0]) throw new NotFoundError({ detail: `RFQ ${id} not found.` });

      const vendorId = b['vendorId'] as string;
      if (!vendorId) throw new ValidationError({ detail: 'vendorId is required.' });

      const vid = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO rfq_vendors (id, rfq_id, vendor_id, response_date, total_amount_satang, notes)
        VALUES (${vid}, ${id}, ${vendorId},
                ${(b['responseDate'] as string | undefined) ?? null},
                ${String(b['totalAmountSatang'] ?? '0')}::bigint,
                ${(b['notes'] as string | undefined) ?? null})
      `;

      // Update RFQ status to received if it was sent
      if (rfqRows[0].status === 'sent') {
        await fastify.sql`UPDATE rfqs SET status = 'received', updated_at = NOW() WHERE id = ${id}`;
      }

      const vendors = await fastify.sql<RfqVendorRow[]>`SELECT * FROM rfq_vendors WHERE rfq_id = ${id} ORDER BY total_amount_satang`;
      const updated = await fastify.sql<[RfqRow]>`SELECT * FROM rfqs WHERE id = ${id} LIMIT 1`;
      return reply.status(201).send(mapRfq(updated[0], vendors));
    },
  );

  // POST /:id/compare — compare vendor responses
  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/rfqs/:id/compare`,
    {
      schema: { description: 'เปรียบเทียบราคาจากผู้ขาย — Compare vendor quotes', tags: ['rfqs'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(MM_RFQ_READ)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const rfqRows = await fastify.sql<[RfqRow?]>`SELECT * FROM rfqs WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
      if (!rfqRows[0]) throw new NotFoundError({ detail: `RFQ ${id} not found.` });

      const vendors = await fastify.sql<RfqVendorRow[]>`SELECT * FROM rfq_vendors WHERE rfq_id = ${id} ORDER BY total_amount_satang`;

      const comparison = vendors.map((v) => ({
        vendorId: v.vendor_id,
        totalAmountSatang: v.total_amount_satang.toString(),
        responseDate: v.response_date,
        selected: v.selected,
      }));

      const lowestVendor = vendors[0];
      return reply.status(200).send({
        rfqId: id,
        vendors: comparison,
        recommendedVendorId: lowestVendor?.vendor_id ?? null,
        lowestAmountSatang: lowestVendor?.total_amount_satang.toString() ?? '0',
      });
    },
  );

  // POST /:id/select-winner — select winner → create PO
  fastify.post<{ Params: { id: string }; Body: { vendorId: string } }>(
    `${API_V1_PREFIX}/rfqs/:id/select-winner`,
    {
      schema: { description: 'เลือกผู้ขายที่ชนะ → สร้างใบสั่งซื้อ — Select winner and create PO', tags: ['rfqs'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(MM_RFQ_CREATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId, sub: userId } = request.user;
      const vendorId = request.body?.vendorId;
      if (!vendorId) throw new ValidationError({ detail: 'vendorId is required.' });

      const rfqRows = await fastify.sql<[RfqRow?]>`SELECT * FROM rfqs WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
      if (!rfqRows[0]) throw new NotFoundError({ detail: `RFQ ${id} not found.` });
      if (rfqRows[0].status === 'closed') throw new ConflictError({ detail: 'RFQ is already closed.' });

      // Mark vendor as selected
      await fastify.sql`UPDATE rfq_vendors SET selected = FALSE WHERE rfq_id = ${id}`;
      await fastify.sql`UPDATE rfq_vendors SET selected = TRUE, updated_at = NOW() WHERE rfq_id = ${id} AND vendor_id = ${vendorId}`;

      // Get selected vendor's amount
      const vendorRows = await fastify.sql<[RfqVendorRow?]>`SELECT * FROM rfq_vendors WHERE rfq_id = ${id} AND vendor_id = ${vendorId} LIMIT 1`;
      if (!vendorRows[0]) throw new NotFoundError({ detail: `Vendor ${vendorId} not found in this RFQ.` });

      // Create PO
      const poId = crypto.randomUUID();
      const poDocNumber = generateDocNumber('PO');
      const orderDate = new Date().toISOString().slice(0, 10);

      await fastify.sql`
        INSERT INTO purchase_orders (id, document_number, vendor_id, status, order_date, total_satang, notes, tenant_id, created_by)
        VALUES (${poId}, ${poDocNumber}, ${vendorId}, 'draft', ${orderDate},
                ${vendorRows[0].total_amount_satang.toString()}::bigint,
                ${'Created from RFQ ' + rfqRows[0].document_number}, ${tenantId}, ${userId})
      `;

      // If RFQ was created from a PR, copy PR lines to PO
      if (rfqRows[0].pr_id) {
        const prLines = await fastify.sql<{ line_number: number; description: string; quantity: number; estimated_price_satang: bigint; amount_satang: bigint; product_id: string | null }[]>`
          SELECT * FROM pr_lines WHERE purchase_requisition_id = ${rfqRows[0].pr_id} ORDER BY line_number
        `;
        for (const line of prLines) {
          await fastify.sql`
            INSERT INTO purchase_order_lines (id, purchase_order_id, line_number, description, quantity, received_quantity, unit_price_satang, amount_satang, product_id)
            VALUES (${crypto.randomUUID()}, ${poId}, ${line.line_number}, ${line.description}, ${line.quantity}, 0,
                    ${line.estimated_price_satang.toString()}::bigint, ${line.amount_satang.toString()}::bigint, ${line.product_id})
          `;
        }
      } else {
        // Single line PO from RFQ total
        await fastify.sql`
          INSERT INTO purchase_order_lines (id, purchase_order_id, line_number, description, quantity, received_quantity, unit_price_satang, amount_satang)
          VALUES (${crypto.randomUUID()}, ${poId}, 1, ${'Items from RFQ ' + rfqRows[0].document_number}, 1, 0,
                  ${vendorRows[0].total_amount_satang.toString()}::bigint, ${vendorRows[0].total_amount_satang.toString()}::bigint)
        `;
      }

      // Close RFQ
      await fastify.sql`UPDATE rfqs SET status = 'closed', updated_at = NOW() WHERE id = ${id}`;

      request.log.info({ rfqId: id, poId, vendorId, tenantId }, 'RFQ winner selected, PO created');
      return reply.status(201).send({ purchaseOrderId: poId, purchaseOrderDocumentNumber: poDocNumber, selectedVendorId: vendorId });
    },
  );
}
