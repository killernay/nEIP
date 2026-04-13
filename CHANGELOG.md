# Changelog

## [1.0.0-beta] - 2026-04-13

### Added — SAP Full Parity (91 features)

#### Foundation System
- Module Toggle System: 23 modules with dependency graph, per-tenant activation/deactivation
- Onboarding Wizard: 6-step self-service (company → template → modules → structure → users → go-live)
- 7 Industry Templates: Retail, Manufacturing, Food & Beverage, Services, Construction, Trading, Distribution
- Enterprise Structure: Company → Branch → Warehouse hierarchy, Sales Channels
- Role-Based UI: 8 role templates, /ui/config endpoint, sidebar auto-filtering

#### IFRS / Compliance (9 features)
- IFRS 16 Lease Accounting: ROU asset + liability + amortization schedule + monthly JE
- Parallel Accounting: IFRS + Thai GAAP + TFRS for NPAEs simultaneous ledgers
- e-Tax Invoice XML: UBL 2.1 per Thai ETDA schema
- PromptPay B2B + BAHTNET + SCB/KBank/BBL payment file generation
- Revenue Recognition IFRS 15: contracts + performance obligations + 5-step model
- e-WHT filing data for Revenue Department e-Filing
- Deferred Tax calculation (DTA/DTL) with JE posting

#### Finance & Controlling (15 features)
- Batch Payment Run (SAP F110): propose → execute with bank file
- Collections Management: worklist, promise-to-pay, dashboard, escalation
- Down Payments (AR + AP): advance tracking with JE + clearing against invoices
- Pro-Forma Invoice: create + convert to standard
- Asset Under Construction (AuC) with capitalization
- MT940 Bank Statement Import
- Vendor Evaluation Scorecard
- Interest on Overdue: auto-calculate + debit notes
- Dispute Management: AR dispute tracking + resolution
- Standard Cost Estimate + Actual Costing / Material Ledger
- WIP Calculation for production orders
- Cost Allocation Cycles: assessment/distribution with rules
- Internal Orders with settlement
- Transfer Pricing for intercompany
- Financial Closing Cockpit: 11-step checklist

#### Sales & Distribution (10 features)
- Rebate Management: volume/value agreements with accrual + settlement
- Free Goods: buy X get Y promotions
- Milestone Billing: project/SO-linked billing plans
- Periodic/Subscription Billing: auto-generate invoices on schedule
- Third-Party Orders (Drop-ship): SO auto-creates vendor PO
- Batch Determination: FEFO/FIFO picking strategies
- Partner Determination: sold-to / ship-to / bill-to / payer
- Output Determination: auto email/print/webhook per document event
- Intercompany Billing
- Serial Number tracking in SD

#### Materials Management + Production (12 features)
- Outline Agreements (purchasing contracts with release orders)
- Scheduling Agreements with delivery schedules
- Stock Transport Orders (inter-branch with accounting)
- Source List (preferred vendor per material)
- Consignment Stock: receive → consume (creates AP) → return
- Special Stocks: project/sales order/consignment types
- Capacity Requirements Planning (CRP): load vs capacity per work center
- Kanban: demand-driven replenishment cards
- Process Orders: recipe-based manufacturing with batch output
- Co-Products / By-Products: multiple outputs per production order
- Engineering Change Management: version-controlled BOM changes
- Demand Management: Planned Independent Requirements for MRP

#### EWM + Project System + Quality (12 features)
- Storage Bins: zone/aisle/rack/level bin-level tracking
- Putaway Strategies: fixed bin, nearest empty, zone-based
- Pick Lists: FIFO/FEFO/LIFO with bin assignments
- Pick/Pack/Ship: shipment workflow with carrier/tracking
- Mobile Scanning API: barcode putaway/pick/count/inquiry
- WBS Elements: multi-level project hierarchy
- Network Activities: predecessor/successor with Gantt support
- Earned Value Management: SPI, CPI, EAC calculations
- Inspection Plans: dynamic frequency with auto-trigger on GR
- CAPA: Corrective & Preventive Action workflow
- Defect Recording: severity/cause codes linked to inspections

#### HR & System (15 features)
- Employee Self-Service (ESS): profile, payslips, leave, attendance
- Manager Self-Service (MSS): team view, pending approvals
- Travel Expense Management: requests + expense claims + settlement
- Recruitment / ATS: job postings, applications, convert-to-employee
- Performance & Goals: OKR/KPI, review cycles, ratings
- Compensation Management: merit/promotion/adjustment proposals
- Benefits Administration: health/life/PF enrollment
- Shift Scheduling: definitions + employee assignments + weekly view
- GRC Access Control (SoD): conflict rules + violation scanning
- Business Partner: unified customer/vendor/employee contact
- Document Management System (DMS): file attachments with versioning
- EDI: inbound/outbound electronic document interchange
- Data Archiving: retention policies + archive/restore
- Master Data Governance: change requests with approval
- Missing permissions migration: all 373 permissions seeded

### Added — Web UI (27 new pages)
- Onboarding wizard, module settings, leases, revenue, parallel accounting
- Collections, down payments, batch payments, closing cockpit
- Manufacturing (BOM, production, MRP), maintenance, maintenance plans
- Trade declarations, letters of credit, services, warehouse bins, picking, shipments
- ESS portal, recruitment, performance, travel expense, shifts
- GRC/SoD, document management

### Added — MCP Tools (60 new, total ~170)
- 25 list + 15 create + 15 action + 5 report tools for all new modules

### Added — CLI Commands (12 new files, total ~100)
- manufacturing, maintenance, leases, revenue, services, ess, recruitment
- performance, travel, grc, dms, enterprise

### Added — Documentation
- Finance manual: +458 lines (IFRS 16, Parallel, IFRS 15, Batch Payment, Collections, etc.)
- Operations manual: +393 lines (PP, PM, Service, EWM, Advanced MM/PP)
- Enterprise manual: +417 lines (Module Toggle, Onboarding, Templates, ESS, GRC, etc.)
- Training guide: +315 lines (Make-to-Stock, Maintenance, Lease, Service flows)

### Fixed
- 13 failing endpoints (nextDocNumber, CHECK constraints, column names, RLS)
- All permissions seeded (373 constants + admin role full access)
- TypeScript 0 errors across all 14 packages

### Stats
- 186 DB tables, ~500+ API endpoints, ~170 MCP tools, ~100 CLI commands
- 140+ Web UI pages, 8 AI agents, 7 industry templates, 23 modules
- 15 Thai business types integration tested (96% pass rate)

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
