# nEIP API Reference

> คู่มืออ้างอิง REST API ฉบับสมบูรณ์ — Complete API Quick Reference
> Version: 0.9.0 | Base URL: `/api/v1` | Total Endpoints: 300+

## Overview

### Authentication
All endpoints (except auth) require JWT Bearer token:
```
Authorization: Bearer <access_token>
```
- Access token: 1-hour TTL
- Refresh token: 30-day TTL

### Rate Limiting
- Production: 300 req/min
- Development: 10,000 req/min

### Common Patterns
- **Pagination**: `?limit=20&offset=0&sortBy=createdAt&sortOrder=desc`
- **Monetary values**: All amounts in **satang** (100 satang = 1 THB) as bigint/string
- **Tenant isolation**: Enforced via `tenantId` from JWT — no cross-tenant access
- **Idempotency**: `X-Idempotency-Key` header on critical POST operations
- **Soft deletes**: Most entities set `is_active=false` rather than hard delete
- **Error format**: RFC 7807 Problem Details

### Error Response Format
```json
{
  "type": "https://problems.neip.app/not-found",
  "title": "Not Found",
  "status": 404,
  "detail": "Invoice inv_abc123 not found"
}
```

---

## System & Health

### GET /api/health
Health check — liveness/readiness probe.
- Auth: None

---

## Authentication

### POST /api/v1/auth/register
Register new user account.
- Auth: None
```json
Body: { "email": "string", "password": "string", "name": "string" }
Response: { "user": { "id", "email", "name" }, "tokens": { "accessToken", "refreshToken" } }
```

### POST /api/v1/auth/login
Authenticate with email/password, issue tokens.
- Auth: None
```json
Body: { "email": "string", "password": "string" }
Response: { "user": { "id", "email", "name" }, "tokens": { "accessToken", "refreshToken" } }
```

### POST /api/v1/auth/refresh
Rotate refresh token, issue new access token.
- Auth: None
```json
Body: { "refreshToken": "string" }
Response: { "accessToken": "string", "refreshToken": "string" }
```

### POST /api/v1/auth/logout
Revoke refresh token.
- Auth: None
```json
Body: { "refreshToken": "string" }
```

---

## Users & Invitations

### POST /api/v1/users/invite
Invite a user with role assignment.
- Auth: Required | Permission: `user:invite`
```json
Body: { "email": "string", "roleId": "string", "message?": "string" }
```

---

## Organizations (Tenants)

### POST /api/v1/organizations
Create new organization with TFAC CoA + fiscal year.
- Auth: Required
```json
Body: { "name": "string", "businessType": "company|sme|individual|nonprofit|government" }
Response: { "id", "name", "businessType", "createdAt" }
```

### GET /api/v1/organizations/:id
Get organization details.
- Auth: Required

### PUT /api/v1/organizations/:id
Update organization settings.
- Auth: Required | Permission: `user:update`
```json
Body: { "name?": "string", "address?": "string", "taxId?": "string" }
```

### PUT /api/v1/organizations/:id/settings
Configure BYOK LLM API key.
- Auth: Required | Permission: `user:update`
```json
Body: { "llmProvider?": "string", "llmApiKey?": "string" }
```

---

## General Ledger (GL)

### Chart of Accounts

#### GET /api/v1/accounts
List accounts with pagination & filtering.
- Auth: Required | Permission: `gl:account:read`
```
Query: ?type=asset|liability|equity|revenue|expense&search=text&limit=50&offset=0
Response: { "items": [...], "total": number }
```

#### POST /api/v1/accounts
Create new account in CoA.
- Auth: Required | Permission: `gl:account:create`
```json
Body: { "code": "string", "name": "string", "type": "string", "parentId?": "string" }
```

#### PUT /api/v1/accounts/:id
Update account details.
- Auth: Required | Permission: `gl:account:update`

#### DELETE /api/v1/accounts/:id
Soft-delete account (sets is_active=false).
- Auth: Required | Permission: `gl:account:delete`

### Journal Entries

#### POST /api/v1/journal-entries
Create draft journal entry.
- Auth: Required | Permission: `gl:journal:create`
```json
Body: {
  "description": "string",
  "fiscalYear": "number",
  "fiscalPeriod": "number",
  "lines": [{ "accountId": "string", "description": "string", "debitSatang": "string", "creditSatang": "string" }]
}
```

#### GET /api/v1/journal-entries
List journal entries with filtering.
- Auth: Required | Permission: `gl:journal:read`
```
Query: ?status=draft|posted|voided&limit=20&offset=0
```

#### POST /api/v1/journal-entries/:id/post
Post entry to GL (makes immutable).
- Auth: Required | Permission: `gl:journal:post`

#### POST /api/v1/journal-entries/:id/reverse
Reverse posted entry, create reversal JE.
- Auth: Required | Permission: `gl:journal:reverse`

### Fiscal Years & Periods

#### GET /api/v1/fiscal-years
List fiscal years with periods.
- Auth: Required | Permission: `gl:period:read`

#### POST /api/v1/fiscal-years
Create new fiscal year (auto-generates 12 periods).
- Auth: Required | Permission: `gl:period:close`
```json
Body: { "startDate": "string", "endDate": "string" }
```

#### POST /api/v1/fiscal-years/:id/close
Year-end closing — creates closing & carryforward JE.
- Auth: Required | Permission: `gl:period:close`

#### POST /api/v1/fiscal-years/:id/reopen
Reopen closed fiscal year, reverse closing JE.
- Auth: Required | Permission: `gl:period:close`

#### POST /api/v1/fiscal-periods/:id/close
Close a fiscal period.
- Auth: Required | Permission: `gl:period:close`

#### POST /api/v1/fiscal-periods/:id/reopen
Reopen closed fiscal period.
- Auth: Required | Permission: `gl:period:close`

### Budgets

#### GET /api/v1/budgets
List budgets with filtering.
- Auth: Required | Permission: `gl:account:read`
```
Query: ?year=2026&status=active&limit=20
```

#### POST /api/v1/budgets
Create budget for account + fiscal year.
- Auth: Required | Permission: `gl:account:create`

#### PUT /api/v1/budgets/:id
Update budget amount.
- Auth: Required | Permission: `gl:account:update`

---

## Accounts Receivable (AR)

### Invoices

#### POST /api/v1/invoices
Create invoice (draft).
- Auth: Required | Permission: `ar:invoice:create`
```json
Body: {
  "customerId": "string",
  "dueDate": "string",
  "lines": [{ "description": "string", "quantity": "number", "unitPriceSatang": "string", "accountId": "string", "taxRateId?": "string" }]
}
```

#### GET /api/v1/invoices
List invoices with filtering & sorting.
- Auth: Required | Permission: `ar:invoice:read`
```
Query: ?status=draft|sent|paid|voided|overdue&customerId=id&page=1&pageSize=20
```

#### GET /api/v1/invoices/:id
Get invoice detail with lines.
- Auth: Required | Permission: `ar:invoice:read`

#### POST /api/v1/invoices/:id/void
Void invoice.
- Auth: Required | Permission: `ar:invoice:void`

### Payments

#### POST /api/v1/payments
Record customer payment.
- Auth: Required | Permission: `ar:payment:create`
```json
Body: {
  "customerId": "string",
  "amountSatang": "string",
  "paymentMethod": "bank_transfer|check|credit_card|cash|other",
  "paymentDate": "string",
  "reference?": "string"
}
```

#### GET /api/v1/payments
List payments.
- Auth: Required | Permission: `ar:payment:read`

#### POST /api/v1/payments/:id/void
Void payment.
- Auth: Required | Permission: `ar:payment:update`

#### POST /api/v1/payments/:id/match
Match payment to invoices.
- Auth: Required | Permission: `ar:payment:update`
```json
Body: { "invoiceIds": ["string"], "amounts": ["string"] }
```

### Sales Orders

#### POST /api/v1/sales-orders
Create sales order.
- Auth: Required

#### GET /api/v1/sales-orders
List sales orders.
- Auth: Required

#### GET /api/v1/sales-orders/:id
Get sales order detail.
- Auth: Required

#### PUT /api/v1/sales-orders/:id
Update draft sales order.
- Auth: Required

#### POST /api/v1/sales-orders/:id/confirm
Confirm sales order.
- Auth: Required

#### POST /api/v1/sales-orders/:id/cancel
Cancel sales order.
- Auth: Required

### Delivery Notes

#### POST /api/v1/delivery-notes
Create delivery note.
- Auth: Required

#### GET /api/v1/delivery-notes
List delivery notes.
- Auth: Required

#### GET /api/v1/delivery-notes/:id
Get delivery note detail.
- Auth: Required

#### POST /api/v1/delivery-notes/:id/deliver
Mark as delivered.
- Auth: Required

### Receipts

#### POST /api/v1/receipts
Issue cash receipt.
- Auth: Required

#### GET /api/v1/receipts
List receipts.
- Auth: Required

#### GET /api/v1/receipts/:id
Get receipt detail.
- Auth: Required

#### POST /api/v1/receipts/:id/void
Void receipt.
- Auth: Required

### Credit Notes

#### POST /api/v1/credit-notes
Create credit note.
- Auth: Required

#### GET /api/v1/credit-notes
List credit notes.
- Auth: Required

#### GET /api/v1/credit-notes/:id
Get credit note detail.
- Auth: Required

#### POST /api/v1/credit-notes/:id/issue
Issue credit note.
- Auth: Required

#### POST /api/v1/credit-notes/:id/void
Void credit note.
- Auth: Required

---

## Accounts Payable (AP)

### Bills

#### POST /api/v1/bills
Create bill (draft).
- Auth: Required | Permission: `ap:bill:create`
```json
Body: {
  "vendorId": "string",
  "billDate": "string",
  "dueDate": "string",
  "reference?": "string",
  "lines": [{ "description": "string", "quantity": "number", "unitPriceSatang": "string", "accountId": "string" }]
}
```

#### GET /api/v1/bills
List bills with filtering.
- Auth: Required | Permission: `ap:bill:read`
```
Query: ?status=draft|posted|paid|voided|overdue&vendorId=id&page=1&pageSize=20
```

#### GET /api/v1/bills/:id
Get bill detail.
- Auth: Required | Permission: `ap:bill:read`

#### PUT /api/v1/bills/:id
Update draft bill.
- Auth: Required | Permission: `ap:bill:update`

#### POST /api/v1/bills/:id/post
Post bill to GL.
- Auth: Required | Permission: `ap:bill:post`

#### POST /api/v1/bills/:id/void
Void bill.
- Auth: Required | Permission: `ap:bill:void`

### Bill Payments

#### POST /api/v1/bill-payments
Record payment to vendor.
- Auth: Required | Permission: `ap:payment:create`

#### GET /api/v1/bill-payments
List bill payments.
- Auth: Required | Permission: `ap:payment:read`

#### GET /api/v1/bill-payments/:id
Get payment detail.
- Auth: Required | Permission: `ap:payment:read`

### Vendors

#### POST /api/v1/vendors
Create vendor.
- Auth: Required | Permission: `ap:vendor:create`

#### GET /api/v1/vendors
List vendors with search.
- Auth: Required | Permission: `ap:vendor:read`
```
Query: ?search=text&limit=20&offset=0
```

#### PUT /api/v1/vendors/:id
Update vendor.
- Auth: Required | Permission: `ap:vendor:update`

### Purchase Orders

#### POST /api/v1/purchase-orders
Create PO.
- Auth: Required

#### GET /api/v1/purchase-orders
List POs.
- Auth: Required

#### GET /api/v1/purchase-orders/:id
Get PO detail.
- Auth: Required

#### PUT /api/v1/purchase-orders/:id
Update draft PO.
- Auth: Required

#### POST /api/v1/purchase-orders/:id/send
Send PO to vendor.
- Auth: Required

#### POST /api/v1/purchase-orders/:id/receive
Record goods received.
- Auth: Required

#### POST /api/v1/purchase-orders/:id/convert-to-bill
Create bill from PO.
- Auth: Required

#### POST /api/v1/purchase-orders/:id/cancel
Cancel PO.
- Auth: Required

### Three-Way Match

#### GET /api/v1/three-way-match
List three-way match results (PO-GR-Bill).
- Auth: Required

#### POST /api/v1/three-way-match/:id/reconcile
Reconcile PO-GR-Bill match.
- Auth: Required

---

## Quotations (SD)

### POST /api/v1/quotations
Create quotation.
- Auth: Required

### GET /api/v1/quotations
List quotations.
- Auth: Required

### GET /api/v1/quotations/:id
Get quotation detail.
- Auth: Required

### PUT /api/v1/quotations/:id
Update quotation.
- Auth: Required

### POST /api/v1/quotations/:id/send
Mark as sent.
- Auth: Required

### POST /api/v1/quotations/:id/convert-to-so
Convert to sales order.
- Auth: Required

### POST /api/v1/quotations/:id/reject
Reject quotation.
- Auth: Required

---

## Purchase Requisitions (MM-PR)

### POST /api/v1/purchase-requisitions
Create PR.
- Auth: Required | Permission: `mm:pr:create`

### GET /api/v1/purchase-requisitions
List PRs.
- Auth: Required | Permission: `mm:pr:read`

### GET /api/v1/purchase-requisitions/:id
Get PR detail.
- Auth: Required | Permission: `mm:pr:read`

### PUT /api/v1/purchase-requisitions/:id
Update draft PR.
- Auth: Required | Permission: `mm:pr:update`

### POST /api/v1/purchase-requisitions/:id/submit
Submit PR for approval (draft -> pending).
- Auth: Required | Permission: `mm:pr:create`

### POST /api/v1/purchase-requisitions/:id/approve
Approve PR.
- Auth: Required | Permission: `mm:pr:approve`

### POST /api/v1/purchase-requisitions/:id/reject
Reject PR.
- Auth: Required | Permission: `mm:pr:approve`

### POST /api/v1/purchase-requisitions/:id/convert-to-po
Convert approved PR to PO.
- Auth: Required | Permission: `mm:pr:create`

---

## RFQ (Request for Quotation)

### POST /api/v1/rfqs
Create RFQ.
- Auth: Required | Permission: `mm:rfq:create`

### GET /api/v1/rfqs
List RFQs.
- Auth: Required | Permission: `mm:rfq:read`

### GET /api/v1/rfqs/:id
Get RFQ detail with vendors.
- Auth: Required | Permission: `mm:rfq:read`

### POST /api/v1/rfqs/:id/send
Send RFQ to vendors (draft -> sent).
- Auth: Required | Permission: `mm:rfq:create`

### POST /api/v1/rfqs/:id/vendors
Add vendor response.
- Auth: Required | Permission: `mm:rfq:create`

### POST /api/v1/rfqs/:id/compare
Compare vendor responses.
- Auth: Required | Permission: `mm:rfq:read`

### POST /api/v1/rfqs/:id/select-winner
Select winner & create PO.
- Auth: Required | Permission: `mm:rfq:create`

---

## Contacts (CRM)

### POST /api/v1/contacts
Create customer/vendor contact.
- Auth: Required | Permission: `crm:contact:create`
```json
Body: { "contactType": "customer|vendor|both", "companyName": "string", "email?": "string", "phone?": "string", "taxId?": "string", "province?": "string" }
```

### GET /api/v1/contacts
List contacts with type filter & search.
- Auth: Required | Permission: `crm:contact:read`

### GET /api/v1/contacts/:id
Get contact detail + AR/AP summary.
- Auth: Required | Permission: `crm:contact:read`

### PUT /api/v1/contacts/:id
Update contact info.
- Auth: Required | Permission: `crm:contact:update`

### DELETE /api/v1/contacts/:id
Soft-delete contact.
- Auth: Required | Permission: `crm:contact:delete`

### GET /api/v1/contacts/:id/transactions
List invoices & bills for contact.
- Auth: Required | Permission: `crm:contact:read`

---

## Inventory (MM)

### Products

#### POST /api/v1/products
Create product/service item.
- Auth: Required | Permission: `inventory:product:create`

#### GET /api/v1/products
List products with search & filters.
- Auth: Required | Permission: `inventory:product:read`

#### PUT /api/v1/products/:id
Update product details.
- Auth: Required | Permission: `inventory:product:update`

### Warehouses

#### POST /api/v1/warehouses
Create warehouse.
- Auth: Required | Permission: `inventory:warehouse:create`

#### GET /api/v1/warehouses
List all warehouses.
- Auth: Required | Permission: `inventory:warehouse:read`

#### PUT /api/v1/warehouses/:id
Update warehouse.
- Auth: Required | Permission: `inventory:warehouse:update`

### Stock Movements

#### POST /api/v1/stock-movements
Record stock movement (receipt/issue/transfer).
- Auth: Required | Permission: `inventory:movement:create`
```json
Body: { "productId": "string", "warehouseId": "string", "movementType": "receive|issue|adjust|return|transfer", "quantity": "number", "notes?": "string" }
```

#### GET /api/v1/stock-movements
Stock movement history with filters.
- Auth: Required | Permission: `inventory:movement:read`

### Stock Levels

#### GET /api/v1/stock-levels
Current stock levels all products x warehouses.
- Auth: Required | Permission: `inventory:level:read`

#### GET /api/v1/stock-levels/:productId
Stock levels for single product across warehouses.
- Auth: Required | Permission: `inventory:level:read`

### Valuation & Reports

#### GET /api/v1/inventory/valuation
Stock valuation report (cost-based).
- Auth: Required | Permission: `inventory:valuation:read`

#### GET /api/v1/inventory/low-stock
Products below minimum stock level.
- Auth: Required | Permission: `inventory:level:read`

---

## Stock Counts (MM-IM)

### POST /api/v1/stock-counts
Create count session.
- Auth: Required | Permission: `inventory:count:create`

### GET /api/v1/stock-counts
List count sessions.
- Auth: Required | Permission: `inventory:count:read`

### GET /api/v1/stock-counts/:id
Get count detail.
- Auth: Required | Permission: `inventory:count:read`

### POST /api/v1/stock-counts/:id/enter
Enter counted quantities.
- Auth: Required | Permission: `inventory:count:create`

### POST /api/v1/stock-counts/:id/post
Post adjustments to inventory.
- Auth: Required | Permission: `inventory:count:post`

---

## Batches & Lot Tracking (MM-BT)

### POST /api/v1/batches
Create batch.
- Auth: Required

### POST /api/v1/batches/seed
Seed batch data.
- Auth: Required

### GET /api/v1/batches
List batches.
- Auth: Required

### GET /api/v1/batches/:id
Get batch detail.
- Auth: Required

---

## Human Resources (HR)

### Departments

#### POST /api/v1/departments
Create department.
- Auth: Required | Permission: `hr:department:create`

#### GET /api/v1/departments
List all departments.
- Auth: Required | Permission: `hr:department:read`

#### PUT /api/v1/departments/:id
Update department.
- Auth: Required | Permission: `hr:department:update`

#### GET /api/v1/departments/tree
Organization hierarchy tree.
- Auth: Required | Permission: `hr:department:read`

### Employees

#### POST /api/v1/employees
Create employee record.
- Auth: Required | Permission: `hr:employee:create`
```json
Body: { "employeeCode": "string", "firstNameTh": "string", "lastNameTh": "string", "hireDate": "string", "position?": "string", "salarySatang?": "number", "departmentId?": "string" }
```

#### GET /api/v1/employees
List employees with filtering by dept/status.
- Auth: Required | Permission: `hr:employee:read`

#### GET /api/v1/employees/:id
Get employee detail (full PII).
- Auth: Required | Permission: `hr:employee:read`

#### PUT /api/v1/employees/:id
Update employee information.
- Auth: Required | Permission: `hr:employee:update`

#### POST /api/v1/employees/:id/resign
Record employee resignation.
- Auth: Required | Permission: `hr:employee:resign`

#### POST /api/v1/employees/:id/anonymize
PDPA right-to-erasure (anonymizes PII).
- Auth: Required | Permission: `hr:employee:anonymize`

### Positions (HR-OM)

#### POST /api/v1/positions
Create position.
- Auth: Required | Permission: `hr:position:create`

#### GET /api/v1/positions
List positions.
- Auth: Required | Permission: `hr:position:read`

#### GET /api/v1/positions/:id
Get position detail.
- Auth: Required | Permission: `hr:position:read`

#### PUT /api/v1/positions/:id
Update position.
- Auth: Required | Permission: `hr:position:update`

---

## Payroll

### POST /api/v1/payroll-runs
Create payroll run.
- Auth: Required | Permission: `hr:payroll:create`
```json
Body: { "payPeriodStart": "string", "payPeriodEnd": "string", "runDate": "string" }
```

### GET /api/v1/payroll-runs
List payroll runs.
- Auth: Required | Permission: `hr:payroll:read`

### GET /api/v1/payroll-runs/:id
Get payroll detail.
- Auth: Required | Permission: `hr:payroll:read`

### POST /api/v1/payroll-runs/:id/calculate
Calculate payroll for all employees.
- Auth: Required | Permission: `hr:payroll:create`

### POST /api/v1/payroll-runs/:id/approve
Approve calculated payroll.
- Auth: Required | Permission: `hr:payroll:approve`

### POST /api/v1/payroll-runs/:id/pay
Mark as paid.
- Auth: Required | Permission: `hr:payroll:pay`

---

## Leave Management

### POST /api/v1/leave-types
Create leave type.
- Auth: Required | Permission: `hr:leave:type:create`

### GET /api/v1/leave-types
List leave types.
- Auth: Required | Permission: `hr:leave:type:read`

### POST /api/v1/leave-requests
Create leave request.
- Auth: Required | Permission: `hr:leave:request:create`
```json
Body: { "employeeId": "string", "leaveTypeId": "string", "startDate": "string", "endDate": "string", "days": "number", "reason?": "string" }
```

### GET /api/v1/leave-requests
List leave requests (filterable).
- Auth: Required | Permission: `hr:leave:request:read`

### GET /api/v1/leave-requests/:id
Get leave request detail.
- Auth: Required | Permission: `hr:leave:request:read`

### GET /api/v1/leave-requests/balance/:employeeId
Get leave balance by type.
- Auth: Required | Permission: `hr:leave:request:read`

### GET /api/v1/leave-requests/accrual-balance/:employeeId
Get accrual-based balance.
- Auth: Required | Permission: `hr:leave:request:read`

### GET /api/v1/leave-requests/working-days
Calculate working days between dates.
- Auth: Required | Permission: `hr:leave:request:read`

### POST /api/v1/leave-requests/:id/approve
Approve leave request.
- Auth: Required | Permission: `hr:leave:request:approve`

### POST /api/v1/leave-requests/:id/reject
Reject leave request.
- Auth: Required | Permission: `hr:leave:request:reject`

### POST /api/v1/leave-accrual-rules
Create accrual rule.
- Auth: Required | Permission: `hr:leave:type:create`

### GET /api/v1/leave-accrual-rules
List accrual rules.
- Auth: Required | Permission: `hr:leave:type:read`

### POST /api/v1/public-holidays
Add public holiday.
- Auth: Required | Permission: `hr:leave:type:create`

### GET /api/v1/public-holidays
List public holidays.
- Auth: Required | Permission: `hr:leave:type:read`

---

## Attendance (HR-TM)

### POST /api/v1/attendance/clock-in
Clock in.
- Auth: Required | Permission: `hr:attendance:create`
```json
Body: { "employeeId?": "string", "note?": "string" }
```

### POST /api/v1/attendance/clock-out
Clock out.
- Auth: Required | Permission: `hr:attendance:create`

### GET /api/v1/attendance/daily/:employeeId
Daily attendance summary.
- Auth: Required | Permission: `hr:attendance:read`

### GET /api/v1/attendance/monthly/:employeeId
Monthly attendance summary.
- Auth: Required | Permission: `hr:attendance:read`

---

## Fixed Assets (FI-AA)

### POST /api/v1/fixed-assets
Register asset.
- Auth: Required | Permission: `fi:asset:create`

### GET /api/v1/fixed-assets
List assets (filter by category, status).
- Auth: Required | Permission: `fi:asset:read`

### GET /api/v1/fixed-assets/:id
Get asset detail.
- Auth: Required | Permission: `fi:asset:read`

### PUT /api/v1/fixed-assets/:id
Update asset metadata.
- Auth: Required | Permission: `fi:asset:update`

### GET /api/v1/fixed-assets/report
Asset register report.
- Auth: Required | Permission: `fi:asset:read`

### POST /api/v1/fixed-assets/:id/depreciate
Run monthly depreciation.
- Auth: Required | Permission: `fi:asset:depreciate`

### POST /api/v1/fixed-assets/:id/dispose
Dispose/sell asset.
- Auth: Required | Permission: `fi:asset:dispose`

---

## Bank & Reconciliation (FI-BL)

### POST /api/v1/bank-accounts
Create bank account.
- Auth: Required | Permission: `fi:bank:create`

### GET /api/v1/bank-accounts
List bank accounts.
- Auth: Required | Permission: `fi:bank:read`

### GET /api/v1/bank-accounts/:id
Get account detail with transactions.
- Auth: Required | Permission: `fi:bank:read`

### POST /api/v1/bank-accounts/:id/transactions
Add bank transaction.
- Auth: Required | Permission: `fi:bank:create`

### POST /api/v1/bank-accounts/:id/import
Import CSV statement.
- Auth: Required | Permission: `fi:bank:import`

### GET /api/v1/bank-accounts/:id/reconciliation
Reconciliation report.
- Auth: Required | Permission: `fi:bank:read`

### POST /api/v1/bank-transactions/:id/reconcile
Match transaction to JE.
- Auth: Required | Permission: `fi:bank:reconcile`

### Bank Matching Rules

#### POST /api/v1/bank-matching-rules
Create matching rule.
- Auth: Required

#### GET /api/v1/bank-matching-rules
List rules.
- Auth: Required

#### PUT /api/v1/bank-matching-rules/:id
Update rule.
- Auth: Required

#### DELETE /api/v1/bank-matching-rules/:id
Delete rule.
- Auth: Required

#### POST /api/v1/bank-accounts/:accountId/match
Run auto-matching.
- Auth: Required

---

## Tax Management

### GET /api/v1/tax-rates
List VAT/WHT rates.
- Auth: Required

### POST /api/v1/tax-rates
Create tax rate.
- Auth: Required

### PUT /api/v1/tax-rates/:id
Update tax rate.
- Auth: Required

---

## Withholding Tax (WHT)

### POST /api/v1/wht-certificates
Create WHT certificate.
- Auth: Required | Permission: `fi:wht:create`

### GET /api/v1/wht-certificates
List certificates (filterable).
- Auth: Required | Permission: `fi:wht:read`

### GET /api/v1/wht-certificates/:id
Get certificate detail.
- Auth: Required | Permission: `fi:wht:read`

### GET /api/v1/wht-certificates/summary
Summary for filing (ภ.ง.ด.3/53).
- Auth: Required | Permission: `fi:wht:read`

### POST /api/v1/wht-certificates/:id/issue
Issue certificate (draft -> issued).
- Auth: Required | Permission: `fi:wht:issue`

### POST /api/v1/wht-certificates/:id/void
Void certificate.
- Auth: Required | Permission: `fi:wht:void`

### POST /api/v1/wht-certificates/:id/file
Mark as filed.
- Auth: Required | Permission: `fi:wht:file`

### POST /api/v1/wht/annual-certificate
Generate 50 ทวิ annual certificate.
- Auth: Required | Permission: `fi:wht:read`

---

## Cost & Profit Centers (CO)

### POST /api/v1/cost-centers
Create cost center.
- Auth: Required

### GET /api/v1/cost-centers
List cost centers.
- Auth: Required

### PUT /api/v1/cost-centers/:id
Update cost center.
- Auth: Required

### POST /api/v1/profit-centers
Create profit center.
- Auth: Required

### GET /api/v1/profit-centers
List profit centers.
- Auth: Required

### PUT /api/v1/profit-centers/:id
Update profit center.
- Auth: Required

---

## Currencies & Multi-Currency (FI-FX)

### POST /api/v1/currencies
Create currency.
- Auth: Required | Permission: `fi:currency:create`

### GET /api/v1/currencies
List currencies.
- Auth: Required | Permission: `fi:currency:read`

### PUT /api/v1/currencies/:id
Update currency.
- Auth: Required | Permission: `fi:currency:update`

### POST /api/v1/exchange-rates
Add exchange rate.
- Auth: Required | Permission: `fi:currency:create`

### GET /api/v1/exchange-rates
List exchange rates.
- Auth: Required | Permission: `fi:currency:read`

### GET /api/v1/exchange-rates/convert
Get rate for conversion.
- Auth: Required | Permission: `fi:currency:read`
```
Query: ?from=USD&to=THB&amount=100&date=2026-03-31
```

### POST /api/v1/gl/fx-revaluation
Revalue open items at period-end.
- Auth: Required | Permission: `gl:journal:create`

---

## Multi-Company

### POST /api/v1/companies
Create company/branch.
- Auth: Required | Permission: `company:create`

### GET /api/v1/companies
List companies.
- Auth: Required | Permission: `company:read`

### GET /api/v1/companies/:id
Get company detail.
- Auth: Required | Permission: `company:read`

### PUT /api/v1/companies/:id
Update company.
- Auth: Required | Permission: `company:update`

### POST /api/v1/companies/ic-transaction
Intercompany transaction.
- Auth: Required | Permission: `gl:journal:create`

### GET /api/v1/reports/consolidated
Consolidated financial report.
- Auth: Required | Permission: `report:gl:read`

---

## Approval Workflows

### POST /api/v1/approval-workflows
Create workflow.
- Auth: Required | Permission: `approval:workflow:create`

### GET /api/v1/approval-workflows
List workflows.
- Auth: Required | Permission: `approval:workflow:read`

### POST /api/v1/approvals/submit
Submit document for approval.
- Auth: Required | Permission: `approval:action`
```json
Body: { "documentType": "string", "documentId": "string", "notes?": "string" }
```

### GET /api/v1/approvals
List pending approvals.
- Auth: Required | Permission: `approval:workflow:read`

### GET /api/v1/approvals/:id
Get approval detail with actions.
- Auth: Required | Permission: `approval:workflow:read`

### POST /api/v1/approvals/:id/approve
Approve request.
- Auth: Required | Permission: `approval:action`

### POST /api/v1/approvals/:id/reject
Reject request.
- Auth: Required | Permission: `approval:action`

### POST /api/v1/approvals/:id/delegate
Delegate to another user.
- Auth: Required | Permission: `approval:action`

---

## Vendor Returns (MM-RET)

### POST /api/v1/vendor-returns
Create vendor return.
- Auth: Required | Permission: `ap:vendor:read`

### GET /api/v1/vendor-returns
List returns.
- Auth: Required | Permission: `ap:vendor:read`

### GET /api/v1/vendor-returns/:id
Get return detail.
- Auth: Required | Permission: `ap:vendor:read`

### POST /api/v1/vendor-returns/:id/ship
Ship goods back to vendor.
- Auth: Required | Permission: `inv:movement:create`

### POST /api/v1/vendor-returns/:id/credit
Receive credit memo from vendor.
- Auth: Required | Permission: `ap:bill:create`

---

## Pricing (SD-Pricing)

### POST /api/v1/price-lists
Create price list.
- Auth: Required | Permission: `pricing:manage`

### GET /api/v1/price-lists
List price lists.
- Auth: Required | Permission: `pricing:read`

### GET /api/v1/price-lists/:id
Get price list detail.
- Auth: Required | Permission: `pricing:read`

### PUT /api/v1/price-lists/:id
Update price list.
- Auth: Required | Permission: `pricing:manage`

### DELETE /api/v1/price-lists/:id
Deactivate price list.
- Auth: Required | Permission: `pricing:manage`

### POST /api/v1/price-lists/:id/items
Add item to price list.
- Auth: Required | Permission: `pricing:manage`

### GET /api/v1/price-lists/:id/items
List items in price list.
- Auth: Required | Permission: `pricing:read`

### DELETE /api/v1/price-lists/:id/items/:itemId
Remove item from price list.
- Auth: Required | Permission: `pricing:manage`

### GET /api/v1/pricing/resolve
Resolve price cascade for product.
- Auth: Required | Permission: `pricing:read`
```
Query: ?productId=id&customerId=id&quantity=1&date=2026-03-31
```

---

## Payment Terms

### POST /api/v1/payment-terms
Create payment term.
- Auth: Required | Permission: `pricing:manage`

### POST /api/v1/payment-terms/seed
Seed default payment terms.
- Auth: Required | Permission: `pricing:manage`

### GET /api/v1/payment-terms
List payment terms.
- Auth: Required | Permission: `pricing:read`

### GET /api/v1/payment-terms/:id
Get payment term detail.
- Auth: Required | Permission: `pricing:read`

### PUT /api/v1/payment-terms/:id
Update payment term.
- Auth: Required | Permission: `pricing:manage`

### DELETE /api/v1/payment-terms/:id
Deactivate payment term.
- Auth: Required | Permission: `pricing:manage`

---

## Dunning (AR Collections)

### GET /api/v1/dunning
Get overdue summary.
- Auth: Required

### POST /api/v1/dunning/letters
Create dunning letter template.
- Auth: Required

### POST /api/v1/dunning/letters/seed
Seed default templates.
- Auth: Required

### GET /api/v1/dunning/letters
List templates.
- Auth: Required

### POST /api/v1/dunning/letters/generate
Generate dunning letters for overdue.
- Auth: Required

### POST /api/v1/dunning/send
Send dunning letters.
- Auth: Required

### POST /api/v1/dunning/mark-paid
Mark dunning case as paid.
- Auth: Required

---

## Recurring Journal Entries

### POST /api/v1/recurring-je
Create recurring JE template.
- Auth: Required

### GET /api/v1/recurring-je
List templates.
- Auth: Required

### GET /api/v1/recurring-je/:id
Get template detail.
- Auth: Required

### PUT /api/v1/recurring-je/:id
Update template.
- Auth: Required

### DELETE /api/v1/recurring-je/:id
Delete template.
- Auth: Required

---

## Credit Management

### POST /api/v1/credit-analysis
Run credit analysis.
- Auth: Required

### GET /api/v1/credit-analysis
List credit analyses.
- Auth: Required

### GET /api/v1/credit-analysis/:customerId
Get credit detail for customer.
- Auth: Required

---

## Reports

### GET /api/v1/reports/balance-sheet
Balance sheet report.
- Auth: Required
```
Query: ?asOf=2026-03-31
```

### GET /api/v1/reports/income-statement
Income statement (P&L).
- Auth: Required
```
Query: ?startDate=2026-01-01&endDate=2026-03-31
```

### GET /api/v1/reports/trial-balance
Trial balance.
- Auth: Required

### GET /api/v1/reports/budget-variance
Budget vs actual report.
- Auth: Required
```
Query: ?year=2026&period=3
```

### GET /api/v1/reports/equity-changes
Statement of equity changes.
- Auth: Required

### GET /api/v1/reports/ar-aging
Accounts receivable aging.
- Auth: Required

### GET /api/v1/reports/ap-aging
Accounts payable aging.
- Auth: Required

### GET /api/v1/reports/cash-flow
Cash flow statement.
- Auth: Required

### GET /api/v1/reports/consolidated
Consolidated multi-company report.
- Auth: Required | Permission: `report:gl:read`

### GET /api/v1/reports/custom
Custom report builder.
- Auth: Required

---

## Month-End

### POST /api/v1/month-end/close
Close period.
- Auth: Required
```json
Body: { "fiscalYear": "number", "fiscalPeriod": "number" }
```

### GET /api/v1/month-end/status
Get close status.
- Auth: Required

---

## Dashboard

### GET /api/v1/dashboard/summary
Executive dashboard with KPIs.
- Auth: Required

### GET /api/v1/dashboard/drilldown/:metric
Drilldown into specific metric.
- Auth: Required

---

## Audit & Compliance

### GET /api/v1/audit-logs
List audit trail entries.
- Auth: Required
```
Query: ?resource=invoice&resourceId=id&userId=id&startDate=date&endDate=date&limit=50
```

### GET /api/v1/audit-logs/:id
Get specific audit log.
- Auth: Required

---

## PDPA (Thai Data Protection)

### POST /api/v1/pdpa/consents
Assign consent to subject.
- Auth: Required

### POST /api/v1/pdpa/consents/withdraw
Withdraw consent.
- Auth: Required

### GET /api/v1/pdpa/subjects
Get consent status for data subject.
- Auth: Required

---

## Notifications

### GET /api/v1/notifications
List in-app notifications.
- Auth: Required
```
Query: ?page=1&pageSize=20&unread=true
```

### POST /api/v1/notifications/:id/read
Mark notification as read.
- Auth: Required

### POST /api/v1/notifications/read-all
Mark all as read.
- Auth: Required

---

## Webhooks

### POST /api/v1/webhooks
Register webhook endpoint.
- Auth: Required | Permission: `webhook:create`
```json
Body: { "url": "string", "events": ["invoice.created", "payment.received"], "secret?": "string" }
```

### GET /api/v1/webhooks
List registered webhooks.
- Auth: Required | Permission: `webhook:read`

### PUT /api/v1/webhooks/:id
Update webhook.
- Auth: Required | Permission: `webhook:update`

### DELETE /api/v1/webhooks/:id
Delete webhook.
- Auth: Required | Permission: `webhook:delete`

---

## Roles & Permissions

### POST /api/v1/roles
Create custom role.
- Auth: Required | Permission: `role:create`
```json
Body: { "name": "string", "permissions": ["gl:journal:create", "ar:invoice:read"] }
```

### GET /api/v1/roles
List roles.
- Auth: Required | Permission: `role:read`

### PUT /api/v1/roles/:id
Update role permissions.
- Auth: Required | Permission: `role:update`

### DELETE /api/v1/roles/:id
Delete role.
- Auth: Required | Permission: `role:delete`

---

## Import / Export

### POST /api/v1/import
Bulk data import (CSV).
- Auth: Required | Permission: `import:create`

### GET /api/v1/export
Export data (JSON/CSV).
- Auth: Required | Permission: `export:read`
```
Query: ?type=journal_entries|chart_of_accounts|contacts&startDate=date&endDate=date
```

---

## AI & Analytics

### POST /api/v1/ai/clients
Assign AI client configuration.
- Auth: Required

### GET /api/v1/ai/status
Get AI processing status.
- Auth: Required

### DELETE /api/v1/ai/clients
Unassign AI client.
- Auth: Required

### POST /api/v1/ai/jobs/close
Close an AI processing job.
- Auth: Required

---

## Firm Management

### GET /api/v1/firm
Get firm settings and configuration.
- Auth: Required

---

## Permission Reference

| Module | Permissions |
|--------|------------|
| GL | `gl:account:read` `gl:account:create` `gl:account:update` `gl:account:delete` `gl:journal:read` `gl:journal:create` `gl:journal:post` `gl:journal:reverse` `gl:period:read` `gl:period:close` |
| AR | `ar:invoice:read` `ar:invoice:create` `ar:invoice:void` `ar:payment:read` `ar:payment:create` `ar:payment:update` |
| AP | `ap:bill:read` `ap:bill:create` `ap:bill:update` `ap:bill:post` `ap:bill:void` `ap:payment:read` `ap:payment:create` `ap:vendor:read` `ap:vendor:create` `ap:vendor:update` |
| CRM | `crm:contact:read` `crm:contact:create` `crm:contact:update` `crm:contact:delete` |
| Inventory | `inventory:product:read` `inventory:product:create` `inventory:product:update` `inventory:warehouse:read` `inventory:warehouse:create` `inventory:warehouse:update` `inventory:movement:read` `inventory:movement:create` `inventory:level:read` `inventory:valuation:read` `inventory:count:read` `inventory:count:create` `inventory:count:post` |
| HR | `hr:department:read` `hr:department:create` `hr:department:update` `hr:employee:read` `hr:employee:create` `hr:employee:update` `hr:employee:resign` `hr:employee:anonymize` `hr:position:read` `hr:position:create` `hr:position:update` `hr:payroll:read` `hr:payroll:create` `hr:payroll:approve` `hr:payroll:pay` `hr:leave:type:read` `hr:leave:type:create` `hr:leave:request:read` `hr:leave:request:create` `hr:leave:request:approve` `hr:leave:request:reject` `hr:attendance:read` `hr:attendance:create` |
| Finance | `fi:asset:read` `fi:asset:create` `fi:asset:update` `fi:asset:depreciate` `fi:asset:dispose` `fi:bank:read` `fi:bank:create` `fi:bank:import` `fi:bank:reconcile` `fi:wht:read` `fi:wht:create` `fi:wht:issue` `fi:wht:void` `fi:wht:file` `fi:currency:read` `fi:currency:create` `fi:currency:update` |
| MM | `mm:pr:read` `mm:pr:create` `mm:pr:update` `mm:pr:approve` `mm:rfq:read` `mm:rfq:create` |
| Pricing | `pricing:read` `pricing:manage` |
| Company | `company:read` `company:create` `company:update` |
| Approval | `approval:workflow:read` `approval:workflow:create` `approval:action` |
| Webhook | `webhook:read` `webhook:create` `webhook:update` `webhook:delete` |
| Role | `role:read` `role:create` `role:update` `role:delete` |
| User | `user:invite` `user:update` |
| Report | `report:gl:read` |
| Import/Export | `import:create` `export:read` |
