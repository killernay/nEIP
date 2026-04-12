/**
 * Purchase Requisition routes (MM-PR):
 *   POST /api/v1/purchase-requisitions                      — create
 *   GET  /api/v1/purchase-requisitions                      — list
 *   GET  /api/v1/purchase-requisitions/:id                  — detail
 *   PUT  /api/v1/purchase-requisitions/:id                  — update draft
 *   POST /api/v1/purchase-requisitions/:id/submit           — draft → pending
 *   POST /api/v1/purchase-requisitions/:id/approve          — pending → approved
 *   POST /api/v1/purchase-requisitions/:id/reject           — pending → rejected
 *   POST /api/v1/purchase-requisitions/:id/convert-to-po    — approved → converted (creates PO)
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, ConflictError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';

const MM_PR_CREATE  = 'mm:pr:create'  as const;
const MM_PR_READ    = 'mm:pr:read'    as const;
const MM_PR_UPDATE  = 'mm:pr:update'  as const;
const MM_PR_APPROVE = 'mm:pr:approve' as const;

interface PrRow {
  id: string; document_number: string; requester_id: string;
  department_id: string | null; status: string; notes: string | null;
  tenant_id: string; created_by: string | null;
  approved_by: string | null; approved_at: Date | string | null;
  created_at: Date | string; updated_at: Date | string;
}

interface PrLineRow {
  id: string; purchase_requisition_id: string; line_number: number;
  product_id: string | null; description: string; quantity: number;
  estimated_price_satang: bigint; amount_satang: bigint;
}

interface CountRow { count: string; }

function generateDocNumber(prefix: string): string {
  const yyyymmdd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seq = String(Date.now()).slice(-3);
  return `${prefix}-${yyyymmdd}-${seq}`;
}

function mapPr(r: PrRow, lines: PrLineRow[] = []) {
  return {
    id: r.id, documentNumber: r.document_number,
    requesterId: r.requester_id, departmentId: r.department_id,
    status: r.status, notes: r.notes,
    approvedBy: r.approved_by,
    approvedAt: r.approved_at ? toISO(r.approved_at) : null,
    lines: lines.map((l) => ({
      id: l.id, lineNumber: l.line_number,
      productId: l.product_id, description: l.description,
      quantity: l.quantity,
      estimatedPriceSatang: l.estimated_price_satang.toString(),
      amountSatang: l.amount_satang.toString(),
    })),
    createdAt: toISO(r.created_at), updatedAt: toISO(r.updated_at),
  };
}

export async function purchaseRequisitionRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // POST — create
  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/purchase-requisitions`,
    {
      schema: { description: 'สร้างใบขอซื้อ — Create a purchase requisition', tags: ['purchase-requisitions'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(MM_PR_CREATE)],
    },
    async (request, reply) => {
      const b = request.body;
      const { tenantId, sub: userId } = request.user;

      const lines = b['lines'] as Array<{ description: string; quantity: number; estimatedPriceSatang: string; productId?: string }> | undefined;
      if (!lines || lines.length === 0) throw new ValidationError({ detail: 'At least one line item is required.' });

      const prId = crypto.randomUUID();
      const documentNumber = generateDocNumber('PR');
      const requesterId = (b['requesterId'] as string) ?? userId;

      await fastify.sql`
        INSERT INTO purchase_requisitions (id, document_number, requester_id, department_id, status, notes, tenant_id, created_by)
        VALUES (${prId}, ${documentNumber}, ${requesterId},
                ${(b['departmentId'] as string | undefined) ?? null}, 'draft',
                ${(b['notes'] as string | undefined) ?? null}, ${tenantId}, ${userId})
      `;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        const price = BigInt(line.estimatedPriceSatang ?? '0');
        const qty = BigInt(Math.round(line.quantity * 10000));
        const amount = qty * price / 10000n;
        await fastify.sql`
          INSERT INTO pr_lines (id, purchase_requisition_id, line_number, product_id, description, quantity, estimated_price_satang, amount_satang)
          VALUES (${crypto.randomUUID()}, ${prId}, ${i + 1}, ${line.productId ?? null},
                  ${line.description}, ${line.quantity}, ${price.toString()}::bigint, ${amount.toString()}::bigint)
        `;
      }

      const rows = await fastify.sql<[PrRow]>`SELECT * FROM purchase_requisitions WHERE id = ${prId} LIMIT 1`;
      const lineRows = await fastify.sql<PrLineRow[]>`SELECT * FROM pr_lines WHERE purchase_requisition_id = ${prId} ORDER BY line_number`;
      return reply.status(201).send(mapPr(rows[0], lineRows));
    },
  );

  // GET — list
  fastify.get<{ Querystring: Record<string, string> }>(
    `${API_V1_PREFIX}/purchase-requisitions`,
    {
      schema: { description: 'รายการใบขอซื้อ — List purchase requisitions', tags: ['purchase-requisitions'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(MM_PR_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const limit = parseInt(request.query['limit'] ?? '20', 10);
      const offset = parseInt(request.query['offset'] ?? '0', 10);
      const status = request.query['status'];

      let rows: PrRow[];
      let countRows: CountRow[];

      if (status) {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM purchase_requisitions WHERE tenant_id = ${tenantId} AND status = ${status}`;
        rows = await fastify.sql<PrRow[]>`SELECT * FROM purchase_requisitions WHERE tenant_id = ${tenantId} AND status = ${status} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      } else {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM purchase_requisitions WHERE tenant_id = ${tenantId}`;
        rows = await fastify.sql<PrRow[]>`SELECT * FROM purchase_requisitions WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      }

      const total = parseInt(countRows[0]?.count ?? '0', 10);
      return reply.status(200).send({ items: rows.map((r) => mapPr(r)), total, limit, offset, hasMore: offset + limit < total });
    },
  );

  // GET /:id — detail
  fastify.get<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/purchase-requisitions/:id`,
    {
      schema: { description: 'ดูรายละเอียดใบขอซื้อ — Get PR detail', tags: ['purchase-requisitions'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(MM_PR_READ)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;
      const rows = await fastify.sql<[PrRow?]>`SELECT * FROM purchase_requisitions WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
      if (!rows[0]) throw new NotFoundError({ detail: `Purchase requisition ${id} not found.` });
      const lines = await fastify.sql<PrLineRow[]>`SELECT * FROM pr_lines WHERE purchase_requisition_id = ${id} ORDER BY line_number`;
      return reply.status(200).send(mapPr(rows[0], lines));
    },
  );

  // PUT /:id — update draft
  fastify.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/purchase-requisitions/:id`,
    {
      schema: { description: 'อัปเดตใบขอซื้อ — Update a draft PR', tags: ['purchase-requisitions'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(MM_PR_UPDATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const b = request.body;
      const { tenantId } = request.user;

      const existing = await fastify.sql<[PrRow?]>`SELECT * FROM purchase_requisitions WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
      if (!existing[0]) throw new NotFoundError({ detail: `PR ${id} not found.` });
      if (existing[0].status !== 'draft') throw new ValidationError({ detail: `Only draft PRs can be updated. Current: "${existing[0].status}".` });

      await fastify.sql`
        UPDATE purchase_requisitions SET
          notes = COALESCE(${(b['notes'] as string | undefined) ?? null}, notes),
          department_id = COALESCE(${(b['departmentId'] as string | undefined) ?? null}, department_id),
          updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `;

      const lines = b['lines'] as Array<{ description: string; quantity: number; estimatedPriceSatang: string; productId?: string }> | undefined;
      if (lines) {
        await fastify.sql`DELETE FROM pr_lines WHERE purchase_requisition_id = ${id}
          AND purchase_requisition_id IN (SELECT pr.id FROM purchase_requisitions pr WHERE pr.id = ${id} AND pr.tenant_id = ${tenantId})`;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]!;
          const price = BigInt(line.estimatedPriceSatang ?? '0');
          const qty = BigInt(Math.round(line.quantity * 10000));
          const amount = qty * price / 10000n;
          await fastify.sql`
            INSERT INTO pr_lines (id, purchase_requisition_id, line_number, product_id, description, quantity, estimated_price_satang, amount_satang)
            VALUES (${crypto.randomUUID()}, ${id}, ${i + 1}, ${line.productId ?? null},
                    ${line.description}, ${line.quantity}, ${price.toString()}::bigint, ${amount.toString()}::bigint)
          `;
        }
      }

      const updated = await fastify.sql<[PrRow]>`SELECT * FROM purchase_requisitions WHERE id = ${id} LIMIT 1`;
      const lineRows = await fastify.sql<PrLineRow[]>`SELECT * FROM pr_lines WHERE purchase_requisition_id = ${id} ORDER BY line_number`;
      return reply.status(200).send(mapPr(updated[0], lineRows));
    },
  );

  // POST /:id/submit — draft → pending
  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/purchase-requisitions/:id/submit`,
    {
      schema: { description: 'ส่งใบขอซื้อเพื่ออนุมัติ — Submit PR for approval', tags: ['purchase-requisitions'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(MM_PR_CREATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const rows = await fastify.sql<[PrRow?]>`
        UPDATE purchase_requisitions SET status = 'pending', updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'draft' RETURNING *
      `;
      if (!rows[0]) {
        const existing = await fastify.sql<[{ id: string; status: string }?]>`SELECT id, status FROM purchase_requisitions WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
        if (!existing[0]) throw new NotFoundError({ detail: `PR ${id} not found.` });
        throw new ConflictError({ detail: `PR ${id} cannot be submitted — current status is "${existing[0].status}".` });
      }
      return reply.status(200).send(mapPr(rows[0]));
    },
  );

  // POST /:id/approve
  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/purchase-requisitions/:id/approve`,
    {
      schema: { description: 'อนุมัติใบขอซื้อ — Approve a PR', tags: ['purchase-requisitions'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(MM_PR_APPROVE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId, sub: userId } = request.user;

      const rows = await fastify.sql<[PrRow?]>`
        UPDATE purchase_requisitions SET status = 'approved', approved_by = ${userId}, approved_at = NOW(), updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'pending' RETURNING *
      `;
      if (!rows[0]) {
        const existing = await fastify.sql<[{ id: string; status: string }?]>`SELECT id, status FROM purchase_requisitions WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
        if (!existing[0]) throw new NotFoundError({ detail: `PR ${id} not found.` });
        throw new ConflictError({ detail: `PR ${id} cannot be approved — current status is "${existing[0].status}".` });
      }
      return reply.status(200).send(mapPr(rows[0]));
    },
  );

  // POST /:id/reject
  fastify.post<{ Params: { id: string }; Body: { reason?: string } }>(
    `${API_V1_PREFIX}/purchase-requisitions/:id/reject`,
    {
      schema: { description: 'ปฏิเสธใบขอซื้อ — Reject a PR', tags: ['purchase-requisitions'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(MM_PR_APPROVE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const rows = await fastify.sql<[PrRow?]>`
        UPDATE purchase_requisitions SET status = 'rejected', notes = COALESCE(${request.body?.reason ?? null}, notes), updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'pending' RETURNING *
      `;
      if (!rows[0]) {
        const existing = await fastify.sql<[{ id: string; status: string }?]>`SELECT id, status FROM purchase_requisitions WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
        if (!existing[0]) throw new NotFoundError({ detail: `PR ${id} not found.` });
        throw new ConflictError({ detail: `PR ${id} cannot be rejected — current status is "${existing[0].status}".` });
      }
      return reply.status(200).send(mapPr(rows[0]));
    },
  );

  // POST /:id/convert-to-po — approved → converted (creates PO)
  fastify.post<{ Params: { id: string }; Body: { vendorId: string } }>(
    `${API_V1_PREFIX}/purchase-requisitions/:id/convert-to-po`,
    {
      schema: { description: 'แปลงใบขอซื้อเป็นใบสั่งซื้อ — Convert approved PR to PO', tags: ['purchase-requisitions'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(MM_PR_CREATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId, sub: userId } = request.user;
      const vendorId = request.body?.vendorId;
      if (!vendorId) throw new ValidationError({ detail: 'vendorId is required.' });

      const prRows = await fastify.sql<[PrRow?]>`SELECT * FROM purchase_requisitions WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
      if (!prRows[0]) throw new NotFoundError({ detail: `PR ${id} not found.` });
      if (prRows[0].status !== 'approved') throw new ConflictError({ detail: `PR must be approved to convert. Current: "${prRows[0].status}".` });

      const prLines = await fastify.sql<PrLineRow[]>`SELECT * FROM pr_lines WHERE purchase_requisition_id = ${id} ORDER BY line_number`;

      const poId = crypto.randomUUID();
      const poDocNumber = generateDocNumber('PO');
      const orderDate = new Date().toISOString().slice(0, 10);
      let totalSatang = 0n;
      for (const l of prLines) totalSatang += l.amount_satang;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await fastify.sql.begin(async (sql: any) => {
        await sql`
          INSERT INTO purchase_orders (id, document_number, vendor_id, status, order_date, total_satang, notes, tenant_id, created_by)
          VALUES (${poId}, ${poDocNumber}, ${vendorId}, 'draft', ${orderDate},
                  ${totalSatang.toString()}::bigint, ${'Converted from PR ' + prRows[0]!.document_number}, ${tenantId}, ${userId})
        `;

        for (const line of prLines) {
          await sql`
            INSERT INTO purchase_order_lines (id, purchase_order_id, line_number, description, quantity, received_quantity, unit_price_satang, amount_satang, product_id)
            VALUES (${crypto.randomUUID()}, ${poId}, ${line.line_number}, ${line.description}, ${line.quantity}, 0,
                    ${line.estimated_price_satang.toString()}::bigint, ${line.amount_satang.toString()}::bigint, ${line.product_id})
          `;
        }

        await sql`UPDATE purchase_requisitions SET status = 'converted', updated_at = NOW() WHERE id = ${id} AND tenant_id = ${tenantId}`;
      });

      request.log.info({ prId: id, poId, tenantId }, 'PR converted to PO');
      return reply.status(201).send({ purchaseOrderId: poId, purchaseOrderDocumentNumber: poDocNumber });
    },
  );
}
