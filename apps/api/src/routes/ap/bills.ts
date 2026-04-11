/**
 * Bill routes:
 *   POST /api/v1/bills          — create bill
 *   GET  /api/v1/bills          — list bills
 *   GET  /api/v1/bills/:id      — get bill detail
 *   PUT  /api/v1/bills/:id      — update bill
 *   POST /api/v1/bills/:id/post — post bill
 *   POST /api/v1/bills/:id/void — void bill
 *
 * Story 10.1 — AP Bill/Expense Domain Logic + API
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import {
  AP_BILL_CREATE,
  AP_BILL_READ,
  AP_BILL_UPDATE,
  AP_BILL_APPROVE,
} from '../../lib/permissions.js';
import { nextDocNumber } from '@neip/core';

// ---------------------------------------------------------------------------
// JSON Schemas
// ---------------------------------------------------------------------------

const billLineSchema = {
  type: 'object',
  required: ['description', 'amountSatang', 'accountId'],
  additionalProperties: false,
  properties: {
    description: { type: 'string', minLength: 1, maxLength: 500 },
    amountSatang: { type: 'string', description: 'Amount in satang' },
    accountId: { type: 'string', description: 'Expense/asset account ID' },
  },
} as const;

const createBillBodySchema = {
  type: 'object',
  required: ['vendorId', 'dueDate', 'lines'],
  additionalProperties: false,
  properties: {
    vendorId: { type: 'string', description: 'Vendor ID' },
    dueDate: { type: 'string', format: 'date', description: 'Payment due date (YYYY-MM-DD)' },
    notes: { type: 'string', maxLength: 2000 },
    lines: {
      type: 'array',
      minItems: 1,
      items: billLineSchema,
    },
  },
} as const;

const updateBillBodySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    vendorId: { type: 'string' },
    dueDate: { type: 'string', format: 'date' },
    notes: { type: 'string', maxLength: 2000 },
    lines: { type: 'array', minItems: 1, items: billLineSchema },
  },
} as const;

const billResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    documentNumber: { type: 'string' },
    vendorId: { type: 'string' },
    status: { type: 'string', enum: ['draft', 'posted', 'voided', 'paid', 'partial'] },
    totalSatang: { type: 'string' },
    paidSatang: { type: 'string' },
    dueDate: { type: 'string', format: 'date' },
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
    status: { type: 'string', enum: ['draft', 'posted', 'voided', 'paid', 'partial'] },
    vendorId: { type: 'string' },
    sortBy: { type: 'string', enum: ['createdAt', 'dueDate', 'totalSatang'], default: 'createdAt' },
    sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
  },
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateBillBody {
  vendorId: string;
  dueDate: string;
  notes?: string;
  lines: Array<{
    description: string;
    amountSatang: string;
    accountId: string;
  }>;
}

interface UpdateBillBody {
  vendorId?: string;
  dueDate?: string;
  notes?: string;
  lines?: Array<{
    description: string;
    amountSatang: string;
    accountId: string;
  }>;
}

interface BillListQuery {
  limit?: number;
  offset?: number;
  status?: string;
  vendorId?: string;
  sortBy?: string;
  sortOrder?: string;
}

interface IdParams {
  id: string;
}

interface BillRow {
  id: string;
  document_number: string;
  vendor_id: string;
  total_satang: bigint;
  paid_satang: bigint;
  due_date: string;
  notes: string | null;
  status: string;
  tenant_id: string;
  created_by: string;
  posted_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface BillLineRow {
  id: string;
  bill_id: string;
  line_number: number;
  description: string;
  amount_satang: bigint;
  account_id: string;
}

interface CountRow {
  count: string;
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export async function billRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  // -------------------------------------------------------------------------
  // POST /api/v1/bills — create bill
  // -------------------------------------------------------------------------
  fastify.post<{ Body: CreateBillBody }>(
    `${API_V1_PREFIX}/bills`,
    {
      schema: {
        description: 'Create a new bill (accounts payable)',
        tags: ['ap'],
        security: [{ bearerAuth: [] }],
        body: createBillBodySchema,
        response: { 201: { description: 'Bill created', ...billResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AP_BILL_CREATE)],
    },
    async (request, reply) => {
      const { vendorId, dueDate, notes, lines } = request.body;
      const { tenantId, sub: userId } = request.user;

      let totalSatang = 0n;
      const processedLines = lines.map((line, index) => {
        const lineAmount = BigInt(line.amountSatang);
        totalSatang += lineAmount;
        return {
          id: crypto.randomUUID(),
          lineNumber: index + 1,
          description: line.description,
          amountSatang: line.amountSatang,
          accountId: line.accountId,
        };
      });

      const billId = crypto.randomUUID();
      const documentNumber = await nextDocNumber(fastify.sql, tenantId, 'bill', new Date().getFullYear());

      await fastify.sql`
        INSERT INTO bills (id, document_number, vendor_id, total_satang, paid_satang, due_date, notes, status, tenant_id, created_by)
        VALUES (${billId}, ${documentNumber}, ${vendorId}, ${totalSatang.toString()}::bigint, 0, ${dueDate}, ${notes ?? null}, 'draft', ${tenantId}, ${userId})
      `;

      for (const line of processedLines) {
        await fastify.sql`
          INSERT INTO bill_line_items (id, bill_id, line_number, description, amount_satang, account_id)
          VALUES (${line.id}, ${billId}, ${line.lineNumber}, ${line.description}, ${line.amountSatang}::bigint, ${line.accountId})
        `;
      }

      request.log.info({ billId, documentNumber, vendorId, tenantId, userId }, 'Bill created');

      return reply.status(201).send({
        id: billId,
        documentNumber,
        vendorId,
        status: 'draft',
        totalSatang: totalSatang.toString(),
        paidSatang: '0',
        dueDate,
        notes: notes ?? null,
        lines: processedLines,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/bills — list bills
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: BillListQuery }>(
    `${API_V1_PREFIX}/bills`,
    {
      schema: {
        description: 'List bills with pagination and filtering',
        tags: ['ap'],
        security: [{ bearerAuth: [] }],
        querystring: listQuerySchema,
        response: {
          200: {
            description: 'Paginated list of bills',
            type: 'object',
            properties: {
              items: { type: 'array', items: billResponseSchema },
              total: { type: 'integer' },
              limit: { type: 'integer' },
              offset: { type: 'integer' },
              hasMore: { type: 'boolean' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(AP_BILL_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const limit = request.query.limit ?? 20;
      const offset = request.query.offset ?? 0;
      const { status, vendorId } = request.query;

      let countRows: CountRow[];
      let bills: BillRow[];

      if (status !== undefined && vendorId !== undefined) {
        countRows = await fastify.sql<CountRow[]>`
          SELECT COUNT(*)::text as count FROM bills WHERE tenant_id = ${tenantId} AND status = ${status} AND vendor_id = ${vendorId}
        `;
        bills = await fastify.sql<BillRow[]>`
          SELECT * FROM bills WHERE tenant_id = ${tenantId} AND status = ${status} AND vendor_id = ${vendorId}
          ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
      } else if (status !== undefined) {
        countRows = await fastify.sql<CountRow[]>`
          SELECT COUNT(*)::text as count FROM bills WHERE tenant_id = ${tenantId} AND status = ${status}
        `;
        bills = await fastify.sql<BillRow[]>`
          SELECT * FROM bills WHERE tenant_id = ${tenantId} AND status = ${status}
          ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
      } else if (vendorId !== undefined) {
        countRows = await fastify.sql<CountRow[]>`
          SELECT COUNT(*)::text as count FROM bills WHERE tenant_id = ${tenantId} AND vendor_id = ${vendorId}
        `;
        bills = await fastify.sql<BillRow[]>`
          SELECT * FROM bills WHERE tenant_id = ${tenantId} AND vendor_id = ${vendorId}
          ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        countRows = await fastify.sql<CountRow[]>`
          SELECT COUNT(*)::text as count FROM bills WHERE tenant_id = ${tenantId}
        `;
        bills = await fastify.sql<BillRow[]>`
          SELECT * FROM bills WHERE tenant_id = ${tenantId}
          ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
      }

      const total = parseInt(countRows[0]?.count ?? '0', 10);
      const items = bills.map((b) => ({
        id: b.id,
        documentNumber: b.document_number,
        vendorId: b.vendor_id,
        status: b.status,
        totalSatang: b.total_satang.toString(),
        paidSatang: b.paid_satang.toString(),
        dueDate: b.due_date,
        notes: b.notes,
        lines: [],
        createdAt: toISO(b.created_at),
        updatedAt: toISO(b.updated_at),
      }));

      return reply.status(200).send({ items, total, limit, offset, hasMore: offset + limit < total });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/bills/:id — get bill detail
  // -------------------------------------------------------------------------
  fastify.get<{ Params: IdParams }>(
    `${API_V1_PREFIX}/bills/:id`,
    {
      schema: {
        description: 'Get bill details by ID',
        tags: ['ap'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: { 200: { description: 'Bill details', ...billResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AP_BILL_READ)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const rows = await fastify.sql<[BillRow?]>`
        SELECT * FROM bills WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      const bill = rows[0];
      if (!bill) {
        throw new NotFoundError({ detail: `Bill ${id} not found.` });
      }

      const lines = await fastify.sql<BillLineRow[]>`
        SELECT * FROM bill_line_items WHERE bill_id = ${id} ORDER BY line_number
      `;

      return reply.status(200).send({
        id: bill.id,
        documentNumber: bill.document_number,
        vendorId: bill.vendor_id,
        status: bill.status,
        totalSatang: bill.total_satang.toString(),
        paidSatang: bill.paid_satang.toString(),
        dueDate: bill.due_date,
        notes: bill.notes,
        lines: lines.map((l) => ({
          id: l.id,
          lineNumber: l.line_number,
          description: l.description,
          amountSatang: l.amount_satang.toString(),
          accountId: l.account_id,
        })),
        createdAt: toISO(bill.created_at),
        updatedAt: toISO(bill.updated_at),
      });
    },
  );

  // -------------------------------------------------------------------------
  // PUT /api/v1/bills/:id — update bill
  // -------------------------------------------------------------------------
  fastify.put<{ Params: IdParams; Body: UpdateBillBody }>(
    `${API_V1_PREFIX}/bills/:id`,
    {
      schema: {
        description: 'Update a draft bill',
        tags: ['ap'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: updateBillBodySchema,
        response: { 200: { description: 'Bill updated', ...billResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AP_BILL_UPDATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { vendorId, dueDate, notes, lines } = request.body;
      const { tenantId } = request.user;

      const existing = await fastify.sql<[BillRow?]>`
        SELECT * FROM bills WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!existing[0]) {
        throw new NotFoundError({ detail: `Bill ${id} not found.` });
      }
      if (existing[0].status !== 'draft') {
        throw new ValidationError({ detail: `Only draft bills can be updated. Current status: "${existing[0].status}".` });
      }

      let totalSatang = existing[0].total_satang;

      if (lines !== undefined) {
        let newTotal = 0n;
        for (const line of lines) {
          newTotal += BigInt(line.amountSatang);
        }
        totalSatang = newTotal;

        await fastify.sql`DELETE FROM bill_line_items WHERE bill_id = ${id}`;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]!;
          await fastify.sql`
            INSERT INTO bill_line_items (id, bill_id, line_number, description, amount_satang, account_id)
            VALUES (${crypto.randomUUID()}, ${id}, ${i + 1}, ${line.description}, ${line.amountSatang}::bigint, ${line.accountId})
          `;
        }
      }

      const rows = await fastify.sql<[BillRow?]>`
        UPDATE bills
        SET vendor_id = COALESCE(${vendorId ?? null}, vendor_id),
            due_date = COALESCE(${dueDate ?? null}, due_date),
            notes = COALESCE(${notes ?? null}, notes),
            total_satang = ${totalSatang.toString()}::bigint,
            updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `;
      const bill = rows[0]!;

      return reply.status(200).send({
        id: bill.id,
        documentNumber: bill.document_number,
        vendorId: bill.vendor_id,
        status: bill.status,
        totalSatang: bill.total_satang.toString(),
        paidSatang: bill.paid_satang.toString(),
        dueDate: bill.due_date,
        notes: bill.notes,
        lines: [],
        createdAt: toISO(bill.created_at),
        updatedAt: toISO(bill.updated_at),
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/bills/:id/post — post bill
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/bills/:id/post`,
    {
      schema: {
        description: 'Post a draft bill',
        tags: ['ap'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: { 200: { description: 'Bill posted', ...billResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AP_BILL_APPROVE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const rows = await fastify.sql<[BillRow?]>`
        UPDATE bills
        SET status = 'posted', posted_at = NOW(), updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'draft'
        RETURNING *
      `;
      const bill = rows[0];
      if (!bill) {
        const existing = await fastify.sql<[{ id: string; status: string }?]>`
          SELECT id, status FROM bills WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
        `;
        if (!existing[0]) {
          throw new NotFoundError({ detail: `Bill ${id} not found.` });
        }
        throw new ValidationError({
          detail: `Bill ${id} cannot be posted — current status is "${existing[0].status}".`,
        });
      }

      request.log.info({ billId: id, tenantId }, 'Bill posted');

      return reply.status(200).send({
        id: bill.id,
        documentNumber: bill.document_number,
        vendorId: bill.vendor_id,
        status: bill.status,
        totalSatang: bill.total_satang.toString(),
        paidSatang: bill.paid_satang.toString(),
        dueDate: bill.due_date,
        notes: bill.notes,
        lines: [],
        createdAt: toISO(bill.created_at),
        updatedAt: toISO(bill.updated_at),
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/bills/:id/void — void bill
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/bills/:id/void`,
    {
      schema: {
        description: 'Void a bill (cannot be undone)',
        tags: ['ap'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: { 200: { description: 'Bill voided', ...billResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AP_BILL_APPROVE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const rows = await fastify.sql<[BillRow?]>`
        UPDATE bills
        SET status = 'voided', updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status IN ('draft', 'posted')
        RETURNING *
      `;
      const bill = rows[0];
      if (!bill) {
        const existing = await fastify.sql<[{ id: string; status: string }?]>`
          SELECT id, status FROM bills WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
        `;
        if (!existing[0]) {
          throw new NotFoundError({ detail: `Bill ${id} not found.` });
        }
        throw new ValidationError({
          detail: `Bill ${id} cannot be voided — current status is "${existing[0].status}".`,
        });
      }

      request.log.info({ billId: id, tenantId }, 'Bill voided');

      return reply.status(200).send({
        id: bill.id,
        documentNumber: bill.document_number,
        vendorId: bill.vendor_id,
        status: bill.status,
        totalSatang: bill.total_satang.toString(),
        paidSatang: bill.paid_satang.toString(),
        dueDate: bill.due_date,
        notes: bill.notes,
        lines: [],
        createdAt: toISO(bill.created_at),
        updatedAt: toISO(bill.updated_at),
      });
    },
  );
}
