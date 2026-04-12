# nEIP MCP Tools Reference

> คู่มืออ้างอิง MCP Tools ฉบับสมบูรณ์ — Complete MCP Reference
> Version: 0.9.0 | Total Tools: 110

## Overview

nEIP MCP (Model Context Protocol) server exposes **110 tools** across 5 categories for AI-assisted ERP operations. Transport: **stdio**. Auth: **JWT Bearer token**.

| Category | Count | Description |
|----------|-------|-------------|
| Auth | 1 | Authentication |
| List | 50 | Query and retrieve data |
| Create | 23 | Create new records |
| Action | 20 | Execute business operations |
| Report | 16 | Generate reports and analytics |

**Note:** All monetary values use **satang** (1 THB = 100 satang) as bigint strings. All tools (except `auth_login`) require a valid JWT token.

---

## Auth (1 tool)

### auth_login
**Category:** Auth
**Description:** เข้าสู่ระบบ nEIP — Login and get JWT token
**Input Schema:**
```json
{
  "email": "string (required) — Email address",
  "password": "string (required) — Password"
}
```
**Output:** Login confirmation message. JWT token is stored internally for subsequent API calls.
**Example:**
```json
{ "email": "admin@company.com", "password": "secret123" }
```

---

## List (50 tools)

### list_accounts
**Category:** List
**Description:** ดูผังบัญชี — List chart of accounts
**Input Schema:**
```json
{
  "limit": "number (optional, default: 50) — Max items"
}
```
**Output:** Array of GL account objects (id, code, name, type, balance).
**Example:**
```json
{ "limit": 100 }
```

### list_invoices
**Category:** List
**Description:** ดูรายการใบแจ้งหนี้ — List invoices
**Input Schema:**
```json
{
  "status": "string (optional) — Filter by status: draft, posted, paid, voided",
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of invoice objects with customer info, amounts, and status.
**Example:**
```json
{ "status": "posted", "limit": 10 }
```

### list_bills
**Category:** List
**Description:** ดูรายการบิล — List bills (AP)
**Input Schema:**
```json
{
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of bill objects with vendor info, amounts, and status.
**Example:**
```json
{ "limit": 20 }
```

### list_contacts
**Category:** List
**Description:** ดูทะเบียนลูกค้า/ผู้ขาย — List contacts (CRM)
**Input Schema:**
```json
{
  "type": "enum (optional) — Contact type filter: customer | vendor | both",
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of contact objects with company name, type, email, phone.
**Example:**
```json
{ "type": "customer", "limit": 50 }
```

### list_products
**Category:** List
**Description:** ดูสินค้า — List products
**Input Schema:**
```json
{
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of product objects (id, sku, nameTh, nameEn, prices).
**Example:**
```json
{ "limit": 50 }
```

### list_employees
**Category:** List
**Description:** ดูพนักงาน — List employees
**Input Schema:**
```json
{
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of employee objects with names, positions, hire dates.
**Example:**
```json
{ "limit": 50 }
```

### list_journal_entries
**Category:** List
**Description:** ดูรายการบัญชี — List journal entries
**Input Schema:**
```json
{
  "status": "string (optional) — Filter by status: draft, posted, voided",
  "limit": "number (optional, default: 20) — Max items",
  "offset": "number (optional, default: 0) — Offset for pagination"
}
```
**Output:** Array of journal entry objects with lines, amounts, and status.
**Example:**
```json
{ "status": "posted", "limit": 20, "offset": 0 }
```

### list_payments
**Category:** List
**Description:** ดูรายการรับชำระเงิน (AR) — List AR payments
**Input Schema:**
```json
{
  "customerId": "string (optional) — Filter by customer ID",
  "status": "string (optional) — Filter by status",
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of payment objects with amounts, dates, and linked invoices.
**Example:**
```json
{ "customerId": "cust-001", "limit": 10 }
```

### list_quotations
**Category:** List
**Description:** ดูรายการใบเสนอราคา — List quotations
**Input Schema:**
```json
{
  "status": "string (optional) — Filter by status: draft, sent, approved, rejected, converted, expired",
  "customerId": "string (optional) — Filter by customer ID",
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of quotation objects with lines, validity dates.
**Example:**
```json
{ "status": "sent", "limit": 10 }
```

### list_sales_orders
**Category:** List
**Description:** ดูรายการใบสั่งขาย — List sales orders (ใบสั่งขาย)
**Input Schema:**
```json
{
  "status": "string (optional) — Filter by status: draft, confirmed, delivered, cancelled",
  "customerId": "string (optional) — Filter by customer ID",
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of sales order objects with lines and delivery status.
**Example:**
```json
{ "status": "confirmed", "customerId": "cust-001" }
```

### list_delivery_notes
**Category:** List
**Description:** ดูรายการใบส่งของ — List delivery notes (ใบส่งของ)
**Input Schema:**
```json
{
  "status": "string (optional) — Filter by status",
  "salesOrderId": "string (optional) — Filter by sales order ID",
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of delivery note objects linked to sales orders.
**Example:**
```json
{ "salesOrderId": "so-001" }
```

### list_receipts
**Category:** List
**Description:** ดูรายการใบเสร็จรับเงิน — List receipts (ใบเสร็จรับเงิน)
**Input Schema:**
```json
{
  "status": "string (optional) — Filter by status: issued, voided",
  "customerId": "string (optional) — Filter by customer ID",
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of receipt objects.
**Example:**
```json
{ "status": "issued", "limit": 10 }
```

### list_credit_notes
**Category:** List
**Description:** ดูรายการใบลดหนี้ — List credit notes (ใบลดหนี้)
**Input Schema:**
```json
{
  "status": "string (optional) — Filter by status: draft, issued, voided",
  "customerId": "string (optional) — Filter by customer ID",
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of credit note objects.
**Example:**
```json
{ "status": "issued" }
```

### list_purchase_orders
**Category:** List
**Description:** ดูรายการใบสั่งซื้อ — List purchase orders (ใบสั่งซื้อ)
**Input Schema:**
```json
{
  "status": "string (optional) — Filter by status: draft, sent, received, cancelled",
  "vendorId": "string (optional) — Filter by vendor ID",
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of purchase order objects with vendor info and lines.
**Example:**
```json
{ "status": "sent", "vendorId": "vend-001" }
```

### list_vendors
**Category:** List
**Description:** ดูรายการผู้ขาย — List vendors
**Input Schema:**
```json
{
  "search": "string (optional) — Search by name or tax ID",
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of vendor objects.
**Example:**
```json
{ "search": "ABC Corp" }
```

### list_departments
**Category:** List
**Description:** ดูรายการแผนก — List departments (HR)
**Input Schema:**
```json
{}
```
**Output:** Array of department objects (id, name, headcount).
**Example:**
```json
{}
```

### list_payroll
**Category:** List
**Description:** ดูรายการเงินเดือน — List payroll runs
**Input Schema:**
```json
{
  "status": "string (optional) — Filter by status: draft, calculated, approved, paid",
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of payroll run objects with totals and status.
**Example:**
```json
{ "status": "approved" }
```

### list_leave_requests
**Category:** List
**Description:** ดูรายการคำขอลา — List leave requests
**Input Schema:**
```json
{
  "status": "string (optional) — Filter by status: pending, approved, rejected",
  "employeeId": "string (optional) — Filter by employee ID",
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of leave request objects with dates and approval status.
**Example:**
```json
{ "status": "pending", "employeeId": "emp-001" }
```

### list_fixed_assets
**Category:** List
**Description:** ดูรายการสินทรัพย์ถาวร — List fixed assets (FI-AA)
**Input Schema:**
```json
{
  "category": "string (optional) — Filter by category: equipment, vehicle, building, land, furniture, it_equipment, other",
  "status": "string (optional) — Filter by status: active, disposed, written_off",
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of fixed asset objects with depreciation info.
**Example:**
```json
{ "category": "equipment", "status": "active" }
```

### list_bank_accounts
**Category:** List
**Description:** ดูรายการบัญชีธนาคาร — List bank accounts (FI-BL)
**Input Schema:**
```json
{}
```
**Output:** Array of bank account objects with balances.
**Example:**
```json
{}
```

### list_wht_certificates
**Category:** List
**Description:** ดูรายการใบหัก ณ ที่จ่าย — List WHT certificates (ภ.ง.ด.3/53)
**Input Schema:**
```json
{
  "status": "string (optional) — Filter by status: draft, issued, filed, voided",
  "taxYear": "number (optional) — Filter by tax year",
  "taxMonth": "number (optional) — Filter by tax month (1-12)",
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of WHT certificate objects.
**Example:**
```json
{ "taxYear": 2026, "taxMonth": 3 }
```

### list_tax_rates
**Category:** List
**Description:** ดูรายการอัตราภาษี — List tax rates (VAT, WHT)
**Input Schema:**
```json
{
  "limit": "number (optional, default: 50) — Max items"
}
```
**Output:** Array of tax rate objects (VAT, WHT rates).
**Example:**
```json
{ "limit": 50 }
```

### list_cost_centers
**Category:** List
**Description:** ดูรายการศูนย์ต้นทุน — List cost centers (CO-CCA)
**Input Schema:**
```json
{}
```
**Output:** Array of cost center objects.
**Example:**
```json
{}
```

### list_profit_centers
**Category:** List
**Description:** ดูรายการศูนย์กำไร — List profit centers (CO-PCA)
**Input Schema:**
```json
{}
```
**Output:** Array of profit center objects.
**Example:**
```json
{}
```

### list_budgets
**Category:** List
**Description:** ดูรายการงบประมาณ — List budgets
**Input Schema:**
```json
{
  "year": "number (optional) — Filter by fiscal year",
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of budget objects with allocations.
**Example:**
```json
{ "year": 2026 }
```

### list_roles
**Category:** List
**Description:** ดูรายการ roles — List roles and permissions
**Input Schema:**
```json
{
  "limit": "number (optional, default: 50) — Max items"
}
```
**Output:** Array of role objects with permissions.
**Example:**
```json
{ "limit": 50 }
```

### list_webhooks
**Category:** List
**Description:** ดูรายการ webhooks — List webhook subscriptions
**Input Schema:**
```json
{
  "limit": "number (optional, default: 50) — Max items"
}
```
**Output:** Array of webhook subscription objects.
**Example:**
```json
{ "limit": 50 }
```

### list_fiscal_years
**Category:** List
**Description:** ดูรายการปีบัญชี — List fiscal years
**Input Schema:**
```json
{
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of fiscal year objects with open/closed status.
**Example:**
```json
{ "limit": 10 }
```

### list_stock_levels
**Category:** List
**Description:** ดูระดับสต็อกสินค้า — List current stock levels
**Input Schema:**
```json
{
  "productId": "string (optional) — Filter by product ID"
}
```
**Output:** Array of stock level objects (product, warehouse, quantity).
**Example:**
```json
{ "productId": "prod-001" }
```

### get_organization
**Category:** List
**Description:** ดูข้อมูลองค์กร — Get organization settings and details
**Input Schema:**
```json
{
  "organizationId": "string (required) — Organization ID (tenantId from JWT)"
}
```
**Output:** Organization object with settings, address, tax info.
**Example:**
```json
{ "organizationId": "org-001" }
```

### list_price_lists
**Category:** List
**Description:** ดูรายการราคา — List price lists (SD-Pricing)
**Input Schema:**
```json
{
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of price list objects.
**Example:**
```json
{ "limit": 20 }
```

### list_payment_terms
**Category:** List
**Description:** ดูเงื่อนไขการชำระเงิน — List payment terms
**Input Schema:**
```json
{
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of payment term objects (code, dueDays, discount).
**Example:**
```json
{ "limit": 20 }
```

### list_dunning_cases
**Category:** List
**Description:** ดูรายการทวงถาม — List dunning cases (AR-Dunning)
**Input Schema:**
```json
{
  "status": "string (optional) — Filter by status: open, closed, escalated",
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of dunning case objects with customer and overdue info.
**Example:**
```json
{ "status": "open" }
```

### list_recurring_je_templates
**Category:** List
**Description:** ดูแม่แบบรายการบัญชีรายงวด — List recurring journal entry templates
**Input Schema:**
```json
{
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of recurring JE template objects.
**Example:**
```json
{ "limit": 20 }
```

### list_purchase_requisitions
**Category:** List
**Description:** ดูใบขอซื้อ — List purchase requisitions (MM-PR)
**Input Schema:**
```json
{
  "status": "string (optional) — Filter by status: draft, submitted, approved, rejected, converted",
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of purchase requisition objects.
**Example:**
```json
{ "status": "submitted" }
```

### list_rfqs
**Category:** List
**Description:** ดูใบขอใบเสนอราคา — List requests for quotation (RFQ)
**Input Schema:**
```json
{
  "status": "string (optional) — Filter by status: draft, sent, received, closed",
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of RFQ objects.
**Example:**
```json
{ "status": "sent" }
```

### list_stock_counts
**Category:** List
**Description:** ดูรายการตรวจนับสต็อก — List stock count sessions (MM-IM)
**Input Schema:**
```json
{
  "status": "string (optional) — Filter by status: planned, in_progress, completed, posted",
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of stock count session objects.
**Example:**
```json
{ "status": "completed" }
```

### list_positions
**Category:** List
**Description:** ดูตำแหน่งงาน — List positions (HR-OM)
**Input Schema:**
```json
{
  "departmentId": "string (optional) — Filter by department ID",
  "limit": "number (optional, default: 50) — Max items"
}
```
**Output:** Array of position objects with department and headcount.
**Example:**
```json
{ "departmentId": "dept-001" }
```

### list_attendance_records
**Category:** List
**Description:** ดูบันทึกการเข้างาน — List attendance records (HR-TM)
**Input Schema:**
```json
{
  "employeeId": "string (optional) — Filter by employee ID",
  "date": "string (optional) — Filter by date (YYYY-MM-DD)",
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of attendance record objects.
**Example:**
```json
{ "employeeId": "emp-001", "date": "2026-04-01" }
```

### list_currencies
**Category:** List
**Description:** ดูสกุลเงิน — List currencies
**Input Schema:**
```json
{
  "limit": "number (optional, default: 50) — Max items"
}
```
**Output:** Array of currency objects (code, name, symbol).
**Example:**
```json
{ "limit": 50 }
```

### list_exchange_rates
**Category:** List
**Description:** ดูอัตราแลกเปลี่ยน — List exchange rates (FI-FX)
**Input Schema:**
```json
{
  "fromCurrency": "string (optional) — Source currency code (e.g. USD)",
  "toCurrency": "string (optional, default: THB) — Target currency code",
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of exchange rate objects with effective dates.
**Example:**
```json
{ "fromCurrency": "USD", "toCurrency": "THB" }
```

### list_companies
**Category:** List
**Description:** ดูรายการบริษัท — List companies (multi-company)
**Input Schema:**
```json
{
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of company objects.
**Example:**
```json
{ "limit": 20 }
```

### list_approval_workflows
**Category:** List
**Description:** ดู workflow อนุมัติ — List approval workflows
**Input Schema:**
```json
{
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of approval workflow objects with steps.
**Example:**
```json
{ "limit": 20 }
```

### list_approval_requests
**Category:** List
**Description:** ดูคำขออนุมัติ — List approval requests
**Input Schema:**
```json
{
  "status": "string (optional) — Filter by status: pending, approved, rejected",
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of approval request objects.
**Example:**
```json
{ "status": "pending" }
```

### list_vendor_returns
**Category:** List
**Description:** ดูใบส่งคืนสินค้า — List vendor returns (MM-RET)
**Input Schema:**
```json
{
  "status": "string (optional) — Filter by status: draft, sent, received_credit",
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of vendor return objects.
**Example:**
```json
{ "status": "draft" }
```

### list_batches
**Category:** List
**Description:** ดูรายการ Batch/Lot — List batches and lot numbers (MM-BT)
**Input Schema:**
```json
{
  "productId": "string (optional) — Filter by product ID",
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of batch objects with expiry dates and quantities.
**Example:**
```json
{ "productId": "prod-001" }
```

### list_serial_numbers
**Category:** List
**Description:** ดูรายการ Serial Number — List serial numbers (MM-SN)
**Input Schema:**
```json
{
  "productId": "string (optional) — Filter by product ID",
  "status": "string (optional) — Filter by status: in_stock, sold, returned",
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of serial number objects.
**Example:**
```json
{ "productId": "prod-001", "status": "in_stock" }
```

### list_bank_matching_rules
**Category:** List
**Description:** ดูกฎจับคู่ธนาคาร — List bank matching rules (FI-BL)
**Input Schema:**
```json
{
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of bank matching rule objects.
**Example:**
```json
{ "limit": 20 }
```

### list_pdpa_requests
**Category:** List
**Description:** ดูคำขอ PDPA — List PDPA data subject requests
**Input Schema:**
```json
{
  "status": "string (optional) — Filter by status: pending, processing, completed, rejected",
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of PDPA request objects.
**Example:**
```json
{ "status": "pending" }
```

### list_public_holidays
**Category:** List
**Description:** ดูวันหยุดราชการ — List public holidays (HR)
**Input Schema:**
```json
{
  "year": "number (optional) — Filter by year",
  "limit": "number (optional, default: 50) — Max items"
}
```
**Output:** Array of public holiday objects.
**Example:**
```json
{ "year": 2026 }
```

---

## Create (23 tools)

### create_invoice
**Category:** Create
**Description:** สร้างใบแจ้งหนี้ — Create a new invoice
**Input Schema:**
```json
{
  "customerId": "string (required) — Customer ID",
  "dueDate": "string (required) — Due date (YYYY-MM-DD)",
  "lines": "array (required) — Invoice line items: [{ description, quantity, unitPriceSatang, accountId }]"
}
```
**Output:** Created invoice object with ID, number, and calculated totals.
**Example:**
```json
{
  "customerId": "cust-001",
  "dueDate": "2026-05-01",
  "lines": [{ "description": "Consulting", "quantity": 10, "unitPriceSatang": "500000", "accountId": "acc-revenue" }]
}
```

### create_journal_entry
**Category:** Create
**Description:** สร้างรายการบัญชี — Create a journal entry
**Input Schema:**
```json
{
  "description": "string (required) — Journal entry description",
  "fiscalYear": "number (required) — Fiscal year",
  "fiscalPeriod": "number (required) — Fiscal period (1-12)",
  "lines": "array (required) — Journal entry lines (must balance): [{ accountId, description, debitSatang, creditSatang }]"
}
```
**Output:** Created journal entry object.
**Example:**
```json
{
  "description": "Monthly rent",
  "fiscalYear": 2026,
  "fiscalPeriod": 4,
  "lines": [
    { "accountId": "6100", "description": "Rent expense", "debitSatang": "3000000", "creditSatang": "0" },
    { "accountId": "1100", "description": "Cash", "debitSatang": "0", "creditSatang": "3000000" }
  ]
}
```

### create_quotation
**Category:** Create
**Description:** สร้างใบเสนอราคา — Create a new quotation (ใบเสนอราคา)
**Input Schema:**
```json
{
  "customerId": "string (required) — Customer ID",
  "customerName": "string (required) — Customer name",
  "subject": "string (required) — Quotation subject/title",
  "validUntil": "string (required) — Validity date (YYYY-MM-DD)",
  "notes": "string (optional) — Optional notes",
  "lines": "array (required) — Line items: [{ description, quantity, unitPriceSatang }]"
}
```
**Output:** Created quotation object with ID and totals.
**Example:**
```json
{
  "customerId": "cust-001",
  "customerName": "ABC Corp",
  "subject": "IT Services Q2",
  "validUntil": "2026-06-30",
  "lines": [{ "description": "Development", "quantity": 100, "unitPriceSatang": "150000" }]
}
```

### create_sales_order
**Category:** Create
**Description:** สร้างใบสั่งขาย — Create a new sales order (ใบสั่งขาย)
**Input Schema:**
```json
{
  "customerId": "string (required) — Customer ID",
  "customerName": "string (required) — Customer name",
  "orderDate": "string (required) — Order date (YYYY-MM-DD)",
  "expectedDeliveryDate": "string (optional) — Expected delivery date (YYYY-MM-DD)",
  "quotationId": "string (optional) — Source quotation ID",
  "notes": "string (optional) — Optional notes",
  "lines": "array (required) — Line items: [{ description, quantity, unitPriceSatang }]"
}
```
**Output:** Created sales order object.
**Example:**
```json
{
  "customerId": "cust-001",
  "customerName": "ABC Corp",
  "orderDate": "2026-04-12",
  "lines": [{ "description": "Widget A", "quantity": 50, "unitPriceSatang": "100000" }]
}
```

### create_bill
**Category:** Create
**Description:** สร้างบิลค่าใช้จ่าย (AP) — Create a new bill (Accounts Payable)
**Input Schema:**
```json
{
  "vendorId": "string (required) — Vendor ID",
  "billDate": "string (required) — Bill date (YYYY-MM-DD)",
  "dueDate": "string (required) — Due date (YYYY-MM-DD)",
  "reference": "string (optional) — Vendor reference or PO number",
  "notes": "string (optional) — Optional notes",
  "lines": "array (required) — Bill line items: [{ description, quantity, unitPrice, accountId }]"
}
```
**Output:** Created bill object.
**Example:**
```json
{
  "vendorId": "vend-001",
  "billDate": "2026-04-01",
  "dueDate": "2026-05-01",
  "lines": [{ "description": "Office supplies", "quantity": 1, "unitPrice": 5000, "accountId": "6200" }]
}
```

### create_purchase_order
**Category:** Create
**Description:** สร้างใบสั่งซื้อ — Create a new purchase order (ใบสั่งซื้อ)
**Input Schema:**
```json
{
  "vendorId": "string (required) — Vendor ID",
  "orderDate": "string (required) — Order date (YYYY-MM-DD)",
  "expectedDate": "string (optional) — Expected delivery date (YYYY-MM-DD)",
  "notes": "string (optional) — Optional notes",
  "lines": "array (required) — Line items: [{ description, quantity, unitPriceSatang }]"
}
```
**Output:** Created purchase order object.
**Example:**
```json
{
  "vendorId": "vend-001",
  "orderDate": "2026-04-12",
  "lines": [{ "description": "Raw material", "quantity": 100, "unitPriceSatang": "50000" }]
}
```

### create_contact
**Category:** Create
**Description:** สร้าง contact ลูกค้า/ผู้ขาย — Create a new contact (customer or vendor)
**Input Schema:**
```json
{
  "contactType": "enum (required) — Contact type: customer | vendor | both",
  "companyName": "string (required) — Company name",
  "email": "string (optional) — Email address",
  "phone": "string (optional) — Phone number",
  "taxId": "string (optional) — Tax ID (13 digits)",
  "province": "string (optional) — Province"
}
```
**Output:** Created contact object.
**Example:**
```json
{
  "contactType": "customer",
  "companyName": "ABC Corp",
  "email": "contact@abc.co.th",
  "taxId": "0123456789012"
}
```

### create_product
**Category:** Create
**Description:** สร้างสินค้าใหม่ — Create a new product
**Input Schema:**
```json
{
  "sku": "string (required) — Product SKU code",
  "nameTh": "string (required) — Product name in Thai",
  "nameEn": "string (required) — Product name in English",
  "unit": "string (optional, default: ชิ้น) — Unit of measure",
  "costPriceSatang": "number (optional, default: 0) — Cost price in satang",
  "sellingPriceSatang": "number (optional, default: 0) — Selling price in satang",
  "minStockLevel": "number (optional, default: 0) — Minimum stock level"
}
```
**Output:** Created product object.
**Example:**
```json
{
  "sku": "WDG-001",
  "nameTh": "วิดเจ็ต A",
  "nameEn": "Widget A",
  "sellingPriceSatang": 100000
}
```

### create_employee
**Category:** Create
**Description:** เพิ่มพนักงานใหม่ — Create a new employee record
**Input Schema:**
```json
{
  "employeeCode": "string (required) — Employee code (e.g. EMP-001)",
  "firstNameTh": "string (required) — First name in Thai",
  "lastNameTh": "string (required) — Last name in Thai",
  "hireDate": "string (required) — Hire date (YYYY-MM-DD)",
  "position": "string (optional) — Job position/title",
  "salarySatang": "number (optional, default: 0) — Monthly salary in satang",
  "departmentId": "string (optional) — Department ID"
}
```
**Output:** Created employee object.
**Example:**
```json
{
  "employeeCode": "EMP-042",
  "firstNameTh": "สมชาย",
  "lastNameTh": "ใจดี",
  "hireDate": "2026-04-01",
  "position": "Developer",
  "salarySatang": 5000000
}
```

### create_price_list
**Category:** Create
**Description:** สร้างรายการราคา — Create a new price list (SD-Pricing)
**Input Schema:**
```json
{
  "name": "string (required) — Price list name",
  "currency": "string (optional, default: THB) — Currency code",
  "validFrom": "string (required) — Valid from date (YYYY-MM-DD)",
  "validTo": "string (optional) — Valid to date (YYYY-MM-DD)",
  "items": "array (required) — Price list items: [{ productId, unitPriceSatang }]"
}
```
**Output:** Created price list object.
**Example:**
```json
{
  "name": "Standard 2026",
  "validFrom": "2026-01-01",
  "items": [{ "productId": "prod-001", "unitPriceSatang": "100000" }]
}
```

### create_payment_term
**Category:** Create
**Description:** สร้างเงื่อนไขการชำระเงิน — Create a payment term
**Input Schema:**
```json
{
  "code": "string (required) — Payment term code (e.g. NET30)",
  "description": "string (required) — Description",
  "dueDays": "number (required) — Number of days until due",
  "discountPercent": "number (optional, default: 0) — Early payment discount %",
  "discountDays": "number (optional, default: 0) — Days for early payment discount"
}
```
**Output:** Created payment term object.
**Example:**
```json
{
  "code": "NET30",
  "description": "Net 30 days",
  "dueDays": 30
}
```

### create_recurring_je_template
**Category:** Create
**Description:** สร้างแม่แบบรายการบัญชีรายงวด — Create a recurring journal entry template
**Input Schema:**
```json
{
  "name": "string (required) — Template name",
  "frequency": "enum (required) — Recurrence frequency: daily | weekly | monthly | quarterly | yearly",
  "startDate": "string (required) — Start date (YYYY-MM-DD)",
  "endDate": "string (optional) — End date (YYYY-MM-DD)",
  "lines": "array (required) — Journal entry lines (must balance): [{ accountId, description, debitSatang, creditSatang }]"
}
```
**Output:** Created recurring JE template object.
**Example:**
```json
{
  "name": "Monthly depreciation",
  "frequency": "monthly",
  "startDate": "2026-01-01",
  "lines": [
    { "accountId": "6300", "description": "Depreciation", "debitSatang": "500000", "creditSatang": "0" },
    { "accountId": "1500", "description": "Accum. Depreciation", "debitSatang": "0", "creditSatang": "500000" }
  ]
}
```

### create_purchase_requisition
**Category:** Create
**Description:** สร้างใบขอซื้อ — Create a purchase requisition (MM-PR)
**Input Schema:**
```json
{
  "requestedBy": "string (required) — Requester employee ID",
  "requiredDate": "string (required) — Required date (YYYY-MM-DD)",
  "notes": "string (optional) — Optional notes",
  "lines": "array (required) — Requisition line items: [{ description, quantity, estimatedUnitPriceSatang, productId? }]"
}
```
**Output:** Created purchase requisition object.
**Example:**
```json
{
  "requestedBy": "emp-001",
  "requiredDate": "2026-05-01",
  "lines": [{ "description": "Printer paper", "quantity": 100, "estimatedUnitPriceSatang": "15000" }]
}
```

### create_rfq
**Category:** Create
**Description:** สร้างใบขอใบเสนอราคา — Create a request for quotation (RFQ)
**Input Schema:**
```json
{
  "vendorIds": "array (required) — Vendor IDs to send RFQ to",
  "requiredDate": "string (required) — Required date (YYYY-MM-DD)",
  "purchaseRequisitionId": "string (optional) — Source PR ID",
  "lines": "array (required) — RFQ line items: [{ description, quantity, productId? }]"
}
```
**Output:** Created RFQ object.
**Example:**
```json
{
  "vendorIds": ["vend-001", "vend-002"],
  "requiredDate": "2026-05-15",
  "lines": [{ "description": "Laptop", "quantity": 10 }]
}
```

### create_stock_count
**Category:** Create
**Description:** สร้างรายการตรวจนับสต็อก — Create a stock count session (MM-IM)
**Input Schema:**
```json
{
  "countDate": "string (required) — Count date (YYYY-MM-DD)",
  "warehouseId": "string (optional) — Warehouse/location ID",
  "notes": "string (optional) — Optional notes",
  "items": "array (required) — Items counted: [{ productId, countedQty }]"
}
```
**Output:** Created stock count session object.
**Example:**
```json
{
  "countDate": "2026-04-12",
  "items": [{ "productId": "prod-001", "countedQty": 150 }]
}
```

### create_position
**Category:** Create
**Description:** สร้างตำแหน่งงาน — Create a position (HR-OM)
**Input Schema:**
```json
{
  "title": "string (required) — Position title",
  "departmentId": "string (required) — Department ID",
  "headcount": "number (optional, default: 1) — Number of headcount slots",
  "level": "string (optional) — Job level (e.g. junior, mid, senior, manager)"
}
```
**Output:** Created position object.
**Example:**
```json
{
  "title": "Senior Developer",
  "departmentId": "dept-it",
  "headcount": 2,
  "level": "senior"
}
```

### record_attendance
**Category:** Create
**Description:** บันทึกการเข้างาน — Record attendance (HR-TM)
**Input Schema:**
```json
{
  "employeeId": "string (required) — Employee ID",
  "date": "string (required) — Date (YYYY-MM-DD)",
  "clockIn": "string (required) — Clock-in time (HH:mm)",
  "clockOut": "string (optional) — Clock-out time (HH:mm)",
  "type": "enum (optional, default: normal) — Attendance type: normal | overtime | remote"
}
```
**Output:** Created attendance record object.
**Example:**
```json
{
  "employeeId": "emp-001",
  "date": "2026-04-12",
  "clockIn": "09:00",
  "clockOut": "18:00",
  "type": "normal"
}
```

### create_currency
**Category:** Create
**Description:** เพิ่มสกุลเงิน — Create a currency
**Input Schema:**
```json
{
  "code": "string (required) — Currency code (ISO 4217, e.g. USD)",
  "name": "string (required) — Currency name",
  "symbol": "string (required) — Currency symbol (e.g. $)",
  "decimalPlaces": "number (optional, default: 2) — Decimal places"
}
```
**Output:** Created currency object.
**Example:**
```json
{
  "code": "USD",
  "name": "US Dollar",
  "symbol": "$"
}
```

### create_company
**Category:** Create
**Description:** สร้างบริษัท — Create a new company (multi-company)
**Input Schema:**
```json
{
  "name": "string (required) — Company name",
  "taxId": "string (required) — Tax ID (13 digits)",
  "currency": "string (optional, default: THB) — Base currency",
  "address": "string (optional) — Company address"
}
```
**Output:** Created company object.
**Example:**
```json
{
  "name": "XYZ Holdings",
  "taxId": "0123456789012",
  "currency": "THB"
}
```

### create_approval_workflow
**Category:** Create
**Description:** สร้าง workflow อนุมัติ — Create an approval workflow
**Input Schema:**
```json
{
  "name": "string (required) — Workflow name",
  "documentType": "string (required) — Document type (e.g. purchase_requisition, bill, journal_entry)",
  "steps": "array (required) — Approval steps: [{ order, approverRoleId?, approverUserId?, condition? }]"
}
```
**Output:** Created approval workflow object.
**Example:**
```json
{
  "name": "PR Approval",
  "documentType": "purchase_requisition",
  "steps": [
    { "order": 1, "approverRoleId": "manager" },
    { "order": 2, "approverRoleId": "director", "condition": "amount > 100000" }
  ]
}
```

### create_vendor_return
**Category:** Create
**Description:** สร้างใบส่งคืนสินค้า — Create a vendor return (MM-RET)
**Input Schema:**
```json
{
  "vendorId": "string (required) — Vendor ID",
  "billId": "string (optional) — Original bill ID",
  "reason": "string (required) — Return reason",
  "lines": "array (required) — Return line items: [{ productId, quantity, unitPriceSatang }]"
}
```
**Output:** Created vendor return object.
**Example:**
```json
{
  "vendorId": "vend-001",
  "reason": "Defective goods",
  "lines": [{ "productId": "prod-001", "quantity": 5, "unitPriceSatang": "50000" }]
}
```

### create_batch
**Category:** Create
**Description:** สร้าง Batch/Lot — Create a batch or lot number (MM-BT)
**Input Schema:**
```json
{
  "productId": "string (required) — Product ID",
  "batchNumber": "string (required) — Batch/lot number",
  "manufactureDate": "string (optional) — Manufacture date (YYYY-MM-DD)",
  "expiryDate": "string (optional) — Expiry date (YYYY-MM-DD)",
  "quantity": "number (required) — Initial quantity"
}
```
**Output:** Created batch object.
**Example:**
```json
{
  "productId": "prod-001",
  "batchNumber": "BT-2026-001",
  "manufactureDate": "2026-04-01",
  "expiryDate": "2027-04-01",
  "quantity": 1000
}
```

### create_bank_matching_rule
**Category:** Create
**Description:** สร้างกฎจับคู่ธนาคาร — Create a bank matching rule (FI-BL)
**Input Schema:**
```json
{
  "name": "string (required) — Rule name",
  "bankAccountId": "string (required) — Bank account ID",
  "matchField": "enum (required) — Field to match on: description | amount | reference",
  "matchPattern": "string (required) — Match pattern (regex or exact)",
  "targetAccountId": "string (required) — Target GL account ID",
  "priority": "number (optional, default: 10) — Rule priority (lower = higher priority)"
}
```
**Output:** Created bank matching rule object.
**Example:**
```json
{
  "name": "Electricity payment",
  "bankAccountId": "bank-001",
  "matchField": "description",
  "matchPattern": "MEA|PEA",
  "targetAccountId": "6500"
}
```

---

## Action (20 tools)

### post_invoice
**Category:** Action
**Description:** Post ใบแจ้งหนี้ (draft -> posted) — Post an invoice, creating journal entries
**Input Schema:**
```json
{
  "invoiceId": "string (required) — Invoice ID to post"
}
```
**Output:** Updated invoice object with posted status and generated JE.
**Example:**
```json
{ "invoiceId": "inv-001" }
```

### void_invoice
**Category:** Action
**Description:** ยกเลิกใบแจ้งหนี้ — Void an invoice, preventing further payment
**Input Schema:**
```json
{
  "invoiceId": "string (required) — Invoice ID to void"
}
```
**Output:** Updated invoice object with voided status.
**Example:**
```json
{ "invoiceId": "inv-001" }
```

### post_bill
**Category:** Action
**Description:** Post บิล (draft -> posted) — Post a bill, creating journal entries
**Input Schema:**
```json
{
  "billId": "string (required) — Bill ID to post"
}
```
**Output:** Updated bill object with posted status and generated JE.
**Example:**
```json
{ "billId": "bill-001" }
```

### close_fiscal_period
**Category:** Action
**Description:** ปิดงวดบัญชี — Close a fiscal period to prevent further postings
**Input Schema:**
```json
{
  "periodId": "string (required) — Fiscal period ID to close"
}
```
**Output:** Updated fiscal period object with closed status.
**Example:**
```json
{ "periodId": "fp-2026-03" }
```

### month_end_close
**Category:** Action
**Description:** ปิดงวดสิ้นเดือน (month-end close) — Run month-end closing procedures
**Input Schema:**
```json
{
  "fiscalYear": "number (required) — Fiscal year (e.g. 2026)",
  "fiscalPeriod": "number (required) — Fiscal period number (1-12)"
}
```
**Output:** Month-end close results with generated adjustments.
**Example:**
```json
{ "fiscalYear": 2026, "fiscalPeriod": 3 }
```

### close_fiscal_year
**Category:** Action
**Description:** ปิดปีบัญชี — Close a fiscal year (year-end close)
**Input Schema:**
```json
{
  "fiscalYearId": "string (required) — Fiscal year ID to close"
}
```
**Output:** Year-end close results with retained earnings transfer.
**Example:**
```json
{ "fiscalYearId": "fy-2025" }
```

### reopen_fiscal_year
**Category:** Action
**Description:** เปิดปีบัญชีอีกครั้ง — Reopen a closed fiscal year
**Input Schema:**
```json
{
  "fiscalYearId": "string (required) — Fiscal year ID to reopen"
}
```
**Output:** Updated fiscal year object with open status.
**Example:**
```json
{ "fiscalYearId": "fy-2025" }
```

### run_dunning
**Category:** Action
**Description:** รันกระบวนการทวงถาม — Run dunning process for overdue invoices
**Input Schema:**
```json
{
  "asOfDate": "string (optional) — As-of date (YYYY-MM-DD), defaults to today",
  "customerId": "string (optional) — Run for specific customer only"
}
```
**Output:** Dunning run results with generated dunning notices.
**Example:**
```json
{ "asOfDate": "2026-04-12" }
```

### run_recurring_je
**Category:** Action
**Description:** รันรายการบัญชีรายงวด — Execute recurring journal entry templates
**Input Schema:**
```json
{
  "templateId": "string (optional) — Specific template ID (omit to run all due)",
  "postingDate": "string (optional) — Posting date (YYYY-MM-DD), defaults to today"
}
```
**Output:** List of created journal entries from templates.
**Example:**
```json
{ "postingDate": "2026-04-01" }
```

### check_credit
**Category:** Action
**Description:** ตรวจสอบวงเงินลูกค้า — Check customer credit limit and exposure
**Input Schema:**
```json
{
  "customerId": "string (required) — Customer ID to check",
  "orderAmountSatang": "string (optional) — Proposed order amount in satang"
}
```
**Output:** Credit check result (limit, exposure, available, approved/blocked).
**Example:**
```json
{ "customerId": "cust-001", "orderAmountSatang": "5000000" }
```

### approve_pr
**Category:** Action
**Description:** อนุมัติใบขอซื้อ — Approve a purchase requisition
**Input Schema:**
```json
{
  "purchaseRequisitionId": "string (required) — Purchase requisition ID",
  "notes": "string (optional) — Approval notes"
}
```
**Output:** Updated PR object with approved status.
**Example:**
```json
{ "purchaseRequisitionId": "pr-001", "notes": "Approved for Q2 budget" }
```

### submit_rfq
**Category:** Action
**Description:** ส่ง RFQ ให้ผู้ขาย — Submit RFQ to vendors
**Input Schema:**
```json
{
  "rfqId": "string (required) — RFQ ID to submit"
}
```
**Output:** Updated RFQ object with sent status.
**Example:**
```json
{ "rfqId": "rfq-001" }
```

### post_stock_count
**Category:** Action
**Description:** ยืนยันผลตรวจนับสต็อก — Post stock count adjustments to inventory
**Input Schema:**
```json
{
  "stockCountId": "string (required) — Stock count session ID"
}
```
**Output:** Stock count results with inventory adjustments.
**Example:**
```json
{ "stockCountId": "sc-001" }
```

### auto_reconcile_bank
**Category:** Action
**Description:** จับคู่ธนาคารอัตโนมัติ — Auto-reconcile bank transactions
**Input Schema:**
```json
{
  "bankAccountId": "string (required) — Bank account ID",
  "statementDate": "string (optional) — Statement date (YYYY-MM-DD)"
}
```
**Output:** Reconciliation results (matched, unmatched counts).
**Example:**
```json
{ "bankAccountId": "bank-001", "statementDate": "2026-04-12" }
```

### submit_for_approval
**Category:** Action
**Description:** ส่งเอกสารเพื่อขออนุมัติ — Submit a document for approval
**Input Schema:**
```json
{
  "documentType": "string (required) — Document type (e.g. purchase_requisition, bill, journal_entry)",
  "documentId": "string (required) — Document ID",
  "notes": "string (optional) — Submission notes"
}
```
**Output:** Created approval request object.
**Example:**
```json
{ "documentType": "bill", "documentId": "bill-001" }
```

### approve_request
**Category:** Action
**Description:** อนุมัติคำขอ — Approve an approval request
**Input Schema:**
```json
{
  "requestId": "string (required) — Approval request ID",
  "notes": "string (optional) — Approval notes"
}
```
**Output:** Updated approval request with approved status.
**Example:**
```json
{ "requestId": "apr-001", "notes": "Looks good" }
```

### reject_request
**Category:** Action
**Description:** ปฏิเสธคำขอ — Reject an approval request
**Input Schema:**
```json
{
  "requestId": "string (required) — Approval request ID",
  "reason": "string (required) — Rejection reason"
}
```
**Output:** Updated approval request with rejected status.
**Example:**
```json
{ "requestId": "apr-001", "reason": "Over budget" }
```

### delegate_approval
**Category:** Action
**Description:** มอบหมายอนุมัติ — Delegate an approval request to another user
**Input Schema:**
```json
{
  "requestId": "string (required) — Approval request ID",
  "delegateToUserId": "string (required) — User ID to delegate to",
  "reason": "string (optional) — Delegation reason"
}
```
**Output:** Updated approval request with new approver.
**Example:**
```json
{ "requestId": "apr-001", "delegateToUserId": "user-002", "reason": "On leave" }
```

### fx_revaluation
**Category:** Action
**Description:** ปรับปรุงอัตราแลกเปลี่ยน — Run foreign currency revaluation (FI-FX)
**Input Schema:**
```json
{
  "asOfDate": "string (required) — Revaluation date (YYYY-MM-DD)",
  "currencyCode": "string (optional) — Specific currency (omit for all)"
}
```
**Output:** Revaluation results with gain/loss journal entries.
**Example:**
```json
{ "asOfDate": "2026-03-31", "currencyCode": "USD" }
```

### resolve_price
**Category:** Action
**Description:** คำนวณราคา — Resolve price from price lists and conditions (SD-Pricing)
**Input Schema:**
```json
{
  "productId": "string (required) — Product ID",
  "customerId": "string (optional) — Customer ID for customer-specific pricing",
  "quantity": "number (optional, default: 1) — Quantity for volume discounts",
  "date": "string (optional) — Pricing date (YYYY-MM-DD)"
}
```
**Output:** Resolved price with applicable discounts and conditions.
**Example:**
```json
{ "productId": "prod-001", "customerId": "cust-001", "quantity": 100 }
```

---

## Report (16 tools)

### dashboard
**Category:** Report
**Description:** ดูภาพรวมธุรกิจ — Executive dashboard with KPIs
**Input Schema:**
```json
{}
```
**Output:** Dashboard object with revenue, expenses, profit, AR/AP totals, and cash position.
**Example:**
```json
{}
```

### report_trial_balance
**Category:** Report
**Description:** งบทดลอง — Trial balance report
**Input Schema:**
```json
{
  "fiscalYear": "number (optional) — Fiscal year e.g. 2026"
}
```
**Output:** Trial balance with debit/credit totals per account.
**Example:**
```json
{ "fiscalYear": 2026 }
```

### report_pnl
**Category:** Report
**Description:** งบกำไรขาดทุน — P&L comparison (monthly/ytd/yoy/mom)
**Input Schema:**
```json
{
  "mode": "enum (required) — Report mode: monthly | ytd | yoy | mom",
  "fiscalYear": "number (required) — Fiscal year"
}
```
**Output:** P&L comparison report with variance analysis.
**Example:**
```json
{ "mode": "yoy", "fiscalYear": 2026 }
```

### report_income_statement
**Category:** Report
**Description:** งบกำไรขาดทุน — Income statement report
**Input Schema:**
```json
{
  "startDate": "string (optional) — Start date (YYYY-MM-DD)",
  "endDate": "string (optional) — End date (YYYY-MM-DD)"
}
```
**Output:** Income statement with revenue, COGS, expenses, and net income.
**Example:**
```json
{ "startDate": "2026-01-01", "endDate": "2026-03-31" }
```

### report_balance_sheet
**Category:** Report
**Description:** งบดุล — Balance sheet report
**Input Schema:**
```json
{
  "asOf": "string (optional) — As-of date (YYYY-MM-DD), defaults to today"
}
```
**Output:** Balance sheet with assets, liabilities, and equity.
**Example:**
```json
{ "asOf": "2026-03-31" }
```

### report_budget_variance
**Category:** Report
**Description:** รายงานงบประมาณเทียบจริง — Budget vs actual variance report
**Input Schema:**
```json
{
  "year": "number (optional) — Fiscal year (e.g. 2026)",
  "period": "number (optional) — Fiscal period (1-12)"
}
```
**Output:** Budget variance report with favorable/unfavorable indicators.
**Example:**
```json
{ "year": 2026, "period": 3 }
```

### report_ar_aging
**Category:** Report
**Description:** รายงานอายุลูกหนี้ — Accounts receivable aging report
**Input Schema:**
```json
{
  "asOf": "string (optional) — As-of date (YYYY-MM-DD), defaults to today"
}
```
**Output:** AR aging buckets (current, 1-30, 31-60, 61-90, 90+) per customer.
**Example:**
```json
{ "asOf": "2026-04-12" }
```

### report_ap_aging
**Category:** Report
**Description:** รายงานอายุเจ้าหนี้ — Accounts payable aging report
**Input Schema:**
```json
{
  "asOf": "string (optional) — As-of date (YYYY-MM-DD), defaults to today"
}
```
**Output:** AP aging buckets per vendor.
**Example:**
```json
{ "asOf": "2026-04-12" }
```

### audit_logs
**Category:** Report
**Description:** ดูบันทึกการเปลี่ยนแปลง — View audit trail
**Input Schema:**
```json
{
  "limit": "number (optional, default: 20) — Max items"
}
```
**Output:** Array of audit log entries (user, action, entity, timestamp).
**Example:**
```json
{ "limit": 50 }
```

### generate_vat_return
**Category:** Report
**Description:** สร้างแบบ ภ.พ.30 — Generate VAT return report (ภ.พ.30)
**Input Schema:**
```json
{
  "taxYear": "number (required) — Tax year",
  "taxMonth": "number (required) — Tax month (1-12)"
}
```
**Output:** VAT return data (output VAT, input VAT, net payable).
**Example:**
```json
{ "taxYear": 2026, "taxMonth": 3 }
```

### generate_ssc_filing
**Category:** Report
**Description:** สร้างแบบ สปส. — Generate social security contribution filing (สปส.1-10)
**Input Schema:**
```json
{
  "year": "number (required) — Year",
  "month": "number (required) — Month (1-12)"
}
```
**Output:** SSC filing data with employee contributions.
**Example:**
```json
{ "year": 2026, "month": 3 }
```

### generate_cash_flow
**Category:** Report
**Description:** งบกระแสเงินสด — Generate cash flow statement
**Input Schema:**
```json
{
  "startDate": "string (optional) — Start date (YYYY-MM-DD)",
  "endDate": "string (optional) — End date (YYYY-MM-DD)"
}
```
**Output:** Cash flow statement (operating, investing, financing activities).
**Example:**
```json
{ "startDate": "2026-01-01", "endDate": "2026-03-31" }
```

### run_anomaly_scan
**Category:** Report
**Description:** สแกนความผิดปกติ — Run AI anomaly detection scan on transactions
**Input Schema:**
```json
{
  "scope": "enum (optional, default: all) — Scan scope: all | gl | ar | ap | payroll",
  "startDate": "string (optional) — Start date (YYYY-MM-DD)",
  "endDate": "string (optional) — End date (YYYY-MM-DD)"
}
```
**Output:** Array of detected anomalies with severity and description.
**Example:**
```json
{ "scope": "gl", "startDate": "2026-01-01" }
```

### run_cash_forecast
**Category:** Report
**Description:** พยากรณ์กระแสเงินสด — Run AI cash flow forecast
**Input Schema:**
```json
{
  "horizonDays": "number (optional, default: 30) — Forecast horizon in days"
}
```
**Output:** Daily cash balance projections with confidence intervals.
**Example:**
```json
{ "horizonDays": 90 }
```

### categorize_transaction
**Category:** Report
**Description:** จัดหมวดหมู่รายการ — AI-categorize a bank transaction
**Input Schema:**
```json
{
  "description": "string (required) — Transaction description",
  "amountSatang": "string (required) — Amount in satang",
  "bankAccountId": "string (optional) — Bank account ID"
}
```
**Output:** Suggested GL account, category, and confidence score.
**Example:**
```json
{ "description": "MEA Electricity Bill", "amountSatang": "350000" }
```

### generate_predictions
**Category:** Report
**Description:** สร้างการพยากรณ์ — Generate AI predictions (revenue, expenses, etc.)
**Input Schema:**
```json
{
  "metric": "enum (required) — Metric to predict: revenue | expenses | profit | cash_balance | ar_collections",
  "horizonMonths": "number (optional, default: 3) — Prediction horizon in months"
}
```
**Output:** Monthly predictions with confidence intervals and trend.
**Example:**
```json
{ "metric": "revenue", "horizonMonths": 6 }
```

---

## Quick Reference — All 110 Tools

| # | Tool | Category | Description |
|---|------|----------|-------------|
| 1 | auth_login | Auth | เข้าสู่ระบบ — Login |
| 2 | list_accounts | List | ดูผังบัญชี — Chart of accounts |
| 3 | list_invoices | List | ดูใบแจ้งหนี้ — Invoices |
| 4 | list_bills | List | ดูบิล — Bills (AP) |
| 5 | list_contacts | List | ดูทะเบียน — Contacts (CRM) |
| 6 | list_products | List | ดูสินค้า — Products |
| 7 | list_employees | List | ดูพนักงาน — Employees |
| 8 | list_journal_entries | List | ดูรายการบัญชี — Journal entries |
| 9 | list_payments | List | ดูรับชำระ — AR payments |
| 10 | list_quotations | List | ดูใบเสนอราคา — Quotations |
| 11 | list_sales_orders | List | ดูใบสั่งขาย — Sales orders |
| 12 | list_delivery_notes | List | ดูใบส่งของ — Delivery notes |
| 13 | list_receipts | List | ดูใบเสร็จ — Receipts |
| 14 | list_credit_notes | List | ดูใบลดหนี้ — Credit notes |
| 15 | list_purchase_orders | List | ดูใบสั่งซื้อ — Purchase orders |
| 16 | list_vendors | List | ดูผู้ขาย — Vendors |
| 17 | list_departments | List | ดูแผนก — Departments |
| 18 | list_payroll | List | ดูเงินเดือน — Payroll runs |
| 19 | list_leave_requests | List | ดูคำขอลา — Leave requests |
| 20 | list_fixed_assets | List | ดูสินทรัพย์ — Fixed assets |
| 21 | list_bank_accounts | List | ดูบัญชีธนาคาร — Bank accounts |
| 22 | list_wht_certificates | List | ดูใบหัก ณ ที่จ่าย — WHT certs |
| 23 | list_tax_rates | List | ดูอัตราภาษี — Tax rates |
| 24 | list_cost_centers | List | ดูศูนย์ต้นทุน — Cost centers |
| 25 | list_profit_centers | List | ดูศูนย์กำไร — Profit centers |
| 26 | list_budgets | List | ดูงบประมาณ — Budgets |
| 27 | list_roles | List | ดู roles — Roles & permissions |
| 28 | list_webhooks | List | ดู webhooks — Webhook subscriptions |
| 29 | list_fiscal_years | List | ดูปีบัญชี — Fiscal years |
| 30 | list_stock_levels | List | ดูระดับสต็อก — Stock levels |
| 31 | get_organization | List | ดูข้อมูลองค์กร — Organization info |
| 32 | list_price_lists | List | ดูรายการราคา — Price lists |
| 33 | list_payment_terms | List | ดูเงื่อนไขชำระ — Payment terms |
| 34 | list_dunning_cases | List | ดูทวงถาม — Dunning cases |
| 35 | list_recurring_je_templates | List | ดูแม่แบบ JE — Recurring JE templates |
| 36 | list_purchase_requisitions | List | ดูใบขอซื้อ — Purchase requisitions |
| 37 | list_rfqs | List | ดู RFQ — Requests for quotation |
| 38 | list_stock_counts | List | ดูตรวจนับ — Stock counts |
| 39 | list_positions | List | ดูตำแหน่ง — Positions |
| 40 | list_attendance_records | List | ดูเข้างาน — Attendance records |
| 41 | list_currencies | List | ดูสกุลเงิน — Currencies |
| 42 | list_exchange_rates | List | ดูอัตราแลกเปลี่ยน — Exchange rates |
| 43 | list_companies | List | ดูบริษัท — Companies |
| 44 | list_approval_workflows | List | ดู workflow — Approval workflows |
| 45 | list_approval_requests | List | ดูคำขออนุมัติ — Approval requests |
| 46 | list_vendor_returns | List | ดูใบส่งคืน — Vendor returns |
| 47 | list_batches | List | ดู Batch/Lot — Batches |
| 48 | list_serial_numbers | List | ดู Serial — Serial numbers |
| 49 | list_bank_matching_rules | List | ดูกฎจับคู่ — Bank matching rules |
| 50 | list_pdpa_requests | List | ดูคำขอ PDPA — PDPA requests |
| 51 | list_public_holidays | List | ดูวันหยุด — Public holidays |
| 52 | create_invoice | Create | สร้างใบแจ้งหนี้ — New invoice |
| 53 | create_journal_entry | Create | สร้างรายการบัญชี — New JE |
| 54 | create_quotation | Create | สร้างใบเสนอราคา — New quotation |
| 55 | create_sales_order | Create | สร้างใบสั่งขาย — New sales order |
| 56 | create_bill | Create | สร้างบิล — New bill (AP) |
| 57 | create_purchase_order | Create | สร้างใบสั่งซื้อ — New PO |
| 58 | create_contact | Create | สร้าง contact — New contact |
| 59 | create_product | Create | สร้างสินค้า — New product |
| 60 | create_employee | Create | เพิ่มพนักงาน — New employee |
| 61 | create_price_list | Create | สร้างรายการราคา — New price list |
| 62 | create_payment_term | Create | สร้างเงื่อนไขชำระ — New payment term |
| 63 | create_recurring_je_template | Create | สร้างแม่แบบ JE — New recurring JE template |
| 64 | create_purchase_requisition | Create | สร้างใบขอซื้อ — New PR |
| 65 | create_rfq | Create | สร้าง RFQ — New RFQ |
| 66 | create_stock_count | Create | สร้างตรวจนับ — New stock count |
| 67 | create_position | Create | สร้างตำแหน่ง — New position |
| 68 | record_attendance | Create | บันทึกเข้างาน — Record attendance |
| 69 | create_currency | Create | เพิ่มสกุลเงิน — New currency |
| 70 | create_company | Create | สร้างบริษัท — New company |
| 71 | create_approval_workflow | Create | สร้าง workflow — New approval workflow |
| 72 | create_vendor_return | Create | สร้างใบส่งคืน — New vendor return |
| 73 | create_batch | Create | สร้าง Batch — New batch/lot |
| 74 | create_bank_matching_rule | Create | สร้างกฎจับคู่ — New bank matching rule |
| 75 | post_invoice | Action | Post ใบแจ้งหนี้ — Post invoice |
| 76 | void_invoice | Action | ยกเลิกใบแจ้งหนี้ — Void invoice |
| 77 | post_bill | Action | Post บิล — Post bill |
| 78 | close_fiscal_period | Action | ปิดงวดบัญชี — Close fiscal period |
| 79 | month_end_close | Action | ปิดงวดสิ้นเดือน — Month-end close |
| 80 | close_fiscal_year | Action | ปิดปีบัญชี — Close fiscal year |
| 81 | reopen_fiscal_year | Action | เปิดปีบัญชีอีกครั้ง — Reopen fiscal year |
| 82 | run_dunning | Action | รันทวงถาม — Run dunning |
| 83 | run_recurring_je | Action | รัน JE รายงวด — Execute recurring JEs |
| 84 | check_credit | Action | ตรวจสอบวงเงิน — Check credit limit |
| 85 | approve_pr | Action | อนุมัติใบขอซื้อ — Approve PR |
| 86 | submit_rfq | Action | ส่ง RFQ — Submit RFQ |
| 87 | post_stock_count | Action | ยืนยันนับสต็อก — Post stock count |
| 88 | auto_reconcile_bank | Action | จับคู่ธนาคาร — Auto-reconcile bank |
| 89 | submit_for_approval | Action | ส่งขออนุมัติ — Submit for approval |
| 90 | approve_request | Action | อนุมัติคำขอ — Approve request |
| 91 | reject_request | Action | ปฏิเสธคำขอ — Reject request |
| 92 | delegate_approval | Action | มอบหมายอนุมัติ — Delegate approval |
| 93 | fx_revaluation | Action | ปรับปรุง FX — FX revaluation |
| 94 | resolve_price | Action | คำนวณราคา — Resolve price |
| 95 | dashboard | Report | ภาพรวมธุรกิจ — Executive dashboard |
| 96 | report_trial_balance | Report | งบทดลอง — Trial balance |
| 97 | report_pnl | Report | งบกำไรขาดทุน — P&L comparison |
| 98 | report_income_statement | Report | งบกำไรขาดทุน — Income statement |
| 99 | report_balance_sheet | Report | งบดุล — Balance sheet |
| 100 | report_budget_variance | Report | งบประมาณเทียบจริง — Budget variance |
| 101 | report_ar_aging | Report | อายุลูกหนี้ — AR aging |
| 102 | report_ap_aging | Report | อายุเจ้าหนี้ — AP aging |
| 103 | audit_logs | Report | บันทึกการเปลี่ยนแปลง — Audit trail |
| 104 | generate_vat_return | Report | ภ.พ.30 — VAT return |
| 105 | generate_ssc_filing | Report | สปส.1-10 — SSC filing |
| 106 | generate_cash_flow | Report | งบกระแสเงินสด — Cash flow |
| 107 | run_anomaly_scan | Report | สแกนความผิดปกติ — AI anomaly scan |
| 108 | run_cash_forecast | Report | พยากรณ์เงินสด — AI cash forecast |
| 109 | categorize_transaction | Report | จัดหมวดหมู่ — AI categorize |
| 110 | generate_predictions | Report | พยากรณ์ — AI predictions |
