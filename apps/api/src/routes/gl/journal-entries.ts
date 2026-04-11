/**
 * Journal Entry routes:
 *   POST /api/v1/journal-entries         — create journal entry
 *   GET  /api/v1/journal-entries         — list with pagination
 *   POST /api/v1/journal-entries/:id/post    — post entry
 *   POST /api/v1/journal-entries/:id/reverse — reverse entry
 *
 * Story 4.5a — GL + CoA + Fiscal API Routes
 *
 * Architecture references:
 *   AR15 — Tool Registry pattern (calls gl.createJournalEntry when available)
 *   NFR-I4 — X-Idempotency-Key support on POST
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, ConflictError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { toISO } from '../../lib/to-iso.js';
import { requirePermission } from '../../hooks/require-permission.js';
import {
  GL_JOURNAL_CREATE,
  GL_JOURNAL_READ,
  GL_JOURNAL_POST,
  GL_JOURNAL_REVERSE,
} from '../../lib/permissions.js';
import { nextDocNumber } from '@neip/core';

// ---------------------------------------------------------------------------
// JSON Schemas
// ---------------------------------------------------------------------------

const journalEntryLineSchema = {
  type: 'object',
  required: ['accountId', 'debitSatang', 'creditSatang'],
  additionalProperties: false,
  properties: {
    accountId: { type: 'string', description: 'Chart of Accounts ID' },
    description: { type: 'string', maxLength: 500 },
    debitSatang: { type: 'string', description: 'Debit amount in satang (bigint as string)' },
    creditSatang: { type: 'string', description: 'Credit amount in satang (bigint as string)' },
  },
} as const;

const createJournalEntryBodySchema = {
  type: 'object',
  required: ['description', 'fiscalYear', 'fiscalPeriod', 'lines'],
  additionalProperties: false,
  properties: {
    description: { type: 'string', minLength: 1, maxLength: 500 },
    fiscalYear: { type: 'integer', minimum: 2000 },
    fiscalPeriod: { type: 'integer', minimum: 1, maximum: 12 },
    lines: {
      type: 'array',
      minItems: 2,
      items: journalEntryLineSchema,
      description: 'Journal entry lines (minimum 2 — at least one debit and one credit)',
    },
  },
} as const;

const journalEntryResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    documentNumber: { type: 'string' },
    description: { type: 'string' },
    status: { type: 'string', enum: ['draft', 'posted', 'reversed'] },
    fiscalYear: { type: 'integer' },
    fiscalPeriod: { type: 'integer' },
    lines: { type: 'array', items: { type: 'object' } },
    createdBy: { type: 'string' },
    postedAt: { type: 'string', format: 'date-time', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
  },
} as const;

const listQuerySchema = {
  type: 'object',
  properties: {
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    offset: { type: 'integer', minimum: 0, default: 0 },
    status: { type: 'string', enum: ['draft', 'posted', 'reversed'] },
    fiscalYear: { type: 'integer' },
    fiscalPeriod: { type: 'integer' },
    sortBy: { type: 'string', enum: ['createdAt', 'documentNumber', 'fiscalYear'], default: 'createdAt' },
    sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
  },
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateJournalEntryBody {
  description: string;
  fiscalYear: number;
  fiscalPeriod: number;
  lines: Array<{
    accountId: string;
    description?: string;
    debitSatang: string;
    creditSatang: string;
  }>;
}

interface ListQuery {
  limit?: number;
  offset?: number;
  status?: string;
  fiscalYear?: number;
  fiscalPeriod?: number;
  sortBy?: string;
  sortOrder?: string;
}

interface IdParams {
  id: string;
}

interface JournalEntryRow {
  id: string;
  document_number: string;
  description: string;
  status: string;
  fiscal_year: number;
  fiscal_period: number;
  reversed_entry_id: string | null;
  tenant_id: string;
  created_by: string;
  posted_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  idempotency_key?: string | null;
}

interface JournalLineRow {
  id: string;
  entry_id: string;
  line_number: number;
  account_id: string;
  description: string | null;
  debit_satang: bigint;
  credit_satang: bigint;
}

interface CountRow {
  count: string;
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export async function journalEntryRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  // -------------------------------------------------------------------------
  // POST /api/v1/journal-entries — create
  // -------------------------------------------------------------------------
  fastify.post<{ Body: CreateJournalEntryBody }>(
    `${API_V1_PREFIX}/journal-entries`,
    {
      schema: {
        description: 'Create a new journal entry (draft)',
        tags: ['gl'],
        security: [{ bearerAuth: [] }],
        body: createJournalEntryBodySchema,
        response: { 201: { description: 'Journal entry created', ...journalEntryResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(GL_JOURNAL_CREATE)],
    },
    async (request, reply) => {
      const { description, fiscalYear, fiscalPeriod, lines } = request.body;
      const { tenantId, sub: userId } = request.user;

      // Check X-Idempotency-Key — return existing JE if already processed.
      const idempotencyKey = request.headers['x-idempotency-key'] as string | undefined;
      if (idempotencyKey) {
        const existing = await fastify.sql<[JournalEntryRow?]>`
          SELECT * FROM journal_entries
          WHERE tenant_id = ${tenantId} AND idempotency_key = ${idempotencyKey}
          LIMIT 1
        `.catch(() => [] as JournalEntryRow[]);
        if (existing[0]) {
          const e = existing[0];
          return reply.status(200).send({
            id: e.id,
            documentNumber: e.document_number,
            description: e.description,
            status: e.status,
            fiscalYear: e.fiscal_year,
            fiscalPeriod: e.fiscal_period,
            lines: [],
            createdBy: e.created_by,
            postedAt: e.posted_at != null ? toISO(e.posted_at) : null,
            createdAt: toISO(e.created_at),
          });
        }
      }

      // Validate debits == credits.
      let totalDebit = 0n;
      let totalCredit = 0n;
      for (const line of lines) {
        totalDebit += BigInt(line.debitSatang);
        totalCredit += BigInt(line.creditSatang);
      }
      if (totalDebit !== totalCredit) {
        throw new ValidationError({
          detail: `Total debits (${totalDebit.toString()}) must equal total credits (${totalCredit.toString()}).`,
          errors: [{ field: 'lines', message: 'Debits and credits must balance.' }],
        });
      }
      if (totalDebit === 0n) {
        throw new ValidationError({
          detail: 'Journal entry amount must be greater than 0 satang.',
          errors: [{ field: 'lines', message: 'Amount must be > 0.' }],
        });
      }

      // Check fiscal period is open
      const periodCheck = await fastify.sql<[{ status: string }?]>`
        SELECT fp.status FROM fiscal_periods fp
        JOIN fiscal_years fy ON fp.fiscal_year_id = fy.id
        WHERE fy.tenant_id = ${tenantId}
          AND fy.year = ${fiscalYear}
          AND fp.period_number = ${fiscalPeriod}
        LIMIT 1
      `;
      if (periodCheck[0]?.status === 'closed') {
        throw new ConflictError({
          detail: `Fiscal period ${String(fiscalPeriod)}/${String(fiscalYear)} is closed. Cannot create journal entries in a closed period.`,
        });
      }

      const entryId = crypto.randomUUID();
      const documentNumber = await nextDocNumber(fastify.sql, tenantId, 'journal_entry', fiscalYear);

      const entryRows = await fastify.sql<[JournalEntryRow?]>`
        INSERT INTO journal_entries (id, document_number, description, status, fiscal_year, fiscal_period, tenant_id, created_by, idempotency_key)
        VALUES (${entryId}, ${documentNumber}, ${description}, 'draft', ${fiscalYear}, ${fiscalPeriod}, ${tenantId}, ${userId}, ${idempotencyKey ?? null})
        RETURNING *
      `;

      const entry = entryRows[0];
      if (!entry) {
        throw new Error('Failed to create journal entry — no row returned.');
      }

      // Insert lines.
      const insertedLines: JournalLineRow[] = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        const lineId = crypto.randomUUID();
        const lineRows = await fastify.sql<[JournalLineRow?]>`
          INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang)
          VALUES (${lineId}, ${entryId}, ${i + 1}, ${line.accountId}, ${line.description ?? null}, ${line.debitSatang}::bigint, ${line.creditSatang}::bigint)
          RETURNING *
        `;
        const inserted = lineRows[0];
        if (inserted) insertedLines.push(inserted);
      }

      request.log.info(
        { entryId, documentNumber, tenantId, userId },
        'Journal entry created',
      );

      return reply.status(201).send({
        id: entry.id,
        documentNumber: entry.document_number,
        description: entry.description,
        status: entry.status,
        fiscalYear: entry.fiscal_year,
        fiscalPeriod: entry.fiscal_period,
        lines: insertedLines.map((l) => ({
          id: l.id,
          lineNumber: l.line_number,
          accountId: l.account_id,
          description: l.description,
          debitSatang: l.debit_satang.toString(),
          creditSatang: l.credit_satang.toString(),
        })),
        createdBy: entry.created_by,
        postedAt: null,
        createdAt: toISO(entry.created_at),
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/journal-entries — list with pagination
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: ListQuery }>(
    `${API_V1_PREFIX}/journal-entries`,
    {
      schema: {
        description: 'List journal entries with pagination and filtering',
        tags: ['gl'],
        security: [{ bearerAuth: [] }],
        querystring: listQuerySchema,
        response: {
          200: {
            description: 'Paginated list of journal entries',
            type: 'object',
            properties: {
              items: { type: 'array', items: journalEntryResponseSchema },
              total: { type: 'integer' },
              limit: { type: 'integer' },
              offset: { type: 'integer' },
              hasMore: { type: 'boolean' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(GL_JOURNAL_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const limit = request.query.limit ?? 20;
      const offset = request.query.offset ?? 0;
      const status = request.query.status;
      const fiscalYear = request.query.fiscalYear;
      // Count total matching entries.
      let countRows: CountRow[];
      if (status !== undefined && fiscalYear !== undefined) {
        countRows = await fastify.sql<CountRow[]>`
          SELECT COUNT(*)::text as count FROM journal_entries
          WHERE tenant_id = ${tenantId} AND status = ${status} AND fiscal_year = ${fiscalYear}
        `;
      } else if (status !== undefined) {
        countRows = await fastify.sql<CountRow[]>`
          SELECT COUNT(*)::text as count FROM journal_entries
          WHERE tenant_id = ${tenantId} AND status = ${status}
        `;
      } else if (fiscalYear !== undefined) {
        countRows = await fastify.sql<CountRow[]>`
          SELECT COUNT(*)::text as count FROM journal_entries
          WHERE tenant_id = ${tenantId} AND fiscal_year = ${fiscalYear}
        `;
      } else {
        countRows = await fastify.sql<CountRow[]>`
          SELECT COUNT(*)::text as count FROM journal_entries
          WHERE tenant_id = ${tenantId}
        `;
      }

      const total = parseInt(countRows[0]?.count ?? '0', 10);

      // Fetch entries — filtering applied inline.
      let entries: JournalEntryRow[];
      if (status !== undefined && fiscalYear !== undefined) {
        entries = await fastify.sql<JournalEntryRow[]>`
          SELECT * FROM journal_entries
          WHERE tenant_id = ${tenantId} AND status = ${status} AND fiscal_year = ${fiscalYear}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
      } else if (status !== undefined) {
        entries = await fastify.sql<JournalEntryRow[]>`
          SELECT * FROM journal_entries
          WHERE tenant_id = ${tenantId} AND status = ${status}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
      } else if (fiscalYear !== undefined) {
        entries = await fastify.sql<JournalEntryRow[]>`
          SELECT * FROM journal_entries
          WHERE tenant_id = ${tenantId} AND fiscal_year = ${fiscalYear}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        entries = await fastify.sql<JournalEntryRow[]>`
          SELECT * FROM journal_entries
          WHERE tenant_id = ${tenantId}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
      }

      const items = entries.map((e) => ({
        id: e.id,
        documentNumber: e.document_number,
        description: e.description,
        status: e.status,
        fiscalYear: e.fiscal_year,
        fiscalPeriod: e.fiscal_period,
        lines: [],
        createdBy: e.created_by,
        postedAt: e.posted_at != null ? toISO(e.posted_at) : null,
        createdAt: toISO(e.created_at),
      }));

      return reply.status(200).send({
        items,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/journal-entries/:id/post — post entry
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/journal-entries/:id/post`,
    {
      schema: {
        description: 'Post a draft journal entry (makes it immutable)',
        tags: ['gl'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: { 200: { description: 'Entry posted', ...journalEntryResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(GL_JOURNAL_POST)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      // TODO: Call gl.postJournalEntry tool when available.
      const rows = await fastify.sql<[JournalEntryRow?]>`
        UPDATE journal_entries
        SET status = 'posted', posted_at = NOW(), updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'draft'
        RETURNING *
      `;

      const entry = rows[0];
      if (!entry) {
        // Check if it exists at all.
        const existing = await fastify.sql<[{ id: string; status: string }?]>`
          SELECT id, status FROM journal_entries WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
        `;
        if (!existing[0]) {
          throw new NotFoundError({ detail: `Journal entry ${id} not found.` });
        }
        throw new ConflictError({
          detail: `Journal entry ${id} cannot be posted — current status is "${existing[0].status}".`,
        });
      }

      request.log.info({ entryId: id, tenantId }, 'Journal entry posted');

      // Write audit log for posting
      const auditId = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO audit_logs (id, user_id, tenant_id, action, resource_type, resource_id, changes, request_id)
        VALUES (${auditId}, ${request.user.sub}, ${tenantId}, 'post', 'journal_entry', ${id},
          ${JSON.stringify({ status: { from: 'draft', to: 'posted' } })},
          ${request.id ?? auditId})
      `.catch(() => { /* non-critical */ });

      return reply.status(200).send({
        id: entry.id,
        documentNumber: entry.document_number,
        description: entry.description,
        status: entry.status,
        fiscalYear: entry.fiscal_year,
        fiscalPeriod: entry.fiscal_period,
        lines: [],
        createdBy: entry.created_by,
        postedAt: entry.posted_at != null ? toISO(entry.posted_at) : null,
        createdAt: toISO(entry.created_at),
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/journal-entries/:id/reverse — reverse entry
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/journal-entries/:id/reverse`,
    {
      schema: {
        description: 'Reverse a posted journal entry (creates a new reversal entry)',
        tags: ['gl'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: { 201: { description: 'Reversal entry created', ...journalEntryResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(GL_JOURNAL_REVERSE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId, sub: userId } = request.user;

      // TODO: Call gl.reverseJournalEntry tool when available.

      // Verify original entry exists and is posted.
      const origRows = await fastify.sql<[JournalEntryRow?]>`
        SELECT * FROM journal_entries WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      const original = origRows[0];
      if (!original) {
        throw new NotFoundError({ detail: `Journal entry ${id} not found.` });
      }
      if (original.status !== 'posted') {
        throw new ConflictError({
          detail: `Only posted entries can be reversed. Current status: "${original.status}".`,
        });
      }

      // Mark original as reversed.
      await fastify.sql`
        UPDATE journal_entries SET status = 'reversed', updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `;

      // Create reversal entry with swapped debits/credits.
      const reversalId = crypto.randomUUID();
      const reversalDocNum = await nextDocNumber(fastify.sql, tenantId, 'journal_entry', original.fiscal_year);

      const reversalRows = await fastify.sql<[JournalEntryRow?]>`
        INSERT INTO journal_entries (id, document_number, description, status, fiscal_year, fiscal_period, reversed_entry_id, tenant_id, created_by, posted_at)
        VALUES (${reversalId}, ${reversalDocNum}, ${'Reversal of ' + original.document_number}, 'posted', ${original.fiscal_year}, ${original.fiscal_period}, ${id}, ${tenantId}, ${userId}, NOW())
        RETURNING *
      `;

      const reversal = reversalRows[0];
      if (!reversal) {
        throw new Error('Failed to create reversal entry.');
      }

      // Copy lines with swapped amounts.
      const originalLines = await fastify.sql<JournalLineRow[]>`
        SELECT * FROM journal_entry_lines WHERE entry_id = ${id} ORDER BY line_number
      `;

      for (const line of originalLines) {
        const lineId = crypto.randomUUID();
        await fastify.sql`
          INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang)
          VALUES (${lineId}, ${reversalId}, ${line.line_number}, ${line.account_id}, ${line.description}, ${line.credit_satang.toString()}::bigint, ${line.debit_satang.toString()}::bigint)
        `;
      }

      request.log.info(
        { originalId: id, reversalId, tenantId },
        'Journal entry reversed',
      );

      return reply.status(201).send({
        id: reversal.id,
        documentNumber: reversal.document_number,
        description: reversal.description,
        status: reversal.status,
        fiscalYear: reversal.fiscal_year,
        fiscalPeriod: reversal.fiscal_period,
        lines: [],
        createdBy: reversal.created_by,
        postedAt: reversal.posted_at != null ? toISO(reversal.posted_at) : null,
        createdAt: toISO(reversal.created_at),
      });
    },
  );
}
