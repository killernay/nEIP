/**
 * @neip/ai — AI/LLM integration layer for nEIP.
 *
 * Exports:
 *   Types      — confidence zones, agent result types, LLM interfaces
 *   Agents     — BaseAgent abstract class, AgentTrace, UnconfiguredLlmClient
 *   LLM        — LLM client factory and implementations
 *
 * Architecture references: AR11, FR17-FR23
 * Story: 5.2
 */

export const PACKAGE_NAME = '@neip/ai' as const;
export type AiPackageName = typeof PACKAGE_NAME;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export {
  ConfidenceZone,
  toConfidenceScore,
  classifyConfidence,
  isAgentSuccess,
  isAgentFailure,
} from './types/index.js';

export type {
  ConfidenceScore,
  AgentResult,
  AgentSuccess,
  AgentFailure,
  ToolDescriptor,
  ToolRegistry,
  AgentConfig,
  AgentContext,
  AgentStep,
  AgentStepKind,
  LlmMessage,
  LlmToolCall,
  LlmResponse,
  LlmClient,
  LlmCompletionOptions,
  MessageRole,
} from './types/index.js';

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------
export {
  BaseAgent,
  AgentTrace,
  UnconfiguredLlmClient,
  InvoiceMatchingAgent,
  MonthEndCloseAgent,
  AnomalyDetectionAgent,
  CashFlowForecastAgent,
  CategorizationAgent,
  BankReconAgent,
  DocumentParserAgent,
  PredictiveAgent,
} from './agents/index.js';

export type {
  InvoiceMatchInput,
  InvoiceMatchOutput,
  InvoiceMatchCandidate,
  OutstandingInvoice,
  PaymentInfo,
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
  // Phase 6 types
  AnomalyScanInput,
  AnomalyScanOutput,
  AnomalyFinding,
  CashFlowForecastInput,
  CashFlowForecastOutput,
  DailyProjection,
  CategorizationInput,
  CategorizationOutput,
  CategorySuggestion,
  BankReconInput,
  BankReconOutput,
  ReconMatch,
  DocumentParseInput,
  DocumentParseOutput,
  PredictiveInput,
  PredictiveOutput,
  ForecastPoint,
  TrendLine,
} from './agents/index.js';

// ---------------------------------------------------------------------------
// LLM client
// ---------------------------------------------------------------------------
export {
  ClaudeLlmClient,
  createLlmClient,
  createLlmClientSync,
  ANTHROPIC_PROVIDER,
  DEFAULT_CLAUDE_MODEL,
} from './llm/client.js';

export type { LlmClientConfig } from './llm/client.js';

// ---------------------------------------------------------------------------
// HITL queue (Story 5.4)
// ---------------------------------------------------------------------------
export {
  HitlService,
  InMemoryHitlStore,
  InMemoryHitlEventEmitter,
} from './hitl/hitl-service.js';

export type {
  HitlStatus,
  HitlSuggestedAction,
  HitlQueueItem,
  AddToQueueInput,
  HitlListFilters,
  HitlStore,
  HitlEventEmitter,
} from './hitl/hitl-service.js';

// ---------------------------------------------------------------------------
// AI Correction Learning (Story 5.5)
// ---------------------------------------------------------------------------
export {
  CorrectionTracker,
  InMemoryCorrectionStore,
  InMemoryCorrectionEventEmitter,
} from './learning/correction-tracker.js';

export type {
  HumanDecision,
  CorrectionRecord,
  RecordCorrectionInput,
  CorrectionMetrics,
  MetricsByZone,
  CorrectionStore,
  CorrectionEventEmitter,
} from './learning/correction-tracker.js';

// ---------------------------------------------------------------------------
// LLM Health & Degradation (Story 5.6)
// ---------------------------------------------------------------------------
export {
  LlmHealthMonitor,
  createDefaultHealthCheck,
} from './health/llm-health-monitor.js';

export type {
  LlmServiceStatus,
  LlmHealthReport,
  LlmHealthMonitorConfig,
  HealthCheckFn,
} from './health/llm-health-monitor.js';

export {
  DegradationHandler,
  InMemoryDegradationLogger,
} from './health/degradation-handler.js';

export type {
  DegradationStatus,
  DegradationEvent,
  DegradationLogger,
  DegradationHandlerConfig,
} from './health/degradation-handler.js';
