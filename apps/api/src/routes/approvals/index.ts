/**
 * Approval Chain routes (Phase 5.3):
 *   POST /api/v1/approval-workflows        — create workflow
 *   GET  /api/v1/approval-workflows        — list workflows
 *   POST /api/v1/approvals/submit          — submit document for approval
 *   POST /api/v1/approvals/:id/approve     — approve
 *   POST /api/v1/approvals/:id/reject      — reject
 *   POST /api/v1/approvals/:id/delegate    — delegate
 *   GET  /api/v1/approvals                 — list pending approvals
 *   GET  /api/v1/approvals/:id             — get approval request detail
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ConflictError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import {
  APPROVAL_WORKFLOW_CREATE,
  APPROVAL_WORKFLOW_READ,
  APPROVAL_ACTION,
} from '../../lib/permissions.js';

interface WorkflowRow {
  id: string;
  document_type: string;
  name: string;
  is_active: boolean;
  tenant_id: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface StepRow {
  id: string;
  workflow_id: string;
  step_order: number;
  approver_role: string;
  amount_threshold_satang: string;
  auto_escalate_hours: number | null;
}

interface RequestRow {
  id: string;
  document_id: string;
  document_type: string;
  workflow_id: string;
  current_step: number;
  status: string;
  submitted_by: string;
  tenant_id: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface ActionRow {
  id: string;
  request_id: string;
  step: number;
  action: string;
  actor_id: string;
  delegate_to: string | null;
  comment: string | null;
  acted_at: Date | string;
}

export async function approvalRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // POST /approval-workflows
  fastify.post<{ Body: { documentType: string; name: string; steps: Array<{ stepOrder: number; approverRole: string; amountThresholdSatang?: string; autoEscalateHours?: number }> } }>(
    `${API_V1_PREFIX}/approval-workflows`,
    {
      schema: {
        description: 'Create approval workflow with steps',
        tags: ['approvals'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['documentType', 'name', 'steps'],
          properties: {
            documentType: { type: 'string' },
            name: { type: 'string' },
            steps: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                required: ['stepOrder', 'approverRole'],
                properties: {
                  stepOrder: { type: 'integer' },
                  approverRole: { type: 'string' },
                  amountThresholdSatang: { type: 'string' },
                  autoEscalateHours: { type: 'integer' },
                },
              },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(APPROVAL_WORKFLOW_CREATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { documentType, name, steps } = request.body;
      const workflowId = crypto.randomUUID();

      await fastify.sql`
        INSERT INTO approval_workflows (id, document_type, name, tenant_id)
        VALUES (${workflowId}, ${documentType}, ${name}, ${tenantId})
      `;

      for (const step of steps) {
        const stepId = crypto.randomUUID();
        await fastify.sql`
          INSERT INTO approval_steps (id, workflow_id, step_order, approver_role, amount_threshold_satang, auto_escalate_hours)
          VALUES (${stepId}, ${workflowId}, ${step.stepOrder}, ${step.approverRole}, ${step.amountThresholdSatang ?? '0'}::bigint, ${step.autoEscalateHours ?? null})
        `;
      }

      const wf = await fastify.sql<[WorkflowRow]>`SELECT * FROM approval_workflows WHERE id = ${workflowId}`;
      const stepsRows = await fastify.sql<StepRow[]>`SELECT * FROM approval_steps WHERE workflow_id = ${workflowId} ORDER BY step_order`;

      return reply.status(201).send({
        id: wf[0].id,
        documentType: wf[0].document_type,
        name: wf[0].name,
        isActive: wf[0].is_active,
        steps: stepsRows.map((s) => ({
          id: s.id,
          stepOrder: s.step_order,
          approverRole: s.approver_role,
          amountThresholdSatang: s.amount_threshold_satang.toString(),
          autoEscalateHours: s.auto_escalate_hours,
        })),
        createdAt: toISO(wf[0].created_at),
      });
    },
  );

  // GET /approval-workflows
  fastify.get(
    `${API_V1_PREFIX}/approval-workflows`,
    {
      schema: { description: 'List approval workflows', tags: ['approvals'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(APPROVAL_WORKFLOW_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const rows = await fastify.sql<WorkflowRow[]>`
        SELECT * FROM approval_workflows WHERE tenant_id = ${tenantId} ORDER BY document_type
      `;
      return reply.send({ items: rows.map((r) => ({ id: r.id, documentType: r.document_type, name: r.name, isActive: r.is_active, createdAt: toISO(r.created_at) })), total: rows.length });
    },
  );

  // POST /approvals/submit — submit document for approval
  fastify.post<{ Body: { documentId: string; documentType: string } }>(
    `${API_V1_PREFIX}/approvals/submit`,
    {
      schema: {
        description: 'Submit a document for approval',
        tags: ['approvals'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['documentId', 'documentType'],
          properties: {
            documentId: { type: 'string' },
            documentType: { type: 'string' },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(APPROVAL_ACTION)],
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user;
      const { documentId, documentType } = request.body;

      // Find active workflow for this document type
      const workflow = await fastify.sql<[WorkflowRow?]>`
        SELECT * FROM approval_workflows
        WHERE tenant_id = ${tenantId} AND document_type = ${documentType} AND is_active = true
        LIMIT 1
      `;
      if (!workflow[0]) {
        throw new NotFoundError({ detail: `No active approval workflow for document type "${documentType}".` });
      }

      // Check for existing pending request
      const existing = await fastify.sql<[{ id: string }?]>`
        SELECT id FROM approval_requests
        WHERE document_id = ${documentId} AND document_type = ${documentType} AND status = 'pending' AND tenant_id = ${tenantId}
        LIMIT 1
      `;
      if (existing[0]) {
        throw new ConflictError({ detail: 'Document already has a pending approval request.' });
      }

      const requestId = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO approval_requests (id, document_id, document_type, workflow_id, current_step, status, submitted_by, tenant_id)
        VALUES (${requestId}, ${documentId}, ${documentType}, ${workflow[0].id}, 1, 'pending', ${userId}, ${tenantId})
      `;

      return reply.status(201).send({
        id: requestId,
        documentId,
        documentType,
        workflowId: workflow[0].id,
        currentStep: 1,
        status: 'pending',
        submittedBy: userId,
      });
    },
  );

  // GET /approvals — list pending approvals
  fastify.get<{ Querystring: { status?: string; documentType?: string } }>(
    `${API_V1_PREFIX}/approvals`,
    {
      schema: {
        description: 'List approval requests',
        tags: ['approvals'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'delegated'] },
            documentType: { type: 'string' },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(APPROVAL_WORKFLOW_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const status = request.query.status ?? 'pending';

      const rows = await fastify.sql<RequestRow[]>`
        SELECT * FROM approval_requests
        WHERE tenant_id = ${tenantId} AND status = ${status}
        ORDER BY created_at DESC
      `;

      return reply.send({
        items: rows.map((r) => ({
          id: r.id,
          documentId: r.document_id,
          documentType: r.document_type,
          workflowId: r.workflow_id,
          currentStep: r.current_step,
          status: r.status,
          submittedBy: r.submitted_by,
          createdAt: toISO(r.created_at),
        })),
        total: rows.length,
      });
    },
  );

  // GET /approvals/:id
  fastify.get<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/approvals/:id`,
    {
      schema: {
        description: 'Get approval request detail with actions',
        tags: ['approvals'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      },
      preHandler: [requireAuth, requirePermission(APPROVAL_WORKFLOW_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const reqRow = await fastify.sql<[RequestRow?]>`
        SELECT * FROM approval_requests WHERE id = ${request.params.id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!reqRow[0]) throw new NotFoundError({ detail: `Approval request ${request.params.id} not found.` });

      const actions = await fastify.sql<ActionRow[]>`
        SELECT * FROM approval_actions WHERE request_id = ${request.params.id} ORDER BY acted_at
      `;

      const r = reqRow[0];
      return reply.send({
        id: r.id,
        documentId: r.document_id,
        documentType: r.document_type,
        workflowId: r.workflow_id,
        currentStep: r.current_step,
        status: r.status,
        submittedBy: r.submitted_by,
        createdAt: toISO(r.created_at),
        actions: actions.map((a) => ({
          id: a.id,
          step: a.step,
          action: a.action,
          actorId: a.actor_id,
          delegateTo: a.delegate_to,
          comment: a.comment,
          actedAt: toISO(a.acted_at),
        })),
      });
    },
  );

  // POST /approvals/:id/approve
  fastify.post<{ Params: { id: string }; Body: { comment?: string } }>(
    `${API_V1_PREFIX}/approvals/:id/approve`,
    {
      schema: {
        description: 'Approve current step',
        tags: ['approvals'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        body: { type: 'object', properties: { comment: { type: 'string' } } },
      },
      preHandler: [requireAuth, requirePermission(APPROVAL_ACTION)],
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user;
      const reqRow = await fastify.sql<[RequestRow?]>`
        SELECT * FROM approval_requests WHERE id = ${request.params.id} AND tenant_id = ${tenantId} AND status = 'pending' LIMIT 1
      `;
      if (!reqRow[0]) throw new NotFoundError({ detail: 'Pending approval request not found.' });

      const req = reqRow[0];

      // Record action
      await fastify.sql`
        INSERT INTO approval_actions (id, request_id, step, action, actor_id, comment)
        VALUES (${crypto.randomUUID()}, ${req.id}, ${req.current_step}, 'approve', ${userId}, ${request.body.comment ?? null})
      `;

      // Check if more steps remain
      const nextStep = await fastify.sql<[StepRow?]>`
        SELECT * FROM approval_steps WHERE workflow_id = ${req.workflow_id} AND step_order = ${req.current_step + 1} LIMIT 1
      `;

      if (nextStep[0]) {
        // Advance to next step
        await fastify.sql`
          UPDATE approval_requests SET current_step = ${req.current_step + 1}, updated_at = NOW()
          WHERE id = ${req.id}
        `;
        return reply.send({ id: req.id, status: 'pending', currentStep: req.current_step + 1, message: 'Advanced to next approval step.' });
      } else {
        // All steps complete — fully approved
        await fastify.sql`
          UPDATE approval_requests SET status = 'approved', updated_at = NOW()
          WHERE id = ${req.id}
        `;
        return reply.send({ id: req.id, status: 'approved', currentStep: req.current_step, message: 'Document fully approved.' });
      }
    },
  );

  // POST /approvals/:id/reject
  fastify.post<{ Params: { id: string }; Body: { comment?: string } }>(
    `${API_V1_PREFIX}/approvals/:id/reject`,
    {
      schema: {
        description: 'Reject approval request',
        tags: ['approvals'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        body: { type: 'object', properties: { comment: { type: 'string' } } },
      },
      preHandler: [requireAuth, requirePermission(APPROVAL_ACTION)],
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user;
      const reqRow = await fastify.sql<[RequestRow?]>`
        SELECT * FROM approval_requests WHERE id = ${request.params.id} AND tenant_id = ${tenantId} AND status = 'pending' LIMIT 1
      `;
      if (!reqRow[0]) throw new NotFoundError({ detail: 'Pending approval request not found.' });

      await fastify.sql`
        INSERT INTO approval_actions (id, request_id, step, action, actor_id, comment)
        VALUES (${crypto.randomUUID()}, ${reqRow[0].id}, ${reqRow[0].current_step}, 'reject', ${userId}, ${request.body.comment ?? null})
      `;

      await fastify.sql`
        UPDATE approval_requests SET status = 'rejected', updated_at = NOW()
        WHERE id = ${reqRow[0].id}
      `;

      return reply.send({ id: reqRow[0].id, status: 'rejected', message: 'Document rejected.' });
    },
  );

  // POST /approvals/:id/delegate
  fastify.post<{ Params: { id: string }; Body: { delegateTo: string; comment?: string } }>(
    `${API_V1_PREFIX}/approvals/:id/delegate`,
    {
      schema: {
        description: 'Delegate approval to another user',
        tags: ['approvals'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        body: {
          type: 'object',
          required: ['delegateTo'],
          properties: {
            delegateTo: { type: 'string' },
            comment: { type: 'string' },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(APPROVAL_ACTION)],
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user;
      const reqRow = await fastify.sql<[RequestRow?]>`
        SELECT * FROM approval_requests WHERE id = ${request.params.id} AND tenant_id = ${tenantId} AND status = 'pending' LIMIT 1
      `;
      if (!reqRow[0]) throw new NotFoundError({ detail: 'Pending approval request not found.' });

      await fastify.sql`
        INSERT INTO approval_actions (id, request_id, step, action, actor_id, delegate_to, comment)
        VALUES (${crypto.randomUUID()}, ${reqRow[0].id}, ${reqRow[0].current_step}, 'delegate', ${userId}, ${request.body.delegateTo}, ${request.body.comment ?? null})
      `;

      return reply.send({ id: reqRow[0].id, status: 'pending', delegatedTo: request.body.delegateTo, message: 'Approval delegated.' });
    },
  );
}
