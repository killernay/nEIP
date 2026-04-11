/**
 * Payroll routes (HR-PY).
 *
 * Routes:
 *   POST /api/v1/payroll                          — create run
 *   GET  /api/v1/payroll                          — list runs
 *   GET  /api/v1/payroll/:id                      — detail with items
 *   POST /api/v1/payroll/:id/calculate            — auto-calculate from employee salaries
 *   POST /api/v1/payroll/:id/approve              — approve run
 *   POST /api/v1/payroll/:id/pay                  — mark as paid
 *   GET  /api/v1/payroll/:id/payslips             — individual payslips
 *   PUT  /api/v1/payroll/:id/items/:itemId        — adjust individual item
 *
 * Thai SSC rules:
 *   Employee & Employer: 5% of salary, capped at 750 THB (salary cap 15,000 THB)
 *   i.e. 750 THB = 75,000 satang
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, ConflictError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import { nextDocNumber } from '@neip/core';

const HR_PAY_CREATE    = 'hr:payroll:create'    as const;
const HR_PAY_READ      = 'hr:payroll:read'      as const;
const HR_PAY_CALCULATE = 'hr:payroll:calculate' as const;
const HR_PAY_APPROVE   = 'hr:payroll:approve'   as const;
const HR_PAY_PAY       = 'hr:payroll:pay'       as const;

// ---------------------------------------------------------------------------
// SSC calculation helpers
// ---------------------------------------------------------------------------
const SSC_RATE = 0.05;
const SSC_SALARY_CAP_SATANG = 1_500_000; // 15,000 THB × 100
const SSC_MAX_SATANG        = 75_000;    // 750 THB × 100

function calcSSC(grossSatang: number): number {
  const cappedSalary = Math.min(grossSatang, SSC_SALARY_CAP_SATANG);
  return Math.min(Math.round(cappedSalary * SSC_RATE), SSC_MAX_SATANG);
}

/** Very simplified Thai PIT: 0% up to 150k THB/month. 5% 150k–300k etc. */
function calcPIT(annualGrossSatang: number): number {
  // Monthly → annualise for bracket calculation
  const annual = annualGrossSatang * 12;
  // Deduct expenses (50%, max 100k THB = 10_000_000 sat) + personal allowance (60k = 6_000_000 sat)
  const expenseDeduction = Math.min(Math.round(annual * 0.5), 10_000_000);
  const personalAllowance = 6_000_000;
  const taxableIncome = Math.max(0, annual - expenseDeduction - personalAllowance);

  let annualTax = 0;
  const brackets: [number, number][] = [
    [15_000_000, 0.05],
    [15_000_000, 0.10],
    [20_000_000, 0.15],
    [20_000_000, 0.20],
    [Infinity,   0.25],
  ];
  let remaining = taxableIncome;
  for (const [bracketSize, rate] of brackets) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, bracketSize);
    annualTax += Math.round(taxable * rate);
    remaining -= taxable;
  }

  return Math.round(annualTax / 12);
}

// ---------------------------------------------------------------------------
// Row interfaces
// ---------------------------------------------------------------------------

interface PayrollRunRow {
  id: string; pay_period_start: string; pay_period_end: string;
  run_date: string; status: string;
  total_gross_satang: number; total_deductions_satang: number;
  total_net_satang: number; total_employer_ssc_satang: number;
  total_tax_satang: number; notes: string | null;
  tenant_id: string; created_by: string | null; approved_by: string | null;
  created_at: Date | string; updated_at: Date | string;
}

interface PayrollItemRow {
  id: string; payroll_run_id: string; employee_id: string;
  base_salary_satang: number; overtime_satang: number; bonus_satang: number;
  allowance_satang: number; gross_satang: number;
  social_security_satang: number; provident_fund_satang: number;
  personal_income_tax_satang: number; other_deductions_satang: number;
  total_deductions_satang: number; net_satang: number;
  employer_ssc_satang: number; payment_method: string | null; status: string;
  created_at: Date | string; updated_at: Date | string;
}

interface EmployeeRow {
  id: string; employee_code: string; first_name_th: string; last_name_th: string;
  salary_satang: number; provident_fund_percent: number; status: string;
}

interface CountRow { count: string; }

function mapRun(r: PayrollRunRow) {
  return {
    id: r.id, payPeriodStart: r.pay_period_start, payPeriodEnd: r.pay_period_end,
    runDate: r.run_date, status: r.status,
    totalGrossSatang: r.total_gross_satang,
    totalDeductionsSatang: r.total_deductions_satang,
    totalNetSatang: r.total_net_satang,
    totalEmployerSscSatang: r.total_employer_ssc_satang,
    totalTaxSatang: r.total_tax_satang,
    notes: r.notes, createdBy: r.created_by, approvedBy: r.approved_by,
    createdAt: toISO(r.created_at), updatedAt: toISO(r.updated_at),
  };
}

function mapItem(i: PayrollItemRow) {
  return {
    id: i.id, payrollRunId: i.payroll_run_id, employeeId: i.employee_id,
    baseSalarySatang: i.base_salary_satang,
    overtimeSatang: i.overtime_satang, bonusSatang: i.bonus_satang,
    allowanceSatang: i.allowance_satang, grossSatang: i.gross_satang,
    socialSecuritySatang: i.social_security_satang,
    providentFundSatang: i.provident_fund_satang,
    personalIncomeTaxSatang: i.personal_income_tax_satang,
    otherDeductionsSatang: i.other_deductions_satang,
    totalDeductionsSatang: i.total_deductions_satang,
    netSatang: i.net_satang, employerSscSatang: i.employer_ssc_satang,
    paymentMethod: i.payment_method, status: i.status,
    createdAt: toISO(i.created_at), updatedAt: toISO(i.updated_at),
  };
}

export async function payrollRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // POST /payroll
  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/payroll`,
    {
      schema: {
        description: 'สร้างรอบการจ่ายเงินเดือนใหม่ — Create a new payroll run',
        tags: ['payroll'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(HR_PAY_CREATE)],
    },
    async (request, reply) => {
      const b = request.body;
      const { tenantId, sub: userId } = request.user;

      if (!b['payPeriodStart'] || !b['payPeriodEnd'] || !b['runDate']) {
        throw new ValidationError({ detail: 'payPeriodStart, payPeriodEnd, runDate are required.' });
      }

      const id = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO payroll_runs (id, pay_period_start, pay_period_end, run_date, status, notes, tenant_id, created_by)
        VALUES (
          ${id}, ${b['payPeriodStart'] as string}, ${b['payPeriodEnd'] as string},
          ${b['runDate'] as string}, 'draft',
          ${(b['notes'] as string | undefined) ?? null},
          ${tenantId}, ${userId}
        )
      `;

      const rows = await fastify.sql<PayrollRunRow[]>`
        SELECT * FROM payroll_runs WHERE id = ${id} LIMIT 1
      `;
      return reply.status(201).send(mapRun(rows[0]!));
    },
  );

  // GET /payroll
  fastify.get<{ Querystring: Record<string, string> }>(
    `${API_V1_PREFIX}/payroll`,
    {
      schema: {
        description: 'รายการรอบการจ่ายเงินเดือน — List payroll runs',
        tags: ['payroll'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(HR_PAY_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const limit  = parseInt(request.query['limit'] ?? '20', 10);
      const offset = parseInt(request.query['offset'] ?? '0', 10);
      const status = request.query['status'];

      let rows: PayrollRunRow[];
      let countRows: CountRow[];

      if (status) {
        countRows = await fastify.sql<CountRow[]>`
          SELECT COUNT(*)::text as count FROM payroll_runs WHERE tenant_id = ${tenantId} AND status = ${status}
        `;
        rows = await fastify.sql<PayrollRunRow[]>`
          SELECT * FROM payroll_runs WHERE tenant_id = ${tenantId} AND status = ${status}
          ORDER BY pay_period_start DESC LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        countRows = await fastify.sql<CountRow[]>`
          SELECT COUNT(*)::text as count FROM payroll_runs WHERE tenant_id = ${tenantId}
        `;
        rows = await fastify.sql<PayrollRunRow[]>`
          SELECT * FROM payroll_runs WHERE tenant_id = ${tenantId}
          ORDER BY pay_period_start DESC LIMIT ${limit} OFFSET ${offset}
        `;
      }

      const total = parseInt(countRows[0]?.count ?? '0', 10);
      return reply.status(200).send({
        items: rows.map(mapRun), total, limit, offset, hasMore: offset + limit < total,
      });
    },
  );

  // GET /payroll/:id
  fastify.get<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/payroll/:id`,
    {
      schema: {
        description: 'ดูรายละเอียดรอบการจ่ายเงินเดือนพร้อมรายการย่อย — Get payroll run detail with items',
        tags: ['payroll'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(HR_PAY_READ)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const runRows = await fastify.sql<PayrollRunRow[]>`
        SELECT * FROM payroll_runs WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!runRows[0]) throw new NotFoundError({ detail: `Payroll run ${id} not found.` });

      const items = await fastify.sql<PayrollItemRow[]>`
        SELECT * FROM payroll_items WHERE payroll_run_id = ${id} ORDER BY employee_id
      `;

      return reply.status(200).send({ ...mapRun(runRows[0]), items: items.map(mapItem) });
    },
  );

  // POST /payroll/:id/calculate
  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/payroll/:id/calculate`,
    {
      schema: {
        description: 'คำนวณเงินเดือนอัตโนมัติจากข้อมูลพนักงาน — Auto-calculate payroll from employee salary data',
        tags: ['payroll'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(HR_PAY_CALCULATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const runRows = await fastify.sql<PayrollRunRow[]>`
        SELECT * FROM payroll_runs WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!runRows[0]) throw new NotFoundError({ detail: `Payroll run ${id} not found.` });
      if (runRows[0].status !== 'draft') {
        throw new ConflictError({ detail: `Payroll run is already ${runRows[0].status}.` });
      }

      // Load all active employees for this tenant
      const employees = await fastify.sql<EmployeeRow[]>`
        SELECT id, employee_code, first_name_th, last_name_th, salary_satang, provident_fund_percent, status
        FROM employees
        WHERE tenant_id = ${tenantId} AND status = 'active'
      `;

      if (employees.length === 0) {
        throw new ValidationError({ detail: 'No active employees found for this tenant.' });
      }

      // Delete existing items for this run (recalculate)
      await fastify.sql`DELETE FROM payroll_items WHERE payroll_run_id = ${id}`;

      let totalGross = 0;
      let totalDeductions = 0;
      let totalNet = 0;
      let totalEmployerSSC = 0;
      let totalTax = 0;

      for (const emp of employees) {
        const baseSalary   = emp.salary_satang;
        const gross        = baseSalary; // no OT/bonus in basic payroll
        const ssc          = calcSSC(gross);
        const pfPercent    = emp.provident_fund_percent;
        const pfSatang     = Math.round(gross * pfPercent / 100);
        const pitSatang    = calcPIT(gross);
        const totalDed     = ssc + pfSatang + pitSatang;
        const net          = gross - totalDed;
        const employerSSC  = calcSSC(gross);

        const itemId = crypto.randomUUID();
        await fastify.sql`
          INSERT INTO payroll_items (
            id, payroll_run_id, employee_id,
            base_salary_satang, overtime_satang, bonus_satang, allowance_satang,
            gross_satang, social_security_satang, provident_fund_satang,
            personal_income_tax_satang, other_deductions_satang,
            total_deductions_satang, net_satang, employer_ssc_satang,
            payment_method, status
          ) VALUES (
            ${itemId}, ${id}, ${emp.id},
            ${baseSalary}, 0, 0, 0,
            ${gross}, ${ssc}, ${pfSatang},
            ${pitSatang}, 0,
            ${totalDed}, ${net}, ${employerSSC},
            'bank_transfer', 'calculated'
          )
        `;

        totalGross      += gross;
        totalDeductions += totalDed;
        totalNet        += net;
        totalEmployerSSC += employerSSC;
        totalTax        += pitSatang;
      }

      const updatedRun = await fastify.sql<PayrollRunRow[]>`
        UPDATE payroll_runs SET
          status                    = 'calculated',
          total_gross_satang        = ${totalGross},
          total_deductions_satang   = ${totalDeductions},
          total_net_satang          = ${totalNet},
          total_employer_ssc_satang = ${totalEmployerSSC},
          total_tax_satang          = ${totalTax},
          updated_at                = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `;

      const items = await fastify.sql<PayrollItemRow[]>`
        SELECT * FROM payroll_items WHERE payroll_run_id = ${id} ORDER BY employee_id
      `;

      return reply.status(200).send({ ...mapRun(updatedRun[0]!), items: items.map(mapItem) });
    },
  );

  // POST /payroll/:id/approve
  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/payroll/:id/approve`,
    {
      schema: {
        description: 'อนุมัติรอบการจ่ายเงินเดือน — Approve a calculated payroll run',
        tags: ['payroll'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(HR_PAY_APPROVE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId, sub: userId } = request.user;

      const rows = await fastify.sql<PayrollRunRow[]>`
        UPDATE payroll_runs SET
          status = 'approved', approved_by = ${userId}, updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'calculated'
        RETURNING *
      `;
      if (!rows[0]) {
        const existing = await fastify.sql<{ id: string; status: string }[]>`
          SELECT id, status FROM payroll_runs WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
        `;
        if (!existing[0]) throw new NotFoundError({ detail: `Payroll run ${id} not found.` });
        throw new ConflictError({ detail: `Payroll run must be in 'calculated' state to approve. Current: ${existing[0].status}.` });
      }
      return reply.status(200).send(mapRun(rows[0]));
    },
  );

  // POST /payroll/:id/pay
  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/payroll/:id/pay`,
    {
      schema: {
        description: 'ทำเครื่องหมายรอบเงินเดือนว่าจ่ายแล้ว — Mark payroll run as paid',
        tags: ['payroll'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(HR_PAY_PAY)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const rows = await fastify.sql<PayrollRunRow[]>`
        UPDATE payroll_runs SET status = 'paid', updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'approved'
        RETURNING *
      `;
      if (!rows[0]) {
        const existing = await fastify.sql<{ id: string; status: string }[]>`
          SELECT id, status FROM payroll_runs WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
        `;
        if (!existing[0]) throw new NotFoundError({ detail: `Payroll run ${id} not found.` });
        throw new ConflictError({ detail: `Payroll run must be 'approved' before paying. Current: ${existing[0].status}.` });
      }

      // Mark all items as paid
      await fastify.sql`
        UPDATE payroll_items SET status = 'paid', updated_at = NOW()
        WHERE payroll_run_id = ${id}
      `;

      const run = rows[0];

      // ---------------------------------------------------------------
      // PY-009: Auto-create Journal Entry for payroll payment
      //   Dr 5200 (Salaries & Wages)   = total_gross_satang
      //   Cr 1100 (Cash / Bank)        = total_net_satang
      //   Cr 2300 (SSC Payable)        = total_employer_ssc_satang + employee SSC
      //   Cr 2500 (Income Tax Payable) = total_tax_satang
      // ---------------------------------------------------------------
      try {
        // Look up GL accounts by code prefix for this tenant
        const glAccounts = await fastify.sql<{ code: string; id: string }[]>`
          SELECT code, id FROM chart_of_accounts
          WHERE tenant_id = ${tenantId}
            AND code IN ('5200','1100','2300','2500')
            AND is_active = true
        `;
        const glMap: Record<string, string> = {};
        for (const acct of glAccounts) {
          glMap[acct.code] = acct.id;
        }

        // Fallback: find by prefix if exact code not found
        if (!glMap['5200']) {
          const r = await fastify.sql<[{ id: string }?]>`
            SELECT id FROM chart_of_accounts WHERE tenant_id = ${tenantId} AND code LIKE '5200%' AND account_type = 'expense' AND is_active = true ORDER BY code LIMIT 1
          `;
          if (r[0]) glMap['5200'] = r[0].id;
        }
        if (!glMap['1100']) {
          const r = await fastify.sql<[{ id: string }?]>`
            SELECT id FROM chart_of_accounts WHERE tenant_id = ${tenantId} AND code LIKE '1100%' AND account_type = 'asset' AND is_active = true ORDER BY code LIMIT 1
          `;
          if (r[0]) glMap['1100'] = r[0].id;
        }
        if (!glMap['2300']) {
          const r = await fastify.sql<[{ id: string }?]>`
            SELECT id FROM chart_of_accounts WHERE tenant_id = ${tenantId} AND code LIKE '2300%' AND account_type = 'liability' AND is_active = true ORDER BY code LIMIT 1
          `;
          if (r[0]) glMap['2300'] = r[0].id;
        }
        if (!glMap['2500']) {
          const r = await fastify.sql<[{ id: string }?]>`
            SELECT id FROM chart_of_accounts WHERE tenant_id = ${tenantId} AND code LIKE '2500%' AND account_type = 'liability' AND is_active = true ORDER BY code LIMIT 1
          `;
          if (r[0]) glMap['2500'] = r[0].id;
        }

        const totalGross = run.total_gross_satang;
        const totalNet = run.total_net_satang;
        const totalEmployerSsc = run.total_employer_ssc_satang;
        const totalTax = run.total_tax_satang;
        // Employee SSC = total deductions - employer SSC - tax = (gross - net) - employerSSC - tax
        const totalDeductions = run.total_deductions_satang;
        const employeeSsc = Math.max(0, totalDeductions - totalEmployerSsc - totalTax);
        const totalSsc = totalEmployerSsc + employeeSsc;

        const jeId = crypto.randomUUID();
        const jeNumber = await nextDocNumber(fastify.sql, tenantId, 'journal_entry', new Date().getFullYear());
        const now2 = new Date();
        const fiscalYear = now2.getFullYear();
        const fiscalPeriod = now2.getMonth() + 1;

        await fastify.sql`
          INSERT INTO journal_entries (id, document_number, description, status, fiscal_year, fiscal_period, tenant_id, created_by, posted_at)
          VALUES (
            ${jeId}, ${jeNumber},
            ${'Payroll payment: ' + run.pay_period_start + ' to ' + run.pay_period_end},
            'posted', ${fiscalYear}, ${fiscalPeriod},
            ${tenantId}, ${run.created_by ?? tenantId}, NOW()
          )
        `;

        let lineNum = 1;

        // Dr 5200 Salaries & Wages = total gross
        if (glMap['5200']) {
          await fastify.sql`
            INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang)
            VALUES (${crypto.randomUUID()}, ${jeId}, ${lineNum}, ${glMap['5200']}, 'Salaries & Wages Expense', ${totalGross}, 0)
          `;
          lineNum++;
        }

        // Cr 1100 Cash = total net paid to employees
        if (glMap['1100']) {
          await fastify.sql`
            INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang)
            VALUES (${crypto.randomUUID()}, ${jeId}, ${lineNum}, ${glMap['1100']}, 'Net Payroll Disbursement', 0, ${totalNet})
          `;
          lineNum++;
        }

        // Cr 2300 SSC Payable = employee SSC + employer SSC
        if (glMap['2300'] && totalSsc > 0) {
          await fastify.sql`
            INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang)
            VALUES (${crypto.randomUUID()}, ${jeId}, ${lineNum}, ${glMap['2300']}, 'Social Security Contribution Payable', 0, ${totalSsc})
          `;
          lineNum++;
        }

        // Cr 2500 Income Tax Payable = PIT withheld
        if (glMap['2500'] && totalTax > 0) {
          await fastify.sql`
            INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang)
            VALUES (${crypto.randomUUID()}, ${jeId}, ${lineNum}, ${glMap['2500']}, 'Personal Income Tax Withheld', 0, ${totalTax})
          `;
        }

        request.log.info({ payrollRunId: id, jeId, tenantId }, 'Payroll JE auto-created');
      } catch (jeErr) {
        // Log JE creation failure but do not fail the pay action itself
        request.log.error({ payrollRunId: id, tenantId, err: jeErr }, 'Failed to create payroll JE — payroll marked paid anyway');
      }

      return reply.status(200).send(mapRun(run));
    },
  );

  // GET /payroll/:id/payslips
  fastify.get<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/payroll/:id/payslips`,
    {
      schema: {
        description: 'ดูสลิปเงินเดือนของพนักงานทุกคนในรอบนี้ — Get individual payslips for all employees in a run',
        tags: ['payroll'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(HR_PAY_READ)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const runRows = await fastify.sql<PayrollRunRow[]>`
        SELECT * FROM payroll_runs WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!runRows[0]) throw new NotFoundError({ detail: `Payroll run ${id} not found.` });

      const items = await fastify.sql<(PayrollItemRow & {
        employee_code: string; first_name_th: string; last_name_th: string;
        bank_account_number: string | null; bank_name: string | null;
      })[]>`
        SELECT pi.*, e.employee_code, e.first_name_th, e.last_name_th,
               e.bank_account_number, e.bank_name
        FROM payroll_items pi
        JOIN employees e ON e.id = pi.employee_id
        WHERE pi.payroll_run_id = ${id}
        ORDER BY e.first_name_th
      `;

      const payslips = items.map((i) => ({
        ...mapItem(i),
        employeeCode: i.employee_code,
        employeeNameTh: `${i.first_name_th} ${i.last_name_th}`,
        bankAccountNumber: i.bank_account_number,
        bankName: i.bank_name,
        payPeriodStart: runRows[0]!.pay_period_start,
        payPeriodEnd: runRows[0]!.pay_period_end,
      }));

      return reply.status(200).send({ items: payslips, total: payslips.length });
    },
  );

  // PUT /payroll/:id/items/:itemId
  fastify.put<{ Params: { id: string; itemId: string }; Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/payroll/:id/items/:itemId`,
    {
      schema: {
        description: 'ปรับรายการเงินเดือนของพนักงานในรอบนั้น — Adjust an individual payroll item',
        tags: ['payroll'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(HR_PAY_CALCULATE)],
    },
    async (request, reply) => {
      const { id, itemId } = request.params;
      const b = request.body;
      const { tenantId } = request.user;

      // Validate run exists and is in draft/calculated state
      const runRows = await fastify.sql<PayrollRunRow[]>`
        SELECT * FROM payroll_runs WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!runRows[0]) throw new NotFoundError({ detail: `Payroll run ${id} not found.` });
      if (!['draft', 'calculated'].includes(runRows[0].status)) {
        throw new ValidationError({ detail: `Cannot modify items on a ${runRows[0].status} payroll run.` });
      }

      const existing = await fastify.sql<PayrollItemRow[]>`
        SELECT * FROM payroll_items WHERE id = ${itemId} AND payroll_run_id = ${id} LIMIT 1
      `;
      if (!existing[0]) throw new NotFoundError({ detail: `Payroll item ${itemId} not found.` });

      const base      = b['baseSalarySatang'] != null ? Number(b['baseSalarySatang']) : existing[0].base_salary_satang;
      const ot        = b['overtimeSatang'] != null ? Number(b['overtimeSatang']) : existing[0].overtime_satang;
      const bonus     = b['bonusSatang'] != null ? Number(b['bonusSatang']) : existing[0].bonus_satang;
      const allowance = b['allowanceSatang'] != null ? Number(b['allowanceSatang']) : existing[0].allowance_satang;
      const otherDed  = b['otherDeductionsSatang'] != null ? Number(b['otherDeductionsSatang']) : existing[0].other_deductions_satang;

      const gross   = base + ot + bonus + allowance;
      const ssc     = calcSSC(gross);
      const pf      = b['providentFundSatang'] != null ? Number(b['providentFundSatang']) : existing[0].provident_fund_satang;
      const pit     = b['personalIncomeTaxSatang'] != null ? Number(b['personalIncomeTaxSatang']) : calcPIT(gross);
      const totalDed = ssc + pf + pit + otherDed;
      const net     = gross - totalDed;
      const emplSSC = calcSSC(gross);

      const updatedItems = await fastify.sql<PayrollItemRow[]>`
        UPDATE payroll_items SET
          base_salary_satang         = ${base},
          overtime_satang            = ${ot},
          bonus_satang               = ${bonus},
          allowance_satang           = ${allowance},
          gross_satang               = ${gross},
          social_security_satang     = ${ssc},
          provident_fund_satang      = ${pf},
          personal_income_tax_satang = ${pit},
          other_deductions_satang    = ${otherDed},
          total_deductions_satang    = ${totalDed},
          net_satang                 = ${net},
          employer_ssc_satang        = ${emplSSC},
          updated_at                 = NOW()
        WHERE id = ${itemId}
        RETURNING *
      `;

      return reply.status(200).send(mapItem(updatedItems[0]!));
    },
  );

  // =========================================================================
  // 4.6 Bank File Generation
  // =========================================================================

  fastify.get<{ Params: { id: string }; Querystring: { bank: string } }>(
    `${API_V1_PREFIX}/payroll/:id/bank-file`,
    {
      schema: {
        description: 'สร้างไฟล์โอนเงินธนาคาร — Generate bank transfer file (SCB pipe-delimited / KBank fixed-width)',
        tags: ['payroll'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(HR_PAY_READ)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;
      const bank = (request.query.bank ?? 'scb').toLowerCase();

      const runRows = await fastify.sql<PayrollRunRow[]>`
        SELECT * FROM payroll_runs WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!runRows[0]) throw new NotFoundError({ detail: `Payroll run ${id} not found.` });

      const items = await fastify.sql<(PayrollItemRow & {
        employee_code: string; first_name_th: string; last_name_th: string;
        first_name_en: string | null; last_name_en: string | null;
        bank_account_number: string | null; bank_name: string | null;
      })[]>`
        SELECT pi.*, e.employee_code, e.first_name_th, e.last_name_th,
               e.first_name_en, e.last_name_en, e.bank_account_number, e.bank_name
        FROM payroll_items pi
        JOIN employees e ON e.id = pi.employee_id
        WHERE pi.payroll_run_id = ${id}
        ORDER BY e.employee_code
      `;

      let fileContent: string;
      let contentType: string;
      let filename: string;

      if (bank === 'kbank') {
        // KBank fixed-width format
        // Columns: employee name (40), bank account (20), amount in satang (15)
        const lines = items.map((item) => {
          const name = ((item.first_name_en ?? item.first_name_th) + ' ' + (item.last_name_en ?? item.last_name_th)).padEnd(40).slice(0, 40);
          const account = (item.bank_account_number ?? '').padEnd(20).slice(0, 20);
          const amount = String(item.net_satang).padStart(15, '0');
          return `${name}${account}${amount}`;
        });
        fileContent = lines.join('\n');
        contentType = 'text/plain';
        filename = `payroll-${id}-kbank.txt`;
      } else {
        // SCB pipe-delimited format
        const lines = items.map((item) => {
          const name = (item.first_name_en ?? item.first_name_th) + ' ' + (item.last_name_en ?? item.last_name_th);
          return [
            item.employee_code,
            name,
            item.bank_account_number ?? '',
            item.bank_name ?? '',
            String(item.net_satang),
          ].join('|');
        });
        fileContent = 'employee_code|name|bank_account|bank_name|amount_satang\n' + lines.join('\n');
        contentType = 'text/csv';
        filename = `payroll-${id}-scb.csv`;
      }

      return reply
        .status(200)
        .header('Content-Type', contentType)
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .send(fileContent);
    },
  );

  // =========================================================================
  // 4.7 YTD Tax Calculation
  // =========================================================================

  fastify.get<{ Params: { employeeId: string }; Querystring: { year?: string } }>(
    `${API_V1_PREFIX}/payroll/ytd-summary/:employeeId`,
    {
      schema: {
        description: 'ดูสรุปภาษีสะสมประจำปี — YTD tax summary for an employee',
        tags: ['payroll'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(HR_PAY_READ)],
    },
    async (request, reply) => {
      const { employeeId } = request.params;
      const { tenantId } = request.user;
      const year = parseInt(request.query.year ?? String(new Date().getFullYear()), 10);

      // Get all payroll items for this employee in the given year
      const items = await fastify.sql<{
        gross_satang: number; social_security_satang: number;
        provident_fund_satang: number; personal_income_tax_satang: number;
        net_satang: number; employer_ssc_satang: number;
      }[]>`
        SELECT pi.gross_satang, pi.social_security_satang, pi.provident_fund_satang,
               pi.personal_income_tax_satang, pi.net_satang, pi.employer_ssc_satang
        FROM payroll_items pi
        JOIN payroll_runs pr ON pr.id = pi.payroll_run_id
        WHERE pi.employee_id = ${employeeId}
          AND pr.tenant_id = ${tenantId}
          AND pr.status IN ('calculated', 'approved', 'paid')
          AND EXTRACT(YEAR FROM pr.pay_period_start::date) = ${year}
      `;

      const ytdGross = items.reduce((s, i) => s + i.gross_satang, 0);
      const ytdTax = items.reduce((s, i) => s + i.personal_income_tax_satang, 0);
      const ytdSSC = items.reduce((s, i) => s + i.social_security_satang, 0);
      const ytdPF = items.reduce((s, i) => s + i.provident_fund_satang, 0);
      const ytdNet = items.reduce((s, i) => s + i.net_satang, 0);
      const monthsProcessed = items.length;

      // Project annual tax: ytdGross / monthsProcessed * 12, then calculate PIT
      let projectedAnnualTax = 0;
      if (monthsProcessed > 0) {
        const monthlyAvg = Math.round(ytdGross / monthsProcessed);
        projectedAnnualTax = calcPIT(monthlyAvg) * 12;
      }

      return reply.status(200).send({
        employeeId, year, monthsProcessed,
        ytdGrossSatang: ytdGross,
        ytdTaxSatang: ytdTax,
        ytdSscSatang: ytdSSC,
        ytdProvidentFundSatang: ytdPF,
        ytdNetSatang: ytdNet,
        projectedAnnualTaxSatang: projectedAnnualTax,
      });
    },
  );
}
