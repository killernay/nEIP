/**
 * Quotation routes (ใบเสนอราคา):
 *
 *   POST /api/v1/quotations              — create quotation with lines
 *   GET  /api/v1/quotations              — list with filters
 *   GET  /api/v1/quotations/:id          — get detail with lines
 *   PUT  /api/v1/quotations/:id          — update draft quotation
 *   POST /api/v1/quotations/:id/send     — draft → sent
 *   POST /api/v1/quotations/:id/approve  — sent  → approved
 *   POST /api/v1/quotations/:id/reject   — sent  → rejected
 *   POST /api/v1/quotations/:id/convert           — approved → converted (creates invoice, shortcut)
 *   POST /api/v1/quotations/:id/convert-to-order  — approved → converted (creates sales order)
 *   POST /api/v1/quotations/:id/duplicate          — clone as new draft
 *
 * Business flows:
 *   Standard: QT → SO → DO → INV → PAY (SAP-style)
 *   Shortcut: QT → INV (direct conversion, kept for convenience)
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ConflictError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import {
  AR_QUOTATION_CREATE,
  AR_QUOTATION_READ,
  AR_QUOTATION_UPDATE,
  AR_QUOTATION_SEND,
  AR_QUOTATION_APPROVE,
  AR_QUOTATION_CONVERT,
  AR_SO_CREATE,
} from '../../lib/permissions.js';
import { nextDocNumber } from '@neip/core';

// ---------------------------------------------------------------------------
// JSON Schemas
// ---------------------------------------------------------------------------

const quotationLineSchema = {
  type: 'object',
  required: ['description', 'quantity', 'unitPriceSatang'],
  additionalProperties: false,
  properties: {
    description: { type: 'string', minLength: 1, maxLength: 500 },
    quantity: { type: 'integer', minimum: 1 },
    unitPriceSatang: { type: 'string', description: 'Unit price in satang (as string)' },
    accountId: { type: 'string', description: 'Revenue account ID' },
  },
} as const;

const createQuotationBodySchema = {
  type: 'object',
  required: ['customerId', 'customerName', 'subject', 'validUntil', 'lines'],
  additionalProperties: false,
  properties: {
    customerId: { type: 'string', minLength: 1 },
    customerName: { type: 'string', minLength: 1, maxLength: 200 },
    subject: { type: 'string', minLength: 1, maxLength: 500 },
    notes: { type: 'string', maxLength: 2000 },
    validUntil: { type: 'string', format: 'date', description: 'Valid until date (YYYY-MM-DD)' },
    lines: {
      type: 'array',
      minItems: 1,
      items: quotationLineSchema,
    },
  },
} as const;

const updateQuotationBodySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    customerName: { type: 'string', minLength: 1, maxLength: 200 },
    subject: { type: 'string', minLength: 1, maxLength: 500 },
    notes: { type: 'string', maxLength: 2000 },
    validUntil: { type: 'string', format: 'date' },
    lines: {
      type: 'array',
      minItems: 1,
      items: quotationLineSchema,
    },
  },
} as const;

const rejectBodySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    reason: { type: 'string', maxLength: 1000 },
  },
} as const;

const listQuerySchema = {
  type: 'object',
  properties: {
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    offset: { type: 'integer', minimum: 0, default: 0 },
    status: {
      type: 'string',
      enum: ['draft', 'sent', 'approved', 'rejected', 'converted', 'expired'],
    },
    customerId: { type: 'string' },
  },
} as const;

const quotationResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    documentNumber: { type: 'string' },
    customerId: { type: 'string' },
    customerName: { type: 'string' },
    subject: { type: 'string' },
    notes: { type: 'string', nullable: true },
    status: {
      type: 'string',
      enum: ['draft', 'sent', 'approved', 'rejected', 'converted', 'expired'],
    },
    validUntil: { type: 'string', format: 'date' },
    totalSatang: { type: 'string' },
    convertedInvoiceId: { type: 'string', nullable: true },
    convertedSalesOrderId: { type: 'string', nullable: true },
    lines: { type: 'array', items: { type: 'object' } },
    sentAt: { type: 'string', nullable: true },
    approvedAt: { type: 'string', nullable: true },
    rejectedAt: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuotationLineInput {
  description: string;
  quantity: number;
  unitPriceSatang: string;
  accountId?: string;
}

interface CreateQuotationBody {
  customerId: string;
  customerName: string;
  subject: string;
  notes?: string;
  validUntil: string;
  lines: QuotationLineInput[];
}

interface UpdateQuotationBody {
  customerName?: string;
  subject?: string;
  notes?: string;
  validUntil?: string;
  lines?: QuotationLineInput[];
}

interface RejectBody {
  reason?: string;
}

interface QuotationListQuery {
  limit?: number;
  offset?: number;
  status?: string;
  customerId?: string;
}

interface IdParams {
  id: string;
}

interface QuotationRow {
  id: string;
  document_number: string;
  customer_id: string;
  customer_name: string;
  subject: string;
  notes: string | null;
  status: string;
  valid_until: string;
  total_satang: bigint;
  converted_invoice_id: string | null;
  converted_sales_order_id: string | null;
  tenant_id: string;
  created_by: string;
  sent_at: Date | string | null;
  approved_at: Date | string | null;
  rejected_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface QuotationLineRow {
  id: string;
  quotation_id: string;
  line_number: number;
  description: string;
  quantity: number;
  unit_price_satang: bigint;
  amount_satang: bigint;
  account_id: string | null;
}

interface CountRow {
  count: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a formatted quotation response object */
function formatQuotation(
  q: QuotationRow,
  lines: QuotationLineRow[],
): Record<string, unknown> {
  return {
    id: q.id,
    documentNumber: q.document_number,
    customerId: q.customer_id,
    customerName: q.customer_name,
    subject: q.subject,
    notes: q.notes,
    status: q.status,
    validUntil: q.valid_until,
    totalSatang: q.total_satang.toString(),
    convertedInvoiceId: q.converted_invoice_id,
    convertedSalesOrderId: q.converted_sales_order_id,
    lines: lines.map((l) => ({
      id: l.id,
      lineNumber: l.line_number,
      description: l.description,
      quantity: l.quantity,
      unitPriceSatang: l.unit_price_satang.toString(),
      amountSatang: l.amount_satang.toString(),
      accountId: l.account_id,
    })),
    sentAt: q.sent_at ? toISO(q.sent_at) : null,
    approvedAt: q.approved_at ? toISO(q.approved_at) : null,
    rejectedAt: q.rejected_at ? toISO(q.rejected_at) : null,
    createdAt: toISO(q.created_at),
    updatedAt: toISO(q.updated_at),
  };
}

/** Process line inputs and calculate total */
function processLines(lines: QuotationLineInput[]): {
  processedLines: Array<{
    id: string;
    lineNumber: number;
    description: string;
    quantity: number;
    unitPriceSatang: bigint;
    amountSatang: bigint;
    accountId: string | null;
  }>;
  totalSatang: bigint;
} {
  let totalSatang = 0n;
  const processedLines = lines.map((line, index) => {
    const unitPrice = BigInt(line.unitPriceSatang);
    const qty = BigInt(line.quantity);
    const amountSatang = unitPrice * qty;
    totalSatang += amountSatang;
    return {
      id: crypto.randomUUID(),
      lineNumber: index + 1,
      description: line.description,
      quantity: line.quantity,
      unitPriceSatang: unitPrice,
      amountSatang,
      accountId: line.accountId ?? null,
    };
  });
  return { processedLines, totalSatang };
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export async function quotationRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  // -------------------------------------------------------------------------
  // POST /api/v1/quotations — create quotation
  // -------------------------------------------------------------------------
  fastify.post<{ Body: CreateQuotationBody }>(
    `${API_V1_PREFIX}/quotations`,
    {
      schema: {
        description: 'Create a new quotation (ใบเสนอราคา)',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        body: createQuotationBodySchema,
        response: { 201: { description: 'Quotation created', ...quotationResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AR_QUOTATION_CREATE)],
    },
    async (request, reply) => {
      const { customerId, customerName, subject, notes, validUntil, lines } = request.body;
      const { tenantId, sub: userId } = request.user;

      const { processedLines, totalSatang } = processLines(lines);
      const quotationId = crypto.randomUUID();
      const documentNumber = await nextDocNumber(fastify.sql, tenantId, 'quotation', new Date().getFullYear());

      await fastify.sql`
        INSERT INTO quotations (
          id, document_number, customer_id, customer_name, subject, notes,
          status, valid_until, total_satang, tenant_id, created_by
        ) VALUES (
          ${quotationId}, ${documentNumber}, ${customerId}, ${customerName},
          ${subject}, ${notes ?? null}, 'draft', ${validUntil},
          ${totalSatang.toString()}::bigint, ${tenantId}, ${userId}
        )
      `;

      for (const line of processedLines) {
        await fastify.sql`
          INSERT INTO quotation_lines (
            id, quotation_id, line_number, description, quantity,
            unit_price_satang, amount_satang, account_id
          ) VALUES (
            ${line.id}, ${quotationId}, ${line.lineNumber}, ${line.description},
            ${line.quantity}, ${line.unitPriceSatang.toString()}::bigint,
            ${line.amountSatang.toString()}::bigint, ${line.accountId}
          )
        `;
      }

      request.log.info(
        { quotationId, documentNumber, customerId, tenantId, userId },
        'Quotation created',
      );

      const lineRows: QuotationLineRow[] = processedLines.map((l) => ({
        id: l.id,
        quotation_id: quotationId,
        line_number: l.lineNumber,
        description: l.description,
        quantity: l.quantity,
        unit_price_satang: l.unitPriceSatang,
        amount_satang: l.amountSatang,
        account_id: l.accountId,
      }));

      const fakeRow: QuotationRow = {
        id: quotationId,
        document_number: documentNumber,
        customer_id: customerId,
        customer_name: customerName,
        subject,
        notes: notes ?? null,
        status: 'draft',
        valid_until: validUntil,
        total_satang: totalSatang,
        converted_invoice_id: null,
        converted_sales_order_id: null,
        tenant_id: tenantId,
        created_by: userId,
        sent_at: null,
        approved_at: null,
        rejected_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      return reply.status(201).send(formatQuotation(fakeRow, lineRows));
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/quotations — list quotations
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: QuotationListQuery }>(
    `${API_V1_PREFIX}/quotations`,
    {
      schema: {
        description: 'List quotations with pagination and filtering',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        querystring: listQuerySchema,
        response: {
          200: {
            type: 'object',
            properties: {
              items: { type: 'array', items: quotationResponseSchema },
              total: { type: 'integer' },
              limit: { type: 'integer' },
              offset: { type: 'integer' },
              hasMore: { type: 'boolean' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(AR_QUOTATION_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const limit = request.query.limit ?? 20;
      const offset = request.query.offset ?? 0;
      const { status, customerId } = request.query;

      let countRows: CountRow[];
      let quotationRows: QuotationRow[];

      if (status !== undefined && customerId !== undefined) {
        countRows = await fastify.sql<CountRow[]>`
          SELECT COUNT(*)::text AS count FROM quotations
          WHERE tenant_id = ${tenantId} AND status = ${status} AND customer_id = ${customerId}
        `;
        quotationRows = await fastify.sql<QuotationRow[]>`
          SELECT * FROM quotations
          WHERE tenant_id = ${tenantId} AND status = ${status} AND customer_id = ${customerId}
          ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
      } else if (status !== undefined) {
        countRows = await fastify.sql<CountRow[]>`
          SELECT COUNT(*)::text AS count FROM quotations
          WHERE tenant_id = ${tenantId} AND status = ${status}
        `;
        quotationRows = await fastify.sql<QuotationRow[]>`
          SELECT * FROM quotations WHERE tenant_id = ${tenantId} AND status = ${status}
          ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
      } else if (customerId !== undefined) {
        countRows = await fastify.sql<CountRow[]>`
          SELECT COUNT(*)::text AS count FROM quotations
          WHERE tenant_id = ${tenantId} AND customer_id = ${customerId}
        `;
        quotationRows = await fastify.sql<QuotationRow[]>`
          SELECT * FROM quotations WHERE tenant_id = ${tenantId} AND customer_id = ${customerId}
          ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        countRows = await fastify.sql<CountRow[]>`
          SELECT COUNT(*)::text AS count FROM quotations WHERE tenant_id = ${tenantId}
        `;
        quotationRows = await fastify.sql<QuotationRow[]>`
          SELECT * FROM quotations WHERE tenant_id = ${tenantId}
          ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
      }

      const total = parseInt(countRows[0]?.count ?? '0', 10);
      const items = quotationRows.map((q) => formatQuotation(q, []));

      return reply.status(200).send({ items, total, limit, offset, hasMore: offset + limit < total });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/quotations/:id — get detail with lines
  // -------------------------------------------------------------------------
  fastify.get<{ Params: IdParams }>(
    `${API_V1_PREFIX}/quotations/:id`,
    {
      schema: {
        description: 'Get quotation details by ID',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: { 200: { description: 'Quotation details', ...quotationResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AR_QUOTATION_READ)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const rows = await fastify.sql<[QuotationRow?]>`
        SELECT * FROM quotations WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      const q = rows[0];
      if (!q) {
        throw new NotFoundError({ detail: `Quotation ${id} not found.` });
      }

      const lines = await fastify.sql<QuotationLineRow[]>`
        SELECT * FROM quotation_lines WHERE quotation_id = ${id} ORDER BY line_number
      `;

      return reply.status(200).send(formatQuotation(q, lines));
    },
  );

  // -------------------------------------------------------------------------
  // PUT /api/v1/quotations/:id — update draft quotation
  // -------------------------------------------------------------------------
  fastify.put<{ Params: IdParams; Body: UpdateQuotationBody }>(
    `${API_V1_PREFIX}/quotations/:id`,
    {
      schema: {
        description: 'Update a draft quotation',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: updateQuotationBodySchema,
        response: { 200: { description: 'Quotation updated', ...quotationResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AR_QUOTATION_UPDATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;
      const { customerName, subject, notes, validUntil, lines } = request.body;

      // Verify exists and is a draft
      const existing = await fastify.sql<[QuotationRow?]>`
        SELECT * FROM quotations WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      const q = existing[0];
      if (!q) {
        throw new NotFoundError({ detail: `Quotation ${id} not found.` });
      }
      if (q.status !== 'draft') {
        throw new ConflictError({
          detail: `Only draft quotations can be updated. Current status: "${q.status}".`,
        });
      }

      // Build dynamic update — only fields provided
      const newCustomerName = customerName ?? q.customer_name;
      const newSubject = subject ?? q.subject;
      const newNotes = notes !== undefined ? notes : q.notes;
      const newValidUntil = validUntil ?? q.valid_until;

      if (lines !== undefined) {
        const { processedLines, totalSatang } = processLines(lines);

        // Replace lines
        await fastify.sql`DELETE FROM quotation_lines WHERE quotation_id = ${id}`;
        for (const line of processedLines) {
          await fastify.sql`
            INSERT INTO quotation_lines (
              id, quotation_id, line_number, description, quantity,
              unit_price_satang, amount_satang, account_id
            ) VALUES (
              ${line.id}, ${id}, ${line.lineNumber}, ${line.description},
              ${line.quantity}, ${line.unitPriceSatang.toString()}::bigint,
              ${line.amountSatang.toString()}::bigint, ${line.accountId}
            )
          `;
        }

        await fastify.sql`
          UPDATE quotations
          SET customer_name = ${newCustomerName}, subject = ${newSubject},
              notes = ${newNotes}, valid_until = ${newValidUntil},
              total_satang = ${totalSatang.toString()}::bigint, updated_at = NOW()
          WHERE id = ${id} AND tenant_id = ${tenantId}
        `;
      } else {
        await fastify.sql`
          UPDATE quotations
          SET customer_name = ${newCustomerName}, subject = ${newSubject},
              notes = ${newNotes}, valid_until = ${newValidUntil}, updated_at = NOW()
          WHERE id = ${id} AND tenant_id = ${tenantId}
        `;
      }

      const updatedRows = await fastify.sql<[QuotationRow?]>`
        SELECT * FROM quotations WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      const updated = updatedRows[0];
      if (!updated) {
        throw new NotFoundError({ detail: `Quotation ${id} not found after update.` });
      }
      const updatedLines = await fastify.sql<QuotationLineRow[]>`
        SELECT * FROM quotation_lines WHERE quotation_id = ${id} ORDER BY line_number
      `;

      return reply.status(200).send(formatQuotation(updated, updatedLines));
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/quotations/:id/send — draft → sent
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/quotations/:id/send`,
    {
      schema: {
        description: 'Mark quotation as sent to customer (draft → sent)',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: { 200: { description: 'Quotation sent', ...quotationResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AR_QUOTATION_SEND)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const rows = await fastify.sql<[QuotationRow?]>`
        UPDATE quotations
        SET status = 'sent', sent_at = NOW(), updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'draft'
        RETURNING *
      `;
      const q = rows[0];
      if (!q) {
        const existing = await fastify.sql<[{ id: string; status: string }?]>`
          SELECT id, status FROM quotations WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
        `;
        if (!existing[0]) {
          throw new NotFoundError({ detail: `Quotation ${id} not found.` });
        }
        throw new ConflictError({
          detail: `Quotation ${id} cannot be sent — current status is "${existing[0].status}". Only draft quotations can be sent.`,
        });
      }

      request.log.info({ quotationId: id, tenantId }, 'Quotation sent');

      const lines = await fastify.sql<QuotationLineRow[]>`
        SELECT * FROM quotation_lines WHERE quotation_id = ${id} ORDER BY line_number
      `;
      return reply.status(200).send(formatQuotation(q, lines));
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/quotations/:id/approve — sent → approved
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/quotations/:id/approve`,
    {
      schema: {
        description: 'Mark quotation as approved by customer (sent → approved)',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: { 200: { description: 'Quotation approved', ...quotationResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AR_QUOTATION_APPROVE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const rows = await fastify.sql<[QuotationRow?]>`
        UPDATE quotations
        SET status = 'approved', approved_at = NOW(), updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'sent'
        RETURNING *
      `;
      const q = rows[0];
      if (!q) {
        const existing = await fastify.sql<[{ id: string; status: string }?]>`
          SELECT id, status FROM quotations WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
        `;
        if (!existing[0]) {
          throw new NotFoundError({ detail: `Quotation ${id} not found.` });
        }
        throw new ConflictError({
          detail: `Quotation ${id} cannot be approved — current status is "${existing[0].status}". Only sent quotations can be approved.`,
        });
      }

      request.log.info({ quotationId: id, tenantId }, 'Quotation approved');

      const lines = await fastify.sql<QuotationLineRow[]>`
        SELECT * FROM quotation_lines WHERE quotation_id = ${id} ORDER BY line_number
      `;
      return reply.status(200).send(formatQuotation(q, lines));
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/quotations/:id/reject — sent → rejected
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams; Body: RejectBody }>(
    `${API_V1_PREFIX}/quotations/:id/reject`,
    {
      schema: {
        description: 'Mark quotation as rejected by customer (sent → rejected)',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: rejectBodySchema,
        response: { 200: { description: 'Quotation rejected', ...quotationResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AR_QUOTATION_APPROVE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;
      const reason = request.body.reason;

      let rows: [QuotationRow?];
      if (reason) {
        rows = await fastify.sql<[QuotationRow?]>`
          UPDATE quotations
          SET status = 'rejected', rejected_at = NOW(),
              notes = CASE
                        WHEN notes IS NOT NULL THEN notes || E'\n\nRejection reason: ' || ${reason}
                        ELSE 'Rejection reason: ' || ${reason}
                      END,
              updated_at = NOW()
          WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'sent'
          RETURNING *
        `;
      } else {
        rows = await fastify.sql<[QuotationRow?]>`
          UPDATE quotations
          SET status = 'rejected', rejected_at = NOW(), updated_at = NOW()
          WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'sent'
          RETURNING *
        `;
      }
      const q = rows[0];
      if (!q) {
        const existing = await fastify.sql<[{ id: string; status: string }?]>`
          SELECT id, status FROM quotations WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
        `;
        if (!existing[0]) {
          throw new NotFoundError({ detail: `Quotation ${id} not found.` });
        }
        throw new ConflictError({
          detail: `Quotation ${id} cannot be rejected — current status is "${existing[0].status}". Only sent quotations can be rejected.`,
        });
      }

      request.log.info({ quotationId: id, tenantId, reason }, 'Quotation rejected');

      const lines = await fastify.sql<QuotationLineRow[]>`
        SELECT * FROM quotation_lines WHERE quotation_id = ${id} ORDER BY line_number
      `;
      return reply.status(200).send(formatQuotation(q, lines));
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/quotations/:id/convert — approved → converted + create invoice
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/quotations/:id/convert`,
    {
      schema: {
        description: 'Convert approved quotation to invoice (approved → converted)',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: {
          201: {
            description: 'Invoice created from quotation',
            type: 'object',
            properties: {
              quotation: quotationResponseSchema,
              invoiceId: { type: 'string' },
              invoiceNumber: { type: 'string' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(AR_QUOTATION_CONVERT)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId, sub: userId } = request.user;

      // Fetch quotation
      const qRows = await fastify.sql<[QuotationRow?]>`
        SELECT * FROM quotations WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      const q = qRows[0];
      if (!q) {
        throw new NotFoundError({ detail: `Quotation ${id} not found.` });
      }
      if (q.status !== 'approved') {
        throw new ConflictError({
          detail: `Quotation ${id} cannot be converted — current status is "${q.status}". Only approved quotations can be converted to invoice.`,
        });
      }

      // Fetch lines
      const lines = await fastify.sql<QuotationLineRow[]>`
        SELECT * FROM quotation_lines WHERE quotation_id = ${id} ORDER BY line_number
      `;

      // Create invoice
      const invoiceId = crypto.randomUUID();
      const invoiceNumber = await nextDocNumber(fastify.sql, tenantId, 'invoice', new Date().getFullYear());

      await fastify.sql`
        INSERT INTO invoices (
          id, invoice_number, customer_id, status, total_satang, paid_satang,
          due_date, notes, tenant_id, created_by
        ) VALUES (
          ${invoiceId}, ${invoiceNumber}, ${q.customer_id}, 'draft',
          ${q.total_satang.toString()}::bigint, 0,
          ${q.valid_until}, ${q.notes ?? null}, ${tenantId}, ${userId}
        )
      `;

      // Copy lines to invoice_line_items
      for (const line of lines) {
        await fastify.sql`
          INSERT INTO invoice_line_items (
            id, invoice_id, line_number, description, quantity,
            unit_price_satang, total_satang, account_id
          ) VALUES (
            ${crypto.randomUUID()}, ${invoiceId}, ${line.line_number},
            ${line.description}, ${line.quantity},
            ${line.unit_price_satang.toString()}::bigint,
            ${line.amount_satang.toString()}::bigint,
            ${line.account_id}
          )
        `;
      }

      // Update quotation status
      const updatedRows = await fastify.sql<[QuotationRow?]>`
        UPDATE quotations
        SET status = 'converted', converted_invoice_id = ${invoiceId}, updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `;
      const updated = updatedRows[0];
      if (!updated) {
        throw new NotFoundError({ detail: `Quotation ${id} not found after conversion.` });
      }

      request.log.info(
        { quotationId: id, invoiceId, invoiceNumber, tenantId, userId },
        'Quotation converted to invoice',
      );

      return reply.status(201).send({
        quotation: formatQuotation(updated, lines),
        invoiceId,
        invoiceNumber,
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/quotations/:id/duplicate — clone quotation as new draft
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/quotations/:id/duplicate`,
    {
      schema: {
        description: 'Duplicate a quotation as a new draft',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: { 201: { description: 'Duplicated quotation', ...quotationResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AR_QUOTATION_CREATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId, sub: userId } = request.user;

      const qRows = await fastify.sql<[QuotationRow?]>`
        SELECT * FROM quotations WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      const source = qRows[0];
      if (!source) {
        throw new NotFoundError({ detail: `Quotation ${id} not found.` });
      }

      const sourceLines = await fastify.sql<QuotationLineRow[]>`
        SELECT * FROM quotation_lines WHERE quotation_id = ${id} ORDER BY line_number
      `;

      const newId = crypto.randomUUID();
      const documentNumber = await nextDocNumber(fastify.sql, tenantId, 'quotation', new Date().getFullYear());

      // Default valid_until to 30 days from today
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);
      const newValidUntil = validUntil.toISOString().slice(0, 10);

      await fastify.sql`
        INSERT INTO quotations (
          id, document_number, customer_id, customer_name, subject, notes,
          status, valid_until, total_satang, tenant_id, created_by
        ) VALUES (
          ${newId}, ${documentNumber}, ${source.customer_id}, ${source.customer_name},
          ${source.subject}, ${source.notes ?? null}, 'draft', ${newValidUntil},
          ${source.total_satang.toString()}::bigint, ${tenantId}, ${userId}
        )
      `;

      const newLines: QuotationLineRow[] = [];
      for (const line of sourceLines) {
        const newLineId = crypto.randomUUID();
        await fastify.sql`
          INSERT INTO quotation_lines (
            id, quotation_id, line_number, description, quantity,
            unit_price_satang, amount_satang, account_id
          ) VALUES (
            ${newLineId}, ${newId}, ${line.line_number}, ${line.description},
            ${line.quantity}, ${line.unit_price_satang.toString()}::bigint,
            ${line.amount_satang.toString()}::bigint, ${line.account_id}
          )
        `;
        newLines.push({ ...line, id: newLineId, quotation_id: newId });
      }

      request.log.info(
        { sourceId: id, newId, documentNumber, tenantId, userId },
        'Quotation duplicated',
      );

      const newRow: QuotationRow = {
        id: newId,
        document_number: documentNumber,
        customer_id: source.customer_id,
        customer_name: source.customer_name,
        subject: source.subject,
        notes: source.notes,
        status: 'draft',
        valid_until: newValidUntil,
        total_satang: source.total_satang,
        converted_invoice_id: null,
        converted_sales_order_id: null,
        tenant_id: tenantId,
        created_by: userId,
        sent_at: null,
        approved_at: null,
        rejected_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      return reply.status(201).send(formatQuotation(newRow, newLines));
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/quotations/:id/convert-to-order — approved → converted (creates SO)
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/quotations/:id/convert-to-order`,
    {
      schema: {
        description: 'Convert approved quotation to sales order (approved → converted)',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: {
          201: {
            description: 'Sales order created from quotation',
            type: 'object',
            properties: {
              quotation: quotationResponseSchema,
              salesOrderId: { type: 'string' },
              salesOrderNumber: { type: 'string' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(AR_QUOTATION_CONVERT), requirePermission(AR_SO_CREATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId, sub: userId } = request.user;

      // Fetch quotation
      const qRows = await fastify.sql<[QuotationRow?]>`
        SELECT * FROM quotations WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      const q = qRows[0];
      if (!q) {
        throw new NotFoundError({ detail: `Quotation ${id} not found.` });
      }
      if (q.status !== 'approved') {
        throw new ConflictError({
          detail: `Quotation ${id} cannot be converted — current status is "${q.status}". Only approved quotations can be converted to sales order.`,
        });
      }

      // Fetch lines
      const lines = await fastify.sql<QuotationLineRow[]>`
        SELECT * FROM quotation_lines WHERE quotation_id = ${id} ORDER BY line_number
      `;

      // Create sales order
      const soId = crypto.randomUUID();
      const soNumber = await nextDocNumber(fastify.sql, tenantId, 'sales_order', new Date().getFullYear());
      const orderDate = new Date().toISOString().slice(0, 10);

      await fastify.sql`
        INSERT INTO sales_orders (
          id, document_number, customer_id, customer_name, status, order_date,
          expected_delivery_date, total_satang, quotation_id, notes, tenant_id, created_by
        ) VALUES (
          ${soId}, ${soNumber}, ${q.customer_id}, ${q.customer_name}, 'draft',
          ${orderDate}, ${q.valid_until}, ${q.total_satang.toString()}::bigint,
          ${id}, ${q.notes ?? null}, ${tenantId}, ${userId}
        )
      `;

      // Copy lines to sales_order_lines
      for (const line of lines) {
        await fastify.sql`
          INSERT INTO sales_order_lines (
            id, sales_order_id, line_number, description, quantity, delivered_quantity,
            unit_price_satang, amount_satang, account_id
          ) VALUES (
            ${crypto.randomUUID()}, ${soId}, ${line.line_number},
            ${line.description}, ${line.quantity}, 0,
            ${line.unit_price_satang.toString()}::bigint,
            ${line.amount_satang.toString()}::bigint,
            ${line.account_id}
          )
        `;
      }

      // Update quotation status
      const updatedRows = await fastify.sql<[QuotationRow?]>`
        UPDATE quotations
        SET status = 'converted', converted_sales_order_id = ${soId}, updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `;
      const updated = updatedRows[0];
      if (!updated) {
        throw new NotFoundError({ detail: `Quotation ${id} not found after conversion.` });
      }

      request.log.info(
        { quotationId: id, salesOrderId: soId, salesOrderNumber: soNumber, tenantId, userId },
        'Quotation converted to sales order',
      );

      return reply.status(201).send({
        quotation: formatQuotation(updated, lines),
        salesOrderId: soId,
        salesOrderNumber: soNumber,
      });
    },
  );
}
