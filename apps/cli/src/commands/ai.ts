/**
 * neip ai — AI-powered analysis commands.
 *
 * Commands:
 *   neip ai anomaly-scan          — POST /api/v1/ai/anomaly-scan
 *   neip ai forecast              — GET  /api/v1/ai/cash-flow-forecast
 *   neip ai categorize            — POST /api/v1/ai/categorize
 *   neip ai predict               — GET  /api/v1/ai/predict
 */

import { Command } from 'commander';
import { api } from '../lib/api-client.js';
import { printError, printSuccess } from '../output/formatter.js';

export function buildAiCommand(): Command {
  const cmd = new Command('ai')
    .description('AI วิเคราะห์อัจฉริยะ — AI-powered analysis and predictions')
    .addHelpText('after', `
Examples:
  $ neip ai anomaly-scan --period 2026-03         # ตรวจจับรายการผิดปกติ
  $ neip ai forecast --days 30                    # พยากรณ์กระแสเงินสด
  $ neip ai categorize "ค่าน้ำมันรถบริษัท"         # จัดหมวดหมู่อัตโนมัติ
  $ neip ai predict --type revenue --months 6     # พยากรณ์รายได้
  `);

  cmd.command('anomaly-scan')
    .description('ตรวจจับรายการบัญชีผิดปกติ — Scan for accounting anomalies')
    .requiredOption('--period <period>', 'งวดที่ตรวจสอบ (YYYY-MM) — Period to scan')
    .option('--threshold <threshold>', 'ค่า threshold (0-1) — Sensitivity threshold', '0.8')
    .action(async (opts: { period: string; threshold: string }) => {
      const result = await api.post<{ data: unknown }>('/api/v1/ai/anomaly-scan', {
        period: opts.period,
        threshold: parseFloat(opts.threshold),
      });
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, `Anomaly scan for ${opts.period}:`);
    });

  cmd.command('forecast')
    .description('พยากรณ์กระแสเงินสด — Cash flow forecast')
    .option('--days <days>', 'จำนวนวันที่พยากรณ์ — Forecast horizon in days', '30')
    .action(async (opts: { days: string }) => {
      const result = await api.get<{ data: unknown }>('/api/v1/ai/cash-flow-forecast', { days: opts.days });
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, `Cash flow forecast (${opts.days} days):`);
    });

  cmd.command('categorize <description>')
    .description('จัดหมวดหมู่อัตโนมัติ — Smart categorize a transaction description')
    .action(async (description: string) => {
      const result = await api.post<{ data: unknown }>('/api/v1/ai/categorize', { description });
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, 'Categorization result:');
    });

  cmd.command('predict')
    .description('พยากรณ์แนวโน้ม — Predictive analytics')
    .requiredOption('--type <type>', 'ประเภท: revenue/expense/cashflow — Prediction type')
    .option('--months <months>', 'จำนวนเดือนที่พยากรณ์ — Months to predict', '6')
    .action(async (opts: { type: string; months: string }) => {
      const result = await api.get<{ data: unknown }>('/api/v1/ai/predict', {
        type: opts.type,
        months: opts.months,
      });
      if (!result.ok) { printError(result.error.detail, result.error.status); process.exit(1); }
      printSuccess(result.data.data, `${opts.type} prediction (${opts.months} months):`);
    });

  return cmd;
}
