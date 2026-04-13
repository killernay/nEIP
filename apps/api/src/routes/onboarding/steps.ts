/**
 * POST /api/v1/onboarding/step/:stepNumber
 *
 * 6-step onboarding wizard:
 *   Step 1 — Company profile (name, tax_id, type, fiscal_year)
 *   Step 2 — Select industry template → auto-set modules
 *   Step 3 — Customize module selection (toggle on/off with dependency check)
 *   Step 4 — Enterprise structure (branches, warehouses, departments)
 *   Step 5 — Create admin user + assign roles
 *   Step 6 — Complete → seed CoA + tax config + fiscal year + activate modules
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { API_V1_PREFIX, ValidationError, NotFoundError } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import {
  ALL_PERMISSIONS,
  ACCOUNTANT_PERMISSIONS,
  APPROVER_PERMISSIONS,
  ROLE_OWNER,
  ROLE_ACCOUNTANT,
  ROLE_APPROVER,
} from '../../lib/permissions.js';

// ---------------------------------------------------------------------------
// Module dependency map — modules that require other modules
// ---------------------------------------------------------------------------

const MODULE_DEPENDENCIES: Record<string, string[]> = {
  ar: ['finance'],
  ap: ['finance'],
  bank: ['finance'],
  tax: ['finance'],
  sales: ['ar', 'finance'],
  purchasing: ['ap', 'finance'],
  inventory: ['finance'],
  manufacturing: ['inventory', 'purchasing', 'finance'],
  quality: ['inventory'],
  controlling: ['finance'],
  projects: ['finance'],
  hr: [],
  payroll: ['hr', 'finance'],
  crm: [],
  assets: ['finance'],
  trade: ['inventory', 'sales', 'purchasing', 'finance'],
  multicurrency: ['finance'],
};

// ---------------------------------------------------------------------------
// TFAC CoA seed data per preset
// ---------------------------------------------------------------------------

interface CoaSeed {
  code: string;
  nameTh: string;
  nameEn: string;
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
}

const TFAC_BASE_COA: CoaSeed[] = [
  // Assets (1xxx)
  { code: '1100', nameTh: 'เงินสดและรายการเทียบเท่าเงินสด', nameEn: 'Cash and Cash Equivalents', accountType: 'asset' },
  { code: '1200', nameTh: 'ลูกหนี้การค้า', nameEn: 'Accounts Receivable', accountType: 'asset' },
  { code: '1300', nameTh: 'สินค้าคงเหลือ', nameEn: 'Inventory', accountType: 'asset' },
  { code: '1400', nameTh: 'สินทรัพย์หมุนเวียนอื่น', nameEn: 'Other Current Assets', accountType: 'asset' },
  { code: '1500', nameTh: 'ที่ดิน อาคาร และอุปกรณ์', nameEn: 'Property, Plant and Equipment', accountType: 'asset' },
  { code: '1600', nameTh: 'สินทรัพย์ไม่มีตัวตน', nameEn: 'Intangible Assets', accountType: 'asset' },
  { code: '1700', nameTh: 'ภาษีมูลค่าเพิ่มซื้อ', nameEn: 'Input VAT', accountType: 'asset' },
  // Liabilities (2xxx)
  { code: '2100', nameTh: 'เจ้าหนี้การค้า', nameEn: 'Accounts Payable', accountType: 'liability' },
  { code: '2200', nameTh: 'เงินกู้ยืมระยะสั้น', nameEn: 'Short-term Borrowings', accountType: 'liability' },
  { code: '2300', nameTh: 'หนี้สินหมุนเวียนอื่น', nameEn: 'Other Current Liabilities', accountType: 'liability' },
  { code: '2400', nameTh: 'เงินกู้ยืมระยะยาว', nameEn: 'Long-term Borrowings', accountType: 'liability' },
  { code: '2500', nameTh: 'ภาษีเงินได้ค้างจ่าย', nameEn: 'Income Tax Payable', accountType: 'liability' },
  { code: '2600', nameTh: 'ภาษีมูลค่าเพิ่มขาย', nameEn: 'Output VAT', accountType: 'liability' },
  // Equity (3xxx)
  { code: '3100', nameTh: 'ทุนจดทะเบียน', nameEn: 'Registered Capital', accountType: 'equity' },
  { code: '3200', nameTh: 'กำไรสะสม', nameEn: 'Retained Earnings', accountType: 'equity' },
  { code: '3300', nameTh: 'กำไร(ขาดทุน)สุทธิ', nameEn: 'Net Income (Loss)', accountType: 'equity' },
  // Revenue (4xxx)
  { code: '4100', nameTh: 'รายได้จากการขาย', nameEn: 'Sales Revenue', accountType: 'revenue' },
  { code: '4200', nameTh: 'รายได้จากการให้บริการ', nameEn: 'Service Revenue', accountType: 'revenue' },
  { code: '4300', nameTh: 'รายได้อื่น', nameEn: 'Other Income', accountType: 'revenue' },
  // Expenses (5xxx)
  { code: '5100', nameTh: 'ต้นทุนขาย', nameEn: 'Cost of Goods Sold', accountType: 'expense' },
  { code: '5200', nameTh: 'เงินเดือนและค่าจ้าง', nameEn: 'Salaries and Wages', accountType: 'expense' },
  { code: '5300', nameTh: 'ค่าเช่า', nameEn: 'Rent Expense', accountType: 'expense' },
  { code: '5400', nameTh: 'ค่าสาธารณูปโภค', nameEn: 'Utilities Expense', accountType: 'expense' },
  { code: '5500', nameTh: 'ค่าเสื่อมราคา', nameEn: 'Depreciation Expense', accountType: 'expense' },
  { code: '5600', nameTh: 'ค่าใช้จ่ายในการขายและบริหาร', nameEn: 'Selling and Admin Expenses', accountType: 'expense' },
  { code: '5900', nameTh: 'ค่าใช้จ่ายอื่น', nameEn: 'Other Expenses', accountType: 'expense' },
];

// Industry-specific extra accounts
const INDUSTRY_EXTRA_COA: Record<string, CoaSeed[]> = {
  tfac_manufacturing: [
    { code: '1310', nameTh: 'วัตถุดิบ', nameEn: 'Raw Materials', accountType: 'asset' },
    { code: '1320', nameTh: 'งานระหว่างทำ', nameEn: 'Work in Progress', accountType: 'asset' },
    { code: '5110', nameTh: 'ต้นทุนวัตถุดิบ', nameEn: 'Raw Material Cost', accountType: 'expense' },
    { code: '5120', nameTh: 'ค่าแรงงานทางตรง', nameEn: 'Direct Labor Cost', accountType: 'expense' },
    { code: '5130', nameTh: 'ค่าโสหุ้ยการผลิต', nameEn: 'Manufacturing Overhead', accountType: 'expense' },
  ],
  tfac_food: [
    { code: '1310', nameTh: 'วัตถุดิบอาหาร', nameEn: 'Food Raw Materials', accountType: 'asset' },
    { code: '1320', nameTh: 'งานระหว่างทำ', nameEn: 'Work in Progress', accountType: 'asset' },
    { code: '4110', nameTh: 'รายได้จากขายอาหาร', nameEn: 'Food Sales Revenue', accountType: 'revenue' },
    { code: '5110', nameTh: 'ต้นทุนวัตถุดิบอาหาร', nameEn: 'Food Material Cost', accountType: 'expense' },
    { code: '5120', nameTh: 'ค่าแรงงานทางตรง', nameEn: 'Direct Labor Cost', accountType: 'expense' },
  ],
  tfac_construction: [
    { code: '1310', nameTh: 'วัสดุก่อสร้าง', nameEn: 'Construction Materials', accountType: 'asset' },
    { code: '1320', nameTh: 'งานระหว่างก่อสร้าง', nameEn: 'Construction in Progress', accountType: 'asset' },
    { code: '2700', nameTh: 'เงินรับล่วงหน้า', nameEn: 'Advance Receipts', accountType: 'liability' },
    { code: '2710', nameTh: 'เงินประกันผลงาน', nameEn: 'Retention Payable', accountType: 'liability' },
    { code: '4110', nameTh: 'รายได้จากงานก่อสร้าง', nameEn: 'Construction Revenue', accountType: 'revenue' },
  ],
  tfac_trading: [
    { code: '1210', nameTh: 'ลูกหนี้ต่างประเทศ', nameEn: 'Foreign Receivables', accountType: 'asset' },
    { code: '1350', nameTh: 'สินค้าระหว่างทาง', nameEn: 'Goods in Transit', accountType: 'asset' },
    { code: '2110', nameTh: 'เจ้าหนี้ต่างประเทศ', nameEn: 'Foreign Payables', accountType: 'liability' },
    { code: '5140', nameTh: 'ค่าขนส่งระหว่างประเทศ', nameEn: 'International Freight', accountType: 'expense' },
    { code: '5150', nameTh: 'อากรขาเข้า', nameEn: 'Import Duties', accountType: 'expense' },
  ],
  tfac_services: [
    { code: '1210', nameTh: 'ลูกหนี้ค่าบริการ', nameEn: 'Service Receivables', accountType: 'asset' },
    { code: '4210', nameTh: 'รายได้ค่าที่ปรึกษา', nameEn: 'Consulting Revenue', accountType: 'revenue' },
    { code: '5210', nameTh: 'ต้นทุนบริการ', nameEn: 'Cost of Services', accountType: 'expense' },
  ],
  tfac_retail: [
    { code: '4110', nameTh: 'รายได้จากการขายปลีก', nameEn: 'Retail Sales Revenue', accountType: 'revenue' },
    { code: '5160', nameTh: 'ค่าเช่าพื้นที่ขาย', nameEn: 'Store Rental Expense', accountType: 'expense' },
  ],
  tfac_distribution: [
    { code: '1350', nameTh: 'สินค้าระหว่างทาง', nameEn: 'Goods in Transit', accountType: 'asset' },
    { code: '2720', nameTh: 'ส่วนลดค้างจ่าย', nameEn: 'Rebate Accrual', accountType: 'liability' },
    { code: '5140', nameTh: 'ค่าขนส่งสินค้า', nameEn: 'Freight & Distribution', accountType: 'expense' },
  ],
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OnboardingRow {
  id: string;
  tenant_id: string;
  current_step: number;
  industry_template: string | null;
  selected_modules: string[];
  company_name: string | null;
  company_tax_id: string | null;
  company_type: string | null;
  fiscal_year_start: number;
  base_currency: string;
  enterprise_structure: unknown;
  completed_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface TemplateRow {
  code: string;
  default_modules: string[];
  default_coa_preset: string;
  default_tax_config: Record<string, unknown>;
  default_roles: string[];
}

// ---------------------------------------------------------------------------
// Helper: get or create onboarding record
// ---------------------------------------------------------------------------

async function getOrCreateOnboarding(
  fastify: FastifyInstance,
  tenantId: string,
): Promise<OnboardingRow> {
  const existing = await fastify.sql<OnboardingRow[]>`
    SELECT * FROM tenant_onboarding WHERE tenant_id = ${tenantId} LIMIT 1
  `;
  if (existing[0]) return existing[0];

  const rows = await fastify.sql<OnboardingRow[]>`
    INSERT INTO tenant_onboarding (tenant_id)
    VALUES (${tenantId})
    ON CONFLICT (tenant_id) DO UPDATE SET updated_at = NOW()
    RETURNING *
  `;
  return rows[0]!;
}

// ---------------------------------------------------------------------------
// Step body schemas
// ---------------------------------------------------------------------------

const step1BodySchema = {
  type: 'object',
  required: ['companyName', 'companyType'],
  additionalProperties: false,
  properties: {
    companyName: { type: 'string', minLength: 1, maxLength: 255 },
    companyTaxId: { type: 'string', maxLength: 20 },
    companyType: {
      type: 'string',
      enum: ['limited', 'partnership', 'sole_proprietorship', 'public_limited', 'cooperative', 'holding'],
    },
    fiscalYearStart: { type: 'integer', minimum: 1, maximum: 12 },
    baseCurrency: { type: 'string', minLength: 3, maxLength: 3 },
  },
} as const;

const step2BodySchema = {
  type: 'object',
  required: ['templateCode'],
  additionalProperties: false,
  properties: {
    templateCode: { type: 'string', minLength: 1 },
  },
} as const;

const step3BodySchema = {
  type: 'object',
  required: ['modules'],
  additionalProperties: false,
  properties: {
    modules: { type: 'array', items: { type: 'string' }, minItems: 1 },
  },
} as const;

const step4BodySchema = {
  type: 'object',
  required: ['structure'],
  additionalProperties: false,
  properties: {
    structure: {
      type: 'object',
      properties: {
        branches: { type: 'array', items: { type: 'object' } },
        warehouses: { type: 'array', items: { type: 'object' } },
        departments: { type: 'array', items: { type: 'object' } },
      },
    },
  },
} as const;

const step5BodySchema = {
  type: 'object',
  required: ['adminEmail', 'adminName'],
  additionalProperties: false,
  properties: {
    adminEmail: { type: 'string', format: 'email' },
    adminName: { type: 'string', minLength: 1, maxLength: 255 },
    additionalRoles: { type: 'array', items: { type: 'string' } },
  },
} as const;

const step6BodySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    confirm: { type: 'boolean' },
  },
} as const;

// ---------------------------------------------------------------------------
// Step body types
// ---------------------------------------------------------------------------

interface Step1Body {
  companyName: string;
  companyTaxId?: string;
  companyType: string;
  fiscalYearStart?: number;
  baseCurrency?: string;
}

interface Step2Body { templateCode: string; }
interface Step3Body { modules: string[]; }
interface Step4Body { structure: { branches?: unknown[]; warehouses?: unknown[]; departments?: unknown[] }; }
interface Step5Body { adminEmail: string; adminName: string; additionalRoles?: string[]; }
interface Step6Body { confirm?: boolean; }

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export async function stepsRoute(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // ── Step 1: Company Profile ───────────────────────────────────────────
  fastify.post<{ Body: Step1Body }>(
    `${API_V1_PREFIX}/onboarding/step/1`,
    {
      schema: {
        description: 'Step 1 — Company profile (name, tax_id, type, fiscal_year)',
        tags: ['onboarding'],
        security: [{ bearerAuth: [] }],
        body: step1BodySchema,
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const tenantId = request.user.tenantId;
      const { companyName, companyTaxId, companyType, fiscalYearStart, baseCurrency } = request.body;

      const onboarding = await getOrCreateOnboarding(fastify, tenantId);

      if (onboarding.completed_at) {
        throw new ValidationError({ detail: 'Onboarding already completed.' });
      }

      const rows = await fastify.sql<OnboardingRow[]>`
        UPDATE tenant_onboarding
        SET company_name = ${companyName},
            company_tax_id = ${companyTaxId ?? null},
            company_type = ${companyType},
            fiscal_year_start = ${fiscalYearStart ?? 1},
            base_currency = ${baseCurrency ?? 'THB'},
            current_step = GREATEST(current_step, 2),
            updated_at = NOW()
        WHERE tenant_id = ${tenantId}
        RETURNING *
      `;

      // Update tenant name to match
      await fastify.sql`
        UPDATE tenants SET name = ${companyName}, updated_at = NOW()
        WHERE id = ${tenantId}
      `;

      request.log.info({ tenantId }, 'Onboarding step 1 completed');
      return reply.send({ step: 1, status: 'completed', currentStep: rows[0]!.current_step });
    },
  );

  // ── Step 2: Select Industry Template ──────────────────────────────────
  fastify.post<{ Body: Step2Body }>(
    `${API_V1_PREFIX}/onboarding/step/2`,
    {
      schema: {
        description: 'Step 2 — Select industry template, auto-set default modules',
        tags: ['onboarding'],
        security: [{ bearerAuth: [] }],
        body: step2BodySchema,
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const tenantId = request.user.tenantId;
      const { templateCode } = request.body;

      // Verify template exists
      const templates = await fastify.sql<TemplateRow[]>`
        SELECT code, default_modules, default_coa_preset, default_tax_config, default_roles
        FROM industry_templates WHERE code = ${templateCode} LIMIT 1
      `;
      if (!templates[0]) {
        throw new NotFoundError({ detail: `Industry template "${templateCode}" not found.` });
      }

      const template = templates[0];
      await getOrCreateOnboarding(fastify, tenantId);

      const rows = await fastify.sql<OnboardingRow[]>`
        UPDATE tenant_onboarding
        SET industry_template = ${templateCode},
            selected_modules = ${template.default_modules as string[]},
            current_step = GREATEST(current_step, 3),
            updated_at = NOW()
        WHERE tenant_id = ${tenantId}
        RETURNING *
      `;

      request.log.info({ tenantId, templateCode }, 'Onboarding step 2 completed');
      return reply.send({
        step: 2,
        status: 'completed',
        currentStep: rows[0]!.current_step,
        selectedModules: template.default_modules,
        templateCode,
      });
    },
  );

  // ── Step 3: Customize Module Selection ────────────────────────────────
  fastify.post<{ Body: Step3Body }>(
    `${API_V1_PREFIX}/onboarding/step/3`,
    {
      schema: {
        description: 'Step 3 — Customize module selection with dependency check',
        tags: ['onboarding'],
        security: [{ bearerAuth: [] }],
        body: step3BodySchema,
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const tenantId = request.user.tenantId;
      const { modules } = request.body;

      // Finance is always required
      if (!modules.includes('finance')) {
        throw new ValidationError({ detail: 'The "finance" module is required and cannot be removed.' });
      }

      // Dependency check — ensure all required dependencies are present
      const missingDeps: string[] = [];
      for (const mod of modules) {
        const deps = MODULE_DEPENDENCIES[mod] ?? [];
        for (const dep of deps) {
          if (!modules.includes(dep)) {
            missingDeps.push(`Module "${mod}" requires "${dep}"`);
          }
        }
      }
      if (missingDeps.length > 0) {
        throw new ValidationError({
          detail: `Module dependency errors: ${missingDeps.join('; ')}`,
        });
      }

      const rows = await fastify.sql<OnboardingRow[]>`
        UPDATE tenant_onboarding
        SET selected_modules = ${modules as string[]},
            current_step = GREATEST(current_step, 4),
            updated_at = NOW()
        WHERE tenant_id = ${tenantId}
        RETURNING *
      `;

      if (!rows[0]) {
        throw new NotFoundError({ detail: 'Onboarding not started. Complete step 1 first.' });
      }

      request.log.info({ tenantId, modules }, 'Onboarding step 3 completed');
      return reply.send({
        step: 3,
        status: 'completed',
        currentStep: rows[0].current_step,
        selectedModules: modules,
      });
    },
  );

  // ── Step 4: Enterprise Structure ──────────────────────────────────────
  fastify.post<{ Body: Step4Body }>(
    `${API_V1_PREFIX}/onboarding/step/4`,
    {
      schema: {
        description: 'Step 4 — Enterprise structure (branches, warehouses, departments)',
        tags: ['onboarding'],
        security: [{ bearerAuth: [] }],
        body: step4BodySchema,
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const tenantId = request.user.tenantId;
      const { structure } = request.body;

      const rows = await fastify.sql<OnboardingRow[]>`
        UPDATE tenant_onboarding
        SET enterprise_structure = ${JSON.stringify(structure)},
            current_step = GREATEST(current_step, 5),
            updated_at = NOW()
        WHERE tenant_id = ${tenantId}
        RETURNING *
      `;

      if (!rows[0]) {
        throw new NotFoundError({ detail: 'Onboarding not started. Complete step 1 first.' });
      }

      request.log.info({ tenantId }, 'Onboarding step 4 completed');
      return reply.send({ step: 4, status: 'completed', currentStep: rows[0].current_step });
    },
  );

  // ── Step 5: Admin User + Roles ────────────────────────────────────────
  fastify.post<{ Body: Step5Body }>(
    `${API_V1_PREFIX}/onboarding/step/5`,
    {
      schema: {
        description: 'Step 5 — Create admin user and assign roles',
        tags: ['onboarding'],
        security: [{ bearerAuth: [] }],
        body: step5BodySchema,
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const tenantId = request.user.tenantId;
      const userId = request.user.sub;
      const { adminName, additionalRoles } = request.body;

      // Update the current user's name
      await fastify.sql`
        UPDATE users SET name = ${adminName}, updated_at = NOW()
        WHERE id = ${userId}
      `;

      // Create default roles if not exist
      const roleConfigs = [
        { name: ROLE_OWNER, permissions: ALL_PERMISSIONS },
        { name: ROLE_ACCOUNTANT, permissions: ACCOUNTANT_PERMISSIONS },
        { name: ROLE_APPROVER, permissions: APPROVER_PERMISSIONS },
      ] as const;

      for (const roleConfig of roleConfigs) {
        const existingRole = await fastify.sql<[{ id: string }?]>`
          SELECT id FROM roles WHERE name = ${roleConfig.name} AND tenant_id = ${tenantId} LIMIT 1
        `;

        if (!existingRole[0]) {
          const roleId = crypto.randomUUID();
          await fastify.sql`
            INSERT INTO roles (id, name, tenant_id)
            VALUES (${roleId}, ${roleConfig.name}, ${tenantId})
            ON CONFLICT DO NOTHING
          `;

          for (const perm of roleConfig.permissions) {
            await fastify.sql`
              INSERT INTO role_permissions (role_id, permission_id, tenant_id)
              VALUES (${roleId}, ${perm}, ${tenantId})
              ON CONFLICT DO NOTHING
            `;
          }
        }
      }

      // Assign Owner role to current user
      const ownerRole = await fastify.sql<[{ id: string }?]>`
        SELECT id FROM roles WHERE name = ${ROLE_OWNER} AND tenant_id = ${tenantId} LIMIT 1
      `;

      if (ownerRole[0]) {
        await fastify.sql`
          INSERT INTO user_roles (user_id, role_id, tenant_id)
          VALUES (${userId}, ${ownerRole[0].id}, ${tenantId})
          ON CONFLICT DO NOTHING
        `;
      }

      // Assign additional roles from template if requested
      if (additionalRoles && additionalRoles.length > 0) {
        for (const roleName of additionalRoles) {
          const existingRole = await fastify.sql<[{ id: string }?]>`
            SELECT id FROM roles WHERE name = ${roleName} AND tenant_id = ${tenantId} LIMIT 1
          `;
          if (!existingRole[0]) {
            const roleId = crypto.randomUUID();
            await fastify.sql`
              INSERT INTO roles (id, name, tenant_id)
              VALUES (${roleId}, ${roleName}, ${tenantId})
              ON CONFLICT DO NOTHING
            `;
          }
        }
      }

      const rows = await fastify.sql<OnboardingRow[]>`
        UPDATE tenant_onboarding
        SET current_step = GREATEST(current_step, 6),
            updated_at = NOW()
        WHERE tenant_id = ${tenantId}
        RETURNING *
      `;

      if (!rows[0]) {
        throw new NotFoundError({ detail: 'Onboarding not started. Complete step 1 first.' });
      }

      request.log.info({ tenantId, userId }, 'Onboarding step 5 completed');
      return reply.send({ step: 5, status: 'completed', currentStep: rows[0].current_step });
    },
  );

  // ── Step 6: Complete — seed everything ────────────────────────────────
  fastify.post<{ Body: Step6Body }>(
    `${API_V1_PREFIX}/onboarding/step/6`,
    {
      schema: {
        description: 'Step 6 — Complete onboarding: seed CoA, tax config, fiscal year, activate modules',
        tags: ['onboarding'],
        security: [{ bearerAuth: [] }],
        body: step6BodySchema,
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const tenantId = request.user.tenantId;

      // Load onboarding state
      const onboardingRows = await fastify.sql<OnboardingRow[]>`
        SELECT * FROM tenant_onboarding WHERE tenant_id = ${tenantId} LIMIT 1
      `;
      const onboarding = onboardingRows[0];
      if (!onboarding) {
        throw new NotFoundError({ detail: 'Onboarding not started.' });
      }
      if (onboarding.completed_at) {
        throw new ValidationError({ detail: 'Onboarding already completed.' });
      }

      // Load template
      const templateCode = onboarding.industry_template ?? 'retail';
      const templates = await fastify.sql<TemplateRow[]>`
        SELECT code, default_modules, default_coa_preset, default_tax_config, default_roles
        FROM industry_templates WHERE code = ${templateCode} LIMIT 1
      `;
      const template = templates[0];
      if (!template) {
        throw new NotFoundError({ detail: `Template "${templateCode}" not found.` });
      }

      // ── 1. Seed Chart of Accounts ──
      const coaPreset = template.default_coa_preset;
      const allAccounts = [...TFAC_BASE_COA, ...(INDUSTRY_EXTRA_COA[coaPreset] ?? [])];

      for (const account of allAccounts) {
        const accountId = crypto.randomUUID();
        await fastify.sql`
          INSERT INTO chart_of_accounts (id, code, name_th, name_en, account_type, tenant_id)
          VALUES (${accountId}, ${account.code}, ${account.nameTh}, ${account.nameEn}, ${account.accountType}, ${tenantId})
          ON CONFLICT DO NOTHING
        `;
      }

      // ── 2. Seed tax rates ──
      const taxConfig = (template.default_tax_config ?? {}) as Record<string, unknown>;
      if (taxConfig['vat_rate']) {
        await fastify.sql`
          INSERT INTO tax_rates (id, code, name_th, name_en, rate, tax_type, tenant_id)
          VALUES (${crypto.randomUUID()}, 'VAT7', 'ภาษีมูลค่าเพิ่ม 7%', 'VAT 7%', 700, 'vat', ${tenantId})
          ON CONFLICT DO NOTHING
        `;
      }
      if (taxConfig['wht_services']) {
        await fastify.sql`
          INSERT INTO tax_rates (id, code, name_th, name_en, rate, tax_type, tenant_id)
          VALUES (${crypto.randomUUID()}, 'WHT3', 'ภาษีหัก ณ ที่จ่าย 3%', 'WHT Services 3%', 300, 'wht', ${tenantId})
          ON CONFLICT DO NOTHING
        `;
      }

      // ── 3. Create fiscal year + 12 periods ──
      const currentYear = new Date().getFullYear();
      const startMonth = (onboarding.fiscal_year_start ?? 1) - 1;
      const fyStartDate = new Date(currentYear, startMonth, 1);
      const fyEndDate = new Date(currentYear + 1, startMonth, 0);

      const fiscalYearId = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO fiscal_years (id, year, start_date, end_date, tenant_id)
        VALUES (${fiscalYearId}, ${currentYear}, ${fyStartDate.toISOString().slice(0, 10)}, ${fyEndDate.toISOString().slice(0, 10)}, ${tenantId})
        ON CONFLICT DO NOTHING
      `;

      for (let i = 0; i < 12; i++) {
        const periodId = crypto.randomUUID();
        const periodStart = new Date(currentYear, startMonth + i, 1);
        const periodEnd = new Date(currentYear, startMonth + i + 1, 0);
        await fastify.sql`
          INSERT INTO fiscal_periods (id, fiscal_year_id, period_number, start_date, end_date, status)
          VALUES (${periodId}, ${fiscalYearId}, ${i + 1}, ${periodStart.toISOString().slice(0, 10)}, ${periodEnd.toISOString().slice(0, 10)}, 'open')
          ON CONFLICT DO NOTHING
        `;
      }

      // ── 4. Activate tenant_modules ──
      const selectedModules = onboarding.selected_modules ?? template.default_modules;
      for (const mod of selectedModules) {
        await fastify.sql`
          INSERT INTO tenant_modules (id, tenant_id, module_code, is_active, activated_at)
          VALUES (${crypto.randomUUID()}, ${tenantId}, ${mod}, true, NOW())
          ON CONFLICT (tenant_id, module_code) DO UPDATE SET is_active = true, activated_at = NOW()
        `;
      }

      // ── 5. Create default roles from template ──
      for (const roleName of template.default_roles) {
        const existingRole = await fastify.sql<[{ id: string }?]>`
          SELECT id FROM roles WHERE name = ${roleName} AND tenant_id = ${tenantId} LIMIT 1
        `;
        if (!existingRole[0]) {
          await fastify.sql`
            INSERT INTO roles (id, name, tenant_id)
            VALUES (${crypto.randomUUID()}, ${roleName}, ${tenantId})
            ON CONFLICT DO NOTHING
          `;
        }
      }

      // ── 6. Mark onboarding completed ──
      await fastify.sql`
        UPDATE tenant_onboarding
        SET completed_at = NOW(),
            current_step = 6,
            updated_at = NOW()
        WHERE tenant_id = ${tenantId}
      `;

      request.log.info(
        { tenantId, templateCode, modulesActivated: selectedModules.length, fiscalYearId },
        'Onboarding completed — CoA, tax, fiscal year, modules seeded',
      );

      return reply.send({
        step: 6,
        status: 'completed',
        summary: {
          templateCode,
          accountsSeeded: allAccounts.length,
          modulesActivated: selectedModules,
          fiscalYearId,
          fiscalYear: currentYear,
        },
      });
    },
  );
}
