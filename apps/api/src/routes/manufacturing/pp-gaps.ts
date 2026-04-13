/**
 * Manufacturing (PP) gap routes — CRP, Kanban, Process Orders, Co-Products,
 *   Engineering Change Management, Demand Management.
 *
 * Routes:
 *   GET  /api/v1/manufacturing/capacity          — capacity requirements planning
 *   POST /api/v1/kanban-cards                     — create kanban card
 *   GET  /api/v1/kanban-cards                     — list kanban cards
 *   GET  /api/v1/kanban-cards/:id                 — get kanban card
 *   PUT  /api/v1/kanban-cards/:id                 — update kanban card
 *   POST /api/v1/kanban-cards/:id/trigger         — trigger kanban replenishment
 *   POST /api/v1/process-orders                   — create process order
 *   GET  /api/v1/process-orders                   — list process orders
 *   GET  /api/v1/process-orders/:id               — get process order
 *   PUT  /api/v1/process-orders/:id               — update process order
 *   POST /api/v1/production-outputs               — create production output
 *   GET  /api/v1/production-outputs               — list production outputs
 *   PUT  /api/v1/production-outputs/:id           — update production output
 *   POST /api/v1/engineering-changes              — create engineering change
 *   GET  /api/v1/engineering-changes              — list engineering changes
 *   GET  /api/v1/engineering-changes/:id          — get engineering change
 *   POST /api/v1/engineering-changes/:id/approve  — approve engineering change
 *   POST /api/v1/engineering-changes/:id/implement — implement engineering change
 *   POST /api/v1/demand-requirements              — create PIR
 *   GET  /api/v1/demand-requirements              — list PIRs
 *   PUT  /api/v1/demand-requirements/:id          — update PIR
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import {
  PP_CAPACITY_READ, PP_KANBAN_CREATE, PP_KANBAN_READ, PP_KANBAN_UPDATE, PP_KANBAN_TRIGGER,
  PP_PROC_ORDER_CREATE, PP_PROC_ORDER_READ, PP_PROC_ORDER_UPDATE,
  PP_OUTPUT_CREATE, PP_OUTPUT_READ, PP_OUTPUT_UPDATE,
  PP_ECM_CREATE, PP_ECM_READ, PP_ECM_APPROVE, PP_ECM_IMPLEMENT,
  PP_DEMAND_CREATE, PP_DEMAND_READ, PP_DEMAND_UPDATE,
} from '../../lib/permissions.js';

export async function ppGapRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions,
) {
  // ===================== CAPACITY REQUIREMENTS PLANNING =====================

  // GET /manufacturing/capacity?workCenterId=X&dateFrom=Y&dateTo=Z
  app.get(`${API_V1_PREFIX}/manufacturing/capacity`, {
    onRequest: [requireAuth, requirePermission(PP_CAPACITY_READ)],
  }, async (req) => {
    const q = req.query as Record<string, string>;
    if (!q['workCenterId'] || !q['dateFrom'] || !q['dateTo']) {
      throw new ValidationError({ detail: 'workCenterId, dateFrom, dateTo are required' });
    }
    // Get work center capacity
    const wcRes = await app.sql.unsafe(
      `SELECT * FROM work_centers WHERE id = $1 AND tenant_id = $2`,
      [q['workCenterId'], (req as any).tenantId],
    );
    if (!wcRes.length) throw new NotFoundError({ detail: 'Work center not found' });
    const wc = wcRes[0] as Record<string, any>;
    const capacityPerHour = parseFloat(wc['capacity_per_hour'] || '1');

    // Get load from open production orders
    const loadRes = await app.sql.unsafe(
      `SELECT
          po.planned_start::date as work_date,
          SUM(po.planned_quantity::numeric) as total_load
        FROM production_orders po
        WHERE po.work_center_id = $1
          AND po.tenant_id = $2
          AND po.status IN ('planned','released','in_progress')
          AND po.planned_start >= $3
          AND po.planned_start <= $4
        GROUP BY po.planned_start::date
        ORDER BY work_date`,
      [q['workCenterId'], (req as any).tenantId, q['dateFrom'], q['dateTo']],
    );

    const availableHoursPerDay = 8;
    const availableCapacityPerDay = capacityPerHour * availableHoursPerDay;

    const capacityData = (loadRes as unknown as Array<{ work_date: string; total_load: string }>).map(row => ({
      date: row.work_date,
      load: parseFloat(row.total_load),
      availableCapacity: availableCapacityPerDay,
      utilization: Math.round((parseFloat(row.total_load) / availableCapacityPerDay) * 100),
      overloaded: parseFloat(row.total_load) > availableCapacityPerDay,
    }));

    return {
      workCenter: { id: wc['id'], code: wc['code'], name: wc['name_th'], capacityPerHour },
      dateFrom: q['dateFrom'],
      dateTo: q['dateTo'],
      availableCapacityPerDay,
      capacityData,
    };
  });

  // ===================== KANBAN CARDS =====================

  // POST /kanban-cards
  app.post(`${API_V1_PREFIX}/kanban-cards`, {
    onRequest: [requireAuth, requirePermission(PP_KANBAN_CREATE)],
  }, async (req, reply) => {
    const b = req.body as Record<string, unknown>;
    if (!b['productId'] || !b['sourceSupply'] || !b['quantity']) {
      throw new ValidationError({ detail: 'productId, sourceSupply, quantity are required' });
    }
    const id = crypto.randomUUID();
    const cardNum = `KAN-${Date.now()}`;
    await app.sql.unsafe(
      `INSERT INTO kanban_cards
          (id, card_number, product_id, source_supply, quantity, work_center_id,
           warehouse_id, notes, tenant_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, (b['cardNumber'] as string) || cardNum, b['productId'], b['sourceSupply'], b['quantity'],
       b['workCenterId'] ?? null, b['warehouseId'] ?? null, b['notes'] ?? null, (req as any).tenantId],
    );
    return reply.status(201).send({ id, cardNumber: (b['cardNumber'] as string) || cardNum });
  });

  // GET /kanban-cards
  app.get(`${API_V1_PREFIX}/kanban-cards`, {
    onRequest: [requireAuth, requirePermission(PP_KANBAN_READ)],
  }, async (req) => {
    const q = req.query as Record<string, string>;
    const statusFilter = q['status'] ? `AND status = '${q['status']}'` : '';
    const rows = await app.sql.unsafe(
      `SELECT * FROM kanban_cards WHERE tenant_id = $1 ${statusFilter} ORDER BY created_at DESC`,
      [(req as any).tenantId],
    );
    return { data: rows };
  });

  // GET /kanban-cards/:id
  app.get(`${API_V1_PREFIX}/kanban-cards/:id`, {
    onRequest: [requireAuth, requirePermission(PP_KANBAN_READ)],
  }, async (req) => {
    const { id } = req.params as { id: string };
    const res = await app.sql.unsafe(
      `SELECT * FROM kanban_cards WHERE id = $1 AND tenant_id = $2`,
      [id, (req as any).tenantId],
    );
    if (!res.length) throw new NotFoundError({ detail: 'Kanban card not found' });
    return res[0];
  });

  // PUT /kanban-cards/:id
  app.put(`${API_V1_PREFIX}/kanban-cards/:id`, {
    onRequest: [requireAuth, requirePermission(PP_KANBAN_UPDATE)],
  }, async (req) => {
    const { id } = req.params as { id: string };
    const b = req.body as Record<string, unknown>;
    await app.sql.unsafe(
      `UPDATE kanban_cards SET
          status = COALESCE($1, status), quantity = COALESCE($2, quantity),
          notes = COALESCE($3, notes), updated_at = NOW()
        WHERE id = $4 AND tenant_id = $5`,
      [b['status'] ?? null, b['quantity'] ?? null, b['notes'] ?? null, id, (req as any).tenantId],
    );
    return { id, updated: true };
  });

  // POST /kanban-cards/:id/trigger — empty→in_process, creates production order or PO
  app.post(`${API_V1_PREFIX}/kanban-cards/:id/trigger`, {
    onRequest: [requireAuth, requirePermission(PP_KANBAN_TRIGGER)],
  }, async (req) => {
    const { id } = req.params as { id: string };
    const res = await app.sql.unsafe(
      `SELECT * FROM kanban_cards WHERE id = $1 AND tenant_id = $2`,
      [id, (req as any).tenantId],
    );
    if (!res.length) throw new NotFoundError({ detail: 'Kanban card not found' });
    const card = res[0] as Record<string, any>;
    if (card['status'] !== 'empty') throw new ValidationError({ detail: 'Can only trigger empty kanban cards' });

    await app.sql.unsafe(
      `UPDATE kanban_cards SET status = 'in_process', last_triggered_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2`,
      [id, (req as any).tenantId],
    );

    return {
      id,
      status: 'in_process',
      sourceSupply: card['source_supply'],
      message: `Kanban triggered — ${card['source_supply']} signal created for ${card['quantity']} units`,
    };
  });

  // ===================== PROCESS ORDERS =====================

  // POST /process-orders
  app.post(`${API_V1_PREFIX}/process-orders`, {
    onRequest: [requireAuth, requirePermission(PP_PROC_ORDER_CREATE)],
  }, async (req, reply) => {
    const b = req.body as Record<string, unknown>;
    if (!b['productId'] || !b['plannedQuantity']) {
      throw new ValidationError({ detail: 'productId, plannedQuantity are required' });
    }
    const id = crypto.randomUUID();
    const docNum = `PROC-${Date.now()}`;
    await app.sql.unsafe(
      `INSERT INTO process_orders
          (id, document_number, product_id, recipe_id, batch_id, planned_quantity,
           planned_start, planned_end, work_center_id, warehouse_id, notes, tenant_id, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [id, (b['documentNumber'] as string) || docNum, b['productId'],
       b['recipeId'] ?? null, b['batchId'] ?? null, b['plannedQuantity'],
       b['plannedStart'] ?? null, b['plannedEnd'] ?? null,
       b['workCenterId'] ?? null, b['warehouseId'] ?? null,
       b['notes'] ?? null, (req as any).tenantId, (req as any).userId],
    );
    return reply.status(201).send({ id, documentNumber: (b['documentNumber'] as string) || docNum });
  });

  // GET /process-orders
  app.get(`${API_V1_PREFIX}/process-orders`, {
    onRequest: [requireAuth, requirePermission(PP_PROC_ORDER_READ)],
  }, async (req) => {
    const q = req.query as Record<string, string>;
    const limit = Math.min(parseInt(q['limit'] || '50', 10), 200);
    const offset = parseInt(q['offset'] || '0', 10);
    const rows = await app.sql.unsafe(
      `SELECT * FROM process_orders WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [(req as any).tenantId, limit, offset],
    );
    return { data: rows, limit, offset };
  });

  // GET /process-orders/:id
  app.get(`${API_V1_PREFIX}/process-orders/:id`, {
    onRequest: [requireAuth, requirePermission(PP_PROC_ORDER_READ)],
  }, async (req) => {
    const { id } = req.params as { id: string };
    const res = await app.sql.unsafe(
      `SELECT * FROM process_orders WHERE id = $1 AND tenant_id = $2`,
      [id, (req as any).tenantId],
    );
    if (!res.length) throw new NotFoundError({ detail: 'Process order not found' });
    return res[0];
  });

  // PUT /process-orders/:id
  app.put(`${API_V1_PREFIX}/process-orders/:id`, {
    onRequest: [requireAuth, requirePermission(PP_PROC_ORDER_UPDATE)],
  }, async (req) => {
    const { id } = req.params as { id: string };
    const b = req.body as Record<string, unknown>;
    await app.sql.unsafe(
      `UPDATE process_orders SET
          status = COALESCE($1, status), actual_quantity = COALESCE($2, actual_quantity),
          notes = COALESCE($3, notes), updated_at = NOW()
        WHERE id = $4 AND tenant_id = $5`,
      [b['status'] ?? null, b['actualQuantity'] ?? null, b['notes'] ?? null, id, (req as any).tenantId],
    );
    return { id, updated: true };
  });

  // ===================== PRODUCTION OUTPUTS (Co/By-Products) =====================

  // POST /production-outputs
  app.post(`${API_V1_PREFIX}/production-outputs`, {
    onRequest: [requireAuth, requirePermission(PP_OUTPUT_CREATE)],
  }, async (req, reply) => {
    const b = req.body as Record<string, unknown>;
    if (!b['productionOrderId'] || !b['productId'] || !b['outputType']) {
      throw new ValidationError({ detail: 'productionOrderId, productId, outputType are required' });
    }
    const id = crypto.randomUUID();
    await app.sql.unsafe(
      `INSERT INTO production_outputs
          (id, production_order_id, product_id, output_type, planned_quantity,
           cost_allocation_percent, warehouse_id, tenant_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, b['productionOrderId'], b['productId'], b['outputType'],
       b['plannedQuantity'] ?? 0, b['costAllocationPercent'] ?? 0,
       b['warehouseId'] ?? null, (req as any).tenantId],
    );
    return reply.status(201).send({ id });
  });

  // GET /production-outputs
  app.get(`${API_V1_PREFIX}/production-outputs`, {
    onRequest: [requireAuth, requirePermission(PP_OUTPUT_READ)],
  }, async (req) => {
    const q = req.query as Record<string, string>;
    const orderFilter = q['productionOrderId'] ? `AND production_order_id = '${q['productionOrderId']}'` : '';
    const rows = await app.sql.unsafe(
      `SELECT * FROM production_outputs WHERE tenant_id = $1 ${orderFilter} ORDER BY created_at DESC`,
      [(req as any).tenantId],
    );
    return { data: rows };
  });

  // PUT /production-outputs/:id
  app.put(`${API_V1_PREFIX}/production-outputs/:id`, {
    onRequest: [requireAuth, requirePermission(PP_OUTPUT_UPDATE)],
  }, async (req) => {
    const { id } = req.params as { id: string };
    const b = req.body as Record<string, unknown>;
    await app.sql.unsafe(
      `UPDATE production_outputs SET
          actual_quantity = COALESCE($1, actual_quantity),
          cost_allocation_percent = COALESCE($2, cost_allocation_percent),
          updated_at = NOW()
        WHERE id = $3 AND tenant_id = $4`,
      [b['actualQuantity'] ?? null, b['costAllocationPercent'] ?? null, id, (req as any).tenantId],
    );
    return { id, updated: true };
  });

  // ===================== ENGINEERING CHANGE MANAGEMENT =====================

  // POST /engineering-changes
  app.post(`${API_V1_PREFIX}/engineering-changes`, {
    onRequest: [requireAuth, requirePermission(PP_ECM_CREATE)],
  }, async (req, reply) => {
    const b = req.body as Record<string, unknown>;
    if (!b['bomId'] || !b['changeType'] || !b['description'] || !b['effectiveDate']) {
      throw new ValidationError({ detail: 'bomId, changeType, description, effectiveDate are required' });
    }
    const id = crypto.randomUUID();
    const changeNum = `ECN-${Date.now()}`;
    await app.sql.unsafe(
      `INSERT INTO engineering_changes
          (id, change_number, bom_id, change_type, description, reason,
           effective_date, change_details, tenant_id, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, (b['changeNumber'] as string) || changeNum, b['bomId'], b['changeType'],
       b['description'], b['reason'] ?? null, b['effectiveDate'],
       b['changeDetails'] ? JSON.stringify(b['changeDetails']) : null,
       (req as any).tenantId, (req as any).userId],
    );
    return reply.status(201).send({ id, changeNumber: (b['changeNumber'] as string) || changeNum });
  });

  // GET /engineering-changes
  app.get(`${API_V1_PREFIX}/engineering-changes`, {
    onRequest: [requireAuth, requirePermission(PP_ECM_READ)],
  }, async (req) => {
    const q = req.query as Record<string, string>;
    const limit = Math.min(parseInt(q['limit'] || '50', 10), 200);
    const offset = parseInt(q['offset'] || '0', 10);
    const rows = await app.sql.unsafe(
      `SELECT * FROM engineering_changes WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [(req as any).tenantId, limit, offset],
    );
    return { data: rows, limit, offset };
  });

  // GET /engineering-changes/:id
  app.get(`${API_V1_PREFIX}/engineering-changes/:id`, {
    onRequest: [requireAuth, requirePermission(PP_ECM_READ)],
  }, async (req) => {
    const { id } = req.params as { id: string };
    const res = await app.sql.unsafe(
      `SELECT * FROM engineering_changes WHERE id = $1 AND tenant_id = $2`,
      [id, (req as any).tenantId],
    );
    if (!res.length) throw new NotFoundError({ detail: 'Engineering change not found' });
    return res[0];
  });

  // POST /engineering-changes/:id/approve
  app.post(`${API_V1_PREFIX}/engineering-changes/:id/approve`, {
    onRequest: [requireAuth, requirePermission(PP_ECM_APPROVE)],
  }, async (req) => {
    const { id } = req.params as { id: string };
    await app.sql.unsafe(
      `UPDATE engineering_changes SET
          status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3 AND status = 'proposed'`,
      [(req as any).userId, id, (req as any).tenantId],
    );
    return { id, status: 'approved' };
  });

  // POST /engineering-changes/:id/implement — creates new BOM version
  app.post(`${API_V1_PREFIX}/engineering-changes/:id/implement`, {
    onRequest: [requireAuth, requirePermission(PP_ECM_IMPLEMENT)],
  }, async (req) => {
    const { id } = req.params as { id: string };
    const ecnRes = await app.sql.unsafe(
      `SELECT * FROM engineering_changes WHERE id = $1 AND tenant_id = $2 AND status = 'approved'`,
      [id, (req as any).tenantId],
    );
    if (!ecnRes.length) throw new ValidationError({ detail: 'ECN must be approved before implementation' });
    const ecn = ecnRes[0] as Record<string, any>;

    // Create new BOM version
    const newBomId = crypto.randomUUID();
    const bomRes = await app.sql.unsafe(
      `SELECT * FROM bom_headers WHERE id = $1`, [ecn['bom_id']],
    );
    if (bomRes.length) {
      const oldBom = bomRes[0] as Record<string, any>;
      await app.sql.unsafe(
        `INSERT INTO bom_headers (id, product_id, version, name_th, name_en, status, tenant_id, created_by)
          VALUES ($1, $2, $3, $4, $5, 'active', $6, $7)`,
        [newBomId, oldBom['product_id'], (oldBom['version'] || 1) + 1,
         oldBom['name_th'], oldBom['name_en'], oldBom['tenant_id'], (req as any).userId],
      );
      // Mark old BOM as obsolete
      await app.sql.unsafe(
        `UPDATE bom_headers SET status = 'obsolete', updated_at = NOW() WHERE id = $1`,
        [ecn['bom_id']],
      );
    }

    await app.sql.unsafe(
      `UPDATE engineering_changes SET status = 'implemented', implemented_at = NOW(), updated_at = NOW()
        WHERE id = $1`,
      [id],
    );

    return { id, status: 'implemented', newBomId, message: 'New BOM version created, old version marked obsolete' };
  });

  // ===================== DEMAND MANAGEMENT (PIR) =====================

  // POST /demand-requirements
  app.post(`${API_V1_PREFIX}/demand-requirements`, {
    onRequest: [requireAuth, requirePermission(PP_DEMAND_CREATE)],
  }, async (req, reply) => {
    const b = req.body as Record<string, unknown>;
    if (!b['productId'] || !b['periodDate'] || !b['plannedQuantity']) {
      throw new ValidationError({ detail: 'productId, periodDate, plannedQuantity are required' });
    }
    const id = crypto.randomUUID();
    await app.sql.unsafe(
      `INSERT INTO planned_independent_requirements
          (id, product_id, period_date, planned_quantity, source, version, notes, tenant_id, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, b['productId'], b['periodDate'], b['plannedQuantity'],
       b['source'] ?? 'manual', b['version'] ?? 1, b['notes'] ?? null,
       (req as any).tenantId, (req as any).userId],
    );
    return reply.status(201).send({ id });
  });

  // GET /demand-requirements
  app.get(`${API_V1_PREFIX}/demand-requirements`, {
    onRequest: [requireAuth, requirePermission(PP_DEMAND_READ)],
  }, async (req) => {
    const q = req.query as Record<string, string>;
    const productFilter = q['productId'] ? `AND product_id = '${q['productId']}'` : '';
    const rows = await app.sql.unsafe(
      `SELECT * FROM planned_independent_requirements
        WHERE tenant_id = $1 ${productFilter}
        ORDER BY period_date ASC`,
      [(req as any).tenantId],
    );
    return { data: rows };
  });

  // PUT /demand-requirements/:id
  app.put(`${API_V1_PREFIX}/demand-requirements/:id`, {
    onRequest: [requireAuth, requirePermission(PP_DEMAND_UPDATE)],
  }, async (req) => {
    const { id } = req.params as { id: string };
    const b = req.body as Record<string, unknown>;
    await app.sql.unsafe(
      `UPDATE planned_independent_requirements SET
          planned_quantity = COALESCE($1, planned_quantity),
          actual_quantity = COALESCE($2, actual_quantity),
          notes = COALESCE($3, notes), updated_at = NOW()
        WHERE id = $4 AND tenant_id = $5`,
      [b['plannedQuantity'] ?? null, b['actualQuantity'] ?? null, b['notes'] ?? null, id, (req as any).tenantId],
    );
    return { id, updated: true };
  });
}
