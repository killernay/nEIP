/**
 * Agent exports for @neip/ai.
 */
export { BaseAgent, AgentTrace, UnconfiguredLlmClient } from './base-agent.js';
export {
  InvoiceMatchingAgent,
  ConfidenceZone as InvoiceMatchingConfidenceZone,
} from './invoice-matching-agent.js';
export type {
  InvoiceMatchInput,
  InvoiceMatchOutput,
  InvoiceMatchCandidate,
  OutstandingInvoice,
  PaymentInfo,
} from './invoice-matching-agent.js';
export { MonthEndCloseAgent } from './month-end-close-agent.js';
export type {
  MonthEndCloseInput,
  MonthEndCloseOutput,
  ChecklistItem,
  ChecklistStatus,
  SuggestedJournalEntry,
  UnmatchedPayment,
  BalanceDiscrepancy,
  PeriodJournalEntry,
  AccountBalance,
  FixedAsset,
  AccrualItem,
} from './month-end-close-agent.js';

// Phase 6 agents
export { AnomalyDetectionAgent } from './anomaly-detection-agent.js';
export type {
  AnomalyScanInput,
  AnomalyScanOutput,
  AnomalyFinding,
  AnomalySeverity,
  AnomalyType,
  JournalEntryRecord,
} from './anomaly-detection-agent.js';

export { CashFlowForecastAgent } from './cash-flow-forecast-agent.js';
export type {
  CashFlowForecastInput,
  CashFlowForecastOutput,
  DailyProjection,
  ArAgingItem,
  ApAgingItem,
  RecurringJeItem,
} from './cash-flow-forecast-agent.js';

export { CategorizationAgent } from './categorization-agent.js';
export type {
  CategorizationInput,
  CategorizationOutput,
  CategorySuggestion,
  CategoryRule,
} from './categorization-agent.js';

export { BankReconAgent } from './bank-recon-agent.js';
export type {
  BankReconInput,
  BankReconOutput,
  BankTransaction,
  LedgerEntry,
  ReconMatch,
} from './bank-recon-agent.js';

export { DocumentParserAgent } from './document-parser-agent.js';
export type {
  DocumentParseInput,
  DocumentParseOutput,
  ExtractedField,
  ExtractedItem,
} from './document-parser-agent.js';

export { PredictiveAgent } from './predictive-agent.js';
export type {
  PredictiveInput,
  PredictiveOutput,
  PredictionType,
  HistoricalDataPoint,
  ForecastPoint,
  TrendLine,
} from './predictive-agent.js';
