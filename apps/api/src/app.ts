/**
 * createApp — Fastify application factory.
 *
 * Registers all plugins and routes in dependency order, then returns the
 * configured Fastify instance. Keeping construction separate from listening
 * makes the app fully testable without binding a real port.
 *
 * Plugin registration order:
 *   1. request-id    — must run first so every log line carries the request ID
 *   2. helmet        — security headers (before any response can be sent)
 *   3. cors          — CORS headers
 *   4. rate-limit    — throttle before processing begins
 *   5. swagger       — schema must be registered before routes
 *   6. swagger-ui    — UI depends on swagger
 *   7. jwt           — token decode helper (auth enforcement added in Story 4.2)
 *   8. error-handler — catches errors thrown by any later plugin/route
 *   9. static        — serves Next.js out/ at root (low priority — API routes win)
 *  10. routes        — health + future feature routes
 */

import Fastify from 'fastify';
import type {
  FastifyInstance,
  RawServerDefault,
  FastifyBaseLogger,
  FastifyTypeProviderDefault,
} from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fastifyStatic from '@fastify/static';
import fastifyJwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import { createClient } from '@neip/db';
import type { DbClient } from '@neip/db';
import {
  CONTENT_TYPE_PROBLEM_JSON,
  AUTH_SECURITY_SCHEME_NAME,
  AUTH_SCHEME,
  API_BASE_PATH,
} from '@neip/shared';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import requestIdPlugin from './plugins/request-id.js';
import errorHandlerPlugin from './plugins/error-handler.js';
import auditLogPlugin from './plugins/audit-log.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth/index.js';
import { userRoutes } from './routes/users/index.js';
import { tenantRoutes } from './routes/tenants/index.js';
import { glRoutes } from './routes/gl/index.js';
import { arRoutes } from './routes/ar/index.js';
import { quotationRoutes } from './routes/quotations/index.js';
import { apRoutes } from './routes/ap/index.js';
import { reportRoutes } from './routes/reports/index.js';
import { importRoutes } from './routes/import/index.js';
import { exportRoutes } from './routes/export/index.js';
import { taxRoutes } from './routes/tax/index.js';
import { notificationRoutes } from './routes/notifications/index.js';
import { dashboardRoutes } from './routes/dashboard/index.js';
import { monthEndRoutes } from './routes/month-end/index.js';
import { webhookRoutesPlugin } from './routes/webhooks/index.js';
import { roleRoutesPlugin } from './routes/roles/index.js';
import { firmRoutes } from './routes/firm/index.js';
import { auditRoutes } from './routes/audit/index.js';
import { inventoryRoutes } from './routes/inventory/index.js';
import { contactRoutes } from './routes/contacts/index.js';
import { employeeRoutes } from './routes/employees/index.js';
import { payrollRoutes } from './routes/payroll/index.js';
import { leaveRoutes } from './routes/leave/index.js';
import { fixedAssetRoutes } from './routes/fixed-assets/index.js';
import { bankRoutes } from './routes/bank/index.js';
import { whtRoutes } from './routes/wht/index.js';
import { costCenterRoutes } from './routes/cost-centers/index.js';
import { profitCenterRoutes } from './routes/profit-centers/index.js';
import { purchaseRequisitionRoutes } from './routes/purchase-requisitions/index.js';
import { rfqRoutes } from './routes/rfqs/index.js';
import { stockCountRoutes } from './routes/stock-counts/index.js';
import { positionRoutes } from './routes/positions/index.js';
import { attendanceRoutes } from './routes/attendance/index.js';
import { pdpaRoutes } from './routes/pdpa/index.js';
// Phase 3 — Core Business
import { pricingRoutes } from './routes/pricing/index.js';
import { paymentTermRoutes } from './routes/payment-terms/index.js';
import { dunningRoutes } from './routes/dunning/index.js';
import { recurringJeRoutes } from './routes/recurring-je/index.js';
import { creditRoutes } from './routes/credit/index.js';
// Phase 5 — Enterprise Features
import { currencyRoutes } from './routes/currencies/index.js';
import { companyRoutes } from './routes/companies/index.js';
import { approvalRoutes } from './routes/approvals/index.js';
import { vendorReturnRoutes } from './routes/vendor-returns/index.js';
import { batchRoutes } from './routes/batches/index.js';
import { bankMatchingRoutes } from './routes/bank-matching/index.js';
// Phase 7 — Industry Modules
import { manufacturingRoutes } from './routes/manufacturing/index.js';
import { tradeRoutes } from './routes/trade/index.js';
// Phase 6 — AI & Analytics
import { aiRoutes } from './routes/ai/index.js';
// Industry modules — Projects & Quality
import { projectRoutes } from './routes/projects/index.js';
import { qualityRoutes } from './routes/quality/index.js';
// Enterprise Structure
import { enterpriseRoutes } from './routes/enterprise/index.js';
// Module Toggle System
import { moduleRoutesPlugin } from './routes/modules/index.js';
// Onboarding Wizard
import { onboardingRoutes } from './routes/onboarding/index.js';
// Role-based UI visibility
import { roleConfigRoutes } from './routes/role-config/index.js';
// SAP-gap Phase 2 — PM, Service Procurement, ATP
import { maintenanceRoutes } from './routes/maintenance/index.js';
import { serviceRoutes } from './routes/services/index.js';
import { atpRoutes } from './routes/inventory/atp.js';

// ---------------------------------------------------------------------------
// Fastify type augmentation — extend FastifyInstance with db + sql clients
// ---------------------------------------------------------------------------

import type { Sql } from 'postgres';
import type { AuditService } from '@neip/core';

declare module 'fastify' {
  interface FastifyInstance {
    /** Drizzle ORM typed query client */
    db: DbClient;
    /** Raw postgres.js SQL client (used for low-level probes like health check) */
    sql: Sql;
    /** AuditService instance for manual audit logging in route handlers */
    audit: AuditService;
  }
}

// Canonical type alias so the return type of createApp is always stable
export type App = FastifyInstance<
  RawServerDefault,
  import('http').IncomingMessage,
  import('http').ServerResponse,
  FastifyBaseLogger,
  FastifyTypeProviderDefault
>;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface AppConfig {
  /** Comma-separated or array of allowed CORS origins. Defaults to `*` in dev. */
  corsOrigins?: string | string[] | RegExp;
  /** JWT signing secret — must be at least 32 characters. */
  jwtSecret: string;
  /** Database connection string. Defaults to DATABASE_URL env var. */
  databaseUrl?: string;
  /** Absolute path to the Next.js static export directory. */
  staticRoot?: string;
  /** Node environment. */
  nodeEnv?: 'development' | 'production' | 'test';
  /** Pino log level. */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Build and configure the Fastify application.
 *
 * @param config - Runtime configuration (secrets, origins, paths).
 * @returns     Configured FastifyInstance, ready to call `.listen()` on.
 */
export async function createApp(config: AppConfig): Promise<App> {
  const {
    corsOrigins = '*',
    jwtSecret,
    databaseUrl,
    nodeEnv = 'development',
    logLevel = 'info',
  } = config;

  // Resolve the Next.js output directory relative to the monorepo root.
  const currentDir = fileURLToPath(new URL('.', import.meta.url));
  const defaultStaticRoot = join(currentDir, '..', '..', '..', 'web', 'out');
  const staticRoot = config.staticRoot ?? defaultStaticRoot;

  // ---------------------------------------------------------------------------
  // 1. Fastify instance with Pino structured logging
  //
  // exactOptionalPropertyTypes: true means we cannot pass `transport: undefined`
  // — we must branch so the production branch has no `transport` key at all.
  // ---------------------------------------------------------------------------

  const devTransport = {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
        colorize: true,
      },
    },
  } as const;

  const loggerOptions =
    nodeEnv === 'production'
      ? { level: logLevel }
      : { level: logLevel, ...devTransport };

  const app = Fastify({
    logger: loggerOptions,
    // Use a stable UUID per request as Fastify's built-in genReqId.
    // The request-id plugin overrides this with X-Request-ID header logic.
    genReqId: () => crypto.randomUUID(),
    trustProxy: true,
    ajv: {
      customOptions: {
        removeAdditional: false,
        coerceTypes: 'array',
        allErrors: true,
      },
    },
  }) as App;

  // ---------------------------------------------------------------------------
  // 2. Decorate instance with database clients
  // ---------------------------------------------------------------------------

  const { db, sql } = createClient(databaseUrl);
  app.decorate('db', db);
  // sql is a tagged-template function; Fastify interprets plain function values
  // as getter/setter descriptors in decorate(). Wrap in an object getter so
  // Fastify stores the SQL client itself rather than calling it as a getter fn.
  app.decorate<Sql>('sql', { getter: () => sql } as unknown as Sql);

  // ---------------------------------------------------------------------------
  // 3. Plugin: X-Request-ID (must be first)
  // ---------------------------------------------------------------------------

  await app.register(requestIdPlugin);

  // ---------------------------------------------------------------------------
  // 4. Plugin: Helmet — HTTP security headers
  //
  // exactOptionalPropertyTypes: true prohibits `contentSecurityPolicy: undefined`
  // — branch so the development path omits `contentSecurityPolicy` entirely.
  // ---------------------------------------------------------------------------

  if (nodeEnv === 'production') {
    await app.register(helmet, {
      crossOriginEmbedderPolicy: false, // required for Swagger UI assets
    });
  } else {
    await app.register(helmet, {
      contentSecurityPolicy: false, // disable CSP in dev so Swagger UI loads cleanly
      crossOriginEmbedderPolicy: false,
    });
  }

  // ---------------------------------------------------------------------------
  // 5. Plugin: CORS
  // ---------------------------------------------------------------------------

  await app.register(cors, {
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'X-Idempotency-Key',
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
    credentials: true,
    maxAge: 86_400,
  });

  // ---------------------------------------------------------------------------
  // 6. Plugin: Rate-limiting — per-tenant, per-API-key
  // ---------------------------------------------------------------------------

  await app.register(rateLimit, {
    global: true,
    max: nodeEnv === "production" ? 300 : 10000,
    timeWindow: '1 minute',
    // Key is derived from tenant ID (from JWT sub) or API key header,
    // falling back to IP. Full per-tenant keying is wired in Story 4.2
    // when the auth plugin attaches `request.tenantId`.
    keyGenerator: (request) => {
      const forwarded = request.headers['x-forwarded-for'];
      const ip =
        typeof forwarded === 'string'
          ? (forwarded.split(',')[0]?.trim() ?? request.ip)
          : request.ip;
      return ip;
    },
    errorResponseBuilder: (_request, context) => ({
      type: 'https://problems.neip.app/rate-limit-exceeded',
      title: 'Too Many Requests',
      status: 429,
      detail: `Rate limit of ${String(context.max)} requests per ${String(context.after)} exceeded.`,
    }),
    addHeadersOnExceeding: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
  });

  // ---------------------------------------------------------------------------
  // 7. Plugin: Swagger — OpenAPI 3.1 spec at /api/docs/json
  // ---------------------------------------------------------------------------

  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'nEIP API',
        description: 'AI-Native ERP Platform REST API',
        version: '1.0.0',
        contact: { name: 'nEIP Team' },
        license: { name: 'Proprietary' },
      },
      servers: [
        {
          url: 'http://localhost:5400',
          description: 'Local development server',
        },
      ],
      components: {
        securitySchemes: {
          [AUTH_SECURITY_SCHEME_NAME]: {
            type: 'http',
            scheme: AUTH_SCHEME.toLowerCase(),
            bearerFormat: 'JWT',
            description: 'JWT access token — `Authorization: Bearer <token>`',
          },
        },
        schemas: {
          ErrorResponse: {
            type: 'object' as const,
            required: ['type', 'title', 'status', 'detail'],
            properties: {
              type: {
                type: 'string' as const,
                format: 'uri',
                description: 'URI reference identifying the problem type',
              },
              title: {
                type: 'string' as const,
                description: 'Short, human-readable summary',
              },
              status: {
                type: 'integer' as const,
                description: 'HTTP status code',
              },
              detail: {
                type: 'string' as const,
                description: 'Human-readable explanation specific to this occurrence',
              },
              instance: {
                type: 'string' as const,
                description: 'URI reference identifying the specific occurrence',
              },
            },
          },
        },
      },
      tags: [
        { name: 'system', description: 'System / operational endpoints' },
        { name: 'auth', description: 'Authentication and authorization' },
        { name: 'users', description: 'User management and role assignment' },
        { name: 'tenants', description: 'Tenant / organization management' },
        { name: 'gl', description: 'General Ledger, Chart of Accounts, Fiscal Years' },
        { name: 'ar', description: 'Accounts Receivable — Invoices and Payments' },
        { name: 'ap', description: 'Accounts Payable — Bills and Payments' },
        { name: 'reports', description: 'Financial report generation' },
        { name: 'tax', description: 'Tax rates — VAT and WHT configuration' },
        { name: 'notifications', description: 'In-app notifications' },
        { name: 'dashboard', description: 'Dashboard and KPI summary' },
        { name: 'fixed-assets', description: 'Fixed Asset Register — acquisitions, depreciation, disposals' },
        { name: 'bank', description: 'Bank accounts and reconciliation' },
        { name: 'wht', description: 'Withholding Tax — certificates and filings' },
        { name: 'cost-centers', description: 'Cost Center management' },
        { name: 'profit-centers', description: 'Profit Center management' },
        { name: 'contacts', description: 'CRM Contacts — customers and vendors' },
        { name: 'inventory', description: 'Inventory — products, warehouses, stock movements' },
        { name: 'hr', description: 'Human Resources — employees and departments' },
        { name: 'payroll', description: 'Payroll processing and payslips' },
        { name: 'leave', description: 'Leave management — types and requests' },
        { name: 'audit', description: 'Audit trail and activity logs' },
        { name: 'import-export', description: 'Bulk data import and export' },
        { name: 'webhooks', description: 'Webhook registration and management' },
        { name: 'roles', description: 'Role-based access control — custom roles and permissions' },
        { name: 'quotations', description: 'Sales quotations' },
        { name: 'sales-orders', description: 'Sales orders' },
        { name: 'delivery-notes', description: 'Delivery notes' },
        { name: 'receipts', description: 'Customer receipts and payments received' },
        { name: 'credit-notes', description: 'Credit notes and adjustments' },
        { name: 'purchase-orders', description: 'Purchase orders' },
        { name: 'currencies', description: 'Multi-currency — currencies and exchange rates' },
        { name: 'companies', description: 'Multi-company / branch management' },
        { name: 'approvals', description: 'Approval chains and workflows' },
        { name: 'vendor-returns', description: 'Vendor return management' },
        { name: 'purchase-requisitions', description: 'Purchase requisitions (PR)' },
        { name: 'rfqs', description: 'Request for Quotation (RFQ)' },
        { name: 'ai', description: 'AI agents — anomaly detection, forecasting, categorization, reconciliation, parsing, predictions' },
        { name: 'manufacturing', description: 'Manufacturing (PP) — BOM, Work Centers, Production Orders, MRP' },
        { name: 'projects', description: 'Project System (PS) — Projects, Phases, Time Entries, Expenses' },
        { name: 'quality', description: 'Quality Management (QM) — Inspections, Compliance Certificates, BOI Promotions' },
        { name: 'modules', description: 'Module Toggle System — activate/deactivate ERP modules per tenant' },
        { name: 'enterprise', description: 'Enterprise Structure — Branches, Sales Channels, Org Tree' },
      ],
    },
  });

  // ---------------------------------------------------------------------------
  // 8. Plugin: Swagger UI — served at /api/docs
  // ---------------------------------------------------------------------------

  await app.register(swaggerUi, {
    routePrefix: `${API_BASE_PATH}/docs`,
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayRequestDuration: true,
      persistAuthorization: true,
    },
    staticCSP: false,
    transformStaticCSP: (header) => header,
  });

  // ---------------------------------------------------------------------------
  // 9. Plugin: JWT — token verification helper (enforcement in Story 4.2)
  // ---------------------------------------------------------------------------

  await app.register(fastifyJwt, {
    secret: jwtSecret,
    sign: { expiresIn: '1h', algorithm: 'HS256' },
  });

  // ---------------------------------------------------------------------------
  // 9b. Plugin: Multipart — file uploads for import (Story 8.1)
  // ---------------------------------------------------------------------------

  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10 MB max
      files: 1,                     // single file upload
    },
  });

  // ---------------------------------------------------------------------------
  // 10. Plugin: Error handler
  // ---------------------------------------------------------------------------

  await app.register(errorHandlerPlugin);

  // ---------------------------------------------------------------------------
  // 10b. Plugin: Audit log — automatic mutation audit trail
  // ---------------------------------------------------------------------------

  await app.register(auditLogPlugin);

  // ---------------------------------------------------------------------------
  // 11. Plugin: Static file serving — Next.js build at apps/web/out
  //
  // Registered after API routes are declared so that /api/** paths are matched
  // first. Fastify route lookup is O(1) via a radix trie; registration order
  // only matters for the `wildcard` fallback paths handled outside the trie.
  // ---------------------------------------------------------------------------

  await app.register(fastifyStatic, {
    root: staticRoot,
    prefix: '/',
    decorateReply: false,
    wildcard: false,
  });

  // ---------------------------------------------------------------------------
  // 12. Routes — API feature routes
  // ---------------------------------------------------------------------------

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(userRoutes);
  await app.register(tenantRoutes);
  await app.register(glRoutes);
  await app.register(arRoutes);
  await app.register(quotationRoutes);
  await app.register(apRoutes);
  await app.register(reportRoutes);
  await app.register(importRoutes);
  await app.register(exportRoutes);
  await app.register(taxRoutes);
  await app.register(notificationRoutes);
  await app.register(dashboardRoutes);
  await app.register(monthEndRoutes);
  await app.register(firmRoutes);
  await app.register(webhookRoutesPlugin);
  await app.register(roleRoutesPlugin);
  await app.register(auditRoutes);
  await app.register(inventoryRoutes);
  await app.register(contactRoutes);
  await app.register(employeeRoutes);
  await app.register(payrollRoutes);
  await app.register(leaveRoutes);

  // Financial Modules (FI-AA, FI-BL, WHT, CO)
  await app.register(fixedAssetRoutes);
  await app.register(bankRoutes);
  await app.register(whtRoutes);
  await app.register(costCenterRoutes);
  await app.register(profitCenterRoutes);
  // Thai Compliance (PDPA)
  await app.register(pdpaRoutes);

  // Phase 3 — Core Business
  await app.register(pricingRoutes);
  await app.register(paymentTermRoutes);
  await app.register(dunningRoutes);
  await app.register(recurringJeRoutes);
  await app.register(creditRoutes);

  // Phase 4 — Operations
  await app.register(purchaseRequisitionRoutes);
  await app.register(rfqRoutes);
  await app.register(stockCountRoutes);
  await app.register(positionRoutes);
  await app.register(attendanceRoutes);

  // Phase 5 — Enterprise Features
  await app.register(currencyRoutes);
  await app.register(companyRoutes);
  await app.register(approvalRoutes);
  await app.register(vendorReturnRoutes);
  await app.register(batchRoutes);
  await app.register(bankMatchingRoutes);

  // Phase 6 — AI & Analytics
  await app.register(aiRoutes);

  // Phase 7 — Industry Modules
  await app.register(manufacturingRoutes);
  await app.register(tradeRoutes);
  await app.register(projectRoutes);
  await app.register(qualityRoutes);

  // Enterprise Structure
  await app.register(enterpriseRoutes);

  // Module Toggle System
  await app.register(moduleRoutesPlugin);

  // Onboarding Wizard (templates endpoint is public, steps require auth)
  await app.register(onboardingRoutes);

  // Role-based UI visibility
  await app.register(roleConfigRoutes);

  // SAP-gap Phase 2 — PM, Service Procurement, ATP
  await app.register(maintenanceRoutes);
  await app.register(serviceRoutes);
  await app.register(atpRoutes);

  // ---------------------------------------------------------------------------
  // 13. 404 fallback — serve Next.js index.html for unrecognised non-API paths
  // ---------------------------------------------------------------------------

  app.setNotFoundHandler((_request, reply) => {
    // API paths that are truly not found should get a 404 Problem Details body.
    if (_request.url.startsWith(`${API_BASE_PATH}/`)) {
      void reply
        .status(404)
        .header('Content-Type', CONTENT_TYPE_PROBLEM_JSON)
        .send({
          type: 'https://problems.neip.app/not-found',
          title: 'Not Found',
          status: 404,
          detail: `Route ${_request.method} ${_request.url} not found.`,
          instance: _request.url,
        });
      return;
    }

    // For all other paths, fall back to the Next.js SPA shell.
    void reply.sendFile('index.html', staticRoot);
  });

  return app;
}
