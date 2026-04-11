/**
 * permissions.ts — All MVP-α permission constants.
 *
 * Permissions follow a `<module>:<resource>:<action>` naming convention
 * so they can be grouped and matched by prefix.
 *
 * Architecture references:
 *   AR22 — Custom table-based RBAC
 *   FR36  — Role-based access control
 *   FR37  — Permission enforcement on all API routes
 *
 * Default role assignments:
 *
 *   Owner      → ALL permissions
 *   Accountant → GL + AR + AP + reporting permissions
 *   Approver   → HITL view + approve/reject permissions
 */

// ---------------------------------------------------------------------------
// General Ledger (GL)
// ---------------------------------------------------------------------------

export const GL_JOURNAL_CREATE = 'gl:journal:create' as const;
export const GL_JOURNAL_READ = 'gl:journal:read' as const;
export const GL_JOURNAL_UPDATE = 'gl:journal:update' as const;
export const GL_JOURNAL_DELETE = 'gl:journal:delete' as const;
export const GL_JOURNAL_POST = 'gl:journal:post' as const;
export const GL_JOURNAL_REVERSE = 'gl:journal:reverse' as const;
export const GL_ACCOUNT_CREATE = 'gl:account:create' as const;
export const GL_ACCOUNT_READ = 'gl:account:read' as const;
export const GL_ACCOUNT_UPDATE = 'gl:account:update' as const;
export const GL_ACCOUNT_DELETE = 'gl:account:delete' as const;
export const GL_PERIOD_CLOSE = 'gl:period:close' as const;
export const GL_PERIOD_READ = 'gl:period:read' as const;

// ---------------------------------------------------------------------------
// Accounts Receivable (AR)
// ---------------------------------------------------------------------------

export const AR_INVOICE_CREATE = 'ar:invoice:create' as const;
export const AR_INVOICE_READ = 'ar:invoice:read' as const;
export const AR_INVOICE_UPDATE = 'ar:invoice:update' as const;
export const AR_INVOICE_DELETE = 'ar:invoice:delete' as const;
export const AR_INVOICE_SEND = 'ar:invoice:send' as const;
export const AR_INVOICE_VOID = 'ar:invoice:void' as const;

// Quotations (ใบเสนอราคา)
export const AR_QUOTATION_CREATE = 'ar:quotation:create' as const;
export const AR_QUOTATION_READ = 'ar:quotation:read' as const;
export const AR_QUOTATION_UPDATE = 'ar:quotation:update' as const;
export const AR_QUOTATION_SEND = 'ar:quotation:send' as const;
export const AR_QUOTATION_APPROVE = 'ar:quotation:approve' as const;
export const AR_QUOTATION_CONVERT = 'ar:quotation:convert' as const;

// Sales Order (ใบสั่งขาย / SO)
export const AR_SO_CREATE = 'ar:so:create' as const;
export const AR_SO_READ = 'ar:so:read' as const;
export const AR_SO_UPDATE = 'ar:so:update' as const;
export const AR_SO_CONFIRM = 'ar:so:confirm' as const;

// Delivery Order (ใบส่งของ / DO)
export const AR_DO_CREATE = 'ar:do:create' as const;
export const AR_DO_READ = 'ar:do:read' as const;
export const AR_DO_DELIVER = 'ar:do:deliver' as const;

// Receipt (ใบเสร็จรับเงิน)
export const AR_RECEIPT_CREATE = 'ar:receipt:create' as const;
export const AR_RECEIPT_READ = 'ar:receipt:read' as const;
export const AR_RECEIPT_VOID = 'ar:receipt:void' as const;

// Credit Note (ใบลดหนี้ / CN)
export const AR_CN_CREATE = 'ar:cn:create' as const;
export const AR_CN_READ = 'ar:cn:read' as const;
export const AR_CN_ISSUE = 'ar:cn:issue' as const;
export const AR_CN_VOID = 'ar:cn:void' as const;

export const AR_PAYMENT_CREATE = 'ar:payment:create' as const;
export const AR_PAYMENT_READ = 'ar:payment:read' as const;
export const AR_PAYMENT_UPDATE = 'ar:payment:update' as const;
export const AR_CUSTOMER_CREATE = 'ar:customer:create' as const;
export const AR_CUSTOMER_READ = 'ar:customer:read' as const;
export const AR_CUSTOMER_UPDATE = 'ar:customer:update' as const;
export const AR_CUSTOMER_DELETE = 'ar:customer:delete' as const;

// ---------------------------------------------------------------------------
// Accounts Payable (AP)
// ---------------------------------------------------------------------------

export const AP_BILL_CREATE = 'ap:bill:create' as const;
export const AP_BILL_READ = 'ap:bill:read' as const;
export const AP_BILL_UPDATE = 'ap:bill:update' as const;
export const AP_BILL_DELETE = 'ap:bill:delete' as const;
export const AP_BILL_APPROVE = 'ap:bill:approve' as const;
export const AP_PAYMENT_CREATE = 'ap:payment:create' as const;
export const AP_PAYMENT_READ = 'ap:payment:read' as const;
export const AP_PAYMENT_UPDATE = 'ap:payment:update' as const;
export const AP_VENDOR_CREATE = 'ap:vendor:create' as const;
export const AP_VENDOR_READ = 'ap:vendor:read' as const;
export const AP_VENDOR_UPDATE = 'ap:vendor:update' as const;
export const AP_VENDOR_DELETE = 'ap:vendor:delete' as const;

// Purchase Order (ใบสั่งซื้อ / PO)
export const AP_PO_CREATE = 'ap:po:create' as const;
export const AP_PO_READ = 'ap:po:read' as const;
export const AP_PO_UPDATE = 'ap:po:update' as const;
export const AP_PO_SEND = 'ap:po:send' as const;
export const AP_PO_RECEIVE = 'ap:po:receive' as const;
export const AP_PO_CONVERT = 'ap:po:convert' as const;

// ---------------------------------------------------------------------------
// Human-in-the-loop (HITL) — AI action approval queue
// ---------------------------------------------------------------------------

export const HITL_QUEUE_READ = 'hitl:queue:read' as const;
export const HITL_APPROVE = 'hitl:approve' as const;
export const HITL_REJECT = 'hitl:reject' as const;

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

export const REPORT_GL_READ = 'report:gl:read' as const;
export const REPORT_AR_READ = 'report:ar:read' as const;
export const REPORT_AP_READ = 'report:ap:read' as const;
export const REPORT_TRIAL_BALANCE_READ = 'report:trial-balance:read' as const;
export const REPORT_BALANCE_SHEET_READ = 'report:balance-sheet:read' as const;
export const REPORT_INCOME_STATEMENT_READ = 'report:income-statement:read' as const;
export const REPORT_PNL_COMPARISON_READ = 'report:pnl-comparison:read' as const;

// ---------------------------------------------------------------------------
// Import / Export (Stories 8.1, 8.3)
// ---------------------------------------------------------------------------

export const DATA_IMPORT = 'data:import' as const;
export const DATA_EXPORT = 'data:export' as const;

// ---------------------------------------------------------------------------
// User & Tenant management
// ---------------------------------------------------------------------------

export const USER_INVITE = 'user:invite' as const;
export const USER_READ = 'user:read' as const;
export const USER_UPDATE = 'user:update' as const;
export const USER_DEACTIVATE = 'user:deactivate' as const;
export const ROLE_ASSIGN = 'role:assign' as const;
export const ROLE_READ = 'role:read' as const;
export const ROLE_CREATE = 'role:create' as const;
export const ROLE_UPDATE = 'role:update' as const;
export const ROLE_DELETE = 'role:delete' as const;

// ---------------------------------------------------------------------------
// Fixed Assets (FI-AA)
// ---------------------------------------------------------------------------

export const FI_ASSET_CREATE = 'fi:asset:create' as const;
export const FI_ASSET_READ = 'fi:asset:read' as const;
export const FI_ASSET_UPDATE = 'fi:asset:update' as const;
export const FI_ASSET_DEPRECIATE = 'fi:asset:depreciate' as const;
export const FI_ASSET_DISPOSE = 'fi:asset:dispose' as const;

// ---------------------------------------------------------------------------
// Bank Reconciliation (FI-BL)
// ---------------------------------------------------------------------------

export const FI_BANK_CREATE = 'fi:bank:create' as const;
export const FI_BANK_READ = 'fi:bank:read' as const;
export const FI_BANK_IMPORT = 'fi:bank:import' as const;
export const FI_BANK_RECONCILE = 'fi:bank:reconcile' as const;

// ---------------------------------------------------------------------------
// Withholding Tax Certificates (WHT)
// ---------------------------------------------------------------------------

export const FI_WHT_CREATE = 'fi:wht:create' as const;
export const FI_WHT_READ = 'fi:wht:read' as const;
export const FI_WHT_ISSUE = 'fi:wht:issue' as const;
export const FI_WHT_VOID = 'fi:wht:void' as const;
export const FI_WHT_FILE = 'fi:wht:file' as const;

// ---------------------------------------------------------------------------
// Cost Centers (CO)
// ---------------------------------------------------------------------------

export const CO_COST_CENTER_CREATE = 'co:cost-center:create' as const;
export const CO_COST_CENTER_READ = 'co:cost-center:read' as const;
export const CO_COST_CENTER_UPDATE = 'co:cost-center:update' as const;

// ---------------------------------------------------------------------------
// Profit Centers (CO)
// ---------------------------------------------------------------------------

export const CO_PROFIT_CENTER_CREATE = 'co:profit-center:create' as const;
export const CO_PROFIT_CENTER_READ = 'co:profit-center:read' as const;
export const CO_PROFIT_CENTER_UPDATE = 'co:profit-center:update' as const;

// ---------------------------------------------------------------------------
// Webhooks (Story 13.1)
// ---------------------------------------------------------------------------

export const WEBHOOK_CREATE = 'webhook:create' as const;
export const WEBHOOK_READ = 'webhook:read' as const;
export const WEBHOOK_DELETE = 'webhook:delete' as const;

// ---------------------------------------------------------------------------
// Inventory / MM-IM
// ---------------------------------------------------------------------------

export const INV_PRODUCT_CREATE   = 'inventory:product:create'   as const;
export const INV_PRODUCT_READ     = 'inventory:product:read'     as const;
export const INV_PRODUCT_UPDATE   = 'inventory:product:update'   as const;
export const INV_WAREHOUSE_CREATE = 'inventory:warehouse:create' as const;
export const INV_WAREHOUSE_READ   = 'inventory:warehouse:read'   as const;
export const INV_WAREHOUSE_UPDATE = 'inventory:warehouse:update' as const;
export const INV_MOVEMENT_CREATE  = 'inventory:movement:create'  as const;
export const INV_MOVEMENT_READ    = 'inventory:movement:read'    as const;
export const INV_LEVEL_READ       = 'inventory:level:read'       as const;
export const INV_VALUATION_READ   = 'inventory:valuation:read'   as const;

// ---------------------------------------------------------------------------
// CRM — Contacts
// ---------------------------------------------------------------------------

export const CRM_CONTACT_CREATE = 'crm:contact:create' as const;
export const CRM_CONTACT_READ   = 'crm:contact:read'   as const;
export const CRM_CONTACT_UPDATE = 'crm:contact:update' as const;
export const CRM_CONTACT_DELETE = 'crm:contact:delete' as const;

// ---------------------------------------------------------------------------
// HR — Employees & Departments
// ---------------------------------------------------------------------------

export const HR_DEPT_CREATE   = 'hr:department:create' as const;
export const HR_DEPT_READ     = 'hr:department:read'   as const;
export const HR_DEPT_UPDATE   = 'hr:department:update' as const;
export const HR_EMP_CREATE    = 'hr:employee:create'   as const;
export const HR_EMP_READ      = 'hr:employee:read'     as const;
export const HR_EMP_UPDATE    = 'hr:employee:update'   as const;
export const HR_EMP_RESIGN      = 'hr:employee:resign'     as const;
export const HR_EMP_ANONYMIZE   = 'hr:employee:anonymize'  as const;

// ---------------------------------------------------------------------------
// HR — Payroll
// ---------------------------------------------------------------------------

export const HR_PAYROLL_CREATE    = 'hr:payroll:create'    as const;
export const HR_PAYROLL_READ      = 'hr:payroll:read'      as const;
export const HR_PAYROLL_CALCULATE = 'hr:payroll:calculate' as const;
export const HR_PAYROLL_APPROVE   = 'hr:payroll:approve'   as const;
export const HR_PAYROLL_PAY       = 'hr:payroll:pay'       as const;

// ---------------------------------------------------------------------------
// HR — Leave Management
// ---------------------------------------------------------------------------

export const HR_LEAVE_TYPE_CREATE     = 'hr:leave:type:create'      as const;
export const HR_LEAVE_TYPE_READ       = 'hr:leave:type:read'        as const;
export const HR_LEAVE_REQUEST_CREATE  = 'hr:leave:request:create'   as const;
export const HR_LEAVE_REQUEST_READ    = 'hr:leave:request:read'     as const;
export const HR_LEAVE_REQUEST_APPROVE = 'hr:leave:request:approve'  as const;
export const HR_LEAVE_REQUEST_REJECT  = 'hr:leave:request:reject'   as const;

// ---------------------------------------------------------------------------
// Thai Compliance — VAT Return, e-Tax, PDPA, SSC
// ---------------------------------------------------------------------------

export const REPORT_VAT_RETURN_READ = 'report:vat-return:read' as const;
export const REPORT_SSC_FILING_READ = 'report:ssc-filing:read' as const;
export const FI_ETAX_READ           = 'fi:etax:read'           as const;
export const PDPA_MANAGE            = 'pdpa:manage'            as const;

// ---------------------------------------------------------------------------
// Pricing & Payment Terms
// ---------------------------------------------------------------------------

export const PRICING_READ = 'pricing:read' as const;
export const PRICING_MANAGE = 'pricing:manage' as const;

// ---------------------------------------------------------------------------
// Dunning
// ---------------------------------------------------------------------------

export const DUNNING_MANAGE = 'dunning:manage' as const;

// ---------------------------------------------------------------------------
// Purchase Requisition (MM-PR)
// ---------------------------------------------------------------------------

export const MM_PR_CREATE  = 'mm:pr:create'  as const;
export const MM_PR_READ    = 'mm:pr:read'    as const;
export const MM_PR_UPDATE  = 'mm:pr:update'  as const;
export const MM_PR_APPROVE = 'mm:pr:approve' as const;

// ---------------------------------------------------------------------------
// RFQ (Request for Quotation)
// ---------------------------------------------------------------------------

export const MM_RFQ_CREATE = 'mm:rfq:create' as const;
export const MM_RFQ_READ   = 'mm:rfq:read'   as const;

// ---------------------------------------------------------------------------
// Stock Count (Physical Inventory)
// ---------------------------------------------------------------------------

export const INV_COUNT_CREATE = 'inventory:count:create' as const;
export const INV_COUNT_READ   = 'inventory:count:read'   as const;
export const INV_COUNT_POST   = 'inventory:count:post'   as const;

// ---------------------------------------------------------------------------
// HR — Positions
// ---------------------------------------------------------------------------

export const HR_POSITION_CREATE = 'hr:position:create' as const;
export const HR_POSITION_READ   = 'hr:position:read'   as const;
export const HR_POSITION_UPDATE = 'hr:position:update' as const;

// ---------------------------------------------------------------------------
// HR — Attendance
// ---------------------------------------------------------------------------

export const HR_ATTENDANCE_CREATE = 'hr:attendance:create' as const;
export const HR_ATTENDANCE_READ   = 'hr:attendance:read'   as const;

// ---------------------------------------------------------------------------
// CO — Budget Override
// ---------------------------------------------------------------------------

export const CO_BUDGET_OVERRIDE = 'co:budget:override' as const;

// ---------------------------------------------------------------------------
// Phase 5 — Enterprise Features
// ---------------------------------------------------------------------------

// Multi-Currency
export const FI_CURRENCY_CREATE = 'fi:currency:create' as const;
export const FI_CURRENCY_READ   = 'fi:currency:read'   as const;
export const FI_CURRENCY_UPDATE = 'fi:currency:update' as const;

// Multi-Company
export const COMPANY_CREATE = 'company:create' as const;
export const COMPANY_READ   = 'company:read'   as const;
export const COMPANY_UPDATE = 'company:update' as const;

// Approval Chains
export const APPROVAL_WORKFLOW_CREATE = 'approval:workflow:create' as const;
export const APPROVAL_WORKFLOW_READ   = 'approval:workflow:read'   as const;
export const APPROVAL_ACTION          = 'approval:action'          as const;

// ---------------------------------------------------------------------------
// AI & Analytics (Phase 6)
// ---------------------------------------------------------------------------

export const AI_SCAN       = 'ai:scan'       as const;
export const AI_FORECAST   = 'ai:forecast'   as const;
export const AI_CATEGORIZE = 'ai:categorize' as const;
export const AI_RECONCILE  = 'ai:reconcile'  as const;
export const AI_PARSE      = 'ai:parse'      as const;
export const AI_PREDICT    = 'ai:predict'    as const;
export const REPORT_CUSTOM_CREATE = 'report:custom:create' as const;
export const REPORT_CUSTOM_READ   = 'report:custom:read'   as const;
export const REPORT_CUSTOM_RUN    = 'report:custom:run'    as const;

// ---------------------------------------------------------------------------
// Union type — exhaustive set of all permission strings
// ---------------------------------------------------------------------------

export type Permission =
  | typeof GL_JOURNAL_CREATE
  | typeof GL_JOURNAL_READ
  | typeof GL_JOURNAL_UPDATE
  | typeof GL_JOURNAL_DELETE
  | typeof GL_JOURNAL_POST
  | typeof GL_JOURNAL_REVERSE
  | typeof GL_ACCOUNT_CREATE
  | typeof GL_ACCOUNT_READ
  | typeof GL_ACCOUNT_UPDATE
  | typeof GL_ACCOUNT_DELETE
  | typeof GL_PERIOD_CLOSE
  | typeof GL_PERIOD_READ
  | typeof AR_INVOICE_CREATE
  | typeof AR_INVOICE_READ
  | typeof AR_INVOICE_UPDATE
  | typeof AR_INVOICE_DELETE
  | typeof AR_INVOICE_SEND
  | typeof AR_INVOICE_VOID
  | typeof AR_QUOTATION_CREATE
  | typeof AR_QUOTATION_READ
  | typeof AR_QUOTATION_UPDATE
  | typeof AR_QUOTATION_SEND
  | typeof AR_QUOTATION_APPROVE
  | typeof AR_QUOTATION_CONVERT
  | typeof AR_SO_CREATE
  | typeof AR_SO_READ
  | typeof AR_SO_UPDATE
  | typeof AR_SO_CONFIRM
  | typeof AR_DO_CREATE
  | typeof AR_DO_READ
  | typeof AR_DO_DELIVER
  | typeof AR_RECEIPT_CREATE
  | typeof AR_RECEIPT_READ
  | typeof AR_RECEIPT_VOID
  | typeof AR_CN_CREATE
  | typeof AR_CN_READ
  | typeof AR_CN_ISSUE
  | typeof AR_CN_VOID
  | typeof AR_PAYMENT_CREATE
  | typeof AR_PAYMENT_READ
  | typeof AR_PAYMENT_UPDATE
  | typeof AR_CUSTOMER_CREATE
  | typeof AR_CUSTOMER_READ
  | typeof AR_CUSTOMER_UPDATE
  | typeof AR_CUSTOMER_DELETE
  | typeof AP_BILL_CREATE
  | typeof AP_BILL_READ
  | typeof AP_BILL_UPDATE
  | typeof AP_BILL_DELETE
  | typeof AP_BILL_APPROVE
  | typeof AP_PAYMENT_CREATE
  | typeof AP_PAYMENT_READ
  | typeof AP_PAYMENT_UPDATE
  | typeof AP_VENDOR_CREATE
  | typeof AP_VENDOR_READ
  | typeof AP_VENDOR_UPDATE
  | typeof AP_VENDOR_DELETE
  | typeof AP_PO_CREATE
  | typeof AP_PO_READ
  | typeof AP_PO_UPDATE
  | typeof AP_PO_SEND
  | typeof AP_PO_RECEIVE
  | typeof AP_PO_CONVERT
  | typeof HITL_QUEUE_READ
  | typeof HITL_APPROVE
  | typeof HITL_REJECT
  | typeof REPORT_GL_READ
  | typeof REPORT_AR_READ
  | typeof REPORT_AP_READ
  | typeof REPORT_TRIAL_BALANCE_READ
  | typeof REPORT_BALANCE_SHEET_READ
  | typeof REPORT_INCOME_STATEMENT_READ
  | typeof REPORT_PNL_COMPARISON_READ
  | typeof USER_INVITE
  | typeof USER_READ
  | typeof USER_UPDATE
  | typeof USER_DEACTIVATE
  | typeof ROLE_ASSIGN
  | typeof ROLE_READ
  | typeof ROLE_CREATE
  | typeof ROLE_UPDATE
  | typeof ROLE_DELETE
  | typeof WEBHOOK_CREATE
  | typeof WEBHOOK_READ
  | typeof WEBHOOK_DELETE
  | typeof DATA_IMPORT
  | typeof DATA_EXPORT
  | typeof FI_ASSET_CREATE
  | typeof FI_ASSET_READ
  | typeof FI_ASSET_UPDATE
  | typeof FI_ASSET_DEPRECIATE
  | typeof FI_ASSET_DISPOSE
  | typeof FI_BANK_CREATE
  | typeof FI_BANK_READ
  | typeof FI_BANK_IMPORT
  | typeof FI_BANK_RECONCILE
  | typeof FI_WHT_CREATE
  | typeof FI_WHT_READ
  | typeof FI_WHT_ISSUE
  | typeof FI_WHT_VOID
  | typeof FI_WHT_FILE
  | typeof CO_COST_CENTER_CREATE
  | typeof CO_COST_CENTER_READ
  | typeof CO_COST_CENTER_UPDATE
  | typeof CO_PROFIT_CENTER_CREATE
  | typeof CO_PROFIT_CENTER_READ
  | typeof CO_PROFIT_CENTER_UPDATE
  // Inventory
  | typeof INV_PRODUCT_CREATE
  | typeof INV_PRODUCT_READ
  | typeof INV_PRODUCT_UPDATE
  | typeof INV_WAREHOUSE_CREATE
  | typeof INV_WAREHOUSE_READ
  | typeof INV_WAREHOUSE_UPDATE
  | typeof INV_MOVEMENT_CREATE
  | typeof INV_MOVEMENT_READ
  | typeof INV_LEVEL_READ
  | typeof INV_VALUATION_READ
  // CRM
  | typeof CRM_CONTACT_CREATE
  | typeof CRM_CONTACT_READ
  | typeof CRM_CONTACT_UPDATE
  | typeof CRM_CONTACT_DELETE
  // HR — Employees & Departments
  | typeof HR_DEPT_CREATE
  | typeof HR_DEPT_READ
  | typeof HR_DEPT_UPDATE
  | typeof HR_EMP_CREATE
  | typeof HR_EMP_READ
  | typeof HR_EMP_UPDATE
  | typeof HR_EMP_RESIGN
  | typeof HR_EMP_ANONYMIZE
  // HR — Payroll
  | typeof HR_PAYROLL_CREATE
  | typeof HR_PAYROLL_READ
  | typeof HR_PAYROLL_CALCULATE
  | typeof HR_PAYROLL_APPROVE
  | typeof HR_PAYROLL_PAY
  // HR — Leave
  | typeof HR_LEAVE_TYPE_CREATE
  | typeof HR_LEAVE_TYPE_READ
  | typeof HR_LEAVE_REQUEST_CREATE
  | typeof HR_LEAVE_REQUEST_READ
  | typeof HR_LEAVE_REQUEST_APPROVE
  | typeof HR_LEAVE_REQUEST_REJECT
  // Thai Compliance
  | typeof REPORT_VAT_RETURN_READ
  | typeof REPORT_SSC_FILING_READ
  | typeof FI_ETAX_READ
  | typeof PDPA_MANAGE
  // Pricing & Dunning
  | typeof PRICING_READ
  | typeof PRICING_MANAGE
  | typeof DUNNING_MANAGE
  // Phase 4 Operations
  | typeof MM_PR_CREATE
  | typeof MM_PR_READ
  | typeof MM_PR_UPDATE
  | typeof MM_PR_APPROVE
  | typeof MM_RFQ_CREATE
  | typeof MM_RFQ_READ
  | typeof INV_COUNT_CREATE
  | typeof INV_COUNT_READ
  | typeof INV_COUNT_POST
  | typeof HR_POSITION_CREATE
  | typeof HR_POSITION_READ
  | typeof HR_POSITION_UPDATE
  | typeof HR_ATTENDANCE_CREATE
  | typeof HR_ATTENDANCE_READ
  | typeof CO_BUDGET_OVERRIDE
  // Phase 5 Enterprise
  | typeof FI_CURRENCY_CREATE
  | typeof FI_CURRENCY_READ
  | typeof FI_CURRENCY_UPDATE
  | typeof COMPANY_CREATE
  | typeof COMPANY_READ
  | typeof COMPANY_UPDATE
  | typeof APPROVAL_WORKFLOW_CREATE
  | typeof APPROVAL_WORKFLOW_READ
  | typeof APPROVAL_ACTION
  // AI & Analytics (Phase 6)
  | typeof AI_SCAN
  | typeof AI_FORECAST
  | typeof AI_CATEGORIZE
  | typeof AI_RECONCILE
  | typeof AI_PARSE
  | typeof AI_PREDICT
  | typeof REPORT_CUSTOM_CREATE
  | typeof REPORT_CUSTOM_READ
  | typeof REPORT_CUSTOM_RUN;

// ---------------------------------------------------------------------------
// Permission sets — grouped by default role
// ---------------------------------------------------------------------------

/** Every permission — granted to the Owner role. */
export const ALL_PERMISSIONS: readonly Permission[] = [
  GL_JOURNAL_CREATE,
  GL_JOURNAL_READ,
  GL_JOURNAL_UPDATE,
  GL_JOURNAL_DELETE,
  GL_JOURNAL_POST,
  GL_JOURNAL_REVERSE,
  GL_ACCOUNT_CREATE,
  GL_ACCOUNT_READ,
  GL_ACCOUNT_UPDATE,
  GL_ACCOUNT_DELETE,
  GL_PERIOD_CLOSE,
  GL_PERIOD_READ,
  AR_INVOICE_CREATE,
  AR_INVOICE_READ,
  AR_INVOICE_UPDATE,
  AR_INVOICE_DELETE,
  AR_INVOICE_SEND,
  AR_INVOICE_VOID,
  AR_QUOTATION_CREATE,
  AR_QUOTATION_READ,
  AR_QUOTATION_UPDATE,
  AR_QUOTATION_SEND,
  AR_QUOTATION_APPROVE,
  AR_QUOTATION_CONVERT,
  AR_SO_CREATE,
  AR_SO_READ,
  AR_SO_UPDATE,
  AR_SO_CONFIRM,
  AR_DO_CREATE,
  AR_DO_READ,
  AR_DO_DELIVER,
  AR_RECEIPT_CREATE,
  AR_RECEIPT_READ,
  AR_RECEIPT_VOID,
  AR_CN_CREATE,
  AR_CN_READ,
  AR_CN_ISSUE,
  AR_CN_VOID,
  AR_PAYMENT_CREATE,
  AR_PAYMENT_READ,
  AR_PAYMENT_UPDATE,
  AR_CUSTOMER_CREATE,
  AR_CUSTOMER_READ,
  AR_CUSTOMER_UPDATE,
  AR_CUSTOMER_DELETE,
  AP_BILL_CREATE,
  AP_BILL_READ,
  AP_BILL_UPDATE,
  AP_BILL_DELETE,
  AP_BILL_APPROVE,
  AP_PAYMENT_CREATE,
  AP_PAYMENT_READ,
  AP_PAYMENT_UPDATE,
  AP_VENDOR_CREATE,
  AP_VENDOR_READ,
  AP_VENDOR_UPDATE,
  AP_VENDOR_DELETE,
  AP_PO_CREATE,
  AP_PO_READ,
  AP_PO_UPDATE,
  AP_PO_SEND,
  AP_PO_RECEIVE,
  AP_PO_CONVERT,
  HITL_QUEUE_READ,
  HITL_APPROVE,
  HITL_REJECT,
  REPORT_GL_READ,
  REPORT_AR_READ,
  REPORT_AP_READ,
  REPORT_TRIAL_BALANCE_READ,
  REPORT_BALANCE_SHEET_READ,
  REPORT_INCOME_STATEMENT_READ,
  REPORT_PNL_COMPARISON_READ,
  USER_INVITE,
  USER_READ,
  USER_UPDATE,
  USER_DEACTIVATE,
  ROLE_ASSIGN,
  ROLE_READ,
  ROLE_CREATE,
  ROLE_UPDATE,
  ROLE_DELETE,
  WEBHOOK_CREATE,
  WEBHOOK_READ,
  WEBHOOK_DELETE,
  DATA_IMPORT,
  DATA_EXPORT,
  FI_ASSET_CREATE,
  FI_ASSET_READ,
  FI_ASSET_UPDATE,
  FI_ASSET_DEPRECIATE,
  FI_ASSET_DISPOSE,
  FI_BANK_CREATE,
  FI_BANK_READ,
  FI_BANK_IMPORT,
  FI_BANK_RECONCILE,
  FI_WHT_CREATE,
  FI_WHT_READ,
  FI_WHT_ISSUE,
  FI_WHT_VOID,
  FI_WHT_FILE,
  CO_COST_CENTER_CREATE,
  CO_COST_CENTER_READ,
  CO_COST_CENTER_UPDATE,
  CO_PROFIT_CENTER_CREATE,
  CO_PROFIT_CENTER_READ,
  CO_PROFIT_CENTER_UPDATE,
  // Inventory
  INV_PRODUCT_CREATE,
  INV_PRODUCT_READ,
  INV_PRODUCT_UPDATE,
  INV_WAREHOUSE_CREATE,
  INV_WAREHOUSE_READ,
  INV_WAREHOUSE_UPDATE,
  INV_MOVEMENT_CREATE,
  INV_MOVEMENT_READ,
  INV_LEVEL_READ,
  INV_VALUATION_READ,
  // CRM
  CRM_CONTACT_CREATE,
  CRM_CONTACT_READ,
  CRM_CONTACT_UPDATE,
  CRM_CONTACT_DELETE,
  // HR
  HR_DEPT_CREATE,
  HR_DEPT_READ,
  HR_DEPT_UPDATE,
  HR_EMP_CREATE,
  HR_EMP_READ,
  HR_EMP_UPDATE,
  HR_EMP_RESIGN,
  HR_EMP_ANONYMIZE,
  HR_PAYROLL_CREATE,
  HR_PAYROLL_READ,
  HR_PAYROLL_CALCULATE,
  HR_PAYROLL_APPROVE,
  HR_PAYROLL_PAY,
  HR_LEAVE_TYPE_CREATE,
  HR_LEAVE_TYPE_READ,
  HR_LEAVE_REQUEST_CREATE,
  HR_LEAVE_REQUEST_READ,
  HR_LEAVE_REQUEST_APPROVE,
  HR_LEAVE_REQUEST_REJECT,
  // Thai Compliance
  REPORT_VAT_RETURN_READ,
  REPORT_SSC_FILING_READ,
  FI_ETAX_READ,
  PDPA_MANAGE,
  // Pricing & Dunning
  PRICING_READ,
  PRICING_MANAGE,
  DUNNING_MANAGE,
  // Phase 4 Operations
  MM_PR_CREATE,
  MM_PR_READ,
  MM_PR_UPDATE,
  MM_PR_APPROVE,
  MM_RFQ_CREATE,
  MM_RFQ_READ,
  INV_COUNT_CREATE,
  INV_COUNT_READ,
  INV_COUNT_POST,
  HR_POSITION_CREATE,
  HR_POSITION_READ,
  HR_POSITION_UPDATE,
  HR_ATTENDANCE_CREATE,
  HR_ATTENDANCE_READ,
  CO_BUDGET_OVERRIDE,
  // Phase 5 Enterprise
  FI_CURRENCY_CREATE,
  FI_CURRENCY_READ,
  FI_CURRENCY_UPDATE,
  COMPANY_CREATE,
  COMPANY_READ,
  COMPANY_UPDATE,
  APPROVAL_WORKFLOW_CREATE,
  APPROVAL_WORKFLOW_READ,
  APPROVAL_ACTION,
  // AI & Analytics (Phase 6)
  AI_SCAN,
  AI_FORECAST,
  AI_CATEGORIZE,
  AI_RECONCILE,
  AI_PARSE,
  AI_PREDICT,
  REPORT_CUSTOM_CREATE,
  REPORT_CUSTOM_READ,
  REPORT_CUSTOM_RUN,
] as const;

/**
 * Permissions granted to the Accountant role.
 * Can create/edit/post journal entries, manage AR invoices/payments, manage AP bills/payments,
 * manage customers/vendors, and view all reports.
 */
export const ACCOUNTANT_PERMISSIONS: readonly Permission[] = [
  // GL
  GL_JOURNAL_CREATE,
  GL_JOURNAL_READ,
  GL_JOURNAL_UPDATE,
  GL_JOURNAL_POST,
  GL_JOURNAL_REVERSE,
  GL_ACCOUNT_READ,
  GL_PERIOD_READ,
  // AR
  AR_INVOICE_CREATE,
  AR_INVOICE_READ,
  AR_INVOICE_UPDATE,
  AR_INVOICE_SEND,
  AR_QUOTATION_CREATE,
  AR_QUOTATION_READ,
  AR_QUOTATION_UPDATE,
  AR_QUOTATION_SEND,
  AR_QUOTATION_APPROVE,
  AR_QUOTATION_CONVERT,
  AR_SO_CREATE,
  AR_SO_READ,
  AR_SO_UPDATE,
  AR_SO_CONFIRM,
  AR_DO_CREATE,
  AR_DO_READ,
  AR_DO_DELIVER,
  AR_RECEIPT_CREATE,
  AR_RECEIPT_READ,
  AR_RECEIPT_VOID,
  AR_CN_CREATE,
  AR_CN_READ,
  AR_CN_ISSUE,
  AR_CN_VOID,
  AR_PAYMENT_CREATE,
  AR_PAYMENT_READ,
  AR_PAYMENT_UPDATE,
  AR_CUSTOMER_CREATE,
  AR_CUSTOMER_READ,
  AR_CUSTOMER_UPDATE,
  // AP
  AP_BILL_CREATE,
  AP_BILL_READ,
  AP_BILL_UPDATE,
  AP_PAYMENT_CREATE,
  AP_PAYMENT_READ,
  AP_PAYMENT_UPDATE,
  AP_VENDOR_CREATE,
  AP_VENDOR_READ,
  AP_VENDOR_UPDATE,
  AP_PO_CREATE,
  AP_PO_READ,
  AP_PO_UPDATE,
  AP_PO_SEND,
  AP_PO_RECEIVE,
  AP_PO_CONVERT,
  // Reports
  REPORT_GL_READ,
  REPORT_AR_READ,
  REPORT_AP_READ,
  REPORT_TRIAL_BALANCE_READ,
  REPORT_BALANCE_SHEET_READ,
  REPORT_INCOME_STATEMENT_READ,
  REPORT_PNL_COMPARISON_READ,
  // Import / Export
  DATA_IMPORT,
  DATA_EXPORT,
  // User visibility
  USER_READ,
  // Fixed Assets
  FI_ASSET_CREATE,
  FI_ASSET_READ,
  FI_ASSET_UPDATE,
  FI_ASSET_DEPRECIATE,
  FI_ASSET_DISPOSE,
  // Bank Reconciliation
  FI_BANK_CREATE,
  FI_BANK_READ,
  FI_BANK_IMPORT,
  FI_BANK_RECONCILE,
  // WHT
  FI_WHT_CREATE,
  FI_WHT_READ,
  FI_WHT_ISSUE,
  FI_WHT_VOID,
  FI_WHT_FILE,
  // CO
  CO_COST_CENTER_CREATE,
  CO_COST_CENTER_READ,
  CO_COST_CENTER_UPDATE,
  CO_PROFIT_CENTER_CREATE,
  CO_PROFIT_CENTER_READ,
  CO_PROFIT_CENTER_UPDATE,
  // Inventory
  INV_PRODUCT_CREATE,
  INV_PRODUCT_READ,
  INV_PRODUCT_UPDATE,
  INV_WAREHOUSE_CREATE,
  INV_WAREHOUSE_READ,
  INV_WAREHOUSE_UPDATE,
  INV_MOVEMENT_CREATE,
  INV_MOVEMENT_READ,
  INV_LEVEL_READ,
  INV_VALUATION_READ,
  // CRM
  CRM_CONTACT_CREATE,
  CRM_CONTACT_READ,
  CRM_CONTACT_UPDATE,
  CRM_CONTACT_DELETE,
  // HR
  HR_DEPT_CREATE,
  HR_DEPT_READ,
  HR_DEPT_UPDATE,
  HR_EMP_CREATE,
  HR_EMP_READ,
  HR_EMP_UPDATE,
  HR_EMP_RESIGN,
  HR_EMP_ANONYMIZE,
  HR_PAYROLL_CREATE,
  HR_PAYROLL_READ,
  HR_PAYROLL_CALCULATE,
  HR_PAYROLL_APPROVE,
  HR_PAYROLL_PAY,
  HR_LEAVE_TYPE_CREATE,
  HR_LEAVE_TYPE_READ,
  HR_LEAVE_REQUEST_CREATE,
  HR_LEAVE_REQUEST_READ,
  HR_LEAVE_REQUEST_APPROVE,
  HR_LEAVE_REQUEST_REJECT,
  // Thai Compliance
  REPORT_VAT_RETURN_READ,
  REPORT_SSC_FILING_READ,
  FI_ETAX_READ,
  PDPA_MANAGE,
  // Pricing & Dunning
  PRICING_READ,
  PRICING_MANAGE,
  DUNNING_MANAGE,
  // Phase 4 Operations
  MM_PR_CREATE,
  MM_PR_READ,
  MM_PR_UPDATE,
  MM_PR_APPROVE,
  MM_RFQ_CREATE,
  MM_RFQ_READ,
  INV_COUNT_CREATE,
  INV_COUNT_READ,
  INV_COUNT_POST,
  HR_POSITION_CREATE,
  HR_POSITION_READ,
  HR_POSITION_UPDATE,
  HR_ATTENDANCE_CREATE,
  HR_ATTENDANCE_READ,
  // Phase 5 Enterprise
  FI_CURRENCY_READ,
  COMPANY_READ,
  APPROVAL_WORKFLOW_READ,
  APPROVAL_ACTION,
] as const;

/**
 * Permissions granted to the Approver role.
 * Can view and action the HITL queue only.
 */
export const APPROVER_PERMISSIONS: readonly Permission[] = [
  HITL_QUEUE_READ,
  HITL_APPROVE,
  HITL_REJECT,
] as const;

// ---------------------------------------------------------------------------
// Default role names
// ---------------------------------------------------------------------------

export const ROLE_OWNER = 'Owner' as const;
export const ROLE_ACCOUNTANT = 'Accountant' as const;
export const ROLE_APPROVER = 'Approver' as const;

export type DefaultRoleName =
  | typeof ROLE_OWNER
  | typeof ROLE_ACCOUNTANT
  | typeof ROLE_APPROVER;
