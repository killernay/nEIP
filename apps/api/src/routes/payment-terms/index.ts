/**
 * Payment Terms routes:
 *   POST /api/v1/payment-terms          — create
 *   GET  /api/v1/payment-terms          — list
 *   GET  /api/v1/payment-terms/:id      — detail
 *   PUT  /api/v1/payment-terms/:id      — update
 *   DELETE /api/v1/payment-terms/:id    — deactivate
 *   POST /api/v1/payment-terms/seed     — seed defaults (NET30, NET60, COD, 2/10NET30)
 *
 * Phase 3.2 — Payment Terms
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import { PRICING_READ, PRICING_MANAGE } from '../../lib/permissions.js';

interface PaymentTermRow {
  id: string; code: string; name: string; days: number;
  discount_percent: number; discount_days: number;
  is_active: boolean; tenant_id: string;
  created_at: Date | string; updated_at: Date | string;
}

interface IdParams { id: string; }

function mapTerm(r: PaymentTermRow) {
  return {
    id: r.id, code: r.code, name: r.name, days: r.days,
    discountPercent: r.discount_percent, discountDays: r.discount_days,
    isActive: r.is_active,
    createdAt: toISO(r.created_at), updatedAt: toISO(r.updated_at),
  };
}

const DEFAULT_TERMS = [
  { code: 'NET30', name: 'Net 30 Days', days: 30, discount_percent: 0, discount_days: 0 },
  { code: 'NET60', name: 'Net 60 Days', days: 60, discount_percent: 0, discount_days: 0 },
  { code: 'COD', name: 'Cash on Delivery', days: 0, discount_percent: 0, discount_days: 0 },
  { code: '2/10NET30', name: '2% 10 Net 30', days: 30, discount_percent: 2, discount_days: 10 },
];

export async function paymentTermRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // POST /payment-terms
  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/payment-terms`,
    {
      schema: { description: 'Create payment term', tags: ['payment-terms'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PRICING_MANAGE)],
    },
    async (request, reply) => {
      const b = request.body;
      const { tenantId } = request.user;
      if (!b['code'] || !b['name']) throw new ValidationError({ detail: 'code and name are required.' });

      const id = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO payment_terms (id, code, name, days, discount_percent, discount_days, tenant_id)
        VALUES (
          ${id}, ${b['code'] as string}, ${b['name'] as string},
          ${Number(b['days'] ?? 30)}, ${Number(b['discountPercent'] ?? 0)},
          ${Number(b['discountDays'] ?? 0)}, ${tenantId}
        )
      `;
      const rows = await fastify.sql<PaymentTermRow[]>`SELECT * FROM payment_terms WHERE id = ${id}`;
      return reply.status(201).send(mapTerm(rows[0]!));
    },
  );

  // POST /payment-terms/seed — seed defaults
  fastify.post(
    `${API_V1_PREFIX}/payment-terms/seed`,
    {
      schema: { description: 'Seed default payment terms (NET30, NET60, COD, 2/10NET30)', tags: ['payment-terms'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PRICING_MANAGE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const created: string[] = [];

      for (const t of DEFAULT_TERMS) {
        const existing = await fastify.sql<[{ id: string }?]>`
          SELECT id FROM payment_terms WHERE code = ${t.code} AND tenant_id = ${tenantId} LIMIT 1
        `;
        if (!existing[0]) {
          const id = crypto.randomUUID();
          await fastify.sql`
            INSERT INTO payment_terms (id, code, name, days, discount_percent, discount_days, tenant_id)
            VALUES (${id}, ${t.code}, ${t.name}, ${t.days}, ${t.discount_percent}, ${t.discount_days}, ${tenantId})
          `;
          created.push(t.code);
        }
      }
      return reply.status(201).send({ seeded: created });
    },
  );

  // GET /payment-terms
  fastify.get<{ Querystring: Record<string, string> }>(
    `${API_V1_PREFIX}/payment-terms`,
    {
      schema: { description: 'List payment terms', tags: ['payment-terms'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PRICING_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const limit = Math.min(Math.max(parseInt(request.query['limit'] ?? '50', 10), 1), 100);
      const offset = Math.max(parseInt(request.query['offset'] ?? '0', 10), 0);

      const countRows = await fastify.sql<[{ count: string }]>`
        SELECT COUNT(*)::text as count FROM payment_terms WHERE tenant_id = ${tenantId} AND is_active = TRUE
      `;
      const total = parseInt(countRows[0]?.count ?? '0', 10);

      const rows = await fastify.sql<PaymentTermRow[]>`
        SELECT * FROM payment_terms WHERE tenant_id = ${tenantId} AND is_active = TRUE ORDER BY code
        LIMIT ${limit} OFFSET ${offset}
      `;
      return reply.send({ items: rows.map(mapTerm), total, limit, offset, hasMore: offset + limit < total });
    },
  );

  // GET /payment-terms/:id
  fastify.get<{ Params: IdParams }>(
    `${API_V1_PREFIX}/payment-terms/:id`,
    {
      schema: { description: 'Get payment term detail', tags: ['payment-terms'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PRICING_READ)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;
      const rows = await fastify.sql<PaymentTermRow[]>`
        SELECT * FROM payment_terms WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!rows[0]) throw new NotFoundError({ detail: `Payment term ${id} not found.` });
      return reply.send(mapTerm(rows[0]));
    },
  );

  // PUT /payment-terms/:id
  fastify.put<{ Params: IdParams; Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/payment-terms/:id`,
    {
      schema: { description: 'Update payment term', tags: ['payment-terms'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PRICING_MANAGE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const b = request.body;
      const { tenantId } = request.user;

      const rows = await fastify.sql<PaymentTermRow[]>`
        UPDATE payment_terms SET
          code = COALESCE(${(b['code'] as string) ?? null}, code),
          name = COALESCE(${(b['name'] as string) ?? null}, name),
          days = COALESCE(${b['days'] != null ? Number(b['days']) : null}, days),
          discount_percent = COALESCE(${b['discountPercent'] != null ? Number(b['discountPercent']) : null}, discount_percent),
          discount_days = COALESCE(${b['discountDays'] != null ? Number(b['discountDays']) : null}, discount_days),
          updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `;
      if (!rows[0]) throw new NotFoundError({ detail: `Payment term ${id} not found.` });
      return reply.send(mapTerm(rows[0]));
    },
  );

  // DELETE /payment-terms/:id (soft)
  fastify.delete<{ Params: IdParams }>(
    `${API_V1_PREFIX}/payment-terms/:id`,
    {
      schema: { description: 'Deactivate payment term', tags: ['payment-terms'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PRICING_MANAGE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;
      const rows = await fastify.sql<PaymentTermRow[]>`
        UPDATE payment_terms SET is_active = FALSE, updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} RETURNING *
      `;
      if (!rows[0]) throw new NotFoundError({ detail: `Payment term ${id} not found.` });
      return reply.send({ id, deleted: true });
    },
  );
}
