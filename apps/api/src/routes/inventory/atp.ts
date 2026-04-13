/**
 * Available-to-Promise (ATP) routes:
 *   GET /api/v1/inventory/atp/:productId — check ATP for a product
 *
 * ATP = On Hand - Reserved - Open SO Quantities
 * If ATP < requested quantity, return expected available date from open POs/production orders.
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { INV_ATP_READ } from '../../lib/permissions.js';

export async function atpRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  fastify.get(
    `${API_V1_PREFIX}/inventory/atp/:productId`,
    {
      schema: {
        description: 'Available-to-Promise check for a product',
        tags: ['inventory'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            quantity: { type: 'number', description: 'Requested quantity' },
            warehouseId: { type: 'string', description: 'Specific warehouse (optional)' },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(INV_ATP_READ)],
    },
    async (request) => {
      const { tenantId } = request.user;
      const { productId } = request.params as { productId: string };
      const q = request.query as { quantity?: number; warehouseId?: string };
      const requestedQty = Number(q.quantity) || 1;

      // Verify product exists
      const productRows = await fastify.sql<{ id: string; name_th: string }[]>`
        SELECT id, name_th FROM products WHERE id = ${productId} AND tenant_id = ${tenantId}`;
      if (!productRows[0]) throw new NotFoundError({ detail: 'Product not found' });
      const product = productRows[0];

      // Current stock on hand
      const warehouseFilter = q.warehouseId
        ? fastify.sql`AND warehouse_id = ${q.warehouseId}`
        : fastify.sql``;

      const stockRows = await fastify.sql<{ on_hand: string; reserved: string }[]>`
        SELECT
          COALESCE(SUM(quantity_on_hand), 0)::text AS on_hand,
          COALESCE(SUM(quantity_reserved), 0)::text AS reserved
        FROM stock_levels
        WHERE product_id = ${productId} AND tenant_id = ${tenantId}
        ${warehouseFilter}`;

      const onHand = Number(stockRows[0]?.on_hand ?? '0');
      const reserved = Number(stockRows[0]?.reserved ?? '0');

      // Open SO quantities (confirmed but not yet delivered)
      const soRows = await fastify.sql<{ qty: string }[]>`
        SELECT COALESCE(SUM(sol.quantity), 0)::text AS qty
        FROM sales_order_lines sol
        JOIN sales_orders so ON so.id = sol.sales_order_id
        WHERE so.tenant_id = ${tenantId}
          AND so.status IN ('confirmed','partial_delivered')
          AND sol.product_id = ${productId}`;
      const openSoQty = Number(soRows[0]?.qty ?? '0');

      // ATP = on_hand - reserved - open_so_qty
      const available = onHand - reserved - openSoQty;

      // Determine ATP status
      let atpStatus: string;
      if (available >= requestedQty) {
        atpStatus = 'available';
      } else if (available > 0) {
        atpStatus = 'partial';
      } else {
        atpStatus = 'unavailable';
      }

      // If not fully available, check expected replenishment
      let expectedAvailableDate: string | null = null;
      if (available < requestedQty) {
        // Check open POs with expected dates
        const poRows = await fastify.sql<{ expected_date: string; pending_qty: string }[]>`
          SELECT po.expected_date::text, (pol.quantity - COALESCE(pol.received_quantity, 0))::text AS pending_qty
          FROM purchase_order_lines pol
          JOIN purchase_orders po ON po.id = pol.purchase_order_id
          WHERE po.tenant_id = ${tenantId}
            AND po.status IN ('sent','partial_received')
            AND pol.product_id = ${productId}
            AND po.expected_date IS NOT NULL
          ORDER BY po.expected_date ASC`;

        // Check production orders
        const prodRows = await fastify.sql<{ planned_end: string; pending_qty: string }[]>`
          SELECT po.planned_end_date::text AS planned_end,
            (po.quantity - COALESCE(po.completed_quantity, 0))::text AS pending_qty
          FROM production_orders po
          WHERE po.tenant_id = ${tenantId}
            AND po.status IN ('released','in_progress')
            AND po.product_id = ${productId}
            AND po.planned_end_date IS NOT NULL
          ORDER BY po.planned_end_date ASC`;

        // Merge and find earliest date that covers the shortage
        type Supply = { date: string; qty: number };
        const incoming: Supply[] = [
          ...poRows.map(r => ({ date: r.expected_date, qty: Number(r.pending_qty) })),
          ...prodRows.map(r => ({ date: r.planned_end, qty: Number(r.pending_qty) })),
        ].sort((a, b) => a.date.localeCompare(b.date));

        let cumulative = available;
        for (const supply of incoming) {
          cumulative += supply.qty;
          if (cumulative >= requestedQty) {
            expectedAvailableDate = supply.date;
            break;
          }
        }
      }

      return {
        productId,
        productName: product.name_th,
        warehouseId: q.warehouseId ?? null,
        requestedQuantity: requestedQty,
        onHand,
        reserved,
        openSalesOrderQuantity: openSoQty,
        availableToPromise: available,
        atpStatus,
        expectedAvailableDate,
      };
    },
  );
}
