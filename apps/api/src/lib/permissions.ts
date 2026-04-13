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

export const DASHBOARD_CONFIG_READ = 'dashboard:config:read' as const;
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
export const AI_CATEGORIZE_EXECUTE = 'ai:categorize:execute' as const;
export const AI_PARSE_EXECUTE      = 'ai:parse:execute'      as const;
export const REPORT_CUSTOM_CREATE = 'report:custom:create' as const;
export const REPORT_CUSTOM_READ   = 'report:custom:read'   as const;
export const REPORT_CUSTOM_RUN    = 'report:custom:run'    as const;

// ---------------------------------------------------------------------------
// Manufacturing / PP
// ---------------------------------------------------------------------------

export const PP_BOM_CREATE       = 'pp:bom:create'       as const;
export const PP_BOM_READ         = 'pp:bom:read'         as const;
export const PP_BOM_UPDATE       = 'pp:bom:update'       as const;
export const PP_BOM_DELETE       = 'pp:bom:delete'       as const;
export const PP_WORK_CENTER_CREATE = 'pp:work-center:create' as const;
export const PP_WORK_CENTER_READ   = 'pp:work-center:read'   as const;
export const PP_WORK_CENTER_UPDATE = 'pp:work-center:update' as const;
export const PP_WORK_CENTER_DELETE = 'pp:work-center:delete' as const;
export const PP_PRODUCTION_CREATE  = 'pp:production:create'  as const;
export const PP_PRODUCTION_READ    = 'pp:production:read'    as const;
export const PP_PRODUCTION_UPDATE  = 'pp:production:update'  as const;
export const PP_MRP_RUN            = 'pp:mrp:run'            as const;

// PP Gap — CRP, Kanban, Process Orders, Co-Products, ECM, Demand Mgmt
export const PP_CAPACITY_READ      = 'pp:capacity:read'       as const;
export const PP_KANBAN_CREATE      = 'pp:kanban:create'       as const;
export const PP_KANBAN_READ        = 'pp:kanban:read'         as const;
export const PP_KANBAN_UPDATE      = 'pp:kanban:update'       as const;
export const PP_KANBAN_TRIGGER     = 'pp:kanban:trigger'      as const;
export const PP_PROC_ORDER_CREATE  = 'pp:process-order:create' as const;
export const PP_PROC_ORDER_READ    = 'pp:process-order:read'   as const;
export const PP_PROC_ORDER_UPDATE  = 'pp:process-order:update' as const;
export const PP_OUTPUT_CREATE      = 'pp:output:create'        as const;
export const PP_OUTPUT_READ        = 'pp:output:read'          as const;
export const PP_OUTPUT_UPDATE      = 'pp:output:update'        as const;
export const PP_ECM_CREATE         = 'pp:ecm:create'           as const;
export const PP_ECM_READ           = 'pp:ecm:read'             as const;
export const PP_ECM_APPROVE        = 'pp:ecm:approve'          as const;
export const PP_ECM_IMPLEMENT      = 'pp:ecm:implement'        as const;
export const PP_DEMAND_CREATE      = 'pp:demand:create'        as const;
export const PP_DEMAND_READ        = 'pp:demand:read'          as const;
export const PP_DEMAND_UPDATE      = 'pp:demand:update'        as const;

// MM Purchasing Gaps — Contracts, Scheduling Agreements, STO, Source List, Consignment
export const MM_CONTRACT_CREATE    = 'mm:contract:create'      as const;
export const MM_CONTRACT_READ      = 'mm:contract:read'        as const;
export const MM_CONTRACT_UPDATE    = 'mm:contract:update'      as const;
export const MM_CONTRACT_RELEASE   = 'mm:contract:release'     as const;
export const MM_SCHED_CREATE       = 'mm:sched-agreement:create' as const;
export const MM_SCHED_READ         = 'mm:sched-agreement:read'   as const;
export const MM_SCHED_UPDATE       = 'mm:sched-agreement:update' as const;
export const MM_STO_CREATE         = 'mm:sto:create'           as const;
export const MM_STO_READ           = 'mm:sto:read'             as const;
export const MM_STO_UPDATE         = 'mm:sto:update'           as const;
export const MM_SRC_LIST_CREATE    = 'mm:source-list:create'   as const;
export const MM_SRC_LIST_READ      = 'mm:source-list:read'     as const;
export const MM_SRC_LIST_UPDATE    = 'mm:source-list:update'   as const;
export const MM_CONSIGN_CREATE     = 'mm:consignment:create'   as const;
export const MM_CONSIGN_READ       = 'mm:consignment:read'     as const;
export const MM_CONSIGN_UPDATE     = 'mm:consignment:update'   as const;

// ---------------------------------------------------------------------------
// Project System (PS)
// ---------------------------------------------------------------------------

export const PS_PROJECT_CREATE   = 'ps:project:create'   as const;
export const PS_PROJECT_READ     = 'ps:project:read'     as const;
export const PS_PROJECT_UPDATE   = 'ps:project:update'   as const;
export const PS_TIME_CREATE      = 'ps:time:create'      as const;
export const PS_TIME_READ        = 'ps:time:read'        as const;
export const PS_TIME_APPROVE     = 'ps:time:approve'     as const;
export const PS_EXPENSE_CREATE   = 'ps:expense:create'   as const;
export const PS_EXPENSE_READ     = 'ps:expense:read'     as const;
export const PS_EXPENSE_APPROVE  = 'ps:expense:approve'  as const;

// ---------------------------------------------------------------------------
// Quality Management (QM)
// ---------------------------------------------------------------------------

export const QM_INSPECTION_CREATE = 'qm:inspection:create' as const;
export const QM_INSPECTION_READ   = 'qm:inspection:read'   as const;
export const QM_INSPECTION_UPDATE = 'qm:inspection:update' as const;
export const QM_CERT_CREATE       = 'qm:cert:create'       as const;
export const QM_CERT_READ         = 'qm:cert:read'         as const;
export const QM_CERT_UPDATE       = 'qm:cert:update'       as const;
export const QM_BOI_CREATE        = 'qm:boi:create'        as const;
export const QM_BOI_READ          = 'qm:boi:read'          as const;

// ---------------------------------------------------------------------------
// Foreign Trade (FT)
// ---------------------------------------------------------------------------

export const FT_DECLARATION_CREATE = 'ft:declaration:create' as const;
export const FT_DECLARATION_READ   = 'ft:declaration:read'   as const;
export const FT_DECLARATION_UPDATE = 'ft:declaration:update' as const;
export const FT_DECLARATION_DELETE = 'ft:declaration:delete' as const;
export const FT_DECLARATION_SUBMIT = 'ft:declaration:submit' as const;
export const FT_DECLARATION_CLEAR  = 'ft:declaration:clear'  as const;
export const FT_LC_CREATE          = 'ft:lc:create'          as const;
export const FT_LC_READ            = 'ft:lc:read'            as const;
export const FT_LC_UPDATE          = 'ft:lc:update'          as const;
export const FT_LC_DELETE          = 'ft:lc:delete'          as const;
export const FT_LC_ISSUE           = 'ft:lc:issue'           as const;
export const FT_LC_NEGOTIATE       = 'ft:lc:negotiate'       as const;
export const FT_LC_SETTLE          = 'ft:lc:settle'          as const;
export const FT_LC_CANCEL          = 'ft:lc:cancel'          as const;
export const FT_LANDED_CREATE      = 'ft:landed:create'      as const;
export const FT_LANDED_READ        = 'ft:landed:read'        as const;

// ---------------------------------------------------------------------------
// Plant Maintenance (PM)
// ---------------------------------------------------------------------------

export const PM_EQUIPMENT_CREATE = 'pm:equipment:create' as const;
export const PM_EQUIPMENT_READ   = 'pm:equipment:read'   as const;
export const PM_EQUIPMENT_UPDATE = 'pm:equipment:update' as const;
export const PM_PLAN_CREATE      = 'pm:plan:create'      as const;
export const PM_PLAN_READ        = 'pm:plan:read'        as const;
export const PM_PLAN_UPDATE      = 'pm:plan:update'      as const;
export const PM_ORDER_CREATE     = 'pm:order:create'     as const;
export const PM_ORDER_READ       = 'pm:order:read'       as const;
export const PM_ORDER_UPDATE     = 'pm:order:update'     as const;
export const PM_ORDER_CLOSE      = 'pm:order:close'      as const;

// ---------------------------------------------------------------------------
// Service Procurement (AP — Service Entry Sheets)
// ---------------------------------------------------------------------------

export const AP_SERVICE_CREATE  = 'ap:service:create'  as const;
export const AP_SERVICE_READ    = 'ap:service:read'    as const;
export const AP_SERVICE_UPDATE  = 'ap:service:update'  as const;
export const AP_SERVICE_APPROVE = 'ap:service:approve' as const;

// ---------------------------------------------------------------------------
// CO-PA Profitability Analysis
// ---------------------------------------------------------------------------

export const REPORT_PROFITABILITY_READ = 'report:profitability:read' as const;

// ---------------------------------------------------------------------------
// Available-to-Promise (ATP)
// ---------------------------------------------------------------------------

export const INV_ATP_READ = 'inventory:atp:read' as const;

// ---------------------------------------------------------------------------
// Module Management
// ---------------------------------------------------------------------------

export const MODULE_MANAGE = 'module:manage' as const;

// ---------------------------------------------------------------------------
// SAP-gap Phase 1 — Batch Payment, Collections, Down Payments
// ---------------------------------------------------------------------------

// Batch Payment Run (AP)
export const AP_BATCH_PAYMENT_CREATE  = 'ap:batch-payment:create'  as const;
export const AP_BATCH_PAYMENT_READ    = 'ap:batch-payment:read'    as const;
export const AP_BATCH_PAYMENT_EXECUTE = 'ap:batch-payment:execute' as const;

// Collections Management (AR)
export const AR_COLLECTION_READ   = 'ar:collection:read'   as const;
export const AR_COLLECTION_MANAGE = 'ar:collection:manage' as const;

// Down Payments (AR)
export const AR_DOWN_PAYMENT_CREATE = 'ar:down-payment:create' as const;
export const AR_DOWN_PAYMENT_MANAGE = 'ar:down-payment:manage' as const;

// Down Payments (AP)
export const AP_DOWN_PAYMENT_CREATE = 'ap:down-payment:create' as const;
export const AP_DOWN_PAYMENT_MANAGE = 'ap:down-payment:manage' as const;

// ---------------------------------------------------------------------------
// SAP-gap Phase 2 — Finance HIGH gaps
// ---------------------------------------------------------------------------

export const FI_ASSET_CAPITALIZE          = 'fi:asset:capitalize'          as const;
export const FI_BANK_IMPORT_MT940         = 'fi:bank:import-mt940'         as const;
export const AP_VENDOR_EVALUATE           = 'ap:vendor:evaluate'           as const;
export const AR_INTEREST_RUN              = 'ar:interest:run'              as const;
export const AR_DISPUTE_CREATE            = 'ar:dispute:create'            as const;
export const AR_DISPUTE_READ              = 'ar:dispute:read'              as const;
export const AR_DISPUTE_RESOLVE           = 'ar:dispute:resolve'           as const;
export const AR_PAYMENT_ADVICE_PROCESS    = 'ar:payment-advice:process'    as const;
export const FI_CLOSING_MANAGE            = 'fi:closing:manage'            as const;
export const FI_CLOSING_READ              = 'fi:closing:read'              as const;
export const REPORT_CONTRIBUTION_MARGIN_READ = 'report:contribution-margin:read' as const;

// ---------------------------------------------------------------------------
// SAP-gap Phase 2 — Controlling HIGH gaps
// ---------------------------------------------------------------------------

export const CO_STANDARD_COST_CALCULATE   = 'co:standard-cost:calculate'   as const;
export const CO_STANDARD_COST_READ        = 'co:standard-cost:read'        as const;
export const CO_ACTUAL_COST_RUN           = 'co:actual-cost:run'           as const;
export const CO_ACTUAL_COST_READ          = 'co:actual-cost:read'          as const;
export const CO_WIP_CALCULATE             = 'co:wip:calculate'             as const;
export const CO_WIP_READ                  = 'co:wip:read'                  as const;
export const CO_ALLOCATION_MANAGE         = 'co:allocation:manage'         as const;
export const CO_ALLOCATION_RUN            = 'co:allocation:run'            as const;
export const CO_INTERNAL_ORDER_CREATE     = 'co:internal-order:create'     as const;
export const CO_INTERNAL_ORDER_READ       = 'co:internal-order:read'       as const;
export const CO_INTERNAL_ORDER_UPDATE     = 'co:internal-order:update'     as const;
export const CO_INTERNAL_ORDER_SETTLE     = 'co:internal-order:settle'     as const;
export const CO_TRANSFER_PRICING_MANAGE   = 'co:transfer-pricing:manage'   as const;
export const CO_TRANSFER_PRICING_READ     = 'co:transfer-pricing:read'     as const;

// ---------------------------------------------------------------------------
// CRITICAL Compliance — IFRS 16, Parallel Accounting, e-Tax, IFRS 15, Deferred Tax
// ---------------------------------------------------------------------------

// IFRS 16 Lease Accounting
export const FI_LEASE_CREATE = 'fi:lease:create' as const;
export const FI_LEASE_READ   = 'fi:lease:read'   as const;
export const FI_LEASE_UPDATE = 'fi:lease:update'  as const;

// Parallel Accounting
export const GL_PARALLEL_CREATE = 'gl:parallel:create' as const;
export const GL_PARALLEL_READ   = 'gl:parallel:read'   as const;

// e-Tax Invoice XML
export const AR_ETAX_GENERATE = 'ar:etax:generate' as const;

// Revenue Recognition (IFRS 15)
export const REV_CONTRACT_CREATE = 'rev:contract:create' as const;
export const REV_CONTRACT_READ   = 'rev:contract:read'   as const;
export const REV_CONTRACT_UPDATE = 'rev:contract:update'  as const;
export const REV_RECOGNIZE       = 'rev:recognize'        as const;

// e-WHT Filing
export const FI_WHT_EFILE = 'fi:wht:efile' as const;

// Deferred Tax
export const TAX_DEFERRED_CREATE = 'tax:deferred:create' as const;
export const TAX_DEFERRED_READ   = 'tax:deferred:read'   as const;
export const TAX_DEFERRED_UPDATE = 'tax:deferred:update'  as const;

// Bank Payment File Generation
export const AP_BANK_FILE_GENERATE = 'ap:bank-file:generate' as const;

// ---------------------------------------------------------------------------
// ESS (Employee Self-Service)
// ---------------------------------------------------------------------------

export const ESS_PROFILE_READ    = 'ess:profile:read'    as const;
export const ESS_PROFILE_UPDATE  = 'ess:profile:update'  as const;
export const ESS_PAYSLIP_READ    = 'ess:payslip:read'    as const;
export const ESS_LEAVE_READ      = 'ess:leave:read'      as const;
export const ESS_LEAVE_REQUEST   = 'ess:leave:request'   as const;
export const ESS_ATTENDANCE_READ = 'ess:attendance:read'  as const;

// ---------------------------------------------------------------------------
// MSS (Manager Self-Service)
// ---------------------------------------------------------------------------

export const MSS_TEAM_READ       = 'mss:team:read'       as const;
export const MSS_APPROVAL_MANAGE = 'mss:approval:manage' as const;

// ---------------------------------------------------------------------------
// Travel & Expense Management
// ---------------------------------------------------------------------------

export const HR_TRAVEL_CREATE  = 'hr:travel:create'  as const;
export const HR_TRAVEL_READ    = 'hr:travel:read'    as const;
export const HR_TRAVEL_APPROVE = 'hr:travel:approve' as const;
export const HR_EXPENSE_CREATE = 'hr:expense:create' as const;
export const HR_EXPENSE_READ   = 'hr:expense:read'   as const;
export const HR_EXPENSE_APPROVE = 'hr:expense:approve' as const;

// ---------------------------------------------------------------------------
// Recruitment / ATS
// ---------------------------------------------------------------------------

export const HR_RECRUITMENT_CREATE = 'hr:recruitment:create' as const;
export const HR_RECRUITMENT_READ   = 'hr:recruitment:read'   as const;
export const HR_RECRUITMENT_UPDATE = 'hr:recruitment:update' as const;
export const HR_RECRUITMENT_MANAGE = 'hr:recruitment:manage' as const;

// ---------------------------------------------------------------------------
// Performance & Goals
// ---------------------------------------------------------------------------

export const HR_PERFORMANCE_CREATE = 'hr:performance:create' as const;
export const HR_PERFORMANCE_READ   = 'hr:performance:read'   as const;
export const HR_PERFORMANCE_UPDATE = 'hr:performance:update' as const;

// ---------------------------------------------------------------------------
// Compensation Management
// ---------------------------------------------------------------------------

export const HR_COMPENSATION_CREATE  = 'hr:compensation:create'  as const;
export const HR_COMPENSATION_READ    = 'hr:compensation:read'    as const;
export const HR_COMPENSATION_APPROVE = 'hr:compensation:approve' as const;

// ---------------------------------------------------------------------------
// Benefits Administration
// ---------------------------------------------------------------------------

export const HR_BENEFIT_CREATE = 'hr:benefit:create' as const;
export const HR_BENEFIT_READ   = 'hr:benefit:read'   as const;
export const HR_BENEFIT_UPDATE = 'hr:benefit:update' as const;

// ---------------------------------------------------------------------------
// Shift Scheduling
// ---------------------------------------------------------------------------

export const HR_SHIFT_CREATE = 'hr:shift:create' as const;
export const HR_SHIFT_READ   = 'hr:shift:read'   as const;
export const HR_SHIFT_UPDATE = 'hr:shift:update' as const;
export const HR_SHIFT_ASSIGN = 'hr:shift:assign' as const;

// ---------------------------------------------------------------------------
// GRC / SoD
// ---------------------------------------------------------------------------

export const GRC_SOD_CREATE = 'grc:sod:create' as const;
export const GRC_SOD_READ   = 'grc:sod:read'   as const;
export const GRC_SOD_CHECK  = 'grc:sod:check'  as const;
export const REPORT_SOD_READ = 'report:sod:read' as const;

// ---------------------------------------------------------------------------
// Document Management System (DMS)
// ---------------------------------------------------------------------------

export const DMS_DOCUMENT_CREATE = 'dms:document:create' as const;
export const DMS_DOCUMENT_READ   = 'dms:document:read'   as const;
export const DMS_DOCUMENT_DELETE = 'dms:document:delete' as const;

// ---------------------------------------------------------------------------
// EDI (Electronic Data Interchange)
// ---------------------------------------------------------------------------

export const EDI_MESSAGE_CREATE = 'edi:message:create' as const;
export const EDI_MESSAGE_READ   = 'edi:message:read'   as const;

// ---------------------------------------------------------------------------
// Data Archiving / Retention
// ---------------------------------------------------------------------------

export const SYS_ARCHIVE_MANAGE = 'sys:archive:manage' as const;
export const SYS_ARCHIVE_RUN    = 'sys:archive:run'    as const;

// ---------------------------------------------------------------------------
// Master Data Governance (MDG)
// ---------------------------------------------------------------------------

export const MDG_REQUEST_CREATE  = 'mdg:request:create'  as const;
export const MDG_REQUEST_READ    = 'mdg:request:read'    as const;
export const MDG_REQUEST_APPROVE = 'mdg:request:approve' as const;

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
  | typeof DASHBOARD_CONFIG_READ
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
  | typeof AI_CATEGORIZE_EXECUTE
  | typeof AI_PARSE_EXECUTE
  | typeof REPORT_CUSTOM_CREATE
  | typeof REPORT_CUSTOM_READ
  | typeof REPORT_CUSTOM_RUN
  // Manufacturing / PP
  | typeof PP_BOM_CREATE
  | typeof PP_BOM_READ
  | typeof PP_BOM_UPDATE
  | typeof PP_BOM_DELETE
  | typeof PP_WORK_CENTER_CREATE
  | typeof PP_WORK_CENTER_READ
  | typeof PP_WORK_CENTER_UPDATE
  | typeof PP_WORK_CENTER_DELETE
  | typeof PP_PRODUCTION_CREATE
  | typeof PP_PRODUCTION_READ
  | typeof PP_PRODUCTION_UPDATE
  | typeof PP_MRP_RUN
  // PP Gap
  | typeof PP_CAPACITY_READ
  | typeof PP_KANBAN_CREATE
  | typeof PP_KANBAN_READ
  | typeof PP_KANBAN_UPDATE
  | typeof PP_KANBAN_TRIGGER
  | typeof PP_PROC_ORDER_CREATE
  | typeof PP_PROC_ORDER_READ
  | typeof PP_PROC_ORDER_UPDATE
  | typeof PP_OUTPUT_CREATE
  | typeof PP_OUTPUT_READ
  | typeof PP_OUTPUT_UPDATE
  | typeof PP_ECM_CREATE
  | typeof PP_ECM_READ
  | typeof PP_ECM_APPROVE
  | typeof PP_ECM_IMPLEMENT
  | typeof PP_DEMAND_CREATE
  | typeof PP_DEMAND_READ
  | typeof PP_DEMAND_UPDATE
  // MM Purchasing Gaps
  | typeof MM_CONTRACT_CREATE
  | typeof MM_CONTRACT_READ
  | typeof MM_CONTRACT_UPDATE
  | typeof MM_CONTRACT_RELEASE
  | typeof MM_SCHED_CREATE
  | typeof MM_SCHED_READ
  | typeof MM_SCHED_UPDATE
  | typeof MM_STO_CREATE
  | typeof MM_STO_READ
  | typeof MM_STO_UPDATE
  | typeof MM_SRC_LIST_CREATE
  | typeof MM_SRC_LIST_READ
  | typeof MM_SRC_LIST_UPDATE
  | typeof MM_CONSIGN_CREATE
  | typeof MM_CONSIGN_READ
  | typeof MM_CONSIGN_UPDATE
  // Foreign Trade
  | typeof FT_DECLARATION_CREATE
  | typeof FT_DECLARATION_READ
  | typeof FT_DECLARATION_UPDATE
  | typeof FT_DECLARATION_DELETE
  | typeof FT_DECLARATION_SUBMIT
  | typeof FT_DECLARATION_CLEAR
  | typeof FT_LC_CREATE
  | typeof FT_LC_READ
  | typeof FT_LC_UPDATE
  | typeof FT_LC_DELETE
  | typeof FT_LC_ISSUE
  | typeof FT_LC_NEGOTIATE
  | typeof FT_LC_SETTLE
  | typeof FT_LC_CANCEL
  | typeof FT_LANDED_CREATE
  | typeof FT_LANDED_READ
  // Project System
  | typeof PS_PROJECT_CREATE
  | typeof PS_PROJECT_READ
  | typeof PS_PROJECT_UPDATE
  | typeof PS_TIME_CREATE
  | typeof PS_TIME_READ
  | typeof PS_TIME_APPROVE
  | typeof PS_EXPENSE_CREATE
  | typeof PS_EXPENSE_READ
  | typeof PS_EXPENSE_APPROVE
  // Quality Management
  | typeof QM_INSPECTION_CREATE
  | typeof QM_INSPECTION_READ
  | typeof QM_INSPECTION_UPDATE
  | typeof QM_CERT_CREATE
  | typeof QM_CERT_READ
  | typeof QM_CERT_UPDATE
  | typeof QM_BOI_CREATE
  | typeof QM_BOI_READ
  // Plant Maintenance
  | typeof PM_EQUIPMENT_CREATE
  | typeof PM_EQUIPMENT_READ
  | typeof PM_EQUIPMENT_UPDATE
  | typeof PM_PLAN_CREATE
  | typeof PM_PLAN_READ
  | typeof PM_PLAN_UPDATE
  | typeof PM_ORDER_CREATE
  | typeof PM_ORDER_READ
  | typeof PM_ORDER_UPDATE
  | typeof PM_ORDER_CLOSE
  // Service Procurement
  | typeof AP_SERVICE_CREATE
  | typeof AP_SERVICE_READ
  | typeof AP_SERVICE_UPDATE
  | typeof AP_SERVICE_APPROVE
  // CO-PA
  | typeof REPORT_PROFITABILITY_READ
  // ATP
  | typeof INV_ATP_READ
  // Module Management
  | typeof MODULE_MANAGE
  // SAP-gap Phase 1
  | typeof AP_BATCH_PAYMENT_CREATE
  | typeof AP_BATCH_PAYMENT_READ
  | typeof AP_BATCH_PAYMENT_EXECUTE
  | typeof AR_COLLECTION_READ
  | typeof AR_COLLECTION_MANAGE
  | typeof AR_DOWN_PAYMENT_CREATE
  | typeof AR_DOWN_PAYMENT_MANAGE
  | typeof AP_DOWN_PAYMENT_CREATE
  | typeof AP_DOWN_PAYMENT_MANAGE
  // SAP-gap Phase 2 — FI
  | typeof FI_ASSET_CAPITALIZE
  | typeof FI_BANK_IMPORT_MT940
  | typeof AP_VENDOR_EVALUATE
  | typeof AR_INTEREST_RUN
  | typeof AR_DISPUTE_CREATE
  | typeof AR_DISPUTE_READ
  | typeof AR_DISPUTE_RESOLVE
  | typeof AR_PAYMENT_ADVICE_PROCESS
  | typeof FI_CLOSING_MANAGE
  | typeof FI_CLOSING_READ
  | typeof REPORT_CONTRIBUTION_MARGIN_READ
  // SAP-gap Phase 2 — CO
  | typeof CO_STANDARD_COST_CALCULATE
  | typeof CO_STANDARD_COST_READ
  | typeof CO_ACTUAL_COST_RUN
  | typeof CO_ACTUAL_COST_READ
  | typeof CO_WIP_CALCULATE
  | typeof CO_WIP_READ
  | typeof CO_ALLOCATION_MANAGE
  | typeof CO_ALLOCATION_RUN
  | typeof CO_INTERNAL_ORDER_CREATE
  | typeof CO_INTERNAL_ORDER_READ
  | typeof CO_INTERNAL_ORDER_UPDATE
  | typeof CO_INTERNAL_ORDER_SETTLE
  | typeof CO_TRANSFER_PRICING_MANAGE
  | typeof CO_TRANSFER_PRICING_READ
  // CRITICAL Compliance
  | typeof FI_LEASE_CREATE
  | typeof FI_LEASE_READ
  | typeof FI_LEASE_UPDATE
  | typeof GL_PARALLEL_CREATE
  | typeof GL_PARALLEL_READ
  | typeof AR_ETAX_GENERATE
  | typeof REV_CONTRACT_CREATE
  | typeof REV_CONTRACT_READ
  | typeof REV_CONTRACT_UPDATE
  | typeof REV_RECOGNIZE
  | typeof FI_WHT_EFILE
  | typeof TAX_DEFERRED_CREATE
  | typeof TAX_DEFERRED_READ
  | typeof TAX_DEFERRED_UPDATE
  | typeof AP_BANK_FILE_GENERATE
  // ESS / MSS
  | typeof ESS_PROFILE_READ
  | typeof ESS_PROFILE_UPDATE
  | typeof ESS_PAYSLIP_READ
  | typeof ESS_LEAVE_READ
  | typeof ESS_LEAVE_REQUEST
  | typeof ESS_ATTENDANCE_READ
  | typeof MSS_TEAM_READ
  | typeof MSS_APPROVAL_MANAGE
  // Travel & Expense
  | typeof HR_TRAVEL_CREATE
  | typeof HR_TRAVEL_READ
  | typeof HR_TRAVEL_APPROVE
  | typeof HR_EXPENSE_CREATE
  | typeof HR_EXPENSE_READ
  | typeof HR_EXPENSE_APPROVE
  // Recruitment
  | typeof HR_RECRUITMENT_CREATE
  | typeof HR_RECRUITMENT_READ
  | typeof HR_RECRUITMENT_UPDATE
  | typeof HR_RECRUITMENT_MANAGE
  // Performance
  | typeof HR_PERFORMANCE_CREATE
  | typeof HR_PERFORMANCE_READ
  | typeof HR_PERFORMANCE_UPDATE
  // Compensation
  | typeof HR_COMPENSATION_CREATE
  | typeof HR_COMPENSATION_READ
  | typeof HR_COMPENSATION_APPROVE
  // Benefits
  | typeof HR_BENEFIT_CREATE
  | typeof HR_BENEFIT_READ
  | typeof HR_BENEFIT_UPDATE
  // Shifts
  | typeof HR_SHIFT_CREATE
  | typeof HR_SHIFT_READ
  | typeof HR_SHIFT_UPDATE
  | typeof HR_SHIFT_ASSIGN
  // GRC / SoD
  | typeof GRC_SOD_CREATE
  | typeof GRC_SOD_READ
  | typeof GRC_SOD_CHECK
  | typeof REPORT_SOD_READ
  // DMS
  | typeof DMS_DOCUMENT_CREATE
  | typeof DMS_DOCUMENT_READ
  | typeof DMS_DOCUMENT_DELETE
  // EDI
  | typeof EDI_MESSAGE_CREATE
  | typeof EDI_MESSAGE_READ
  // Archive
  | typeof SYS_ARCHIVE_MANAGE
  | typeof SYS_ARCHIVE_RUN
  // MDG
  | typeof MDG_REQUEST_CREATE
  | typeof MDG_REQUEST_READ
  | typeof MDG_REQUEST_APPROVE;

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
  DASHBOARD_CONFIG_READ,
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
  AI_CATEGORIZE_EXECUTE,
  AI_PARSE_EXECUTE,
  REPORT_CUSTOM_CREATE,
  REPORT_CUSTOM_READ,
  REPORT_CUSTOM_RUN,
  // Manufacturing / PP
  PP_BOM_CREATE,
  PP_BOM_READ,
  PP_BOM_UPDATE,
  PP_BOM_DELETE,
  PP_WORK_CENTER_CREATE,
  PP_WORK_CENTER_READ,
  PP_WORK_CENTER_UPDATE,
  PP_WORK_CENTER_DELETE,
  PP_PRODUCTION_CREATE,
  PP_PRODUCTION_READ,
  PP_PRODUCTION_UPDATE,
  PP_MRP_RUN,
  // PP Gap
  PP_CAPACITY_READ,
  PP_KANBAN_CREATE, PP_KANBAN_READ, PP_KANBAN_UPDATE, PP_KANBAN_TRIGGER,
  PP_PROC_ORDER_CREATE, PP_PROC_ORDER_READ, PP_PROC_ORDER_UPDATE,
  PP_OUTPUT_CREATE, PP_OUTPUT_READ, PP_OUTPUT_UPDATE,
  PP_ECM_CREATE, PP_ECM_READ, PP_ECM_APPROVE, PP_ECM_IMPLEMENT,
  PP_DEMAND_CREATE, PP_DEMAND_READ, PP_DEMAND_UPDATE,
  // MM Purchasing Gaps
  MM_CONTRACT_CREATE, MM_CONTRACT_READ, MM_CONTRACT_UPDATE, MM_CONTRACT_RELEASE,
  MM_SCHED_CREATE, MM_SCHED_READ, MM_SCHED_UPDATE,
  MM_STO_CREATE, MM_STO_READ, MM_STO_UPDATE,
  MM_SRC_LIST_CREATE, MM_SRC_LIST_READ, MM_SRC_LIST_UPDATE,
  MM_CONSIGN_CREATE, MM_CONSIGN_READ, MM_CONSIGN_UPDATE,
  // Foreign Trade
  FT_DECLARATION_CREATE,
  FT_DECLARATION_READ,
  FT_DECLARATION_UPDATE,
  FT_DECLARATION_DELETE,
  FT_DECLARATION_SUBMIT,
  FT_DECLARATION_CLEAR,
  FT_LC_CREATE,
  FT_LC_READ,
  FT_LC_UPDATE,
  FT_LC_DELETE,
  FT_LC_ISSUE,
  FT_LC_NEGOTIATE,
  FT_LC_SETTLE,
  FT_LC_CANCEL,
  FT_LANDED_CREATE,
  FT_LANDED_READ,
  // Project System
  PS_PROJECT_CREATE,
  PS_PROJECT_READ,
  PS_PROJECT_UPDATE,
  PS_TIME_CREATE,
  PS_TIME_READ,
  PS_TIME_APPROVE,
  PS_EXPENSE_CREATE,
  PS_EXPENSE_READ,
  PS_EXPENSE_APPROVE,
  // Quality Management
  QM_INSPECTION_CREATE,
  QM_INSPECTION_READ,
  QM_INSPECTION_UPDATE,
  QM_CERT_CREATE,
  QM_CERT_READ,
  QM_CERT_UPDATE,
  QM_BOI_CREATE,
  QM_BOI_READ,
  // Plant Maintenance
  PM_EQUIPMENT_CREATE,
  PM_EQUIPMENT_READ,
  PM_EQUIPMENT_UPDATE,
  PM_PLAN_CREATE,
  PM_PLAN_READ,
  PM_PLAN_UPDATE,
  PM_ORDER_CREATE,
  PM_ORDER_READ,
  PM_ORDER_UPDATE,
  PM_ORDER_CLOSE,
  // Service Procurement
  AP_SERVICE_CREATE,
  AP_SERVICE_READ,
  AP_SERVICE_UPDATE,
  AP_SERVICE_APPROVE,
  // CO-PA
  REPORT_PROFITABILITY_READ,
  // ATP
  INV_ATP_READ,
  // Module Management
  MODULE_MANAGE,
  // SAP-gap Phase 1
  AP_BATCH_PAYMENT_CREATE,
  AP_BATCH_PAYMENT_READ,
  AP_BATCH_PAYMENT_EXECUTE,
  AR_COLLECTION_READ,
  AR_COLLECTION_MANAGE,
  AR_DOWN_PAYMENT_CREATE,
  AR_DOWN_PAYMENT_MANAGE,
  AP_DOWN_PAYMENT_CREATE,
  AP_DOWN_PAYMENT_MANAGE,
  // SAP-gap Phase 2 — FI
  FI_ASSET_CAPITALIZE,
  FI_BANK_IMPORT_MT940,
  AP_VENDOR_EVALUATE,
  AR_INTEREST_RUN,
  AR_DISPUTE_CREATE,
  AR_DISPUTE_READ,
  AR_DISPUTE_RESOLVE,
  AR_PAYMENT_ADVICE_PROCESS,
  FI_CLOSING_MANAGE,
  FI_CLOSING_READ,
  REPORT_CONTRIBUTION_MARGIN_READ,
  // SAP-gap Phase 2 — CO
  CO_STANDARD_COST_CALCULATE,
  CO_STANDARD_COST_READ,
  CO_ACTUAL_COST_RUN,
  CO_ACTUAL_COST_READ,
  CO_WIP_CALCULATE,
  CO_WIP_READ,
  CO_ALLOCATION_MANAGE,
  CO_ALLOCATION_RUN,
  CO_INTERNAL_ORDER_CREATE,
  CO_INTERNAL_ORDER_READ,
  CO_INTERNAL_ORDER_UPDATE,
  CO_INTERNAL_ORDER_SETTLE,
  CO_TRANSFER_PRICING_MANAGE,
  CO_TRANSFER_PRICING_READ,
  // CRITICAL Compliance
  FI_LEASE_CREATE,
  FI_LEASE_READ,
  FI_LEASE_UPDATE,
  GL_PARALLEL_CREATE,
  GL_PARALLEL_READ,
  AR_ETAX_GENERATE,
  REV_CONTRACT_CREATE,
  REV_CONTRACT_READ,
  REV_CONTRACT_UPDATE,
  REV_RECOGNIZE,
  FI_WHT_EFILE,
  TAX_DEFERRED_CREATE,
  TAX_DEFERRED_READ,
  TAX_DEFERRED_UPDATE,
  AP_BANK_FILE_GENERATE,
  // ESS / MSS
  ESS_PROFILE_READ,
  ESS_PROFILE_UPDATE,
  ESS_PAYSLIP_READ,
  ESS_LEAVE_READ,
  ESS_LEAVE_REQUEST,
  ESS_ATTENDANCE_READ,
  MSS_TEAM_READ,
  MSS_APPROVAL_MANAGE,
  // Travel & Expense
  HR_TRAVEL_CREATE,
  HR_TRAVEL_READ,
  HR_TRAVEL_APPROVE,
  HR_EXPENSE_CREATE,
  HR_EXPENSE_READ,
  HR_EXPENSE_APPROVE,
  // Recruitment
  HR_RECRUITMENT_CREATE,
  HR_RECRUITMENT_READ,
  HR_RECRUITMENT_UPDATE,
  HR_RECRUITMENT_MANAGE,
  // Performance
  HR_PERFORMANCE_CREATE,
  HR_PERFORMANCE_READ,
  HR_PERFORMANCE_UPDATE,
  // Compensation
  HR_COMPENSATION_CREATE,
  HR_COMPENSATION_READ,
  HR_COMPENSATION_APPROVE,
  // Benefits
  HR_BENEFIT_CREATE,
  HR_BENEFIT_READ,
  HR_BENEFIT_UPDATE,
  // Shifts
  HR_SHIFT_CREATE,
  HR_SHIFT_READ,
  HR_SHIFT_UPDATE,
  HR_SHIFT_ASSIGN,
  // GRC / SoD
  GRC_SOD_CREATE,
  GRC_SOD_READ,
  GRC_SOD_CHECK,
  REPORT_SOD_READ,
  // DMS
  DMS_DOCUMENT_CREATE,
  DMS_DOCUMENT_READ,
  DMS_DOCUMENT_DELETE,
  // EDI
  EDI_MESSAGE_CREATE,
  EDI_MESSAGE_READ,
  // Archive
  SYS_ARCHIVE_MANAGE,
  SYS_ARCHIVE_RUN,
  // MDG
  MDG_REQUEST_CREATE,
  MDG_REQUEST_READ,
  MDG_REQUEST_APPROVE,
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
  // Dashboard & Reports
  DASHBOARD_CONFIG_READ,
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
  // Manufacturing / PP
  PP_BOM_CREATE,
  PP_BOM_READ,
  PP_BOM_UPDATE,
  PP_WORK_CENTER_READ,
  PP_PRODUCTION_CREATE,
  PP_PRODUCTION_READ,
  PP_PRODUCTION_UPDATE,
  PP_MRP_RUN,
  PP_CAPACITY_READ,
  PP_KANBAN_READ,
  PP_PROC_ORDER_READ,
  PP_OUTPUT_READ,
  PP_ECM_READ,
  PP_DEMAND_READ,
  MM_CONTRACT_READ,
  MM_SCHED_READ,
  MM_STO_READ,
  MM_SRC_LIST_READ,
  MM_CONSIGN_READ,
  // Foreign Trade
  FT_DECLARATION_CREATE,
  FT_DECLARATION_READ,
  FT_DECLARATION_UPDATE,
  FT_DECLARATION_SUBMIT,
  FT_DECLARATION_CLEAR,
  FT_LC_CREATE,
  FT_LC_READ,
  FT_LC_UPDATE,
  FT_LC_ISSUE,
  FT_LC_NEGOTIATE,
  FT_LC_SETTLE,
  FT_LANDED_CREATE,
  FT_LANDED_READ,
  // Project System
  PS_PROJECT_CREATE,
  PS_PROJECT_READ,
  PS_PROJECT_UPDATE,
  PS_TIME_CREATE,
  PS_TIME_READ,
  PS_TIME_APPROVE,
  PS_EXPENSE_CREATE,
  PS_EXPENSE_READ,
  PS_EXPENSE_APPROVE,
  // Quality Management
  QM_INSPECTION_CREATE,
  QM_INSPECTION_READ,
  QM_INSPECTION_UPDATE,
  QM_CERT_CREATE,
  QM_CERT_READ,
  QM_CERT_UPDATE,
  QM_BOI_READ,
  // Plant Maintenance
  PM_EQUIPMENT_READ,
  PM_PLAN_READ,
  PM_ORDER_CREATE,
  PM_ORDER_READ,
  PM_ORDER_UPDATE,
  // Service Procurement
  AP_SERVICE_CREATE,
  AP_SERVICE_READ,
  AP_SERVICE_UPDATE,
  // CO-PA
  REPORT_PROFITABILITY_READ,
  // ATP
  INV_ATP_READ,
  // SAP-gap Phase 1
  AP_BATCH_PAYMENT_CREATE,
  AP_BATCH_PAYMENT_READ,
  AP_BATCH_PAYMENT_EXECUTE,
  AR_COLLECTION_READ,
  AR_COLLECTION_MANAGE,
  AR_DOWN_PAYMENT_CREATE,
  AR_DOWN_PAYMENT_MANAGE,
  AP_DOWN_PAYMENT_CREATE,
  AP_DOWN_PAYMENT_MANAGE,
  // SAP-gap Phase 2 — FI
  FI_ASSET_CAPITALIZE,
  FI_BANK_IMPORT_MT940,
  AP_VENDOR_EVALUATE,
  AR_INTEREST_RUN,
  AR_DISPUTE_CREATE,
  AR_DISPUTE_READ,
  AR_DISPUTE_RESOLVE,
  AR_PAYMENT_ADVICE_PROCESS,
  FI_CLOSING_MANAGE,
  FI_CLOSING_READ,
  REPORT_CONTRIBUTION_MARGIN_READ,
  // SAP-gap Phase 2 — CO
  CO_STANDARD_COST_CALCULATE,
  CO_STANDARD_COST_READ,
  CO_ACTUAL_COST_RUN,
  CO_ACTUAL_COST_READ,
  CO_WIP_CALCULATE,
  CO_WIP_READ,
  CO_ALLOCATION_MANAGE,
  CO_ALLOCATION_RUN,
  CO_INTERNAL_ORDER_CREATE,
  CO_INTERNAL_ORDER_READ,
  CO_INTERNAL_ORDER_UPDATE,
  CO_INTERNAL_ORDER_SETTLE,
  CO_TRANSFER_PRICING_READ,
  // CRITICAL Compliance
  FI_LEASE_CREATE,
  FI_LEASE_READ,
  FI_LEASE_UPDATE,
  GL_PARALLEL_CREATE,
  GL_PARALLEL_READ,
  AR_ETAX_GENERATE,
  REV_CONTRACT_CREATE,
  REV_CONTRACT_READ,
  REV_CONTRACT_UPDATE,
  REV_RECOGNIZE,
  FI_WHT_EFILE,
  TAX_DEFERRED_CREATE,
  TAX_DEFERRED_READ,
  TAX_DEFERRED_UPDATE,
  AP_BANK_FILE_GENERATE,
  // HR Self-Service & Operations
  HR_TRAVEL_CREATE,
  HR_TRAVEL_READ,
  HR_EXPENSE_CREATE,
  HR_EXPENSE_READ,
  HR_RECRUITMENT_READ,
  HR_PERFORMANCE_READ,
  HR_COMPENSATION_READ,
  HR_BENEFIT_READ,
  HR_SHIFT_READ,
  GRC_SOD_READ,
  DMS_DOCUMENT_CREATE,
  DMS_DOCUMENT_READ,
  EDI_MESSAGE_READ,
  MDG_REQUEST_CREATE,
  MDG_REQUEST_READ,
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
