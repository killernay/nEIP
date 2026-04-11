/**
 * Credit Note routes (ใบลดหนี้ / CN):
 *   POST /api/v1/credit-notes            — create referencing original invoice
 *   GET  /api/v1/credit-notes            — list
 *   GET  /api/v1/credit-notes/:id        — detail
 *   POST /api/v1/credit-notes/:id/issue  — draft → issued (creates reversing JE)
 *   POST /api/v1/credit-notes/:id/void   — void
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ConflictError, ValidationError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import {
  AR_CN_CREATE,
  AR_CN_READ,
  AR_CN_ISSUE,
  AR_CN_VOID,
} from '../../lib/permissions.js';
import { nextDocNumber } from '@neip/core';

// ---------------------------------------------------------------------------
// JSON Schemas
// ---------------------------------------------------------------------------

const cnLineSchema = {
  type: 'object',
  required: ['description', 'quantity', 'unitPriceSatang'],
  additionalProperties: false,
  properties: {
    description: { type: 'string', minLength: 1, maxLength: 500 },
    quantity: { type: 'number', minimum: 0.01 },
    unitPriceSatang: { type: 'string', description: 'Unit price in satang' },
    accountId: { type: 'string' },
  },
} as const;

const createCnBodySchema = {
  type: 'object',
  required: ['invoiceId', 'customerId', 'customerName', 'reason', 'lines'],
  additionalProperties: false,
  properties: {
    invoiceId: { type: 'string' },
    customerId: { type: 'string' },
    customerName: { type: 'string', minLength: 1, maxLength: 255 },
    reason: { type: 'string', minLength: 1, maxLength: 500 },
    notes: { type: 'string', maxLength: 2000 },
    lines: { type: 'array', minItems: 1, items: cnLineSchema },
  },
} as const;

const cnResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    documentNumber: { type: 'string' },
    invoiceId: { type: 'string' },
    customerId: { type: 'string' },
    customerName: { type: 'string' },
    reason: { type: 'string' },
    totalSatang: { type: 'string' },
    status: { type: 'string', enum: ['draft', 'issued', 'voided'] },
    notes: { type: 'string', nullable: true },
    issuedAt: { type: 'string', nullable: true },
    voidedAt: { type: 'string', nullable: true },
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
    status: { type: 'string', enum: ['draft', 'issued', 'voided'] },
    customerId: { type: 'string' },
    invoiceId: { type: 'string' },
  },
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateCnBody {
  invoiceId: string;
  customerId: string;
  customerName: string;
  reason: string;
  notes?: string;
  lines: Array<{
    description: string;
    quantity: number;
    unitPriceSatang: string;
    accountId?: string;
  }>;
}

interface CnListQuery {
  limit?: number;
  offset?: number;
  status?: string;
  customerId?: string;
  invoiceId?: string;
}

interface IdParams {
  id: string;
}

interface CnRow {
  id: string;
  document_number: string;
  invoice_id: string;
  customer_id: string;
  customer_name: string;
  reason: string;
  total_satang: bigint;
  status: string;
  notes: string | null;
  tenant_id: string;
  created_by: string;
  issued_at: Date | string | null;
  voided_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface CnLineRow {
  id: string;
  credit_note_id: string;
  description: string;
  quantity: number;
  unit_price_satang: bigint;
  amount_satang: bigint;
  account_id: string | null;
}

interface CountRow {
  count: string;
}

function mapCn(r: CnRow, lines: CnLineRow[] = []) {
  return {
    id: r.id,
    documentNumber: r.document_number,
    invoiceId: r.invoice_id,
    customerId: r.customer_id,
    customerName: r.customer_name,
    reason: r.reason,
    totalSatang: r.total_satang.toString(),
    status: r.status,
    notes: r.notes,
    issuedAt: r.issued_at ? toISO(r.issued_at) : null,
    voidedAt: r.voided_at ? toISO(r.voided_at) : null,
    lines: lines.map((l) => ({
      id: l.id,
      description: l.description,
      quantity: l.quantity,
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

export async function creditNoteRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  // -------------------------------------------------------------------------
  // POST /api/v1/credit-notes — create
  // -------------------------------------------------------------------------
  fastify.post<{ Body: CreateCnBody }>(
    `${API_V1_PREFIX}/credit-notes`,
    {
      schema: {
        description: 'Create a credit note (ใบลดหนี้) referencing an invoice',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        body: createCnBodySchema,
        response: { 201: { description: 'Credit note created', ...cnResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AR_CN_CREATE)],
    },
    async (request, reply) => {
      const { invoiceId, customerId, customerName, reason, notes, lines } = request.body;
      const { tenantId, sub: userId } = request.user;

      // Validate invoice exists and is not voided (CN-005)
      interface InvoiceRow { id: string; status: string; total_satang: bigint; }
      const invRows = await fastify.sql<[InvoiceRow?]>`
        SELECT id, status, total_satang FROM invoices WHERE id = ${invoiceId} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!invRows[0]) throw new NotFoundError({ detail: `Invoice ${invoiceId} not found.` });
      if (invRows[0].status === 'voided' || invRows[0].status === 'void') {
        throw new ConflictError({ detail: `Cannot create credit note for voided invoice ${invoiceId}.` });
      }

      let totalSatang = 0n;
      const processedLines = lines.map((line) => {
        const qty = BigInt(Math.round(line.quantity * 10000));
        const price = BigInt(line.unitPriceSatang);
        const amount = qty * price / 10000n;
        totalSatang += amount;
        return { id: crypto.randomUUID(), ...line, amountSatang: amount.toString() };
      });

      // CN-004: validate CN total does not exceed invoice total
      const invoiceTotalSatang = BigInt(invRows[0].total_satang);
      if (totalSatang > invoiceTotalSatang) {
        throw new ValidationError({
          detail: `Credit note amount ${totalSatang.toString()} satang exceeds invoice total ${invoiceTotalSatang.toString()} satang.`,
        });
      }

      const cnId = crypto.randomUUID();
      const documentNumber = await nextDocNumber(fastify.sql, tenantId, 'credit_note', new Date().getFullYear());

      await fastify.sql`
        INSERT INTO credit_notes (id, document_number, invoice_id, customer_id, customer_name, reason, total_satang, status, notes, tenant_id, created_by)
        VALUES (${cnId}, ${documentNumber}, ${invoiceId}, ${customerId}, ${customerName},
                ${reason}, ${totalSatang.toString()}::bigint, 'draft', ${notes ?? null}, ${tenantId}, ${userId})
      `;

      for (const line of processedLines) {
        await fastify.sql`
          INSERT INTO credit_note_lines (id, credit_note_id, description, quantity, unit_price_satang, amount_satang, account_id)
          VALUES (${line.id}, ${cnId}, ${line.description}, ${line.quantity},
                  ${line.unitPriceSatang}::bigint, ${line.amountSatang}::bigint, ${line.accountId ?? null})
        `;
      }

      request.log.info({ cnId, documentNumber, invoiceId, tenantId }, 'Credit note created');

      return reply.status(201).send({
        id: cnId, documentNumber, invoiceId, customerId, customerName, reason,
        totalSatang: totalSatang.toString(), status: 'draft', notes: notes ?? null,
        issuedAt: null, voidedAt: null,
        lines: processedLines.map((l) => ({
          id: l.id, description: l.description, quantity: l.quantity,
          unitPriceSatang: l.unitPriceSatang, amountSatang: l.amountSatang, accountId: l.accountId ?? null,
        })),
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/credit-notes — list
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: CnListQuery }>(
    `${API_V1_PREFIX}/credit-notes`,
    {
      schema: {
        description: 'List credit notes',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        querystring: listQuerySchema,
        response: {
          200: {
            type: 'object',
            properties: {
              items: { type: 'array', items: cnResponseSchema },
              total: { type: 'integer' },
              limit: { type: 'integer' },
              offset: { type: 'integer' },
              hasMore: { type: 'boolean' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(AR_CN_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const limit = request.query.limit ?? 20;
      const offset = request.query.offset ?? 0;
      const { status, customerId, invoiceId } = request.query;

      let countRows: CountRow[];
      let rows: CnRow[];

      if (status !== undefined) {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM credit_notes WHERE tenant_id = ${tenantId} AND status = ${status}`;
        rows = await fastify.sql<CnRow[]>`SELECT * FROM credit_notes WHERE tenant_id = ${tenantId} AND status = ${status} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      } else if (customerId !== undefined) {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM credit_notes WHERE tenant_id = ${tenantId} AND customer_id = ${customerId}`;
        rows = await fastify.sql<CnRow[]>`SELECT * FROM credit_notes WHERE tenant_id = ${tenantId} AND customer_id = ${customerId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      } else if (invoiceId !== undefined) {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM credit_notes WHERE tenant_id = ${tenantId} AND invoice_id = ${invoiceId}`;
        rows = await fastify.sql<CnRow[]>`SELECT * FROM credit_notes WHERE tenant_id = ${tenantId} AND invoice_id = ${invoiceId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      } else {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM credit_notes WHERE tenant_id = ${tenantId}`;
        rows = await fastify.sql<CnRow[]>`SELECT * FROM credit_notes WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      }

      const total = parseInt(countRows[0]?.count ?? '0', 10);
      return reply.status(200).send({ items: rows.map((r) => mapCn(r)), total, limit, offset, hasMore: offset + limit < total });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/credit-notes/:id — detail
  // -------------------------------------------------------------------------
  fastify.get<{ Params: IdParams }>(
    `${API_V1_PREFIX}/credit-notes/:id`,
    {
      schema: {
        description: 'Get credit note details',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: { 200: { ...cnResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AR_CN_READ)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const rows = await fastify.sql<[CnRow?]>`
        SELECT * FROM credit_notes WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      const cn = rows[0];
      if (!cn) throw new NotFoundError({ detail: `Credit note ${id} not found.` });

      const lines = await fastify.sql<CnLineRow[]>`
        SELECT * FROM credit_note_lines WHERE credit_note_id = ${id}
      `;

      return reply.status(200).send(mapCn(cn, lines));
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/credit-notes/:id/issue — issue (draft → issued)
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/credit-notes/:id/issue`,
    {
      schema: {
        description: 'Issue a credit note (creates reversing journal entry)',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: { 200: { ...cnResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AR_CN_ISSUE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const rows = await fastify.sql<[CnRow?]>`
        UPDATE credit_notes
        SET status = 'issued', issued_at = NOW(), updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'draft'
        RETURNING *
      `;
      const cn = rows[0];
      if (!cn) {
        const existing = await fastify.sql<[{ id: string; status: string }?]>`
          SELECT id, status FROM credit_notes WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
        `;
        if (!existing[0]) throw new NotFoundError({ detail: `Credit note ${id} not found.` });
        throw new ConflictError({ detail: `Credit note ${id} cannot be issued — current status is "${existing[0].status}".` });
      }

      request.log.info({ cnId: id, tenantId }, 'Credit note issued');
      return reply.status(200).send(mapCn(cn));
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/credit-notes/:id/void — void
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/credit-notes/:id/void`,
    {
      schema: {
        description: 'Void a credit note',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: { 200: { ...cnResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AR_CN_VOID)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const rows = await fastify.sql<[CnRow?]>`
        UPDATE credit_notes
        SET status = 'voided', voided_at = NOW(), updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status IN ('draft', 'issued')
        RETURNING *
      `;
      const cn = rows[0];
      if (!cn) {
        const existing = await fastify.sql<[{ id: string; status: string }?]>`
          SELECT id, status FROM credit_notes WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
        `;
        if (!existing[0]) throw new NotFoundError({ detail: `Credit note ${id} not found.` });
        throw new ConflictError({ detail: `Credit note ${id} cannot be voided — current status is "${existing[0].status}".` });
      }

      request.log.info({ cnId: id, tenantId }, 'Credit note voided');
      return reply.status(200).send(mapCn(cn));
    },
  );
}
