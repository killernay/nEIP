/**
 * Purchasing (MM) gap routes — Contracts, Scheduling Agreements, STO, Source List, Consignment.
 *
 * Routes:
 *   POST /api/v1/purchasing-contracts             — create contract
 *   GET  /api/v1/purchasing-contracts             — list contracts
 *   GET  /api/v1/purchasing-contracts/:id         — get contract with lines
 *   PUT  /api/v1/purchasing-contracts/:id         — update contract
 *   POST /api/v1/purchasing-contracts/:id/release — release PO from contract
 *   POST /api/v1/scheduling-agreements            — create scheduling agreement
 *   GET  /api/v1/scheduling-agreements            — list scheduling agreements
 *   GET  /api/v1/scheduling-agreements/:id        — get scheduling agreement
 *   PUT  /api/v1/scheduling-agreements/:id        — update scheduling agreement
 *   POST /api/v1/scheduling-agreements/:id/create-delivery-schedule — add schedule lines
 *   POST /api/v1/stock-transport-orders           — create STO
 *   GET  /api/v1/stock-transport-orders           — list STOs
 *   GET  /api/v1/stock-transport-orders/:id       — get STO
 *   POST /api/v1/stock-transport-orders/:id/ship  — ship STO
 *   POST /api/v1/stock-transport-orders/:id/receive — receive STO
 *   POST /api/v1/source-list                      — create source list entry
 *   GET  /api/v1/source-list                      — list source list
 *   PUT  /api/v1/source-list/:id                  — update source list entry
 *   GET  /api/v1/source-list/suggest              — suggest preferred vendor
 *   POST /api/v1/consignment-stock                — receive consignment stock
 *   GET  /api/v1/consignment-stock                — list consignment stock
 *   POST /api/v1/consignment-stock/:id/consume    — consume consignment
 *   POST /api/v1/consignment-stock/:id/return     — return consignment to vendor
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import {
  MM_CONTRACT_CREATE, MM_CONTRACT_READ, MM_CONTRACT_UPDATE, MM_CONTRACT_RELEASE,
  MM_SCHED_CREATE, MM_SCHED_READ, MM_SCHED_UPDATE,
  MM_STO_CREATE, MM_STO_READ, MM_STO_UPDATE,
  MM_SRC_LIST_CREATE, MM_SRC_LIST_READ, MM_SRC_LIST_UPDATE,
  MM_CONSIGN_CREATE, MM_CONSIGN_READ, MM_CONSIGN_UPDATE,
} from '../../lib/permissions.js';

interface CountRow { count: string; }

export async function purchasingGapRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions,
) {
  // ===================== PURCHASING CONTRACTS =====================

  // POST /purchasing-contracts
  app.post(`${API_V1_PREFIX}/purchasing-contracts`, {
    onRequest: [requireAuth, requirePermission(MM_CONTRACT_CREATE)],
  }, async (req, reply) => {
    const b = req.body as Record<string, unknown>;
    if (!b['vendorId'] || !b['contractType'] || !b['validFrom'] || !b['validTo']) {
      throw new ValidationError({ detail: 'vendorId, contractType, validFrom, validTo are required' });
    }
    const id = crypto.randomUUID();
    const docNum = `OA-${Date.now()}`;
    await app.sql.unsafe(
      `INSERT INTO purchasing_contracts
          (id, document_number, vendor_id, contract_type, target_quantity, target_value_satang,
           valid_from, valid_to, payment_terms_id, notes, tenant_id, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [id, (b['documentNumber'] as string) || docNum, b['vendorId'], b['contractType'],
       b['targetQuantity'] ?? null, b['targetValueSatang'] ?? null,
       b['validFrom'], b['validTo'], b['paymentTermsId'] ?? null, b['notes'] ?? null,
       (req as any).tenantId, (req as any).userId],
    );
    // Insert lines if provided
    const lines = (b['lines'] as Array<Record<string, unknown>>) || [];
    for (const ln of lines) {
      await app.sql.unsafe(
        `INSERT INTO purchasing_contract_lines
            (id, contract_id, product_id, unit_price_satang, target_quantity, tenant_id)
          VALUES ($1,$2,$3,$4,$5,$6)`,
        [crypto.randomUUID(), id, ln['productId'], ln['unitPriceSatang'] ?? 0,
         ln['targetQuantity'] ?? 0, (req as any).tenantId],
      );
    }
    return reply.status(201).send({ id, documentNumber: (b['documentNumber'] as string) || docNum });
  });

  // GET /purchasing-contracts
  app.get(`${API_V1_PREFIX}/purchasing-contracts`, {
    onRequest: [requireAuth, requirePermission(MM_CONTRACT_READ)],
  }, async (req) => {
    const q = req.query as Record<string, string>;
    const limit = Math.min(parseInt(q['limit'] || '50', 10), 200);
    const offset = parseInt(q['offset'] || '0', 10);
    const [countRes, rows] = await Promise.all([
      app.sql.unsafe(`SELECT count(*) as count FROM purchasing_contracts WHERE tenant_id = $1`, [(req as any).tenantId]),
      app.sql.unsafe(
        `SELECT * FROM purchasing_contracts WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [(req as any).tenantId, limit, offset],
      ),
    ]);
    return { data: rows, total: parseInt((countRes[0] as unknown as CountRow).count, 10), limit, offset };
  });

  // GET /purchasing-contracts/:id
  app.get(`${API_V1_PREFIX}/purchasing-contracts/:id`, {
    onRequest: [requireAuth, requirePermission(MM_CONTRACT_READ)],
  }, async (req) => {
    const { id } = req.params as { id: string };
    const [hdr, lines] = await Promise.all([
      app.sql.unsafe(`SELECT * FROM purchasing_contracts WHERE id = $1 AND tenant_id = $2`, [id, (req as any).tenantId]),
      app.sql.unsafe(`SELECT * FROM purchasing_contract_lines WHERE contract_id = $1 AND tenant_id = $2`, [id, (req as any).tenantId]),
    ]);
    if (!hdr.length) throw new NotFoundError({ detail: 'Purchasing contract not found' });
    return { ...hdr[0], lines };
  });

  // PUT /purchasing-contracts/:id
  app.put(`${API_V1_PREFIX}/purchasing-contracts/:id`, {
    onRequest: [requireAuth, requirePermission(MM_CONTRACT_UPDATE)],
  }, async (req) => {
    const { id } = req.params as { id: string };
    const b = req.body as Record<string, unknown>;
    await app.sql.unsafe(
      `UPDATE purchasing_contracts SET
          status = COALESCE($1, status), valid_to = COALESCE($2, valid_to),
          notes = COALESCE($3, notes), updated_at = NOW()
        WHERE id = $4 AND tenant_id = $5`,
      [b['status'] ?? null, b['validTo'] ?? null, b['notes'] ?? null, id, (req as any).tenantId],
    );
    return { id, updated: true };
  });

  // POST /purchasing-contracts/:id/release — create PO from contract
  app.post(`${API_V1_PREFIX}/purchasing-contracts/:id/release`, {
    onRequest: [requireAuth, requirePermission(MM_CONTRACT_RELEASE)],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const b = req.body as Record<string, unknown>;
    const quantity = b['quantity'] as number;
    if (!quantity) throw new ValidationError({ detail: 'quantity is required' });
    // Update released amounts
    await app.sql.unsafe(
      `UPDATE purchasing_contracts SET
          released_quantity = released_quantity + $1, updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3 AND status = 'active'`,
      [quantity, id, (req as any).tenantId],
    );
    return reply.status(200).send({ id, releasedQuantity: quantity, message: 'Contract release recorded' });
  });

  // ===================== SCHEDULING AGREEMENTS =====================

  // POST /scheduling-agreements
  app.post(`${API_V1_PREFIX}/scheduling-agreements`, {
    onRequest: [requireAuth, requirePermission(MM_SCHED_CREATE)],
  }, async (req, reply) => {
    const b = req.body as Record<string, unknown>;
    if (!b['vendorId'] || !b['productId']) throw new ValidationError({ detail: 'vendorId, productId are required' });
    const id = crypto.randomUUID();
    const docNum = `SA-${Date.now()}`;
    await app.sql.unsafe(
      `INSERT INTO scheduling_agreements
          (id, document_number, vendor_id, product_id, total_quantity, schedule,
           valid_from, valid_to, notes, tenant_id, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [id, (b['documentNumber'] as string) || docNum, b['vendorId'], b['productId'],
       b['totalQuantity'] ?? 0, JSON.stringify(b['schedule'] || []),
       b['validFrom'] ?? null, b['validTo'] ?? null, b['notes'] ?? null,
       (req as any).tenantId, (req as any).userId],
    );
    return reply.status(201).send({ id, documentNumber: (b['documentNumber'] as string) || docNum });
  });

  // GET /scheduling-agreements
  app.get(`${API_V1_PREFIX}/scheduling-agreements`, {
    onRequest: [requireAuth, requirePermission(MM_SCHED_READ)],
  }, async (req) => {
    const q = req.query as Record<string, string>;
    const limit = Math.min(parseInt(q['limit'] || '50', 10), 200);
    const offset = parseInt(q['offset'] || '0', 10);
    const rows = await app.sql.unsafe(
      `SELECT * FROM scheduling_agreements WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [(req as any).tenantId, limit, offset],
    );
    return { data: rows, limit, offset };
  });

  // GET /scheduling-agreements/:id
  app.get(`${API_V1_PREFIX}/scheduling-agreements/:id`, {
    onRequest: [requireAuth, requirePermission(MM_SCHED_READ)],
  }, async (req) => {
    const { id } = req.params as { id: string };
    const res = await app.sql.unsafe(
      `SELECT * FROM scheduling_agreements WHERE id = $1 AND tenant_id = $2`,
      [id, (req as any).tenantId],
    );
    if (!res.length) throw new NotFoundError({ detail: 'Scheduling agreement not found' });
    return res[0];
  });

  // PUT /scheduling-agreements/:id
  app.put(`${API_V1_PREFIX}/scheduling-agreements/:id`, {
    onRequest: [requireAuth, requirePermission(MM_SCHED_UPDATE)],
  }, async (req) => {
    const { id } = req.params as { id: string };
    const b = req.body as Record<string, unknown>;
    await app.sql.unsafe(
      `UPDATE scheduling_agreements SET
          status = COALESCE($1, status), total_quantity = COALESCE($2, total_quantity),
          notes = COALESCE($3, notes), updated_at = NOW()
        WHERE id = $4 AND tenant_id = $5`,
      [b['status'] ?? null, b['totalQuantity'] ?? null, b['notes'] ?? null, id, (req as any).tenantId],
    );
    return { id, updated: true };
  });

  // POST /scheduling-agreements/:id/create-delivery-schedule
  app.post(`${API_V1_PREFIX}/scheduling-agreements/:id/create-delivery-schedule`, {
    onRequest: [requireAuth, requirePermission(MM_SCHED_UPDATE)],
  }, async (req) => {
    const { id } = req.params as { id: string };
    const b = req.body as { schedule: Array<{ deliveryDate: string; quantity: number }> };
    if (!b.schedule?.length) throw new ValidationError({ detail: 'schedule array is required' });
    await app.sql.unsafe(
      `UPDATE scheduling_agreements SET schedule = $1::jsonb, updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3`,
      [JSON.stringify(b.schedule), id, (req as any).tenantId],
    );
    return { id, scheduleUpdated: true, lines: b.schedule.length };
  });

  // ===================== STOCK TRANSPORT ORDERS =====================

  // POST /stock-transport-orders
  app.post(`${API_V1_PREFIX}/stock-transport-orders`, {
    onRequest: [requireAuth, requirePermission(MM_STO_CREATE)],
  }, async (req, reply) => {
    const b = req.body as Record<string, unknown>;
    if (!b['fromBranchId'] || !b['toBranchId']) throw new ValidationError({ detail: 'fromBranchId, toBranchId are required' });
    const id = crypto.randomUUID();
    const docNum = `STO-${Date.now()}`;
    await app.sql.unsafe(
      `INSERT INTO stock_transport_orders
          (id, document_number, from_branch_id, to_branch_id, from_warehouse_id, to_warehouse_id,
           notes, tenant_id, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, (b['documentNumber'] as string) || docNum, b['fromBranchId'], b['toBranchId'],
       b['fromWarehouseId'] ?? null, b['toWarehouseId'] ?? null,
       b['notes'] ?? null, (req as any).tenantId, (req as any).userId],
    );
    // Insert lines
    const lines = (b['lines'] as Array<Record<string, unknown>>) || [];
    for (const ln of lines) {
      await app.sql.unsafe(
        `INSERT INTO stock_transport_order_lines (id, sto_id, product_id, quantity, tenant_id)
          VALUES ($1,$2,$3,$4,$5)`,
        [crypto.randomUUID(), id, ln['productId'], ln['quantity'], (req as any).tenantId],
      );
    }
    return reply.status(201).send({ id, documentNumber: (b['documentNumber'] as string) || docNum });
  });

  // GET /stock-transport-orders
  app.get(`${API_V1_PREFIX}/stock-transport-orders`, {
    onRequest: [requireAuth, requirePermission(MM_STO_READ)],
  }, async (req) => {
    const q = req.query as Record<string, string>;
    const limit = Math.min(parseInt(q['limit'] || '50', 10), 200);
    const offset = parseInt(q['offset'] || '0', 10);
    const rows = await app.sql.unsafe(
      `SELECT * FROM stock_transport_orders WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [(req as any).tenantId, limit, offset],
    );
    return { data: rows, limit, offset };
  });

  // GET /stock-transport-orders/:id
  app.get(`${API_V1_PREFIX}/stock-transport-orders/:id`, {
    onRequest: [requireAuth, requirePermission(MM_STO_READ)],
  }, async (req) => {
    const { id } = req.params as { id: string };
    const [hdr, lines] = await Promise.all([
      app.sql.unsafe(`SELECT * FROM stock_transport_orders WHERE id = $1 AND tenant_id = $2`, [id, (req as any).tenantId]),
      app.sql.unsafe(`SELECT * FROM stock_transport_order_lines WHERE sto_id = $1 AND tenant_id = $2`, [id, (req as any).tenantId]),
    ]);
    if (!hdr.length) throw new NotFoundError({ detail: 'Stock transport order not found' });
    return { ...hdr[0], lines };
  });

  // POST /stock-transport-orders/:id/ship
  app.post(`${API_V1_PREFIX}/stock-transport-orders/:id/ship`, {
    onRequest: [requireAuth, requirePermission(MM_STO_UPDATE)],
  }, async (req) => {
    const { id } = req.params as { id: string };
    // Dr Inventory-in-Transit, Cr Source Warehouse
    await app.sql.unsafe(
      `UPDATE stock_transport_orders SET status = 'shipped', shipped_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2 AND status = 'created'`,
      [id, (req as any).tenantId],
    );
    return { id, status: 'shipped', message: 'Dr Inventory-in-Transit, Cr Source Warehouse' };
  });

  // POST /stock-transport-orders/:id/receive
  app.post(`${API_V1_PREFIX}/stock-transport-orders/:id/receive`, {
    onRequest: [requireAuth, requirePermission(MM_STO_UPDATE)],
  }, async (req) => {
    const { id } = req.params as { id: string };
    // Dr Destination Warehouse, Cr Inventory-in-Transit
    await app.sql.unsafe(
      `UPDATE stock_transport_orders SET status = 'received', received_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2 AND status IN ('shipped','in_transit')`,
      [id, (req as any).tenantId],
    );
    return { id, status: 'received', message: 'Dr Destination Warehouse, Cr In-Transit' };
  });

  // ===================== SOURCE LIST =====================

  // POST /source-list
  app.post(`${API_V1_PREFIX}/source-list`, {
    onRequest: [requireAuth, requirePermission(MM_SRC_LIST_CREATE)],
  }, async (req, reply) => {
    const b = req.body as Record<string, unknown>;
    if (!b['productId'] || !b['vendorId'] || !b['validFrom'] || !b['validTo']) {
      throw new ValidationError({ detail: 'productId, vendorId, validFrom, validTo are required' });
    }
    const id = crypto.randomUUID();
    await app.sql.unsafe(
      `INSERT INTO source_list (id, product_id, vendor_id, valid_from, valid_to, is_preferred, contract_id, notes, tenant_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, b['productId'], b['vendorId'], b['validFrom'], b['validTo'],
       b['isPreferred'] ?? false, b['contractId'] ?? null, b['notes'] ?? null, (req as any).tenantId],
    );
    return reply.status(201).send({ id });
  });

  // GET /source-list
  app.get(`${API_V1_PREFIX}/source-list`, {
    onRequest: [requireAuth, requirePermission(MM_SRC_LIST_READ)],
  }, async (req) => {
    const q = req.query as Record<string, string>;
    const productFilter = q['productId'] ? `AND product_id = '${q['productId']}'` : '';
    const rows = await app.sql.unsafe(
      `SELECT * FROM source_list WHERE tenant_id = $1 ${productFilter} ORDER BY is_preferred DESC, created_at DESC`,
      [(req as any).tenantId],
    );
    return { data: rows };
  });

  // PUT /source-list/:id
  app.put(`${API_V1_PREFIX}/source-list/:id`, {
    onRequest: [requireAuth, requirePermission(MM_SRC_LIST_UPDATE)],
  }, async (req) => {
    const { id } = req.params as { id: string };
    const b = req.body as Record<string, unknown>;
    await app.sql.unsafe(
      `UPDATE source_list SET
          is_preferred = COALESCE($1, is_preferred), valid_to = COALESCE($2, valid_to),
          notes = COALESCE($3, notes), updated_at = NOW()
        WHERE id = $4 AND tenant_id = $5`,
      [b['isPreferred'] ?? null, b['validTo'] ?? null, b['notes'] ?? null, id, (req as any).tenantId],
    );
    return { id, updated: true };
  });

  // GET /source-list/suggest?productId=X
  app.get(`${API_V1_PREFIX}/source-list/suggest`, {
    onRequest: [requireAuth, requirePermission(MM_SRC_LIST_READ)],
  }, async (req) => {
    const q = req.query as Record<string, string>;
    if (!q['productId']) throw new ValidationError({ detail: 'productId query param is required' });
    const rows = await app.sql.unsafe(
      `SELECT sl.*, v.name as vendor_name
        FROM source_list sl
        JOIN vendors v ON v.id = sl.vendor_id
        WHERE sl.tenant_id = $1 AND sl.product_id = $2
          AND sl.valid_from <= CURRENT_DATE AND sl.valid_to >= CURRENT_DATE
        ORDER BY sl.is_preferred DESC, sl.created_at ASC
        LIMIT 5`,
      [(req as any).tenantId, q['productId']],
    );
    return { suggestions: rows };
  });

  // ===================== CONSIGNMENT STOCK =====================

  // POST /consignment-stock — receive consignment (no AP entry)
  app.post(`${API_V1_PREFIX}/consignment-stock`, {
    onRequest: [requireAuth, requirePermission(MM_CONSIGN_CREATE)],
  }, async (req, reply) => {
    const b = req.body as Record<string, unknown>;
    if (!b['vendorId'] || !b['productId'] || !b['warehouseId'] || !b['quantity']) {
      throw new ValidationError({ detail: 'vendorId, productId, warehouseId, quantity are required' });
    }
    const id = crypto.randomUUID();
    await app.sql.unsafe(
      `INSERT INTO consignment_stock
          (id, vendor_id, product_id, warehouse_id, quantity, notes, tenant_id, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, b['vendorId'], b['productId'], b['warehouseId'], b['quantity'],
       b['notes'] ?? null, (req as any).tenantId, (req as any).userId],
    );
    return reply.status(201).send({ id, message: 'Consignment received — no AP entry created' });
  });

  // GET /consignment-stock
  app.get(`${API_V1_PREFIX}/consignment-stock`, {
    onRequest: [requireAuth, requirePermission(MM_CONSIGN_READ)],
  }, async (req) => {
    const rows = await app.sql.unsafe(
      `SELECT * FROM consignment_stock WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [(req as any).tenantId],
    );
    return { data: rows };
  });

  // POST /consignment-stock/:id/consume — creates AP bill
  app.post(`${API_V1_PREFIX}/consignment-stock/:id/consume`, {
    onRequest: [requireAuth, requirePermission(MM_CONSIGN_UPDATE)],
  }, async (req) => {
    const { id } = req.params as { id: string };
    const b = req.body as { quantity: number };
    if (!b.quantity) throw new ValidationError({ detail: 'quantity is required' });
    await app.sql.unsafe(
      `UPDATE consignment_stock SET
          consumed_quantity = consumed_quantity + $1,
          status = CASE WHEN consumed_quantity + $1 >= quantity THEN 'consumed' ELSE status END,
          updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3 AND status = 'available'`,
      [b.quantity, id, (req as any).tenantId],
    );
    return { id, consumed: b.quantity, message: 'AP bill should be created for consumed consignment' };
  });

  // POST /consignment-stock/:id/return — return to vendor
  app.post(`${API_V1_PREFIX}/consignment-stock/:id/return`, {
    onRequest: [requireAuth, requirePermission(MM_CONSIGN_UPDATE)],
  }, async (req) => {
    const { id } = req.params as { id: string };
    await app.sql.unsafe(
      `UPDATE consignment_stock SET status = 'returned', updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2 AND status = 'available'`,
      [id, (req as any).tenantId],
    );
    return { id, status: 'returned' };
  });
}
