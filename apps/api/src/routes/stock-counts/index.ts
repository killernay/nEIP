/**
 * Physical Inventory / Stock Count routes (MM-IM):
 *   POST /api/v1/stock-counts                        — create count
 *   GET  /api/v1/stock-counts                        — list
 *   GET  /api/v1/stock-counts/:id                    — detail with lines
 *   POST /api/v1/stock-counts/:id/enter              — enter actual quantities
 *   POST /api/v1/stock-counts/:id/post               — post adjustments (stock_movements + JE for variance)
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, ConflictError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';

const INV_COUNT_CREATE = 'inventory:count:create' as const;
const INV_COUNT_READ   = 'inventory:count:read'   as const;
const INV_COUNT_POST   = 'inventory:count:post'   as const;

interface ScRow {
  id: string; document_number: string; warehouse_id: string;
  count_date: string; status: string; notes: string | null;
  tenant_id: string; created_by: string | null; posted_at: Date | string | null;
  created_at: Date | string; updated_at: Date | string;
}

interface ScLineRow {
  id: string; stock_count_id: string; product_id: string;
  book_quantity: number; actual_quantity: number | null; variance: number | null;
}

interface CountRow { count: string; }

function generateDocNumber(prefix: string): string {
  const yyyymmdd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seq = String(Date.now()).slice(-3);
  return `${prefix}-${yyyymmdd}-${seq}`;
}

function mapSc(r: ScRow, lines: ScLineRow[] = []) {
  return {
    id: r.id, documentNumber: r.document_number, warehouseId: r.warehouse_id,
    countDate: r.count_date, status: r.status, notes: r.notes,
    postedAt: r.posted_at ? toISO(r.posted_at) : null,
    lines: lines.map((l) => ({
      id: l.id, productId: l.product_id,
      bookQuantity: l.book_quantity,
      actualQuantity: l.actual_quantity,
      variance: l.variance,
    })),
    createdAt: toISO(r.created_at), updatedAt: toISO(r.updated_at),
  };
}

export async function stockCountRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // POST — create
  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/stock-counts`,
    {
      schema: { description: 'สร้างรายการตรวจนับสต็อก — Create a stock count', tags: ['inventory'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(INV_COUNT_CREATE)],
    },
    async (request, reply) => {
      const b = request.body;
      const { tenantId, sub: userId } = request.user;

      const warehouseId = b['warehouseId'] as string;
      if (!warehouseId) throw new ValidationError({ detail: 'warehouseId is required.' });

      const countDate = (b['countDate'] as string) ?? new Date().toISOString().slice(0, 10);
      const scId = crypto.randomUUID();
      const documentNumber = generateDocNumber('SC');

      await fastify.sql`
        INSERT INTO stock_counts (id, document_number, warehouse_id, count_date, status, notes, tenant_id, created_by)
        VALUES (${scId}, ${documentNumber}, ${warehouseId}, ${countDate}, 'open',
                ${(b['notes'] as string | undefined) ?? null}, ${tenantId}, ${userId})
      `;

      // Auto-populate lines from current stock levels
      const stockLevels = await fastify.sql<{ product_id: string; quantity_on_hand: number }[]>`
        SELECT product_id, quantity_on_hand FROM stock_levels WHERE warehouse_id = ${warehouseId}
      `;

      for (const sl of stockLevels) {
        await fastify.sql`
          INSERT INTO stock_count_lines (id, stock_count_id, product_id, book_quantity)
          VALUES (${crypto.randomUUID()}, ${scId}, ${sl.product_id}, ${sl.quantity_on_hand})
        `;
      }

      // Also add product IDs from request if specified
      const productIds = b['productIds'] as string[] | undefined;
      if (productIds) {
        for (const pid of productIds) {
          const exists = await fastify.sql<[{ id: string }?]>`SELECT id FROM stock_count_lines WHERE stock_count_id = ${scId} AND product_id = ${pid} LIMIT 1`;
          if (!exists[0]) {
            await fastify.sql`
              INSERT INTO stock_count_lines (id, stock_count_id, product_id, book_quantity)
              VALUES (${crypto.randomUUID()}, ${scId}, ${pid}, 0)
            `;
          }
        }
      }

      const rows = await fastify.sql<[ScRow]>`SELECT * FROM stock_counts WHERE id = ${scId} LIMIT 1`;
      const lines = await fastify.sql<ScLineRow[]>`SELECT * FROM stock_count_lines WHERE stock_count_id = ${scId}`;
      return reply.status(201).send(mapSc(rows[0], lines));
    },
  );

  // GET — list
  fastify.get<{ Querystring: Record<string, string> }>(
    `${API_V1_PREFIX}/stock-counts`,
    {
      schema: { description: 'รายการตรวจนับสต็อก — List stock counts', tags: ['inventory'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(INV_COUNT_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const limit = parseInt(request.query['limit'] ?? '20', 10);
      const offset = parseInt(request.query['offset'] ?? '0', 10);

      const countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM stock_counts WHERE tenant_id = ${tenantId}`;
      const rows = await fastify.sql<ScRow[]>`SELECT * FROM stock_counts WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;

      const total = parseInt(countRows[0]?.count ?? '0', 10);
      return reply.status(200).send({ items: rows.map((r) => mapSc(r)), total, limit, offset, hasMore: offset + limit < total });
    },
  );

  // GET /:id — detail
  fastify.get<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/stock-counts/:id`,
    {
      schema: { description: 'ดูรายละเอียดตรวจนับสต็อก — Get stock count detail', tags: ['inventory'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(INV_COUNT_READ)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;
      const rows = await fastify.sql<[ScRow?]>`SELECT * FROM stock_counts WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
      if (!rows[0]) throw new NotFoundError({ detail: `Stock count ${id} not found.` });
      const lines = await fastify.sql<ScLineRow[]>`SELECT * FROM stock_count_lines WHERE stock_count_id = ${id}`;
      return reply.status(200).send(mapSc(rows[0], lines));
    },
  );

  // POST /:id/enter — enter actual quantities
  fastify.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/stock-counts/:id/enter`,
    {
      schema: { description: 'บันทึกจำนวนจริง — Enter actual quantities', tags: ['inventory'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(INV_COUNT_CREATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const b = request.body;
      const { tenantId } = request.user;

      const scRows = await fastify.sql<[ScRow?]>`SELECT * FROM stock_counts WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
      if (!scRows[0]) throw new NotFoundError({ detail: `Stock count ${id} not found.` });
      if (scRows[0].status === 'posted') throw new ConflictError({ detail: 'Stock count is already posted.' });

      const entries = b['entries'] as Array<{ productId: string; actualQuantity: number }>;
      if (!entries || entries.length === 0) throw new ValidationError({ detail: 'At least one entry is required.' });

      for (const entry of entries) {
        const lineRows = await fastify.sql<[ScLineRow?]>`
          SELECT * FROM stock_count_lines WHERE stock_count_id = ${id} AND product_id = ${entry.productId} LIMIT 1
        `;
        if (lineRows[0]) {
          const variance = entry.actualQuantity - lineRows[0].book_quantity;
          await fastify.sql`
            UPDATE stock_count_lines SET actual_quantity = ${entry.actualQuantity}, variance = ${variance}
            WHERE stock_count_id = ${id} AND product_id = ${entry.productId}
              AND stock_count_id IN (SELECT sc.id FROM stock_counts sc WHERE sc.id = ${id} AND sc.tenant_id = ${tenantId})
          `;
        } else {
          await fastify.sql`
            INSERT INTO stock_count_lines (id, stock_count_id, product_id, book_quantity, actual_quantity, variance)
            VALUES (${crypto.randomUUID()}, ${id}, ${entry.productId}, 0, ${entry.actualQuantity}, ${entry.actualQuantity})
          `;
        }
      }

      // Update status to counting
      if (scRows[0].status === 'open') {
        await fastify.sql`UPDATE stock_counts SET status = 'counting', updated_at = NOW() WHERE id = ${id} AND tenant_id = ${tenantId}`;
      }

      const updated = await fastify.sql<[ScRow]>`SELECT * FROM stock_counts WHERE id = ${id} LIMIT 1`;
      const lines = await fastify.sql<ScLineRow[]>`SELECT * FROM stock_count_lines WHERE stock_count_id = ${id}`;
      return reply.status(200).send(mapSc(updated[0], lines));
    },
  );

  // POST /:id/post — post adjustments
  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/stock-counts/:id/post`,
    {
      schema: { description: 'ผ่านรายการปรับสต็อก — Post stock count adjustments', tags: ['inventory'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(INV_COUNT_POST)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId, sub: userId } = request.user;

      const scRows = await fastify.sql<[ScRow?]>`SELECT * FROM stock_counts WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
      if (!scRows[0]) throw new NotFoundError({ detail: `Stock count ${id} not found.` });
      if (scRows[0].status === 'posted') throw new ConflictError({ detail: 'Stock count is already posted.' });

      const lines = await fastify.sql<ScLineRow[]>`SELECT * FROM stock_count_lines WHERE stock_count_id = ${id}`;
      const unenteredLines = lines.filter((l) => l.actual_quantity === null);
      if (unenteredLines.length > 0) throw new ValidationError({ detail: `${unenteredLines.length} lines have no actual quantity entered.` });

      const warehouseId = scRows[0].warehouse_id;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await fastify.sql.begin(async (sql: any) => {
        // Create stock movements for variances and update stock levels
        for (const line of lines) {
          if (line.variance === null || line.variance === 0) continue;

          const movementType = line.variance! > 0 ? 'adjustment_in' : 'adjustment_out';
          const absVariance = Math.abs(line.variance!);

          await sql`
            INSERT INTO stock_levels (product_id, warehouse_id, quantity_on_hand, quantity_reserved, quantity_available)
            VALUES (${line.product_id}, ${warehouseId}, ${line.actual_quantity!}, 0, ${line.actual_quantity!})
            ON CONFLICT (product_id, warehouse_id)
            DO UPDATE SET
              quantity_on_hand = ${line.actual_quantity!},
              quantity_available = ${line.actual_quantity!} - stock_levels.quantity_reserved
          `;

          await sql`
            INSERT INTO stock_movements (id, product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, balance_after, tenant_id, created_by)
            VALUES (${crypto.randomUUID()}, ${line.product_id}, ${warehouseId}, ${movementType}, ${absVariance},
                    'stock_count', ${id}, ${line.actual_quantity!}, ${tenantId}, ${userId})
          `;
        }

        // Create JE for inventory variance
        const varianceLines = lines.filter((l) => l.variance !== null && l.variance !== 0);
        if (varianceLines.length > 0) {
          const invAcctRows = await sql<[{ id: string }?]>`
            SELECT id FROM chart_of_accounts WHERE tenant_id = ${tenantId} AND code LIKE '1300%' AND account_type = 'asset' AND is_active = true ORDER BY code LIMIT 1
          `;
          const varAcctRows = await sql<[{ id: string }?]>`
            SELECT id FROM chart_of_accounts WHERE tenant_id = ${tenantId} AND code LIKE '5100%' AND account_type = 'expense' AND is_active = true ORDER BY code LIMIT 1
          `;

          if (invAcctRows[0] && varAcctRows[0]) {
            const jeId = crypto.randomUUID();
            const now = new Date();
            const fiscalYear = now.getFullYear();
            const fiscalPeriod = now.getMonth() + 1;

            let totalVarianceSatang = 0n;
            for (const vl of varianceLines) {
              const productCost = await sql<[{ cost_price_satang: string }?]>`
                SELECT cost_price_satang::text FROM products WHERE id = ${vl.product_id} LIMIT 1
              `;
              const unitCost = BigInt(productCost[0]?.cost_price_satang ?? '0');
              totalVarianceSatang += BigInt(Math.abs(vl.variance!)) * unitCost;
            }

            await sql`
              INSERT INTO journal_entries (id, document_number, description, status, fiscal_year, fiscal_period, tenant_id, created_by, posted_at)
              VALUES (${jeId}, ${'SC-' + Date.now()}, ${'Stock count variance: ' + scRows[0]!.document_number},
                      'posted', ${fiscalYear}, ${fiscalPeriod}, ${tenantId}, ${userId}, NOW())
            `;

            const netVariance = varianceLines.reduce((sum, l) => sum + (l.variance ?? 0), 0);
            if (netVariance > 0) {
              await sql`INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang)
                VALUES (${crypto.randomUUID()}, ${jeId}, 1, ${invAcctRows[0].id}, 'Inventory adjustment (gain)', ${totalVarianceSatang.toString()}::bigint, 0)`;
              await sql`INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang)
                VALUES (${crypto.randomUUID()}, ${jeId}, 2, ${varAcctRows[0].id}, 'Inventory variance', 0, ${totalVarianceSatang.toString()}::bigint)`;
            } else {
              await sql`INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang)
                VALUES (${crypto.randomUUID()}, ${jeId}, 1, ${varAcctRows[0].id}, 'Inventory variance (loss)', ${totalVarianceSatang.toString()}::bigint, 0)`;
              await sql`INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang)
                VALUES (${crypto.randomUUID()}, ${jeId}, 2, ${invAcctRows[0].id}, 'Inventory adjustment', 0, ${totalVarianceSatang.toString()}::bigint)`;
            }

            request.log.info({ stockCountId: id, jeId, tenantId }, 'Stock count variance JE created');
          }
        }

        // Mark stock count as posted
        await sql`UPDATE stock_counts SET status = 'posted', posted_at = NOW(), updated_at = NOW() WHERE id = ${id} AND tenant_id = ${tenantId}`;
      });

      const updated = await fastify.sql<[ScRow]>`SELECT * FROM stock_counts WHERE id = ${id} LIMIT 1`;
      const updatedLines = await fastify.sql<ScLineRow[]>`SELECT * FROM stock_count_lines WHERE stock_count_id = ${id}`;
      request.log.info({ stockCountId: id, tenantId }, 'Stock count posted');
      return reply.status(200).send(mapSc(updated[0], updatedLines));
    },
  );
}
