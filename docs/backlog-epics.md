# nEIP Backlog & Epics

> **Version**: 0.3.0 Alpha | **Audit Date**: 2026-04-11
> **Total Gaps**: 148 missing + 53 incomplete features vs SAP-level completeness
> **Modules**: 31 | **DB Tables**: 58 | **API Endpoints**: 186

---

## Phase Overview

| Phase | Focus | Timeline Target | Epics |
|-------|-------|-----------------|-------|
| **Phase 1** | Critical Finance Fixes | Weeks 1-4 | EPIC-01, EPIC-02, EPIC-03, EPIC-04 |
| **Phase 2** | Sales & Document Flow | Weeks 5-8 | EPIC-07, EPIC-08, EPIC-09, EPIC-10 |
| **Phase 3** | Operations & Procurement | Weeks 9-14 | EPIC-11, EPIC-12, EPIC-13, EPIC-14 |
| **Phase 4** | HR/Payroll & Compliance | Weeks 15-20 | EPIC-15, EPIC-16, EPIC-17, EPIC-22 |
| **Phase 5** | Infrastructure & Platform | Weeks 21-28 | EPIC-05, EPIC-06, EPIC-19, EPIC-20, EPIC-21 |
| **Phase 6** | Advanced & AI | Weeks 29-36 | EPIC-18, EPIC-23, EPIC-24, EPIC-25, EPIC-26, EPIC-27 |

---

## Finance Domain

---

### EPIC-01: VAT GL Integration
**Priority**: P0 (critical)
**Complexity**: L (1-2 weeks)
**Phase**: 1
**Dependencies**: None (foundational)

**Current State**: VAT is calculated on invoices/bills but never posted to GL accounts. No input/output VAT tracking. No ภ.พ.30 report generation.

#### User Stories

- [ ] As an accountant, I want VAT output to auto-post to the Output VAT GL account when an invoice is posted so that my GL balances reflect tax obligations
  - AC: Posting an invoice with 7% VAT creates a JE line crediting the Output VAT account for the VAT amount
  - AC: The VAT GL account code is configurable per tax rate in tenant settings

- [ ] As an accountant, I want VAT input to auto-post to the Input VAT GL account when a bill is posted so that I can track reclaimable VAT
  - AC: Posting a bill with 7% VAT creates a JE line debiting the Input VAT account
  - AC: Partial VAT recovery scenarios are supported (percentage-based)

- [ ] As an accountant, I want to generate a ภ.พ.30 (VAT return) report for a given tax period so that I can file with the Revenue Department
  - AC: Report aggregates output VAT (sales) minus input VAT (purchases) for the period
  - AC: Output matches Revenue Department ภ.พ.30 form layout
  - AC: Report includes ภ.พ.30 summary and supporting ภ.พ.36 detail schedules

- [ ] As an accountant, I want a VAT reconciliation report comparing VAT GL balances to invoice/bill totals so that I can identify discrepancies
  - AC: Report shows GL VAT balance vs calculated VAT from source documents
  - AC: Discrepancies are highlighted with drill-down to source documents

- [ ] As a system admin, I want to configure VAT GL account mappings per tax rate so that different VAT rates post to correct accounts
  - AC: Settings page allows mapping each tax_rate record to input/output GL accounts
  - AC: Validation prevents posting if VAT GL mapping is missing

#### Technical Notes
- Extend `POST /ar/invoices/:id/post` and `POST /ap/bills/:id/post` to create additional JE lines for VAT
- Add `vat_input_account_id` and `vat_output_account_id` columns to `tax_rates` table
- New report endpoint: `GET /reports/vat-return?period=YYYY-MM`
- Reference: Thai Revenue Department ภ.พ.30 form specification

---

### EPIC-02: AR Enhancements
**Priority**: P0 (critical)
**Complexity**: XL (3+ weeks)
**Phase**: 1
**Dependencies**: EPIC-01

**Current State**: Basic invoice CRUD and payment recording exist. Payments do NOT create journal entries. No credit management, dunning, aging analysis, write-offs, advance payments, or credit note application.

#### User Stories

- [ ] As an accountant, I want AR payments to automatically create journal entries (debit Bank, credit AR) so that my GL stays in sync
  - AC: Recording a payment creates a JE with debit to bank account and credit to AR control account
  - AC: Payment reversal creates a reversing JE
  - AC: Partial payments create proportional JE entries

- [ ] As a credit manager, I want to set credit limits per customer so that I can control credit exposure
  - AC: `credit_limit` field on contacts table for customer type
  - AC: Sales order creation warns when customer exceeds credit limit
  - AC: Invoice posting blocks if credit limit would be exceeded (with override permission)

- [ ] As a credit manager, I want to run a dunning process that generates reminder letters for overdue invoices so that collections are systematic
  - AC: Configurable dunning levels (e.g., 30/60/90 days) with escalating letter templates
  - AC: Dunning run generates letters per customer grouped by dunning level
  - AC: Dunning history is tracked per invoice

- [ ] As a sales user, I want to define payment terms (Net 30, 2/10 Net 30, etc.) and assign them to customers so that due dates are calculated automatically
  - AC: Payment terms table with: days, discount_days, discount_percent
  - AC: Invoice due_date auto-calculated from payment terms
  - AC: Early payment discount is applied and tracked

- [ ] As an accountant, I want an AR aging report (current, 30, 60, 90, 120+ days) so that I can monitor receivables health
  - AC: Report buckets open invoices by days past due
  - AC: Filterable by customer, salesperson, date range
  - AC: Summary and detail views available

- [ ] As an accountant, I want to write off uncollectible receivables so that AR reflects realistic balances
  - AC: Write-off action creates a JE (debit Bad Debt Expense, credit AR)
  - AC: Write-off requires approval above a configurable threshold
  - AC: Written-off invoices are marked and excluded from dunning

- [ ] As a sales user, I want to record advance payments (deposits) from customers before invoicing so that prepayments are tracked
  - AC: Advance payment creates a JE (debit Bank, credit Advance from Customers liability)
  - AC: When invoice is created, advance can be applied to reduce amount due
  - AC: Unapplied advance balance is visible per customer

- [ ] As an accountant, I want to apply credit notes against open invoices so that the net AR balance is correct
  - AC: Credit note can be linked to one or more open invoices
  - AC: Application creates offsetting entries reducing both CN and invoice balances
  - AC: Partial application is supported

- [ ] As an accountant, I want to handle customer debit notes (returns/claims from customer) so that disputed amounts are tracked
  - AC: Debit note document type with line items and reason codes
  - AC: Can be applied against open invoices or refunded

#### Technical Notes
- Modify `POST /ar/payments` to call GL journal entry creation
- New tables: `payment_terms`, `dunning_levels`, `dunning_history`
- Add `credit_limit`, `payment_terms_id` to `contacts` table
- New endpoints: `POST /ar/dunning-run`, `POST /ar/write-off`, `POST /ar/advance-payments`
- New report: `GET /reports/ar-aging`

---

### EPIC-03: AP Enhancements
**Priority**: P1 (high)
**Complexity**: XL (3+ weeks)
**Phase**: 1
**Dependencies**: EPIC-01

**Current State**: Basic bill CRUD and bill payments exist. No batch payments, 3-way matching, payment proposals, vendor evaluation, or debit notes to vendors.

#### User Stories

- [ ] As an AP clerk, I want to run a payment proposal that selects due bills for batch payment so that I can pay vendors efficiently
  - AC: Payment proposal selects bills due within a date range, optionally filtered by vendor
  - AC: Proposal shows total amount, discount available if paid early
  - AC: User can include/exclude individual bills before confirming

- [ ] As an AP clerk, I want to process batch payments (pay multiple vendors in one run) so that payment processing is efficient
  - AC: Batch payment creates individual payment records per vendor
  - AC: Each payment creates corresponding JE entries
  - AC: Batch payment summary report is generated

- [ ] As an AP clerk, I want 3-way matching (PO ↔ GR ↔ Invoice) so that I only pay for goods actually received
  - AC: Bill entry validates against PO quantities and prices
  - AC: Goods receipt (delivery note inbound) quantities are compared
  - AC: Variances beyond tolerance require approval
  - AC: Match status visible: matched, partially matched, unmatched

- [ ] As an AP manager, I want vendor payment terms to auto-calculate due dates on bills so that payment timing is accurate
  - AC: Vendor master has default payment terms
  - AC: Bill due_date calculated from vendor payment terms
  - AC: Early payment discounts tracked and reported

- [ ] As a procurement manager, I want vendor evaluation scoring so that I can assess vendor performance
  - AC: Scoring criteria: delivery timeliness, quality (return rate), price competitiveness
  - AC: Scores calculated automatically from PO/GR/bill data
  - AC: Vendor scorecard report available

- [ ] As an AP clerk, I want to create debit notes to vendors for returns or pricing disputes so that the AP balance is adjusted
  - AC: Vendor debit note document with line items and reason
  - AC: Can be offset against open bills
  - AC: Creates appropriate JE entries

- [ ] As an AP clerk, I want to handle vendor advance payments (prepayments) so that deposits to vendors are tracked
  - AC: Advance payment creates JE (debit Vendor Advance asset, credit Bank)
  - AC: Advance applied against bill when received
  - AC: Open advance balance visible per vendor

- [ ] As an AP manager, I want AP aging report (current, 30, 60, 90+ days) so that I can manage cash outflows
  - AC: Report buckets open bills by days until due and days past due
  - AC: Filterable by vendor, due date range
  - AC: Summary and detail views

#### Technical Notes
- New tables: `payment_proposals`, `payment_proposal_lines`, `vendor_evaluations`
- Add `payment_terms_id` to `vendors` table
- New endpoints: `POST /ap/payment-proposals`, `POST /ap/batch-payments`, `GET /ap/3way-match/:billId`
- New report: `GET /reports/ap-aging`, `GET /reports/vendor-scorecard`
- Link `purchase_orders` → `delivery_notes` (inbound) → `bills` for 3-way match

---

### EPIC-04: GL Enhancements
**Priority**: P1 (high)
**Complexity**: L (1-2 weeks)
**Phase**: 1
**Dependencies**: None

**Current State**: Basic CoA, journal entries, fiscal periods, budgets exist. No recurring JEs, cost allocations, year-end close process, intercompany JEs, or document parking.

#### User Stories

- [ ] As an accountant, I want to create recurring journal entry templates that auto-post on schedule so that monthly entries (rent, depreciation) are automated
  - AC: Template stores JE lines with amounts (fixed or formula-based)
  - AC: Recurrence: monthly, quarterly, annually with start/end dates
  - AC: Auto-posted entries can be reviewed before final posting (optional)

- [ ] As an accountant, I want to allocate costs from one cost center to multiple cost centers by percentage so that shared costs are distributed fairly
  - AC: Allocation rule defines source CC, target CCs with percentages (must sum to 100%)
  - AC: Allocation run creates JE entries moving costs
  - AC: Allocation can be previewed before execution

- [ ] As an accountant, I want a year-end closing process that transfers P&L balances to retained earnings so that the new fiscal year starts clean
  - AC: Close process identifies all income/expense accounts
  - AC: Creates closing JE: debit income accounts, credit expense accounts, net to retained earnings
  - AC: Fiscal year status changes to "closed" preventing further posting
  - AC: Reversing opening entry created in new year for any carry-forward items

- [ ] As an accountant, I want to park (save as draft) journal entries for later review and posting so that entries can go through approval
  - AC: Parked JE has status "parked" — does not affect GL balances
  - AC: Parked JE can be edited, approved, then posted
  - AC: Approval workflow integration (see EPIC-21)

- [ ] As an accountant, I want to reverse a posted journal entry with a single action so that corrections are traceable
  - AC: Reversal creates a new JE with all debits/credits swapped
  - AC: Original and reversal JEs are cross-referenced
  - AC: Reversal can be dated current period or original period

- [ ] As an accountant, I want to create template journal entries that I can reuse so that common entries are quick to create
  - AC: Templates store line patterns without amounts
  - AC: User selects template, enters amounts, posts

- [ ] As a financial controller, I want period-end soft close that prevents non-authorized users from posting to closed periods so that period integrity is maintained
  - AC: Period status: open, soft-close (restricted), hard-close (locked)
  - AC: Soft-close allows posting only with specific permission
  - AC: Hard-close prevents all posting

#### Technical Notes
- New tables: `recurring_je_templates`, `recurring_je_lines`, `allocation_rules`, `allocation_rule_targets`
- Add `status` enum to fiscal_periods: open | soft_closed | hard_closed
- New endpoints: `POST /gl/recurring-templates`, `POST /gl/allocations/run`, `POST /gl/year-end-close`, `POST /gl/journal-entries/:id/park`, `POST /gl/journal-entries/:id/reverse`
- Cron job or scheduled task for recurring JE execution

---

### EPIC-05: Fixed Asset Enhancements
**Priority**: P2 (medium)
**Complexity**: L (1-2 weeks)
**Phase**: 5
**Dependencies**: EPIC-01, EPIC-04

**Current State**: Basic fixed asset register with individual depreciation exists. No mass depreciation run, asset transfers, revaluation, asset under construction (AuC), or disposal with GL posting.

#### User Stories

- [ ] As an accountant, I want to run mass depreciation for all assets in a period so that monthly depreciation is processed efficiently
  - AC: Mass run calculates depreciation for all active assets for the selected period
  - AC: Creates a single summary JE or individual JEs per asset (configurable)
  - AC: Preview mode shows amounts before posting
  - AC: Prevents double-depreciation if period already processed

- [ ] As an accountant, I want to transfer assets between cost centers/departments so that asset assignments reflect organizational changes
  - AC: Transfer updates asset's cost center and creates audit trail
  - AC: No financial impact (same entity) — only reassignment
  - AC: Transfer history maintained on asset record

- [ ] As an accountant, I want to revalue fixed assets (upward/downward) so that asset values reflect fair market value
  - AC: Revaluation adjusts asset's book value and creates JE
  - AC: Revaluation surplus posted to equity (TFAC compliant)
  - AC: Impairment (downward) posted to P&L expense

- [ ] As an accountant, I want to track Assets under Construction (AuC) and capitalize them upon completion so that capital projects are properly accounted
  - AC: AuC asset type does not depreciate
  - AC: Costs can be accumulated against AuC over time
  - AC: Settlement/capitalization converts AuC to depreciable asset with new useful life

- [ ] As an accountant, I want asset disposal to create GL entries (remove asset cost, remove accumulated depreciation, record gain/loss) so that disposals are properly recorded
  - AC: Disposal action calculates gain/loss on sale
  - AC: JE: debit Accum Depreciation, debit Bank/AR (proceeds), credit Asset Cost, credit/debit Gain/Loss
  - AC: Disposed assets marked inactive and excluded from depreciation

- [ ] As an accountant, I want to handle partial asset disposal (split) so that a portion of an asset can be sold
  - AC: Original asset's cost and accumulated depreciation reduced proportionally
  - AC: New disposal record for the partial amount

- [ ] As an auditor, I want an asset register report with NBV, depreciation schedule, and location so that I can verify asset records
  - AC: Report shows: asset ID, description, acquisition date, cost, accum depreciation, NBV, location, responsible person
  - AC: Filterable by class, location, cost center

#### Technical Notes
- Add `asset_status` enum: active | under_construction | disposed
- Add `cost_center_id`, `location`, `responsible_person` to `fixed_assets`
- New table: `asset_transactions` (depreciation runs, transfers, revaluations, disposals)
- New endpoints: `POST /fixed-assets/mass-depreciation`, `POST /fixed-assets/:id/transfer`, `POST /fixed-assets/:id/revalue`, `POST /fixed-assets/:id/dispose`
- Mass depreciation should be a background job for large asset counts

---

### EPIC-06: Bank Enhancements
**Priority**: P2 (medium)
**Complexity**: L (1-2 weeks)
**Phase**: 5
**Dependencies**: EPIC-02, EPIC-03

**Current State**: Basic bank accounts and transactions exist. No statement import (MT940/CSV), auto-matching, cash position report, bank reconciliation, or e-payment file generation.

#### User Stories

- [ ] As an accountant, I want to import bank statements (MT940 or CSV format) so that bank transactions are loaded automatically
  - AC: Upload MT940 file and parse transactions (date, amount, reference, narrative)
  - AC: CSV import with configurable column mapping
  - AC: Duplicate detection based on date + amount + reference

- [ ] As an accountant, I want auto-matching of bank transactions to AR payments and AP payments so that reconciliation is faster
  - AC: Matching rules: exact amount + reference, fuzzy reference matching
  - AC: Matched transactions shown with confidence score
  - AC: User confirms or rejects each match
  - AC: Unmatched transactions flagged for manual review

- [ ] As an accountant, I want a bank reconciliation screen showing book balance vs bank balance with outstanding items so that I can reconcile monthly
  - AC: Shows: bank statement balance, book balance, outstanding deposits, outstanding checks
  - AC: Tick-off outstanding items as they clear
  - AC: Reconciliation can be saved and finalized

- [ ] As a treasurer, I want a cash position report showing balances across all bank accounts so that I can manage liquidity
  - AC: Dashboard showing current balance per bank account
  - AC: Projected cash position based on AR due dates and AP due dates
  - AC: Drill-down to transaction detail per account

- [ ] As an AP clerk, I want to generate e-payment files (BAHTNET/PromptPay format) for batch vendor payments so that payments can be uploaded to banking portals
  - AC: Generate payment file from approved batch payment run
  - AC: File format compliant with Thai banking standards
  - AC: Payment status tracking: generated, uploaded, confirmed

- [ ] As an accountant, I want automatic bank fee recording so that bank charges are captured without manual entry
  - AC: Bank fee transactions identified during import (by transaction code)
  - AC: Auto-create JE debiting bank charges expense

#### Technical Notes
- MT940 parser library (e.g., `mt940-js` or custom parser)
- New tables: `bank_reconciliations`, `bank_reconciliation_items`, `payment_files`
- New endpoints: `POST /bank/import-statement`, `POST /bank/auto-match`, `POST /bank/reconciliation`, `GET /bank/cash-position`, `POST /bank/generate-payment-file`
- Consider background job for auto-matching large statement files

---

## Sales Domain

---

### EPIC-07: Pricing Engine
**Priority**: P0 (critical)
**Complexity**: L (1-2 weeks)
**Phase**: 2
**Dependencies**: None

**Current State**: Manual price entry only on invoices/quotations. No price lists, discount structures, customer-specific pricing, or quantity-based pricing. ~10% complete.

#### User Stories

- [ ] As a sales manager, I want to create price lists with validity dates so that product pricing is managed centrally
  - AC: Price list has: name, currency, valid_from, valid_to, status (active/inactive)
  - AC: Price list contains entries: product_id, unit_price, min_quantity
  - AC: Multiple price lists can exist (wholesale, retail, seasonal)

- [ ] As a sales user, I want the system to auto-select the correct price when creating a quotation/SO/invoice based on customer and product so that pricing is consistent
  - AC: Price determination hierarchy: customer-specific > customer group > default price list
  - AC: If multiple prices match, lowest-specificity or highest-priority wins (configurable)
  - AC: Selected price shown with source (which price list)

- [ ] As a sales manager, I want to define discount structures (volume discounts, customer discounts, promotional) so that discounts are systematic
  - AC: Discount types: percentage, fixed amount, tiered (quantity-based)
  - AC: Discounts can be stacked or exclusive (configurable)
  - AC: Discount validity period supported

- [ ] As a sales manager, I want customer-specific pricing agreements so that negotiated prices are applied automatically
  - AC: Customer price agreement stores product-price overrides with validity period
  - AC: Agreements take priority over standard price lists
  - AC: Agreement can specify max quantity at agreed price

- [ ] As a sales user, I want to see a price simulation screen where I can test pricing for a customer-product combination so that I can answer customer inquiries quickly
  - AC: Input: customer, product, quantity, date
  - AC: Output: applicable price, discounts applied, final unit price, price source breakdown

- [ ] As a sales manager, I want to set minimum margin thresholds so that sales below cost are flagged
  - AC: Margin threshold configurable per product category
  - AC: Warning shown when unit price falls below cost + margin
  - AC: Below-margin sales require approval (ties to EPIC-21)

#### Technical Notes
- New tables: `price_lists`, `price_list_items`, `discount_rules`, `customer_price_agreements`
- New service: `PricingEngine.determinePrice(customerId, productId, quantity, date)`
- Integrate into quotation, SO, and invoice line creation
- New endpoints: `GET /pricing/simulate`, CRUD for `/pricing/price-lists`, `/pricing/discounts`

---

### EPIC-08: Document Flow Completion
**Priority**: P0 (critical)
**Complexity**: L (1-2 weeks)
**Phase**: 2
**Dependencies**: EPIC-07

**Current State**: Individual documents exist (quotation, SO, DO, invoice, receipt, credit note) but no linking between them. QT→INV skips SO. DO→INV has no automated path. No unified document flow view.

#### User Stories

- [ ] As a sales user, I want to convert a quotation to a sales order with one click so that the sales process flows naturally
  - AC: "Convert to SO" copies all lines from QT to new SO
  - AC: SO references source QT (quotation_id foreign key)
  - AC: QT status changes to "converted"
  - AC: Partial conversion supported (select specific lines)

- [ ] As a sales user, I want to create a delivery note from a sales order so that fulfillment is linked to the order
  - AC: "Create Delivery" on SO creates DO with SO lines
  - AC: DO references source SO
  - AC: Partial delivery supported (deliver subset of ordered quantities)
  - AC: SO status updates: open → partially_delivered → fully_delivered

- [ ] As a sales user, I want to create an invoice from a delivery note (or directly from SO) so that billing follows fulfillment
  - AC: "Create Invoice" on DO/SO creates invoice with appropriate lines
  - AC: Invoice references source DO and/or SO
  - AC: Only delivered quantities can be invoiced (when created from DO)
  - AC: SO status tracks invoicing: not_invoiced → partially_invoiced → fully_invoiced

- [ ] As a sales user, I want to view the complete document flow for any document (QT→SO→DO→INV→PMT→Receipt) so that I can trace the full sales cycle
  - AC: Document flow panel shows linked documents with status
  - AC: Clickable navigation between linked documents
  - AC: Visual timeline/chain representation

- [ ] As a sales user, I want to create a return/credit from an invoice so that returns are processed correctly
  - AC: "Create Credit Note" on invoice pre-fills lines
  - AC: Credit note references source invoice
  - AC: Return can trigger inventory receipt (goods returned to stock)

- [ ] As a manager, I want to see order fulfillment status (ordered vs delivered vs invoiced vs paid) so that I can monitor the sales pipeline
  - AC: Dashboard widget showing SO fulfillment funnel
  - AC: Drill-down from summary to individual SOs

#### Technical Notes
- Add foreign keys: `sales_orders.quotation_id`, `delivery_notes.sales_order_id`, `invoices.delivery_note_id`, `invoices.sales_order_id`, `credit_notes.invoice_id`
- New endpoints: `POST /quotations/:id/convert-to-so`, `POST /sales-orders/:id/create-delivery`, `POST /delivery-notes/:id/create-invoice`, `POST /sales-orders/:id/create-invoice`
- New endpoint: `GET /documents/:type/:id/flow` — returns linked document chain
- Status tracking enum additions on each document type

---

### EPIC-09: Sales Process Enhancements
**Priority**: P1 (high)
**Complexity**: M (3-5 days)
**Phase**: 2
**Dependencies**: EPIC-08, EPIC-13

**Current State**: No availability check, back-order management, delivery scheduling, or sales return processing.

#### User Stories

- [ ] As a sales user, I want real-time inventory availability check when creating a sales order so that I don't promise stock I don't have
  - AC: SO line creation shows available quantity per warehouse
  - AC: Warning if ordered quantity exceeds available stock
  - AC: Available = on-hand - reserved - committed

- [ ] As a sales user, I want the system to automatically create back-orders for out-of-stock items so that shortages are tracked
  - AC: When SO quantity exceeds available, excess creates back-order
  - AC: Back-orders visible in a separate queue
  - AC: When stock is received, back-orders are auto-suggested for fulfillment

- [ ] As a logistics coordinator, I want to schedule deliveries with requested and confirmed dates so that delivery planning is organized
  - AC: SO and DO have requested_delivery_date and confirmed_delivery_date fields
  - AC: Delivery calendar view showing scheduled deliveries
  - AC: Route/zone assignment for delivery grouping

- [ ] As a sales user, I want to process sales returns with reason codes so that return patterns can be analyzed
  - AC: Return order references original SO/DO
  - AC: Reason codes: defective, wrong item, customer changed mind, etc.
  - AC: Return triggers stock receipt and credit note creation

- [ ] As a sales manager, I want to track sales order changes (version history) so that amendments are traceable
  - AC: Each SO edit creates a new version
  - AC: Changes tracked: quantity, price, delivery date modifications
  - AC: Version comparison view

#### Technical Notes
- Add `available_quantity` calculation to inventory service
- New tables: `back_orders`, `delivery_schedules`, `sales_returns`, `sales_order_versions`
- New endpoints: `GET /inventory/availability/:productId`, `POST /sales-orders/:id/back-order`, `POST /sales-returns`
- Availability = `stock_movements` SUM(quantity) grouped by product + warehouse - reserved

---

### EPIC-10: Invoice Enhancements
**Priority**: P1 (high)
**Complexity**: L (1-2 weeks)
**Phase**: 2
**Dependencies**: EPIC-01, EPIC-07, EPIC-19

**Current State**: Basic invoice CRUD with post/void. No pro-forma invoices, recurring invoices, batch invoicing, e-Tax Invoice, or multi-currency support.

#### User Stories

- [ ] As a sales user, I want to create pro-forma invoices so that customers can see expected charges before formal billing
  - AC: Pro-forma invoice has same structure as invoice but type = "proforma"
  - AC: Pro-forma does not affect AR or GL
  - AC: Pro-forma can be converted to final invoice

- [ ] As an accountant, I want recurring invoices that auto-generate on schedule so that subscription/retainer billing is automated
  - AC: Recurring template with: customer, lines, frequency (monthly/quarterly/annually), start/end dates
  - AC: Auto-generated invoices posted as draft for review or auto-posted (configurable)
  - AC: Next run date tracked and visible

- [ ] As an accountant, I want batch invoicing (invoice multiple DOs or SOs at once for the same customer) so that consolidation reduces paperwork
  - AC: Select multiple uninvoiced DOs for a customer → create one consolidated invoice
  - AC: Invoice lines reference source DO/SO lines
  - AC: Batch processing report shows what was invoiced

- [ ] As a compliance officer, I want e-Tax Invoice generation per Thai Revenue Department standards so that invoices are legally compliant for electronic filing
  - AC: Generate XML in e-Tax Invoice format (Thai RD specification)
  - AC: Digital signature (XML-DSig) with organization certificate
  - AC: QR code with tax invoice reference embedded in PDF
  - AC: Submission to RD e-Tax system (or export file for manual upload)

- [ ] As a sales user, I want multi-currency invoices with exchange rate at invoice date so that I can bill foreign customers
  - AC: Invoice has `currency` and `exchange_rate` fields
  - AC: Line amounts in foreign currency, GL posting in base currency
  - AC: Exchange rate auto-fetched from rate table or manually overridden

- [ ] As an accountant, I want invoice PDF generation with customizable templates so that invoices look professional
  - AC: PDF includes: company logo, billing/shipping address, line items, tax breakdown, payment terms
  - AC: Template supports Thai and English bilingual layout
  - AC: Thai tax invoice format compliance (ใบกำกับภาษี)

#### Technical Notes
- Add `invoice_type` enum: standard | proforma | recurring | credit_note
- New tables: `recurring_invoice_templates`, `recurring_invoice_lines`
- New endpoints: `POST /invoices/recurring-templates`, `POST /invoices/batch-create`, `GET /invoices/:id/e-tax-xml`, `GET /invoices/:id/pdf`
- e-Tax Invoice: reference Thai RD XML schema v2.0
- PDF generation: consider `@react-pdf/renderer` or `puppeteer` for server-side

---

### EPIC-11: Warehouse Process
**Priority**: P1 (high)
**Complexity**: L (1-2 weeks)
**Phase**: 3
**Dependencies**: EPIC-08, EPIC-13

**Current State**: Basic warehouse and stock movement tables exist. No picking, packing, shipping workflows, or carrier integration.

#### User Stories

- [ ] As a warehouse worker, I want a pick list generated from delivery notes so that I know what to collect from shelves
  - AC: Pick list shows: product, quantity, bin/location, DO reference
  - AC: Pick list grouped by zone/aisle for efficient picking
  - AC: Pick confirmation records actual picked quantities

- [ ] As a warehouse worker, I want to record packing of picked items into shipment boxes so that shipments are tracked
  - AC: Packing screen shows picked items to be packed
  - AC: Record box/package number, weight, dimensions
  - AC: Packing slip printable per package

- [ ] As a logistics coordinator, I want to create shipments and assign carriers so that deliveries are dispatched properly
  - AC: Shipment groups one or more DOs/packages
  - AC: Carrier assignment with tracking number
  - AC: Shipment status: created → dispatched → in_transit → delivered

- [ ] As a logistics coordinator, I want carrier integration (API or manual tracking number entry) so that shipment status is tracked
  - AC: Manual tracking number entry per shipment
  - AC: Status update webhook from carrier (future API integration)
  - AC: Customer notification when shipment status changes

- [ ] As a warehouse manager, I want goods receipt processing for purchase orders so that inbound inventory is recorded
  - AC: GR references PO and records received quantities
  - AC: Received quantity can differ from ordered (over/under delivery handling)
  - AC: GR creates stock movement (receipt type)
  - AC: GR triggers 3-way matching for AP (EPIC-03)

- [ ] As a warehouse worker, I want bin/location management within warehouses so that items can be located efficiently
  - AC: Warehouse subdivided into zones → aisles → bins
  - AC: Products assigned to bins
  - AC: Stock query by bin location

#### Technical Notes
- New tables: `pick_lists`, `pick_list_items`, `packages`, `shipments`, `shipment_items`, `carriers`, `warehouse_bins`
- New endpoints: `POST /warehouse/pick-lists`, `POST /warehouse/packing`, `POST /warehouse/shipments`, `POST /warehouse/goods-receipt`
- Add `bin_id` to `stock_movements` for bin-level tracking
- Consider barcode/QR scanning integration for pick confirmation

---

## Operations Domain

---

### EPIC-12: Procurement
**Priority**: P1 (high)
**Complexity**: L (1-2 weeks)
**Phase**: 3
**Dependencies**: EPIC-03

**Current State**: Purchase orders exist with basic CRUD. No purchase requisitions, RFQ process, vendor comparison, source list, or vendor returns (debit notes).

#### User Stories

- [ ] As a department user, I want to create purchase requisitions (PR) so that purchase needs are formally requested and approved
  - AC: PR has: requester, department, line items (product/description, quantity, estimated price)
  - AC: PR goes through approval workflow (EPIC-21)
  - AC: Approved PR can be converted to PO or RFQ

- [ ] As a buyer, I want to create RFQs (Request for Quotation) from PRs and send them to multiple vendors so that competitive pricing is obtained
  - AC: RFQ generated from PR lines, sent to selected vendors
  - AC: Vendor quotation responses recorded with prices, delivery terms
  - AC: Quotation validity tracking

- [ ] As a buyer, I want a vendor quotation comparison screen so that I can select the best offer
  - AC: Side-by-side comparison of vendor responses per line item
  - AC: Comparison criteria: price, delivery time, payment terms, vendor score
  - AC: Award decision recorded with justification

- [ ] As a buyer, I want to maintain a source list (preferred vendors per material) so that procurement is directed to approved sources
  - AC: Source list maps product → vendor(s) with priority, validity period
  - AC: PO creation suggests vendors from source list
  - AC: Source list used in auto-PR-to-PO conversion

- [ ] As a buyer, I want to convert approved PRs/RFQ awards to purchase orders so that the procurement flow is connected
  - AC: "Create PO" from PR or RFQ award pre-fills all relevant fields
  - AC: PO references source PR and/or RFQ
  - AC: Multiple PRs can be consolidated into one PO per vendor

- [ ] As a buyer, I want to process vendor returns (return defective goods) so that procurement issues are managed
  - AC: Return references source PO/GR
  - AC: Return creates outbound stock movement
  - AC: Vendor debit note auto-created or linked

- [ ] As a procurement manager, I want purchase order approval workflow so that spending is controlled
  - AC: PO approval based on amount thresholds
  - AC: Multi-level approval for high-value POs
  - AC: PO cannot be sent to vendor until approved

#### Technical Notes
- New tables: `purchase_requisitions`, `pr_lines`, `rfqs`, `rfq_lines`, `rfq_responses`, `rfq_response_lines`, `source_list`
- New endpoints: CRUD for `/procurement/requisitions`, `/procurement/rfqs`, `/procurement/rfq-responses`
- Conversion endpoints: `POST /procurement/requisitions/:id/convert-to-po`, `POST /procurement/rfqs/:id/award`
- Document flow: PR → RFQ → PO → GR → Bill (full procure-to-pay)

---

### EPIC-13: Inventory Advanced
**Priority**: P1 (high)
**Complexity**: XL (3+ weeks)
**Phase**: 3
**Dependencies**: None

**Current State**: Basic products, warehouses, and stock movements exist. No stock types (unrestricted/blocked/quality), physical inventory/cycle counting, batch/serial tracking, valuation methods, or MRP.

#### User Stories

- [ ] As a warehouse manager, I want stock categorization (unrestricted, quality inspection, blocked) so that inventory quality is controlled
  - AC: Stock type field on stock_movements and inventory queries
  - AC: Only unrestricted stock available for sales/delivery
  - AC: Transfer between stock types (e.g., QI → unrestricted after inspection)

- [ ] As a warehouse manager, I want to conduct physical inventory counts and post adjustments so that book and physical quantities are aligned
  - AC: Physical inventory document: count date, warehouse, products
  - AC: Record counted quantities per product per bin
  - AC: Variance report: book qty vs counted qty
  - AC: Post adjustment creates stock movements and JE entries for inventory value differences

- [ ] As a warehouse manager, I want cycle counting (count subsets of inventory on schedule) so that full counts aren't needed
  - AC: Cycle count plan by ABC classification or product group
  - AC: Schedule assigns products to count dates
  - AC: Count process same as physical inventory but for subset

- [ ] As a warehouse manager, I want batch/lot tracking for products that require it so that traceability is maintained
  - AC: Batch-managed products require batch number on receipt and issue
  - AC: Batch has: number, production_date, expiry_date, supplier_batch
  - AC: FIFO/FEFO enforcement for batch-managed items
  - AC: Batch trace: forward (batch → where delivered) and backward (customer → which batch)

- [ ] As a warehouse manager, I want serial number tracking for individual high-value items so that each unit is traceable
  - AC: Serial-managed products require unique serial on receipt and issue
  - AC: Serial history: receipt → storage → delivery → customer
  - AC: Warranty tracking per serial number

- [ ] As an accountant, I want inventory valuation methods (FIFO, weighted average, standard cost) so that COGS is calculated correctly
  - AC: Valuation method configurable per product
  - AC: Weighted average recalculated on each receipt
  - AC: Standard cost with variance posting (PPV)
  - AC: Inventory valuation report at period end

- [ ] As a planner, I want basic MRP (Material Requirements Planning) to suggest purchase orders based on demand so that stock-outs are prevented
  - AC: MRP considers: current stock, open SOs (demand), open POs (supply), reorder point, lead time
  - AC: MRP run generates planned purchase requisitions
  - AC: Exception messages: below safety stock, overdue POs

- [ ] As a warehouse manager, I want stock transfer between warehouses so that inventory can be relocated
  - AC: Transfer order: source warehouse, destination warehouse, products, quantities
  - AC: Two-step: issue from source, receive at destination
  - AC: In-transit stock visibility

#### Technical Notes
- Add `stock_type` enum to stock_movements: unrestricted | quality_inspection | blocked
- New tables: `physical_inventory`, `physical_inventory_items`, `batches`, `serial_numbers`, `inventory_valuation`, `mrp_runs`, `mrp_results`, `transfer_orders`
- Add `batch_id`, `serial_number` to stock_movements
- Add `valuation_method` to products
- New endpoints: CRUD for `/inventory/physical-count`, `/inventory/batches`, `/inventory/serials`, `/inventory/mrp-run`, `/inventory/transfer-orders`
- MRP calculation is compute-intensive — background job

---

### EPIC-14: HR Advanced
**Priority**: P2 (medium)
**Complexity**: L (1-2 weeks)
**Phase**: 3
**Dependencies**: None

**Current State**: Basic employees and departments exist. No organizational hierarchy, positions, attendance tracking, time management, or Employee Self-Service.

#### User Stories

- [ ] As an HR manager, I want organizational hierarchy (company → division → department → section) so that org structure is modeled accurately
  - AC: Departments support parent-child hierarchy (tree structure)
  - AC: Org chart visualization
  - AC: Employee inherits cost center from department position

- [ ] As an HR manager, I want position management (positions within departments with headcount) so that staffing is planned
  - AC: Position has: title, department, grade/level, headcount (planned vs filled)
  - AC: Employee assigned to position
  - AC: Vacancy tracking: open positions report

- [ ] As an HR manager, I want employee attendance tracking (clock in/out) so that working hours are recorded
  - AC: Daily attendance record: check_in, check_out, total_hours
  - AC: Late/early/absent detection based on work schedule
  - AC: Monthly attendance summary report

- [ ] As an HR manager, I want work schedule/shift management so that employee schedules are defined
  - AC: Shift templates: start_time, end_time, break_duration
  - AC: Employee assigned to shift/schedule
  - AC: Schedule calendar view

- [ ] As an HR manager, I want overtime tracking and approval so that OT is managed
  - AC: OT request with date, hours, reason
  - AC: Approval workflow (EPIC-21)
  - AC: Approved OT feeds into payroll calculation
  - AC: OT rates: 1.5x, 2x, 3x configurable per OT type

- [ ] As an employee, I want Employee Self-Service (ESS) portal to view my payslip, leave balance, and personal info so that HR workload is reduced
  - AC: Employee can view own profile, payslips, leave balances
  - AC: Employee can submit leave requests, OT requests
  - AC: Employee can update personal details (address, phone, emergency contact)
  - AC: Read-only access to own attendance records

- [ ] As an HR manager, I want employee document management (contracts, certifications, performance reviews) so that employee files are organized
  - AC: Upload and categorize documents per employee
  - AC: Document expiry tracking (e.g., work permit, certifications)
  - AC: Expiry alerts for upcoming renewals

#### Technical Notes
- Add `parent_id` to departments for hierarchy
- New tables: `positions`, `attendance`, `shifts`, `shift_assignments`, `overtime_requests`, `employee_documents`
- Add `position_id`, `shift_id` to employees
- New endpoints: CRUD for `/hr/positions`, `/hr/attendance`, `/hr/shifts`, `/hr/overtime`, `/hr/ess/profile`, `/hr/documents`
- ESS: leverage existing auth with employee-role-based access

---

### EPIC-15: Payroll Compliance
**Priority**: P1 (high)
**Complexity**: L (1-2 weeks)
**Phase**: 4
**Dependencies**: EPIC-14

**Current State**: Basic payroll runs and payroll items exist (~60%). No bank file generation, ภ.ง.ด.1/50 ทวิ certificate generation, YTD tax calculation, mid-year adjustment, or SSC filing integration.

#### User Stories

- [ ] As a payroll officer, I want to generate bank payment files for salary disbursement so that payroll payments are automated
  - AC: Generate file in bank-specific format (SCB, KBANK, BBL formats)
  - AC: File contains: employee bank account, amount, reference
  - AC: File generation after payroll run approval

- [ ] As a payroll officer, I want to generate 50 ทวิ (withholding tax certificates) for all employees annually so that tax filing obligations are met
  - AC: Certificate shows: employer info, employee info, income types, WHT deducted, SSC
  - AC: Batch generation for all employees
  - AC: PDF output matching Revenue Department 50 ทวิ format
  - AC: ภ.ง.ด.1 summary form generated alongside

- [ ] As a payroll officer, I want YTD (Year-to-Date) progressive tax calculation so that monthly WHT reflects actual annual liability
  - AC: Each month's WHT calculated using cumulative YTD income
  - AC: Projected annual tax distributed evenly over remaining months
  - AC: Handles variable income (bonus, commission) properly

- [ ] As a payroll officer, I want mid-year tax adjustment capability so that tax recalculations are handled when employee circumstances change
  - AC: Recalculate remaining months when: new hire mid-year, salary change, allowance change
  - AC: Adjustment shown in payslip breakdown
  - AC: Prior month over/under deduction corrected

- [ ] As a payroll officer, I want SSC (Social Security Contribution) calculation and filing report so that SSC obligations are met
  - AC: SSC calculated: employee 5%, employer 5%, capped at THB 750/month each (or current cap)
  - AC: Monthly SSC filing report (ส.ป.ส. 1-10) generated
  - AC: SSC base wage excludes non-SSC items (per SSC rules)

- [ ] As a payroll officer, I want payslip generation and distribution so that employees receive pay details
  - AC: Payslip PDF: earnings breakdown, deductions, net pay, YTD totals
  - AC: Bilingual Thai/English format
  - AC: Email distribution or ESS download

- [ ] As an accountant, I want payroll posting to GL so that salary expenses are recorded
  - AC: Payroll run creates JE: debit Salary Expense (by department/CC), credit Bank, credit WHT Payable, credit SSC Payable
  - AC: Posting breakdown configurable by earning/deduction type to GL account

#### Technical Notes
- New tables: `payroll_bank_files`, `wht_certificates_employee`, `payslip_templates`
- Add `bank_account_number`, `bank_code` to employees
- New endpoints: `POST /payroll/:id/generate-bank-file`, `POST /payroll/generate-50-tawi`, `GET /payroll/:id/payslips`, `POST /payroll/:id/post-to-gl`
- Thai tax tables: progressive rates 0-35% with deductions per Revenue Code
- Bank file formats: research SCB Direct, KBANK Corporate, BBL Business

---

### EPIC-16: Leave Advanced
**Priority**: P2 (medium)
**Complexity**: M (3-5 days)
**Phase**: 4
**Dependencies**: EPIC-14

**Current State**: Basic leave types and leave requests exist. No accrual rules, carry-forward policies, holiday calendar, leave cancellation, or leave balance enforcement.

#### User Stories

- [ ] As an HR manager, I want leave accrual rules (earn X days per month/year based on tenure) so that leave entitlements are calculated automatically
  - AC: Accrual rule: days_per_year, accrual_frequency (monthly/annually), tenure_tiers
  - AC: Example: 6 days/year for 0-1 year, 10 days for 1-3 years, 15 days for 3+ years
  - AC: Accrual runs monthly and updates leave balance

- [ ] As an HR manager, I want carry-forward policies (max days, expiry) so that unused leave is handled per company policy
  - AC: Per leave type: max_carry_forward days, expiry_months after year end
  - AC: Year-end process calculates carry-forward and forfeiture
  - AC: Carried-forward balance shown separately from current year

- [ ] As an HR manager, I want a company holiday calendar so that leave calculations exclude holidays
  - AC: Holiday calendar with public holidays and company holidays
  - AC: Leave duration calculation excludes holidays and weekends
  - AC: Multiple calendars for different regions/branches

- [ ] As an employee, I want to cancel a pending leave request so that I can change my plans
  - AC: Cancel allowed for "pending" and "approved" status (if before leave date)
  - AC: Cancelled leave restores balance
  - AC: Cancel after start date requires HR approval

- [ ] As the system, I want leave balance enforcement so that employees cannot request more leave than available
  - AC: Leave request validates against available balance
  - AC: Negative balance blocked (or allowed with HR override)
  - AC: Balance shown on leave request screen

- [ ] As an HR manager, I want leave reports (balance summary, utilization, trends) so that leave patterns are visible
  - AC: Report: employee, leave type, entitled, taken, balance, carry-forward
  - AC: Department-level summary
  - AC: Period comparison (month-over-month, year-over-year)

#### Technical Notes
- New tables: `leave_accrual_rules`, `leave_balances`, `holiday_calendars`, `holidays`
- Add `status` transitions to leave_requests: pending → approved → taken → cancelled
- New endpoints: `POST /leave/accrual-run`, `POST /leave/year-end-process`, CRUD for `/leave/holidays`, `POST /leave/requests/:id/cancel`
- Leave balance calculation: entitled + carry_forward - taken - pending

---

### EPIC-17: Controlling Advanced
**Priority**: P2 (medium)
**Complexity**: L (1-2 weeks)
**Phase**: 4
**Dependencies**: EPIC-04

**Current State**: Basic cost centers and profit centers exist. No budget control (hard stop vs warning), variance analysis, cost allocation, or internal orders.

#### User Stories

- [ ] As a controller, I want budget control enforcement (warn or block when budget exceeded) so that spending stays within limits
  - AC: Budget check on PO creation, bill posting, and expense JE
  - AC: Control types: no check, warning only, hard block
  - AC: Check levels: annual, quarterly, monthly
  - AC: Override with specific permission for hard-block exceptions

- [ ] As a controller, I want budget vs actual variance analysis reports so that cost overruns are identified
  - AC: Report shows: budget, actual, variance (amount and %), by cost center and GL account
  - AC: Drill-down from summary to individual transactions
  - AC: Period comparison: monthly, quarterly, YTD

- [ ] As a controller, I want cost allocation rules to distribute shared costs across cost centers so that full cost visibility is achieved
  - AC: Allocation base: fixed percentage, headcount, revenue, square footage
  - AC: Sender and receiver cost centers defined
  - AC: Allocation creates assessment/distribution JE entries
  - AC: Allocation cycle (iterative) supported for cross-allocations

- [ ] As a controller, I want internal orders for tracking costs of specific projects or activities so that project costs are captured
  - AC: Internal order has: description, responsible person, budget, status (open/closed)
  - AC: Costs posted to internal order via JE or PO assignment
  - AC: Internal order settlement: transfer accumulated costs to cost center or asset
  - AC: Internal order report: planned vs actual

- [ ] As a controller, I want profit center P&L reporting so that profitability is analyzed by business segment
  - AC: Revenue and expense accounts assigned to profit centers
  - AC: Profit center P&L report: revenue, COGS, gross margin, operating expenses, net profit
  - AC: Comparison across profit centers

- [ ] As a controller, I want activity-based costing support so that overhead costs are allocated based on cost drivers
  - AC: Activity types with rates (e.g., machine hours at THB 500/hr)
  - AC: Activity quantities recorded per cost center
  - AC: Overhead applied based on activity volume

#### Technical Notes
- Add `budget_control_type` to cost_centers: none | warning | block
- New tables: `internal_orders`, `internal_order_postings`, `allocation_rules`, `allocation_runs`, `activity_types`, `activity_postings`
- New endpoints: CRUD for `/controlling/internal-orders`, `POST /controlling/allocations/run`, `GET /controlling/variance-report`
- Budget check middleware: intercept posting requests and validate against budget

---

### EPIC-18: CRM Full
**Priority**: P2 (medium)
**Complexity**: XL (3+ weeks)
**Phase**: 6
**Dependencies**: EPIC-08

**Current State**: Basic contacts table exists (~30%). No leads, opportunities, sales pipeline, activities, segmentation, or campaign management.

#### User Stories

- [ ] As a sales rep, I want to create and manage leads (potential customers) so that sales prospects are tracked from first contact
  - AC: Lead has: name, company, source (web, referral, event), status, assigned_to
  - AC: Lead statuses: new → contacted → qualified → converted → lost
  - AC: Lead conversion creates contact + optional quotation

- [ ] As a sales rep, I want to manage opportunities (qualified deals) with expected revenue and close date so that the sales pipeline is visible
  - AC: Opportunity has: name, customer, value, probability, expected_close_date, stage
  - AC: Stages configurable: prospecting → proposal → negotiation → closed_won → closed_lost
  - AC: Opportunity linked to quotation(s)

- [ ] As a sales manager, I want a visual sales pipeline (kanban or funnel) showing all opportunities by stage so that I can forecast revenue
  - AC: Kanban board with drag-and-drop between stages
  - AC: Funnel view showing count and value per stage
  - AC: Weighted pipeline: value × probability
  - AC: Filters: salesperson, period, customer segment

- [ ] As a sales rep, I want to log activities (calls, emails, meetings, notes) against leads/opportunities/contacts so that interaction history is maintained
  - AC: Activity types: call, email, meeting, note, task
  - AC: Activity has: date, duration, summary, next_action
  - AC: Activity timeline on lead/opportunity/contact detail page

- [ ] As a sales manager, I want customer segmentation (by industry, size, region, value tier) so that targeted campaigns are possible
  - AC: Segments defined by rules (field-based filters)
  - AC: Contact auto-assigned to segments based on attributes
  - AC: Segment member count and total value visible

- [ ] As a sales manager, I want sales performance reports (by rep, by period, pipeline velocity) so that team effectiveness is measured
  - AC: Report: leads generated, conversion rate, average deal size, win rate, sales cycle duration
  - AC: Per-salesperson breakdown
  - AC: Period comparison

- [ ] As a marketing user, I want basic campaign tracking so that marketing ROI is measured
  - AC: Campaign has: name, type, start/end date, budget, status
  - AC: Leads/opportunities linked to source campaign
  - AC: Campaign ROI: cost vs revenue from converted leads

#### Technical Notes
- New tables: `leads`, `opportunities`, `opportunity_stages`, `activities`, `segments`, `segment_rules`, `campaigns`, `campaign_members`
- New endpoints: CRUD for `/crm/leads`, `/crm/opportunities`, `/crm/activities`, `/crm/segments`, `/crm/campaigns`
- Pipeline endpoint: `GET /crm/pipeline?view=kanban|funnel`
- Consider WebSocket for real-time pipeline updates

---

## Infrastructure Domain

---

### EPIC-19: Multi-Currency
**Priority**: P1 (high)
**Complexity**: L (1-2 weeks)
**Phase**: 5
**Dependencies**: EPIC-01, EPIC-04

**Current State**: No multi-currency support (0%). All amounts in THB only. No exchange rate table, currency conversion, FX gain/loss, or foreign currency revaluation.

#### User Stories

- [ ] As an admin, I want to maintain exchange rate tables with daily rates so that foreign currency transactions use correct rates
  - AC: Currency master: code (ISO 4217), name, decimal places, symbol
  - AC: Exchange rate table: from_currency, to_currency, rate, valid_date
  - AC: Rates can be entered manually or imported (e.g., BOT API)

- [ ] As a user, I want to create transactions (invoices, bills, JEs) in foreign currencies so that international business is supported
  - AC: Document has currency_code and exchange_rate fields
  - AC: Line amounts in document currency
  - AC: GL posting in base currency (THB) using exchange rate at document date

- [ ] As an accountant, I want realized FX gain/loss calculated on payment so that currency differences are captured
  - AC: When paying a foreign-currency invoice, difference between invoice rate and payment rate = FX gain/loss
  - AC: FX gain/loss posted to dedicated GL accounts
  - AC: FX gain/loss shown on payment record

- [ ] As an accountant, I want month-end foreign currency revaluation so that open balances reflect current rates
  - AC: Revaluation run for all open foreign-currency AR/AP items
  - AC: Unrealized FX gain/loss calculated using month-end rate
  - AC: Revaluation JE auto-created (reversed on first day of next period)

- [ ] As a manager, I want to view reports in different currencies so that global operations are analyzed
  - AC: Report currency selector (base currency or any defined currency)
  - AC: Conversion using selected rate (period-end, average, spot)

- [ ] As an admin, I want to set base currency per company (for multi-company) so that each entity operates in its functional currency
  - AC: Tenant/company has base_currency setting
  - AC: All GL entries in base currency
  - AC: Group reporting currency for consolidation (EPIC-20)

#### Technical Notes
- New tables: `currencies`, `exchange_rates`
- Add `currency_code`, `exchange_rate` to: invoices, bills, journal_entries, payments, quotations, sales_orders, purchase_orders
- Add `base_currency` to tenants
- New endpoints: CRUD for `/currencies`, `/exchange-rates`, `POST /fx/revaluation-run`
- BOT (Bank of Thailand) rate API integration for auto-import

---

### EPIC-20: Multi-Company
**Priority**: P2 (medium)
**Complexity**: XL (3+ weeks)
**Phase**: 5
**Dependencies**: EPIC-19, EPIC-04

**Current State**: Tenant-based isolation exists (RLS). No intercompany transactions, elimination entries, branch accounting, or transfer pricing.

#### User Stories

- [ ] As a group accountant, I want intercompany transaction processing so that transactions between related entities are recorded in both companies
  - AC: Intercompany invoice automatically creates corresponding bill in counterpart company
  - AC: Intercompany AR/AP accounts used for offsetting
  - AC: Intercompany reconciliation report

- [ ] As a group accountant, I want elimination entries for consolidated financial statements so that intercompany balances are removed
  - AC: Auto-generate elimination JEs for intercompany receivables/payables
  - AC: Eliminate intercompany revenue/COGS
  - AC: Elimination worksheet showing balances before and after

- [ ] As a group CFO, I want consolidated financial statements across all companies so that group performance is visible
  - AC: Consolidated balance sheet and P&L
  - AC: Currency translation for foreign subsidiaries
  - AC: Minority interest calculation (if applicable)

- [ ] As a branch manager, I want branch accounting with branch-level P&L so that each branch's performance is measured
  - AC: Branch as a dimension on transactions (similar to cost center)
  - AC: Branch P&L report
  - AC: Inter-branch transfers tracked

- [ ] As a tax manager, I want transfer pricing documentation support so that intercompany pricing complies with regulations
  - AC: Mark intercompany transactions with transfer pricing method
  - AC: Transfer pricing report: related-party transaction summary
  - AC: Arm's length price comparison

- [ ] As an admin, I want company setup wizard for adding new entities to the group so that onboarding is streamlined
  - AC: Wizard: company details, CoA copy from template/existing company, currency, fiscal year
  - AC: Intercompany partner link setup
  - AC: User access assignment per company

#### Technical Notes
- New tables: `company_groups`, `intercompany_links`, `elimination_entries`, `branches`
- Add `company_id` dimension alongside `tenant_id` for multi-company within same tenant
- New endpoints: `POST /intercompany/transactions`, `POST /intercompany/elimination-run`, `GET /reports/consolidated-financials`
- Complex: requires careful RLS policy adjustments for cross-company access

---

### EPIC-21: Approval Workflow Engine
**Priority**: P1 (high)
**Complexity**: L (1-2 weeks)
**Phase**: 5
**Dependencies**: None

**Current State**: No approval workflow (~25%). Simple status fields exist but no configurable approval chains, delegation, escalation, SLA tracking, or conditional routing.

#### User Stories

- [ ] As an admin, I want to configure multi-step approval chains per document type so that approvals follow organizational hierarchy
  - AC: Approval chain: document_type, steps (sequence, approver_role/user, condition)
  - AC: Steps can be sequential or parallel
  - AC: Conditions: amount threshold, department, custom field values

- [ ] As an approver, I want to approve/reject documents from a centralized inbox so that approval work is efficient
  - AC: Approval inbox showing all pending items across document types
  - AC: One-click approve/reject with optional comments
  - AC: Bulk approve for low-risk items

- [ ] As an approver, I want to delegate my approval authority to another user during absence so that workflows aren't blocked
  - AC: Delegation: delegate_to user, valid_from, valid_to
  - AC: Delegated approvals show original approver and delegate
  - AC: Auto-delegation on leave (linked to EPIC-16)

- [ ] As an admin, I want approval escalation when SLA is breached so that delayed approvals are flagged
  - AC: SLA per approval step (e.g., 24 hours, 48 hours)
  - AC: Escalation to next-level manager or designated escalation contact
  - AC: Notification sent on escalation
  - AC: Escalation history tracked

- [ ] As an admin, I want conditional routing in approval workflows so that different conditions trigger different approval paths
  - AC: Rules: if amount > 100,000 → VP approval; if department = IT → IT Director
  - AC: Rules evaluated at submission time
  - AC: Rule builder UI with condition groups (AND/OR)

- [ ] As a user, I want to see approval status and history on every document so that transparency is maintained
  - AC: Approval trail: step, approver, action, timestamp, comments
  - AC: Current approval step highlighted
  - AC: Visual workflow diagram showing completed/pending steps

- [ ] As an admin, I want approval reports (average time, bottlenecks, rejection rates) so that the approval process can be optimized
  - AC: Report: avg approval time by step, document type, approver
  - AC: Bottleneck identification: approvers with highest pending count or longest response time

#### Technical Notes
- New tables: `workflow_definitions`, `workflow_steps`, `workflow_instances`, `workflow_instance_steps`, `approval_delegations`
- Generic design: workflow engine decoupled from specific document types
- New endpoints: CRUD for `/workflows/definitions`, `GET /workflows/inbox`, `POST /workflows/:instanceId/approve`, `POST /workflows/:instanceId/reject`, `POST /workflows/delegations`
- Event-driven: approval actions trigger notifications (EPIC existing notification service)

---

### EPIC-22: Thai Compliance
**Priority**: P0 (critical)
**Complexity**: L (1-2 weeks)
**Phase**: 4
**Dependencies**: EPIC-01, EPIC-15

**Current State**: Basic VAT 7%, WHT, SSC exist. No e-Tax Invoice, PDPA data subject rights, SSC electronic filing, DBD e-filing, or full ภ.ง.ด.1/3/53 support.

#### User Stories

- [ ] As a compliance officer, I want e-Tax Invoice & e-Receipt generation per RD standards so that the company is compliant with mandatory e-invoicing
  - AC: Generate XML per Thai RD e-Tax Invoice schema
  - AC: XML digital signature with registered certificate
  - AC: PDF with QR code for verification
  - AC: Batch generation for monthly submission

- [ ] As a DPO (Data Protection Officer), I want PDPA data subject rights management so that privacy requests are handled within legal deadlines
  - AC: Data subject request portal: access, rectification, deletion, portability
  - AC: Request tracking with 30-day SLA
  - AC: Data export in machine-readable format
  - AC: Consent management: record and track consents per purpose
  - AC: Data retention policies with auto-purge

- [ ] As a payroll officer, I want ภ.ง.ด.1 (monthly WHT filing) report generation so that monthly tax submissions are prepared
  - AC: ภ.ง.ด.1 form with all employee WHT details for the month
  - AC: Export in RD e-filing format (CSV/XML)
  - AC: Running totals match payroll records

- [ ] As an accountant, I want ภ.ง.ด.3 (WHT on services to individuals) and ภ.ง.ด.53 (WHT on services to companies) report generation so that vendor WHT is filed correctly
  - AC: ภ.ง.ด.3/53 aggregated from wht_certificates by period
  - AC: Export in RD e-filing format
  - AC: Reconciliation to AP payments

- [ ] As an accountant, I want DBD (Department of Business Development) e-filing data export so that annual financial statements are filed electronically
  - AC: Balance sheet and P&L in DBD e-filing XML format
  - AC: Trial balance supporting schedule
  - AC: Shareholder and director information included

- [ ] As a payroll officer, I want SSC e-filing (ส.ป.ส. 1-10) electronic submission format so that social security contributions are filed digitally
  - AC: Monthly SSC report in SSO electronic format
  - AC: Employee SSC contribution details
  - AC: Employer matching contribution included

- [ ] As an accountant, I want Thai-format financial statements (TFAC-compliant) so that financial reports meet Thai accounting standards
  - AC: Balance sheet in TFAC presentation format
  - AC: P&L in TFAC format (by function or by nature)
  - AC: Notes to financial statements templates

#### Technical Notes
- e-Tax Invoice: Thai RD XML schema v2.0, XMLDSig with X.509 certificate
- PDPA: new tables `consent_records`, `data_subject_requests`, `data_retention_policies`
- Tax filing: new report endpoints `GET /reports/pnd1`, `GET /reports/pnd3`, `GET /reports/pnd53`
- DBD e-filing: XML schema per DBD specification
- Consider storing certificates securely (encrypted at rest)

---

### EPIC-23: Reporting Advanced
**Priority**: P2 (medium)
**Complexity**: L (1-2 weeks)
**Phase**: 6
**Dependencies**: EPIC-02, EPIC-03, EPIC-19

**Current State**: Basic reports exist (trial balance, BS, P&L, budget vs actual). No cash flow statement, AP aging, custom report builder, dashboard drill-down, or scheduled reports.

#### User Stories

- [ ] As an accountant, I want a cash flow statement (direct and indirect method) so that cash position is reported per accounting standards
  - AC: Indirect method: start from net income, adjust for non-cash items, working capital changes
  - AC: Direct method: cash receipts and payments by category
  - AC: Three sections: operating, investing, financing activities
  - AC: Configurable mapping of GL accounts to cash flow categories

- [ ] As an AP manager, I want an AP aging report showing amounts due by aging bucket so that payment planning is informed
  - AC: Aging buckets: current, 1-30, 31-60, 61-90, 90+ days
  - AC: Filterable by vendor, due date range
  - AC: Summary and detail levels

- [ ] As a manager, I want a custom report builder to create ad-hoc reports from any data so that business questions are answered without developer help
  - AC: Select data source (table/view), columns, filters, grouping, sorting
  - AC: Save report definitions for reuse
  - AC: Export to CSV/Excel/PDF
  - AC: Basic calculated fields (sum, average, count)

- [ ] As a manager, I want dashboard drill-down (click a number to see underlying transactions) so that anomalies can be investigated
  - AC: Dashboard KPIs are clickable links
  - AC: Drill-down shows filtered transaction list
  - AC: Multi-level drill: summary → detail → document

- [ ] As a manager, I want scheduled reports delivered by email so that regular reports are received without manual effort
  - AC: Schedule: daily, weekly, monthly with time and recipients
  - AC: Report generated as PDF/Excel attachment
  - AC: Delivery log with success/failure status

- [ ] As a manager, I want comparative reports (this period vs last period, this year vs last year) so that trends are visible
  - AC: Side-by-side columns: current, prior, variance, variance %
  - AC: Applicable to P&L, BS, budget reports
  - AC: Custom period selection for comparison

#### Technical Notes
- Cash flow: map GL accounts to cash flow categories in a new `cash_flow_mappings` table
- New tables: `saved_reports`, `report_schedules`, `report_deliveries`
- New endpoints: `GET /reports/cash-flow`, `GET /reports/ap-aging`, CRUD for `/reports/custom`, `POST /reports/schedule`
- Report builder: consider using SQL views or parameterized queries
- Dashboard drill-down: add `drill_url` metadata to dashboard API responses

---

### EPIC-24: AI Agents Expansion
**Priority**: P3 (low)
**Complexity**: XL (3+ weeks)
**Phase**: 6
**Dependencies**: EPIC-06, EPIC-13

**Current State**: MCP server with 53 tools for AI integration exists. No anomaly detection, demand forecasting, auto-categorization, AI bank reconciliation, NLP queries, or OCR document processing.

#### User Stories

- [ ] As a controller, I want AI anomaly detection that flags unusual transactions so that fraud and errors are caught early
  - AC: Detect: unusual amounts (statistical outlier), unusual timing, unusual vendor/customer patterns
  - AC: Anomaly score with explanation
  - AC: Daily anomaly report or real-time alert
  - AC: Feedback loop: user marks false positives to improve model

- [ ] As a planner, I want AI demand forecasting based on historical sales data so that procurement and production planning is data-driven
  - AC: Forecast by product/product group for configurable horizon (1-12 months)
  - AC: Methods: moving average, exponential smoothing, seasonal decomposition
  - AC: Forecast accuracy metrics (MAPE, MAE)
  - AC: Forecast feeds into MRP (EPIC-13)

- [ ] As an accountant, I want AI auto-categorization of expenses from bank transactions so that manual GL coding is reduced
  - AC: Suggest GL account based on transaction narrative and historical patterns
  - AC: Confidence score with each suggestion
  - AC: Learn from user corrections
  - AC: Batch categorization for imported bank statements

- [ ] As an accountant, I want AI-assisted bank reconciliation that suggests matches between bank and book entries so that reconciliation time is cut
  - AC: Match by: exact amount, fuzzy reference, date proximity, learned patterns
  - AC: Present matched pairs with confidence score
  - AC: One-click confirm or manual reassignment
  - AC: Handle one-to-many and many-to-one matches

- [ ] As a user, I want to query ERP data using natural language (NLP) so that I can ask questions without knowing report names
  - AC: "What are my top 10 customers by revenue this quarter?" → returns data
  - AC: NLP parsed into structured query against database
  - AC: Follow-up questions supported (conversation context)
  - AC: Visualization suggested based on query type

- [ ] As an AP clerk, I want OCR processing of vendor invoices to auto-fill bill entry so that manual data entry is reduced
  - AC: Upload invoice image/PDF → extract: vendor, date, amount, line items, tax
  - AC: Extracted data pre-fills bill creation form
  - AC: Confidence highlighting for low-confidence fields
  - AC: Support for Thai-language invoices

#### Technical Notes
- Anomaly detection: statistical methods (z-score, IQR) initially; ML models later
- Forecasting: implement in core with `simple-statistics` or dedicated time-series library
- NLP: leverage Claude API (existing MCP infrastructure) for query parsing
- OCR: integrate with cloud OCR service (Google Vision, AWS Textract) or on-prem (Tesseract)
- New MCP tools: `anomaly_scan`, `forecast_demand`, `categorize_transactions`, `ocr_invoice`
- Data pipeline for training: historical transaction data with user feedback labels

---

### EPIC-25: Security Hardening
**Priority**: P2 (medium)
**Complexity**: L (1-2 weeks)
**Phase**: 6
**Dependencies**: None

**Current State**: Basic RBAC, JWT auth, RLS exist (~65%). No field-level security, encryption at rest, session revocation, IP whitelist, 2FA, or password policies.

#### User Stories

- [ ] As a security admin, I want field-level access control so that sensitive fields (salary, SSN, bank account) are restricted by role
  - AC: Define restricted fields per entity per role
  - AC: Restricted fields masked or hidden in API responses
  - AC: Audit log when restricted field is accessed by authorized user

- [ ] As a security admin, I want encryption at rest for sensitive data (PII, financial) so that database breaches don't expose plaintext data
  - AC: Encrypt: bank account numbers, tax IDs, salary amounts
  - AC: Application-level encryption using AES-256
  - AC: Key management: environment variable or KMS integration
  - AC: Transparent decryption for authorized access

- [ ] As a security admin, I want session revocation capability so that compromised sessions can be terminated immediately
  - AC: Admin can revoke all sessions for a user
  - AC: User can view and revoke their own sessions (devices)
  - AC: Session list shows: device, IP, last active, created_at

- [ ] As a security admin, I want IP whitelist/allowlist for API access so that unauthorized networks are blocked
  - AC: Configurable IP ranges per tenant
  - AC: Requests from non-whitelisted IPs rejected with 403
  - AC: Whitelist bypass for admin emergency access

- [ ] As a security admin, I want two-factor authentication (2FA/MFA) so that account security is strengthened
  - AC: TOTP-based 2FA (Google Authenticator, Authy compatible)
  - AC: 2FA setup flow: generate secret, display QR, verify code
  - AC: 2FA enforceable per role (e.g., mandatory for admin/finance roles)
  - AC: Recovery codes for backup access

- [ ] As a security admin, I want password policies (complexity, expiry, history) so that weak passwords are prevented
  - AC: Configurable: min length, require uppercase/lowercase/number/special
  - AC: Password expiry (e.g., 90 days) with forced change
  - AC: Password history: prevent reuse of last N passwords
  - AC: Account lockout after N failed attempts

- [ ] As a security admin, I want comprehensive security audit log (login attempts, permission changes, data exports) so that security events are traceable
  - AC: Log: login success/failure, permission changes, role assignments, data exports, admin actions
  - AC: Searchable by user, event type, date range
  - AC: Tamper-proof (append-only, no delete/edit)

#### Technical Notes
- Field-level security: middleware that filters response fields based on role permissions
- Encryption: `crypto` module with AES-256-GCM, key from env or AWS KMS
- New tables: `sessions` (if not using stateless JWT, consider session store), `ip_whitelist`, `totp_secrets`, `password_history`, `security_events`
- 2FA: `otpauth` or `speakeasy` library for TOTP
- Add security middleware layer for IP checking and session validation

---

### EPIC-26: Audit Trail Advanced
**Priority**: P2 (medium)
**Complexity**: M (3-5 days)
**Phase**: 6
**Dependencies**: None

**Current State**: Basic audit log (auto-log all mutations) exists (~60%). No tamper-proof hash chain, retention rules, auditor export, change comparison view, or digital signatures.

#### User Stories

- [ ] As an auditor, I want tamper-proof audit log with hash chain so that log integrity can be verified
  - AC: Each audit log entry includes hash of previous entry (blockchain-like chain)
  - AC: Hash algorithm: SHA-256
  - AC: Chain verification endpoint: validates entire chain integrity
  - AC: Alert on chain break detection

- [ ] As an admin, I want audit log retention policies so that storage is managed while compliance is maintained
  - AC: Retention period configurable per log type (e.g., financial: 7 years, operational: 2 years)
  - AC: Archival process moves old logs to cold storage
  - AC: Archived logs still queryable but slower access

- [ ] As an auditor, I want to export audit logs in standard formats for external audit tools so that audit evidence is portable
  - AC: Export formats: CSV, JSON, PDF
  - AC: Filterable export: date range, entity type, user, action
  - AC: Export includes: timestamp, user, action, entity, old_value, new_value
  - AC: Digital signature on export file for authenticity

- [ ] As an auditor, I want change comparison view (before vs after) for any audit log entry so that I can see exactly what changed
  - AC: Side-by-side diff view showing old and new field values
  - AC: Highlighted changed fields
  - AC: Nested object changes shown at field level

- [ ] As an admin, I want audit log analytics (most active users, most changed entities, unusual activity patterns) so that I can monitor system usage
  - AC: Dashboard: top users by action count, top entities by change count
  - AC: Unusual activity: access outside business hours, bulk changes, privilege escalation
  - AC: Trend charts over time

#### Technical Notes
- Hash chain: add `previous_hash` and `entry_hash` columns to audit_logs
- Modify AuditService to compute SHA-256 hash chain on insert
- New endpoint: `GET /audit/verify-chain?from=date&to=date`
- Retention: cron job to archive/purge based on policy
- Export: `GET /audit/export?format=csv&from=date&to=date`
- Consider append-only table (no UPDATE/DELETE permissions at DB level)

---

### EPIC-27: Integration Platform
**Priority**: P3 (low)
**Complexity**: XL (3+ weeks)
**Phase**: 6
**Dependencies**: EPIC-06, EPIC-22

**Current State**: Webhook outbound exists. MCP server for AI integration exists. No bank API integrations, government filing API integrations, third-party import/export adapters, or integration monitoring.

#### User Stories

- [ ] As an admin, I want Bank of Thailand API integration for automatic exchange rate updates so that FX rates are current without manual entry
  - AC: Daily scheduled fetch of BOT reference rates
  - AC: Rates stored in exchange_rates table
  - AC: Manual override possible
  - AC: Fetch log with success/failure status

- [ ] As an accountant, I want direct integration with Thai Revenue Department e-filing system so that tax returns are submitted electronically
  - AC: API submission for ภ.พ.30 (VAT return)
  - AC: API submission for ภ.ง.ด.1/3/53 (WHT returns)
  - AC: Submission receipt and status tracking
  - AC: Retry logic for failed submissions

- [ ] As an accountant, I want direct integration with SSO e-filing for social security submissions so that SSC filing is automated
  - AC: Generate and submit ส.ป.ส. 1-10 electronically
  - AC: Submission confirmation tracking

- [ ] As a user, I want to import data from third-party systems (Excel, CSV, other ERP exports) with field mapping so that migration is smooth
  - AC: Upload wizard: select file → detect format → map columns → preview → import
  - AC: Supported formats: CSV, Excel (.xlsx), JSON
  - AC: Validation and error reporting per row
  - AC: Rollback capability for failed imports

- [ ] As an admin, I want an integration dashboard showing status of all external connections so that integration health is monitored
  - AC: Dashboard: connection name, status (active/error), last sync, next sync
  - AC: Alert on integration failure
  - AC: Retry button for failed integrations
  - AC: Historical sync log

- [ ] As a developer, I want an integration adapter framework so that new integrations can be added with minimal effort
  - AC: Adapter interface: authenticate, fetch, transform, load
  - AC: Configuration-driven: connection settings stored in DB
  - AC: Rate limiting and retry built into framework
  - AC: Webhook inbound support (receive events from external systems)

- [ ] As an admin, I want to connect to Thai e-Payment systems (PromptPay, QR30) so that payment collection is modern
  - AC: Generate PromptPay QR code for invoice payment
  - AC: Payment confirmation webhook integration
  - AC: Auto-reconciliation of received payments

#### Technical Notes
- BOT API: https://www.bot.or.th/App/BTWS_STAT (reference rate API)
- Integration framework: abstract adapter pattern with retry/circuit-breaker
- New tables: `integration_connections`, `integration_logs`, `integration_schedules`
- New endpoints: CRUD for `/integrations/connections`, `GET /integrations/dashboard`, `POST /integrations/:id/sync`
- Consider message queue (Bull/BullMQ) for async integration jobs
- Existing import engine (core/import) can be extended for wizard flow

---

## Summary Statistics

| Domain | Epics | Total Stories | P0 | P1 | P2 | P3 |
|--------|-------|--------------|-----|-----|-----|-----|
| Finance | EPIC-01 to EPIC-06 | 39 | 2 | 2 | 2 | 0 |
| Sales | EPIC-07 to EPIC-11 | 28 | 2 | 3 | 0 | 0 |
| Operations | EPIC-12 to EPIC-18 | 45 | 0 | 4 | 3 | 0 |
| Infrastructure | EPIC-19 to EPIC-27 | 51 | 1 | 2 | 4 | 2 |
| **Total** | **27** | **163** | **5** | **11** | **9** | **2** |

## Priority Legend

- **P0 (Critical)**: Blocks core ERP functionality; must be done before beta
- **P1 (High)**: Important for production readiness; required for pilot customers
- **P2 (Medium)**: Enhances value significantly; can ship after initial GA
- **P3 (Low)**: Nice-to-have; competitive differentiators for later releases

## Complexity Legend

- **S (1-2 days)**: Small, isolated change
- **M (3-5 days)**: Moderate; touches 2-3 modules
- **L (1-2 weeks)**: Large; new subsystem or cross-cutting concern
- **XL (3+ weeks)**: Extra large; new domain or major infrastructure change
