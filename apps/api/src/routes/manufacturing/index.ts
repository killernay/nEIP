/**
 * Manufacturing (PP) routes — BOM, Work Centers, Production Orders, MRP.
 *
 * Routes:
 *   POST /api/v1/boms                              — create BOM
 *   GET  /api/v1/boms                              — list BOMs
 *   GET  /api/v1/boms/:id                          — get BOM with lines
 *   PUT  /api/v1/boms/:id                          — update BOM header
 *   DELETE /api/v1/boms/:id                        — delete BOM
 *   POST /api/v1/boms/:id/copy                     — copy BOM (new version)
 *   POST /api/v1/boms/:id/lines                    — add BOM line
 *   GET  /api/v1/boms/:id/lines                    — list BOM lines
 *   DELETE /api/v1/bom-lines/:lineId               — delete BOM line
 *   POST /api/v1/work-centers                      — create work center
 *   GET  /api/v1/work-centers                      — list work centers
 *   GET  /api/v1/work-centers/:id                  — get work center
 *   PUT  /api/v1/work-centers/:id                  — update work center
 *   DELETE /api/v1/work-centers/:id                — delete work center
 *   POST /api/v1/production-orders                 — create from BOM
 *   GET  /api/v1/production-orders                 — list
 *   POST /api/v1/production-orders/:id/release     — release
 *   POST /api/v1/production-orders/:id/issue-materials — issue components
 *   POST /api/v1/production-orders/:id/confirm     — confirm production
 *   POST /api/v1/production-orders/:id/goods-receipt — receive finished goods
 *   POST /api/v1/production-orders/:id/close       — close order
 *   POST /api/v1/manufacturing/mrp-run             — simple MRP
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, ConflictError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';

// ---------------------------------------------------------------------------
// Permission constants
// ---------------------------------------------------------------------------
const PP_BOM_CREATE       = 'pp:bom:create'       as const;
const PP_BOM_READ         = 'pp:bom:read'         as const;
const PP_BOM_UPDATE       = 'pp:bom:update'       as const;
const PP_BOM_DELETE       = 'pp:bom:delete'       as const;
const PP_WC_CREATE        = 'pp:work-center:create' as const;
const PP_WC_READ          = 'pp:work-center:read'   as const;
const PP_WC_UPDATE        = 'pp:work-center:update' as const;
const PP_WC_DELETE        = 'pp:work-center:delete' as const;
const PP_PROD_CREATE      = 'pp:production:create'  as const;
const PP_PROD_READ        = 'pp:production:read'    as const;
const PP_PROD_UPDATE      = 'pp:production:update'  as const;
const PP_MRP_RUN          = 'pp:mrp:run'            as const;

// ---------------------------------------------------------------------------
// Row interfaces
// ---------------------------------------------------------------------------

interface BomHeaderRow {
  id: string; product_id: string; version: number; name_th: string | null; name_en: string | null;
  status: string; valid_from: string | null; valid_to: string | null; notes: string | null;
  tenant_id: string; created_by: string | null;
  created_at: Date | string; updated_at: Date | string;
}

interface BomLineRow {
  id: string; bom_id: string; component_product_id: string;
  quantity: string; unit: string; scrap_percent: string | null; position: number;
  notes: string | null; tenant_id: string; created_at: Date | string;
}

interface WorkCenterRow {
  id: string; code: string; name_th: string; name_en: string | null;
  capacity_per_hour: string | null; cost_rate_satang: string | number | null;
  department_id: string | null; is_active: boolean;
  tenant_id: string; created_at: Date | string; updated_at: Date | string;
}

interface ProductionOrderRow {
  id: string; document_number: string; product_id: string; bom_id: string;
  planned_quantity: string; completed_quantity: string; scrap_quantity: string;
  status: string; planned_start: string | null; planned_end: string | null;
  actual_start: Date | string | null; actual_end: Date | string | null;
  work_center_id: string | null; warehouse_id: string | null; notes: string | null;
  tenant_id: string; created_by: string | null;
  created_at: Date | string; updated_at: Date | string;
}

interface ProdComponentRow {
  id: string; production_order_id: string; component_product_id: string;
  required_quantity: string; issued_quantity: string; scrap_quantity: string;
  warehouse_id: string | null; tenant_id: string; created_at: Date | string;
}

interface ProdConfirmRow {
  id: string; production_order_id: string; confirmed_quantity: string;
  scrap_quantity: string; labor_hours: string; machine_hours: string;
  notes: string | null; confirmed_by: string | null;
  confirmed_at: Date | string; tenant_id: string;
}

interface CountRow { count: string; }

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapBom(r: BomHeaderRow) {
  return {
    id: r.id, productId: r.product_id, version: r.version,
    nameTh: r.name_th, nameEn: r.name_en, status: r.status,
    validFrom: r.valid_from, validTo: r.valid_to, notes: r.notes,
    createdBy: r.created_by,
    createdAt: toISO(r.created_at), updatedAt: toISO(r.updated_at),
  };
}

function mapBomLine(r: BomLineRow) {
  return {
    id: r.id, bomId: r.bom_id, componentProductId: r.component_product_id,
    quantity: Number(r.quantity), unit: r.unit, scrapPercent: Number(r.scrap_percent ?? 0),
    position: r.position, notes: r.notes,
    createdAt: toISO(r.created_at),
  };
}

function mapWorkCenter(r: WorkCenterRow) {
  return {
    id: r.id, code: r.code, nameTh: r.name_th, nameEn: r.name_en,
    capacityPerHour: Number(r.capacity_per_hour ?? 1),
    costRateSatang: Number(r.cost_rate_satang ?? 0),
    departmentId: r.department_id, isActive: r.is_active,
    createdAt: toISO(r.created_at), updatedAt: toISO(r.updated_at),
  };
}

function mapProdOrder(r: ProductionOrderRow) {
  return {
    id: r.id, documentNumber: r.document_number, productId: r.product_id, bomId: r.bom_id,
    plannedQuantity: Number(r.planned_quantity), completedQuantity: Number(r.completed_quantity),
    scrapQuantity: Number(r.scrap_quantity), status: r.status,
    plannedStart: r.planned_start, plannedEnd: r.planned_end,
    actualStart: r.actual_start ? toISO(r.actual_start) : null,
    actualEnd: r.actual_end ? toISO(r.actual_end) : null,
    workCenterId: r.work_center_id, warehouseId: r.warehouse_id, notes: r.notes,
    createdBy: r.created_by,
    createdAt: toISO(r.created_at), updatedAt: toISO(r.updated_at),
  };
}

function mapComponent(r: ProdComponentRow) {
  return {
    id: r.id, productionOrderId: r.production_order_id,
    componentProductId: r.component_product_id,
    requiredQuantity: Number(r.required_quantity),
    issuedQuantity: Number(r.issued_quantity),
    scrapQuantity: Number(r.scrap_quantity),
    warehouseId: r.warehouse_id, createdAt: toISO(r.created_at),
  };
}

function mapConfirmation(r: ProdConfirmRow) {
  return {
    id: r.id, productionOrderId: r.production_order_id,
    confirmedQuantity: Number(r.confirmed_quantity),
    scrapQuantity: Number(r.scrap_quantity),
    laborHours: Number(r.labor_hours), machineHours: Number(r.machine_hours),
    notes: r.notes, confirmedBy: r.confirmed_by,
    confirmedAt: toISO(r.confirmed_at),
  };
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export async function manufacturingRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // =========================================================================
  // BOM HEADERS
  // =========================================================================

  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/boms`,
    {
      schema: { description: 'สร้าง BOM ใหม่ — Create a new Bill of Materials', tags: ['manufacturing'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PP_BOM_CREATE)],
    },
    async (request, reply) => {
      const b = request.body;
      const { tenantId } = request.user;
      const id = crypto.randomUUID();

      if (!b['productId']) throw new ValidationError({ detail: 'productId is required.' });

      await fastify.sql`
        INSERT INTO bom_headers (id, product_id, version, name_th, name_en, status, valid_from, valid_to, notes, tenant_id, created_by)
        VALUES (
          ${id}, ${b['productId'] as string},
          ${Number(b['version'] ?? 1)},
          ${(b['nameTh'] as string | undefined) ?? null},
          ${(b['nameEn'] as string | undefined) ?? null},
          ${(b['status'] as string | undefined) ?? 'active'},
          ${(b['validFrom'] as string | undefined) ?? null},
          ${(b['validTo'] as string | undefined) ?? null},
          ${(b['notes'] as string | undefined) ?? null},
          ${tenantId},
          ${request.user.sub}
        )
      `;

      const rows = await fastify.sql<BomHeaderRow[]>`SELECT * FROM bom_headers WHERE id = ${id} LIMIT 1`;
      return reply.status(201).send(mapBom(rows[0]!));
    },
  );

  fastify.get<{ Querystring: Record<string, string> }>(
    `${API_V1_PREFIX}/boms`,
    {
      schema: { description: 'รายการ BOM — List BOMs', tags: ['manufacturing'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PP_BOM_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const limit = parseInt(request.query['limit'] ?? '50', 10);
      const offset = parseInt(request.query['offset'] ?? '0', 10);
      const productId = request.query['productId'];
      const status = request.query['status'];

      let rows: BomHeaderRow[];
      let countRows: CountRow[];

      if (productId && status) {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM bom_headers WHERE tenant_id=${tenantId} AND product_id=${productId} AND status=${status}`;
        rows = await fastify.sql<BomHeaderRow[]>`SELECT * FROM bom_headers WHERE tenant_id=${tenantId} AND product_id=${productId} AND status=${status} ORDER BY version DESC LIMIT ${limit} OFFSET ${offset}`;
      } else if (productId) {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM bom_headers WHERE tenant_id=${tenantId} AND product_id=${productId}`;
        rows = await fastify.sql<BomHeaderRow[]>`SELECT * FROM bom_headers WHERE tenant_id=${tenantId} AND product_id=${productId} ORDER BY version DESC LIMIT ${limit} OFFSET ${offset}`;
      } else if (status) {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM bom_headers WHERE tenant_id=${tenantId} AND status=${status}`;
        rows = await fastify.sql<BomHeaderRow[]>`SELECT * FROM bom_headers WHERE tenant_id=${tenantId} AND status=${status} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      } else {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM bom_headers WHERE tenant_id=${tenantId}`;
        rows = await fastify.sql<BomHeaderRow[]>`SELECT * FROM bom_headers WHERE tenant_id=${tenantId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      }

      const total = parseInt(countRows[0]?.count ?? '0', 10);
      return reply.send({ items: rows.map(mapBom), total, limit, offset, hasMore: offset + limit < total });
    },
  );

  fastify.get<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/boms/:id`,
    {
      schema: { description: 'ดู BOM พร้อม Lines — Get BOM with components', tags: ['manufacturing'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PP_BOM_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { id } = request.params;

      const headers = await fastify.sql<BomHeaderRow[]>`SELECT * FROM bom_headers WHERE id=${id} AND tenant_id=${tenantId} LIMIT 1`;
      if (!headers[0]) throw new NotFoundError({ detail: `BOM ${id} not found.` });

      const lines = await fastify.sql<BomLineRow[]>`SELECT * FROM bom_lines WHERE bom_id=${id} ORDER BY position`;
      return reply.send({ ...mapBom(headers[0]), lines: lines.map(mapBomLine) });
    },
  );

  fastify.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/boms/:id`,
    {
      schema: { description: 'อัปเดต BOM — Update BOM header', tags: ['manufacturing'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PP_BOM_UPDATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { id } = request.params;
      const b = request.body;

      const existing = await fastify.sql<BomHeaderRow[]>`SELECT * FROM bom_headers WHERE id=${id} AND tenant_id=${tenantId} LIMIT 1`;
      if (!existing[0]) throw new NotFoundError({ detail: `BOM ${id} not found.` });

      const rows = await fastify.sql<BomHeaderRow[]>`
        UPDATE bom_headers SET
          name_th    = COALESCE(${(b['nameTh'] as string | undefined) ?? null}, name_th),
          name_en    = COALESCE(${(b['nameEn'] as string | undefined) ?? null}, name_en),
          status     = COALESCE(${(b['status'] as string | undefined) ?? null}, status),
          valid_from = COALESCE(${(b['validFrom'] as string | undefined) ?? null}, valid_from),
          valid_to   = COALESCE(${(b['validTo'] as string | undefined) ?? null}, valid_to),
          notes      = COALESCE(${(b['notes'] as string | undefined) ?? null}, notes),
          updated_at = NOW()
        WHERE id=${id} AND tenant_id=${tenantId}
        RETURNING *
      `;
      return reply.send(mapBom(rows[0]!));
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/boms/:id`,
    {
      schema: { description: 'ลบ BOM — Delete BOM', tags: ['manufacturing'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PP_BOM_DELETE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { id } = request.params;

      // Check no production orders reference this BOM
      const refs = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM production_orders WHERE bom_id=${id}`;
      if (parseInt(refs[0]?.count ?? '0', 10) > 0) {
        throw new ConflictError({ detail: 'Cannot delete BOM — production orders reference it.' });
      }

      await fastify.sql`DELETE FROM bom_headers WHERE id=${id} AND tenant_id=${tenantId}`;
      return reply.status(204).send();
    },
  );

  // Copy BOM (new version)
  fastify.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/boms/:id/copy`,
    {
      schema: { description: 'คัดลอก BOM เป็นเวอร์ชันใหม่ — Copy BOM as new version', tags: ['manufacturing'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PP_BOM_CREATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { id } = request.params;

      const existing = await fastify.sql<BomHeaderRow[]>`SELECT * FROM bom_headers WHERE id=${id} AND tenant_id=${tenantId} LIMIT 1`;
      if (!existing[0]) throw new NotFoundError({ detail: `BOM ${id} not found.` });

      // Get max version for this product
      const maxV = await fastify.sql<{ max_version: number }[]>`
        SELECT COALESCE(MAX(version), 0) as max_version FROM bom_headers WHERE product_id=${existing[0].product_id} AND tenant_id=${tenantId}
      `;
      const newVersion = (maxV[0]?.max_version ?? 0) + 1;
      const newId = crypto.randomUUID();

      await fastify.sql`
        INSERT INTO bom_headers (id, product_id, version, name_th, name_en, status, valid_from, valid_to, notes, tenant_id, created_by)
        VALUES (${newId}, ${existing[0].product_id}, ${newVersion}, ${existing[0].name_th}, ${existing[0].name_en}, 'draft', ${existing[0].valid_from}, ${existing[0].valid_to}, ${existing[0].notes}, ${tenantId}, ${request.user.sub})
      `;

      // Copy lines
      const lines = await fastify.sql<BomLineRow[]>`SELECT * FROM bom_lines WHERE bom_id=${id}`;
      for (const line of lines) {
        await fastify.sql`
          INSERT INTO bom_lines (id, bom_id, component_product_id, quantity, unit, scrap_percent, position, notes, tenant_id)
          VALUES (${crypto.randomUUID()}, ${newId}, ${line.component_product_id}, ${line.quantity}, ${line.unit}, ${line.scrap_percent}, ${line.position}, ${line.notes}, ${tenantId})
        `;
      }

      const rows = await fastify.sql<BomHeaderRow[]>`SELECT * FROM bom_headers WHERE id=${newId} LIMIT 1`;
      return reply.status(201).send(mapBom(rows[0]!));
    },
  );

  // =========================================================================
  // BOM LINES
  // =========================================================================

  fastify.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/boms/:id/lines`,
    {
      schema: { description: 'เพิ่มส่วนประกอบ BOM — Add BOM component line', tags: ['manufacturing'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PP_BOM_UPDATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { id: bomId } = request.params;
      const b = request.body;

      const bom = await fastify.sql<BomHeaderRow[]>`SELECT * FROM bom_headers WHERE id=${bomId} AND tenant_id=${tenantId} LIMIT 1`;
      if (!bom[0]) throw new NotFoundError({ detail: `BOM ${bomId} not found.` });

      if (!b['componentProductId']) throw new ValidationError({ detail: 'componentProductId is required.' });

      const lineId = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO bom_lines (id, bom_id, component_product_id, quantity, unit, scrap_percent, position, notes, tenant_id)
        VALUES (
          ${lineId}, ${bomId},
          ${b['componentProductId'] as string},
          ${Number(b['quantity'] ?? 1)},
          ${(b['unit'] as string | undefined) ?? 'EA'},
          ${Number(b['scrapPercent'] ?? 0)},
          ${Number(b['position'] ?? 0)},
          ${(b['notes'] as string | undefined) ?? null},
          ${tenantId}
        )
      `;

      const rows = await fastify.sql<BomLineRow[]>`SELECT * FROM bom_lines WHERE id=${lineId} LIMIT 1`;
      return reply.status(201).send(mapBomLine(rows[0]!));
    },
  );

  fastify.get<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/boms/:id/lines`,
    {
      schema: { description: 'รายการส่วนประกอบ BOM — List BOM lines', tags: ['manufacturing'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PP_BOM_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { id: bomId } = request.params;
      const rows = await fastify.sql<BomLineRow[]>`SELECT * FROM bom_lines WHERE bom_id=${bomId} AND tenant_id=${tenantId} ORDER BY position`;
      return reply.send({ items: rows.map(mapBomLine), total: rows.length });
    },
  );

  fastify.delete<{ Params: { lineId: string } }>(
    `${API_V1_PREFIX}/bom-lines/:lineId`,
    {
      schema: { description: 'ลบส่วนประกอบ BOM — Delete BOM line', tags: ['manufacturing'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PP_BOM_UPDATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      await fastify.sql`DELETE FROM bom_lines WHERE id=${request.params.lineId} AND tenant_id=${tenantId}`;
      return reply.status(204).send();
    },
  );

  // =========================================================================
  // WORK CENTERS
  // =========================================================================

  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/work-centers`,
    {
      schema: { description: 'สร้างศูนย์ผลิต — Create work center', tags: ['manufacturing'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PP_WC_CREATE)],
    },
    async (request, reply) => {
      const b = request.body;
      const { tenantId } = request.user;
      if (!b['code'] || !b['nameTh']) throw new ValidationError({ detail: 'code and nameTh are required.' });

      const id = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO work_centers (id, code, name_th, name_en, capacity_per_hour, cost_rate_satang, department_id, is_active, tenant_id)
        VALUES (
          ${id}, ${b['code'] as string}, ${b['nameTh'] as string},
          ${(b['nameEn'] as string | undefined) ?? null},
          ${Number(b['capacityPerHour'] ?? 1)},
          ${Number(b['costRateSatang'] ?? 0)},
          ${(b['departmentId'] as string | undefined) ?? null},
          ${b['isActive'] !== false},
          ${tenantId}
        )
      `;

      const rows = await fastify.sql<WorkCenterRow[]>`SELECT * FROM work_centers WHERE id=${id} LIMIT 1`;
      return reply.status(201).send(mapWorkCenter(rows[0]!));
    },
  );

  fastify.get<{ Querystring: Record<string, string> }>(
    `${API_V1_PREFIX}/work-centers`,
    {
      schema: { description: 'รายการศูนย์ผลิต — List work centers', tags: ['manufacturing'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PP_WC_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const rows = await fastify.sql<WorkCenterRow[]>`SELECT * FROM work_centers WHERE tenant_id=${tenantId} ORDER BY code`;
      return reply.send({ items: rows.map(mapWorkCenter), total: rows.length });
    },
  );

  fastify.get<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/work-centers/:id`,
    {
      schema: { description: 'ดูศูนย์ผลิต — Get work center', tags: ['manufacturing'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PP_WC_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const rows = await fastify.sql<WorkCenterRow[]>`SELECT * FROM work_centers WHERE id=${request.params.id} AND tenant_id=${tenantId} LIMIT 1`;
      if (!rows[0]) throw new NotFoundError({ detail: `Work center ${request.params.id} not found.` });
      return reply.send(mapWorkCenter(rows[0]));
    },
  );

  fastify.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/work-centers/:id`,
    {
      schema: { description: 'อัปเดตศูนย์ผลิต — Update work center', tags: ['manufacturing'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PP_WC_UPDATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { id } = request.params;
      const b = request.body;

      const existing = await fastify.sql<WorkCenterRow[]>`SELECT * FROM work_centers WHERE id=${id} AND tenant_id=${tenantId} LIMIT 1`;
      if (!existing[0]) throw new NotFoundError({ detail: `Work center ${id} not found.` });

      const rows = await fastify.sql<WorkCenterRow[]>`
        UPDATE work_centers SET
          code             = COALESCE(${(b['code'] as string | undefined) ?? null}, code),
          name_th          = COALESCE(${(b['nameTh'] as string | undefined) ?? null}, name_th),
          name_en          = COALESCE(${(b['nameEn'] as string | undefined) ?? null}, name_en),
          capacity_per_hour = COALESCE(${b['capacityPerHour'] != null ? Number(b['capacityPerHour']) : null}, capacity_per_hour),
          cost_rate_satang = COALESCE(${b['costRateSatang'] != null ? Number(b['costRateSatang']) : null}, cost_rate_satang),
          department_id    = COALESCE(${(b['departmentId'] as string | undefined) ?? null}, department_id),
          is_active        = COALESCE(${b['isActive'] != null ? Boolean(b['isActive']) : null}, is_active),
          updated_at       = NOW()
        WHERE id=${id} AND tenant_id=${tenantId}
        RETURNING *
      `;
      return reply.send(mapWorkCenter(rows[0]!));
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/work-centers/:id`,
    {
      schema: { description: 'ลบศูนย์ผลิต — Delete work center', tags: ['manufacturing'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PP_WC_DELETE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const refs = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM production_orders WHERE work_center_id=${request.params.id}`;
      if (parseInt(refs[0]?.count ?? '0', 10) > 0) {
        throw new ConflictError({ detail: 'Cannot delete work center — production orders reference it.' });
      }
      await fastify.sql`DELETE FROM work_centers WHERE id=${request.params.id} AND tenant_id=${tenantId}`;
      return reply.status(204).send();
    },
  );

  // =========================================================================
  // PRODUCTION ORDERS
  // =========================================================================

  // Create from BOM — explode components
  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/production-orders`,
    {
      schema: { description: 'สร้างใบสั่งผลิตจาก BOM — Create production order from BOM', tags: ['manufacturing'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PP_PROD_CREATE)],
    },
    async (request, reply) => {
      const b = request.body;
      const { tenantId, sub: userId } = request.user;

      if (!b['productId'] || !b['bomId'] || !b['plannedQuantity']) {
        throw new ValidationError({ detail: 'productId, bomId, plannedQuantity are required.' });
      }

      const bomId = b['bomId'] as string;
      const plannedQty = Number(b['plannedQuantity']);

      // Validate BOM exists and is active
      const bom = await fastify.sql<BomHeaderRow[]>`SELECT * FROM bom_headers WHERE id=${bomId} AND tenant_id=${tenantId} AND status='active' LIMIT 1`;
      if (!bom[0]) throw new NotFoundError({ detail: `Active BOM ${bomId} not found.` });

      // Generate document number
      const seqRows = await fastify.sql<{ cnt: string }[]>`SELECT COUNT(*)::text as cnt FROM production_orders WHERE tenant_id=${tenantId}`;
      const seq = parseInt(seqRows[0]?.cnt ?? '0', 10) + 1;
      const docNum = (b['documentNumber'] as string | undefined) ?? `PO-${String(seq).padStart(6, '0')}`;

      const id = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO production_orders (id, document_number, product_id, bom_id, planned_quantity, status,
          planned_start, planned_end, work_center_id, warehouse_id, notes, tenant_id, created_by)
        VALUES (
          ${id}, ${docNum}, ${b['productId'] as string}, ${bomId}, ${plannedQty}, 'planned',
          ${(b['plannedStart'] as string | undefined) ?? null},
          ${(b['plannedEnd'] as string | undefined) ?? null},
          ${(b['workCenterId'] as string | undefined) ?? null},
          ${(b['warehouseId'] as string | undefined) ?? null},
          ${(b['notes'] as string | undefined) ?? null},
          ${tenantId}, ${userId}
        )
      `;

      // Explode BOM lines into production order components
      const bomLines = await fastify.sql<BomLineRow[]>`SELECT * FROM bom_lines WHERE bom_id=${bomId}`;
      for (const line of bomLines) {
        const scrapFactor = 1 + Number(line.scrap_percent ?? 0) / 100;
        const requiredQty = plannedQty * Number(line.quantity) * scrapFactor;
        await fastify.sql`
          INSERT INTO production_order_components (id, production_order_id, component_product_id, required_quantity, warehouse_id, tenant_id)
          VALUES (${crypto.randomUUID()}, ${id}, ${line.component_product_id}, ${requiredQty},
            ${(b['warehouseId'] as string | undefined) ?? null}, ${tenantId})
        `;
      }

      const rows = await fastify.sql<ProductionOrderRow[]>`SELECT * FROM production_orders WHERE id=${id} LIMIT 1`;
      const components = await fastify.sql<ProdComponentRow[]>`SELECT * FROM production_order_components WHERE production_order_id=${id}`;
      return reply.status(201).send({ ...mapProdOrder(rows[0]!), components: components.map(mapComponent) });
    },
  );

  // List production orders
  fastify.get<{ Querystring: Record<string, string> }>(
    `${API_V1_PREFIX}/production-orders`,
    {
      schema: { description: 'รายการใบสั่งผลิต — List production orders', tags: ['manufacturing'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PP_PROD_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const limit = parseInt(request.query['limit'] ?? '50', 10);
      const offset = parseInt(request.query['offset'] ?? '0', 10);
      const status = request.query['status'];

      let rows: ProductionOrderRow[];
      let countRows: CountRow[];

      if (status) {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM production_orders WHERE tenant_id=${tenantId} AND status=${status}`;
        rows = await fastify.sql<ProductionOrderRow[]>`SELECT * FROM production_orders WHERE tenant_id=${tenantId} AND status=${status} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      } else {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM production_orders WHERE tenant_id=${tenantId}`;
        rows = await fastify.sql<ProductionOrderRow[]>`SELECT * FROM production_orders WHERE tenant_id=${tenantId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      }

      const total = parseInt(countRows[0]?.count ?? '0', 10);
      return reply.send({ items: rows.map(mapProdOrder), total, limit, offset, hasMore: offset + limit < total });
    },
  );

  // Release: planned → released
  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/production-orders/:id/release`,
    {
      schema: { description: 'ปล่อยใบสั่งผลิต — Release production order', tags: ['manufacturing'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PP_PROD_UPDATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { id } = request.params;

      const existing = await fastify.sql<ProductionOrderRow[]>`SELECT * FROM production_orders WHERE id=${id} AND tenant_id=${tenantId} LIMIT 1`;
      if (!existing[0]) throw new NotFoundError({ detail: `Production order ${id} not found.` });
      if (existing[0].status !== 'planned') throw new ConflictError({ detail: `Cannot release — status is ${existing[0].status}, expected planned.` });

      const rows = await fastify.sql<ProductionOrderRow[]>`
        UPDATE production_orders SET status='released', updated_at=NOW() WHERE id=${id} RETURNING *
      `;
      return reply.send(mapProdOrder(rows[0]!));
    },
  );

  // Issue materials: create stock_movements for components
  fastify.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/production-orders/:id/issue-materials`,
    {
      schema: { description: 'เบิกวัตถุดิบ — Issue materials for production order', tags: ['manufacturing'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PP_PROD_UPDATE)],
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user;
      const { id } = request.params;

      const order = await fastify.sql<ProductionOrderRow[]>`SELECT * FROM production_orders WHERE id=${id} AND tenant_id=${tenantId} LIMIT 1`;
      if (!order[0]) throw new NotFoundError({ detail: `Production order ${id} not found.` });
      if (!['released', 'in_progress'].includes(order[0].status)) {
        throw new ConflictError({ detail: `Cannot issue materials — status is ${order[0].status}.` });
      }

      const warehouseId = order[0].warehouse_id;
      if (!warehouseId) throw new ValidationError({ detail: 'Production order has no warehouse assigned.' });

      const components = await fastify.sql<ProdComponentRow[]>`SELECT * FROM production_order_components WHERE production_order_id=${id}`;
      const issued: Array<{ componentProductId: string; issuedQty: number }> = [];

      for (const comp of components) {
        const remaining = Number(comp.required_quantity) - Number(comp.issued_quantity);
        if (remaining <= 0) continue;

        // Check stock
        const stockRows = await fastify.sql<{ quantity_on_hand: number }[]>`
          SELECT COALESCE(quantity_on_hand, 0) as quantity_on_hand FROM stock_levels
          WHERE product_id=${comp.component_product_id} AND warehouse_id=${warehouseId} LIMIT 1
        `;
        const available = stockRows[0]?.quantity_on_hand ?? 0;
        const issueQty = Math.min(remaining, available);
        if (issueQty <= 0) continue;

        const newBalance = available - issueQty;
        const movId = crypto.randomUUID();

        // Create stock movement (issue)
        await fastify.sql`
          INSERT INTO stock_movements (id, product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, balance_after, unit_cost_satang, tenant_id, created_by)
          VALUES (${movId}, ${comp.component_product_id}, ${warehouseId}, 'issue', ${-issueQty}, 'production_order', ${id}, ${newBalance}, 0, ${tenantId}, ${userId})
        `;

        // Update stock levels
        await fastify.sql`
          INSERT INTO stock_levels (product_id, warehouse_id, quantity_on_hand, quantity_reserved, quantity_available)
          VALUES (${comp.component_product_id}, ${warehouseId}, ${newBalance}, 0, ${newBalance})
          ON CONFLICT (product_id, warehouse_id) DO UPDATE SET
            quantity_on_hand = stock_levels.quantity_on_hand - ${issueQty},
            quantity_available = stock_levels.quantity_available - ${issueQty}
        `;

        // Update issued_quantity on component
        await fastify.sql`
          UPDATE production_order_components SET issued_quantity = issued_quantity + ${issueQty}
          WHERE id=${comp.id}
        `;

        issued.push({ componentProductId: comp.component_product_id, issuedQty: issueQty });
      }

      // Transition to in_progress if still released
      if (order[0].status === 'released') {
        await fastify.sql`UPDATE production_orders SET status='in_progress', actual_start=NOW(), updated_at=NOW() WHERE id=${id}`;
      }

      const updatedOrder = await fastify.sql<ProductionOrderRow[]>`SELECT * FROM production_orders WHERE id=${id} LIMIT 1`;
      return reply.send({ ...mapProdOrder(updatedOrder[0]!), materialsIssued: issued });
    },
  );

  // Confirm production
  fastify.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/production-orders/:id/confirm`,
    {
      schema: { description: 'ยืนยันผลผลิต — Confirm production quantity', tags: ['manufacturing'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PP_PROD_UPDATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { id } = request.params;
      const b = request.body;

      if (!b['confirmedQuantity']) throw new ValidationError({ detail: 'confirmedQuantity is required.' });

      const order = await fastify.sql<ProductionOrderRow[]>`SELECT * FROM production_orders WHERE id=${id} AND tenant_id=${tenantId} LIMIT 1`;
      if (!order[0]) throw new NotFoundError({ detail: `Production order ${id} not found.` });
      if (!['released', 'in_progress'].includes(order[0].status)) {
        throw new ConflictError({ detail: `Cannot confirm — status is ${order[0].status}.` });
      }

      const confirmId = crypto.randomUUID();
      const confirmedQty = Number(b['confirmedQuantity']);
      const scrapQty = Number(b['scrapQuantity'] ?? 0);

      await fastify.sql`
        INSERT INTO production_confirmations (id, production_order_id, confirmed_quantity, scrap_quantity, labor_hours, machine_hours, notes, confirmed_by, tenant_id)
        VALUES (
          ${confirmId}, ${id}, ${confirmedQty}, ${scrapQty},
          ${Number(b['laborHours'] ?? 0)}, ${Number(b['machineHours'] ?? 0)},
          ${(b['notes'] as string | undefined) ?? null},
          ${request.user.sub}, ${tenantId}
        )
      `;

      // Update production order totals
      await fastify.sql`
        UPDATE production_orders SET
          completed_quantity = completed_quantity + ${confirmedQty},
          scrap_quantity = scrap_quantity + ${scrapQty},
          status = CASE WHEN status = 'released' THEN 'in_progress' ELSE status END,
          actual_start = COALESCE(actual_start, NOW()),
          updated_at = NOW()
        WHERE id=${id}
      `;

      const updatedOrder = await fastify.sql<ProductionOrderRow[]>`SELECT * FROM production_orders WHERE id=${id} LIMIT 1`;
      const confirmation = await fastify.sql<ProdConfirmRow[]>`SELECT * FROM production_confirmations WHERE id=${confirmId} LIMIT 1`;
      return reply.status(201).send({ order: mapProdOrder(updatedOrder[0]!), confirmation: mapConfirmation(confirmation[0]!) });
    },
  );

  // Goods receipt — receive finished product into stock
  fastify.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/production-orders/:id/goods-receipt`,
    {
      schema: { description: 'รับสินค้าสำเร็จรูปเข้าคลัง — Goods receipt for finished product', tags: ['manufacturing'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PP_PROD_UPDATE)],
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user;
      const { id } = request.params;
      const b = request.body;

      const order = await fastify.sql<ProductionOrderRow[]>`SELECT * FROM production_orders WHERE id=${id} AND tenant_id=${tenantId} LIMIT 1`;
      if (!order[0]) throw new NotFoundError({ detail: `Production order ${id} not found.` });
      if (!['in_progress', 'released'].includes(order[0].status)) {
        throw new ConflictError({ detail: `Cannot receive goods — status is ${order[0].status}.` });
      }

      const warehouseId = (b['warehouseId'] as string | undefined) ?? order[0].warehouse_id;
      if (!warehouseId) throw new ValidationError({ detail: 'No warehouse specified.' });

      const receiveQty = Number(b['quantity'] ?? order[0].completed_quantity);
      if (receiveQty <= 0) throw new ValidationError({ detail: 'Receive quantity must be positive.' });

      // Get current stock
      const stockRows = await fastify.sql<{ quantity_on_hand: number }[]>`
        SELECT COALESCE(quantity_on_hand, 0) as quantity_on_hand FROM stock_levels
        WHERE product_id=${order[0].product_id} AND warehouse_id=${warehouseId} LIMIT 1
      `;
      const currentStock = stockRows[0]?.quantity_on_hand ?? 0;
      const newBalance = currentStock + receiveQty;

      const movId = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO stock_movements (id, product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, balance_after, unit_cost_satang, tenant_id, created_by)
        VALUES (${movId}, ${order[0].product_id}, ${warehouseId}, 'receive', ${receiveQty}, 'production_order', ${id}, ${newBalance}, 0, ${tenantId}, ${userId})
      `;

      await fastify.sql`
        INSERT INTO stock_levels (product_id, warehouse_id, quantity_on_hand, quantity_reserved, quantity_available)
        VALUES (${order[0].product_id}, ${warehouseId}, ${newBalance}, 0, ${newBalance})
        ON CONFLICT (product_id, warehouse_id) DO UPDATE SET
          quantity_on_hand = stock_levels.quantity_on_hand + ${receiveQty},
          quantity_available = stock_levels.quantity_available + ${receiveQty}
      `;

      // Mark completed if all planned qty received
      const totalCompleted = Number(order[0].completed_quantity);
      if (totalCompleted >= Number(order[0].planned_quantity)) {
        await fastify.sql`UPDATE production_orders SET status='completed', actual_end=NOW(), updated_at=NOW() WHERE id=${id}`;
      }

      const updatedOrder = await fastify.sql<ProductionOrderRow[]>`SELECT * FROM production_orders WHERE id=${id} LIMIT 1`;
      return reply.send({ ...mapProdOrder(updatedOrder[0]!), goodsReceiptQuantity: receiveQty, newStockBalance: newBalance });
    },
  );

  // Close production order
  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/production-orders/:id/close`,
    {
      schema: { description: 'ปิดใบสั่งผลิต — Close production order', tags: ['manufacturing'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PP_PROD_UPDATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { id } = request.params;

      const existing = await fastify.sql<ProductionOrderRow[]>`SELECT * FROM production_orders WHERE id=${id} AND tenant_id=${tenantId} LIMIT 1`;
      if (!existing[0]) throw new NotFoundError({ detail: `Production order ${id} not found.` });
      if (!['released', 'in_progress', 'completed'].includes(existing[0].status)) {
        throw new ConflictError({ detail: `Cannot close — status is ${existing[0].status}.` });
      }

      const rows = await fastify.sql<ProductionOrderRow[]>`
        UPDATE production_orders SET status='closed', actual_end=COALESCE(actual_end, NOW()), updated_at=NOW() WHERE id=${id} RETURNING *
      `;
      return reply.send(mapProdOrder(rows[0]!));
    },
  );

  // =========================================================================
  // SIMPLE MRP RUN
  // =========================================================================

  fastify.post(
    `${API_V1_PREFIX}/manufacturing/mrp-run`,
    {
      schema: { description: 'รัน MRP อย่างง่าย — Simple MRP run: generate planned orders from open SO lines', tags: ['manufacturing'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PP_MRP_RUN)],
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user;

      // 1. Read open SO lines not yet fulfilled
      const soLines = await fastify.sql<{
        product_id: string; total_ordered: string;
      }[]>`
        SELECT sol.product_id, SUM(sol.quantity - COALESCE(sol.delivered_quantity, 0))::numeric as total_ordered
        FROM sales_order_lines sol
        JOIN sales_orders so ON so.id = sol.sales_order_id
        WHERE so.tenant_id = ${tenantId}
          AND so.status IN ('confirmed', 'open')
          AND sol.quantity > COALESCE(sol.delivered_quantity, 0)
        GROUP BY sol.product_id
      `;

      const plannedOrders: Array<{ productId: string; shortfall: number; type: 'production' | 'purchase' }> = [];

      for (const line of soLines) {
        const productId = line.product_id;
        const demand = Number(line.total_ordered);

        // Check current stock
        const stockRows = await fastify.sql<{ total_stock: string }[]>`
          SELECT COALESCE(SUM(quantity_on_hand), 0)::numeric as total_stock
          FROM stock_levels WHERE product_id=${productId}
        `;
        const stock = Number(stockRows[0]?.total_stock ?? 0);

        // Check already planned production orders
        const plannedPO = await fastify.sql<{ total_planned: string }[]>`
          SELECT COALESCE(SUM(planned_quantity - completed_quantity), 0)::numeric as total_planned
          FROM production_orders
          WHERE product_id=${productId} AND tenant_id=${tenantId}
            AND status IN ('planned', 'released', 'in_progress')
        `;
        const alreadyPlanned = Number(plannedPO[0]?.total_planned ?? 0);

        const shortfall = demand - stock - alreadyPlanned;
        if (shortfall <= 0) continue;

        // Check if product has an active BOM
        const bomRows = await fastify.sql<BomHeaderRow[]>`
          SELECT * FROM bom_headers WHERE product_id=${productId} AND tenant_id=${tenantId} AND status='active'
          ORDER BY version DESC LIMIT 1
        `;

        if (bomRows[0]) {
          // Generate planned production order
          const orderId = crypto.randomUUID();
          const seqRows = await fastify.sql<{ cnt: string }[]>`SELECT COUNT(*)::text as cnt FROM production_orders WHERE tenant_id=${tenantId}`;
          const seq = parseInt(seqRows[0]?.cnt ?? '0', 10) + 1;
          const docNum = `MRP-${String(seq).padStart(6, '0')}`;

          await fastify.sql`
            INSERT INTO production_orders (id, document_number, product_id, bom_id, planned_quantity, status, tenant_id, created_by)
            VALUES (${orderId}, ${docNum}, ${productId}, ${bomRows[0].id}, ${shortfall}, 'planned', ${tenantId}, ${userId})
          `;

          // Explode BOM lines
          const bomLines = await fastify.sql<BomLineRow[]>`SELECT * FROM bom_lines WHERE bom_id=${bomRows[0].id}`;
          for (const bl of bomLines) {
            const scrapFactor = 1 + Number(bl.scrap_percent ?? 0) / 100;
            const reqQty = shortfall * Number(bl.quantity) * scrapFactor;
            await fastify.sql`
              INSERT INTO production_order_components (id, production_order_id, component_product_id, required_quantity, tenant_id)
              VALUES (${crypto.randomUUID()}, ${orderId}, ${bl.component_product_id}, ${reqQty}, ${tenantId})
            `;
          }

          plannedOrders.push({ productId, shortfall, type: 'production' });
        } else {
          // No BOM — generate purchase requisition
          const prId = crypto.randomUUID();
          const prSeqRows = await fastify.sql<{ cnt: string }[]>`SELECT COUNT(*)::text as cnt FROM purchase_requisitions WHERE tenant_id=${tenantId}`;
          const prSeq = parseInt(prSeqRows[0]?.cnt ?? '0', 10) + 1;
          const prDocNum = `MRP-PR-${String(prSeq).padStart(6, '0')}`;

          await fastify.sql`
            INSERT INTO purchase_requisitions (id, document_number, title, status, requested_by, tenant_id, created_at)
            VALUES (${prId}, ${prDocNum}, ${'MRP auto-generated for ' + productId}, 'draft', ${userId}, ${tenantId}, NOW())
          `;

          await fastify.sql`
            INSERT INTO pr_lines (id, pr_id, product_id, quantity, unit, estimated_price_satang, tenant_id)
            VALUES (${crypto.randomUUID()}, ${prId}, ${productId}, ${shortfall}, 'EA', 0, ${tenantId})
          `;

          plannedOrders.push({ productId, shortfall, type: 'purchase' });
        }
      }

      return reply.send({
        message: `MRP run complete. ${plannedOrders.length} actions generated.`,
        actions: plannedOrders,
      });
    },
  );
}
