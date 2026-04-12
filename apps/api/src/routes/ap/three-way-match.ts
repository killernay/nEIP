/**
 * 3-Way Matching route:
 *   GET /api/v1/ap/bills/:id/match-status — compare PO vs GR vs Bill quantities
 *
 * Phase 3.4 — 3-Way Matching
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { AP_BILL_READ, AP_BILL_APPROVE } from '../../lib/permissions.js';

interface IdParams { id: string; }

interface BillRow {
  id: string; vendor_id: string; purchase_order_id: string | null;
  total_satang: bigint; match_status: string | null; status: string;
  tenant_id: string;
}

interface BillLineRow {
  id: string; line_number: number; description: string;
  amount_satang: bigint; account_id: string;
}

interface POLineRow {
  id: string; line_number: number; description: string;
  quantity: number; received_quantity: number;
  unit_price_satang: bigint; amount_satang: bigint;
}

export async function threeWayMatchRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // GET /ap/bills/:id/match-status
  fastify.get<{ Params: IdParams }>(
    `${API_V1_PREFIX}/ap/bills/:id/match-status`,
    {
      schema: {
        description: '3-way match: compare PO quantities vs GR (received) quantities vs Bill amounts',
        tags: ['ap'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(AP_BILL_READ)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const billRows = await fastify.sql<BillRow[]>`
        SELECT id, vendor_id, purchase_order_id, total_satang, match_status, status, tenant_id
        FROM bills WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      const bill = billRows[0];
      if (!bill) throw new NotFoundError({ detail: `Bill ${id} not found.` });

      const billLines = await fastify.sql<BillLineRow[]>`
        SELECT id, line_number, description, amount_satang, account_id
        FROM bill_line_items WHERE bill_id = ${id} ORDER BY line_number
      `;

      // If no PO linked, match status is N/A
      if (!bill.purchase_order_id) {
        return reply.send({
          billId: id,
          matchStatus: 'no_po',
          purchaseOrderId: null,
          lines: billLines.map((l) => ({
            lineNumber: l.line_number,
            description: l.description,
            billAmountSatang: l.amount_satang.toString(),
            poQuantity: null,
            receivedQuantity: null,
            status: 'no_po',
          })),
        });
      }

      // Get PO lines
      const poLines = await fastify.sql<POLineRow[]>`
        SELECT id, line_number, description, quantity, received_quantity,
               unit_price_satang, amount_satang
        FROM purchase_order_lines
        WHERE purchase_order_id = ${bill.purchase_order_id}
        ORDER BY line_number
      `;

      // Match by line number
      let overallStatus: 'matched' | 'quantity_mismatch' | 'price_mismatch' | 'unmatched' = 'matched';
      const matchedLines = billLines.map((bl, idx) => {
        const poLine = poLines[idx];
        if (!poLine) {
          overallStatus = 'unmatched';
          return {
            lineNumber: bl.line_number,
            description: bl.description,
            billAmountSatang: bl.amount_satang.toString(),
            poQuantity: null,
            poAmountSatang: null,
            receivedQuantity: null,
            status: 'unmatched' as const,
          };
        }

        const poTotal = BigInt(poLine.amount_satang);
        const billTotal = BigInt(bl.amount_satang);
        const qtyMatch = poLine.received_quantity >= poLine.quantity;
        const priceMatch = poTotal === billTotal;

        let lineStatus: 'matched' | 'quantity_mismatch' | 'price_mismatch' = 'matched';
        if (!qtyMatch) {
          lineStatus = 'quantity_mismatch';
          if (overallStatus === 'matched') overallStatus = 'quantity_mismatch';
        }
        if (!priceMatch) {
          lineStatus = 'price_mismatch';
          overallStatus = 'price_mismatch';
        }

        return {
          lineNumber: bl.line_number,
          description: bl.description,
          billAmountSatang: billTotal.toString(),
          poQuantity: poLine.quantity,
          poAmountSatang: poTotal.toString(),
          receivedQuantity: poLine.received_quantity,
          status: lineStatus,
        };
      });

      // Update bill match_status
      await fastify.sql`
        UPDATE bills SET match_status = ${overallStatus}, updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `;

      return reply.send({
        billId: id,
        matchStatus: overallStatus,
        purchaseOrderId: bill.purchase_order_id,
        lines: matchedLines,
      });
    },
  );

  // POST /ap/bills/:id/match-override — override match status (requires approval)
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/ap/bills/:id/match-override`,
    {
      schema: {
        description: 'Override match status to allow payment on unmatched bills',
        tags: ['ap'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(AP_BILL_APPROVE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const rows = await fastify.sql<BillRow[]>`
        UPDATE bills SET match_status = 'overridden', updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `;
      if (!rows[0]) throw new NotFoundError({ detail: `Bill ${id} not found.` });

      return reply.send({ billId: id, matchStatus: 'overridden' });
    },
  );
}
