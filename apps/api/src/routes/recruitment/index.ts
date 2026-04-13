/**
 * Recruitment / ATS routes:
 *   POST /api/v1/job-postings              — create job posting
 *   GET  /api/v1/job-postings              — list
 *   GET  /api/v1/job-postings/:id          — detail
 *   PUT  /api/v1/job-postings/:id          — update
 *   POST /api/v1/job-postings/:id/open     — publish
 *   POST /api/v1/job-postings/:id/close    — close
 *   POST /api/v1/job-applications          — create application
 *   GET  /api/v1/job-applications          — list
 *   PUT  /api/v1/job-applications/:id/status — transition status
 *   POST /api/v1/job-applications/:id/convert — hired → create employee
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import {
  HR_RECRUITMENT_CREATE, HR_RECRUITMENT_READ, HR_RECRUITMENT_UPDATE, HR_RECRUITMENT_MANAGE,
} from '../../lib/permissions.js';

export async function recruitmentRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // POST /job-postings
  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/job-postings`,
    {
      schema: { description: 'Create job posting', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_RECRUITMENT_CREATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const b = request.body;
      if (!b['title']) throw new ValidationError({ detail: 'title is required.' });

      const id = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO job_postings (id, title, department_id, position_id, description, requirements, status, tenant_id)
        VALUES (${id}, ${b['title'] as string}, ${(b['departmentId'] as string) ?? null},
                ${(b['positionId'] as string) ?? null}, ${(b['description'] as string) ?? null},
                ${(b['requirements'] as string) ?? null}, 'draft', ${tenantId})
      `;
      const rows = await fastify.sql`SELECT * FROM job_postings WHERE id = ${id} LIMIT 1`;
      return reply.status(201).send(rows[0]);
    },
  );

  // GET /job-postings
  fastify.get(
    `${API_V1_PREFIX}/job-postings`,
    {
      schema: { description: 'List job postings', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_RECRUITMENT_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { status } = request.query as Record<string, string | undefined>;
      let q = `SELECT * FROM job_postings WHERE tenant_id = $1`;
      const p: unknown[] = [tenantId];
      if (status) { q += ` AND status = $${p.length + 1}`; p.push(status); }
      q += ` ORDER BY created_at DESC`;
      const rows = await fastify.sql.unsafe(q, p as (string | number | boolean | null)[]);
      return reply.send(rows);
    },
  );

  // GET /job-postings/:id
  fastify.get<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/job-postings/:id`,
    {
      schema: { description: 'Job posting detail', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_RECRUITMENT_READ)],
    },
    async (request, reply) => {
      const rows = await fastify.sql`
        SELECT * FROM job_postings WHERE id = ${request.params.id} AND tenant_id = ${request.user.tenantId} LIMIT 1
      `;
      if (!rows[0]) throw new NotFoundError({ detail: 'Job posting not found.' });
      const apps = await fastify.sql`
        SELECT * FROM job_applications WHERE posting_id = ${request.params.id} ORDER BY created_at DESC
      `;
      return reply.send({ ...rows[0], applications: apps });
    },
  );

  // PUT /job-postings/:id
  fastify.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/job-postings/:id`,
    {
      schema: { description: 'Update job posting', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_RECRUITMENT_UPDATE)],
    },
    async (request, reply) => {
      const b = request.body;
      const res = await fastify.sql`
        UPDATE job_postings SET
          title = COALESCE(${(b['title'] as string) ?? null}, title),
          department_id = COALESCE(${(b['departmentId'] as string) ?? null}, department_id),
          position_id = COALESCE(${(b['positionId'] as string) ?? null}, position_id),
          description = COALESCE(${(b['description'] as string) ?? null}, description),
          requirements = COALESCE(${(b['requirements'] as string) ?? null}, requirements)
        WHERE id = ${request.params.id} AND tenant_id = ${request.user.tenantId}
        RETURNING *
      `;
      if (!res[0]) throw new NotFoundError({ detail: 'Job posting not found.' });
      return reply.send(res[0]);
    },
  );

  // POST /job-postings/:id/open
  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/job-postings/:id/open`,
    {
      schema: { description: 'Open job posting', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_RECRUITMENT_UPDATE)],
    },
    async (request, reply) => {
      const res = await fastify.sql`
        UPDATE job_postings SET status = 'open'
        WHERE id = ${request.params.id} AND tenant_id = ${request.user.tenantId} AND status = 'draft'
        RETURNING *
      `;
      if (!res[0]) throw new NotFoundError({ detail: 'Job posting not found or not in draft.' });
      return reply.send(res[0]);
    },
  );

  // POST /job-postings/:id/close
  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/job-postings/:id/close`,
    {
      schema: { description: 'Close job posting', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_RECRUITMENT_UPDATE)],
    },
    async (request, reply) => {
      const res = await fastify.sql`
        UPDATE job_postings SET status = 'closed'
        WHERE id = ${request.params.id} AND tenant_id = ${request.user.tenantId} AND status = 'open'
        RETURNING *
      `;
      if (!res[0]) throw new NotFoundError({ detail: 'Job posting not found or not open.' });
      return reply.send(res[0]);
    },
  );

  // POST /job-applications
  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/job-applications`,
    {
      schema: { description: 'Create job application', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_RECRUITMENT_MANAGE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const b = request.body;
      if (!b['postingId']) throw new ValidationError({ detail: 'postingId is required.' });
      if (!b['applicantName']) throw new ValidationError({ detail: 'applicantName is required.' });

      const id = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO job_applications (id, posting_id, applicant_name, email, phone, resume_url, status, notes, tenant_id)
        VALUES (${id}, ${b['postingId'] as string}, ${b['applicantName'] as string},
                ${(b['email'] as string) ?? null}, ${(b['phone'] as string) ?? null},
                ${(b['resumeUrl'] as string) ?? null}, 'received', ${(b['notes'] as string) ?? null}, ${tenantId})
      `;
      const rows = await fastify.sql`SELECT * FROM job_applications WHERE id = ${id} LIMIT 1`;
      return reply.status(201).send(rows[0]);
    },
  );

  // GET /job-applications
  fastify.get(
    `${API_V1_PREFIX}/job-applications`,
    {
      schema: { description: 'List job applications', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_RECRUITMENT_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { postingId, status } = request.query as Record<string, string | undefined>;
      let q = `SELECT * FROM job_applications WHERE tenant_id = $1`;
      const p: unknown[] = [tenantId];
      if (postingId) { q += ` AND posting_id = $${p.length + 1}`; p.push(postingId); }
      if (status) { q += ` AND status = $${p.length + 1}`; p.push(status); }
      q += ` ORDER BY created_at DESC`;
      const rows = await fastify.sql.unsafe(q, p as (string | number | boolean | null)[]);
      return reply.send(rows);
    },
  );

  // PUT /job-applications/:id/status
  fastify.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/job-applications/:id/status`,
    {
      schema: { description: 'Update application status', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_RECRUITMENT_MANAGE)],
    },
    async (request, reply) => {
      const b = request.body;
      if (!b['status']) throw new ValidationError({ detail: 'status is required.' });
      const res = await fastify.sql`
        UPDATE job_applications SET status = ${b['status'] as string}, notes = COALESCE(${(b['notes'] as string) ?? null}, notes)
        WHERE id = ${request.params.id} AND tenant_id = ${request.user.tenantId}
        RETURNING *
      `;
      if (!res[0]) throw new NotFoundError({ detail: 'Application not found.' });
      return reply.send(res[0]);
    },
  );

  // POST /job-applications/:id/convert — hired → create employee
  fastify.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/job-applications/:id/convert`,
    {
      schema: { description: 'Convert hired applicant to employee', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_RECRUITMENT_MANAGE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const appRows = await fastify.sql`
        SELECT * FROM job_applications WHERE id = ${request.params.id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!appRows[0]) throw new NotFoundError({ detail: 'Application not found.' });
      if ((appRows[0] as Record<string, unknown>)['status'] !== 'hired') {
        throw new ValidationError({ detail: 'Only hired applicants can be converted.' });
      }

      const app = appRows[0] as Record<string, unknown>;
      const b = request.body;
      const empId = crypto.randomUUID();
      const nameParts = ((app['applicant_name'] as string) ?? '').split(' ');
      const firstName = nameParts[0] ?? '';
      const lastName = nameParts.slice(1).join(' ') || '';

      await fastify.sql`
        INSERT INTO employees (id, employee_code, first_name_th, last_name_th, email, phone,
                               department_id, position_id, hire_date, status, tenant_id)
        VALUES (${empId}, ${(b['employeeCode'] as string) ?? crypto.randomUUID().substring(0, 8)},
                ${firstName}, ${lastName},
                ${(app['email'] as string) ?? null}, ${(app['phone'] as string) ?? null},
                ${(b['departmentId'] as string) ?? null}, ${(b['positionId'] as string) ?? null},
                ${(b['hireDate'] as string) ?? new Date().toISOString().substring(0, 10)},
                'active', ${tenantId})
      `;
      const empRows = await fastify.sql`SELECT * FROM employees WHERE id = ${empId} LIMIT 1`;
      return reply.status(201).send(empRows[0]);
    },
  );
}
