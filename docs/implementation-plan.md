# nEIP Implementation Plan — v0.4.0 through v0.9.0

> **Created:** 2026-04-11  
> **Current Version:** v0.3.0 Alpha  
> **Baseline Audit:** 141 working / 53 incomplete / 148 missing features (vs SAP standards)  
> **Goal:** Production-ready Thai SME ERP by v1.0.0

---

## Overview

This plan addresses the 201 incomplete/missing features identified in the SAP-baseline audit. Work is organized into six phases, ordered by business criticality: financial integrity first, then Thai regulatory compliance, then progressively higher-value capabilities.

### Effort Key

| Size | Meaning | Approx. Dev Time |
|------|---------|-----------------|
| **S** | Isolated change, < 1 day | 2-4 hours |
| **M** | Single-module feature, 1-2 days | 1-2 days |
| **L** | Cross-module feature, 3-5 days | 3-5 days |
| **XL** | Major subsystem, 1-2 weeks | 5-10 days |

---

## Phase 1 — Financial Integrity (v0.4.0)

**Timeline:** ~2-3 weeks  
**Goal:** Make the GL trustworthy — every financial transaction must produce correct, balanced journal entries. Fix document flow so the quote-to-cash cycle works end-to-end.

### Features

| # | Feature | Size | Description | Dependencies |
|---|---------|------|-------------|--------------|
| 1.1 | **VAT integration into GL** | L | Input VAT (on purchases) and Output VAT (on sales) auto-post to correct GL accounts. VAT payable/receivable balances must reconcile with tax reports. Wire into invoice/bill create and payment flows. | GL module, Tax package |
| 1.2 | **AR Payment → Journal Entry** | M | When an AR payment is recorded, auto-create a balanced JE: DR Bank, CR Accounts Receivable. Update invoice outstanding balance. Handle partial payments. | GL module, AR module |
| 1.3 | **Document flow: QT → SO conversion** | M | "Convert to Sales Order" action on approved quotations. Copy header + lines, link back via `source_document_id`. Prevent double-conversion. | Sales module |
| 1.4 | **Document flow: SO → DO creation** | M | Generate Delivery Order from SO. Partial delivery support (split lines). Update SO fulfillment status. | Sales module, Inventory |
| 1.5 | **Document flow: DO → INV creation** | M | Generate Invoice from delivered DO lines. Only invoiceable after goods shipped. Link DO → INV for audit trail. | Sales module, AR module |
| 1.6 | **Invoice numbering** | S | Use existing `DocumentNumberingService` for sequential, gap-free invoice numbers. Format: `INV-YYYY-NNNNN`. Configurable per document type. | `packages/core/src/gl/` |
| 1.7 | **Year-end closing** | L | Close fiscal year: block posting to closed periods, calculate retained earnings (Revenue - Expenses → Retained Earnings account), carry forward balance sheet. Reversible re-open for adjustments. | GL module, Fiscal periods |

### Acceptance Criteria Summary

- Every invoice, bill, and payment creates a balanced JE (debits = credits)
- VAT amounts appear in correct GL accounts and match tax module calculations
- Full QT → SO → DO → INV conversion chain works with audit trail
- Invoice numbers are sequential with no gaps within a fiscal year
- Year-end close produces correct retained earnings and prevents stale-period posting

### Risks & Notes

- **VAT integration** touches multiple modules (AR, AP, GL, Tax) — highest risk item. Implement with feature flag for rollback.
- **Document flow** changes need careful handling of partial quantities (partial delivery, partial invoicing).
- `DocumentNumberingService` already exists in `packages/core/src/gl/` — reuse it, don't rebuild.

---

## Phase 2 — Thai Compliance (v0.5.0)

**Timeline:** ~2-3 weeks  
**Goal:** Meet Thai Revenue Department and regulatory requirements. Enable SMEs to file taxes without external tools.

### Features

| # | Feature | Size | Description | Dependencies |
|---|---------|------|-------------|--------------|
| 2.1 | **ภ.พ.30 VAT return report** | L | Monthly VAT return: aggregate output VAT (sales) minus input VAT (purchases). Generate report in Revenue Department format. Support amendment filings. | Phase 1 VAT integration |
| 2.2 | **50 ทวิ annual tax certificate** | M | Withholding tax certificate generation per vendor/payee. Thai format per Revenue Department specification. PDF output with company seal placeholder. | WHT data from AP |
| 2.3 | **e-Tax Invoice generation** | L | Generate XML e-Tax Invoice per ETDA standard (Thai e-Tax Invoice & e-Receipt). Digital signature support. Submit-ready format for Revenue Department. | AR invoices, Company master data |
| 2.4 | **WHT auto-deduction on AP payment** | M | When paying a vendor bill, auto-calculate WHT based on income type (services 3%, rent 5%, etc.). Deduct from payment amount. Create WHT certificate record. | AP payment, Tax package |
| 2.5 | **PDPA data subject rights** | L | Implement access request (export personal data), erasure request (anonymize), and portability (machine-readable export). Consent tracking per data purpose. | All modules with PII |
| 2.6 | **SSC monthly filing report** | M | Social Security Contribution report (สปส. 1-10). Employee/employer contribution calculation at current rates. Export format compatible with SSO e-filing. | HR/Payroll module |

### Acceptance Criteria Summary

- ภ.พ.30 report totals match GL VAT account balances
- 50 ทวิ certificates are printable PDFs with correct tax year data
- e-Tax Invoice XML validates against ETDA schema
- WHT is auto-calculated and deducted; certificates are generated per payment
- PDPA: data subject can request export/deletion via API; erasure anonymizes within 30 days
- SSC report matches payroll deductions

### Risks & Notes

- **e-Tax Invoice** requires understanding ETDA XML schema — may need sample files from Revenue Department.
- **PDPA erasure** must handle cascade across all modules (contacts, invoices, audit logs). Audit logs should be anonymized, not deleted.
- WHT rates change periodically — store in configurable table, not hardcoded.

---

## Phase 3 — Core Business (v0.6.0)

**Timeline:** ~3-4 weeks  
**Goal:** Enable real commercial operations — pricing, payment terms, credit control, and aging analysis.

### Features

| # | Feature | Size | Description | Dependencies |
|---|---------|------|-------------|--------------|
| 3.1 | **Pricing engine** | L | Price lists (standard, VIP, wholesale), quantity discounts, date-based promotions. Price determination: customer-specific → price list → base price. | Sales module, Product master |
| 3.2 | **Payment terms** | M | Define terms (Net 30, Net 60, 2/10 Net 30, COD). Auto-calculate due dates on invoices. Early payment discount tracking. | AR module, AP module |
| 3.3 | **Dunning (overdue notices)** | L | Multi-level dunning: reminder → 1st notice → 2nd notice → legal. Configurable intervals and escalation. Generate dunning letters (PDF). Track dunning history. | AR module, Payment terms |
| 3.4 | **3-way matching** | L | Match Purchase Order ↔ Goods Receipt ↔ Vendor Invoice. Flag discrepancies (quantity, price, total). Block payment until matched or manually overridden. | PO, Inventory (GR), AP |
| 3.5 | **Recurring journal entries** | M | Template-based recurring JEs (monthly rent, depreciation, etc.). Auto-post on schedule with reversal option. | GL module |
| 3.6 | **Credit management** | M | Customer credit limit setting. Real-time credit exposure check (open invoices + open SOs). Block/warn on SO creation when limit exceeded. | AR module, Sales module |
| 3.7 | **AR aging report** | M | Real aging buckets (Current, 1-30, 31-60, 61-90, 90+). Based on invoice due dates, not stub data. Summary and detail views. Export to Excel. | AR module, Payment terms |
| 3.8 | **AP aging report** | M | Same as AR aging but for vendor bills. Track upcoming payment obligations. Cash requirement forecast. | AP module, Payment terms |

### Acceptance Criteria Summary

- Pricing engine resolves correct price through fallback chain
- Payment terms auto-set due dates; early payment discounts calculate correctly
- Dunning generates letters at configured intervals; escalation stops when paid
- 3-way match flags mismatches; clean matches auto-approve
- Recurring JEs post on schedule without manual intervention
- Credit check blocks SO when exposure exceeds limit
- Aging reports match GL sub-ledger balances; buckets are date-accurate

### Risks & Notes

- **Pricing engine** complexity can grow unbounded — keep v1 simple (3 tiers + quantity breaks). No matrix pricing yet.
- **3-way matching** requires Goods Receipt functionality in Inventory module — may need to build GR first if not complete.
- **Dunning** needs email/notification integration — depends on existing `NotificationService` in core.

---

## Phase 4 — Operations (v0.7.0)

**Timeline:** ~3-4 weeks  
**Goal:** Complete the procurement cycle, enable warehouse operations, and deliver functional HR/Payroll.

### Features

| # | Feature | Size | Description | Dependencies |
|---|---------|------|-------------|--------------|
| 4.1 | **Purchase Requisition** | M | Internal purchase request with approval workflow. Convert approved PR → PO. Budget check against CO budget (if Phase 4.8 complete). | Procurement module |
| 4.2 | **Request for Quotation (RFQ)** | M | Send RFQ to multiple vendors. Compare responses. Select winner → create PO. | Procurement module |
| 4.3 | **Physical inventory / Stock count** | L | Create count documents, enter actual quantities, calculate variances. Post inventory adjustments to GL. Support cycle counting. | Inventory module, GL |
| 4.4 | **HR: Org hierarchy & position mgmt** | M | Organization tree (company → department → team). Position definitions with reporting lines. Headcount tracking. | HR module |
| 4.5 | **HR: Attendance tracking** | M | Clock-in/clock-out records. Overtime calculation. Integration with payroll. Absence management. | HR module |
| 4.6 | **Payroll: Bank file generation** | M | Generate payment files in Thai bank formats (SCB, KBank, BBL, BAY). BAHTNET/SMART format support. | Payroll module |
| 4.7 | **Payroll: YTD tax calculation** | M | Cumulative tax calculation per employee. Progressive tax rate application. Mid-year start support. | Payroll module, Tax |
| 4.8 | **Leave management** | L | Accrual rules (X days/year, prorated for new hires). Carry-forward limits. Holiday calendar (Thai public holidays). Balance tracking. | HR module |
| 4.9 | **CO: Budget control** | L | Define budgets per cost center/GL account. Real-time commitment tracking. Block or warn on overspend. Budget vs. actual reporting. | GL module, CO module |
| 4.10 | **CO: Variance analysis** | M | Plan vs. actual comparison. Price variance, quantity variance, spending variance. Drill-down by cost center. | CO module, Budget control |

### Acceptance Criteria Summary

- PR → approval → PO flow works end-to-end
- RFQ comparison shows side-by-side vendor quotes
- Stock count posts adjustments with correct GL impact
- Org chart renders hierarchy; positions link to employees
- Payroll bank files import successfully into test bank portals
- Leave balances calculate correctly with accrual and carry-forward
- Budget control blocks transactions exceeding approved budget

### Risks & Notes

- **Bank file formats** vary by bank — start with top 2 (SCB, KBank), add others later.
- **Budget control** is high-impact (blocks transactions) — must have override mechanism for authorized users.
- **Attendance** may need hardware integration (fingerprint/card readers) — keep API generic, defer hardware-specific adapters.

---

## Phase 5 — Enterprise (v0.8.0)

**Timeline:** ~4-6 weeks  
**Goal:** Support multi-entity operations, multi-currency, and enterprise-grade approval workflows.

### Features

| # | Feature | Size | Description | Dependencies |
|---|---------|------|-------------|--------------|
| 5.1 | **Multi-currency support** | XL | Currency master data, daily exchange rates (manual + API feed from BOT). Transaction currency vs. local currency. FX gain/loss calculation on payment. Month-end revaluation of open items. | GL module, AR, AP |
| 5.2 | **Multi-company / branch** | XL | Company-level data isolation (extend RLS). Intercompany transactions with auto-balancing entries. Consolidation with elimination entries. Branch-level reporting. | All modules |
| 5.3 | **Approval chains** | L | Multi-level approval workflows. Amount-based routing. Delegation (out-of-office). Escalation with SLA. Email/notification on pending approvals. Applicable to PO, PR, JE, payments. | Core module, Notifications |
| 5.4 | **Vendor returns** | M | Return to vendor flow: create return request, ship goods back, receive credit memo. Update inventory and AP. | Procurement, Inventory, AP |
| 5.5 | **Batch / serial tracking** | L | Assign batch or serial numbers at goods receipt. Track through inventory movements. Trace forward (batch → customer) and backward (customer → batch). Expiry date management for batches. | Inventory module |
| 5.6 | **Bank auto-matching rules** | M | Rule engine for bank statement reconciliation: match by amount, reference, date range. Configurable match rules. Auto-create JEs for matched items. | Banking module, GL |
| 5.7 | **Cash flow statement** | L | Direct and indirect method. IFRS/TAS-compliant format. Auto-classify GL movements into operating/investing/financing. Period comparison. | GL module, All sub-ledgers |

### Acceptance Criteria Summary

- Foreign currency invoices show both transaction and local currency amounts
- FX gain/loss posts automatically on payment; revaluation runs at month-end
- Intercompany transactions create mirrored entries in both companies
- Approval chains route correctly based on amount thresholds and org hierarchy
- Batch/serial numbers are traceable across full lifecycle
- Bank matching auto-reconciles > 80% of common transactions
- Cash flow statement balances to bank movement for the period

### Risks & Notes

- **Multi-currency** is the highest-risk item in the entire plan. Exchange rate timing (invoice date vs. payment date vs. month-end) must be precise. Consider a dedicated `CurrencyService`.
- **Multi-company** requires careful RLS extension — current RLS is tenant-level, needs company-level within tenant. Plan schema migration carefully.
- **Approval chains** should use a generic workflow engine, not hardcoded per document type.

---

## Phase 6 — AI & Analytics (v0.9.0)

**Timeline:** ~4-6 weeks  
**Goal:** Leverage the AI-native architecture to deliver intelligent automation and actionable analytics.

### Features

| # | Feature | Size | Description | Dependencies |
|---|---------|------|-------------|--------------|
| 6.1 | **Anomaly detection agent** | L | AI agent monitoring GL entries for unusual patterns: duplicate entries, round-number amounts, off-hours posting, unusual account combinations. Alert via notification. | AI package, GL, Notifications |
| 6.2 | **Cash flow forecasting agent** | L | Predict future cash position based on: AR aging (expected receipts), AP aging (expected payments), recurring entries, seasonal patterns. 30/60/90-day forecast. | AI package, AR, AP, Banking |
| 6.3 | **Smart categorization agent** | M | Auto-categorize imported bank transactions to GL accounts. Learn from user corrections. Suggest matches with confidence scores. | AI package, Banking, GL |
| 6.4 | **Bank auto-reconciliation agent** | M | AI-powered matching for bank reconciliation. Handle partial matches, split transactions, and fuzzy reference matching. Improve with feedback loop. | AI package, Phase 5.6 |
| 6.5 | **NLP document parsing (OCR)** | L | Extract structured data from receipts, invoices, and bills using OCR + LLM. Auto-populate bill/expense forms. Support Thai + English documents. | AI package, AP module |
| 6.6 | **Custom report builder** | XL | Drag-and-drop report designer. Select data sources, dimensions, measures. Filter, group, sort. Save and share reports. Export to PDF/Excel. | All modules |
| 6.7 | **Dashboard drill-down + role-based views** | L | Clickable dashboard widgets that drill into detail. Role-based dashboard layouts (CFO vs. AP clerk vs. sales manager). Configurable KPI cards. | Web app, All modules |
| 6.8 | **Predictive analytics** | L | Revenue forecasting, expense trending, customer churn prediction, inventory demand forecasting. Visual trend charts with confidence intervals. | AI package, Analytics |

### Acceptance Criteria Summary

- Anomaly agent flags at least 90% of injected test anomalies with < 5% false positive rate
- Cash flow forecast is within 15% of actual for 30-day horizon on test data
- Smart categorization achieves > 85% accuracy after 100 training transactions
- OCR correctly extracts amount, date, vendor from 80%+ of Thai receipts
- Report builder can produce equivalent of all existing hardcoded reports
- Dashboards load in < 2 seconds; drill-down navigates to detail views
- Role-based views show only relevant KPIs per role

### Risks & Notes

- **AI features** depend on `packages/ai` — verify current capabilities before building agents.
- **OCR** may need external service (Google Vision, Azure Document Intelligence) — evaluate cost vs. local model.
- **Custom report builder** is XL and could easily scope-creep — define a fixed v1 feature set and stick to it.
- **Predictive analytics** requires historical data — may not be meaningful until the system has been in production for several months. Ship with demo/sample data mode.

---

## Dependency Graph

```
Phase 1 (Financial Integrity)
  └──→ Phase 2 (Thai Compliance)     [2.1 needs 1.1 VAT, 2.4 needs AP payment]
  └──→ Phase 3 (Core Business)       [3.2-3.3 need AR, 3.4 needs PO/GR]
         └──→ Phase 4 (Operations)   [4.1 needs PO, 4.9 needs GL]
                └──→ Phase 5 (Enterprise)  [5.1-5.2 touch all modules]
                       └──→ Phase 6 (AI & Analytics)  [needs stable data layer]
```

Phases 2 and 3 can run **in parallel** after Phase 1 is complete, provided separate teams/developers work on them. Phases 4+ are sequential.

---

## Release Milestones

| Version | Phase | Target | Key Deliverable |
|---------|-------|--------|-----------------|
| v0.4.0 | Financial Integrity | Week 3 | Trustworthy GL, complete document flow |
| v0.5.0 | Thai Compliance | Week 6 | Tax filing ready, PDPA compliant |
| v0.6.0 | Core Business | Week 10 | Commercial operations viable |
| v0.7.0 | Operations | Week 14 | Full procurement + HR/Payroll |
| v0.8.0 | Enterprise | Week 20 | Multi-currency, multi-company |
| v0.9.0 | AI & Analytics | Week 26 | Intelligent automation |
| **v1.0.0** | **GA** | **Week 28** | **Stabilization, docs, migration tools** |

---

## Architecture Notes

- **Monorepo structure:** `packages/core` holds business logic, `packages/db` holds schema, `apps/api` exposes endpoints. New features follow this pattern.
- **Existing services to reuse:** `DocumentNumberingService`, `AuditService`, `NotificationService`, `WebhookService`, `EventStore`, `Money` value object.
- **Testing strategy:** Each feature needs unit tests (in `packages/core`), API integration tests (in `apps/api`), and flow tests (`test_all_flows.sh`). Target: maintain 63+ flow test baseline, add ~5-10 per phase.
- **MCP tools:** Every new business operation must be exposed as an MCP tool (currently 53 tools). This is a core architectural requirement — AI agents interact through MCP.
- **Database migrations:** Use Drizzle ORM migration system. Each phase should have a single migration PR reviewed before feature work begins.
