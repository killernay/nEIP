/**
 * Bank Auto-Matching Rules routes (Phase 5.6):
 *   POST /api/v1/bank-matching-rules          — create rule
 *   GET  /api/v1/bank-matching-rules          — list rules
 *   PUT  /api/v1/bank-matching-rules/:id      — update rule
 *   DELETE /api/v1/bank-matching-rules/:id    — delete rule
 *   POST /api/v1/bank/:accountId/auto-reconcile — apply rules to unreconciled txns
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import {
  FI_BANK_RECONCILE,
  FI_BANK_CREATE,
  FI_BANK_READ,
} from '../../lib/permissions.js';

interface RuleRow {
  id: string;
  priority: number;
  match_type: string;
  field: string;
  pattern: string;
  min_amount_satang: string | null;
  max_amount_satang: string | null;
  target_account_id: string;
  tenant_id: string;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

interface BankTxnRow {
  id: string;
  bank_account_id: string;
  description: string;
  debit_satang: bigint;
  credit_satang: bigint;
  reference: string | null;
  reconciled: boolean;
}

function mapRule(r: RuleRow) {
  return {
    id: r.id,
    priority: r.priority,
    matchType: r.match_type,
    field: r.field,
    pattern: r.pattern,
    minAmountSatang: r.min_amount_satang,
    maxAmountSatang: r.max_amount_satang,
    targetAccountId: r.target_account_id,
    isActive: r.is_active,
    createdAt: toISO(r.created_at),
  };
}

export async function bankMatchingRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // POST /bank-matching-rules
  fastify.post<{ Body: { priority?: number; matchType: string; field?: string; pattern: string; minAmountSatang?: string; maxAmountSatang?: string; targetAccountId: string } }>(
    `${API_V1_PREFIX}/bank-matching-rules`,
    {
      schema: {
        description: 'Create a bank matching rule',
        tags: ['bank'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['matchType', 'pattern', 'targetAccountId'],
          properties: {
            priority: { type: 'integer', default: 0 },
            matchType: { type: 'string', enum: ['exact_amount', 'reference', 'amount_range'] },
            field: { type: 'string', default: 'description' },
            pattern: { type: 'string' },
            minAmountSatang: { type: 'string' },
            maxAmountSatang: { type: 'string' },
            targetAccountId: { type: 'string' },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(FI_BANK_CREATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { priority = 0, matchType, field = 'description', pattern, minAmountSatang, maxAmountSatang, targetAccountId } = request.body;
      const id = crypto.randomUUID();

      await fastify.sql`
        INSERT INTO bank_matching_rules (id, priority, match_type, field, pattern, min_amount_satang, max_amount_satang, target_account_id, tenant_id)
        VALUES (${id}, ${priority}, ${matchType}, ${field}, ${pattern}, ${minAmountSatang ?? null}::bigint, ${maxAmountSatang ?? null}::bigint, ${targetAccountId}, ${tenantId})
      `;

      const rows = await fastify.sql<[RuleRow]>`SELECT * FROM bank_matching_rules WHERE id = ${id}`;
      return reply.status(201).send(mapRule(rows[0]));
    },
  );

  // GET /bank-matching-rules
  fastify.get(
    `${API_V1_PREFIX}/bank-matching-rules`,
    {
      schema: { description: 'List bank matching rules', tags: ['bank'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(FI_BANK_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const rows = await fastify.sql<RuleRow[]>`
        SELECT * FROM bank_matching_rules WHERE tenant_id = ${tenantId} ORDER BY priority ASC
      `;
      return reply.send({ items: rows.map(mapRule), total: rows.length });
    },
  );

  // PUT /bank-matching-rules/:id
  fastify.put<{ Params: { id: string }; Body: { priority?: number; pattern?: string; isActive?: boolean; targetAccountId?: string } }>(
    `${API_V1_PREFIX}/bank-matching-rules/:id`,
    {
      schema: {
        description: 'Update a bank matching rule',
        tags: ['bank'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        body: {
          type: 'object',
          properties: {
            priority: { type: 'integer' },
            pattern: { type: 'string' },
            isActive: { type: 'boolean' },
            targetAccountId: { type: 'string' },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(FI_BANK_CREATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;
      const { priority, pattern, isActive, targetAccountId } = request.body;

      const existing = await fastify.sql<[RuleRow?]>`
        SELECT * FROM bank_matching_rules WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!existing[0]) throw new NotFoundError({ detail: 'Matching rule not found.' });

      await fastify.sql`
        UPDATE bank_matching_rules SET
          priority = COALESCE(${priority ?? null}, priority),
          pattern = COALESCE(${pattern ?? null}, pattern),
          is_active = COALESCE(${isActive ?? null}, is_active),
          target_account_id = COALESCE(${targetAccountId ?? null}, target_account_id),
          updated_at = NOW()
        WHERE id = ${id}
      `;

      const rows = await fastify.sql<[RuleRow]>`SELECT * FROM bank_matching_rules WHERE id = ${id}`;
      return reply.send(mapRule(rows[0]));
    },
  );

  // DELETE /bank-matching-rules/:id
  fastify.delete<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/bank-matching-rules/:id`,
    {
      schema: {
        description: 'Delete a bank matching rule',
        tags: ['bank'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      },
      preHandler: [requireAuth, requirePermission(FI_BANK_CREATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      await fastify.sql`
        DELETE FROM bank_matching_rules WHERE id = ${request.params.id} AND tenant_id = ${tenantId}
      `;
      return reply.status(204).send();
    },
  );

  // POST /bank/:accountId/auto-reconcile — apply rules to unreconciled transactions
  // Rate limit: expensive batch operation
  fastify.post<{ Params: { accountId: string } }>(
    `${API_V1_PREFIX}/bank/:accountId/auto-reconcile`,
    {
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
      schema: {
        description: 'Auto-reconcile unreconciled bank transactions using matching rules',
        tags: ['bank'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['accountId'], properties: { accountId: { type: 'string' } } },
      },
      preHandler: [requireAuth, requirePermission(FI_BANK_RECONCILE)],
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user;
      const { accountId } = request.params;

      // Verify bank account
      const acct = await fastify.sql<[{ id: string }?]>`
        SELECT id FROM bank_accounts WHERE id = ${accountId} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!acct[0]) throw new NotFoundError({ detail: 'Bank account not found.' });

      // Load rules sorted by priority
      const rules = await fastify.sql<RuleRow[]>`
        SELECT * FROM bank_matching_rules
        WHERE tenant_id = ${tenantId} AND is_active = true
        ORDER BY priority ASC
      `;

      // Load unreconciled transactions (capped at 200 per batch)
      const txns = await fastify.sql<BankTxnRow[]>`
        SELECT * FROM bank_transactions
        WHERE bank_account_id = ${accountId} AND reconciled = false
        ORDER BY transaction_date
        LIMIT 200
      `;

      let matchedCount = 0;
      let unmatchedCount = 0;
      const suggestedMatches: Array<{ transactionId: string; ruleId: string; accountId: string }> = [];

      for (const txn of txns) {
        let matched = false;
        const txnAmount = txn.debit_satang > 0n ? txn.debit_satang : txn.credit_satang;

        for (const rule of rules) {
          let isMatch = false;

          if (rule.match_type === 'reference' && txn.reference) {
            // Match reference field against pattern using safe string matching (no regex — prevents ReDoS)
            const fieldValue = (rule.field === 'reference' ? (txn.reference ?? '') : txn.description).toLowerCase();
            isMatch = fieldValue.includes(rule.pattern.toLowerCase());
          } else if (rule.match_type === 'exact_amount') {
            // Match exact amount
            isMatch = txnAmount.toString() === rule.pattern;
          } else if (rule.match_type === 'amount_range') {
            // Match amount within range
            const min = rule.min_amount_satang ? BigInt(rule.min_amount_satang) : 0n;
            const max = rule.max_amount_satang ? BigInt(rule.max_amount_satang) : BigInt('999999999999');
            isMatch = txnAmount >= min && txnAmount <= max;
          }

          if (isMatch) {
            // Create JE for matched transaction
            const jeId = crypto.randomUUID();
            const docNum = `JE-AUTO-${Date.now()}-${matchedCount}`;

            await fastify.sql`
              INSERT INTO journal_entries (id, document_number, description, status, fiscal_year, fiscal_period, tenant_id, created_by, posted_at)
              VALUES (${jeId}, ${docNum}, ${'Auto-reconcile: ' + txn.description}, 'posted',
                ${new Date().getFullYear()}, ${new Date().getMonth() + 1}, ${tenantId}, ${userId}, NOW())
            `;

            // Dr/Cr based on debit/credit
            const line1Id = crypto.randomUUID();
            const line2Id = crypto.randomUUID();

            if (txn.credit_satang > 0n) {
              // Credit to bank = money in → Dr Bank, Cr Target
              await fastify.sql`
                INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang)
                VALUES
                  (${line1Id}, ${jeId}, 1, COALESCE((SELECT gl_account_id FROM bank_accounts WHERE id = ${accountId}), 'unknown'), 'Bank deposit', ${txn.credit_satang.toString()}::bigint, 0::bigint),
                  (${line2Id}, ${jeId}, 2, ${rule.target_account_id}, ${'Matched: ' + rule.pattern}, 0::bigint, ${txn.credit_satang.toString()}::bigint)
              `;
            } else {
              // Debit from bank = money out → Dr Target, Cr Bank
              await fastify.sql`
                INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang)
                VALUES
                  (${line1Id}, ${jeId}, 1, ${rule.target_account_id}, ${'Matched: ' + rule.pattern}, ${txn.debit_satang.toString()}::bigint, 0::bigint),
                  (${line2Id}, ${jeId}, 2, COALESCE((SELECT gl_account_id FROM bank_accounts WHERE id = ${accountId}), 'unknown'), 'Bank withdrawal', 0::bigint, ${txn.debit_satang.toString()}::bigint)
              `;
            }

            // Mark transaction as reconciled
            await fastify.sql`
              UPDATE bank_transactions SET reconciled = true, reconciled_je_id = ${jeId}, updated_at = NOW()
              WHERE id = ${txn.id}
            `;

            matchedCount++;
            matched = true;
            break;
          }
        }

        if (!matched) {
          unmatchedCount++;
          // Try to suggest matches based on partial pattern matching
          for (const rule of rules) {
            if (txn.description.toLowerCase().includes(rule.pattern.toLowerCase())) {
              suggestedMatches.push({ transactionId: txn.id, ruleId: rule.id, accountId: rule.target_account_id });
              break;
            }
          }
        }
      }

      return reply.send({
        matchedCount,
        unmatchedCount,
        suggestedMatches,
        totalProcessed: txns.length,
      });
    },
  );
}
