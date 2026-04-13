/**
 * Parallel Accounting routes (IFRS + Thai GAAP):
 *   POST /api/v1/gl/parallel-entries          — record parallel ledger values
 *   GET  /api/v1/gl/parallel-entries          — list parallel entries (filter by standard)
 *   GET  /api/v1/gl/parallel-report           — trial balance by accounting standard
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import {
  GL_PARALLEL_CREATE,
  GL_PARALLEL_READ,
} from '../../lib/permissions.js';

// ---------------------------------------------------------------------------
// JSON Schemas
// ---------------------------------------------------------------------------

const createBodySchema = {
  type: 'object',
  required: ['journalEntryId', 'standardCode', 'lines'],
  additionalProperties: false,
  properties: {
    journalEntryId: { type: 'string' },
    standardCode: { type: 'string', enum: ['IFRS', 'THAI_GAAP', 'TFRS_NPAE'] },
    lines: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['accountId', 'debitSatang', 'creditSatang'],
        additionalProperties: false,
        properties: {
          accountId: { type: 'string' },
          description: { type: 'string' },
          debitSatang: { type: 'string' },
          creditSatang: { type: 'string' },
        },
      },
    },
  },
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateBody {
  journalEntryId: string;
  standardCode: string;
  lines: Array<{
    accountId: string;
    description?: string;
    debitSatang: string;
    creditSatang: string;
  }>;
}

interface ParallelRow {
  id: string;
  journal_entry_id: string;
  standard_code: string;
  account_id: string;
  description: string | null;
  debit_satang: bigint;
  credit_satang: bigint;
  tenant_id: string;
  created_by: string;
  created_at: Date | string;
}

interface ListQuery {
  limit?: number;
  offset?: number;
  standardCode?: string;
  journalEntryId?: string;
}

interface CountRow { count: string; }

function mapEntry(r: ParallelRow) {
  return {
    id: r.id,
    journalEntryId: r.journal_entry_id,
    standardCode: r.standard_code,
    accountId: r.account_id,
    description: r.description,
    debitSatang: r.debit_satang.toString(),
    creditSatang: r.credit_satang.toString(),
    createdAt: toISO(r.created_at),
  };
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export async function parallelAccountingRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  // POST /api/v1/gl/parallel-entries
  fastify.post<{ Body: CreateBody }>(
    `${API_V1_PREFIX}/gl/parallel-entries`,
    {
      schema: {
        description: 'Record parallel ledger values for a journal entry under a specific accounting standard',
        tags: ['gl'],
        security: [{ bearerAuth: [] }],
        body: createBodySchema,
        response: { 201: { description: 'Parallel entries created', type: 'object', properties: { entries: { type: 'array', items: { type: 'object' } } } } },
      },
      preHandler: [requireAuth, requirePermission(GL_PARALLEL_CREATE)],
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user;
      const { journalEntryId, standardCode, lines } = request.body;

      // Verify JE exists
      const jeCheck = await fastify.sql<[{ id: string }?]>`
        SELECT id FROM journal_entries WHERE id = ${journalEntryId} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!jeCheck[0]) throw new NotFoundError({ detail: `Journal entry ${journalEntryId} not found.` });

      // Validate debits = credits
      let totalDebit = 0n;
      let totalCredit = 0n;
      for (const line of lines) {
        totalDebit += BigInt(line.debitSatang);
        totalCredit += BigInt(line.creditSatang);
      }
      if (totalDebit !== totalCredit) {
        throw new ValidationError({ detail: `Debits (${totalDebit}) must equal credits (${totalCredit}).` });
      }

      const created: ParallelRow[] = [];
      for (const line of lines) {
        const id = crypto.randomUUID();
        const rows = await fastify.sql<[ParallelRow]>`
          INSERT INTO parallel_ledger_entries (id, journal_entry_id, standard_code, account_id, description, debit_satang, credit_satang, tenant_id, created_by)
          VALUES (${id}, ${journalEntryId}, ${standardCode}, ${line.accountId}, ${line.description ?? null}, ${line.debitSatang}::bigint, ${line.creditSatang}::bigint, ${tenantId}, ${userId})
          RETURNING *
        `;
        created.push(rows[0]);
      }

      return reply.status(201).send({ entries: created.map(mapEntry) });
    },
  );

  // GET /api/v1/gl/parallel-entries
  fastify.get<{ Querystring: ListQuery }>(
    `${API_V1_PREFIX}/gl/parallel-entries`,
    {
      schema: {
        description: 'List parallel ledger entries filtered by accounting standard',
        tags: ['gl'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            offset: { type: 'integer', minimum: 0, default: 0 },
            standardCode: { type: 'string', enum: ['IFRS', 'THAI_GAAP', 'TFRS_NPAE'] },
            journalEntryId: { type: 'string' },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(GL_PARALLEL_READ)],
    },
    async (request, _reply) => {
      const { tenantId } = request.user;
      const { limit = 20, offset = 0, standardCode, journalEntryId } = request.query;

      let items: ParallelRow[];
      let countRows: CountRow[];

      if (standardCode && journalEntryId) {
        [items, countRows] = await Promise.all([
          fastify.sql<ParallelRow[]>`SELECT * FROM parallel_ledger_entries WHERE tenant_id = ${tenantId} AND standard_code = ${standardCode} AND journal_entry_id = ${journalEntryId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
          fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM parallel_ledger_entries WHERE tenant_id = ${tenantId} AND standard_code = ${standardCode} AND journal_entry_id = ${journalEntryId}`,
        ]);
      } else if (standardCode) {
        [items, countRows] = await Promise.all([
          fastify.sql<ParallelRow[]>`SELECT * FROM parallel_ledger_entries WHERE tenant_id = ${tenantId} AND standard_code = ${standardCode} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
          fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM parallel_ledger_entries WHERE tenant_id = ${tenantId} AND standard_code = ${standardCode}`,
        ]);
      } else {
        [items, countRows] = await Promise.all([
          fastify.sql<ParallelRow[]>`SELECT * FROM parallel_ledger_entries WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
          fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM parallel_ledger_entries WHERE tenant_id = ${tenantId}`,
        ]);
      }

      const total = parseInt(countRows[0]?.count ?? '0', 10);
      return { items: items.map(mapEntry), total, limit, offset, hasMore: offset + limit < total };
    },
  );

  // GET /api/v1/gl/parallel-report — trial balance per standard
  fastify.get<{ Querystring: { standardCode: string } }>(
    `${API_V1_PREFIX}/gl/parallel-report`,
    {
      schema: {
        description: 'Parallel accounting trial balance — aggregated by account for a given standard',
        tags: ['gl'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          required: ['standardCode'],
          properties: {
            standardCode: { type: 'string', enum: ['IFRS', 'THAI_GAAP', 'TFRS_NPAE'] },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(GL_PARALLEL_READ)],
    },
    async (request, _reply) => {
      const { tenantId } = request.user;
      const { standardCode } = request.query;

      interface AggRow {
        account_id: string;
        total_debit: bigint;
        total_credit: bigint;
      }

      const rows = await fastify.sql<AggRow[]>`
        SELECT account_id,
          SUM(debit_satang) as total_debit,
          SUM(credit_satang) as total_credit
        FROM parallel_ledger_entries
        WHERE tenant_id = ${tenantId} AND standard_code = ${standardCode}
        GROUP BY account_id
        ORDER BY account_id
      `;

      let totalDebit = 0n;
      let totalCredit = 0n;
      const accounts = rows.map(r => {
        totalDebit += r.total_debit;
        totalCredit += r.total_credit;
        return {
          accountId: r.account_id,
          totalDebitSatang: r.total_debit.toString(),
          totalCreditSatang: r.total_credit.toString(),
          balanceSatang: (r.total_debit - r.total_credit).toString(),
        };
      });

      return {
        standardCode,
        accounts,
        totalDebitSatang: totalDebit.toString(),
        totalCreditSatang: totalCredit.toString(),
      };
    },
  );
}
