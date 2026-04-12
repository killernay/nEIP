'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Search, Globe } from 'lucide-react';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  auth: string;
  permission?: string;
  body?: string;
}

interface ApiGroup {
  name: string;
  endpoints: ApiEndpoint[];
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  POST: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  PUT: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const API_GROUPS: ApiGroup[] = [
  {
    name: 'System & Health',
    endpoints: [
      { method: 'GET', path: '/api/health', description: 'Health check — liveness/readiness probe', auth: 'None' },
    ],
  },
  {
    name: 'Authentication',
    endpoints: [
      { method: 'POST', path: '/api/v1/auth/register', description: 'Register new user account', auth: 'None', body: '{ email, password, name }' },
      { method: 'POST', path: '/api/v1/auth/login', description: 'Authenticate, issue tokens', auth: 'None', body: '{ email, password }' },
      { method: 'POST', path: '/api/v1/auth/refresh', description: 'Rotate refresh token', auth: 'None', body: '{ refreshToken }' },
      { method: 'POST', path: '/api/v1/auth/logout', description: 'Revoke refresh token', auth: 'None', body: '{ refreshToken }' },
    ],
  },
  {
    name: 'Organizations',
    endpoints: [
      { method: 'POST', path: '/api/v1/organizations', description: 'Create new organization', auth: 'Required', body: '{ name, businessType }' },
      { method: 'GET', path: '/api/v1/organizations/:id', description: 'Get organization details', auth: 'Required' },
      { method: 'PUT', path: '/api/v1/organizations/:id', description: 'Update organization settings', auth: 'Required', permission: 'user:update' },
      { method: 'PUT', path: '/api/v1/organizations/:id/settings', description: 'Configure BYOK LLM API key', auth: 'Required', permission: 'user:update' },
    ],
  },
  {
    name: 'General Ledger (GL)',
    endpoints: [
      { method: 'GET', path: '/api/v1/accounts', description: 'List accounts with pagination', auth: 'Required', permission: 'gl:account:read' },
      { method: 'POST', path: '/api/v1/accounts', description: 'Create new account', auth: 'Required', permission: 'gl:account:create' },
      { method: 'PUT', path: '/api/v1/accounts/:id', description: 'Update account', auth: 'Required', permission: 'gl:account:update' },
      { method: 'DELETE', path: '/api/v1/accounts/:id', description: 'Soft-delete account', auth: 'Required', permission: 'gl:account:delete' },
      { method: 'POST', path: '/api/v1/journal-entries', description: 'Create draft journal entry', auth: 'Required', permission: 'gl:journal:create' },
      { method: 'GET', path: '/api/v1/journal-entries', description: 'List journal entries', auth: 'Required', permission: 'gl:journal:read' },
      { method: 'POST', path: '/api/v1/journal-entries/:id/post', description: 'Post entry to GL', auth: 'Required', permission: 'gl:journal:post' },
      { method: 'POST', path: '/api/v1/journal-entries/:id/reverse', description: 'Reverse posted entry', auth: 'Required', permission: 'gl:journal:reverse' },
      { method: 'GET', path: '/api/v1/fiscal-years', description: 'List fiscal years', auth: 'Required', permission: 'gl:period:read' },
      { method: 'POST', path: '/api/v1/fiscal-years', description: 'Create fiscal year', auth: 'Required', permission: 'gl:period:close' },
      { method: 'POST', path: '/api/v1/fiscal-years/:id/close', description: 'Year-end closing', auth: 'Required', permission: 'gl:period:close' },
      { method: 'POST', path: '/api/v1/fiscal-years/:id/reopen', description: 'Reopen closed year', auth: 'Required', permission: 'gl:period:close' },
      { method: 'GET', path: '/api/v1/budgets', description: 'List budgets', auth: 'Required', permission: 'gl:account:read' },
      { method: 'POST', path: '/api/v1/budgets', description: 'Create budget', auth: 'Required', permission: 'gl:account:create' },
    ],
  },
  {
    name: 'Accounts Receivable (AR)',
    endpoints: [
      { method: 'POST', path: '/api/v1/invoices', description: 'Create invoice (draft)', auth: 'Required', permission: 'ar:invoice:create' },
      { method: 'GET', path: '/api/v1/invoices', description: 'List invoices', auth: 'Required', permission: 'ar:invoice:read' },
      { method: 'GET', path: '/api/v1/invoices/:id', description: 'Get invoice detail', auth: 'Required', permission: 'ar:invoice:read' },
      { method: 'POST', path: '/api/v1/invoices/:id/void', description: 'Void invoice', auth: 'Required', permission: 'ar:invoice:void' },
      { method: 'POST', path: '/api/v1/payments', description: 'Record customer payment', auth: 'Required', permission: 'ar:payment:create' },
      { method: 'GET', path: '/api/v1/payments', description: 'List payments', auth: 'Required', permission: 'ar:payment:read' },
      { method: 'POST', path: '/api/v1/payments/:id/match', description: 'Match payment to invoices', auth: 'Required', permission: 'ar:payment:update' },
      { method: 'POST', path: '/api/v1/sales-orders', description: 'Create sales order', auth: 'Required' },
      { method: 'GET', path: '/api/v1/sales-orders', description: 'List sales orders', auth: 'Required' },
      { method: 'POST', path: '/api/v1/sales-orders/:id/confirm', description: 'Confirm sales order', auth: 'Required' },
      { method: 'POST', path: '/api/v1/delivery-notes', description: 'Create delivery note', auth: 'Required' },
      { method: 'POST', path: '/api/v1/delivery-notes/:id/deliver', description: 'Mark as delivered', auth: 'Required' },
      { method: 'POST', path: '/api/v1/receipts', description: 'Issue cash receipt', auth: 'Required' },
      { method: 'POST', path: '/api/v1/credit-notes', description: 'Create credit note', auth: 'Required' },
      { method: 'POST', path: '/api/v1/credit-notes/:id/issue', description: 'Issue credit note', auth: 'Required' },
    ],
  },
  {
    name: 'Accounts Payable (AP)',
    endpoints: [
      { method: 'POST', path: '/api/v1/bills', description: 'Create bill (draft)', auth: 'Required', permission: 'ap:bill:create' },
      { method: 'GET', path: '/api/v1/bills', description: 'List bills', auth: 'Required', permission: 'ap:bill:read' },
      { method: 'POST', path: '/api/v1/bills/:id/post', description: 'Post bill to GL', auth: 'Required', permission: 'ap:bill:post' },
      { method: 'POST', path: '/api/v1/bills/:id/void', description: 'Void bill', auth: 'Required', permission: 'ap:bill:void' },
      { method: 'POST', path: '/api/v1/bill-payments', description: 'Record vendor payment', auth: 'Required', permission: 'ap:payment:create' },
      { method: 'POST', path: '/api/v1/purchase-orders', description: 'Create PO', auth: 'Required' },
      { method: 'GET', path: '/api/v1/purchase-orders', description: 'List POs', auth: 'Required' },
      { method: 'POST', path: '/api/v1/purchase-orders/:id/send', description: 'Send PO to vendor', auth: 'Required' },
      { method: 'POST', path: '/api/v1/purchase-orders/:id/receive', description: 'Record goods received', auth: 'Required' },
      { method: 'POST', path: '/api/v1/purchase-orders/:id/convert-to-bill', description: 'Create bill from PO', auth: 'Required' },
      { method: 'GET', path: '/api/v1/three-way-match', description: 'Three-way match results', auth: 'Required' },
      { method: 'POST', path: '/api/v1/vendors', description: 'Create vendor', auth: 'Required', permission: 'ap:vendor:create' },
      { method: 'GET', path: '/api/v1/vendors', description: 'List vendors', auth: 'Required', permission: 'ap:vendor:read' },
    ],
  },
  {
    name: 'Quotations & SD',
    endpoints: [
      { method: 'POST', path: '/api/v1/quotations', description: 'Create quotation', auth: 'Required' },
      { method: 'GET', path: '/api/v1/quotations', description: 'List quotations', auth: 'Required' },
      { method: 'POST', path: '/api/v1/quotations/:id/convert-to-so', description: 'Convert to sales order', auth: 'Required' },
    ],
  },
  {
    name: 'Purchase Requisitions & RFQ',
    endpoints: [
      { method: 'POST', path: '/api/v1/purchase-requisitions', description: 'Create PR', auth: 'Required', permission: 'mm:pr:create' },
      { method: 'GET', path: '/api/v1/purchase-requisitions', description: 'List PRs', auth: 'Required', permission: 'mm:pr:read' },
      { method: 'POST', path: '/api/v1/purchase-requisitions/:id/approve', description: 'Approve PR', auth: 'Required', permission: 'mm:pr:approve' },
      { method: 'POST', path: '/api/v1/purchase-requisitions/:id/convert-to-po', description: 'Convert PR to PO', auth: 'Required', permission: 'mm:pr:create' },
      { method: 'POST', path: '/api/v1/rfqs', description: 'Create RFQ', auth: 'Required', permission: 'mm:rfq:create' },
      { method: 'GET', path: '/api/v1/rfqs', description: 'List RFQs', auth: 'Required', permission: 'mm:rfq:read' },
      { method: 'POST', path: '/api/v1/rfqs/:id/compare', description: 'Compare vendor responses', auth: 'Required', permission: 'mm:rfq:read' },
      { method: 'POST', path: '/api/v1/rfqs/:id/select-winner', description: 'Select winner & create PO', auth: 'Required', permission: 'mm:rfq:create' },
    ],
  },
  {
    name: 'Contacts (CRM)',
    endpoints: [
      { method: 'POST', path: '/api/v1/contacts', description: 'Create contact', auth: 'Required', permission: 'crm:contact:create' },
      { method: 'GET', path: '/api/v1/contacts', description: 'List contacts', auth: 'Required', permission: 'crm:contact:read' },
      { method: 'GET', path: '/api/v1/contacts/:id', description: 'Get contact + AR/AP summary', auth: 'Required', permission: 'crm:contact:read' },
      { method: 'PUT', path: '/api/v1/contacts/:id', description: 'Update contact', auth: 'Required', permission: 'crm:contact:update' },
      { method: 'DELETE', path: '/api/v1/contacts/:id', description: 'Soft-delete contact', auth: 'Required', permission: 'crm:contact:delete' },
    ],
  },
  {
    name: 'Inventory (MM)',
    endpoints: [
      { method: 'POST', path: '/api/v1/products', description: 'Create product', auth: 'Required', permission: 'inventory:product:create' },
      { method: 'GET', path: '/api/v1/products', description: 'List products', auth: 'Required', permission: 'inventory:product:read' },
      { method: 'POST', path: '/api/v1/stock-movements', description: 'Record stock movement', auth: 'Required', permission: 'inventory:movement:create' },
      { method: 'GET', path: '/api/v1/stock-levels', description: 'Current stock levels', auth: 'Required', permission: 'inventory:level:read' },
      { method: 'GET', path: '/api/v1/inventory/low-stock', description: 'Products below minimum', auth: 'Required', permission: 'inventory:level:read' },
      { method: 'POST', path: '/api/v1/stock-counts', description: 'Create count session', auth: 'Required', permission: 'inventory:count:create' },
      { method: 'POST', path: '/api/v1/stock-counts/:id/post', description: 'Post adjustments', auth: 'Required', permission: 'inventory:count:post' },
    ],
  },
  {
    name: 'Human Resources (HR)',
    endpoints: [
      { method: 'POST', path: '/api/v1/employees', description: 'Create employee', auth: 'Required', permission: 'hr:employee:create' },
      { method: 'GET', path: '/api/v1/employees', description: 'List employees', auth: 'Required', permission: 'hr:employee:read' },
      { method: 'POST', path: '/api/v1/employees/:id/resign', description: 'Record resignation', auth: 'Required', permission: 'hr:employee:resign' },
      { method: 'POST', path: '/api/v1/departments', description: 'Create department', auth: 'Required', permission: 'hr:department:create' },
      { method: 'GET', path: '/api/v1/departments/tree', description: 'Organization hierarchy', auth: 'Required', permission: 'hr:department:read' },
      { method: 'POST', path: '/api/v1/positions', description: 'Create position', auth: 'Required', permission: 'hr:position:create' },
    ],
  },
  {
    name: 'Payroll & Leave',
    endpoints: [
      { method: 'POST', path: '/api/v1/payroll-runs', description: 'Create payroll run', auth: 'Required', permission: 'hr:payroll:create' },
      { method: 'POST', path: '/api/v1/payroll-runs/:id/calculate', description: 'Calculate payroll', auth: 'Required', permission: 'hr:payroll:create' },
      { method: 'POST', path: '/api/v1/payroll-runs/:id/approve', description: 'Approve payroll', auth: 'Required', permission: 'hr:payroll:approve' },
      { method: 'POST', path: '/api/v1/payroll-runs/:id/pay', description: 'Mark as paid', auth: 'Required', permission: 'hr:payroll:pay' },
      { method: 'POST', path: '/api/v1/leave-requests', description: 'Create leave request', auth: 'Required', permission: 'hr:leave:request:create' },
      { method: 'POST', path: '/api/v1/leave-requests/:id/approve', description: 'Approve leave', auth: 'Required', permission: 'hr:leave:request:approve' },
      { method: 'POST', path: '/api/v1/attendance/clock-in', description: 'Clock in', auth: 'Required', permission: 'hr:attendance:create' },
      { method: 'POST', path: '/api/v1/attendance/clock-out', description: 'Clock out', auth: 'Required', permission: 'hr:attendance:create' },
    ],
  },
  {
    name: 'Tax & WHT',
    endpoints: [
      { method: 'GET', path: '/api/v1/tax-rates', description: 'List tax rates', auth: 'Required' },
      { method: 'POST', path: '/api/v1/wht-certificates', description: 'Create WHT certificate', auth: 'Required', permission: 'fi:wht:create' },
      { method: 'GET', path: '/api/v1/wht-certificates', description: 'List certificates', auth: 'Required', permission: 'fi:wht:read' },
      { method: 'POST', path: '/api/v1/wht-certificates/:id/issue', description: 'Issue certificate', auth: 'Required', permission: 'fi:wht:issue' },
      { method: 'POST', path: '/api/v1/wht/annual-certificate', description: 'Generate 50 ทวิ', auth: 'Required', permission: 'fi:wht:read' },
    ],
  },
  {
    name: 'Fixed Assets & Banking',
    endpoints: [
      { method: 'POST', path: '/api/v1/fixed-assets', description: 'Register asset', auth: 'Required', permission: 'fi:asset:create' },
      { method: 'POST', path: '/api/v1/fixed-assets/:id/depreciate', description: 'Run depreciation', auth: 'Required', permission: 'fi:asset:depreciate' },
      { method: 'POST', path: '/api/v1/fixed-assets/:id/dispose', description: 'Dispose asset', auth: 'Required', permission: 'fi:asset:dispose' },
      { method: 'POST', path: '/api/v1/bank-accounts', description: 'Create bank account', auth: 'Required', permission: 'fi:bank:create' },
      { method: 'GET', path: '/api/v1/bank-accounts', description: 'List bank accounts', auth: 'Required', permission: 'fi:bank:read' },
      { method: 'POST', path: '/api/v1/bank-accounts/:id/import', description: 'Import CSV statement', auth: 'Required', permission: 'fi:bank:import' },
      { method: 'POST', path: '/api/v1/bank-transactions/:id/reconcile', description: 'Match to JE', auth: 'Required', permission: 'fi:bank:reconcile' },
    ],
  },
  {
    name: 'Multi-Currency & Multi-Company',
    endpoints: [
      { method: 'POST', path: '/api/v1/currencies', description: 'Create currency', auth: 'Required', permission: 'fi:currency:create' },
      { method: 'GET', path: '/api/v1/currencies', description: 'List currencies', auth: 'Required', permission: 'fi:currency:read' },
      { method: 'POST', path: '/api/v1/exchange-rates', description: 'Add exchange rate', auth: 'Required', permission: 'fi:currency:create' },
      { method: 'GET', path: '/api/v1/exchange-rates/convert', description: 'Get rate for conversion', auth: 'Required', permission: 'fi:currency:read' },
      { method: 'POST', path: '/api/v1/gl/fx-revaluation', description: 'FX revaluation', auth: 'Required', permission: 'gl:journal:create' },
      { method: 'POST', path: '/api/v1/companies', description: 'Create company', auth: 'Required', permission: 'company:create' },
      { method: 'GET', path: '/api/v1/companies', description: 'List companies', auth: 'Required', permission: 'company:read' },
      { method: 'POST', path: '/api/v1/companies/ic-transaction', description: 'Intercompany transaction', auth: 'Required', permission: 'gl:journal:create' },
    ],
  },
  {
    name: 'Approvals',
    endpoints: [
      { method: 'POST', path: '/api/v1/approval-workflows', description: 'Create workflow', auth: 'Required', permission: 'approval:workflow:create' },
      { method: 'POST', path: '/api/v1/approvals/submit', description: 'Submit for approval', auth: 'Required', permission: 'approval:action' },
      { method: 'POST', path: '/api/v1/approvals/:id/approve', description: 'Approve', auth: 'Required', permission: 'approval:action' },
      { method: 'POST', path: '/api/v1/approvals/:id/reject', description: 'Reject', auth: 'Required', permission: 'approval:action' },
      { method: 'POST', path: '/api/v1/approvals/:id/delegate', description: 'Delegate', auth: 'Required', permission: 'approval:action' },
    ],
  },
  {
    name: 'Reports & Dashboard',
    endpoints: [
      { method: 'GET', path: '/api/v1/reports/balance-sheet', description: 'Balance sheet', auth: 'Required' },
      { method: 'GET', path: '/api/v1/reports/income-statement', description: 'Income statement', auth: 'Required' },
      { method: 'GET', path: '/api/v1/reports/trial-balance', description: 'Trial balance', auth: 'Required' },
      { method: 'GET', path: '/api/v1/reports/cash-flow', description: 'Cash flow statement', auth: 'Required' },
      { method: 'GET', path: '/api/v1/reports/ar-aging', description: 'AR aging', auth: 'Required' },
      { method: 'GET', path: '/api/v1/reports/ap-aging', description: 'AP aging', auth: 'Required' },
      { method: 'GET', path: '/api/v1/reports/consolidated', description: 'Consolidated report', auth: 'Required', permission: 'report:gl:read' },
      { method: 'GET', path: '/api/v1/dashboard/summary', description: 'Executive dashboard', auth: 'Required' },
      { method: 'POST', path: '/api/v1/month-end/close', description: 'Close period', auth: 'Required' },
    ],
  },
  {
    name: 'AI Agents',
    endpoints: [
      { method: 'POST', path: '/api/v1/ai/anomaly-scan', description: 'Run anomaly detection', auth: 'Required', permission: 'report:gl:read' },
      { method: 'GET', path: '/api/v1/ai/cash-forecast', description: 'Cash flow forecast', auth: 'Required', permission: 'report:gl:read' },
      { method: 'POST', path: '/api/v1/ai/categorize', description: 'Smart categorization', auth: 'Required', permission: 'ai:categorize:execute' },
      { method: 'POST', path: '/api/v1/ai/bank-reconcile/:id', description: 'Auto bank reconciliation', auth: 'Required', permission: 'fi:bank:reconcile' },
      { method: 'POST', path: '/api/v1/ai/parse-document', description: 'NLP document parser', auth: 'Required', permission: 'ai:parse:execute' },
      { method: 'GET', path: '/api/v1/ai/predictions', description: 'Predictive analytics', auth: 'Required', permission: 'report:gl:read' },
    ],
  },
  {
    name: 'Audit, PDPA & Webhooks',
    endpoints: [
      { method: 'GET', path: '/api/v1/audit-logs', description: 'List audit trail', auth: 'Required' },
      { method: 'POST', path: '/api/v1/pdpa/consents', description: 'Assign consent', auth: 'Required' },
      { method: 'POST', path: '/api/v1/pdpa/consents/withdraw', description: 'Withdraw consent', auth: 'Required' },
      { method: 'POST', path: '/api/v1/webhooks', description: 'Register webhook', auth: 'Required', permission: 'webhook:create' },
      { method: 'GET', path: '/api/v1/webhooks', description: 'List webhooks', auth: 'Required', permission: 'webhook:read' },
      { method: 'GET', path: '/api/v1/notifications', description: 'List notifications', auth: 'Required' },
      { method: 'POST', path: '/api/v1/notifications/read-all', description: 'Mark all as read', auth: 'Required' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
function MethodBadge({ method }: { method: string }) {
  return (
    <span className={`inline-block w-16 rounded px-2 py-0.5 text-center text-xs font-bold ${METHOD_COLORS[method] || ''}`}>
      {method}
    </span>
  );
}

function GroupSection({ group, filter }: { group: ApiGroup; filter: string }) {
  const [open, setOpen] = useState(true);
  const filtered = useMemo(() => {
    if (!filter) return group.endpoints;
    const q = filter.toLowerCase();
    return group.endpoints.filter(
      (e) =>
        e.path.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.method.toLowerCase().includes(q) ||
        (e.permission && e.permission.toLowerCase().includes(q)),
    );
  }, [group.endpoints, filter]);

  if (filtered.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-left font-semibold text-white hover:bg-slate-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
      >
        <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <span className="flex-1">{group.name}</span>
        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs dark:bg-gray-700">{filtered.length}</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="mt-1 overflow-x-auto rounded-lg border border-gray-400 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 border-b border-slate-300 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-900 dark:text-gray-300">Method</th>
                <th className="px-4 py-2 text-left font-medium text-gray-900 dark:text-gray-300">Endpoint</th>
                <th className="px-4 py-2 text-left font-medium text-gray-900 dark:text-gray-300">Description</th>
                <th className="px-4 py-2 text-left font-medium text-gray-900 dark:text-gray-300">Permission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300 dark:divide-gray-800">
              {filtered.map((ep) => (
                <tr key={`${ep.method}-${ep.path}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-2">
                    <MethodBadge method={ep.method} />
                  </td>
                  <td className="px-4 py-2">
                    <code className="font-mono text-xs text-black dark:text-white">{ep.path}</code>
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-950 dark:text-gray-200">{ep.description}</td>
                  <td className="px-4 py-2">
                    {ep.permission ? (
                      <code className="rounded bg-slate-100 border border-slate-300 px-1.5 py-0.5 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-400">
                        {ep.permission}
                      </code>
                    ) : (
                      <span className="text-xs text-gray-400">{ep.auth === 'None' ? 'Public' : '—'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ApiDocsPage() {
  const [search, setSearch] = useState('');

  const totalEndpoints = useMemo(() => API_GROUPS.reduce((sum, g) => sum + g.endpoints.length, 0), []);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-gray-400 p-4 lg:block dark:border-gray-700">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-900 dark:text-gray-400">
          Modules
        </p>
        <nav className="space-y-1">
          {API_GROUPS.map((g) => (
            <a
              key={g.name}
              href={`#api-${g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              className="block rounded px-2 py-1.5 text-sm text-gray-800 hover:bg-gray-200 hover:text-black dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              {g.name}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 px-6 py-8 lg:px-12">
        <nav className="mb-6 flex items-center gap-2 text-sm text-gray-900 dark:text-gray-400">
          <Link href="/docs" className="hover:text-gray-700 dark:hover:text-gray-200">Docs</Link>
          <span>/</span>
          <span className="text-black dark:text-white">API Reference</span>
        </nav>

        <h1 className="text-3xl font-bold text-black dark:text-white">API Reference</h1>
        <p className="mt-2 text-gray-950 dark:text-gray-200">
          REST API ฉบับสมบูรณ์ — {totalEndpoints}+ Endpoints | Base URL: <code className="rounded bg-slate-100 border border-slate-300 px-1 dark:bg-gray-700">/api/v1</code> | Version 0.9.0
        </p>

        {/* API Info */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-gray-400 p-3 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-700">Auth</p>
            <p className="text-sm text-black dark:text-white">JWT Bearer Token</p>
            <p className="text-xs text-gray-600">Access: 1h | Refresh: 30d</p>
          </div>
          <div className="rounded-lg border border-gray-400 p-3 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-700">Rate Limit</p>
            <p className="text-sm text-black dark:text-white">300 req/min (prod)</p>
            <p className="text-xs text-gray-600">10,000 req/min (dev)</p>
          </div>
          <div className="rounded-lg border border-gray-400 p-3 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-700">Monetary Values</p>
            <p className="text-sm text-black dark:text-white">Satang (bigint/string)</p>
            <p className="text-xs text-gray-600">100 satang = 1 THB</p>
          </div>
          <div className="rounded-lg border border-gray-400 p-3 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-700">Error Format</p>
            <p className="text-sm text-black dark:text-white">RFC 7807</p>
            <p className="text-xs text-gray-600">Problem Details</p>
          </div>
        </div>

        {/* Method Legend */}
        <div className="mt-4 flex gap-3">
          {Object.entries(METHOD_COLORS).map(([method, color]) => (
            <span key={method} className={`rounded px-2 py-0.5 text-xs font-bold ${color}`}>
              {method}
            </span>
          ))}
        </div>

        {/* Search */}
        <div className="relative mt-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search endpoints... (e.g. invoice, POST, payroll, gl:journal)"
            className="w-full rounded-lg border border-gray-400 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Endpoint Groups */}
        <div className="mt-6 space-y-4">
          {API_GROUPS.map((g) => (
            <div key={g.name} id={`api-${g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
              <GroupSection group={g} filter={search} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
