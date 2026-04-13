/**
 * GET /api/v1/ui/config — returns UI visibility config for the current user.
 *
 * Combines:
 *   1. Tenant's active modules (from tenant_modules)
 *   2. User's role template allowed_modules & allowed_pages
 *
 * Result: intersection of tenant modules ∩ role modules → filtered pages + navigation groups.
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';

// ---------------------------------------------------------------------------
// DB row types
// ---------------------------------------------------------------------------

interface TenantModuleRow {
  module_code: string;
}

interface UserRoleRow {
  role_code: string;
}

interface RoleTemplateRow {
  allowed_modules: string[];
  allowed_pages: string[];
}

// ---------------------------------------------------------------------------
// Navigation structure — maps modules to nav groups shown in sidebar
// ---------------------------------------------------------------------------

interface NavItem {
  label: string;
  labelTh?: string;
  href: string;
}

interface NavGroup {
  group: string;
  groupTh?: string;
  items: NavItem[];
}

/**
 * Master navigation map — module → group label + pages.
 * Only groups whose module is in the user's active set are included.
 */
const MODULE_NAV_MAP: Record<string, { group: string; groupTh?: string; items: NavItem[] }> = {
  sales: {
    group: 'Sales', groupTh: 'ขาย',
    items: [
      { label: 'Quotations', labelTh: 'ใบเสนอราคา', href: '/quotations' },
      { label: 'Sales Orders', labelTh: 'ใบสั่งขาย', href: '/sales-orders' },
      { label: 'Delivery Notes', labelTh: 'ใบส่งของ', href: '/delivery-notes' },
    ],
  },
  ar: {
    group: 'Accounts Receivable', groupTh: 'ลูกหนี้',
    items: [
      { label: 'Invoices', labelTh: 'ใบแจ้งหนี้', href: '/invoices' },
      { label: 'Payments', labelTh: 'รับชำระ', href: '/payments' },
      { label: 'Receipts', labelTh: 'ใบเสร็จ', href: '/receipts' },
      { label: 'Credit Notes', labelTh: 'ใบลดหนี้', href: '/credit-notes' },
    ],
  },
  ap: {
    group: 'Accounts Payable', groupTh: 'เจ้าหนี้',
    items: [
      { label: 'Bills', labelTh: 'บิล', href: '/bills' },
      { label: 'Bill Payments', labelTh: 'จ่ายเจ้าหนี้', href: '/bill-payments' },
    ],
  },
  purchasing: {
    group: 'Purchasing', groupTh: 'จัดซื้อ',
    items: [
      { label: 'Purchase Orders', labelTh: 'ใบสั่งซื้อ', href: '/purchase-orders' },
      { label: 'Purchase Requisitions', href: '/purchase-requisitions' },
      { label: 'RFQs', href: '/rfqs' },
    ],
  },
  inventory: {
    group: 'Inventory', groupTh: 'คลังสินค้า',
    items: [
      { label: 'Products', labelTh: 'สินค้า', href: '/products' },
      { label: 'Warehouses', labelTh: 'คลัง', href: '/warehouses' },
      { label: 'Stock Levels', labelTh: 'สต็อก', href: '/inventory' },
      { label: 'Stock Counts', href: '/stock-counts' },
    ],
  },
  finance: {
    group: 'Accounting', groupTh: 'บัญชี',
    items: [
      { label: 'Chart of Accounts', labelTh: 'ผังบัญชี', href: '/accounts' },
      { label: 'Journal Entries', labelTh: 'สมุดรายวัน', href: '/journal-entries' },
      { label: 'Budgets', labelTh: 'งบประมาณ', href: '/budgets' },
      { label: 'Month-End', labelTh: 'ปิดบัญชี', href: '/month-end' },
      { label: 'Fixed Assets', labelTh: 'สินทรัพย์ถาวร', href: '/fixed-assets' },
    ],
  },
  bank: {
    group: 'Finance', groupTh: 'การเงิน',
    items: [
      { label: 'Bank', labelTh: 'ธนาคาร', href: '/bank' },
    ],
  },
  tax: {
    group: 'Tax', groupTh: 'ภาษี',
    items: [
      { label: 'Tax Rates', labelTh: 'อัตราภาษี', href: '/tax-rates' },
      { label: 'WHT', labelTh: 'ใบหัก ณ ที่จ่าย', href: '/wht' },
    ],
  },
  controlling: {
    group: 'Controlling', groupTh: 'ควบคุมต้นทุน',
    items: [
      { label: 'Cost Centers', labelTh: 'ศูนย์ต้นทุน', href: '/cost-centers' },
      { label: 'Profit Centers', labelTh: 'ศูนย์กำไร', href: '/profit-centers' },
    ],
  },
  hr: {
    group: 'HR', groupTh: 'บุคคล',
    items: [
      { label: 'Employees', labelTh: 'พนักงาน', href: '/employees' },
      { label: 'Departments', labelTh: 'แผนก', href: '/departments' },
      { label: 'Positions', labelTh: 'ตำแหน่ง', href: '/positions' },
    ],
  },
  payroll: {
    group: 'Payroll', groupTh: 'เงินเดือน',
    items: [
      { label: 'Payroll', labelTh: 'เงินเดือน', href: '/payroll' },
    ],
  },
  leave: {
    group: 'Leave', groupTh: 'ลางาน',
    items: [
      { label: 'Leave', labelTh: 'ลางาน', href: '/leave' },
      { label: 'Attendance', labelTh: 'ลงเวลา', href: '/attendance' },
    ],
  },
  manufacturing: {
    group: 'Manufacturing', groupTh: 'การผลิต',
    items: [
      { label: 'Manufacturing', labelTh: 'การผลิต', href: '/manufacturing' },
    ],
  },
  crm: {
    group: 'CRM',
    items: [
      { label: 'Contacts', labelTh: 'ลูกค้า/ผู้ขาย', href: '/contacts' },
      { label: 'Vendors', labelTh: 'ผู้ขาย', href: '/vendors' },
    ],
  },
  projects: {
    group: 'Projects', groupTh: 'โครงการ',
    items: [
      { label: 'Projects', labelTh: 'โครงการ', href: '/projects' },
    ],
  },
  quality: {
    group: 'Quality', groupTh: 'คุณภาพ',
    items: [
      { label: 'Quality', labelTh: 'คุณภาพ', href: '/quality' },
    ],
  },
  trade: {
    group: 'Import/Export', groupTh: 'นำเข้า/ส่งออก',
    items: [
      { label: 'Trade', labelTh: 'การค้าระหว่างประเทศ', href: '/trade' },
    ],
  },
  ai: {
    group: 'AI & Analytics',
    items: [
      { label: 'AI Assistant', href: '/ai' },
    ],
  },
};

// ---------------------------------------------------------------------------
// Page matching helper
// ---------------------------------------------------------------------------

function isPageAllowed(page: string, allowedPages: string[]): boolean {
  for (const pattern of allowedPages) {
    if (pattern === '*') return true;
    if (pattern === page) return true;
    // Wildcard suffix: /reports/* matches /reports/trial-balance
    if (pattern.endsWith('/*')) {
      const prefix = pattern.slice(0, -2);
      if (page === prefix || page.startsWith(`${prefix}/`)) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export async function uiConfigRoute(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  fastify.get(
    `${API_V1_PREFIX}/ui/config`,
    {
      preHandler: [requireAuth],
      schema: {
        description: 'Get UI visibility config for the current user (modules, pages, navigation)',
        tags: ['roles'],
        response: {
          200: {
            type: 'object',
            properties: {
              activeModules: { type: 'array', items: { type: 'string' } },
              allowedPages: { type: 'array', items: { type: 'string' } },
              roleTemplate: { type: 'string' },
              navigation: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    group: { type: 'string' },
                    groupTh: { type: 'string' },
                    items: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          label: { type: 'string' },
                          labelTh: { type: 'string' },
                          href: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, _reply) => {
      const { sub: userId, tenantId } = request.user;

      // 1. Get tenant's active modules
      const tenantModules = await fastify.sql<TenantModuleRow[]>`
        SELECT module_code
        FROM tenant_modules
        WHERE tenant_id = ${tenantId}
          AND is_active = true
      `;
      const tenantModuleSet = new Set(tenantModules.map((r) => r.module_code));

      // 2. Get user's role template code from user_roles
      //    We look for the user's first role that matches a role_template code.
      //    Falls back to 'system_admin' if no role is assigned (owner/admin).
      const userRoles = await fastify.sql<UserRoleRow[]>`
        SELECT r.code AS role_code
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id AND r.tenant_id = ur.tenant_id
        WHERE ur.user_id = ${userId}
          AND ur.tenant_id = ${tenantId}
        LIMIT 1
      `;

      const roleCode = userRoles[0]?.role_code ?? 'system_admin';

      // 3. Get role template
      const templates = await fastify.sql<RoleTemplateRow[]>`
        SELECT allowed_modules, allowed_pages
        FROM role_templates
        WHERE code = ${roleCode}
        LIMIT 1
      `;

      // Fallback: if no template matches, grant full access (system_admin)
      const template = templates[0] ?? { allowed_modules: [] as string[], allowed_pages: ['*'] };
      const roleModuleSet = new Set(template.allowed_modules);
      const rolePages = template.allowed_pages;

      // 4. Compute intersection: tenant active ∩ role allowed
      //    system_admin role has all modules → intersection is just tenant modules
      const activeModules: string[] = [];
      for (const mod of tenantModuleSet) {
        if (roleModuleSet.has(mod) || roleCode === 'system_admin') {
          activeModules.push(mod);
        }
      }
      const activeModuleSet = new Set(activeModules);

      // 5. Filter pages based on role's allowed_pages
      const allowedPages: string[] = [];
      // Always include dashboard
      allowedPages.push('/dashboard');

      for (const mod of activeModules) {
        const navDef = MODULE_NAV_MAP[mod];
        if (navDef) {
          for (const item of navDef.items) {
            if (isPageAllowed(item.href, rolePages)) {
              allowedPages.push(item.href);
            }
          }
        }
      }

      // 6. Build navigation groups
      const navigation: NavGroup[] = [];
      for (const [mod, navDef] of Object.entries(MODULE_NAV_MAP)) {
        if (!activeModuleSet.has(mod)) continue;
        const filteredItems = navDef.items.filter((item) => isPageAllowed(item.href, rolePages));
        if (filteredItems.length === 0) continue;
        const navEntry: NavGroup = { group: navDef.group, items: filteredItems };
        if (navDef.groupTh !== undefined) navEntry.groupTh = navDef.groupTh;
        navigation.push(navEntry);
      }

      // Always include settings for admins, reports for finance roles
      if (roleCode === 'system_admin') {
        allowedPages.push('/settings', '/settings/*', '/reports', '/reports/*', '/import', '/approvals');
      }

      return {
        activeModules,
        allowedPages,
        roleTemplate: roleCode,
        navigation,
      };
    },
  );
}
