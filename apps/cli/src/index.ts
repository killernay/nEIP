#!/usr/bin/env node
/**
 * neip — nEIP CLI entry point.
 *
 * Command structure:
 *   neip auth login / logout
 *   neip whoami
 *   neip config set/get/list/unset
 *   neip org create/list/switch
 *   neip gl journal create/list/post
 *   neip gl accounts list/create
 *   neip ar invoice create/list/void
 *   neip ar payment create/list
 *   neip ap bill list/create/get/post/void
 *   neip ap payment list/create
 *   neip reports balance-sheet/income-statement/trial-balance/budget-variance/equity-changes/ar-aging/ap-aging
 *   neip tax list/create/update/delete
 *   neip import upload/preview/status
 *   neip export run <type>
 *   neip dashboard [consolidated]
 *   neip month-end close/status
 *   neip firm clients list/add/remove
 *   neip webhooks list/create/delete
 *   neip roles list/create/update/delete
 *   neip users invite
 *   neip notifications list/settings[/update]
 *   neip settings get/update/ai
 *   neip fiscal years[/create] / period close/reopen
 *   neip budgets list/create/update
 *   neip vendors list/create/update
 *   neip audit list / search
 *   neip recurring-je list/create/run
 *   neip pricing list/create/resolve
 *   neip payment-terms list/create
 *   neip dunning run/list
 *   neip credit check <contactId>
 *   neip pr list/create/approve/reject/convert
 *   neip rfq list/create/send/compare/select
 *   neip stock-count list/create/post
 *   neip attendance clock-in/clock-out/summary
 *   neip positions list/create/org-tree
 *   neip currency list/create/rate/convert
 *   neip company list/create/switch
 *   neip approval list/approve/reject/delegate
 *   neip batch list/create/trace
 *   neip pdpa access-request/erasure-request
 *   neip ai anomaly-scan/forecast/categorize/predict
 *
 * Global flags:
 *   --format <table|json>   Output format (default: table)
 *   --dry-run               Preview mutation without making any API call
 *   --explain               Print double-entry breakdown before executing
 *   --version               Print CLI version and exit
 *   --help                  Print help and exit
 */

import { createRequire } from 'node:module';
import { Command } from 'commander';
import { buildAuthCommand, buildWhoamiCommand } from './commands/auth.js';
import { buildConfigCommand } from './commands/config.js';
import { buildArCommand } from './commands/ar/index.js';
import { buildApCommand } from './commands/ap/index.js';
import { buildGlCommand } from './commands/gl/index.js';
import { buildOrgCommand } from './commands/org.js';
import { buildReportsCommand } from './commands/reports.js';
import { buildTaxCommand } from './commands/tax.js';
import { buildImportCommand } from './commands/import.js';
import { buildExportCommand } from './commands/export.js';
import { buildDashboardCommand } from './commands/dashboard.js';
import { buildMonthEndCommand } from './commands/month-end.js';
import { buildFirmCommand } from './commands/firm.js';
import { buildWebhooksCommand } from './commands/webhooks.js';
import { buildRolesCommand } from './commands/roles.js';
import { buildUsersCommand } from './commands/users.js';
import { buildNotificationsCommand } from './commands/notifications.js';
import { buildSettingsCommand } from './commands/settings.js';
import { buildFiscalCommand } from './commands/fiscal.js';
import { buildBudgetsCommand } from './commands/budgets.js';
import { buildVendorsCommand } from './commands/vendors.js';
import { buildAuditCommand } from './commands/audit.js';
import { buildQuotationsCommand } from './commands/quotations.js';
import { buildAssetsCommand } from './commands/assets.js';
import { buildBankCommand } from './commands/bank.js';
import { buildWhtCommand } from './commands/wht.js';
import { buildCostCentersCommand } from './commands/cost-centers.js';
import { buildProfitCentersCommand } from './commands/profit-centers.js';
import { buildProductsCommand, buildInventoryCommand } from './commands/inventory.js';
import { buildContactsCommand } from './commands/contacts.js';
import { buildEmployeesCommand, buildDepartmentsCommand } from './commands/employees.js';
import { buildPayrollCommand } from './commands/payroll.js';
import { buildLeaveCommand } from './commands/leave.js';
import { buildRecurringJeCommand } from './commands/recurring-je.js';
import { buildPricingCommand } from './commands/pricing.js';
import { buildPaymentTermsCommand } from './commands/payment-terms.js';
import { buildDunningCommand } from './commands/dunning.js';
import { buildCreditCommand } from './commands/credit.js';
import { buildPurchaseRequisitionsCommand } from './commands/purchase-requisitions.js';
import { buildRfqCommand } from './commands/rfq.js';
import { buildStockCountCommand } from './commands/stock-count.js';
import { buildAttendanceCommand } from './commands/attendance.js';
import { buildPositionsCommand } from './commands/positions.js';
import { buildCurrencyCommand } from './commands/currencies.js';
import { buildCompanyCommand } from './commands/companies.js';
import { buildApprovalCommand } from './commands/approvals.js';
import { buildBatchCommand } from './commands/batches.js';
import { buildPdpaCommand } from './commands/pdpa.js';
import { buildAiCommand } from './commands/ai.js';
import { ApiError } from './lib/api-client.js';
import { type OutputFormat, printError, setFormat } from './output/formatter.js';

// ---------------------------------------------------------------------------
// Version — resolved from package.json at runtime (CJS require shim for ESM)
// ---------------------------------------------------------------------------

const require = createRequire(import.meta.url);

interface PackageJson {
  version: string;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pkg = require('../package.json') as PackageJson;

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------

/**
 * Top-level error handler — wraps every async command action.
 * Surfaces ApiError details, generic errors, and unexpected values cleanly.
 */
function handleError(err: unknown): never {
  if (err instanceof ApiError) {
    printError(err.detail, err.status);
  } else if (err instanceof Error) {
    printError(err.message);
  } else {
    printError('An unexpected error occurred.');
  }
  process.exit(1);
}

// Catch unhandled promise rejections from synchronous commander actions that
// accidentally return a rejected promise.
process.on('unhandledRejection', (reason) => {
  handleError(reason);
});

// ---------------------------------------------------------------------------
// Program setup
// ---------------------------------------------------------------------------

const program = new Command();

program
  .name('neip')
  .description(
    'neip — AI-Native ERP สำหรับ SME ไทย\n' +
    'neip — AI-Native ERP for Thai SMEs\n\n' +
    'ระบบบัญชีและ ERP ครบวงจร รองรับมาตรฐานภาษีไทย\n' +
    'Full-featured accounting & ERP system with Thai tax compliance.',
  )
  .addHelpText('after', `
Examples:
  $ neip auth login                        # เข้าสู่ระบบ — Log in
  $ neip whoami                            # ดูผู้ใช้ปัจจุบัน — Show current user
  $ neip org list                          # ดูองค์กร — Show organisation
  $ neip gl accounts list                  # ดูผังบัญชี — Chart of accounts
  $ neip gl journal create                 # สร้างรายการบัญชี — Create journal entry
  $ neip ar invoice create                 # สร้างใบแจ้งหนี้ — Create AR invoice
  $ neip ar payment create                 # บันทึกการรับชำระ — Record customer payment
  $ neip ap bill create                    # สร้างบิลค่าใช้จ่าย — Create vendor bill
  $ neip ap payment create                 # บันทึกการจ่ายชำระ — Record vendor payment
  $ neip quotations create                 # สร้างใบเสนอราคา — Create quotation
  $ neip reports trial-balance             # งบทดลอง — Trial balance
  $ neip reports balance-sheet             # งบดุล — Balance sheet
  $ neip reports income-statement          # งบกำไรขาดทุน — Income statement
  $ neip reports pnl --mode monthly --fiscal-year 2026  # กำไรขาดทุนรายเดือน
  $ neip tax list                          # ดูอัตราภาษี — Tax rates
  $ neip wht list                          # ใบหัก ณ ที่จ่าย — WHT certificates
  $ neip dashboard                         # แดชบอร์ด — Executive dashboard
  $ neip assets list                       # สินทรัพย์ถาวร — Fixed assets
  $ neip bank list                         # บัญชีธนาคาร — Bank accounts
  $ neip payroll list                      # รายการเงินเดือน — Payroll runs
  $ neip inventory levels                  # ระดับสต็อก — Stock levels

Global flags:
  --format <table|json>    รูปแบบผลลัพธ์ — Output format (default: table)
  --dry-run                ดูตัวอย่างโดยไม่บันทึก — Preview without saving
  --explain                แสดง debit/credit ก่อนบันทึก — Show accounting breakdown
  -v, --version            แสดงเวอร์ชั่น — Print version
  `)
  .version(pkg.version, '-v, --version', 'Print CLI version')
  .option(
    '--format <format>',
    'Output format: table (human-readable) or json (machine-readable)',
    'table',
  )
  // Story 6.3 — global mutation-control flags available to every command
  .option(
    '--dry-run',
    'Preview what a mutation command would do without making any API call',
    false,
  )
  .option(
    '--explain',
    'Print a double-entry debit/credit breakdown before executing a mutation',
    false,
  );

// Apply the global --format flag before any command action runs
program.hook('preAction', (thisCommand) => {
  const opts = thisCommand.optsWithGlobals() as { format?: string };
  const fmt = opts.format ?? 'table';
  const validFormats: OutputFormat[] = ['table', 'json'];
  if (!validFormats.includes(fmt as OutputFormat)) {
    printError(`Invalid format "${fmt}". Allowed values: table, json`);
    process.exit(1);
  }
  setFormat(fmt as OutputFormat);
});

// ---------------------------------------------------------------------------
// Register sub-commands
// ---------------------------------------------------------------------------

program.addCommand(buildAuthCommand());
program.addCommand(buildWhoamiCommand());
program.addCommand(buildConfigCommand());
program.addCommand(buildOrgCommand());
program.addCommand(buildGlCommand());
program.addCommand(buildArCommand());
program.addCommand(buildQuotationsCommand());
program.addCommand(buildApCommand());
program.addCommand(buildReportsCommand());
program.addCommand(buildTaxCommand());
program.addCommand(buildImportCommand());
program.addCommand(buildExportCommand());
program.addCommand(buildDashboardCommand());
program.addCommand(buildMonthEndCommand());
program.addCommand(buildFirmCommand());
program.addCommand(buildWebhooksCommand());
program.addCommand(buildRolesCommand());
program.addCommand(buildUsersCommand());
program.addCommand(buildNotificationsCommand());
program.addCommand(buildSettingsCommand());
program.addCommand(buildFiscalCommand());
program.addCommand(buildBudgetsCommand());
program.addCommand(buildVendorsCommand());
program.addCommand(buildAuditCommand());
program.addCommand(buildAssetsCommand());
program.addCommand(buildBankCommand());
program.addCommand(buildWhtCommand());
program.addCommand(buildCostCentersCommand());
program.addCommand(buildProfitCentersCommand());
program.addCommand(buildProductsCommand());
program.addCommand(buildInventoryCommand());
program.addCommand(buildContactsCommand());
program.addCommand(buildEmployeesCommand());
program.addCommand(buildDepartmentsCommand());
program.addCommand(buildPayrollCommand());
program.addCommand(buildLeaveCommand());

// Phase 1-6: New feature commands
program.addCommand(buildRecurringJeCommand());
program.addCommand(buildPricingCommand());
program.addCommand(buildPaymentTermsCommand());
program.addCommand(buildDunningCommand());
program.addCommand(buildCreditCommand());
program.addCommand(buildPurchaseRequisitionsCommand());
program.addCommand(buildRfqCommand());
program.addCommand(buildStockCountCommand());
program.addCommand(buildAttendanceCommand());
program.addCommand(buildPositionsCommand());
program.addCommand(buildCurrencyCommand());
program.addCommand(buildCompanyCommand());
program.addCommand(buildApprovalCommand());
program.addCommand(buildBatchCommand());
program.addCommand(buildPdpaCommand());
program.addCommand(buildAiCommand());

// ---------------------------------------------------------------------------
// Parse and run
// ---------------------------------------------------------------------------

try {
  await program.parseAsync(process.argv);
} catch (err) {
  handleError(err);
}
