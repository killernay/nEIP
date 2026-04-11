# Changelog

## [0.9.0] - 2026-04-11

### Added — Phase 6: AI & Analytics
- 6 new AI agents: anomaly detection, cash flow forecast, smart categorization, bank auto-reconciliation, NLP document parsing, predictive analytics
- Custom report builder: select data sources, dimensions, measures, save & run
- Dashboard drill-down: revenue/expense detail views, role-based dashboard configs (CFO/accountant/sales/HR)
- 6 new Web UI pages for AI features (anomaly scan, forecast, categorize, predictions)

## [0.8.0] - 2026-04-11

### Added — Phase 5: Enterprise Features
- Multi-currency: currency master, exchange rates, FX gain/loss, month-end revaluation
- Multi-company/branch: company-level isolation, intercompany transactions with auto-mirror JE, consolidated reporting
- Approval chains: multi-level workflows, amount-based routing, delegation, escalation
- Vendor returns: return flow with stock movement + AP credit
- Batch/serial tracking: assign at GR, trace forward/backward, expiry management
- Bank auto-matching rules: rule engine for reconciliation with auto-JE creation
- Cash flow statement: IFRS/TAS indirect method (operating/investing/financing)
- 12 new DB tables, 37 new API endpoints, 7 new Web UI pages

## [0.7.0] - 2026-04-11

### Added — Phase 4: Operations
- Purchase Requisition: create → approve → convert to PO
- RFQ: send to vendors, compare responses, select winner → create PO
- Physical inventory / stock count: create, enter actuals, post adjustments with GL impact
- HR: org hierarchy (parent departments), position management with headcount
- Attendance tracking: clock in/out, overtime calculation (>8h), daily/monthly summary
- Payroll bank file generation: SCB (pipe-delimited) + KBank (fixed-width) formats
- Payroll YTD tax calculation with cumulative tracking
- Leave management: accrual rules, carry-forward, public holiday calendar, working-days calculator
- CO budget control: warn >90%, block >100% (with override permission)
- CO variance analysis: plan vs actual per account per cost center
- 8 new DB tables, 37 new API endpoints, 7 new Web UI pages

## [0.6.0] - 2026-04-11

### Added — Phase 3: Core Business
- Pricing engine: price lists, price list items, customer-specific pricing, resolve price cascade
- Payment terms: NET30, NET60, COD, 2/10NET30 with auto due-date calculation
- Dunning: multi-level overdue notices with escalation and history tracking
- 3-way matching: PO vs GR vs Bill per-line validation with match override
- Recurring journal entries: template-based auto-posting with frequency scheduling
- Credit management: customer credit exposure check (open invoices + open SOs), warn/block modes
- AR aging report: real aging buckets (current/1-30/31-60/61-90/90+), per-customer breakdown
- AP aging report: vendor bill aging with per-vendor breakdown
- 7 new DB tables, ~20 new API endpoints, 7 new Web UI pages

## [0.5.0] - 2026-04-11

### Added — Phase 2: Thai Compliance
- ภ.พ.30 VAT return report: monthly output - input VAT aggregation
- 50 ทวิ annual tax certificate: per-employee WHT summary with payer/payee info
- e-Tax Invoice: structured JSON generation per ETDA standard (ใบกำกับภาษี T02)
- WHT auto-deduction on AP payment: auto-calculate, deduct from payment, create certificate
- PDPA data subject rights: access request (export PII), erasure request (anonymize), request tracking
- SSC monthly filing report: per-employee SSC breakdown (สปส. 1-10 format)
- 4 new Web UI pages (VAT return, SSC filing, PDPA, 50 ทวิ)

## [0.4.0] - 2026-04-11

### Added — Phase 1: Financial Integrity
- VAT integration into GL: invoice posting creates Dr AR / Cr Revenue / Cr VAT Payable; bill posting creates Dr Expense / Dr Input VAT / Cr AP
- AR payment journal entry: auto-creates Dr Cash / Cr AR on payment, reverses on void
- Document flow: QT → SO conversion (POST /quotations/:id/convert-to-order)
- Document flow: DO → INV conversion (POST /delivery-notes/:id/convert-to-invoice)
- Full SAP-style flow: QT → SO → DO → INV → PAY (with QT → INV shortcut preserved)
- Invoice numbering: DocumentNumberingService across all 16 document types (INV/QT/CN/DO/SO/PO/RC/WHT/BILL/PMT-YYYY-NNNN)
- Year-end closing: close fiscal year with retained earnings carry-forward, reopen with JE reversal

### Changed — Cross-cutting
- MCP Server expanded: 53 → 110 tools (list/create/action/report for all new features)
- CLI expanded: 39 → 89 commands (16 new command files for all new features)
- Web UI expanded: 81 → 113+ pages (32 new pages across all phases)
- E2E tests expanded: 13 → 21 specs (54 new test cases)
- DB schema expanded: 58 → 88+ tables (30+ new tables, 7 new migrations)
- AI agents expanded: 2 → 8 agents (6 new: anomaly, forecast, categorization, bank recon, OCR, predictive)
- All 417 unit tests passing (fixed lazy env loading in @neip/shared)
- Type-check: 14/14 packages pass with zero errors

## [0.3.0] - 2026-03-16

### Added
- MCP Server expanded: 13 → 53 tools (list + create + action + report for all modules)
- 63 business flow tests verified (test_all_flows.sh)

### Fixed
- Invoice void: now accepts posted status + payment guard prevents voiding paid invoices
- CLI: auth login piped stdin TTY detection
- CLI: invoice/payment/bill response shape (items vs data)
- CLI: tax/roles/webhooks flat array handling
- CLI: settings response unwrapping
- CLI: AR paths /ar/invoices → /invoices
- All 34 CLI commands verified passing

## [0.2.0] - 2026-03-16

### Added
- MCP Server (`apps/mcp`) — 13 tools for AI integration via Model Context Protocol
- Architecture diagram + Test plan document (346 test cases)

### Fixed
- Web UI data binding: null safety (BigInt ?? 0), status mapping (void→voided)
- 16 Web UI pages fixed
- Auth hydration: protected layout waits for zustand rehydrate
- Rate limiter: 10,000 req/min in dev mode

### Changed
- Sidebar redesigned: SAP-style grouped menus (bilingual Thai+EN)
- README rewritten: explains EIP vs ERP, pain points, AI-Native approach
- API descriptions: 186/186 endpoints documented in Swagger

## [0.1.0] - 2026-03-15

### Added
- Initial release: 31 ERP modules
- 186 API endpoints (Fastify 5.8)
- 81 Web UI pages (Next.js 15)
- 39 CLI commands (Commander.js)
- 58 DB tables (PostgreSQL 17, RLS multi-tenant)
- Thai compliance: VAT 7%, WHT, SSC, PDPA, TFAC
- Audit trail: auto-log all mutations
- 417 unit tests passing
