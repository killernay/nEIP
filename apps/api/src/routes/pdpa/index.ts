/**
 * PDPA Data Subject Rights routes:
 *   POST /api/v1/pdpa/access-request   — export all PII for a person
 *   POST /api/v1/pdpa/erasure-request  — anonymize person's PII across tables
 *   GET  /api/v1/pdpa/requests         — list all PDPA requests with status
 *
 * Thai PDPA (พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล) compliance.
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { PDPA_MANAGE } from '../../lib/permissions.js';
import { toISO } from '../../lib/to-iso.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PdpaRequestRow {
  id: string;
  request_type: string;
  subject_type: string;
  subject_id: string;
  status: string;
  requested_by: string;
  completed_at: Date | string | null;
  result_data: string | null;
  tenant_id: string;
  created_at: Date | string;
  updated_at: Date | string;
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export async function pdpaRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // Ensure pdpa_requests table exists (idempotent)
  await fastify.sql`
    CREATE TABLE IF NOT EXISTS pdpa_requests (
      id TEXT PRIMARY KEY,
      request_type TEXT NOT NULL CHECK (request_type IN ('access', 'erasure')),
      subject_type TEXT NOT NULL CHECK (subject_type IN ('employee', 'contact')),
      subject_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
      requested_by TEXT NOT NULL,
      completed_at TIMESTAMPTZ,
      result_data JSONB,
      tenant_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // -------------------------------------------------------------------------
  // POST /api/v1/pdpa/access-request — export all PII for a person
  // -------------------------------------------------------------------------
  fastify.post<{ Body: { subjectType: string; subjectId: string } }>(
    `${API_V1_PREFIX}/pdpa/access-request`,
    {
      schema: {
        description: 'PDPA Data Access Request — export all PII for a person (contact or employee)',
        tags: ['pdpa', 'thai-compliance'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['subjectType', 'subjectId'],
          additionalProperties: false,
          properties: {
            subjectType: { type: 'string', enum: ['employee', 'contact'] },
            subjectId: { type: 'string', minLength: 1 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              requestId: { type: 'string' },
              status: { type: 'string' },
              subjectType: { type: 'string' },
              subjectId: { type: 'string' },
              data: { type: 'object' },
              generatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(PDPA_MANAGE)],
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user;
      const { subjectType, subjectId } = request.body;

      let piiData: Record<string, unknown> = {};

      if (subjectType === 'employee') {
        const rows = await fastify.sql<[Record<string, unknown>?]>`
          SELECT id, employee_code, title_th, first_name_th, last_name_th,
                 first_name_en, last_name_en, nickname, email, phone,
                 national_id, tax_id, social_security_number,
                 date_of_birth, hire_date, position, employment_type,
                 bank_account_number, bank_name, nationality, status
          FROM employees
          WHERE id = ${subjectId} AND tenant_id = ${tenantId}
          LIMIT 1
        `;
        if (!rows[0]) throw new NotFoundError({ detail: `Employee ${subjectId} not found.` });
        piiData = { employee: rows[0] };

        // Also gather payroll data
        const payrollRows = await fastify.sql<Record<string, unknown>[]>`
          SELECT pi.gross_satang, pi.net_satang, pi.social_security_satang,
                 pi.personal_income_tax_satang, pr.pay_period_start, pr.pay_period_end
          FROM payroll_items pi
          JOIN payroll_runs pr ON pr.id = pi.payroll_run_id
          WHERE pi.employee_id = ${subjectId} AND pr.tenant_id = ${tenantId}
          ORDER BY pr.pay_period_start DESC
          LIMIT 24
        `;
        piiData['payrollHistory'] = payrollRows;

      } else if (subjectType === 'contact') {
        const rows = await fastify.sql<[Record<string, unknown>?]>`
          SELECT id, contact_type, code, company_name, contact_person,
                 email, phone, tax_id, branch_number,
                 address_line1, address_line2, city, province, postal_code, country
          FROM contacts
          WHERE id = ${subjectId} AND tenant_id = ${tenantId}
          LIMIT 1
        `;
        if (!rows[0]) throw new NotFoundError({ detail: `Contact ${subjectId} not found.` });
        piiData = { contact: rows[0] };
      }

      // Record the request
      const requestId = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO pdpa_requests (id, request_type, subject_type, subject_id, status, requested_by, completed_at, result_data, tenant_id)
        VALUES (${requestId}, 'access', ${subjectType}, ${subjectId}, 'completed', ${userId}, NOW(), ${JSON.stringify(piiData)}::jsonb, ${tenantId})
      `;

      request.log.info({ requestId, subjectType, subjectId, tenantId }, 'PDPA access request fulfilled');

      return reply.status(200).send({
        requestId,
        status: 'completed',
        subjectType,
        subjectId,
        data: piiData,
        generatedAt: new Date().toISOString(),
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/pdpa/erasure-request — anonymize person's PII
  // -------------------------------------------------------------------------
  fastify.post<{ Body: { subjectType: string; subjectId: string } }>(
    `${API_V1_PREFIX}/pdpa/erasure-request`,
    {
      schema: {
        description: 'PDPA Erasure Request — anonymize PII across all tables for a person',
        tags: ['pdpa', 'thai-compliance'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['subjectType', 'subjectId'],
          additionalProperties: false,
          properties: {
            subjectType: { type: 'string', enum: ['employee', 'contact'] },
            subjectId: { type: 'string', minLength: 1 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              requestId: { type: 'string' },
              status: { type: 'string' },
              subjectType: { type: 'string' },
              subjectId: { type: 'string' },
              anonymizedFields: { type: 'array', items: { type: 'string' } },
              completedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(PDPA_MANAGE)],
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user;
      const { subjectType, subjectId } = request.body;

      const anonymizedFields: string[] = [];

      if (subjectType === 'employee') {
        // Check employee exists
        const existing = await fastify.sql<[{ id: string; status: string }?]>`
          SELECT id, status FROM employees WHERE id = ${subjectId} AND tenant_id = ${tenantId} LIMIT 1
        `;
        if (!existing[0]) throw new NotFoundError({ detail: `Employee ${subjectId} not found.` });
        if (existing[0].status === 'anonymized') {
          throw new ValidationError({ detail: `Employee ${subjectId} has already been anonymized.` });
        }

        await fastify.sql`
          UPDATE employees SET
            status              = 'anonymized',
            first_name_th       = 'ลบข้อมูล',
            last_name_th        = 'ลบข้อมูล',
            first_name_en       = 'Anonymized',
            last_name_en        = 'Anonymized',
            email               = ${'anonymized-' + subjectId + '@deleted'},
            phone               = NULL,
            national_id         = NULL,
            tax_id              = NULL,
            social_security_number = NULL,
            bank_account_number = NULL,
            date_of_birth       = NULL,
            title_th            = NULL,
            nickname            = NULL,
            notes               = NULL,
            updated_at          = NOW()
          WHERE id = ${subjectId} AND tenant_id = ${tenantId}
        `;
        anonymizedFields.push(
          'first_name_th', 'last_name_th', 'first_name_en', 'last_name_en',
          'email', 'phone', 'national_id', 'tax_id', 'social_security_number',
          'bank_account_number', 'date_of_birth', 'title_th', 'nickname', 'notes',
        );

        // M-10 FIX: Also anonymize WHT certificates referencing this employee's tax ID
        const empTaxInfo = await fastify.sql<[{ tax_id: string | null }?]>`
          SELECT tax_id FROM employees WHERE id = ${subjectId} AND tenant_id = ${tenantId} LIMIT 1
        `;
        const empTaxId = empTaxInfo[0]?.tax_id;
        if (empTaxId) {
          await fastify.sql`
            UPDATE wht_certificates SET
              payee_name    = '[REDACTED]',
              payee_tax_id  = '0000000000000',
              payee_address = '[REDACTED]',
              updated_at    = NOW()
            WHERE payee_tax_id = ${empTaxId} AND tenant_id = ${tenantId}
          `;
          anonymizedFields.push('wht_certificates.payee_name', 'wht_certificates.payee_tax_id', 'wht_certificates.payee_address');
        }

      } else if (subjectType === 'contact') {
        const existing = await fastify.sql<[{ id: string; tax_id: string | null }?]>`
          SELECT id, tax_id FROM contacts WHERE id = ${subjectId} AND tenant_id = ${tenantId} LIMIT 1
        `;
        if (!existing[0]) throw new NotFoundError({ detail: `Contact ${subjectId} not found.` });

        await fastify.sql`
          UPDATE contacts SET
            company_name    = 'ลบข้อมูล (Anonymized)',
            contact_person  = NULL,
            email           = NULL,
            phone           = NULL,
            tax_id          = NULL,
            address_line1   = NULL,
            address_line2   = NULL,
            city            = NULL,
            province        = NULL,
            postal_code     = NULL,
            updated_at      = NOW()
          WHERE id = ${subjectId} AND tenant_id = ${tenantId}
        `;
        anonymizedFields.push(
          'company_name', 'contact_person', 'email', 'phone',
          'tax_id', 'address_line1', 'address_line2', 'city', 'province', 'postal_code',
        );

        // M-10 FIX: Also anonymize WHT certificates referencing this contact's tax ID
        if (existing[0].tax_id) {
          await fastify.sql`
            UPDATE wht_certificates SET
              payee_name    = '[REDACTED]',
              payee_tax_id  = '0000000000000',
              payee_address = '[REDACTED]',
              updated_at    = NOW()
            WHERE payee_tax_id = ${existing[0].tax_id} AND tenant_id = ${tenantId}
          `;
          anonymizedFields.push('wht_certificates.payee_name', 'wht_certificates.payee_tax_id', 'wht_certificates.payee_address');
        }
      }

      // Record the request
      const requestId = crypto.randomUUID();
      const completedAt = new Date().toISOString();
      await fastify.sql`
        INSERT INTO pdpa_requests (id, request_type, subject_type, subject_id, status, requested_by, completed_at, result_data, tenant_id)
        VALUES (${requestId}, 'erasure', ${subjectType}, ${subjectId}, 'completed', ${userId}, NOW(), ${JSON.stringify({ anonymizedFields })}::jsonb, ${tenantId})
      `;

      request.log.info({ requestId, subjectType, subjectId, tenantId }, 'PDPA erasure request completed');

      return reply.status(200).send({
        requestId,
        status: 'completed',
        subjectType,
        subjectId,
        anonymizedFields,
        completedAt,
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/pdpa/requests — list all PDPA requests
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: { limit?: number; offset?: number; status?: string } }>(
    `${API_V1_PREFIX}/pdpa/requests`,
    {
      schema: {
        description: 'List all PDPA data subject requests with status',
        tags: ['pdpa', 'thai-compliance'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            offset: { type: 'integer', minimum: 0, default: 0 },
            status: { type: 'string', enum: ['pending', 'processing', 'completed', 'rejected'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              items: { type: 'array', items: { type: 'object' } },
              total: { type: 'integer' },
              limit: { type: 'integer' },
              offset: { type: 'integer' },
              hasMore: { type: 'boolean' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(PDPA_MANAGE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const limit = request.query.limit ?? 20;
      const offset = request.query.offset ?? 0;
      const { status } = request.query;

      let rows: PdpaRequestRow[];
      let countRows: [{ count: string }];

      if (status !== undefined) {
        countRows = await fastify.sql<[{ count: string }]>`
          SELECT COUNT(*)::text as count FROM pdpa_requests WHERE tenant_id = ${tenantId} AND status = ${status}
        `;
        rows = await fastify.sql<PdpaRequestRow[]>`
          SELECT * FROM pdpa_requests WHERE tenant_id = ${tenantId} AND status = ${status}
          ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        countRows = await fastify.sql<[{ count: string }]>`
          SELECT COUNT(*)::text as count FROM pdpa_requests WHERE tenant_id = ${tenantId}
        `;
        rows = await fastify.sql<PdpaRequestRow[]>`
          SELECT * FROM pdpa_requests WHERE tenant_id = ${tenantId}
          ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
      }

      const total = parseInt(countRows[0]?.count ?? '0', 10);
      const items = rows.map((r) => ({
        id: r.id,
        requestType: r.request_type,
        subjectType: r.subject_type,
        subjectId: r.subject_id,
        status: r.status,
        requestedBy: r.requested_by,
        completedAt: r.completed_at ? toISO(r.completed_at) : null,
        createdAt: toISO(r.created_at),
        updatedAt: toISO(r.updated_at),
      }));

      return reply.status(200).send({
        items,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      });
    },
  );
}
