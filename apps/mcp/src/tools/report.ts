import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiCall } from '../api.js';

export function registerReportTools(server: McpServer): void {
  // ---------------------------------------------------------------------------
  // Tool: dashboard
  // ---------------------------------------------------------------------------

  server.tool(
    'dashboard',
    'ดูภาพรวมธุรกิจ — Executive dashboard with KPIs',
    {},
    async () => {
      try {
        const data = await apiCall<Record<string, unknown>>('GET', '/dashboard/executive');
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: report_trial_balance
  // ---------------------------------------------------------------------------

  server.tool(
    'report_trial_balance',
    'งบทดลอง — Trial balance report',
    {
      fiscalYear: z.number().optional().describe('Fiscal year e.g. 2026'),
    },
    async ({ fiscalYear }) => {
      try {
        const qs = fiscalYear ? `?fiscalYear=${fiscalYear}` : '';
        const data = await apiCall<Record<string, unknown>>('GET', `/reports/trial-balance${qs}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: report_pnl
  // ---------------------------------------------------------------------------

  server.tool(
    'report_pnl',
    'งบกำไรขาดทุน — P&L comparison (monthly/ytd/yoy/mom)',
    {
      mode: z.enum(['monthly', 'ytd', 'yoy', 'mom']).describe('Report mode'),
      fiscalYear: z.number().describe('Fiscal year'),
    },
    async ({ mode, fiscalYear }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('GET', `/reports/pnl-comparison?mode=${mode}&fiscalYear=${fiscalYear}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: report_income_statement
  // ---------------------------------------------------------------------------

  server.tool(
    'report_income_statement',
    'งบกำไรขาดทุน — Income statement report',
    {
      startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('End date (YYYY-MM-DD)'),
    },
    async ({ startDate, endDate }) => {
      try {
        const params: string[] = [];
        if (startDate) params.push(`startDate=${startDate}`);
        if (endDate) params.push(`endDate=${endDate}`);
        const qs = params.length > 0 ? `?${params.join('&')}` : '';
        const data = await apiCall<Record<string, unknown>>('GET', `/reports/income-statement${qs}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: report_balance_sheet
  // ---------------------------------------------------------------------------

  server.tool(
    'report_balance_sheet',
    'งบดุล — Balance sheet report',
    {
      asOf: z.string().optional().describe('As-of date (YYYY-MM-DD), defaults to today'),
    },
    async ({ asOf }) => {
      try {
        const qs = asOf ? `?asOf=${asOf}` : '';
        const data = await apiCall<Record<string, unknown>>('GET', `/reports/balance-sheet${qs}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: report_budget_variance
  // ---------------------------------------------------------------------------

  server.tool(
    'report_budget_variance',
    'รายงานงบประมาณเทียบจริง — Budget vs actual variance report',
    {
      year: z.number().optional().describe('Fiscal year (e.g. 2026)'),
      period: z.number().optional().describe('Fiscal period (1-12)'),
    },
    async ({ year, period }) => {
      try {
        const params: string[] = [];
        if (year) params.push(`year=${year}`);
        if (period) params.push(`period=${period}`);
        const qs = params.length > 0 ? `?${params.join('&')}` : '';
        const data = await apiCall<Record<string, unknown>>('GET', `/reports/budget-variance${qs}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: report_ar_aging
  // ---------------------------------------------------------------------------

  server.tool(
    'report_ar_aging',
    'รายงานอายุลูกหนี้ — Accounts receivable aging report',
    {
      asOf: z.string().optional().describe('As-of date (YYYY-MM-DD), defaults to today'),
    },
    async ({ asOf }) => {
      try {
        const qs = asOf ? `?asOf=${asOf}` : '';
        const data = await apiCall<Record<string, unknown>>('GET', `/reports/ar-aging${qs}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: report_ap_aging
  // ---------------------------------------------------------------------------

  server.tool(
    'report_ap_aging',
    'รายงานอายุเจ้าหนี้ — Accounts payable aging report',
    {
      asOf: z.string().optional().describe('As-of date (YYYY-MM-DD), defaults to today'),
    },
    async ({ asOf }) => {
      try {
        const qs = asOf ? `?asOf=${asOf}` : '';
        const data = await apiCall<Record<string, unknown>>('GET', `/reports/ap-aging${qs}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: audit_logs
  // ---------------------------------------------------------------------------

  server.tool(
    'audit_logs',
    'ดูบันทึกการเปลี่ยนแปลง — View audit trail',
    {
      limit: z.number().optional().default(20).describe('Max items'),
    },
    async ({ limit }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('GET', `/audit-logs?limit=${limit}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: generate_vat_return
  // ---------------------------------------------------------------------------

  server.tool(
    'generate_vat_return',
    'สร้างแบบ ภ.พ.30 — Generate VAT return report (ภ.พ.30)',
    {
      taxYear: z.number().describe('Tax year'),
      taxMonth: z.number().describe('Tax month (1-12)'),
    },
    async ({ taxYear, taxMonth }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('GET', `/reports/vat-return?taxYear=${taxYear}&taxMonth=${taxMonth}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: generate_ssc_filing
  // ---------------------------------------------------------------------------

  server.tool(
    'generate_ssc_filing',
    'สร้างแบบ สปส. — Generate social security contribution filing (สปส.1-10)',
    {
      year: z.number().describe('Year'),
      month: z.number().describe('Month (1-12)'),
    },
    async ({ year, month }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('GET', `/reports/ssc-filing?year=${year}&month=${month}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: generate_cash_flow
  // ---------------------------------------------------------------------------

  server.tool(
    'generate_cash_flow',
    'งบกระแสเงินสด — Generate cash flow statement',
    {
      startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('End date (YYYY-MM-DD)'),
    },
    async ({ startDate, endDate }) => {
      try {
        const params: string[] = [];
        if (startDate) params.push(`startDate=${startDate}`);
        if (endDate) params.push(`endDate=${endDate}`);
        const qs = params.length > 0 ? `?${params.join('&')}` : '';
        const data = await apiCall<Record<string, unknown>>('GET', `/reports/cash-flow${qs}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: run_anomaly_scan
  // ---------------------------------------------------------------------------

  server.tool(
    'run_anomaly_scan',
    'สแกนความผิดปกติ — Run AI anomaly detection scan on transactions',
    {
      scope: z.enum(['all', 'gl', 'ar', 'ap', 'payroll']).optional().default('all').describe('Scan scope'),
      startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('End date (YYYY-MM-DD)'),
    },
    async ({ scope, startDate, endDate }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/ai/anomaly-scan', {
          scope, startDate, endDate,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: run_cash_forecast
  // ---------------------------------------------------------------------------

  server.tool(
    'run_cash_forecast',
    'พยากรณ์กระแสเงินสด — Run AI cash flow forecast',
    {
      horizonDays: z.number().optional().default(30).describe('Forecast horizon in days'),
    },
    async ({ horizonDays }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/ai/cash-forecast', {
          horizonDays,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: categorize_transaction
  // ---------------------------------------------------------------------------

  server.tool(
    'categorize_transaction',
    'จัดหมวดหมู่รายการ — AI-categorize a bank transaction',
    {
      description: z.string().describe('Transaction description'),
      amountSatang: z.string().describe('Amount in satang'),
      bankAccountId: z.string().optional().describe('Bank account ID'),
    },
    async ({ description, amountSatang, bankAccountId }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/ai/categorize', {
          description, amountSatang, bankAccountId,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Tool: generate_predictions
  // ---------------------------------------------------------------------------

  server.tool(
    'generate_predictions',
    'สร้างการพยากรณ์ — Generate AI predictions (revenue, expenses, etc.)',
    {
      metric: z.enum(['revenue', 'expenses', 'profit', 'cash_balance', 'ar_collections']).describe('Metric to predict'),
      horizonMonths: z.number().optional().default(3).describe('Prediction horizon in months'),
    },
    async ({ metric, horizonMonths }) => {
      try {
        const data = await apiCall<Record<string, unknown>>('POST', '/ai/predictions', {
          metric, horizonMonths,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
      }
    },
  );
}
