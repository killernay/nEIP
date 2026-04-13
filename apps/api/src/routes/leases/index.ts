/**
 * IFRS 16 Lease Accounting routes:
 *   POST /api/v1/leases                     — create lease contract
 *   GET  /api/v1/leases                     — list lease contracts
 *   GET  /api/v1/leases/:id                 — get lease detail
 *   PUT  /api/v1/leases/:id                 — update lease
 *   POST /api/v1/leases/:id/activate        — activate + calculate ROU/liability
 *   POST /api/v1/leases/:id/monthly-je      — post monthly JE (depreciation + interest)
 *   GET  /api/v1/leases/:id/schedule        — get amortization schedule
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import {
  FI_LEASE_CREATE,
  FI_LEASE_READ,
  FI_LEASE_UPDATE,
} from '../../lib/permissions.js';
import { nextDocNumber } from '@neip/core';

// ---------------------------------------------------------------------------
// JSON Schemas
// ---------------------------------------------------------------------------

const createBodySchema = {
  type: 'object',
  required: ['lessor', 'lesseeCompanyId', 'assetDescription', 'leaseType', 'startDate', 'endDate', 'monthlyPaymentSatang', 'discountRateBp'],
  additionalProperties: false,
  properties: {
    lessor: { type: 'string', minLength: 1 },
    lesseeCompanyId: { type: 'string', minLength: 1 },
    assetDescription: { type: 'string', minLength: 1 },
    leaseType: { type: 'string', enum: ['operating', 'finance'] },
    startDate: { type: 'string', format: 'date' },
    endDate: { type: 'string', format: 'date' },
    monthlyPaymentSatang: { type: 'string' },
    discountRateBp: { type: 'integer', minimum: 1, maximum: 10000 },
  },
} as const;

const updateBodySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    assetDescription: { type: 'string', minLength: 1 },
    leaseType: { type: 'string', enum: ['operating', 'finance'] },
    endDate: { type: 'string', format: 'date' },
    monthlyPaymentSatang: { type: 'string' },
    discountRateBp: { type: 'integer', minimum: 1, maximum: 10000 },
  },
} as const;

const leaseResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    contractNumber: { type: 'string' },
    lessor: { type: 'string' },
    lesseeCompanyId: { type: 'string' },
    assetDescription: { type: 'string' },
    leaseType: { type: 'string' },
    startDate: { type: 'string' },
    endDate: { type: 'string' },
    monthlyPaymentSatang: { type: 'string' },
    totalPayments: { type: 'integer' },
    discountRateBp: { type: 'integer' },
    rightOfUseAssetSatang: { type: 'string' },
    leaseLiabilitySatang: { type: 'string' },
    status: { type: 'string' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateBody {
  lessor: string;
  lesseeCompanyId: string;
  assetDescription: string;
  leaseType: 'operating' | 'finance';
  startDate: string;
  endDate: string;
  monthlyPaymentSatang: string;
  discountRateBp: number;
}

interface UpdateBody {
  assetDescription?: string;
  leaseType?: string;
  endDate?: string;
  monthlyPaymentSatang?: string;
  discountRateBp?: number;
}

interface IdParams { id: string; }

interface LeaseRow {
  id: string;
  contract_number: string;
  lessor: string;
  lessee_company_id: string;
  asset_description: string;
  lease_type: string;
  start_date: string;
  end_date: string;
  monthly_payment_satang: bigint;
  total_payments: number;
  discount_rate_bp: number;
  right_of_use_asset_satang: bigint;
  lease_liability_satang: bigint;
  status: string;
  tenant_id: string;
  created_by: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface ScheduleRow {
  id: string;
  lease_id: string;
  period_date: string;
  payment_satang: bigint;
  interest_satang: bigint;
  principal_satang: bigint;
  remaining_liability_satang: bigint;
}

interface ListQuery { limit?: number; offset?: number; status?: string; }
interface CountRow { count: string; }

function mapLease(r: LeaseRow) {
  return {
    id: r.id,
    contractNumber: r.contract_number,
    lessor: r.lessor,
    lesseeCompanyId: r.lessee_company_id,
    assetDescription: r.asset_description,
    leaseType: r.lease_type,
    startDate: r.start_date,
    endDate: r.end_date,
    monthlyPaymentSatang: r.monthly_payment_satang.toString(),
    totalPayments: r.total_payments,
    discountRateBp: r.discount_rate_bp,
    rightOfUseAssetSatang: r.right_of_use_asset_satang.toString(),
    leaseLiabilitySatang: r.lease_liability_satang.toString(),
    status: r.status,
    createdAt: toISO(r.created_at),
    updatedAt: toISO(r.updated_at),
  };
}

/**
 * Calculate number of months between two dates (YYYY-MM-DD).
 */
function monthsBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export async function leaseRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  // POST /api/v1/leases
  fastify.post<{ Body: CreateBody }>(
    `${API_V1_PREFIX}/leases`,
    {
      schema: {
        description: 'Create a new lease contract (IFRS 16)',
        tags: ['leases'],
        security: [{ bearerAuth: [] }],
        body: createBodySchema,
        response: { 201: { description: 'Lease created', ...leaseResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(FI_LEASE_CREATE)],
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user;
      const { lessor, lesseeCompanyId, assetDescription, leaseType, startDate, endDate, monthlyPaymentSatang, discountRateBp } = request.body;

      if (startDate >= endDate) {
        throw new ValidationError({ detail: 'startDate must be before endDate.' });
      }

      const totalPayments = monthsBetween(startDate, endDate);
      if (totalPayments <= 0) {
        throw new ValidationError({ detail: 'Lease must span at least 1 month.' });
      }

      const id = crypto.randomUUID();
      const contractNumber = await nextDocNumber(fastify.sql, tenantId, 'lease', new Date().getFullYear());

      await fastify.sql`
        INSERT INTO lease_contracts (id, contract_number, lessor, lessee_company_id, asset_description, lease_type, start_date, end_date, monthly_payment_satang, total_payments, discount_rate_bp, status, tenant_id, created_by)
        VALUES (${id}, ${contractNumber}, ${lessor}, ${lesseeCompanyId}, ${assetDescription}, ${leaseType}, ${startDate}, ${endDate}, ${monthlyPaymentSatang}::bigint, ${totalPayments}, ${discountRateBp}, 'draft', ${tenantId}, ${userId})
      `;

      const rows = await fastify.sql<[LeaseRow]>`SELECT * FROM lease_contracts WHERE id = ${id}`;
      return reply.status(201).send(mapLease(rows[0]));
    },
  );

  // GET /api/v1/leases
  fastify.get<{ Querystring: ListQuery }>(
    `${API_V1_PREFIX}/leases`,
    {
      schema: {
        description: 'List lease contracts',
        tags: ['leases'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            offset: { type: 'integer', minimum: 0, default: 0 },
            status: { type: 'string', enum: ['draft', 'active', 'terminated', 'expired'] },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(FI_LEASE_READ)],
    },
    async (request, _reply) => {
      const { tenantId } = request.user;
      const { limit = 20, offset = 0, status } = request.query;

      let items: LeaseRow[];
      let countRows: CountRow[];

      if (status) {
        [items, countRows] = await Promise.all([
          fastify.sql<LeaseRow[]>`SELECT * FROM lease_contracts WHERE tenant_id = ${tenantId} AND status = ${status} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
          fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM lease_contracts WHERE tenant_id = ${tenantId} AND status = ${status}`,
        ]);
      } else {
        [items, countRows] = await Promise.all([
          fastify.sql<LeaseRow[]>`SELECT * FROM lease_contracts WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
          fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM lease_contracts WHERE tenant_id = ${tenantId}`,
        ]);
      }

      const total = parseInt(countRows[0]?.count ?? '0', 10);
      return { items: items.map(mapLease), total, limit, offset, hasMore: offset + limit < total };
    },
  );

  // GET /api/v1/leases/:id
  fastify.get<{ Params: IdParams }>(
    `${API_V1_PREFIX}/leases/:id`,
    {
      schema: {
        description: 'Get lease contract detail',
        tags: ['leases'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: { 200: { description: 'Lease detail', ...leaseResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(FI_LEASE_READ)],
    },
    async (request, _reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;
      const rows = await fastify.sql<[LeaseRow?]>`SELECT * FROM lease_contracts WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
      if (!rows[0]) throw new NotFoundError({ detail: `Lease ${id} not found.` });
      return mapLease(rows[0]);
    },
  );

  // PUT /api/v1/leases/:id
  fastify.put<{ Params: IdParams; Body: UpdateBody }>(
    `${API_V1_PREFIX}/leases/:id`,
    {
      schema: {
        description: 'Update a draft lease contract',
        tags: ['leases'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        body: updateBodySchema,
        response: { 200: { description: 'Lease updated', ...leaseResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(FI_LEASE_UPDATE)],
    },
    async (request, _reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const existing = await fastify.sql<[LeaseRow?]>`SELECT * FROM lease_contracts WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
      if (!existing[0]) throw new NotFoundError({ detail: `Lease ${id} not found.` });
      if (existing[0].status !== 'draft') {
        throw new ValidationError({ detail: 'Only draft leases can be updated.' });
      }

      const { assetDescription, leaseType, endDate, monthlyPaymentSatang, discountRateBp } = request.body;
      const rows = await fastify.sql<[LeaseRow]>`
        UPDATE lease_contracts SET
          asset_description = COALESCE(${assetDescription ?? null}, asset_description),
          lease_type = COALESCE(${leaseType ?? null}, lease_type),
          end_date = COALESCE(${endDate ?? null}, end_date),
          monthly_payment_satang = COALESCE(${monthlyPaymentSatang ? BigInt(monthlyPaymentSatang).toString() : null}::bigint, monthly_payment_satang),
          discount_rate_bp = COALESCE(${discountRateBp ?? null}::int, discount_rate_bp),
          updated_at = NOW()
        WHERE id = ${id} RETURNING *
      `;
      return mapLease(rows[0]);
    },
  );

  // POST /api/v1/leases/:id/activate — calculate ROU asset + liability, generate schedule
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/leases/:id/activate`,
    {
      schema: {
        description: 'Activate lease — calculate ROU asset, lease liability, and generate amortization schedule',
        tags: ['leases'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      },
      preHandler: [requireAuth, requirePermission(FI_LEASE_UPDATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const existing = await fastify.sql<[LeaseRow?]>`SELECT * FROM lease_contracts WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
      if (!existing[0]) throw new NotFoundError({ detail: `Lease ${id} not found.` });
      if (existing[0].status !== 'draft') {
        throw new ValidationError({ detail: 'Only draft leases can be activated.' });
      }

      const lease = existing[0];
      const payment = BigInt(lease.monthly_payment_satang);
      const n = lease.total_payments;
      const rateBp = lease.discount_rate_bp;

      // Monthly discount rate = annual rate / 12 (rate in BP: rateBp / 10000)
      // PV of annuity = PMT * [(1 - (1+r)^-n) / r]
      const monthlyRate = rateBp / 10000 / 12;
      let pvFactor: number;
      if (monthlyRate === 0) {
        pvFactor = n;
      } else {
        pvFactor = (1 - Math.pow(1 + monthlyRate, -n)) / monthlyRate;
      }

      const leaseLiability = BigInt(Math.round(Number(payment) * pvFactor));
      const rouAsset = leaseLiability; // Initial ROU = lease liability (no prepayments/incentives)

      // Generate amortization schedule
      let remaining = leaseLiability;
      const startDate = new Date(lease.start_date);
      for (let i = 0; i < n; i++) {
        const periodDate = new Date(startDate);
        periodDate.setMonth(periodDate.getMonth() + i + 1);
        const periodStr = periodDate.toISOString().slice(0, 10);

        const interest = BigInt(Math.round(Number(remaining) * monthlyRate));
        const principal = payment - interest;
        remaining = remaining - principal;
        if (remaining < 0n) remaining = 0n;

        const schedId = crypto.randomUUID();
        await fastify.sql`
          INSERT INTO lease_schedules (id, lease_id, period_date, payment_satang, interest_satang, principal_satang, remaining_liability_satang)
          VALUES (${schedId}, ${id}, ${periodStr}, ${payment.toString()}::bigint, ${interest.toString()}::bigint, ${principal.toString()}::bigint, ${remaining.toString()}::bigint)
        `;
      }

      // Update lease with calculated values
      const rows = await fastify.sql<[LeaseRow]>`
        UPDATE lease_contracts SET
          right_of_use_asset_satang = ${rouAsset.toString()}::bigint,
          lease_liability_satang = ${leaseLiability.toString()}::bigint,
          status = 'active',
          updated_at = NOW()
        WHERE id = ${id} RETURNING *
      `;

      return reply.status(200).send(mapLease(rows[0]));
    },
  );

  // POST /api/v1/leases/:id/monthly-je — post monthly journal entry
  fastify.post<{ Params: IdParams; Body: { periodDate: string } }>(
    `${API_V1_PREFIX}/leases/:id/monthly-je`,
    {
      schema: {
        description: 'Post monthly lease JE — Dr Depreciation + Dr Interest Expense, Cr Lease Liability + Cr Cash',
        tags: ['leases'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        body: {
          type: 'object',
          required: ['periodDate'],
          additionalProperties: false,
          properties: { periodDate: { type: 'string', format: 'date' } },
        },
      },
      preHandler: [requireAuth, requirePermission(FI_LEASE_UPDATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId, sub: userId } = request.user;
      const { periodDate } = request.body;

      const existing = await fastify.sql<[LeaseRow?]>`SELECT * FROM lease_contracts WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
      if (!existing[0]) throw new NotFoundError({ detail: `Lease ${id} not found.` });
      if (existing[0].status !== 'active') {
        throw new ValidationError({ detail: 'Lease must be active to post monthly JE.' });
      }

      // Find schedule entry for this period
      const schedRows = await fastify.sql<[ScheduleRow?]>`
        SELECT * FROM lease_schedules WHERE lease_id = ${id} AND period_date = ${periodDate} LIMIT 1
      `;
      if (!schedRows[0]) throw new NotFoundError({ detail: `No schedule entry for period ${periodDate}.` });
      const sched = schedRows[0];

      // Calculate monthly depreciation (straight-line: ROU / total periods)
      const lease = existing[0];
      const monthlyDepreciation = BigInt(lease.right_of_use_asset_satang) / BigInt(lease.total_payments);

      const now = new Date();
      const fiscalYear = now.getFullYear();
      const fiscalPeriod = now.getMonth() + 1;
      const jeId = crypto.randomUUID();
      const jeDocNumber = await nextDocNumber(fastify.sql, tenantId, 'journal_entry', fiscalYear);

      // Create JE: Dr Depreciation, Dr Interest, Cr Lease Liability, Cr Cash
      await fastify.sql`
        INSERT INTO journal_entries (id, document_number, description, status, fiscal_year, fiscal_period, tenant_id, created_by, posted_at, created_at, updated_at)
        VALUES (${jeId}, ${jeDocNumber}, ${'IFRS 16 monthly — Lease ' + lease.contract_number + ' period ' + periodDate}, 'posted', ${fiscalYear}, ${fiscalPeriod}, ${tenantId}, ${userId}, ${now.toISOString()}::timestamptz, ${now.toISOString()}::timestamptz, ${now.toISOString()}::timestamptz)
      `;

      // Line 1: Dr Depreciation Expense
      await fastify.sql`
        INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang, created_at)
        VALUES (${crypto.randomUUID()}, ${jeId}, 1, 'depreciation_expense', ${'ROU depreciation — ' + lease.contract_number}, ${monthlyDepreciation.toString()}::bigint, 0::bigint, ${now.toISOString()}::timestamptz)
      `;

      // Line 2: Dr Interest Expense
      await fastify.sql`
        INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang, created_at)
        VALUES (${crypto.randomUUID()}, ${jeId}, 2, 'interest_expense', ${'Lease interest — ' + lease.contract_number}, ${sched.interest_satang.toString()}::bigint, 0::bigint, ${now.toISOString()}::timestamptz)
      `;

      // Line 3: Cr Lease Liability (principal portion)
      await fastify.sql`
        INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang, created_at)
        VALUES (${crypto.randomUUID()}, ${jeId}, 3, 'lease_liability', ${'Lease liability reduction — ' + lease.contract_number}, 0::bigint, ${sched.principal_satang.toString()}::bigint, ${now.toISOString()}::timestamptz)
      `;

      // Line 4: Cr Cash (full payment)
      await fastify.sql`
        INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang, created_at)
        VALUES (${crypto.randomUUID()}, ${jeId}, 4, 'cash', ${'Lease payment — ' + lease.contract_number}, 0::bigint, ${sched.payment_satang.toString()}::bigint, ${now.toISOString()}::timestamptz)
      `;

      return reply.status(201).send({
        journalEntryId: jeId,
        documentNumber: jeDocNumber,
        periodDate,
        depreciationSatang: monthlyDepreciation.toString(),
        interestSatang: sched.interest_satang.toString(),
        principalSatang: sched.principal_satang.toString(),
        paymentSatang: sched.payment_satang.toString(),
      });
    },
  );

  // GET /api/v1/leases/:id/schedule
  fastify.get<{ Params: IdParams }>(
    `${API_V1_PREFIX}/leases/:id/schedule`,
    {
      schema: {
        description: 'Get lease amortization schedule',
        tags: ['leases'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      },
      preHandler: [requireAuth, requirePermission(FI_LEASE_READ)],
    },
    async (request, _reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const existing = await fastify.sql<[LeaseRow?]>`SELECT * FROM lease_contracts WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
      if (!existing[0]) throw new NotFoundError({ detail: `Lease ${id} not found.` });

      const schedule = await fastify.sql<ScheduleRow[]>`
        SELECT * FROM lease_schedules WHERE lease_id = ${id} ORDER BY period_date ASC
      `;

      return {
        leaseId: id,
        contractNumber: existing[0].contract_number,
        schedule: schedule.map(s => ({
          periodDate: s.period_date,
          paymentSatang: s.payment_satang.toString(),
          interestSatang: s.interest_satang.toString(),
          principalSatang: s.principal_satang.toString(),
          remainingLiabilitySatang: s.remaining_liability_satang.toString(),
        })),
      };
    },
  );
}
