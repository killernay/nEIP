/**
 * Service Procurement routes (Service Entry Sheets):
 *   POST /api/v1/service-entry-sheets                      — create
 *   GET  /api/v1/service-entry-sheets                      — list
 *   GET  /api/v1/service-entry-sheets/:id                  — detail
 *   PUT  /api/v1/service-entry-sheets/:id                  — update draft
 *   POST /api/v1/service-entry-sheets/:id/submit           — draft → submitted
 *   POST /api/v1/service-entry-sheets/:id/approve          — submitted → approved
 *   POST /api/v1/service-entry-sheets/:id/reject           — submitted → rejected
 *   POST /api/v1/service-entry-sheets/:id/convert-to-bill  — approved → billed
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ConflictError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import {
  AP_SERVICE_CREATE, AP_SERVICE_READ, AP_SERVICE_UPDATE, AP_SERVICE_APPROVE,
} from '../../lib/permissions.js';
import { nextDocNumber } from '@neip/core';

// ---------------------------------------------------------------------------
// Row interface
// ---------------------------------------------------------------------------

interface SesRow {
  id: string; document_number: string; purchase_order_id: string | null;
  vendor_id: string; service_description: string; service_date: string;
  amount_satang: string; status: string;
  approved_by: string | null; approved_at: Date | string | null;
  bill_id: string | null; tenant_id: string;
  created_by: string | null; created_at: Date | string;
}

interface CountRow { count: string; }

function mapSes(r: SesRow) {
  return {
    id: r.id, documentNumber: r.document_number,
    purchaseOrderId: r.purchase_order_id, vendorId: r.vendor_id,
    serviceDescription: r.service_description, serviceDate: r.service_date,
    amountSatang: r.amount_satang?.toString() ?? '0', status: r.status,
    approvedBy: r.approved_by, approvedAt: r.approved_at ? toISO(r.approved_at) : null,
    billId: r.bill_id, createdBy: r.created_by,
    createdAt: toISO(r.created_at),
  };
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export async function serviceRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  fastify.post(
    `${API_V1_PREFIX}/service-entry-sheets`,
    { preHandler: [requireAuth, requirePermission(AP_SERVICE_CREATE)] },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user;
      const b = request.body as {
        vendorId: string; serviceDescription: string; serviceDate: string;
        amountSatang: string; purchaseOrderId?: string;
      };
      const vendorRows = await fastify.sql`SELECT id FROM vendors WHERE id = ${b.vendorId} AND tenant_id = ${tenantId}`;
      if (!vendorRows[0]) throw new NotFoundError({ detail: 'Vendor not found' });

      const docNum = await nextDocNumber(fastify.sql, tenantId, 'service_entry_sheet', new Date().getFullYear());
      const rows = await fastify.sql<SesRow[]>`
        INSERT INTO service_entry_sheets (document_number, purchase_order_id, vendor_id,
          service_description, service_date, amount_satang, tenant_id, created_by)
        VALUES (${docNum}, ${b.purchaseOrderId ?? null}, ${b.vendorId},
          ${b.serviceDescription}, ${b.serviceDate}, ${b.amountSatang}::bigint,
          ${tenantId}, ${userId})
        RETURNING *`;
      return reply.status(201).send(mapSes(rows[0]!));
    },
  );

  fastify.get(
    `${API_V1_PREFIX}/service-entry-sheets`,
    { preHandler: [requireAuth, requirePermission(AP_SERVICE_READ)] },
    async (request) => {
      const { tenantId } = request.user;
      const q = request.query as { status?: string; vendorId?: string; limit?: string; offset?: string };
      const limit = Math.min(Number(q.limit) || 50, 200);
      const offset = Number(q.offset) || 0;
      const conditions: string[] = [];
      if (q.status) conditions.push(`status = '${q.status}'`);
      if (q.vendorId) conditions.push(`vendor_id = '${q.vendorId}'`);
      const where = conditions.length ? `AND ${conditions.join(' AND ')}` : '';

      const rows = await fastify.sql<SesRow[]>`
        SELECT * FROM service_entry_sheets WHERE tenant_id = ${tenantId}
        ${fastify.sql.unsafe(where)} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      const countRows = await fastify.sql<CountRow[]>`
        SELECT count(*)::text AS count FROM service_entry_sheets WHERE tenant_id = ${tenantId}
        ${fastify.sql.unsafe(where)}`;
      return { data: rows.map(mapSes), total: Number(countRows[0]!.count) };
    },
  );

  fastify.get(
    `${API_V1_PREFIX}/service-entry-sheets/:id`,
    { preHandler: [requireAuth, requirePermission(AP_SERVICE_READ)] },
    async (request) => {
      const { tenantId } = request.user;
      const { id } = request.params as { id: string };
      const rows = await fastify.sql<SesRow[]>`
        SELECT * FROM service_entry_sheets WHERE id = ${id} AND tenant_id = ${tenantId}`;
      if (!rows[0]) throw new NotFoundError({ detail: 'Service entry sheet not found' });
      return mapSes(rows[0]);
    },
  );

  fastify.put(
    `${API_V1_PREFIX}/service-entry-sheets/:id`,
    { preHandler: [requireAuth, requirePermission(AP_SERVICE_UPDATE)] },
    async (request) => {
      const { tenantId } = request.user;
      const { id } = request.params as { id: string };
      const b = request.body as Partial<{
        serviceDescription: string; serviceDate: string; amountSatang: string;
        purchaseOrderId: string;
      }>;
      const rows = await fastify.sql<SesRow[]>`
        UPDATE service_entry_sheets SET
          service_description = COALESCE(${b.serviceDescription ?? null}, service_description),
          service_date = COALESCE(${b.serviceDate ?? null}::date, service_date),
          amount_satang = COALESCE(${b.amountSatang ?? null}::bigint, amount_satang),
          purchase_order_id = COALESCE(${b.purchaseOrderId ?? null}, purchase_order_id)
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'draft' RETURNING *`;
      if (!rows[0]) throw new NotFoundError({ detail: 'SES not found or not in draft status' });
      return mapSes(rows[0]);
    },
  );

  fastify.post(
    `${API_V1_PREFIX}/service-entry-sheets/:id/submit`,
    { preHandler: [requireAuth, requirePermission(AP_SERVICE_UPDATE)] },
    async (request) => {
      const { tenantId } = request.user;
      const { id } = request.params as { id: string };
      const rows = await fastify.sql<SesRow[]>`
        UPDATE service_entry_sheets SET status = 'submitted'
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'draft' RETURNING *`;
      if (!rows[0]) throw new ConflictError({ detail: 'SES must be in draft status to submit' });
      return mapSes(rows[0]);
    },
  );

  fastify.post(
    `${API_V1_PREFIX}/service-entry-sheets/:id/approve`,
    { preHandler: [requireAuth, requirePermission(AP_SERVICE_APPROVE)] },
    async (request) => {
      const { tenantId, sub: userId } = request.user;
      const { id } = request.params as { id: string };
      const rows = await fastify.sql<SesRow[]>`
        UPDATE service_entry_sheets SET status = 'approved', approved_by = ${userId}, approved_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'submitted' RETURNING *`;
      if (!rows[0]) throw new ConflictError({ detail: 'SES must be in submitted status to approve' });
      return mapSes(rows[0]);
    },
  );

  fastify.post(
    `${API_V1_PREFIX}/service-entry-sheets/:id/reject`,
    { preHandler: [requireAuth, requirePermission(AP_SERVICE_APPROVE)] },
    async (request) => {
      const { tenantId } = request.user;
      const { id } = request.params as { id: string };
      const rows = await fastify.sql<SesRow[]>`
        UPDATE service_entry_sheets SET status = 'rejected'
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'submitted' RETURNING *`;
      if (!rows[0]) throw new ConflictError({ detail: 'SES must be in submitted status to reject' });
      return mapSes(rows[0]);
    },
  );

  fastify.post(
    `${API_V1_PREFIX}/service-entry-sheets/:id/convert-to-bill`,
    { preHandler: [requireAuth, requirePermission(AP_SERVICE_APPROVE)] },
    async (request) => {
      const { tenantId, sub: userId } = request.user;
      const { id } = request.params as { id: string };

      const sesRows = await fastify.sql<SesRow[]>`
        SELECT * FROM service_entry_sheets WHERE id = ${id} AND tenant_id = ${tenantId}`;
      const ses = sesRows[0];
      if (!ses) throw new NotFoundError({ detail: 'Service entry sheet not found' });
      if (ses.status !== 'approved') throw new ConflictError({ detail: 'SES must be approved to convert to bill' });

      const billDocNum = await nextDocNumber(fastify.sql, tenantId, 'bill', new Date().getFullYear());
      const billRows = await fastify.sql<{ id: string }[]>`
        INSERT INTO bills (document_number, vendor_id, bill_date, due_date,
          total_satang, status, tenant_id, created_by)
        VALUES (${billDocNum}, ${ses.vendor_id}, ${ses.service_date},
          ${ses.service_date}::date + 30,
          ${ses.amount_satang}::bigint, 'draft', ${tenantId}, ${userId})
        RETURNING id`;
      const bill = billRows[0]!;

      await fastify.sql`
        INSERT INTO bill_lines (bill_id, line_number, description, quantity, unit_price_satang, amount_satang, tenant_id)
        VALUES (${bill.id}, 1, ${ses.service_description}, 1, ${ses.amount_satang}::bigint, ${ses.amount_satang}::bigint, ${tenantId})`;

      const updatedRows = await fastify.sql<SesRow[]>`
        UPDATE service_entry_sheets SET status = 'billed', bill_id = ${bill.id}
        WHERE id = ${id} RETURNING *`;

      return { ...mapSes(updatedRows[0]!), billId: bill.id };
    },
  );
}
