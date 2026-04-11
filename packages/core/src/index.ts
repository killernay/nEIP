// Core business logic
export const PACKAGE_NAME = '@neip/core' as const;

export type CorePackageName = typeof PACKAGE_NAME;

// Money Value Object (Story 2.1 — AR18)
export { Money } from './money/index.js';

// Tool Registry (Story 2.2 — AR15)
export { ToolRegistry } from './tool-registry/index.js';
export type { ExecutionContext, ToolDefinition } from './tool-registry/index.js';

// Event Store (Story 2.3 — AR16)
export { EventStore } from './events/index.js';
export type { AppendEventInput } from './events/index.js';

// General Ledger (Stories 2.4, 2.5, 2.6, 2.7)
export {
  createChartOfAccountsTools,
  createJournalEntryTools,
  DocumentNumberingService,
  formatDocumentNumber,
  nextDocNumber,
  createFiscalPeriodTools,
} from './gl/index.js';
export type {
  AccountOutput,
  JournalEntryOutput,
  JournalEntryLineOutput,
  DocType,
  FiscalYearOutput,
  FiscalPeriodOutput,
} from './gl/index.js';

// Audit Trail (Story 2.8)
export { AuditService, withAuditLogging } from './audit/index.js';
export type {
  AuditLogInput,
  AuditLogOutput,
  AuditChanges,
  AuditLogQuery,
} from './audit/index.js';

// Import Engine (Story 8.1)
export { processImport, previewImport, autoMapColumns } from './import/index.js';
export type { ImportResult, ImportRowError, ImportOptions } from './import/index.js';
export {
  journalEntryRowSchema,
  chartOfAccountsRowSchema,
  contactRowSchema,
  IMPORT_TYPES,
  COLUMN_ALIASES,
} from './import/index.js';
export type {
  JournalEntryRow,
  ChartOfAccountsRow,
  ContactRow,
  ImportType,
} from './import/index.js';

// Notification Service (Story 14.1)
export { NotificationService, shouldSendNotification } from './notifications/index.js';
export type {
  NotificationChannel,
  NotificationEventType,
  NotificationTemplate,
  UserPreferences as NotificationUserPreferences,
  SendNotificationInput,
  SendResult,
  SmtpConfig,
} from './notifications/index.js';

// Accounts Payable (Stories 10.1, 10.2)
export {
  createBillTools,
  createBillPaymentTools,
} from './ap/index.js';
export type {
  BillOutput,
  BillLineItemOutput,
  BillPaymentOutput,
} from './ap/index.js';

// Export Engine (Story 8.3)
export { exportToCsv, exportToExcel } from './export/index.js';
export type {
  ExportColumn,
  ExportOptions,
  ExportResult,
} from './export/index.js';

// Webhooks (Story 13.1)
export { WebhookService } from './webhooks/index.js';
export type {
  WebhookInput,
  WebhookOutput,
  DeliveryResult,
} from './webhooks/index.js';
export {
  computeSignature,
  verifySignature,
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
  MAX_DELIVERY_ATTEMPTS,
} from './webhooks/index.js';

// Event Replay — NPAEs/PAEs (Story 13.3)
export { replay } from './events/index.js';
export type { ReplayResult, AccountBalance } from './events/index.js';
export {
  NPAES_RULES,
  PAES_RULES,
  getDefaultRules,
} from './events/index.js';
export type {
  AccountingStandard,
  MaterializedEntry,
  RuleContext,
  Rule,
  InterpretationRules,
} from './events/index.js';
