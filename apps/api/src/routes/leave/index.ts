/**
 * Leave Management routes (HR-TM).
 *
 * Routes:
 *   POST /api/v1/leave-types                          — create leave type
 *   GET  /api/v1/leave-types                          — list leave types
 *   POST /api/v1/leave-requests                       — submit request
 *   GET  /api/v1/leave-requests                       — list (filter by employee/status/date)
 *   GET  /api/v1/leave-requests/:id                   — detail
 *   POST /api/v1/leave-requests/:id/approve           — approve
 *   POST /api/v1/leave-requests/:id/reject            — reject
 *   GET  /api/v1/leave-requests/balance/:employeeId   — remaining days by type
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, ConflictError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';

const HR_LT_CREATE   = 'hr:leave:type:create'      as const;
const HR_LT_READ     = 'hr:leave:type:read'        as const;
const HR_LR_CREATE   = 'hr:leave:request:create'   as const;
const HR_LR_READ     = 'hr:leave:request:read'     as const;
const HR_LR_APPROVE  = 'hr:leave:request:approve'  as const;
const HR_LR_REJECT   = 'hr:leave:request:reject'   as const;

interface LeaveTypeRow {
  id: string; code: string; name_th: string; name_en: string;
  annual_quota_days: number; is_paid: boolean; tenant_id: string;
  created_at: Date | string; updated_at: Date | string;
}

interface LeaveRequestRow {
  id: string; employee_id: string; leave_type_id: string;
  start_date: string; end_date: string; days: number;
  reason: string | null; status: string;
  approved_by: string | null; approved_at: Date | string | null;
  rejection_reason: string | null; tenant_id: string;
  created_at: Date | string; updated_at: Date | string;
}

function mapLeaveType(t: LeaveTypeRow) {
  return {
    id: t.id, code: t.code, nameTh: t.name_th, nameEn: t.name_en,
    annualQuotaDays: t.annual_quota_days, isPaid: t.is_paid,
    createdAt: toISO(t.created_at), updatedAt: toISO(t.updated_at),
  };
}

function mapLeaveRequest(r: LeaveRequestRow) {
  return {
    id: r.id, employeeId: r.employee_id, leaveTypeId: r.leave_type_id,
    startDate: r.start_date, endDate: r.end_date, days: r.days,
    reason: r.reason, status: r.status,
    approvedBy: r.approved_by,
    approvedAt: r.approved_at ? toISO(r.approved_at) : null,
    rejectionReason: r.rejection_reason,
    createdAt: toISO(r.created_at), updatedAt: toISO(r.updated_at),
  };
}

export async function leaveRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // =========================================================================
  // LEAVE TYPES
  // =========================================================================

  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/leave-types`,
    {
      schema: {
        description: 'สร้างประเภทการลาใหม่ — Create a new leave type',
        tags: ['leave'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(HR_LT_CREATE)],
    },
    async (request, reply) => {
      const b = request.body;
      const { tenantId } = request.user;

      if (!b['code'] || !b['nameTh'] || !b['nameEn']) {
        throw new ValidationError({ detail: 'code, nameTh, nameEn are required.' });
      }

      const id = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO leave_types (id, code, name_th, name_en, annual_quota_days, is_paid, tenant_id)
        VALUES (
          ${id}, ${b['code'] as string}, ${b['nameTh'] as string}, ${b['nameEn'] as string},
          ${Number(b['annualQuotaDays'] ?? 0)},
          ${b['isPaid'] !== false},
          ${tenantId}
        )
      `;

      const rows = await fastify.sql<LeaveTypeRow[]>`
        SELECT * FROM leave_types WHERE id = ${id} LIMIT 1
      `;
      return reply.status(201).send(mapLeaveType(rows[0]!));
    },
  );

  fastify.get(
    `${API_V1_PREFIX}/leave-types`,
    {
      schema: {
        description: 'รายการประเภทการลาทั้งหมด — List all leave types',
        tags: ['leave'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(HR_LT_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const rows = await fastify.sql<LeaveTypeRow[]>`
        SELECT * FROM leave_types WHERE tenant_id = ${tenantId} ORDER BY name_en
      `;
      return reply.status(200).send({ items: rows.map(mapLeaveType), total: rows.length });
    },
  );

  // =========================================================================
  // LEAVE REQUESTS
  // =========================================================================

  // Balance endpoint must come before /:id to avoid routing ambiguity
  fastify.get<{ Params: { employeeId: string } }>(
    `${API_V1_PREFIX}/leave-requests/balance/:employeeId`,
    {
      schema: {
        description: 'ดูวันลาคงเหลือของพนักงานตามประเภท — Get remaining leave balance by type for an employee',
        tags: ['leave'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(HR_LR_READ)],
    },
    async (request, reply) => {
      const { employeeId } = request.params;
      const { tenantId } = request.user;
      const currentYear = new Date().getFullYear();

      const leaveTypes = await fastify.sql<LeaveTypeRow[]>`
        SELECT * FROM leave_types WHERE tenant_id = ${tenantId}
      `;

      const balances = await Promise.all(
        leaveTypes.map(async (lt) => {
          const used = await fastify.sql<{ total_days: number }[]>`
            SELECT COALESCE(SUM(days), 0)::integer as total_days
            FROM leave_requests
            WHERE tenant_id = ${tenantId}
              AND employee_id = ${employeeId}
              AND leave_type_id = ${lt.id}
              AND status = 'approved'
              AND start_date >= ${String(currentYear) + '-01-01'}
              AND start_date <= ${String(currentYear) + '-12-31'}
          `;
          const usedDays = used[0]?.total_days ?? 0;
          return {
            leaveTypeId: lt.id,
            leaveTypeCode: lt.code,
            leaveTypeNameTh: lt.name_th,
            leaveTypeNameEn: lt.name_en,
            annualQuotaDays: lt.annual_quota_days,
            usedDays,
            remainingDays: lt.annual_quota_days - usedDays,
          };
        }),
      );

      return reply.status(200).send({ employeeId, year: currentYear, balances });
    },
  );

  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/leave-requests`,
    {
      schema: {
        description: 'ยื่นคำขอลา — Submit a leave request',
        tags: ['leave'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(HR_LR_CREATE)],
    },
    async (request, reply) => {
      const b = request.body;
      const { tenantId } = request.user;

      if (!b['employeeId'] || !b['leaveTypeId'] || !b['startDate'] || !b['endDate']) {
        throw new ValidationError({ detail: 'employeeId, leaveTypeId, startDate, endDate are required.' });
      }

      const employeeId = b['employeeId'] as string;
      const leaveTypeId = b['leaveTypeId'] as string;
      const startDate = b['startDate'] as string;
      const endDate = b['endDate'] as string;

      // Calculate days from date range
      const startMs = new Date(startDate).getTime();
      const endMs = new Date(endDate).getTime();
      const calculatedDays = Number(b['days'] ?? Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1));

      // LV-005: Check leave balance
      const ltRows = await fastify.sql<{ id: string; annual_quota_days: number }[]>`
        SELECT id, annual_quota_days FROM leave_types WHERE id = ${leaveTypeId} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!ltRows[0]) throw new NotFoundError({ detail: `Leave type ${leaveTypeId} not found.` });

      const currentYear = new Date().getFullYear();
      const usedRows = await fastify.sql<{ total_days: number }[]>`
        SELECT COALESCE(SUM(days), 0)::integer as total_days FROM leave_requests
        WHERE tenant_id = ${tenantId} AND employee_id = ${employeeId} AND leave_type_id = ${leaveTypeId}
          AND status = 'approved' AND start_date >= ${String(currentYear) + '-01-01'} AND start_date <= ${String(currentYear) + '-12-31'}
      `;
      const usedDays = usedRows[0]?.total_days ?? 0;
      const remainingDays = ltRows[0].annual_quota_days - usedDays;

      if (calculatedDays > remainingDays) {
        throw new ValidationError({
          detail: `Insufficient leave balance. Requested: ${calculatedDays} days, remaining: ${remainingDays} days.`,
        });
      }

      // LV-006: Check for overlapping approved requests
      const overlapRows = await fastify.sql<{ id: string }[]>`
        SELECT id FROM leave_requests
        WHERE tenant_id = ${tenantId} AND employee_id = ${employeeId}
          AND status = 'approved' AND id != 'none'
          AND NOT (end_date < ${startDate} OR start_date > ${endDate})
        LIMIT 1
      `;
      if (overlapRows[0]) {
        throw new ConflictError({
          detail: `Overlapping leave request exists for the selected dates.`,
        });
      }

      const id = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO leave_requests (
          id, employee_id, leave_type_id, start_date, end_date, days, reason, status, tenant_id
        ) VALUES (
          ${id},
          ${employeeId},
          ${leaveTypeId},
          ${startDate},
          ${endDate},
          ${calculatedDays},
          ${(b['reason'] as string | undefined) ?? null},
          'pending',
          ${tenantId}
        )
      `;

      const rows = await fastify.sql<LeaveRequestRow[]>`
        SELECT * FROM leave_requests WHERE id = ${id} LIMIT 1
      `;
      return reply.status(201).send(mapLeaveRequest(rows[0]!));
    },
  );

  fastify.get<{ Querystring: Record<string, string> }>(
    `${API_V1_PREFIX}/leave-requests`,
    {
      schema: {
        description: 'รายการคำขอลาพร้อมตัวกรอง — List leave requests with filters',
        tags: ['leave'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(HR_LR_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const limit    = parseInt(request.query['limit'] ?? '50', 10);
      const offset   = parseInt(request.query['offset'] ?? '0', 10);
      const empId    = request.query['employeeId'];
      const status   = request.query['status'];
      const dateFrom = request.query['dateFrom'];
      const dateTo   = request.query['dateTo'];

      const clauses: string[] = [`lr.tenant_id = '${tenantId}'`];
      if (empId)    clauses.push(`lr.employee_id = '${empId}'`);
      if (status)   clauses.push(`lr.status = '${status}'`);
      if (dateFrom) clauses.push(`lr.start_date >= '${dateFrom}'`);
      if (dateTo)   clauses.push(`lr.end_date <= '${dateTo}'`);
      const where = clauses.join(' AND ');

      const countRows = await fastify.sql<{ count: string }[]>`
        SELECT COUNT(*)::text as count FROM leave_requests lr WHERE ${fastify.sql.unsafe(where)}
      `;
      const rows = await fastify.sql<LeaveRequestRow[]>`
        SELECT lr.* FROM leave_requests lr WHERE ${fastify.sql.unsafe(where)}
        ORDER BY lr.created_at DESC LIMIT ${limit} OFFSET ${offset}
      `;

      const total = parseInt(countRows[0]?.count ?? '0', 10);
      return reply.status(200).send({
        items: rows.map(mapLeaveRequest), total, limit, offset, hasMore: offset + limit < total,
      });
    },
  );

  fastify.get<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/leave-requests/:id`,
    {
      schema: {
        description: 'ดูรายละเอียดคำขอลา — Get leave request detail',
        tags: ['leave'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(HR_LR_READ)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const rows = await fastify.sql<LeaveRequestRow[]>`
        SELECT * FROM leave_requests WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!rows[0]) throw new NotFoundError({ detail: `Leave request ${id} not found.` });
      return reply.status(200).send(mapLeaveRequest(rows[0]));
    },
  );

  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/leave-requests/:id/approve`,
    {
      schema: {
        description: 'อนุมัติคำขอลา — Approve a pending leave request',
        tags: ['leave'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(HR_LR_APPROVE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId, sub: userId } = request.user;

      const rows = await fastify.sql<LeaveRequestRow[]>`
        UPDATE leave_requests SET
          status = 'approved', approved_by = ${userId}, approved_at = NOW(), updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'pending'
        RETURNING *
      `;
      if (!rows[0]) {
        const existing = await fastify.sql<{ id: string; status: string }[]>`
          SELECT id, status FROM leave_requests WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
        `;
        if (!existing[0]) throw new NotFoundError({ detail: `Leave request ${id} not found.` });
        throw new ValidationError({ detail: `Leave request is ${existing[0].status}, cannot approve.` });
      }
      return reply.status(200).send(mapLeaveRequest(rows[0]));
    },
  );

  fastify.post<{ Params: { id: string }; Body: { reason?: string } }>(
    `${API_V1_PREFIX}/leave-requests/:id/reject`,
    {
      schema: {
        description: 'ปฏิเสธคำขอลา — Reject a pending leave request',
        tags: ['leave'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(HR_LR_REJECT)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId, sub: userId } = request.user;
      const { reason } = request.body ?? {};

      const rows = await fastify.sql<LeaveRequestRow[]>`
        UPDATE leave_requests SET
          status = 'rejected',
          approved_by = ${userId},
          rejection_reason = ${reason ?? null},
          updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'pending'
        RETURNING *
      `;
      if (!rows[0]) {
        const existing = await fastify.sql<{ id: string; status: string }[]>`
          SELECT id, status FROM leave_requests WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
        `;
        if (!existing[0]) throw new NotFoundError({ detail: `Leave request ${id} not found.` });
        throw new ValidationError({ detail: `Leave request is ${existing[0].status}, cannot reject.` });
      }
      return reply.status(200).send(mapLeaveRequest(rows[0]));
    },
  );

  // =========================================================================
  // 4.8 Leave Management Enhancement — Accrual Rules + Public Holidays
  // =========================================================================

  // POST /leave-accrual-rules
  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/leave-accrual-rules`,
    {
      schema: { description: 'สร้างกฎการสะสมวันลา — Create leave accrual rule', tags: ['leave'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(HR_LT_CREATE)],
    },
    async (request, reply) => {
      const b = request.body;
      const { tenantId } = request.user;
      const id = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO leave_accrual_rules (id, leave_type_id, accrual_per_month, max_carry_forward, probation_months, tenant_id)
        VALUES (${id}, ${b['leaveTypeId'] as string}, ${Number(b['accrualPerMonth'] ?? 0)},
                ${Number(b['maxCarryForward'] ?? 0)}, ${Number(b['probationMonths'] ?? 0)}, ${tenantId})
      `;
      const rows = await fastify.sql<{ id: string; leave_type_id: string; accrual_per_month: number; max_carry_forward: number; probation_months: number }[]>`
        SELECT * FROM leave_accrual_rules WHERE id = ${id} LIMIT 1
      `;
      return reply.status(201).send({
        id: rows[0]!.id, leaveTypeId: rows[0]!.leave_type_id,
        accrualPerMonth: Number(rows[0]!.accrual_per_month),
        maxCarryForward: rows[0]!.max_carry_forward, probationMonths: rows[0]!.probation_months,
      });
    },
  );

  // GET /leave-accrual-rules
  fastify.get(
    `${API_V1_PREFIX}/leave-accrual-rules`,
    {
      schema: { description: 'รายการกฎการสะสมวันลา — List leave accrual rules', tags: ['leave'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(HR_LT_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const rows = await fastify.sql<{ id: string; leave_type_id: string; accrual_per_month: number; max_carry_forward: number; probation_months: number }[]>`
        SELECT * FROM leave_accrual_rules WHERE tenant_id = ${tenantId}
      `;
      return reply.status(200).send({
        items: rows.map((r) => ({
          id: r.id, leaveTypeId: r.leave_type_id,
          accrualPerMonth: Number(r.accrual_per_month),
          maxCarryForward: r.max_carry_forward, probationMonths: r.probation_months,
        })),
        total: rows.length,
      });
    },
  );

  // POST /public-holidays
  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/public-holidays`,
    {
      schema: { description: 'เพิ่มวันหยุดราชการ — Add a public holiday', tags: ['leave'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(HR_LT_CREATE)],
    },
    async (request, reply) => {
      const b = request.body;
      const { tenantId } = request.user;
      const id = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO public_holidays (id, date, name_th, name_en, tenant_id)
        VALUES (${id}, ${b['date'] as string}, ${b['nameTh'] as string}, ${b['nameEn'] as string}, ${tenantId})
      `;
      return reply.status(201).send({ id, date: b['date'], nameTh: b['nameTh'], nameEn: b['nameEn'] });
    },
  );

  // GET /public-holidays
  fastify.get<{ Querystring: { year?: string } }>(
    `${API_V1_PREFIX}/public-holidays`,
    {
      schema: { description: 'รายการวันหยุดราชการ — List public holidays', tags: ['leave'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(HR_LT_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const year = request.query.year ?? String(new Date().getFullYear());
      const rows = await fastify.sql<{ id: string; date: string; name_th: string; name_en: string }[]>`
        SELECT * FROM public_holidays WHERE tenant_id = ${tenantId} AND EXTRACT(YEAR FROM date) = ${parseInt(year, 10)} ORDER BY date
      `;
      return reply.status(200).send({
        items: rows.map((r) => ({ id: r.id, date: r.date, nameTh: r.name_th, nameEn: r.name_en })),
        total: rows.length,
      });
    },
  );

  // GET /leave-requests/accrual-balance/:employeeId — accrual-based balance
  fastify.get<{ Params: { employeeId: string }; Querystring: { year?: string } }>(
    `${API_V1_PREFIX}/leave-requests/accrual-balance/:employeeId`,
    {
      schema: { description: 'ดูวันลาคงเหลือแบบสะสม — Accrual-based leave balance', tags: ['leave'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(HR_LR_READ)],
    },
    async (request, reply) => {
      const { employeeId } = request.params;
      const { tenantId } = request.user;
      const currentYear = parseInt(request.query.year ?? String(new Date().getFullYear()), 10);
      const currentMonth = new Date().getMonth() + 1;

      // Get employee hire date for probation check
      const empRows = await fastify.sql<[{ hire_date: string }?]>`
        SELECT hire_date FROM employees WHERE id = ${employeeId} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!empRows[0]) throw new NotFoundError({ detail: `Employee ${employeeId} not found.` });

      const hireDate = new Date(empRows[0].hire_date);
      const monthsSinceHire = Math.max(0, (new Date().getFullYear() - hireDate.getFullYear()) * 12 + new Date().getMonth() - hireDate.getMonth());

      const leaveTypes = await fastify.sql<LeaveTypeRow[]>`SELECT * FROM leave_types WHERE tenant_id = ${tenantId}`;

      const balances = await Promise.all(
        leaveTypes.map(async (lt) => {
          // Get accrual rule
          const accrualRows = await fastify.sql<[{ accrual_per_month: number; max_carry_forward: number; probation_months: number }?]>`
            SELECT accrual_per_month, max_carry_forward, probation_months FROM leave_accrual_rules
            WHERE leave_type_id = ${lt.id} AND tenant_id = ${tenantId} LIMIT 1
          `;

          let accrued: number;
          if (accrualRows[0]) {
            const rule = accrualRows[0];
            // Check probation
            if (monthsSinceHire < rule.probation_months) {
              accrued = 0;
            } else {
              // Accrue based on months in current year
              accrued = Math.min(Number(rule.accrual_per_month) * currentMonth, lt.annual_quota_days);
            }
          } else {
            // No accrual rule — use flat annual quota
            accrued = lt.annual_quota_days;
          }

          // Get used days (exclude weekends and public holidays in count)
          const usedRows = await fastify.sql<{ total_days: number }[]>`
            SELECT COALESCE(SUM(days), 0)::integer as total_days FROM leave_requests
            WHERE tenant_id = ${tenantId} AND employee_id = ${employeeId} AND leave_type_id = ${lt.id}
              AND status = 'approved' AND start_date >= ${String(currentYear) + '-01-01'} AND start_date <= ${String(currentYear) + '-12-31'}
          `;
          const usedDays = usedRows[0]?.total_days ?? 0;

          return {
            leaveTypeId: lt.id, leaveTypeCode: lt.code,
            leaveTypeNameTh: lt.name_th, leaveTypeNameEn: lt.name_en,
            accruedDays: accrued, usedDays,
            remainingDays: accrued - usedDays,
          };
        }),
      );

      return reply.status(200).send({ employeeId, year: currentYear, balances });
    },
  );

  // GET /leave-requests/working-days — calculate working days between dates
  fastify.get<{ Querystring: { startDate: string; endDate: string } }>(
    `${API_V1_PREFIX}/leave-requests/working-days`,
    {
      schema: { description: 'คำนวณจำนวนวันทำงาน — Calculate working days (excludes weekends + public holidays)', tags: ['leave'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(HR_LR_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { startDate, endDate } = request.query;

      // Get public holidays
      const holidays = await fastify.sql<{ date: string }[]>`
        SELECT date::text FROM public_holidays WHERE tenant_id = ${tenantId} AND date >= ${startDate} AND date <= ${endDate}
      `;
      const holidaySet = new Set(holidays.map((h) => h.date));

      // Count working days
      let workingDays = 0;
      const start = new Date(startDate);
      const end = new Date(endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        const dateStr = d.toISOString().slice(0, 10);
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(dateStr)) {
          workingDays++;
        }
      }

      return reply.status(200).send({ startDate, endDate, workingDays, publicHolidaysExcluded: holidays.length });
    },
  );
}
