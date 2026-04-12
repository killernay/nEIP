/**
 * Withholding Tax Certificate routes (ใบหัก ณ ที่จ่าย / ภ.ง.ด.3/53):
 *   POST /api/v1/wht-certificates              — create
 *   GET  /api/v1/wht-certificates              — list (filter by month/year/type/status)
 *   GET  /api/v1/wht-certificates/summary      — summary for filing
 *   GET  /api/v1/wht-certificates/:id          — detail
 *   POST /api/v1/wht-certificates/:id/issue    — draft → issued
 *   POST /api/v1/wht-certificates/:id/void     — void
 *   POST /api/v1/wht-certificates/:id/file     — mark as filed
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import {
  FI_WHT_CREATE,
  FI_WHT_READ,
  FI_WHT_ISSUE,
  FI_WHT_VOID,
  FI_WHT_FILE,
} from '../../lib/permissions.js';
import { nextDocNumber } from '@neip/core';

// ---------------------------------------------------------------------------
// JSON Schemas
// ---------------------------------------------------------------------------

const createWhtSchema = {
  type: 'object',
  required: [
    'certificateType', 'payerName', 'payerTaxId',
    'payeeName', 'payeeTaxId', 'payeeAddress',
    'incomeType', 'incomeDescription', 'paymentDate',
    'incomeAmountSatang', 'whtRateBasisPoints', 'taxMonth', 'taxYear',
  ],
  additionalProperties: false,
  properties: {
    certificateType: { type: 'string', enum: ['pnd3', 'pnd53'] },
    payerName: { type: 'string', minLength: 1, maxLength: 255 },
    payerTaxId: { type: 'string', minLength: 13, maxLength: 13 },
    payeeName: { type: 'string', minLength: 1, maxLength: 255 },
    payeeTaxId: { type: 'string', minLength: 13, maxLength: 13 },
    payeeAddress: { type: 'string', minLength: 1, maxLength: 1000 },
    incomeType: { type: 'string', minLength: 1, maxLength: 10 },
    incomeDescription: { type: 'string', minLength: 1, maxLength: 500 },
    paymentDate: { type: 'string', format: 'date' },
    incomeAmountSatang: { type: 'string', description: 'Income amount in satang' },
    whtRateBasisPoints: { type: 'integer', minimum: 1, maximum: 10000, description: 'Rate in basis points (300 = 3%)' },
    taxMonth: { type: 'integer', minimum: 1, maximum: 12 },
    taxYear: { type: 'integer', minimum: 2000 },
    billPaymentId: { type: 'string', nullable: true },
  },
} as const;

const listQuerySchema = {
  type: 'object',
  properties: {
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    offset: { type: 'integer', minimum: 0, default: 0 },
    certificateType: { type: 'string', enum: ['pnd3', 'pnd53'] },
    status: { type: 'string', enum: ['draft', 'issued', 'filed', 'voided'] },
    taxMonth: { type: 'integer', minimum: 1, maximum: 12 },
    taxYear: { type: 'integer' },
  },
} as const;

const whtResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    documentNumber: { type: 'string' },
    certificateType: { type: 'string' },
    payerName: { type: 'string' },
    payerTaxId: { type: 'string' },
    payeeName: { type: 'string' },
    payeeTaxId: { type: 'string' },
    payeeAddress: { type: 'string' },
    incomeType: { type: 'string' },
    incomeDescription: { type: 'string' },
    paymentDate: { type: 'string' },
    incomeAmountSatang: { type: 'string' },
    whtRateBasisPoints: { type: 'integer' },
    whtAmountSatang: { type: 'string' },
    taxMonth: { type: 'integer' },
    taxYear: { type: 'integer' },
    billPaymentId: { type: 'string', nullable: true },
    status: { type: 'string' },
    tenantId: { type: 'string' },
    createdBy: { type: 'string' },
    issuedAt: { type: 'string', nullable: true },
    filedAt: { type: 'string', nullable: true },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateWhtBody {
  certificateType: 'pnd3' | 'pnd53';
  payerName: string;
  payerTaxId: string;
  payeeName: string;
  payeeTaxId: string;
  payeeAddress: string;
  incomeType: string;
  incomeDescription: string;
  paymentDate: string;
  incomeAmountSatang: string;
  whtRateBasisPoints: number;
  taxMonth: number;
  taxYear: number;
  billPaymentId?: string;
}

interface ListQuery {
  limit?: number;
  offset?: number;
  certificateType?: string;
  status?: string;
  taxMonth?: number;
  taxYear?: number;
}

interface IdParams { id: string; }

interface WhtRow {
  id: string;
  document_number: string;
  certificate_type: string;
  payer_name: string;
  payer_tax_id: string;
  payee_name: string;
  payee_tax_id: string;
  payee_address: string;
  income_type: string;
  income_description: string;
  payment_date: string;
  income_amount_satang: bigint;
  wht_rate_basis_points: number;
  wht_amount_satang: bigint;
  tax_month: number;
  tax_year: number;
  bill_payment_id: string | null;
  status: string;
  tenant_id: string;
  created_by: string;
  issued_at: Date | string | null;
  filed_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface CountRow { count: string; }

function mapWht(r: WhtRow) {
  return {
    id: r.id,
    documentNumber: r.document_number,
    certificateType: r.certificate_type,
    payerName: r.payer_name,
    payerTaxId: r.payer_tax_id,
    payeeName: r.payee_name,
    payeeTaxId: r.payee_tax_id,
    payeeAddress: r.payee_address,
    incomeType: r.income_type,
    incomeDescription: r.income_description,
    paymentDate: r.payment_date,
    incomeAmountSatang: r.income_amount_satang.toString(),
    whtRateBasisPoints: r.wht_rate_basis_points,
    whtAmountSatang: r.wht_amount_satang.toString(),
    taxMonth: r.tax_month,
    taxYear: r.tax_year,
    billPaymentId: r.bill_payment_id,
    status: r.status,
    tenantId: r.tenant_id,
    createdBy: r.created_by,
    issuedAt: r.issued_at ? toISO(r.issued_at) : null,
    filedAt: r.filed_at ? toISO(r.filed_at) : null,
    createdAt: toISO(r.created_at),
    updatedAt: toISO(r.updated_at),
  };
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export async function whtRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  // -------------------------------------------------------------------------
  // POST /api/v1/wht-certificates
  // -------------------------------------------------------------------------
  fastify.post<{ Body: CreateWhtBody }>(
    `${API_V1_PREFIX}/wht-certificates`,
    {
      schema: {
        description: 'Create a WHT certificate (ใบหัก ณ ที่จ่าย)',
        tags: ['wht'],
        security: [{ bearerAuth: [] }],
        body: createWhtSchema,
        response: { 201: { description: 'Certificate created', ...whtResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(FI_WHT_CREATE)],
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user;
      const {
        certificateType, payerName, payerTaxId,
        payeeName, payeeTaxId, payeeAddress,
        incomeType, incomeDescription, paymentDate,
        incomeAmountSatang, whtRateBasisPoints, taxMonth, taxYear,
        billPaymentId = null,
      } = request.body;

      // Calculate WHT amount: income * rate_bp / 10000 (round half-up)
      const income = BigInt(incomeAmountSatang);
      const whtAmount = (income * BigInt(whtRateBasisPoints) + 5000n) / 10000n;

      // H-7: Validate pnd3 vs pnd53 based on payee tax ID
      // Thai company tax IDs start with '0'; individuals do not
      const isCompany = payeeTaxId.startsWith('0');
      if (isCompany && certificateType !== 'pnd53') {
        throw new ValidationError({ detail: `Payee tax ID ${payeeTaxId} appears to be a company (starts with '0') — certificateType must be 'pnd53', not '${certificateType}'.` });
      }
      if (!isCompany && certificateType !== 'pnd3') {
        throw new ValidationError({ detail: `Payee tax ID ${payeeTaxId} appears to be an individual — certificateType must be 'pnd3', not '${certificateType}'.` });
      }

      const id = crypto.randomUUID();
      const docNumber = await nextDocNumber(fastify.sql, tenantId, 'wht', taxYear);

      await fastify.sql`
        INSERT INTO wht_certificates (
          id, document_number, certificate_type,
          payer_name, payer_tax_id,
          payee_name, payee_tax_id, payee_address,
          income_type, income_description, payment_date,
          income_amount_satang, wht_rate_basis_points, wht_amount_satang,
          tax_month, tax_year, bill_payment_id,
          status, tenant_id, created_by
        ) VALUES (
          ${id}, ${docNumber}, ${certificateType},
          ${payerName}, ${payerTaxId},
          ${payeeName}, ${payeeTaxId}, ${payeeAddress},
          ${incomeType}, ${incomeDescription}, ${paymentDate},
          ${income.toString()}::bigint, ${whtRateBasisPoints}, ${whtAmount.toString()}::bigint,
          ${taxMonth}, ${taxYear}, ${billPaymentId},
          'draft', ${tenantId}, ${userId}
        )
      `;

      const rows = await fastify.sql<[WhtRow]>`SELECT * FROM wht_certificates WHERE id = ${id} LIMIT 1`;
      return reply.status(201).send(mapWht(rows[0]));
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/wht-certificates/summary — must be BEFORE /:id
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: { taxYear?: number; taxMonth?: number; certificateType?: string } }>(
    `${API_V1_PREFIX}/wht-certificates/summary`,
    {
      schema: {
        description: 'Summary of WHT certificates by month for ภ.ง.ด.3/53 filing',
        tags: ['wht'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            taxYear: { type: 'integer' },
            taxMonth: { type: 'integer', minimum: 1, maximum: 12 },
            certificateType: { type: 'string', enum: ['pnd3', 'pnd53'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              summaries: { type: 'array', items: { type: 'object' } },
              totalWhtSatang: { type: 'string' },
              totalIncomeSatang: { type: 'string' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(FI_WHT_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { taxYear, taxMonth, certificateType } = request.query;

      interface SummaryRow {
        tax_year: number;
        tax_month: number;
        certificate_type: string;
        cert_count: string;
        total_income_satang: bigint;
        total_wht_satang: bigint;
      }

      let rows: SummaryRow[];

      if (taxYear !== undefined && taxMonth !== undefined && certificateType !== undefined) {
        rows = await fastify.sql<SummaryRow[]>`
          SELECT tax_year, tax_month, certificate_type,
            COUNT(*)::text as cert_count,
            SUM(income_amount_satang) as total_income_satang,
            SUM(wht_amount_satang) as total_wht_satang
          FROM wht_certificates
          WHERE tenant_id = ${tenantId} AND status != 'voided'
            AND tax_year = ${taxYear} AND tax_month = ${taxMonth} AND certificate_type = ${certificateType}
          GROUP BY tax_year, tax_month, certificate_type
          ORDER BY tax_year, tax_month
        `;
      } else if (taxYear !== undefined && taxMonth !== undefined) {
        rows = await fastify.sql<SummaryRow[]>`
          SELECT tax_year, tax_month, certificate_type,
            COUNT(*)::text as cert_count,
            SUM(income_amount_satang) as total_income_satang,
            SUM(wht_amount_satang) as total_wht_satang
          FROM wht_certificates
          WHERE tenant_id = ${tenantId} AND status != 'voided'
            AND tax_year = ${taxYear} AND tax_month = ${taxMonth}
          GROUP BY tax_year, tax_month, certificate_type
          ORDER BY tax_year, tax_month
        `;
      } else if (taxYear !== undefined) {
        rows = await fastify.sql<SummaryRow[]>`
          SELECT tax_year, tax_month, certificate_type,
            COUNT(*)::text as cert_count,
            SUM(income_amount_satang) as total_income_satang,
            SUM(wht_amount_satang) as total_wht_satang
          FROM wht_certificates
          WHERE tenant_id = ${tenantId} AND status != 'voided' AND tax_year = ${taxYear}
          GROUP BY tax_year, tax_month, certificate_type
          ORDER BY tax_year, tax_month
        `;
      } else {
        rows = await fastify.sql<SummaryRow[]>`
          SELECT tax_year, tax_month, certificate_type,
            COUNT(*)::text as cert_count,
            SUM(income_amount_satang) as total_income_satang,
            SUM(wht_amount_satang) as total_wht_satang
          FROM wht_certificates
          WHERE tenant_id = ${tenantId} AND status != 'voided'
          GROUP BY tax_year, tax_month, certificate_type
          ORDER BY tax_year, tax_month
        `;
      }

      let totalWht = 0n;
      let totalIncome = 0n;
      const summaries = rows.map((r) => {
        totalWht += r.total_wht_satang;
        totalIncome += r.total_income_satang;
        return {
          taxYear: r.tax_year,
          taxMonth: r.tax_month,
          certificateType: r.certificate_type,
          certCount: r.cert_count,
          totalIncomeSatang: r.total_income_satang.toString(),
          totalWhtSatang: r.total_wht_satang.toString(),
        };
      });

      return reply.status(200).send({
        summaries,
        totalWhtSatang: totalWht.toString(),
        totalIncomeSatang: totalIncome.toString(),
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/wht-certificates
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: ListQuery }>(
    `${API_V1_PREFIX}/wht-certificates`,
    {
      schema: {
        description: 'List WHT certificates',
        tags: ['wht'],
        security: [{ bearerAuth: [] }],
        querystring: listQuerySchema,
        response: {
          200: {
            type: 'object',
            properties: {
              items: { type: 'array', items: whtResponseSchema },
              total: { type: 'integer' },
              limit: { type: 'integer' },
              offset: { type: 'integer' },
              hasMore: { type: 'boolean' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(FI_WHT_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const limit = request.query.limit ?? 20;
      const offset = request.query.offset ?? 0;
      const { certificateType, status, taxMonth, taxYear } = request.query;

      // Build filters dynamically
      let certs: WhtRow[];
      let countRows: CountRow[];

      if (certificateType !== undefined && status !== undefined && taxMonth !== undefined && taxYear !== undefined) {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM wht_certificates WHERE tenant_id = ${tenantId} AND certificate_type = ${certificateType} AND status = ${status} AND tax_month = ${taxMonth} AND tax_year = ${taxYear}`;
        certs = await fastify.sql<WhtRow[]>`SELECT * FROM wht_certificates WHERE tenant_id = ${tenantId} AND certificate_type = ${certificateType} AND status = ${status} AND tax_month = ${taxMonth} AND tax_year = ${taxYear} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      } else if (taxYear !== undefined && taxMonth !== undefined) {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM wht_certificates WHERE tenant_id = ${tenantId} AND tax_year = ${taxYear} AND tax_month = ${taxMonth}`;
        certs = await fastify.sql<WhtRow[]>`SELECT * FROM wht_certificates WHERE tenant_id = ${tenantId} AND tax_year = ${taxYear} AND tax_month = ${taxMonth} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      } else if (status !== undefined) {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM wht_certificates WHERE tenant_id = ${tenantId} AND status = ${status}`;
        certs = await fastify.sql<WhtRow[]>`SELECT * FROM wht_certificates WHERE tenant_id = ${tenantId} AND status = ${status} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      } else {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM wht_certificates WHERE tenant_id = ${tenantId}`;
        certs = await fastify.sql<WhtRow[]>`SELECT * FROM wht_certificates WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      }

      const total = parseInt(countRows[0]?.count ?? '0', 10);
      return reply.status(200).send({
        items: certs.map(mapWht),
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/wht-certificates/:id
  // -------------------------------------------------------------------------
  fastify.get<{ Params: IdParams }>(
    `${API_V1_PREFIX}/wht-certificates/:id`,
    {
      schema: {
        description: 'Get WHT certificate detail',
        tags: ['wht'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: { 200: { description: 'Certificate detail', ...whtResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(FI_WHT_READ)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const rows = await fastify.sql<[WhtRow?]>`SELECT * FROM wht_certificates WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
      if (!rows[0]) throw new NotFoundError({ detail: `WHT certificate ${id} not found.` });

      return reply.status(200).send(mapWht(rows[0]));
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/wht-certificates/:id/issue — draft → issued
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/wht-certificates/:id/issue`,
    {
      schema: {
        description: 'Issue a WHT certificate (draft → issued)',
        tags: ['wht'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: { 200: { description: 'Certificate issued', ...whtResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(FI_WHT_ISSUE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const existing = await fastify.sql<[WhtRow?]>`SELECT * FROM wht_certificates WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
      if (!existing[0]) throw new NotFoundError({ detail: `WHT certificate ${id} not found.` });
      if (existing[0].status !== 'draft') {
        throw new ValidationError({ detail: `Certificate ${id} is not in draft status — current: ${existing[0].status}.` });
      }

      const rows = await fastify.sql<[WhtRow]>`
        UPDATE wht_certificates SET status = 'issued', issued_at = NOW(), updated_at = NOW()
        WHERE id = ${id} RETURNING *
      `;
      return reply.status(200).send(mapWht(rows[0]));
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/wht-certificates/:id/void
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/wht-certificates/:id/void`,
    {
      schema: {
        description: 'Void a WHT certificate',
        tags: ['wht'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: { 200: { description: 'Certificate voided', ...whtResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(FI_WHT_VOID)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const existing = await fastify.sql<[WhtRow?]>`SELECT * FROM wht_certificates WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
      if (!existing[0]) throw new NotFoundError({ detail: `WHT certificate ${id} not found.` });
      if (existing[0].status === 'filed') {
        throw new ValidationError({ detail: 'Filed certificates cannot be voided.' });
      }
      if (existing[0].status === 'voided') {
        throw new ValidationError({ detail: 'Certificate is already voided.' });
      }

      const rows = await fastify.sql<[WhtRow]>`
        UPDATE wht_certificates SET status = 'voided', updated_at = NOW()
        WHERE id = ${id} RETURNING *
      `;
      return reply.status(200).send(mapWht(rows[0]));
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/wht/annual-certificate — 50 ทวิ Annual Tax Certificate
  // -------------------------------------------------------------------------
  fastify.post<{ Body: { employeeId: string; taxYear: number } }>(
    `${API_V1_PREFIX}/wht/annual-certificate`,
    {
      schema: {
        description: '50 ทวิ Annual Tax Certificate — aggregate all WHT deductions for an employee in a tax year',
        tags: ['wht', 'thai-compliance'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['employeeId', 'taxYear'],
          additionalProperties: false,
          properties: {
            employeeId: { type: 'string', minLength: 1 },
            taxYear: { type: 'integer', minimum: 2000 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              certificateType: { type: 'string' },
              taxYear: { type: 'integer' },
              payer: { type: 'object' },
              payee: { type: 'object' },
              incomeDetails: { type: 'array', items: { type: 'object' } },
              totalIncomeSatang: { type: 'string' },
              totalWhtSatang: { type: 'string' },
              generatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(FI_WHT_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { employeeId, taxYear } = request.body;

      // Fetch employee info
      interface EmployeeInfo {
        id: string; first_name_th: string; last_name_th: string;
        national_id: string | null; tax_id: string | null;
        email: string | null; position: string | null;
      }
      const empRows = await fastify.sql<[EmployeeInfo?]>`
        SELECT id, first_name_th, last_name_th, national_id, tax_id, email, position
        FROM employees
        WHERE id = ${employeeId} AND tenant_id = ${tenantId}
        LIMIT 1
      `;
      if (!empRows[0]) throw new NotFoundError({ detail: `Employee ${employeeId} not found.` });
      const emp = empRows[0];

      // Fetch firm/tenant info as payer
      interface FirmInfo {
        company_name: string | null; tax_id: string | null;
        branch_number: string | null; address: string | null;
      }
      const firmRows = await fastify.sql<[FirmInfo?]>`
        SELECT company_name, tax_id, branch_number, address
        FROM tenants WHERE id = ${tenantId} LIMIT 1
      `;
      const firm = firmRows[0];

      // Aggregate payroll WHT for the year (personal income tax) — BigInt
      interface PayrollWhtRow {
        pay_period_start: string;
        gross_satang: bigint;
        personal_income_tax_satang: bigint;
      }
      const payrollRows = await fastify.sql<PayrollWhtRow[]>`
        SELECT pr.pay_period_start, pi.gross_satang::bigint, pi.personal_income_tax_satang::bigint
        FROM payroll_items pi
        JOIN payroll_runs pr ON pr.id = pi.payroll_run_id
        WHERE pi.employee_id = ${employeeId}
          AND pr.tenant_id = ${tenantId}
          AND pr.status IN ('calculated', 'approved', 'paid')
          AND EXTRACT(YEAR FROM pr.pay_period_start::date) = ${taxYear}
        ORDER BY pr.pay_period_start
      `;

      let totalIncome = 0n;
      let totalWht = 0n;
      const incomeDetails = payrollRows.map((r) => {
        totalIncome += r.gross_satang;
        totalWht += r.personal_income_tax_satang;
        return {
          period: r.pay_period_start,
          incomeSatang: r.gross_satang.toString(),
          whtSatang: r.personal_income_tax_satang.toString(),
        };
      });

      return reply.status(200).send({
        certificateType: '50ทวิ',
        taxYear,
        payer: {
          companyName: firm?.company_name ?? tenantId,
          taxId: firm?.tax_id ?? null,
          branchNumber: firm?.branch_number ?? '00000',
          address: firm?.address ?? null,
        },
        payee: {
          name: `${emp.first_name_th} ${emp.last_name_th}`,
          taxId: emp.tax_id ?? emp.national_id ?? null,
          position: emp.position,
        },
        incomeDetails,
        totalIncomeSatang: totalIncome.toString(),
        totalWhtSatang: totalWht.toString(),
        generatedAt: new Date().toISOString(),
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/wht-certificates/:id/file — mark as filed
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/wht-certificates/:id/file`,
    {
      schema: {
        description: 'Mark a WHT certificate as filed with the Revenue Department',
        tags: ['wht'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: { 200: { description: 'Certificate filed', ...whtResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(FI_WHT_FILE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const existing = await fastify.sql<[WhtRow?]>`SELECT * FROM wht_certificates WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
      if (!existing[0]) throw new NotFoundError({ detail: `WHT certificate ${id} not found.` });
      if (existing[0].status !== 'issued') {
        throw new ValidationError({ detail: `Only issued certificates can be filed — current: ${existing[0].status}.` });
      }

      const rows = await fastify.sql<[WhtRow]>`
        UPDATE wht_certificates SET status = 'filed', filed_at = NOW(), updated_at = NOW()
        WHERE id = ${id} RETURNING *
      `;
      return reply.status(200).send(mapWht(rows[0]));
    },
  );
}
