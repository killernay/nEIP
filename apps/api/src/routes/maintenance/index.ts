/**
 * Plant Maintenance routes (PM):
 *   POST /api/v1/equipment                              — create equipment
 *   GET  /api/v1/equipment                              — list equipment
 *   GET  /api/v1/equipment/:id                          — detail
 *   PUT  /api/v1/equipment/:id                          — update
 *   POST /api/v1/maintenance/plans                      — create plan
 *   GET  /api/v1/maintenance/plans                      — list plans
 *   GET  /api/v1/maintenance/plans/:id                  — detail
 *   PUT  /api/v1/maintenance/plans/:id                  — update
 *   POST /api/v1/maintenance/plans/generate-orders      — auto-create orders from due plans
 *   POST /api/v1/maintenance/orders                     — create order
 *   GET  /api/v1/maintenance/orders                     — list orders
 *   GET  /api/v1/maintenance/orders/:id                 — detail (with parts)
 *   PUT  /api/v1/maintenance/orders/:id                 — update
 *   POST /api/v1/maintenance/orders/:id/release         — planned → released
 *   POST /api/v1/maintenance/orders/:id/start           — released → in_progress
 *   POST /api/v1/maintenance/orders/:id/complete        — in_progress → completed
 *   POST /api/v1/maintenance/orders/:id/close           — completed → closed
 *   POST /api/v1/maintenance/orders/:id/parts           — add parts
 *   POST /api/v1/maintenance/orders/:id/parts/:partId/issue — issue part from inventory
 *   GET  /api/v1/maintenance/reports/downtime           — equipment downtime report
 *   GET  /api/v1/maintenance/reports/mttr-mtbf          — MTTR/MTBF
 *   GET  /api/v1/maintenance/reports/cost               — maintenance cost per equipment
 *   GET  /api/v1/maintenance/oee/:equipmentId           — OEE
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, ConflictError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import {
  PM_EQUIPMENT_CREATE, PM_EQUIPMENT_READ, PM_EQUIPMENT_UPDATE,
  PM_PLAN_CREATE, PM_PLAN_READ, PM_PLAN_UPDATE,
  PM_ORDER_CREATE, PM_ORDER_READ, PM_ORDER_UPDATE, PM_ORDER_CLOSE,
} from '../../lib/permissions.js';
import { nextDocNumber } from '@neip/core';

// ---------------------------------------------------------------------------
// Row interfaces
// ---------------------------------------------------------------------------

interface EquipmentRow {
  id: string; code: string; name_th: string; name_en: string | null;
  equipment_type: string | null; manufacturer: string | null; model: string | null;
  serial_number: string | null; location: string | null;
  department_id: string | null; fixed_asset_id: string | null;
  status: string; purchase_date: string | null; warranty_end: string | null;
  tenant_id: string; created_at: Date | string; updated_at: Date | string;
}

interface PlanRow {
  id: string; equipment_id: string; plan_type: string; name: string;
  description: string | null; frequency_days: number | null; frequency_hours: number | null;
  last_executed_at: Date | string | null; next_due_at: Date | string | null;
  is_active: boolean; tenant_id: string; created_at: Date | string;
}

interface OrderRow {
  id: string; document_number: string; equipment_id: string;
  maintenance_plan_id: string | null; order_type: string; priority: string;
  status: string; description: string | null; failure_description: string | null;
  assigned_to: string | null; planned_start: Date | string | null;
  planned_end: Date | string | null; actual_start: Date | string | null;
  actual_end: Date | string | null; labor_hours: number;
  material_cost_satang: string; labor_cost_satang: string; total_cost_satang: string;
  downtime_hours: number; tenant_id: string; created_by: string | null;
  created_at: Date | string; updated_at: Date | string;
}

interface PartRow {
  id: string; maintenance_order_id: string; product_id: string | null;
  description: string | null; quantity: number; unit_cost_satang: string;
  total_cost_satang: string; issued: boolean; tenant_id: string;
}

interface CountRow { count: string; }

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapEquipment(r: EquipmentRow) {
  return {
    id: r.id, code: r.code, nameTh: r.name_th, nameEn: r.name_en,
    equipmentType: r.equipment_type, manufacturer: r.manufacturer,
    model: r.model, serialNumber: r.serial_number, location: r.location,
    departmentId: r.department_id, fixedAssetId: r.fixed_asset_id,
    status: r.status, purchaseDate: r.purchase_date, warrantyEnd: r.warranty_end,
    createdAt: toISO(r.created_at), updatedAt: toISO(r.updated_at),
  };
}

function mapPlan(r: PlanRow) {
  return {
    id: r.id, equipmentId: r.equipment_id, planType: r.plan_type,
    name: r.name, description: r.description,
    frequencyDays: r.frequency_days, frequencyHours: r.frequency_hours,
    lastExecutedAt: r.last_executed_at ? toISO(r.last_executed_at) : null,
    nextDueAt: r.next_due_at ? toISO(r.next_due_at) : null,
    isActive: r.is_active, createdAt: toISO(r.created_at),
  };
}

function mapOrder(r: OrderRow) {
  return {
    id: r.id, documentNumber: r.document_number, equipmentId: r.equipment_id,
    maintenancePlanId: r.maintenance_plan_id, orderType: r.order_type,
    priority: r.priority, status: r.status, description: r.description,
    failureDescription: r.failure_description, assignedTo: r.assigned_to,
    plannedStart: r.planned_start ? toISO(r.planned_start) : null,
    plannedEnd: r.planned_end ? toISO(r.planned_end) : null,
    actualStart: r.actual_start ? toISO(r.actual_start) : null,
    actualEnd: r.actual_end ? toISO(r.actual_end) : null,
    laborHours: Number(r.labor_hours),
    materialCostSatang: r.material_cost_satang?.toString() ?? '0',
    laborCostSatang: r.labor_cost_satang?.toString() ?? '0',
    totalCostSatang: r.total_cost_satang?.toString() ?? '0',
    downtimeHours: Number(r.downtime_hours),
    createdBy: r.created_by,
    createdAt: toISO(r.created_at), updatedAt: toISO(r.updated_at),
  };
}

function mapPart(r: PartRow) {
  return {
    id: r.id, maintenanceOrderId: r.maintenance_order_id,
    productId: r.product_id, description: r.description,
    quantity: Number(r.quantity),
    unitCostSatang: r.unit_cost_satang?.toString() ?? '0',
    totalCostSatang: r.total_cost_satang?.toString() ?? '0',
    issued: r.issued,
  };
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export async function maintenanceRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // =======================================================================
  // EQUIPMENT CRUD
  // =======================================================================

  fastify.post(
    `${API_V1_PREFIX}/equipment`,
    { preHandler: [requireAuth, requirePermission(PM_EQUIPMENT_CREATE)] },
    async (request, reply) => {
      const { tenantId } = request.user;
      const b = request.body as {
        code: string; nameTh: string; nameEn?: string; equipmentType?: string;
        manufacturer?: string; model?: string; serialNumber?: string;
        location?: string; departmentId?: string; fixedAssetId?: string;
        purchaseDate?: string; warrantyEnd?: string;
      };
      const rows = await fastify.sql<EquipmentRow[]>`
        INSERT INTO equipment (code, name_th, name_en, equipment_type, manufacturer, model,
          serial_number, location, department_id, fixed_asset_id, purchase_date, warranty_end, tenant_id)
        VALUES (${b.code}, ${b.nameTh}, ${b.nameEn ?? null}, ${b.equipmentType ?? null},
          ${b.manufacturer ?? null}, ${b.model ?? null}, ${b.serialNumber ?? null},
          ${b.location ?? null}, ${b.departmentId ?? null}, ${b.fixedAssetId ?? null},
          ${b.purchaseDate ?? null}, ${b.warrantyEnd ?? null}, ${tenantId})
        RETURNING *`;
      return reply.status(201).send(mapEquipment(rows[0]!));
    },
  );

  fastify.get(
    `${API_V1_PREFIX}/equipment`,
    { preHandler: [requireAuth, requirePermission(PM_EQUIPMENT_READ)] },
    async (request) => {
      const { tenantId } = request.user;
      const q = request.query as { status?: string; departmentId?: string; limit?: string; offset?: string };
      const limit = Math.min(Number(q.limit) || 50, 200);
      const offset = Number(q.offset) || 0;
      const conditions: string[] = [];
      if (q.status) conditions.push(`status = '${q.status}'`);
      if (q.departmentId) conditions.push(`department_id = '${q.departmentId}'`);
      const where = conditions.length ? `AND ${conditions.join(' AND ')}` : '';

      const rows = await fastify.sql<EquipmentRow[]>`
        SELECT * FROM equipment WHERE tenant_id = ${tenantId}
        ${fastify.sql.unsafe(where)}
        ORDER BY code LIMIT ${limit} OFFSET ${offset}`;
      const countRows = await fastify.sql<CountRow[]>`
        SELECT count(*)::text AS count FROM equipment WHERE tenant_id = ${tenantId}
        ${fastify.sql.unsafe(where)}`;
      return { data: rows.map(mapEquipment), total: Number(countRows[0]!.count) };
    },
  );

  fastify.get(
    `${API_V1_PREFIX}/equipment/:id`,
    { preHandler: [requireAuth, requirePermission(PM_EQUIPMENT_READ)] },
    async (request) => {
      const { tenantId } = request.user;
      const { id } = request.params as { id: string };
      const rows = await fastify.sql<EquipmentRow[]>`
        SELECT * FROM equipment WHERE id = ${id} AND tenant_id = ${tenantId}`;
      if (!rows[0]) throw new NotFoundError({ detail: 'Equipment not found' });
      return mapEquipment(rows[0]);
    },
  );

  fastify.put(
    `${API_V1_PREFIX}/equipment/:id`,
    { preHandler: [requireAuth, requirePermission(PM_EQUIPMENT_UPDATE)] },
    async (request) => {
      const { tenantId } = request.user;
      const { id } = request.params as { id: string };
      const b = request.body as Partial<{
        nameTh: string; nameEn: string; equipmentType: string;
        manufacturer: string; model: string; serialNumber: string;
        location: string; departmentId: string; fixedAssetId: string;
        status: string; purchaseDate: string; warrantyEnd: string;
      }>;
      const rows = await fastify.sql<EquipmentRow[]>`
        UPDATE equipment SET
          name_th = COALESCE(${b.nameTh ?? null}, name_th),
          name_en = COALESCE(${b.nameEn ?? null}, name_en),
          equipment_type = COALESCE(${b.equipmentType ?? null}, equipment_type),
          manufacturer = COALESCE(${b.manufacturer ?? null}, manufacturer),
          model = COALESCE(${b.model ?? null}, model),
          serial_number = COALESCE(${b.serialNumber ?? null}, serial_number),
          location = COALESCE(${b.location ?? null}, location),
          department_id = COALESCE(${b.departmentId ?? null}, department_id),
          fixed_asset_id = COALESCE(${b.fixedAssetId ?? null}, fixed_asset_id),
          status = COALESCE(${b.status ?? null}, status),
          purchase_date = COALESCE(${b.purchaseDate ?? null}::date, purchase_date),
          warranty_end = COALESCE(${b.warrantyEnd ?? null}::date, warranty_end)
        WHERE id = ${id} AND tenant_id = ${tenantId} RETURNING *`;
      if (!rows[0]) throw new NotFoundError({ detail: 'Equipment not found' });
      return mapEquipment(rows[0]);
    },
  );

  // =======================================================================
  // MAINTENANCE PLANS
  // =======================================================================

  fastify.post(
    `${API_V1_PREFIX}/maintenance/plans`,
    { preHandler: [requireAuth, requirePermission(PM_PLAN_CREATE)] },
    async (request, reply) => {
      const { tenantId } = request.user;
      const b = request.body as {
        equipmentId: string; planType: string; name: string; description?: string;
        frequencyDays?: number; frequencyHours?: number; nextDueAt?: string;
      };
      const eqRows = await fastify.sql`SELECT id FROM equipment WHERE id = ${b.equipmentId} AND tenant_id = ${tenantId}`;
      if (!eqRows[0]) throw new NotFoundError({ detail: 'Equipment not found' });

      const rows = await fastify.sql<PlanRow[]>`
        INSERT INTO maintenance_plans (equipment_id, plan_type, name, description,
          frequency_days, frequency_hours, next_due_at, tenant_id)
        VALUES (${b.equipmentId}, ${b.planType}, ${b.name}, ${b.description ?? null},
          ${b.frequencyDays ?? null}, ${b.frequencyHours ?? null},
          ${b.nextDueAt ?? null}::timestamptz, ${tenantId})
        RETURNING *`;
      return reply.status(201).send(mapPlan(rows[0]!));
    },
  );

  fastify.get(
    `${API_V1_PREFIX}/maintenance/plans`,
    { preHandler: [requireAuth, requirePermission(PM_PLAN_READ)] },
    async (request) => {
      const { tenantId } = request.user;
      const q = request.query as { equipmentId?: string; active?: string };
      const conditions: string[] = [];
      if (q.equipmentId) conditions.push(`equipment_id = '${q.equipmentId}'`);
      if (q.active === 'true') conditions.push(`is_active = TRUE`);
      const where = conditions.length ? `AND ${conditions.join(' AND ')}` : '';

      const rows = await fastify.sql<PlanRow[]>`
        SELECT * FROM maintenance_plans WHERE tenant_id = ${tenantId}
        ${fastify.sql.unsafe(where)} ORDER BY created_at DESC`;
      return { data: rows.map(mapPlan) };
    },
  );

  fastify.get(
    `${API_V1_PREFIX}/maintenance/plans/:id`,
    { preHandler: [requireAuth, requirePermission(PM_PLAN_READ)] },
    async (request) => {
      const { tenantId } = request.user;
      const { id } = request.params as { id: string };
      const rows = await fastify.sql<PlanRow[]>`
        SELECT * FROM maintenance_plans WHERE id = ${id} AND tenant_id = ${tenantId}`;
      if (!rows[0]) throw new NotFoundError({ detail: 'Maintenance plan not found' });
      return mapPlan(rows[0]);
    },
  );

  fastify.put(
    `${API_V1_PREFIX}/maintenance/plans/:id`,
    { preHandler: [requireAuth, requirePermission(PM_PLAN_UPDATE)] },
    async (request) => {
      const { tenantId } = request.user;
      const { id } = request.params as { id: string };
      const b = request.body as Partial<{
        name: string; description: string; frequencyDays: number;
        frequencyHours: number; nextDueAt: string; isActive: boolean;
      }>;
      const rows = await fastify.sql<PlanRow[]>`
        UPDATE maintenance_plans SET
          name = COALESCE(${b.name ?? null}, name),
          description = COALESCE(${b.description ?? null}, description),
          frequency_days = COALESCE(${b.frequencyDays ?? null}::int, frequency_days),
          frequency_hours = COALESCE(${b.frequencyHours ?? null}::int, frequency_hours),
          next_due_at = COALESCE(${b.nextDueAt ?? null}::timestamptz, next_due_at),
          is_active = COALESCE(${b.isActive ?? null}::boolean, is_active)
        WHERE id = ${id} AND tenant_id = ${tenantId} RETURNING *`;
      if (!rows[0]) throw new NotFoundError({ detail: 'Maintenance plan not found' });
      return mapPlan(rows[0]);
    },
  );

  // POST /maintenance/plans/generate-orders — auto-create from due plans
  fastify.post(
    `${API_V1_PREFIX}/maintenance/plans/generate-orders`,
    { preHandler: [requireAuth, requirePermission(PM_ORDER_CREATE)] },
    async (request) => {
      const { tenantId, sub: userId } = request.user;
      const duePlans = await fastify.sql<PlanRow[]>`
        SELECT * FROM maintenance_plans
        WHERE tenant_id = ${tenantId} AND is_active = TRUE
          AND next_due_at IS NOT NULL AND next_due_at <= NOW()`;

      const created: ReturnType<typeof mapOrder>[] = [];
      for (const plan of duePlans) {
        const docNum = await nextDocNumber(fastify.sql, tenantId, 'maintenance_order', new Date().getFullYear());
        const orderRows = await fastify.sql<OrderRow[]>`
          INSERT INTO maintenance_orders (document_number, equipment_id, maintenance_plan_id,
            order_type, priority, description, tenant_id, created_by)
          VALUES (${docNum}, ${plan.equipment_id}, ${plan.id},
            'preventive', 'medium', ${`Auto-generated from plan: ${plan.name}`},
            ${tenantId}, ${userId})
          RETURNING *`;
        created.push(mapOrder(orderRows[0]!));

        const freqInterval = plan.frequency_days
          ? `${plan.frequency_days} days`
          : plan.frequency_hours
            ? `${plan.frequency_hours} hours`
            : '30 days';
        await fastify.sql`
          UPDATE maintenance_plans SET
            last_executed_at = NOW(),
            next_due_at = NOW() + ${freqInterval}::interval
          WHERE id = ${plan.id}`;
      }
      return { generated: created.length, orders: created };
    },
  );

  // =======================================================================
  // MAINTENANCE ORDERS
  // =======================================================================

  fastify.post(
    `${API_V1_PREFIX}/maintenance/orders`,
    { preHandler: [requireAuth, requirePermission(PM_ORDER_CREATE)] },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user;
      const b = request.body as {
        equipmentId: string; orderType: string; priority?: string;
        description?: string; failureDescription?: string; assignedTo?: string;
        plannedStart?: string; plannedEnd?: string;
      };
      const eqRows = await fastify.sql`SELECT id FROM equipment WHERE id = ${b.equipmentId} AND tenant_id = ${tenantId}`;
      if (!eqRows[0]) throw new NotFoundError({ detail: 'Equipment not found' });

      const docNum = await nextDocNumber(fastify.sql, tenantId, 'maintenance_order', new Date().getFullYear());
      const rows = await fastify.sql<OrderRow[]>`
        INSERT INTO maintenance_orders (document_number, equipment_id, order_type, priority,
          description, failure_description, assigned_to, planned_start, planned_end,
          tenant_id, created_by)
        VALUES (${docNum}, ${b.equipmentId}, ${b.orderType}, ${b.priority ?? 'medium'},
          ${b.description ?? null}, ${b.failureDescription ?? null}, ${b.assignedTo ?? null},
          ${b.plannedStart ?? null}::timestamptz, ${b.plannedEnd ?? null}::timestamptz,
          ${tenantId}, ${userId})
        RETURNING *`;
      return reply.status(201).send(mapOrder(rows[0]!));
    },
  );

  fastify.get(
    `${API_V1_PREFIX}/maintenance/orders`,
    { preHandler: [requireAuth, requirePermission(PM_ORDER_READ)] },
    async (request) => {
      const { tenantId } = request.user;
      const q = request.query as { status?: string; equipmentId?: string; limit?: string; offset?: string };
      const limit = Math.min(Number(q.limit) || 50, 200);
      const offset = Number(q.offset) || 0;
      const conditions: string[] = [];
      if (q.status) conditions.push(`status = '${q.status}'`);
      if (q.equipmentId) conditions.push(`equipment_id = '${q.equipmentId}'`);
      const where = conditions.length ? `AND ${conditions.join(' AND ')}` : '';

      const rows = await fastify.sql<OrderRow[]>`
        SELECT * FROM maintenance_orders WHERE tenant_id = ${tenantId}
        ${fastify.sql.unsafe(where)}
        ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      const countRows = await fastify.sql<CountRow[]>`
        SELECT count(*)::text AS count FROM maintenance_orders WHERE tenant_id = ${tenantId}
        ${fastify.sql.unsafe(where)}`;
      return { data: rows.map(mapOrder), total: Number(countRows[0]!.count) };
    },
  );

  fastify.get(
    `${API_V1_PREFIX}/maintenance/orders/:id`,
    { preHandler: [requireAuth, requirePermission(PM_ORDER_READ)] },
    async (request) => {
      const { tenantId } = request.user;
      const { id } = request.params as { id: string };
      const rows = await fastify.sql<OrderRow[]>`
        SELECT * FROM maintenance_orders WHERE id = ${id} AND tenant_id = ${tenantId}`;
      if (!rows[0]) throw new NotFoundError({ detail: 'Maintenance order not found' });
      const parts = await fastify.sql<PartRow[]>`
        SELECT * FROM maintenance_order_parts WHERE maintenance_order_id = ${id} AND tenant_id = ${tenantId}`;
      return { ...mapOrder(rows[0]), parts: parts.map(mapPart) };
    },
  );

  fastify.put(
    `${API_V1_PREFIX}/maintenance/orders/:id`,
    { preHandler: [requireAuth, requirePermission(PM_ORDER_UPDATE)] },
    async (request) => {
      const { tenantId } = request.user;
      const { id } = request.params as { id: string };
      const b = request.body as Partial<{
        priority: string; description: string; failureDescription: string;
        assignedTo: string; plannedStart: string; plannedEnd: string;
      }>;
      const rows = await fastify.sql<OrderRow[]>`
        UPDATE maintenance_orders SET
          priority = COALESCE(${b.priority ?? null}, priority),
          description = COALESCE(${b.description ?? null}, description),
          failure_description = COALESCE(${b.failureDescription ?? null}, failure_description),
          assigned_to = COALESCE(${b.assignedTo ?? null}, assigned_to),
          planned_start = COALESCE(${b.plannedStart ?? null}::timestamptz, planned_start),
          planned_end = COALESCE(${b.plannedEnd ?? null}::timestamptz, planned_end)
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status NOT IN ('closed','cancelled')
        RETURNING *`;
      if (!rows[0]) throw new NotFoundError({ detail: 'Maintenance order not found or already closed' });
      return mapOrder(rows[0]);
    },
  );

  fastify.post(
    `${API_V1_PREFIX}/maintenance/orders/:id/release`,
    { preHandler: [requireAuth, requirePermission(PM_ORDER_UPDATE)] },
    async (request) => {
      const { tenantId } = request.user;
      const { id } = request.params as { id: string };
      const rows = await fastify.sql<OrderRow[]>`
        UPDATE maintenance_orders SET status = 'released'
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'planned' RETURNING *`;
      if (!rows[0]) throw new ConflictError({ detail: 'Order must be in planned status to release' });
      return mapOrder(rows[0]);
    },
  );

  fastify.post(
    `${API_V1_PREFIX}/maintenance/orders/:id/start`,
    { preHandler: [requireAuth, requirePermission(PM_ORDER_UPDATE)] },
    async (request) => {
      const { tenantId } = request.user;
      const { id } = request.params as { id: string };
      const rows = await fastify.sql<OrderRow[]>`
        UPDATE maintenance_orders SET status = 'in_progress', actual_start = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'released' RETURNING *`;
      if (!rows[0]) throw new ConflictError({ detail: 'Order must be in released status to start' });
      return mapOrder(rows[0]);
    },
  );

  fastify.post(
    `${API_V1_PREFIX}/maintenance/orders/:id/complete`,
    { preHandler: [requireAuth, requirePermission(PM_ORDER_UPDATE)] },
    async (request) => {
      const { tenantId } = request.user;
      const { id } = request.params as { id: string };
      const b = request.body as { laborHours?: number; laborCostSatang?: string; downtimeHours?: number } | undefined;

      const matCostRows = await fastify.sql<{ total: string }[]>`
        SELECT COALESCE(SUM(total_cost_satang), 0)::text AS total
        FROM maintenance_order_parts WHERE maintenance_order_id = ${id} AND issued = TRUE`;
      const materialCost = BigInt(matCostRows[0]?.total ?? '0');
      const laborCost = BigInt(b?.laborCostSatang ?? '0');
      const totalCost = materialCost + laborCost;

      const rows = await fastify.sql<OrderRow[]>`
        UPDATE maintenance_orders SET
          status = 'completed', actual_end = NOW(),
          labor_hours = COALESCE(${b?.laborHours ?? null}::numeric, labor_hours),
          labor_cost_satang = ${laborCost.toString()}::bigint,
          material_cost_satang = ${materialCost.toString()}::bigint,
          total_cost_satang = ${totalCost.toString()}::bigint,
          downtime_hours = COALESCE(${b?.downtimeHours ?? null}::numeric, downtime_hours)
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'in_progress' RETURNING *`;
      if (!rows[0]) throw new ConflictError({ detail: 'Order must be in_progress to complete' });
      return mapOrder(rows[0]);
    },
  );

  fastify.post(
    `${API_V1_PREFIX}/maintenance/orders/:id/close`,
    { preHandler: [requireAuth, requirePermission(PM_ORDER_CLOSE)] },
    async (request) => {
      const { tenantId } = request.user;
      const { id } = request.params as { id: string };
      const rows = await fastify.sql<OrderRow[]>`
        UPDATE maintenance_orders SET status = 'closed'
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'completed' RETURNING *`;
      if (!rows[0]) throw new ConflictError({ detail: 'Order must be completed to close' });
      return mapOrder(rows[0]);
    },
  );

  // =======================================================================
  // PARTS
  // =======================================================================

  fastify.post(
    `${API_V1_PREFIX}/maintenance/orders/:id/parts`,
    { preHandler: [requireAuth, requirePermission(PM_ORDER_UPDATE)] },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { id } = request.params as { id: string };
      const b = request.body as {
        productId?: string; description?: string;
        quantity: number; unitCostSatang?: string;
      };
      const orderRows = await fastify.sql`
        SELECT id FROM maintenance_orders WHERE id = ${id} AND tenant_id = ${tenantId}
          AND status NOT IN ('closed','cancelled')`;
      if (!orderRows[0]) throw new NotFoundError({ detail: 'Maintenance order not found or already closed' });

      const unitCost = BigInt(b.unitCostSatang ?? '0');
      const totalCost = unitCost * BigInt(Math.round(b.quantity));

      const rows = await fastify.sql<PartRow[]>`
        INSERT INTO maintenance_order_parts (maintenance_order_id, product_id, description,
          quantity, unit_cost_satang, total_cost_satang, tenant_id)
        VALUES (${id}, ${b.productId ?? null}, ${b.description ?? null},
          ${b.quantity}, ${unitCost.toString()}::bigint, ${totalCost.toString()}::bigint,
          ${tenantId})
        RETURNING *`;
      return reply.status(201).send(mapPart(rows[0]!));
    },
  );

  fastify.post(
    `${API_V1_PREFIX}/maintenance/orders/:id/parts/:partId/issue`,
    { preHandler: [requireAuth, requirePermission(PM_ORDER_UPDATE)] },
    async (request) => {
      const { tenantId, sub: userId } = request.user;
      const { id, partId } = request.params as { id: string; partId: string };
      const b = request.body as { warehouseId: string };

      const partRows = await fastify.sql<PartRow[]>`
        SELECT * FROM maintenance_order_parts
        WHERE id = ${partId} AND maintenance_order_id = ${id} AND tenant_id = ${tenantId}`;
      const part = partRows[0];
      if (!part) throw new NotFoundError({ detail: 'Part not found' });
      if (part.issued) throw new ConflictError({ detail: 'Part already issued' });
      if (!part.product_id) throw new ValidationError({ detail: 'Part has no product_id — cannot issue from inventory' });

      await fastify.sql`
        INSERT INTO stock_movements (product_id, warehouse_id, movement_type, quantity,
          reference_type, reference_id, notes, created_by, tenant_id)
        VALUES (${part.product_id}, ${b.warehouseId}, 'out', ${Number(part.quantity)},
          'maintenance_order', ${id}, ${`Issued for MO ${id}`}, ${userId}, ${tenantId})`;

      const updatedRows = await fastify.sql<PartRow[]>`
        UPDATE maintenance_order_parts SET issued = TRUE
        WHERE id = ${partId} RETURNING *`;
      return mapPart(updatedRows[0]!);
    },
  );

  // =======================================================================
  // REPORTS
  // =======================================================================

  fastify.get(
    `${API_V1_PREFIX}/maintenance/reports/downtime`,
    { preHandler: [requireAuth, requirePermission(PM_ORDER_READ)] },
    async (request) => {
      const { tenantId } = request.user;
      const q = request.query as { from?: string; to?: string };
      const from = q.from ?? '2000-01-01';
      const to = q.to ?? '2099-12-31';

      const rows = await fastify.sql`
        SELECT e.id, e.code, e.name_th,
          COALESCE(SUM(mo.downtime_hours), 0)::numeric AS total_downtime_hours,
          COUNT(mo.id)::int AS order_count
        FROM equipment e
        LEFT JOIN maintenance_orders mo ON mo.equipment_id = e.id
          AND mo.status IN ('completed','closed')
          AND mo.actual_end BETWEEN ${from}::date AND ${to}::date
        WHERE e.tenant_id = ${tenantId}
        GROUP BY e.id ORDER BY total_downtime_hours DESC`;
      return { data: rows };
    },
  );

  fastify.get(
    `${API_V1_PREFIX}/maintenance/reports/mttr-mtbf`,
    { preHandler: [requireAuth, requirePermission(PM_ORDER_READ)] },
    async (request) => {
      const { tenantId } = request.user;
      const rows = await fastify.sql`
        SELECT e.id, e.code, e.name_th,
          COUNT(mo.id)::int AS failure_count,
          COALESCE(AVG(EXTRACT(EPOCH FROM (mo.actual_end - mo.actual_start)) / 3600), 0)::numeric(10,2) AS mttr_hours,
          CASE WHEN COUNT(mo.id) > 1
            THEN (EXTRACT(EPOCH FROM (MAX(mo.actual_start) - MIN(mo.actual_start))) / 3600 / (COUNT(mo.id) - 1))::numeric(10,2)
            ELSE NULL END AS mtbf_hours
        FROM equipment e
        LEFT JOIN maintenance_orders mo ON mo.equipment_id = e.id
          AND mo.order_type = 'corrective' AND mo.status IN ('completed','closed')
        WHERE e.tenant_id = ${tenantId}
        GROUP BY e.id ORDER BY e.code`;
      return { data: rows };
    },
  );

  fastify.get(
    `${API_V1_PREFIX}/maintenance/reports/cost`,
    { preHandler: [requireAuth, requirePermission(PM_ORDER_READ)] },
    async (request) => {
      const { tenantId } = request.user;
      const q = request.query as { from?: string; to?: string };
      const from = q.from ?? '2000-01-01';
      const to = q.to ?? '2099-12-31';

      const rows = await fastify.sql`
        SELECT e.id, e.code, e.name_th,
          COALESCE(SUM(mo.material_cost_satang), 0)::text AS total_material_satang,
          COALESCE(SUM(mo.labor_cost_satang), 0)::text AS total_labor_satang,
          COALESCE(SUM(mo.total_cost_satang), 0)::text AS total_cost_satang,
          COUNT(mo.id)::int AS order_count
        FROM equipment e
        LEFT JOIN maintenance_orders mo ON mo.equipment_id = e.id
          AND mo.status IN ('completed','closed')
          AND mo.actual_end BETWEEN ${from}::date AND ${to}::date
        WHERE e.tenant_id = ${tenantId}
        GROUP BY e.id ORDER BY total_cost_satang DESC`;
      return { data: rows };
    },
  );

  fastify.get(
    `${API_V1_PREFIX}/maintenance/oee/:equipmentId`,
    { preHandler: [requireAuth, requirePermission(PM_ORDER_READ)] },
    async (request) => {
      const { tenantId } = request.user;
      const { equipmentId } = request.params as { equipmentId: string };
      const q = request.query as { from?: string; to?: string; scheduledHours?: string };
      const from = q.from ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const to = q.to ?? new Date().toISOString().slice(0, 10);
      const scheduledHours = Number(q.scheduledHours) || 720;

      const eqRows = await fastify.sql`SELECT id FROM equipment WHERE id = ${equipmentId} AND tenant_id = ${tenantId}`;
      if (!eqRows[0]) throw new NotFoundError({ detail: 'Equipment not found' });

      const dtRows = await fastify.sql<{ total: string }[]>`
        SELECT COALESCE(SUM(downtime_hours), 0)::text AS total
        FROM maintenance_orders
        WHERE equipment_id = ${equipmentId} AND tenant_id = ${tenantId}
          AND status IN ('completed','closed')
          AND actual_end BETWEEN ${from}::date AND ${to}::date`;
      const downtimeHours = Number(dtRows[0]?.total ?? '0');
      const availability = scheduledHours > 0 ? (scheduledHours - downtimeHours) / scheduledHours : 0;
      const performance = 1.0;
      const quality = 1.0;
      const oee = availability * performance * quality;

      return {
        equipmentId,
        period: { from, to },
        scheduledHours,
        downtimeHours,
        availability: Math.round(availability * 10000) / 100,
        performance: Math.round(performance * 10000) / 100,
        quality: Math.round(quality * 10000) / 100,
        oee: Math.round(oee * 10000) / 100,
      };
    },
  );
}
