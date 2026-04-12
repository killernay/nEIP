# nEIP MCP Tools Reference

> คู่มืออ้างอิง MCP Tools ฉบับสมบูรณ์ — Complete MCP Quick Reference
> Version: 0.9.0 | Total Tools: 110

## Overview

nEIP MCP (Model Context Protocol) server exposes 110 tools across 5 categories for AI-assisted ERP operations.

| Category | Count | Description |
|----------|-------|-------------|
| List | 50 | Query and retrieve data |
| Create | 23 | Create new records |
| Action | 20 | Execute business operations |
| Report | 16 | Generate reports and analytics |
| Auth | 1 | Authentication |

---

## Auth (1 tool)

### auth_login
เข้าสู่ระบบ nEIP — Login and get JWT token.
```json
Input: { "email": "string", "password": "string" }
```
```
Example: auth_login({ email: "admin@company.com", password: "..." })
```

---

## List Tools (50 tools)

### list_accounts
ดูผังบัญชี — List chart of accounts.
```json
Input: { "limit": 50 }
```

### list_invoices
ดูรายการใบแจ้งหนี้ — List invoices (AR).
```json
Input: { "status?": "string", "limit?": 20 }
```

### list_bills
ดูรายการบิล — List bills (AP).
```json
Input: { "limit?": 20 }
```

### list_contacts
ดูทะเบียนลูกค้า/ผู้ขาย — List contacts (CRM).
```json
Input: { "type?": "customer|vendor|both", "limit?": 20 }
```

### list_products
ดูสินค้า — List products.
```json
Input: { "limit?": 20 }
```

### list_employees
ดูพนักงาน — List employees.
```json
Input: { "limit?": 20 }
```

### list_journal_entries
ดูรายการบัญชี — List journal entries.
```json
Input: { "status?": "string", "limit?": 20, "offset?": 0 }
```

### list_payments
ดูรายการรับชำระเงิน (AR) — List AR payments.
```json
Input: { "customerId?": "string", "status?": "string", "limit?": 20 }
```

### list_quotations
ดูรายการใบเสนอราคา — List quotations.
```json
Input: { "status?": "string", "customerId?": "string", "limit?": 20 }
```

### list_sales_orders
ดูรายการใบสั่งขาย — List sales orders.
```json
Input: { "status?": "string", "customerId?": "string", "limit?": 20 }
```

### list_delivery_notes
ดูรายการใบส่งของ — List delivery notes.
```json
Input: { "status?": "string", "salesOrderId?": "string", "limit?": 20 }
```

### list_receipts
ดูรายการใบเสร็จรับเงิน — List receipts.
```json
Input: { "status?": "string", "customerId?": "string", "limit?": 20 }
```

### list_credit_notes
ดูรายการใบลดหนี้ — List credit notes.
```json
Input: { "status?": "string", "customerId?": "string", "limit?": 20 }
```

### list_purchase_orders
ดูรายการใบสั่งซื้อ — List purchase orders.
```json
Input: { "status?": "string", "vendorId?": "string", "limit?": 20 }
```

### list_vendors
ดูรายการผู้ขาย — List vendors.
```json
Input: { "search?": "string", "limit?": 20 }
```

### list_departments
ดูรายการแผนก — List departments (HR).
```json
Input: { }
```

### list_payroll
ดูรายการเงินเดือน — List payroll runs.
```json
Input: { "status?": "string", "limit?": 20 }
```

### list_leave_requests
ดูรายการคำขอลา — List leave requests.
```json
Input: { "status?": "string", "employeeId?": "string", "limit?": 20 }
```

### list_fixed_assets
ดูรายการสินทรัพย์ถาวร — List fixed assets (FI-AA).
```json
Input: { "category?": "string", "status?": "string", "limit?": 20 }
```

### list_bank_accounts
ดูรายการบัญชีธนาคาร — List bank accounts (FI-BL).
```json
Input: { }
```

### list_wht_certificates
ดูรายการใบหัก ณ ที่จ่าย — List WHT certificates.
```json
Input: { "status?": "string", "taxYear?": "number", "taxMonth?": "number", "limit?": 20 }
```

### list_tax_rates
ดูรายการอัตราภาษี — List tax rates (VAT, WHT).
```json
Input: { "limit?": 50 }
```

### list_cost_centers
ดูรายการศูนย์ต้นทุน — List cost centers (CO-CCA).
```json
Input: { }
```

### list_profit_centers
ดูรายการศูนย์กำไร — List profit centers (CO-PCA).
```json
Input: { }
```

### list_budgets
ดูรายการงบประมาณ — List budgets.
```json
Input: { "year?": "number", "limit?": 20 }
```

### list_roles
ดูรายการ roles — List roles and permissions.
```json
Input: { "limit?": 50 }
```

### list_webhooks
ดูรายการ webhooks — List webhook subscriptions.
```json
Input: { "limit?": 50 }
```

### list_fiscal_years
ดูรายการปีบัญชี — List fiscal years.
```json
Input: { "limit?": 20 }
```

### list_stock_levels
ดูระดับสต็อกสินค้า — List current stock levels.
```json
Input: { "productId?": "string" }
```

### get_organization
ดูข้อมูลองค์กร — Get organization settings and details.
```json
Input: { "organizationId": "string" }
```

### list_price_lists
ดูรายการราคา — List price lists (SD-Pricing).
```json
Input: { "limit?": 20 }
```

### list_payment_terms
ดูเงื่อนไขการชำระเงิน — List payment terms.
```json
Input: { "limit?": 20 }
```

### list_dunning_cases
ดูรายการทวงถาม — List dunning cases (AR-Dunning).
```json
Input: { "status?": "string", "limit?": 20 }
```

### list_recurring_je_templates
ดูแม่แบบรายการบัญชีรายงวด — List recurring JE templates.
```json
Input: { "limit?": 20 }
```

### list_purchase_requisitions
ดูใบขอซื้อ — List purchase requisitions (MM-PR).
```json
Input: { "status?": "string", "limit?": 20 }
```

### list_rfqs
ดูใบขอใบเสนอราคา — List RFQs.
```json
Input: { "status?": "string", "limit?": 20 }
```

### list_stock_counts
ดูรายการตรวจนับสต็อก — List stock count sessions (MM-IM).
```json
Input: { "status?": "string", "limit?": 20 }
```

### list_positions
ดูตำแหน่งงาน — List positions (HR-OM).
```json
Input: { "departmentId?": "string", "limit?": 50 }
```

### list_attendance_records
ดูบันทึกการเข้างาน — List attendance records (HR-TM).
```json
Input: { "employeeId?": "string", "date?": "string", "limit?": 20 }
```

### list_currencies
ดูสกุลเงิน — List currencies.
```json
Input: { "limit?": 50 }
```

### list_exchange_rates
ดูอัตราแลกเปลี่ยน — List exchange rates (FI-FX).
```json
Input: { "fromCurrency?": "string", "toCurrency?": "THB", "limit?": 20 }
```

### list_companies
ดูรายการบริษัท — List companies (multi-company).
```json
Input: { "limit?": 20 }
```

### list_approval_workflows
ดู workflow อนุมัติ — List approval workflows.
```json
Input: { "limit?": 20 }
```

### list_approval_requests
ดูคำขออนุมัติ — List approval requests.
```json
Input: { "status?": "string", "limit?": 20 }
```

### list_vendor_returns
ดูใบส่งคืนสินค้า — List vendor returns (MM-RET).
```json
Input: { "status?": "string", "limit?": 20 }
```

### list_batches
ดูรายการ Batch/Lot — List batches and lot numbers (MM-BT).
```json
Input: { "productId?": "string", "limit?": 20 }
```

### list_serial_numbers
ดูรายการ Serial Number — List serial numbers (MM-SN).
```json
Input: { "productId?": "string", "status?": "string", "limit?": 20 }
```

### list_bank_matching_rules
ดูกฎจับคู่ธนาคาร — List bank matching rules (FI-BL).
```json
Input: { "limit?": 20 }
```

### list_pdpa_requests
ดูคำขอ PDPA — List PDPA data subject requests.
```json
Input: { "status?": "string", "limit?": 20 }
```

### list_public_holidays
ดูวันหยุดราชการ — List public holidays (HR).
```json
Input: { "year?": "number", "limit?": 50 }
```

---

## Create Tools (23 tools)

### create_invoice
สร้างใบแจ้งหนี้ — Create a new invoice.
```json
Input: {
  "customerId": "string",
  "dueDate": "string (YYYY-MM-DD)",
  "lines": [{
    "description": "string",
    "quantity": "number",
    "unitPriceSatang": "number",
    "accountId": "string"
  }]
}
```
```
Example: create_invoice({ customerId: "c_123", dueDate: "2026-04-30", lines: [{ description: "บริการที่ปรึกษา", quantity: 1, unitPriceSatang: 5000000, accountId: "acc_rev" }] })
```

### create_journal_entry
สร้างรายการบัญชี — Create a journal entry.
```json
Input: {
  "description": "string",
  "fiscalYear": "number",
  "fiscalPeriod": "number",
  "lines": [{
    "accountId": "string",
    "description": "string",
    "debitSatang": "number",
    "creditSatang": "number"
  }]
}
```

### create_quotation
สร้างใบเสนอราคา — Create a new quotation.
```json
Input: {
  "customerId": "string",
  "customerName": "string",
  "subject": "string",
  "validUntil": "string (YYYY-MM-DD)",
  "notes?": "string",
  "lines": [{ "description": "string", "quantity": "number", "unitPriceSatang": "number" }]
}
```

### create_sales_order
สร้างใบสั่งขาย — Create a new sales order.
```json
Input: {
  "customerId": "string",
  "customerName": "string",
  "orderDate": "string",
  "expectedDeliveryDate?": "string",
  "quotationId?": "string",
  "notes?": "string",
  "lines": [{ "description": "string", "quantity": "number", "unitPriceSatang": "number" }]
}
```

### create_bill
สร้างบิลค่าใช้จ่าย (AP) — Create a new bill.
```json
Input: {
  "vendorId": "string",
  "billDate": "string",
  "dueDate": "string",
  "reference?": "string",
  "notes?": "string",
  "lines": [{ "description": "string", "quantity": "number", "unitPrice": "number", "accountId": "string" }]
}
```

### create_purchase_order
สร้างใบสั่งซื้อ — Create a new purchase order.
```json
Input: {
  "vendorId": "string",
  "orderDate": "string",
  "expectedDate?": "string",
  "notes?": "string",
  "lines": [{ "description": "string", "quantity": "number", "unitPriceSatang": "number" }]
}
```

### create_contact
สร้าง contact ลูกค้า/ผู้ขาย — Create a new contact.
```json
Input: {
  "contactType": "customer|vendor|both",
  "companyName": "string",
  "email?": "string",
  "phone?": "string",
  "taxId?": "string",
  "province?": "string"
}
```

### create_product
สร้างสินค้าใหม่ — Create a new product.
```json
Input: {
  "sku": "string",
  "nameTh": "string",
  "nameEn": "string",
  "unit?": "string (default: ชิ้น)",
  "costPriceSatang?": "number",
  "sellingPriceSatang?": "number",
  "minStockLevel?": "number"
}
```

### create_employee
เพิ่มพนักงานใหม่ — Create a new employee record.
```json
Input: {
  "employeeCode": "string",
  "firstNameTh": "string",
  "lastNameTh": "string",
  "hireDate": "string (YYYY-MM-DD)",
  "position?": "string",
  "salarySatang?": "number",
  "departmentId?": "string"
}
```

### create_price_list
สร้างรายการราคา — Create a new price list (SD-Pricing).
```json
Input: {
  "name": "string",
  "currency?": "string (default: THB)",
  "validFrom": "string",
  "validTo?": "string",
  "items": [{ "productId": "string", "unitPriceSatang": "number" }]
}
```

### create_payment_term
สร้างเงื่อนไขการชำระเงิน — Create a payment term.
```json
Input: {
  "code": "string",
  "description": "string",
  "dueDays": "number",
  "discountPercent?": "number",
  "discountDays?": "number"
}
```

### create_recurring_je_template
สร้างแม่แบบรายการบัญชีรายงวด — Create a recurring JE template.
```json
Input: {
  "name": "string",
  "frequency": "daily|weekly|monthly|quarterly|yearly",
  "startDate": "string",
  "endDate?": "string",
  "lines": [{ "accountId": "string", "description": "string", "debitSatang": "number", "creditSatang": "number" }]
}
```

### create_purchase_requisition
สร้างใบขอซื้อ — Create a purchase requisition (MM-PR).
```json
Input: {
  "requestedBy": "string",
  "requiredDate": "string",
  "notes?": "string",
  "lines": [{ "description": "string", "quantity": "number", "estimatedUnitPriceSatang": "number", "productId?": "string" }]
}
```

### create_rfq
สร้างใบขอใบเสนอราคา — Create an RFQ.
```json
Input: {
  "vendorIds": ["string"],
  "requiredDate": "string",
  "purchaseRequisitionId?": "string",
  "lines": [{ "description": "string", "quantity": "number" }]
}
```

### create_stock_count
สร้างรายการตรวจนับสต็อก — Create a stock count session (MM-IM).
```json
Input: {
  "countDate": "string",
  "warehouseId?": "string",
  "notes?": "string",
  "items": [{ "productId": "string", "countedQty": "number" }]
}
```

### create_position
สร้างตำแหน่งงาน — Create a position (HR-OM).
```json
Input: {
  "title": "string",
  "departmentId": "string",
  "headcount?": "number (default: 1)",
  "level?": "number"
}
```

### record_attendance
บันทึกการเข้างาน — Record attendance (HR-TM).
```json
Input: {
  "employeeId": "string",
  "date": "string (YYYY-MM-DD)",
  "clockIn": "string (HH:MM)",
  "clockOut?": "string (HH:MM)",
  "type?": "normal|overtime|remote (default: normal)"
}
```

### create_currency
เพิ่มสกุลเงิน — Create a currency.
```json
Input: {
  "code": "string (ISO 4217)",
  "name": "string",
  "symbol": "string",
  "decimalPlaces?": "number (default: 2)"
}
```

### create_company
สร้างบริษัท — Create a new company (multi-company).
```json
Input: {
  "name": "string",
  "taxId": "string (13 digits)",
  "currency?": "string (default: THB)",
  "address?": "string"
}
```

### create_approval_workflow
สร้าง workflow อนุมัติ — Create an approval workflow.
```json
Input: {
  "name": "string",
  "documentType": "string",
  "steps": [{
    "order": "number",
    "approverRoleId?": "string",
    "approverUserId?": "string",
    "condition?": "string"
  }]
}
```

### create_vendor_return
สร้างใบส่งคืนสินค้า — Create a vendor return (MM-RET).
```json
Input: {
  "vendorId": "string",
  "billId?": "string",
  "reason": "string",
  "lines": [{ "productId": "string", "quantity": "number", "unitPriceSatang": "number" }]
}
```

### create_batch
สร้าง Batch/Lot — Create a batch or lot number (MM-BT).
```json
Input: {
  "productId": "string",
  "batchNumber": "string",
  "manufactureDate?": "string",
  "expiryDate?": "string",
  "quantity": "number"
}
```

### create_bank_matching_rule
สร้างกฎจับคู่ธนาคาร — Create a bank matching rule (FI-BL).
```json
Input: {
  "name": "string",
  "bankAccountId": "string",
  "matchField": "description|amount|reference",
  "matchPattern": "string",
  "targetAccountId": "string",
  "priority?": "number (default: 10)"
}
```

---

## Action Tools (20 tools)

### post_invoice
Post ใบแจ้งหนี้ (draft -> posted) — Post an invoice, creating journal entries.
```json
Input: { "invoiceId": "string" }
```

### void_invoice
ยกเลิกใบแจ้งหนี้ — Void an invoice, preventing further payment.
```json
Input: { "invoiceId": "string" }
```

### post_bill
Post บิล (draft -> posted) — Post a bill, creating journal entries.
```json
Input: { "billId": "string" }
```

### close_fiscal_period
ปิดงวดบัญชี — Close a fiscal period to prevent further postings.
```json
Input: { "periodId": "string" }
```

### month_end_close
ปิดงวดสิ้นเดือน — Run month-end closing procedures.
```json
Input: { "fiscalYear": "number", "fiscalPeriod": "number (1-12)" }
```

### close_fiscal_year
ปิดปีบัญชี — Close a fiscal year (year-end close).
```json
Input: { "fiscalYearId": "string" }
```

### reopen_fiscal_year
เปิดปีบัญชีอีกครั้ง — Reopen a closed fiscal year.
```json
Input: { "fiscalYearId": "string" }
```

### run_dunning
รันกระบวนการทวงถาม — Run dunning process for overdue invoices.
```json
Input: { "asOfDate?": "string", "customerId?": "string" }
```

### run_recurring_je
รันรายการบัญชีรายงวด — Execute recurring JE templates.
```json
Input: { "templateId?": "string", "postingDate?": "string" }
```

### check_credit
ตรวจสอบวงเงินลูกค้า — Check customer credit limit and exposure.
```json
Input: { "customerId": "string", "orderAmountSatang?": "string" }
```

### approve_pr
อนุมัติใบขอซื้อ — Approve a purchase requisition.
```json
Input: { "purchaseRequisitionId": "string", "notes?": "string" }
```

### submit_rfq
ส่ง RFQ ให้ผู้ขาย — Submit RFQ to vendors.
```json
Input: { "rfqId": "string" }
```

### post_stock_count
ยืนยันผลตรวจนับสต็อก — Post stock count adjustments to inventory.
```json
Input: { "stockCountId": "string" }
```

### auto_reconcile_bank
จับคู่ธนาคารอัตโนมัติ — Auto-reconcile bank transactions.
```json
Input: { "bankAccountId": "string", "statementDate?": "string" }
```

### submit_for_approval
ส่งเอกสารเพื่อขออนุมัติ — Submit a document for approval.
```json
Input: { "documentType": "string", "documentId": "string", "notes?": "string" }
```

### approve_request
อนุมัติคำขอ — Approve an approval request.
```json
Input: { "requestId": "string", "notes?": "string" }
```

### reject_request
ปฏิเสธคำขอ — Reject an approval request.
```json
Input: { "requestId": "string", "reason": "string" }
```

### delegate_approval
มอบหมายอนุมัติ — Delegate an approval request to another user.
```json
Input: { "requestId": "string", "delegateToUserId": "string", "reason?": "string" }
```

### fx_revaluation
ปรับปรุงอัตราแลกเปลี่ยน — Run foreign currency revaluation (FI-FX).
```json
Input: { "asOfDate": "string", "currencyCode?": "string" }
```

### resolve_price
คำนวณราคา — Resolve price from price lists and conditions (SD-Pricing).
```json
Input: { "productId": "string", "customerId?": "string", "quantity?": "number (default: 1)", "date?": "string" }
```

---

## Report Tools (16 tools)

### dashboard
ดูภาพรวมธุรกิจ — Executive dashboard with KPIs.
```json
Input: { }
```
Returns: revenue, expenses, net profit, cash balance, AR/AP totals, overdue counts.

### report_trial_balance
งบทดลอง — Trial balance report.
```json
Input: { "fiscalYear?": "number" }
```

### report_pnl
งบกำไรขาดทุนเปรียบเทียบ — P&L comparison report.
```json
Input: { "mode": "monthly|ytd|yoy|mom", "fiscalYear": "number" }
```
- **monthly** — รายเดือน: breakdown by month
- **ytd** — สะสม: year-to-date cumulative
- **yoy** — ปีต่อปี: year-over-year comparison
- **mom** — เดือนต่อเดือน: month-over-month comparison

### report_income_statement
งบกำไรขาดทุน — Income statement report.
```json
Input: { "startDate?": "string", "endDate?": "string" }
```

### report_balance_sheet
งบดุล — Balance sheet report.
```json
Input: { "asOf?": "string (YYYY-MM-DD)" }
```

### report_budget_variance
รายงานงบประมาณเทียบจริง — Budget vs actual variance report.
```json
Input: { "year?": "number", "period?": "number" }
```

### report_ar_aging
รายงานอายุลูกหนี้ — Accounts receivable aging report.
```json
Input: { "asOf?": "string (YYYY-MM-DD)" }
```
Returns: aging buckets (current, 1-30, 31-60, 61-90, 90+).

### report_ap_aging
รายงานอายุเจ้าหนี้ — Accounts payable aging report.
```json
Input: { "asOf?": "string (YYYY-MM-DD)" }
```

### audit_logs
ดูบันทึกการเปลี่ยนแปลง — View audit trail.
```json
Input: { "limit?": 20 }
```

### generate_vat_return
สร้างแบบ ภ.พ.30 — Generate VAT return report.
```json
Input: { "taxYear": "number", "taxMonth": "number" }
```

### generate_ssc_filing
สร้างแบบ สปส.1-10 — Generate social security contribution filing.
```json
Input: { "year": "number", "month": "number" }
```

### generate_cash_flow
งบกระแสเงินสด — Generate cash flow statement.
```json
Input: { "startDate?": "string", "endDate?": "string" }
```

### run_anomaly_scan
สแกนความผิดปกติ — Run AI anomaly detection scan on transactions.
```json
Input: { "scope?": "all|gl|ar|ap|payroll (default: all)", "startDate?": "string", "endDate?": "string" }
```
Returns: list of anomalies with severity, description, and suggested actions.

### run_cash_forecast
พยากรณ์กระแสเงินสด — Run AI cash flow forecast.
```json
Input: { "horizonDays?": "number (default: 30)" }
```

### categorize_transaction
จัดหมวดหมู่รายการ — AI-categorize a bank transaction.
```json
Input: { "description": "string", "amountSatang": "string", "bankAccountId?": "string" }
```
Returns: suggested account, confidence score, category.

### generate_predictions
สร้างการพยากรณ์ — Generate AI predictions.
```json
Input: { "metric": "revenue|expenses|profit|cash_balance|ar_collections", "horizonMonths?": "number (default: 3)" }
```

---

## Notes

### Monetary Values
All monetary values use **satang** (1 THB = 100 satang) as bigint/string to avoid floating-point issues.

### Authentication
All tools require a valid JWT token obtained via `auth_login`. The token is automatically managed by the MCP server session.

### Pagination
Most list tools support `limit` and `offset` parameters for pagination.

### Error Handling
Tools return structured errors with:
- `code` — Error code (e.g., `NOT_FOUND`, `VALIDATION_ERROR`)
- `message` — Human-readable error description
- `details` — Additional context
