# nEIP API Reference

> Complete REST API Reference — 260+ Endpoints across 31 Modules
> Version: 1.0.0 | Base URL: `/api/v1` | OpenAPI: `/api/docs/json`

## Overview

### Authentication
All endpoints (except `/api/health` and auth routes) require JWT Bearer token:
```
Authorization: Bearer <access_token>
```
- Access token: 1-hour TTL (HS256)
- Refresh token: 30-day TTL with rotation

### Rate Limiting
- Production: 300 req/min per IP
- Development: 10,000 req/min
- Auth endpoints: 10 failed attempts / 5 min per IP

### Common Patterns
- **Pagination**: `?limit=20&offset=0` — response: `{ items[], total, limit, offset, hasMore }`
- **Monetary values**: All amounts in **satang** (100 satang = 1 THB) as bigint strings
- **Tenant isolation**: Enforced via `tenantId` from JWT — no cross-tenant access
- **Idempotency**: `X-Idempotency-Key` header on POST journal entries
- **Soft deletes**: Most entities set `is_active=false` rather than hard delete
- **Error format**: RFC 7807 Problem Details

### Error Response Format
```json
{
  "type": "https://problems.neip.app/not-found",
  "title": "Not Found",
  "status": 404,
  "detail": "Invoice inv_abc123 not found",
  "instance": "/api/v1/invoices/inv_abc123"
}
```

### Default Roles & Permissions
| Role | Scope |
|------|-------|
| **Owner** | ALL permissions (full system access) |
| **Accountant** | GL + AR + AP + Reports + Inventory + HR + Compliance |
| **Approver** | HITL queue view + approve/reject only |

---

## 1. System & Health

### GET /api/health
**Permission:** None (public)
**Description:** Application health check — liveness/readiness probe for load balancers and k8s

**Response:**
```json
{
  "status": "ok | degraded | down",
  "checks": {
    "app": { "status": "ok", "latencyMs": 0 },
    "db": { "status": "ok", "latencyMs": 2 },
    "queue": { "status": "degraded", "error": "queue not yet configured" }
  },
  "uptime": 12345.67,
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```
**Status Codes:** 200 (healthy/degraded), 503 (down — critical dependency failed)

---

## 2. Authentication (Auth)

### POST /api/v1/auth/register
**Permission:** None (public)
**Description:** Register a new user account (สมัครสมาชิก)

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string (email) | yes | User email address |
| password | string | yes | Password — minimum 12 characters |
| name | string | yes | Display name (1-255 chars) |
| tenantId | string | no | Tenant ID to associate with (defaults to 'default') |

**Response (201):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "tenantId": "uuid",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```
**Status Codes:** 201 (created), 400 (validation), 409 (email exists)

---

### POST /api/v1/auth/login
**Permission:** None (public)
**Description:** Authenticate with email + password (เข้าสู่ระบบ)

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string (email) | yes | User email |
| password | string | yes | User password |

**Response (200):**
```json
{
  "accessToken": "jwt...",
  "refreshToken": "opaque...",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```
**Status Codes:** 200 (success), 401 (invalid credentials), 429 (rate limited)

---

### POST /api/v1/auth/refresh
**Permission:** None (public)
**Description:** Rotate refresh token and issue new access token (ต่ออายุ token)

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| refreshToken | string | yes | Current refresh token |

**Response (200):**
```json
{
  "accessToken": "jwt...",
  "refreshToken": "new-opaque...",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```
**Status Codes:** 200, 401 (invalid/expired token)

---

### POST /api/v1/auth/logout
**Permission:** None (public)
**Description:** Revoke refresh token (ออกจากระบบ)

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| refreshToken | string | yes | Refresh token to revoke |

**Response:** 204 No Content
**Status Codes:** 204 (always — idempotent)

---

## 3. Users

### POST /api/v1/users/invite
**Permission:** `user:invite`
**Description:** Invite a new user to the tenant with role assignment (เชิญผู้ใช้)

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string (email) | yes | Email of invited user |
| name | string | yes | Display name (1-255 chars) |
| role | string (enum) | yes | Role: `Owner`, `Accountant`, or `Approver` |

**Response (201):**
```json
{
  "id": "uuid",
  "email": "invited@example.com",
  "name": "Jane Doe",
  "tenantId": "uuid",
  "role": "Accountant",
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```
**Status Codes:** 201, 400 (invalid role), 404 (role not seeded), 409 (email exists)

---

## 4. Organizations (Tenants)

### POST /api/v1/organizations
**Permission:** `requireAuth`
**Description:** Create a new organization — auto-seeds TFAC CoA, fiscal year, and default roles (สร้างองค์กร)

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | yes | Organization name (1-255 chars) |
| businessType | string | yes | e.g. `sole_proprietorship`, `limited_company` |
| fiscalYearStart | integer (1-12) | no | Fiscal year start month (default: 1 = January) |

**Response (201):**
```json
{
  "id": "uuid",
  "name": "My Company",
  "slug": "my-company",
  "businessType": "limited_company",
  "fiscalYearId": "uuid",
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```
**Status Codes:** 201, 409 (slug exists)

---

### GET /api/v1/organizations/:id
**Permission:** `requireAuth`
**Description:** Get organization details (ดูรายละเอียดองค์กร). Enforces tenant isolation.

**Response (200):**
```json
{
  "id": "uuid",
  "name": "My Company",
  "slug": "my-company",
  "settings": { "businessType": "limited_company", "fiscalYearStart": 1 },
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```
**Status Codes:** 200, 403 (not your org), 404

---

### PUT /api/v1/organizations/:id
**Permission:** `user:update`
**Description:** Update organization name and settings (แก้ไของค์กร)

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | no | New org name |
| businessType | string | no | New business type |

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Updated Name",
  "slug": "my-company",
  "settings": {},
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```
**Status Codes:** 200, 403, 404

---

### PUT /api/v1/organizations/:id/settings
**Permission:** `user:update`
**Description:** Configure organization settings including BYOK LLM API key (ตั้งค่า LLM)

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| llmApiKey | string | no | BYOK LLM API key (encrypted at rest, never returned) |
| llmProvider | string (enum) | no | `openai`, `anthropic`, `azure`, `google` |
| llmModel | string | no | Model identifier |
| currency | string (3 chars) | no | Default currency (ISO 4217, default: THB) |
| locale | string | no | Default locale (default: th-TH) |
| dataRetentionDays | integer | no | Data retention days (default: 2555 = 7 years per Thai tax law) |

**Response (200):**
```json
{
  "id": "uuid",
  "llmProvider": "anthropic",
  "llmModel": "claude-sonnet-4-5-20250514",
  "llmApiKeyConfigured": true,
  "currency": "THB",
  "locale": "th-TH",
  "dataRetentionDays": 2555,
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```
**Status Codes:** 200, 403, 404

---

## 5. General Ledger (GL)

### GET /api/v1/accounts
**Permission:** `gl:account:read`
**Description:** List Chart of Accounts with pagination (ผังบัญชี)

**Query Params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| limit | integer | 100 | Max 500 |
| offset | integer | 0 | Pagination offset |
| accountType | string | — | Filter: `asset`, `liability`, `equity`, `revenue`, `expense` |
| isActive | boolean | — | Filter by active status |

**Response (200):**
```json
{
  "items": [{ "id": "uuid", "code": "1100", "nameTh": "เงินสด", "nameEn": "Cash", "accountType": "asset", "isActive": true, "parentId": null, "createdAt": "...", "updatedAt": "..." }],
  "total": 25,
  "limit": 100,
  "offset": 0,
  "hasMore": false
}
```

### POST /api/v1/accounts
**Permission:** `gl:account:create`
**Description:** Create a new account in Chart of Accounts (สร้างบัญชี)

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| code | string | yes | Account code (1-20 chars) |
| nameTh | string | yes | Thai name (1-255 chars) |
| nameEn | string | yes | English name (1-255 chars) |
| accountType | string (enum) | yes | `asset`, `liability`, `equity`, `revenue`, `expense` |
| parentId | string | no | Parent account UUID |

**Response:** 201 — Account object
**Status Codes:** 201, 409 (duplicate code)

### PUT /api/v1/accounts/:id
**Permission:** `gl:account:update`
**Description:** Update account name or status (แก้ไขบัญชี)

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| nameTh | string | no | Updated Thai name |
| nameEn | string | no | Updated English name |
| isActive | boolean | no | Active status |
| parentId | string | no | Parent account (null to remove) |

**Response:** 200 — Account object
**Status Codes:** 200, 404

### DELETE /api/v1/accounts/:id
**Permission:** `gl:account:delete`
**Description:** Soft-delete account (sets is_active=false). Blocked if referenced by journal lines. (ลบบัญชี)

**Response:** 200 — Account object
**Status Codes:** 200, 404, 409 (referenced by JE lines)

---

### POST /api/v1/journal-entries
**Permission:** `gl:journal:create`
**Description:** Create a journal entry in draft status (สร้างรายการบันทึกบัญชี). Supports X-Idempotency-Key.

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| description | string | yes | Entry description (1-500 chars) |
| fiscalYear | integer | yes | Fiscal year (>= 2000) |
| fiscalPeriod | integer | yes | Period number (1-12) |
| lines | array | yes | Min 2 lines. Each: `{ accountId, debitSatang, creditSatang, description? }` |

**Validation:** Total debits must equal total credits. Amount must be > 0. All accounts must exist and be active. Fiscal period must be open.

**Response:** 201 — JE object with lines
**Status Codes:** 201, 200 (idempotent replay), 400, 409 (period closed)

### GET /api/v1/journal-entries
**Permission:** `gl:journal:read`
**Description:** List journal entries with pagination and filtering (รายการบันทึกบัญชี)

**Query Params:** `limit` (default 20, max 100), `offset`, `status` (draft/posted/reversed), `fiscalYear`, `fiscalPeriod`, `sortBy`, `sortOrder`

**Response:** 200 — `{ items[], total, limit, offset, hasMore }`

### POST /api/v1/journal-entries/:id/post
**Permission:** `gl:journal:post`
**Description:** Post a draft journal entry — makes it immutable (ผ่านรายการ)

**Response:** 200 — Posted JE object
**Status Codes:** 200, 404, 409 (not draft / period closed)

### POST /api/v1/journal-entries/:id/reverse
**Permission:** `gl:journal:reverse`
**Description:** Reverse a posted entry — creates a new reversal JE with swapped debits/credits (กลับรายการ)

**Response:** 201 — New reversal JE object
**Status Codes:** 201, 404, 409 (not posted / period closed)

---

### GET /api/v1/fiscal-years
**Permission:** `gl:period:read`
**Description:** List fiscal years with periods (ปีงบประมาณ)

**Response (200):**
```json
{
  "items": [{
    "id": "uuid", "year": 2026, "startDate": "2026-01-01", "endDate": "2026-12-31",
    "periods": [{ "id": "uuid", "periodNumber": 1, "startDate": "2026-01-01", "endDate": "2026-01-31", "status": "open" }],
    "createdAt": "..."
  }]
}
```

### POST /api/v1/fiscal-years
**Permission:** `gl:period:close`
**Description:** Create a new fiscal year with 12 monthly periods (สร้างปีงบประมาณ)

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| year | integer | yes | Year (2000-2100) |
| startDate | string (date) | yes | YYYY-MM-DD |
| endDate | string (date) | yes | YYYY-MM-DD |

**Response:** 201 — Fiscal year with 12 periods
**Status Codes:** 201, 409 (year exists)

### POST /api/v1/fiscal-periods/:id/close
**Permission:** `gl:period:close`
**Description:** Close a fiscal period — blocks new journal postings (ปิดงวด)

**Response:** 200 — Period object with `status: "closed"`
**Status Codes:** 200, 400 (already closed), 404

### POST /api/v1/fiscal-periods/:id/reopen
**Permission:** `gl:period:close`
**Description:** Reopen a closed fiscal period (เปิดงวดอีกครั้ง)

**Response:** 200 — Period object with `status: "open"`
**Status Codes:** 200, 400 (already open), 404

### POST /api/v1/fiscal-years/:id/close
**Permission:** `gl:period:close`
**Description:** Year-end closing — validates all periods closed, creates closing JE (zeroes Revenue/Expense), carry-forward to Retained Earnings (ปิดบัญชีสิ้นปี)

**Response (200):**
```json
{
  "fiscalYear": { "id": "uuid", "year": 2026, "periods": [] },
  "closingJournalEntry": { "id": "uuid", "documentNumber": "JE-2026-0042", "lines": [] },
  "carryForwardJournalEntry": { "id": "uuid", "netIncomeSatang": "1500000" }
}
```
**Status Codes:** 200, 404, 409 (open periods exist / already closed), 400 (no equity account)

### POST /api/v1/fiscal-years/:id/reopen
**Permission:** `gl:period:close`
**Description:** Reopen a closed fiscal year — reverses closing JE and reopens all periods (เปิดปีงบประมาณ)

**Response (200):**
```json
{
  "fiscalYear": { "id": "uuid", "year": 2026, "periods": [] },
  "reversalJournalEntry": { "id": "uuid", "documentNumber": "JE-2026-0043" }
}
```
**Status Codes:** 200, 404, 409 (not closed)

---

### GET /api/v1/budgets
**Permission:** `gl:account:read`
**Description:** List budgets (งบประมาณ)

**Query Params:** `limit` (default 100), `offset`, `fiscalYear`, `accountId`

**Response:** 200 — `{ items[{ id, accountId, fiscalYear, amountSatang, createdAt, updatedAt }], total, limit, offset, hasMore }`

### POST /api/v1/budgets
**Permission:** `gl:account:create`
**Description:** Create a budget allocation for an account and fiscal year (สร้างงบประมาณ)

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| accountId | string | yes | Chart of Accounts ID |
| fiscalYear | integer | yes | Fiscal year (2000-2100) |
| amountSatang | string | yes | Budget amount in satang |

**Response:** 201 — Budget object
**Status Codes:** 201, 409 (duplicate account+year)

### PUT /api/v1/budgets/:id
**Permission:** `gl:account:update`
**Description:** Update budget amount (แก้ไขงบประมาณ)

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| amountSatang | string | yes | Updated amount in satang |

**Response:** 200 — Budget object
**Status Codes:** 200, 404

---

## 6. Accounts Receivable (AR) — Invoices

### POST /api/v1/invoices
**Permission:** `ar:invoice:create`
**Description:** Create a new invoice in draft status (สร้างใบแจ้งหนี้)

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| customerId | string | yes | Customer UUID |
| dueDate | string (date) | yes | Payment due date |
| notes | string | no | Notes (max 2000 chars) |
| lines | array | yes | Min 1 line: `{ description, quantity, unitPriceSatang, accountId? }` |

**Response:** 201 — Invoice with auto-calculated VAT (7%) and lines
**Status Codes:** 201, 400

### GET /api/v1/invoices
**Permission:** `ar:invoice:read`
**Description:** List invoices with filtering (รายการใบแจ้งหนี้)

**Query Params:** `limit`, `offset`, `status` (draft/sent/paid/partial/overdue/void), `customerId`, `sortBy`, `sortOrder`

### GET /api/v1/invoices/:id
**Permission:** `ar:invoice:read`
**Description:** Get invoice details with line items (รายละเอียดใบแจ้งหนี้)

### POST /api/v1/invoices/:id/post
**Permission:** `ar:invoice:create`
**Description:** Post invoice — creates JE (Dr AR / Cr Revenue / Cr VAT Payable) (ผ่านใบแจ้งหนี้)

### POST /api/v1/invoices/:id/void
**Permission:** `ar:invoice:void`
**Description:** Void invoice — creates reversal JE if posted, blocked if payments exist (ยกเลิกใบแจ้งหนี้)

### GET /api/v1/invoices/:id/e-tax
**Permission:** `fi:etax:read`
**Description:** Generate e-Tax Invoice structured data (Thai T02 format) (ใบกำกับภาษีอิเล็กทรอนิกส์)

---

## 7. AR — Payments

### POST /api/v1/payments
**Permission:** `ar:payment:create`
**Description:** Record customer payment — auto-creates JE (Dr Cash/Bank, Cr AR) (บันทึกรับชำระ)

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| amountSatang | string | yes | Payment amount |
| paymentDate | string (date) | yes | Payment date |
| paymentMethod | string (enum) | yes | `cash`, `bank_transfer`, `cheque`, `promptpay` |
| customerId | string | no | Customer UUID |
| invoiceId | string | no | Auto-match to invoice |
| reference | string | no | Reference number |
| notes | string | no | Notes |

**Response:** 201 — Payment object

### GET /api/v1/payments
**Permission:** `ar:payment:read`
**Description:** List payments (รายการรับชำระ)

**Query Params:** `limit`, `offset`, `status` (unmatched/matched/voided), `customerId`, `sortOrder`

### POST /api/v1/payments/:id/void
**Permission:** `ar:payment:update`
**Description:** Void payment — restores invoice balance, creates reversal JE (ยกเลิกรับชำระ)

### POST /api/v1/payments/:id/match
**Permission:** `ar:payment:update`
**Description:** Match payment to invoices — sequential allocation (จับคู่การชำระ)

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| invoiceIds | string[] | yes | Invoice UUIDs to match against |

---

## 8. Quotations (ใบเสนอราคา)

### POST /api/v1/quotations
**Permission:** `ar:quotation:create`
**Description:** Create quotation (สร้างใบเสนอราคา)

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| customerId | string | yes | Customer UUID |
| customerName | string | yes | Customer name |
| subject | string | yes | Subject line |
| validUntil | string (date) | yes | Expiry date |
| lines | array | yes | `{ description, quantity, unitPriceSatang, accountId? }` |
| notes | string | no | Notes |

### GET /api/v1/quotations
**Permission:** `ar:quotation:read`
**Query Params:** `limit`, `offset`, `status` (draft/sent/approved/rejected/converted/expired), `customerId`

### GET /api/v1/quotations/:id
**Permission:** `ar:quotation:read`

### PUT /api/v1/quotations/:id
**Permission:** `ar:quotation:update`
**Description:** Update draft quotation (แก้ไขใบเสนอราคา — draft only)

### POST /api/v1/quotations/:id/send
**Permission:** `ar:quotation:send`
**Description:** Mark as sent (draft → sent)

### POST /api/v1/quotations/:id/approve
**Permission:** `ar:quotation:approve`
**Description:** Approve quotation (sent → approved)

### POST /api/v1/quotations/:id/reject
**Permission:** `ar:quotation:approve`
**Description:** Reject quotation (sent → rejected). Optional `{ reason }` body.

### POST /api/v1/quotations/:id/convert
**Permission:** `ar:quotation:convert`
**Description:** Convert approved quotation directly to invoice (QT → INV shortcut)

### POST /api/v1/quotations/:id/duplicate
**Permission:** `ar:quotation:create`
**Description:** Clone quotation as new draft (+30 days validity)

### POST /api/v1/quotations/:id/convert-to-order
**Permission:** `ar:quotation:convert` + `ar:so:create`
**Description:** Convert approved quotation to sales order (QT → SO standard flow)

---

## 9. Sales Orders (ใบสั่งขาย)

### POST /api/v1/sales-orders
**Permission:** `ar:so:create`
**Description:** Create sales order (สร้างใบสั่งขาย)

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| customerId | string | yes | Customer UUID |
| customerName | string | yes | Customer name |
| orderDate | string (date) | yes | Order date |
| lines | array | yes | `{ description, quantity, unitPriceSatang, accountId? }` |
| expectedDeliveryDate | string | no | Expected delivery |
| quotationId | string | no | Source quotation |
| notes | string | no | Notes |

### GET /api/v1/sales-orders
**Permission:** `ar:so:read`
**Query Params:** `limit`, `offset`, `status` (draft/confirmed/partial_delivered/delivered/cancelled), `customerId`

### GET /api/v1/sales-orders/:id
**Permission:** `ar:so:read`

### PUT /api/v1/sales-orders/:id
**Permission:** `ar:so:update`
**Description:** Update draft SO (draft only)

### POST /api/v1/sales-orders/:id/confirm
**Permission:** `ar:so:confirm`
**Description:** Confirm SO (draft → confirmed)

### POST /api/v1/sales-orders/:id/cancel
**Permission:** `ar:so:confirm`
**Description:** Cancel SO (draft/confirmed → cancelled)

---

## 10. Delivery Notes (ใบส่งของ)

### POST /api/v1/delivery-notes
**Permission:** `ar:do:create`
**Description:** Create delivery note from confirmed SO (สร้างใบส่งของ)

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| salesOrderId | string | yes | Source SO |
| customerId | string | yes | Customer |
| customerName | string | yes | Customer name |
| deliveryDate | string (date) | yes | Delivery date |
| lines | array | yes | `{ salesOrderLineId, description, quantityDelivered, productId?, warehouseId? }` |
| notes | string | no | Notes |

### GET /api/v1/delivery-notes
**Permission:** `ar:do:read`
**Query Params:** `limit`, `offset`, `status` (draft/delivered/cancelled), `salesOrderId`

### GET /api/v1/delivery-notes/:id
**Permission:** `ar:do:read`

### POST /api/v1/delivery-notes/:id/deliver
**Permission:** `ar:do:deliver`
**Description:** Mark as delivered — updates SO quantities, creates stock movements, checks stock (ส่งของ)

### POST /api/v1/delivery-notes/:id/convert-to-invoice
**Permission:** `ar:do:read` + `ar:invoice:create`
**Description:** Convert delivered DN to draft invoice (ออกใบแจ้งหนี้จากใบส่งของ)

---

## 11. Receipts (ใบเสร็จรับเงิน)

### POST /api/v1/receipts
**Permission:** `ar:receipt:create`
**Description:** Issue official receipt (ออกใบเสร็จรับเงิน)

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| customerId | string | yes | Customer |
| customerName | string | yes | Customer name |
| amountSatang | string | yes | Receipt amount |
| receiptDate | string (date) | yes | Receipt date |
| paymentMethod | string (enum) | yes | `cash`, `bank_transfer`, `cheque`, `promptpay`, `credit_card` |
| paymentId | string | no | Link to payment |
| invoiceId | string | no | Link to invoice |
| reference | string | no | Reference number |
| notes | string | no | Notes |

### GET /api/v1/receipts
**Permission:** `ar:receipt:read`
**Query Params:** `limit`, `offset`, `status` (issued/voided), `customerId`

### GET /api/v1/receipts/:id
**Permission:** `ar:receipt:read`

### GET /api/v1/receipts/:id/pdf
**Permission:** `ar:receipt:read`
**Description:** Generate printable HTML receipt in Thai format (Buddhist Era, Thai labels) (พิมพ์ใบเสร็จ)

### POST /api/v1/receipts/:id/void
**Permission:** `ar:receipt:void`
**Description:** Void receipt (issued → voided) (ยกเลิกใบเสร็จ)

---

## 12. Credit Notes (ใบลดหนี้)

### POST /api/v1/credit-notes
**Permission:** `ar:cn:create`
**Description:** Create credit note referencing an invoice. Validates CN total ≤ invoice total. (สร้างใบลดหนี้)

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| invoiceId | string | yes | Referenced invoice |
| customerId | string | yes | Customer |
| customerName | string | yes | Customer name |
| reason | string | yes | Reason for credit |
| lines | array | yes | `{ description, quantity, unitPriceSatang, accountId? }` |
| notes | string | no | Notes |

### GET /api/v1/credit-notes
**Permission:** `ar:cn:read`
**Query Params:** `limit`, `offset`, `status` (draft/issued/voided), `customerId`, `invoiceId`

### GET /api/v1/credit-notes/:id
**Permission:** `ar:cn:read`

### POST /api/v1/credit-notes/:id/issue
**Permission:** `ar:cn:issue`
**Description:** Issue credit note (draft → issued) (ออกใบลดหนี้)

### POST /api/v1/credit-notes/:id/void
**Permission:** `ar:cn:void`
**Description:** Void credit note (draft/issued → voided) (ยกเลิกใบลดหนี้)

---

## 13. Accounts Payable (AP) — Vendors

### GET /api/v1/vendors
**Permission:** `ap:vendor:read`
**Description:** List vendors with search (รายการผู้ขาย)

**Query Params:** `limit`, `offset`, `search` (name/taxId ILIKE)

### POST /api/v1/vendors
**Permission:** `ap:vendor:create`
**Description:** Create vendor (สร้างผู้ขาย)

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | yes | Vendor name |
| taxId | string | no | Tax ID |
| address | string | no | Address |

### PUT /api/v1/vendors/:id
**Permission:** `ap:vendor:update`
**Description:** Update vendor (แก้ไขผู้ขาย)

---

## 14. AP — Bills

### POST /api/v1/bills
**Permission:** `ap:bill:create`
**Description:** Create AP bill in draft status (สร้างใบแจ้งหนี้ซื้อ)

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| vendorId | string | yes | Vendor UUID |
| dueDate | string (date) | yes | Payment due date |
| notes | string | no | Notes |
| lines | array | yes | `{ description, amountSatang, accountId }` |

### GET /api/v1/bills
**Permission:** `ap:bill:read`
**Query Params:** `limit`, `offset`, `status` (draft/posted/voided/paid/partial), `vendorId`, `sortBy`, `sortOrder`

### GET /api/v1/bills/:id
**Permission:** `ap:bill:read`

### PUT /api/v1/bills/:id
**Permission:** `ap:bill:update`
**Description:** Update draft bill (draft only)

### POST /api/v1/bills/:id/post
**Permission:** `ap:bill:approve`
**Description:** Post bill (draft → posted) (ผ่านใบแจ้งหนี้ซื้อ)

### POST /api/v1/bills/:id/void
**Permission:** `ap:bill:approve`
**Description:** Void bill (draft/posted → voided) (ยกเลิกใบแจ้งหนี้ซื้อ)

---

## 15. AP — Bill Payments

### POST /api/v1/bill-payments
**Permission:** `ap:payment:create`
**Description:** Record vendor payment — validates overpayment, updates bill status (บันทึกจ่ายชำระ)

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| billId | string | yes | Bill UUID |
| amountSatang | string | yes | Payment amount |
| paymentDate | string (date) | yes | Payment date |
| paymentMethod | string (enum) | yes | `cash`, `bank_transfer`, `cheque`, `promptpay` |
| apAccountId | string | no | AP GL account override |
| cashAccountId | string | no | Cash GL account override |
| reference | string | no | Reference |
| notes | string | no | Notes |

### GET /api/v1/bill-payments
**Permission:** `ap:payment:read`
**Query Params:** `limit`, `offset`, `billId`, `sortOrder`

### GET /api/v1/bill-payments/:id
**Permission:** `ap:payment:read`

---

## 16. AP — Three-Way Match

### GET /api/v1/ap/bills/:id/match-status
**Permission:** `ap:bill:read`
**Description:** 3-way match: PO quantities vs GR (received) vs Bill amounts (ตรวจสอบ 3-way match)

**Response (200):**
```json
{
  "billId": "uuid",
  "matchStatus": "matched | quantity_mismatch | price_mismatch | unmatched | no_po",
  "purchaseOrderId": "uuid",
  "lines": [{ "lineNumber": 1, "description": "...", "billAmountSatang": "10000", "poQuantity": 10, "poAmountSatang": "10000", "receivedQuantity": 10, "status": "matched" }]
}
```

### POST /api/v1/ap/bills/:id/match-override
**Permission:** `ap:bill:approve`
**Description:** Override match status to allow payment on unmatched bills (ข้ามการตรวจสอบ)

---

## 17. Purchase Orders (ใบสั่งซื้อ)

### POST /api/v1/purchase-orders
**Permission:** `ap:po:create`
**Description:** Create PO in draft (สร้างใบสั่งซื้อ)

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| vendorId | string | yes | Vendor UUID |
| orderDate | string (date) | yes | Order date |
| expectedDate | string (date) | no | Expected delivery |
| notes | string | no | Notes |
| lines | array | yes | `{ description, quantity, unitPriceSatang, accountId?, productId?, warehouseId? }` |

### GET /api/v1/purchase-orders
**Permission:** `ap:po:read`
**Query Params:** `limit`, `offset`, `status` (draft/sent/partial_received/received/cancelled/converted), `vendorId`

### GET /api/v1/purchase-orders/:id
**Permission:** `ap:po:read`

### PUT /api/v1/purchase-orders/:id
**Permission:** `ap:po:update`
**Description:** Update draft PO (draft only)

### POST /api/v1/purchase-orders/:id/send
**Permission:** `ap:po:send`
**Description:** Send PO to vendor (draft → sent) (ส่ง PO)

### POST /api/v1/purchase-orders/:id/receive
**Permission:** `ap:po:receive`
**Description:** Record goods received — supports partial. Creates stock movements. (รับของ)

**Request:** `{ lines: [{ lineId, quantityReceived, productId?, warehouseId? }] }`

### POST /api/v1/purchase-orders/:id/convert-to-bill
**Permission:** `ap:po:convert`
**Description:** Convert PO to draft AP bill (สร้างใบแจ้งหนี้จาก PO)

### POST /api/v1/purchase-orders/:id/cancel
**Permission:** `ap:po:send`
**Description:** Cancel PO (draft/sent → cancelled) (ยกเลิก PO)

---

## 18. Purchase Requisitions (ใบขอซื้อ)

### POST /api/v1/purchase-requisitions
**Permission:** `mm:pr:create`

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| requesterId | string | no | Defaults to current user |
| departmentId | string | no | Department |
| notes | string | no | Notes |
| lines | array | yes | `{ description, quantity, estimatedPriceSatang, productId? }` |

### GET /api/v1/purchase-requisitions
**Permission:** `mm:pr:read`
**Query Params:** `limit`, `offset`, `status`

### GET /api/v1/purchase-requisitions/:id
**Permission:** `mm:pr:read`

### PUT /api/v1/purchase-requisitions/:id
**Permission:** `mm:pr:update`
**Description:** Update draft PR (draft only)

### POST /api/v1/purchase-requisitions/:id/submit
**Permission:** `mm:pr:create`
**Description:** Submit for approval (draft → pending)

### POST /api/v1/purchase-requisitions/:id/approve
**Permission:** `mm:pr:approve`
**Description:** Approve PR (pending → approved)

### POST /api/v1/purchase-requisitions/:id/reject
**Permission:** `mm:pr:approve`
**Description:** Reject PR (pending → rejected). Optional `{ reason }` body.

### POST /api/v1/purchase-requisitions/:id/convert-to-po
**Permission:** `mm:pr:create`
**Description:** Convert approved PR to PO (สร้าง PO จากใบขอซื้อ)

**Request:** `{ vendorId: "uuid" }`

---

## 19. RFQ — Request for Quotation (ใบขอราคา)

### POST /api/v1/rfqs
**Permission:** `mm:rfq:create`

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| prId | string | no | Link to purchase requisition |
| notes | string | no | Notes |
| vendorIds | string[] | no | Initial vendor IDs |

### GET /api/v1/rfqs
**Permission:** `mm:rfq:read`

### GET /api/v1/rfqs/:id
**Permission:** `mm:rfq:read`

### POST /api/v1/rfqs/:id/send
**Permission:** `mm:rfq:create`
**Description:** Send to vendors (draft → sent)

### POST /api/v1/rfqs/:id/vendors
**Permission:** `mm:rfq:create`
**Description:** Add vendor response/quote

**Request:** `{ vendorId, responseDate?, totalAmountSatang?, notes? }`

### POST /api/v1/rfqs/:id/compare
**Permission:** `mm:rfq:read`
**Description:** Compare vendor responses — recommends lowest price (เปรียบเทียบราคา)

### POST /api/v1/rfqs/:id/select-winner
**Permission:** `mm:rfq:create`
**Description:** Select winning vendor and auto-create PO (เลือกผู้ขายและสร้าง PO)

**Request:** `{ vendorId: "uuid" }`

---

## 20. Vendor Returns (ส่งคืนผู้ขาย)

### POST /api/v1/vendor-returns
**Permission:** `ap:vendor:read`

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| vendorId | string | yes | Vendor |
| poId | string | no | Linked PO |
| reason | string | no | Return reason |
| lines | array | yes | `{ productId, quantity, unitPriceSatang }` |

### GET /api/v1/vendor-returns
**Permission:** `ap:vendor:read`

### GET /api/v1/vendor-returns/:id
**Permission:** `ap:vendor:read`

### POST /api/v1/vendor-returns/:id/ship
**Permission:** `inventory:movement:create`
**Description:** Ship return — creates negative stock movements (draft → shipped)

**Request:** `{ warehouseId: "uuid" }`

### POST /api/v1/vendor-returns/:id/credit
**Permission:** `ap:bill:create`
**Description:** Receive credit memo — creates negative AP bill (shipped → received_credit)

---

## 21. Contacts / CRM (รายชื่อลูกค้า/ผู้ขาย)

### POST /api/v1/contacts
**Permission:** `crm:contact:create`

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| companyName | string | yes | Company name |
| contactType | string | no | `customer` (default), `vendor`, `both` |
| code | string | no | Contact code |
| contactPerson | string | no | Contact person |
| email | string | no | Email |
| phone | string | no | Phone |
| taxId | string | no | Tax ID (13 digits) |
| branchNumber | string | no | Branch number |
| addressLine1-2 | string | no | Address |
| city, province, postalCode | string | no | Location |
| country | string | no | Default: TH |
| paymentTermsDays | number | no | Default: 30 |
| creditLimitSatang | number | no | Credit limit |
| notes | string | no | Notes |

### GET /api/v1/contacts
**Permission:** `crm:contact:read`
**Query Params:** `limit`, `offset`, `type` (customer/vendor/both), `search`

### GET /api/v1/contacts/:id
**Permission:** `crm:contact:read`
**Description:** Contact detail with AR/AP transaction summary

### PUT /api/v1/contacts/:id
**Permission:** `crm:contact:update`

### DELETE /api/v1/contacts/:id
**Permission:** `crm:contact:delete`
**Description:** Soft-delete — blocked if linked invoices/bills exist

### GET /api/v1/contacts/:id/transactions
**Permission:** `crm:contact:read`
**Description:** List invoices and bills for a contact

### GET /api/v1/contacts/:id/credit-exposure
**Permission:** `crm:contact:read`
**Description:** Credit exposure: open invoices + open SOs vs credit limit (วงเงินเครดิต)

### POST /api/v1/credit/check
**Permission:** `ar:so:create`
**Description:** Check credit before creating SO — returns ok/warning/blocked

**Request:** `{ customerId, orderTotalSatang }`

---

## 22. Inventory (คลังสินค้า)

### POST /api/v1/products
**Permission:** `inventory:product:create`

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| sku | string | yes | SKU code |
| nameTh | string | yes | Thai name |
| nameEn | string | yes | English name |
| description | string | no | Description |
| category | string | no | Category |
| unit | string | no | Default: ชิ้น |
| costPriceSatang | number | no | Cost price |
| sellingPriceSatang | number | no | Selling price |
| minStockLevel | number | no | Minimum stock alert level |
| isActive | boolean | no | Default: true |
| glAccountId | string | no | Linked GL account |

### GET /api/v1/products
**Permission:** `inventory:product:read`
**Query Params:** `limit`, `offset`, `search`, `activeOnly`

### PUT /api/v1/products/:id
**Permission:** `inventory:product:update`

### POST /api/v1/warehouses
**Permission:** `inventory:warehouse:create`

**Request:** `{ code, name, address?, isDefault? }`

### GET /api/v1/warehouses
**Permission:** `inventory:warehouse:read`

### PUT /api/v1/warehouses/:id
**Permission:** `inventory:warehouse:update`

### POST /api/v1/stock-movements
**Permission:** `inventory:movement:create`
**Description:** Record stock movement — receipt, issue, adjust, or transfer (บันทึกการเคลื่อนไหวสต็อก)

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| productId | string | yes | Product UUID |
| warehouseId | string | yes | Warehouse UUID |
| movementType | string | yes | `receipt`, `issue`, `adjust`, `transfer` |
| quantity | number | yes | Quantity (negative for issue) |
| toWarehouseId | string | for transfer | Destination warehouse |
| referenceType | string | no | e.g. `purchase_order` |
| referenceId | string | no | Reference UUID |
| batchNumber | string | no | Batch number |
| notes | string | no | Notes |
| unitCostSatang | number | no | Unit cost |

### GET /api/v1/stock-movements
**Permission:** `inventory:movement:read`
**Query Params:** `limit`, `offset`, `productId`, `warehouseId`, `dateFrom`, `dateTo`

### GET /api/v1/stock-levels
**Permission:** `inventory:level:read`
**Description:** Current stock levels for all products (ระดับสต็อกปัจจุบัน)

### GET /api/v1/stock-levels/:productId
**Permission:** `inventory:level:read`
**Description:** Stock for a single product across all warehouses

### GET /api/v1/inventory/valuation
**Permission:** `inventory:valuation:read`
**Description:** Stock valuation report (average cost method)

### GET /api/v1/inventory/low-stock
**Permission:** `inventory:level:read`
**Description:** Products below minimum stock level (แจ้งเตือนสต็อกต่ำ)

---

## 23. Stock Counts (ตรวจนับสต็อก)

### POST /api/v1/stock-counts
**Permission:** `inventory:count:create`
**Description:** Create stock count — auto-populates lines from current levels

**Request:** `{ warehouseId, countDate?, notes?, productIds? }`

### GET /api/v1/stock-counts
**Permission:** `inventory:count:read`

### GET /api/v1/stock-counts/:id
**Permission:** `inventory:count:read`

### POST /api/v1/stock-counts/:id/enter
**Permission:** `inventory:count:create`
**Description:** Enter actual quantities

**Request:** `{ entries: [{ productId, actualQuantity }] }`

### POST /api/v1/stock-counts/:id/post
**Permission:** `inventory:count:post`
**Description:** Post adjustments — creates stock movements + JE for variance (ปรับยอดจริง)

---

## 24. Batches & Serial Numbers (ล็อต/ซีเรียล)

### POST /api/v1/batches
**Permission:** `inventory:product:create`
**Request:** `{ productId, batchNumber, manufactureDate?, expiryDate? }`

### GET /api/v1/batches
**Permission:** `inventory:product:read`
**Query Params:** `productId`

### GET /api/v1/batches/:id
**Permission:** `inventory:product:read`
**Description:** Batch detail with serial numbers

### POST /api/v1/serial-numbers
**Permission:** `inventory:product:create`
**Request:** `{ productId, serialNumber, batchId? }`

### GET /api/v1/serial-numbers
**Permission:** `inventory:product:read`
**Query Params:** `productId`, `status` (available/sold/returned)

### PUT /api/v1/serial-numbers/:id/status
**Permission:** `inventory:product:create`
**Request:** `{ status: "available" | "sold" | "returned" }`

### GET /api/v1/inventory/trace/:batchId
**Permission:** `inventory:movement:read`
**Description:** Forward traceability — find all customers who received items from this batch (ตรวจสอบย้อนกลับ)

---

## 25. HR — Departments & Employees

### POST /api/v1/departments
**Permission:** `hr:department:create`
**Request:** `{ code, nameTh, nameEn, managerId?, costCenterId? }`

### GET /api/v1/departments
**Permission:** `hr:department:read`

### PUT /api/v1/departments/:id
**Permission:** `hr:department:update`

### GET /api/v1/departments/tree
**Permission:** `hr:department:read`
**Description:** Organization hierarchy tree (recursive) (แผนผังองค์กร)

### POST /api/v1/employees
**Permission:** `hr:employee:create`

**Key Fields:** `employeeCode`, `firstNameTh`, `lastNameTh`, `hireDate` (all required). Optional: `titleTh`, `firstNameEn`, `lastNameEn`, `email`, `phone`, `nationalId` (13 digits), `taxId`, `socialSecurityNumber`, `position`, `departmentId`, `employmentType`, `salarySatang`, `bankAccountNumber`, `bankName`, `providentFundPercent`, `nationality`

### GET /api/v1/employees
**Permission:** `hr:employee:read`
**Description:** List employees — PDPA masked (nationalId masked, salary omitted in list)

**Query Params:** `limit`, `offset`, `status`, `departmentId`, `search`

### GET /api/v1/employees/:id
**Permission:** `hr:employee:read`
**Description:** Full employee detail (unmasked)

### PUT /api/v1/employees/:id
**Permission:** `hr:employee:update`

### POST /api/v1/employees/:id/resign
**Permission:** `hr:employee:resign`
**Description:** Record resignation (active → resigned)

**Request:** `{ resignationDate?, notes? }`

### POST /api/v1/employees/:id/anonymize
**Permission:** `hr:employee:anonymize`
**Description:** PDPA anonymization — replaces all PII with anonymized placeholders (ลบข้อมูลส่วนบุคคล PDPA)

---

## 26. Positions (ตำแหน่ง)

### POST /api/v1/positions
**Permission:** `hr:position:create`
**Request:** `{ code?, title?, departmentId?, reportsToPositionId?, headcount? }`

### GET /api/v1/positions
**Permission:** `hr:position:read`
**Query Params:** `departmentId`, `limit`, `offset`

### GET /api/v1/positions/:id
**Permission:** `hr:position:read`
**Description:** Position detail with employees and filled count

### PUT /api/v1/positions/:id
**Permission:** `hr:position:update`

---

## 27. Payroll (เงินเดือน)

### POST /api/v1/payroll
**Permission:** `hr:payroll:create`
**Request:** `{ payPeriodStart, payPeriodEnd, runDate, notes? }`

### GET /api/v1/payroll
**Permission:** `hr:payroll:read`
**Query Params:** `limit`, `offset`, `status`

### GET /api/v1/payroll/:id
**Permission:** `hr:payroll:read`
**Description:** Payroll run detail with items

### POST /api/v1/payroll/:id/calculate
**Permission:** `hr:payroll:calculate`
**Description:** Auto-calculate from employee salary data — Thai SSC 5% (cap 750 THB) + PIT brackets (คำนวณเงินเดือน)

### POST /api/v1/payroll/:id/approve
**Permission:** `hr:payroll:approve`
**Description:** Approve calculated payroll (calculated → approved)

### POST /api/v1/payroll/:id/pay
**Permission:** `hr:payroll:pay`
**Description:** Mark as paid — auto-creates JE (Dr Salaries, Cr Cash/SSC/Tax) (จ่ายเงินเดือน)

### GET /api/v1/payroll/:id/payslips
**Permission:** `hr:payroll:read`
**Description:** Individual payslips for all employees in the run (สลิปเงินเดือน)

### PUT /api/v1/payroll/:id/items/:itemId
**Permission:** `hr:payroll:calculate`
**Description:** Adjust individual payroll item (draft/calculated only)

### GET /api/v1/payroll/:id/bank-file
**Permission:** `hr:payroll:read`
**Description:** Generate bank transfer file — SCB CSV or KBank TXT format

**Query Params:** `bank` (`scb` default, `kbank`)

### GET /api/v1/payroll/ytd-summary/:employeeId
**Permission:** `hr:payroll:read`
**Description:** YTD tax summary for employee

**Query Params:** `year`

---

## 28. Leave Management (การลา)

### POST /api/v1/leave-types
**Permission:** `hr:leave:type:create`
**Request:** `{ code, nameTh, nameEn, annualQuotaDays?, isPaid? }`

### GET /api/v1/leave-types
**Permission:** `hr:leave:type:read`

### POST /api/v1/leave-requests
**Permission:** `hr:leave:request:create`
**Description:** Submit leave request — validates balance and overlap (ขอลา)

**Request:** `{ employeeId, leaveTypeId, startDate, endDate, days?, reason? }`

### GET /api/v1/leave-requests
**Permission:** `hr:leave:request:read`
**Query Params:** `limit`, `offset`, `employeeId`, `status`, `dateFrom`, `dateTo`

### GET /api/v1/leave-requests/:id
**Permission:** `hr:leave:request:read`

### POST /api/v1/leave-requests/:id/approve
**Permission:** `hr:leave:request:approve`

### POST /api/v1/leave-requests/:id/reject
**Permission:** `hr:leave:request:reject`
**Request:** `{ reason? }`

### GET /api/v1/leave-requests/balance/:employeeId
**Permission:** `hr:leave:request:read`
**Description:** Remaining leave balance by type (วันลาคงเหลือ)

### GET /api/v1/leave-requests/accrual-balance/:employeeId
**Permission:** `hr:leave:request:read`
**Description:** Accrual-based balance (accounts for probation + monthly accrual)

### GET /api/v1/leave-requests/working-days
**Permission:** `hr:leave:request:read`
**Description:** Calculate working days between dates (excludes weekends + holidays)

**Query Params:** `startDate`, `endDate`

### POST /api/v1/leave-accrual-rules
**Permission:** `hr:leave:type:create`
**Request:** `{ leaveTypeId, accrualPerMonth?, maxCarryForward?, probationMonths? }`

### GET /api/v1/leave-accrual-rules
**Permission:** `hr:leave:type:read`

### POST /api/v1/public-holidays
**Permission:** `hr:leave:type:create`
**Request:** `{ date, nameTh, nameEn }`

### GET /api/v1/public-holidays
**Permission:** `hr:leave:type:read`
**Query Params:** `year`

---

## 29. Attendance (การลงเวลา)

### POST /api/v1/attendance/clock-in
**Permission:** `hr:attendance:create`
**Description:** Clock in — auto-detects late if after 09:00 (ลงเวลาเข้า)

**Request:** `{ employeeId }`

### POST /api/v1/attendance/clock-out
**Permission:** `hr:attendance:create`
**Description:** Clock out — auto-calculates hours worked and overtime >8h (ลงเวลาออก)

**Request:** `{ employeeId }`

### GET /api/v1/attendance/daily/:employeeId
**Permission:** `hr:attendance:read`
**Query Params:** `date` (default: today)

### GET /api/v1/attendance/monthly/:employeeId
**Permission:** `hr:attendance:read`
**Description:** Monthly summary with aggregate stats

**Query Params:** `year`, `month`

---

## 30. Fixed Assets (สินทรัพย์ถาวร)

### POST /api/v1/fixed-assets
**Permission:** `fi:asset:create`

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| assetCode | string | yes | Asset code |
| nameTh | string | yes | Thai name |
| nameEn | string | yes | English name |
| category | string (enum) | yes | `land`, `building`, `equipment`, `vehicle`, `furniture`, `it_equipment`, `other` |
| purchaseDate | string (date) | yes | Purchase date |
| purchaseCostSatang | string | yes | Cost in satang |
| salvageValueSatang | string | no | Salvage value (default: 0) |
| usefulLifeMonths | integer | yes | Useful life in months |
| depreciationMethod | string | no | `straight_line` (default), `declining_balance` |
| glAccountId | string | no | Asset GL account |
| depreciationAccountId | string | no | Depreciation GL account |

### GET /api/v1/fixed-assets
**Permission:** `fi:asset:read`
**Query Params:** `limit`, `offset`, `category`, `status` (active/disposed/written_off)

### GET /api/v1/fixed-assets/:id
**Permission:** `fi:asset:read`

### GET /api/v1/fixed-assets/report
**Permission:** `fi:asset:read`
**Description:** Asset register report — totals by category (รายงานสินทรัพย์)

### PUT /api/v1/fixed-assets/:id
**Permission:** `fi:asset:update`

### POST /api/v1/fixed-assets/:id/depreciate
**Permission:** `fi:asset:depreciate`
**Description:** Run monthly depreciation — creates JE (คิดค่าเสื่อมราคา)

**Request:** `{ periodDate? }` (default: today)

### POST /api/v1/fixed-assets/:id/dispose
**Permission:** `fi:asset:dispose`
**Description:** Dispose/sell asset — creates gain/loss JE (จำหน่ายสินทรัพย์)

**Request:** `{ disposalDate, disposalAmountSatang, reason? }`

---

## 31. Bank Accounts & Reconciliation (บัญชีธนาคาร)

### POST /api/v1/bank-accounts
**Permission:** `fi:bank:create`
**Request:** `{ accountName, accountNumber, bankName, glAccountId?, currency? }`

### GET /api/v1/bank-accounts
**Permission:** `fi:bank:read`

### GET /api/v1/bank-accounts/:id
**Permission:** `fi:bank:read`
**Description:** Bank account with recent transactions

### POST /api/v1/bank-accounts/:id/transactions
**Permission:** `fi:bank:create`
**Description:** Add manual transaction

**Request:** `{ transactionDate, description, debitSatang?, creditSatang?, reference? }`

### POST /api/v1/bank-accounts/:id/import
**Permission:** `fi:bank:import`
**Description:** Import bank statement from CSV (multipart upload) (นำเข้า statement)

### GET /api/v1/bank-accounts/:id/reconciliation
**Permission:** `fi:bank:read`
**Description:** Reconciliation report — unmatched transactions (รายการที่ยังไม่กระทบยอด)

### POST /api/v1/bank-transactions/:id/reconcile
**Permission:** `fi:bank:reconcile`
**Description:** Match bank transaction to journal entry (กระทบยอด)

**Request:** `{ journalEntryId }`

---

## 32. Bank Matching Rules (กฎจับคู่อัตโนมัติ)

### POST /api/v1/bank-matching-rules
**Permission:** `fi:bank:create`
**Request:** `{ matchType (exact_amount/reference/amount_range), pattern, targetAccountId, priority?, field?, minAmountSatang?, maxAmountSatang? }`

### GET /api/v1/bank-matching-rules
**Permission:** `fi:bank:read`

### PUT /api/v1/bank-matching-rules/:id
**Permission:** `fi:bank:create`

### DELETE /api/v1/bank-matching-rules/:id
**Permission:** `fi:bank:create`

### POST /api/v1/bank/:accountId/auto-reconcile
**Permission:** `fi:bank:reconcile`
**Description:** Auto-reconcile using matching rules — rate limited 5/min (กระทบยอดอัตโนมัติ)

---

## 33. Withholding Tax (ภาษีหัก ณ ที่จ่าย)

### POST /api/v1/wht-certificates
**Permission:** `fi:wht:create`

**Request:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| certificateType | string | yes | `pnd3` or `pnd53` |
| payerName | string | yes | Payer name |
| payerTaxId | string | yes | 13-digit tax ID |
| payeeName | string | yes | Payee name |
| payeeTaxId | string | yes | 13-digit tax ID |
| payeeAddress | string | yes | Payee address |
| incomeType | string | yes | Income type |
| incomeDescription | string | yes | Description |
| paymentDate | string (date) | yes | Payment date |
| incomeAmountSatang | string | yes | Income amount |
| whtRateBasisPoints | integer | yes | WHT rate (basis points, 1-10000) |
| taxMonth | integer | yes | Tax month (1-12) |
| taxYear | integer | yes | Tax year |
| billPaymentId | string | no | Linked bill payment |

### GET /api/v1/wht-certificates
**Permission:** `fi:wht:read`
**Query Params:** `limit`, `offset`, `certificateType`, `status` (draft/issued/filed/voided), `taxMonth`, `taxYear`

### GET /api/v1/wht-certificates/summary
**Permission:** `fi:wht:read`
**Description:** Summary by month for filing (สรุปหัก ณ ที่จ่ายรายเดือน)

### GET /api/v1/wht-certificates/:id
**Permission:** `fi:wht:read`

### POST /api/v1/wht-certificates/:id/issue
**Permission:** `fi:wht:issue`
**Description:** Issue certificate (draft → issued)

### POST /api/v1/wht-certificates/:id/void
**Permission:** `fi:wht:void`
**Description:** Void certificate

### POST /api/v1/wht-certificates/:id/file
**Permission:** `fi:wht:file`
**Description:** Mark as filed with Revenue Department (ยื่นแล้ว)

### POST /api/v1/wht/annual-certificate
**Permission:** `fi:wht:read`
**Description:** Generate 50 ทวิ Annual Tax Certificate for an employee

**Request:** `{ employeeId, taxYear }`

---

## 34. Cost Centers (ศูนย์ต้นทุน)

### POST /api/v1/cost-centers
**Permission:** `co:cost-center:create`
**Request:** `{ code, nameTh, nameEn, parentId? }`

### GET /api/v1/cost-centers
**Permission:** `co:cost-center:read`
**Query Params:** `includeInactive`

### GET /api/v1/cost-centers/:id
**Permission:** `co:cost-center:read`

### PUT /api/v1/cost-centers/:id
**Permission:** `co:cost-center:update`

### GET /api/v1/cost-centers/:id/report
**Permission:** `co:cost-center:read`
**Description:** Cost report — JE lines grouped by account

### GET /api/v1/cost-centers/:id/budget-status
**Permission:** `co:cost-center:read`
**Description:** Budget utilization status (within_budget/warning/over_budget) (สถานะงบประมาณ)

### POST /api/v1/cost-centers/budget-check
**Permission:** `co:cost-center:read`
**Description:** Pre-posting budget availability check

**Request:** `{ costCenterId, amountSatang, fiscalYear?, override? }`

### GET /api/v1/reports/budget-variance-detail
**Permission:** `co:cost-center:read`
**Description:** Budget variance analysis by cost center (วิเคราะห์ผลต่างงบประมาณ)

---

## 35. Profit Centers (ศูนย์กำไร)

### POST /api/v1/profit-centers
**Permission:** `co:profit-center:create`
**Request:** `{ code, nameTh, nameEn, parentId? }`

### GET /api/v1/profit-centers
**Permission:** `co:profit-center:read`

### GET /api/v1/profit-centers/:id
**Permission:** `co:profit-center:read`

### PUT /api/v1/profit-centers/:id
**Permission:** `co:profit-center:update`

### GET /api/v1/profit-centers/:id/report
**Permission:** `co:profit-center:read`
**Description:** P&L report for a specific profit center (งบกำไรขาดทุนศูนย์กำไร)

---

## 36. Tax Rates (อัตราภาษี)

### GET /api/v1/tax-rates
**Permission:** `requireAuth`
**Description:** List tax rates (VAT/WHT) for the tenant

### POST /api/v1/tax-rates
**Permission:** `requireAuth`

**Request:** `{ taxType (vat/wht), rateBasisPoints, incomeType?, effectiveFrom }`

### PUT /api/v1/tax-rates/:id
**Permission:** `requireAuth`

### DELETE /api/v1/tax-rates/:id
**Permission:** `requireAuth`
**Response:** 204

---

## 37. Pricing (ราคาสินค้า)

### POST /api/v1/price-lists
**Permission:** `pricing:manage`
**Request:** `{ name, currency?, validFrom?, validTo? }`

### GET /api/v1/price-lists
**Permission:** `pricing:read`

### GET /api/v1/price-lists/:id
**Permission:** `pricing:read`
**Description:** Price list detail with items

### PUT /api/v1/price-lists/:id
**Permission:** `pricing:manage`

### DELETE /api/v1/price-lists/:id
**Permission:** `pricing:manage`
**Description:** Soft-delete (deactivate)

### POST /api/v1/price-lists/:id/items
**Permission:** `pricing:manage`
**Request:** `{ productId, unitPriceSatang, minQuantity?, discountPercent? }`

### GET /api/v1/price-lists/:id/items
**Permission:** `pricing:read`

### DELETE /api/v1/price-lists/:id/items/:itemId
**Permission:** `pricing:manage`

### GET /api/v1/pricing/resolve
**Permission:** `pricing:read`
**Description:** Resolve price using cascade: customer list → any active list → product base price (หาราคาสินค้า)

**Query Params:** `productId` (required), `customerId`, `quantity`

---

## 38. Payment Terms (เงื่อนไขการชำระ)

### POST /api/v1/payment-terms
**Permission:** `pricing:manage`
**Request:** `{ code, name, days?, discountPercent?, discountDays? }`

### POST /api/v1/payment-terms/seed
**Permission:** `pricing:manage`
**Description:** Seed defaults (NET30, NET60, COD, 2/10NET30)

### GET /api/v1/payment-terms
**Permission:** `pricing:read`

### GET /api/v1/payment-terms/:id
**Permission:** `pricing:read`

### PUT /api/v1/payment-terms/:id
**Permission:** `pricing:manage`

### DELETE /api/v1/payment-terms/:id
**Permission:** `pricing:manage`
**Description:** Soft-delete (deactivate)

---

## 39. Dunning (ติดตามหนี้)

### GET /api/v1/dunning/levels
**Permission:** `ar:invoice:read`

### POST /api/v1/dunning/levels
**Permission:** `dunning:manage`
**Description:** Create/update dunning level (upsert)

**Request:** `{ level, daysOverdue, template?, feeSatang? }`

### POST /api/v1/dunning/run
**Permission:** `dunning:manage`
**Description:** Run dunning process — find overdue invoices and assign levels (rate limited 5/min) (รันติดตามหนี้)

### GET /api/v1/dunning/list
**Permission:** `ar:invoice:read`
**Description:** List all dunning cases with status

---

## 40. Recurring Journal Entries (รายการอัตโนมัติ)

### POST /api/v1/recurring-je
**Permission:** `gl:journal:create`
**Description:** Create recurring JE template — validates double-entry balance

**Request:** `{ description, lines[{ accountId, debitSatang, creditSatang, description? }], nextRunDate, frequency? (monthly/quarterly/annually) }`

### GET /api/v1/recurring-je
**Permission:** `gl:journal:read`

### GET /api/v1/recurring-je/:id
**Permission:** `gl:journal:read`

### PUT /api/v1/recurring-je/:id
**Permission:** `gl:journal:create`

### DELETE /api/v1/recurring-je/:id
**Permission:** `gl:journal:create`
**Description:** Deactivate (soft-delete)

### POST /api/v1/recurring-je/run
**Permission:** `gl:journal:create`
**Description:** Execute all pending recurring JEs (rate limited 5/min, max 50 per batch) (ประมวลผลรายการอัตโนมัติ)

---

## 41. Multi-Currency (หลายสกุลเงิน)

### POST /api/v1/currencies
**Permission:** `fi:currency:create`
**Request:** `{ code (3 chars), name, symbol?, decimalPlaces? }`

### GET /api/v1/currencies
**Permission:** `fi:currency:read`

### PUT /api/v1/currencies/:id
**Permission:** `fi:currency:update`

### POST /api/v1/exchange-rates
**Permission:** `fi:currency:create`
**Description:** Add exchange rate (upsert on conflict)

**Request:** `{ fromCurrency, toCurrency, rate, effectiveDate, source? (manual/bot) }`

### GET /api/v1/exchange-rates
**Permission:** `fi:currency:read`
**Query Params:** `fromCurrency`, `toCurrency`, `limit`

### GET /api/v1/exchange-rates/convert
**Permission:** `fi:currency:read`
**Description:** Get exchange rate for specific date

**Query Params:** `from` (required), `to` (required), `date`

### POST /api/v1/gl/fx-revaluation
**Permission:** `gl:journal:create`
**Description:** Revalue open foreign currency items at month-end rate (ปรับมูลค่าอัตราแลกเปลี่ยน)

**Request:** `{ currencyCode, asOfDate, fiscalYear, fiscalPeriod }`

---

## 42. Multi-Company (หลายบริษัท)

### POST /api/v1/companies
**Permission:** `company:create`
**Request:** `{ code, name, taxId?, isBranch?, parentCompanyId? }`

### GET /api/v1/companies
**Permission:** `company:read`

### GET /api/v1/companies/:id
**Permission:** `company:read`

### PUT /api/v1/companies/:id
**Permission:** `company:update`

### POST /api/v1/companies/ic-transaction
**Permission:** `gl:journal:create`
**Description:** Intercompany transaction with auto mirror entry (รายการระหว่างบริษัท)

**Request:** `{ fromCompanyId, toCompanyId, description, amountSatang, fiscalYear, fiscalPeriod }`

### GET /api/v1/reports/consolidated
**Permission:** `report:gl:read`
**Description:** Consolidated report across companies with IC elimination (งบรวม)

**Query Params:** `companies` (comma-separated IDs), `fiscalYear`

---

## 43. Approval Workflows (ระบบอนุมัติ)

### POST /api/v1/approval-workflows
**Permission:** `approval:workflow:create`

**Request:** `{ documentType, name, steps[{ stepOrder, approverRole, amountThresholdSatang?, autoEscalateHours? }] }`

### GET /api/v1/approval-workflows
**Permission:** `approval:workflow:read`

### POST /api/v1/approvals/submit
**Permission:** `approval:action`
**Description:** Submit document for approval

**Request:** `{ documentId, documentType }`

### GET /api/v1/approvals
**Permission:** `approval:workflow:read`
**Query Params:** `status` (pending/approved/rejected/delegated), `documentType`, `limit`, `offset`

### GET /api/v1/approvals/:id
**Permission:** `approval:workflow:read`
**Description:** Approval detail with action history

### POST /api/v1/approvals/:id/approve
**Permission:** `approval:action`
**Description:** Approve current step — advances to next or fully approves

**Request:** `{ comment? }`

### POST /api/v1/approvals/:id/reject
**Permission:** `approval:action`
**Request:** `{ comment? }`

### POST /api/v1/approvals/:id/delegate
**Permission:** `approval:action`
**Description:** Delegate to another user (มอบหมาย)

**Request:** `{ delegateTo, comment? }`

---

## 44. Reports (รายงาน)

### GET /api/v1/reports/balance-sheet
**Permission:** `report:balance-sheet:read`
**Description:** Balance Sheet (งบแสดงฐานะการเงิน)

**Query Params:** `fiscalYear`, `period`, `asOfDate`

### GET /api/v1/reports/income-statement
**Permission:** `report:income-statement:read`
**Description:** Income Statement / P&L (งบกำไรขาดทุน)

### GET /api/v1/reports/trial-balance
**Permission:** `report:trial-balance:read`
**Description:** Trial Balance (งบทดลอง)

### GET /api/v1/reports/budget-variance
**Permission:** `report:gl:read`
**Description:** Budget vs Actual variance report (วิเคราะห์ผลต่างงบประมาณ)

### GET /api/v1/reports/equity-changes
**Permission:** `report:gl:read`
**Description:** Statement of Changes in Equity (งบแสดงการเปลี่ยนแปลงส่วนของผู้ถือหุ้น)

### GET /api/v1/reports/ar-aging
**Permission:** `report:ar:read`
**Description:** AR Aging by customer with aging buckets (รายงาน AR Aging)

### GET /api/v1/reports/ap-aging
**Permission:** `report:ap:read`
**Description:** AP Aging by vendor with aging buckets (รายงาน AP Aging)

### GET /api/v1/reports/pnl-comparison
**Permission:** `report:pnl-comparison:read`
**Description:** P&L comparison — 4 modes: monthly, ytd, yoy, mom (เปรียบเทียบงบกำไรขาดทุน)

**Query Params:** `mode` (monthly/ytd/yoy/mom, required), `fiscalYear` (required), `fiscalPeriod`, `compareYear`

### GET /api/v1/reports/fixed-asset-register
**Permission:** `report:gl:read`
**Description:** Fixed asset register with depreciation

### GET /api/v1/reports/low-stock
**Permission:** `report:gl:read`
**Description:** Low stock alert report

### GET /api/v1/reports/stock-valuation
**Permission:** `report:gl:read`
**Description:** Stock valuation (average cost)

### GET /api/v1/reports/wht-summary
**Permission:** `report:ap:read`
**Description:** WHT Certificate summary

**Query Params:** `month`, `year`

### GET /api/v1/reports/vat-return
**Permission:** `report:vat-return:read`
**Description:** Thai VAT Return — output VAT minus input VAT (รายงานภาษีมูลค่าเพิ่ม)

**Query Params:** `year`, `month`

### GET /api/v1/reports/ssc-filing
**Permission:** `report:ssc-filing:read`
**Description:** SSC Monthly Filing — per-employee social security (รายงานประกันสังคม)

**Query Params:** `year`, `month`

### GET /api/v1/reports/cash-flow
**Permission:** `report:gl:read`
**Description:** Cash Flow Statement — indirect method (งบกระแสเงินสด)

**Query Params:** `year` (required), `period`

### POST /api/v1/reports/custom
**Permission:** `report:gl:read`
**Description:** Save a custom report definition

**Request:** `{ name, data_source (gl/ar/ap/hr/inventory), dimensions[], measures[{ field, aggregation }], filters? }`

### GET /api/v1/reports/custom
**Permission:** `report:gl:read`
**Description:** List saved custom reports

### POST /api/v1/reports/custom/:id/run
**Permission:** `report:gl:read`
**Description:** Execute a saved custom report (rate limited 5/min)

---

## 45. Dashboard (แดชบอร์ด)

### GET /api/v1/dashboard/executive
**Permission:** `report:gl:read`
**Description:** Executive dashboard — revenue trend, expense breakdown, cash flow, AR aging, budget utilization

**Query Params:** `period` (mtd/qtd/ytd/custom), `startDate`, `endDate`

### GET /api/v1/dashboard/consolidated
**Permission:** `requireAuth`
**Description:** Cross-organization consolidated overview (ภาพรวมทุกองค์กร)

### GET /api/v1/dashboard/revenue-detail
**Permission:** `report:gl:read`
**Description:** Revenue drill-down — transaction-level detail

**Query Params:** `startDate`, `endDate`, `account`, `limit`

### GET /api/v1/dashboard/expense-detail
**Permission:** `report:gl:read`
**Description:** Expense drill-down — transaction-level detail

### GET /api/v1/dashboard/config
**Permission:** `dashboard:config:read`
**Description:** Role-based widget configuration

**Query Params:** `role` (cfo/accountant/sales/hr)

---

## 46. Month-End Close (ปิดงวดสิ้นเดือน)

### POST /api/v1/month-end/close
**Permission:** `gl:period:close`
**Description:** Queue month-end close job (async)

**Request:** `{ fiscalYear, fiscalPeriod }`
**Response (202):** `{ jobId, status: "queued" }`

### GET /api/v1/month-end/:jobId
**Permission:** `requireAuth`
**Description:** Check month-end close job progress

---

## 47. Import / Export (นำเข้า/ส่งออก)

### POST /api/v1/import
**Permission:** `data:import`
**Description:** Upload CSV/XLSX and queue import job (multipart)

**Request:** multipart — `file` + `importType` (journal_entries/chart_of_accounts/contacts)
**Response (202):** `{ jobId, message }`

### GET /api/v1/import/:jobId
**Permission:** `data:import`
**Description:** Check import job progress

### POST /api/v1/import/preview
**Permission:** `data:import`
**Description:** Preview first 5 rows with column mapping before importing

### GET /api/v1/export/:type
**Permission:** `data:export`
**Description:** Download data as CSV or Excel

**Path Params:** `type` (journal_entries/invoices/payments/accounts)
**Query Params:** `format` (csv/xlsx), `buddhistEra` (true/false), `fiscalYear`, `status`

---

## 48. Notifications (การแจ้งเตือน)

### GET /api/v1/notifications/settings
**Permission:** `requireAuth`
**Description:** Get notification preferences

### PUT /api/v1/notifications/settings
**Permission:** `requireAuth`
**Description:** Update notification preferences

**Request:** `{ emailEnabled?, lineEnabled?, lineNotifyToken?, eventHitlCreated?, eventApprovalResult?, eventSystemAlert? }`

### GET /api/v1/notifications
**Permission:** `requireAuth`
**Description:** Notification history

**Query Params:** `limit`, `offset`, `status` (pending/sent/failed)

---

## 49. Webhooks

### POST /api/v1/webhooks
**Permission:** `requireAuth`

**Request:** `{ url (URI), events (string[]), secret (16-256 chars) }`

### GET /api/v1/webhooks
**Permission:** `requireAuth`

### DELETE /api/v1/webhooks/:id
**Permission:** `requireAuth`
**Response:** 204

---

## 50. Roles (RBAC)

### POST /api/v1/roles
**Permission:** `role:assign`
**Description:** Create custom role with permissions

**Request:** `{ name, permissions[] }`

### GET /api/v1/roles
**Permission:** `role:read`
**Description:** List all roles with permissions

### PUT /api/v1/roles/:id
**Permission:** `role:assign`
**Description:** Update role permissions (replaces all)

**Request:** `{ name?, permissions[] }`

### DELETE /api/v1/roles/:id
**Permission:** `role:assign`
**Description:** Delete custom role — default roles cannot be deleted, roles with users cannot be deleted
**Response:** 204

---

## 51. Audit Trail (บันทึกการตรวจสอบ)

### GET /api/v1/audit-logs
**Permission:** `role:read`
**Description:** Query audit trail with filters

**Query Params:** `resourceType`, `resourceId`, `userId`, `startDate`, `endDate`, `limit` (max 500), `offset`

**Response (200):**
```json
{
  "items": [{
    "id": "uuid",
    "userId": "uuid",
    "tenantId": "uuid",
    "action": "post",
    "resourceType": "journal_entry",
    "resourceId": "uuid",
    "changes": { "before": {}, "after": {} },
    "requestId": "uuid",
    "timestamp": "2026-01-01T00:00:00.000Z"
  }],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

---

## 52. PDPA Compliance (PDPA)

### POST /api/v1/pdpa/access-request
**Permission:** `pdpa:manage`
**Description:** PDPA Data Access Request — export all PII for a person (คำขอเข้าถึงข้อมูล)

**Request:** `{ subjectType (employee/contact), subjectId }`

### POST /api/v1/pdpa/erasure-request
**Permission:** `pdpa:manage`
**Description:** PDPA Erasure Request — anonymize PII across all tables (คำขอลบข้อมูล)

**Request:** `{ subjectType (employee/contact), subjectId }`

### GET /api/v1/pdpa/requests
**Permission:** `pdpa:manage`
**Description:** List all PDPA data subject requests

**Query Params:** `limit`, `offset`, `status` (pending/processing/completed/rejected)

---

## 53. Firm Management (สำนักงานบัญชี)

### POST /api/v1/firm/clients
**Permission:** `requireAuth`
**Description:** Assign client organization to firm

**Request:** `{ clientTenantId, label? }`

### GET /api/v1/firm/clients
**Permission:** `requireAuth`
**Description:** List firm's client organizations

### DELETE /api/v1/firm/clients/:id
**Permission:** `requireAuth`
**Description:** Unassign client (soft-delete)
**Response:** 204

---

## 54. AI Agents (AI อัจฉริยะ)

### POST /api/v1/ai/anomaly-scan
**Permission:** `report:gl:read`
**Description:** Run anomaly detection on journal entries for a period (rate limited 5/min) (ตรวจจับความผิดปกติ)

**Query Params:** `period` (YYYY-MM, default: current month)

### GET /api/v1/ai/cash-forecast
**Permission:** `report:gl:read`
**Description:** Cash flow forecast based on AR/AP aging and bank balances (พยากรณ์กระแสเงินสด)

**Query Params:** `days` (1-365, default: 30)

### POST /api/v1/ai/categorize
**Permission:** `ai:categorize:execute`
**Description:** Smart categorization of bank transaction using tenant rules (จัดหมวดหมู่อัตโนมัติ)

**Request:** `{ description, amount }`

### POST /api/v1/ai/bank-reconcile/:bankAccountId
**Permission:** `fi:bank:reconcile`
**Description:** Auto-reconcile bank transactions against journal entries (กระทบยอด AI)

### POST /api/v1/ai/parse-document
**Permission:** `ai:parse:execute`
**Description:** Parse document (invoice/receipt) using NLP — multipart upload (rate limited 5/min, max 10MB) (อ่านเอกสาร AI)

**Accepts:** text/plain, text/csv, application/pdf, image/jpeg, image/png

### GET /api/v1/ai/predictions
**Permission:** `report:gl:read`
**Description:** Predictive analytics — revenue or expense forecast (พยากรณ์รายได้/ค่าใช้จ่าย)

**Query Params:** `type` (revenue/expense, default: revenue), `months` (1-24, default: 6)

---

## Appendix: Permission Reference

| Module | Permission | Description |
|--------|-----------|-------------|
| GL | `gl:journal:create/read/update/delete/post/reverse` | Journal entries |
| GL | `gl:account:create/read/update/delete` | Chart of Accounts |
| GL | `gl:period:close/read` | Fiscal periods/years |
| AR | `ar:invoice:create/read/update/delete/send/void` | Invoices |
| AR | `ar:quotation:create/read/update/send/approve/convert` | Quotations |
| AR | `ar:so:create/read/update/confirm` | Sales Orders |
| AR | `ar:do:create/read/deliver` | Delivery Notes |
| AR | `ar:receipt:create/read/void` | Receipts |
| AR | `ar:cn:create/read/issue/void` | Credit Notes |
| AR | `ar:payment:create/read/update` | AR Payments |
| AR | `ar:customer:create/read/update/delete` | Customers |
| AP | `ap:bill:create/read/update/delete/approve` | Bills |
| AP | `ap:payment:create/read/update` | AP Payments |
| AP | `ap:vendor:create/read/update/delete` | Vendors |
| AP | `ap:po:create/read/update/send/receive/convert` | Purchase Orders |
| MM | `mm:pr:create/read/update/approve` | Purchase Requisitions |
| MM | `mm:rfq:create/read` | RFQs |
| FI | `fi:asset:create/read/update/depreciate/dispose` | Fixed Assets |
| FI | `fi:bank:create/read/import/reconcile` | Bank Accounts |
| FI | `fi:wht:create/read/issue/void/file` | WHT Certificates |
| FI | `fi:currency:create/read/update` | Currencies |
| FI | `fi:etax:read` | e-Tax Invoice |
| CO | `co:cost-center:create/read/update` | Cost Centers |
| CO | `co:profit-center:create/read/update` | Profit Centers |
| CO | `co:budget:override` | Budget Override |
| INV | `inventory:product:create/read/update` | Products |
| INV | `inventory:warehouse:create/read/update` | Warehouses |
| INV | `inventory:movement:create/read` | Stock Movements |
| INV | `inventory:level:read` | Stock Levels |
| INV | `inventory:valuation:read` | Stock Valuation |
| INV | `inventory:count:create/read/post` | Stock Counts |
| CRM | `crm:contact:create/read/update/delete` | Contacts |
| HR | `hr:department:create/read/update` | Departments |
| HR | `hr:employee:create/read/update/resign/anonymize` | Employees |
| HR | `hr:position:create/read/update` | Positions |
| HR | `hr:payroll:create/read/calculate/approve/pay` | Payroll |
| HR | `hr:leave:type:create/read` | Leave Types |
| HR | `hr:leave:request:create/read/approve/reject` | Leave Requests |
| HR | `hr:attendance:create/read` | Attendance |
| RPT | `report:gl/ar/ap:read` | Reports |
| RPT | `report:trial-balance/balance-sheet/income-statement:read` | Financial Reports |
| RPT | `report:pnl-comparison:read` | P&L Comparison |
| RPT | `report:vat-return:read` | VAT Return |
| RPT | `report:ssc-filing:read` | SSC Filing |
| RPT | `report:custom:create/read/run` | Custom Reports |
| DSH | `dashboard:config:read` | Dashboard Config |
| DATA | `data:import`, `data:export` | Import/Export |
| USER | `user:invite/read/update/deactivate` | User Management |
| ROLE | `role:assign/read/create/update/delete` | Role Management |
| HITL | `hitl:queue:read`, `hitl:approve/reject` | AI Approval Queue |
| PDPA | `pdpa:manage` | PDPA Compliance |
| PRICING | `pricing:read/manage` | Price Lists |
| DUNNING | `dunning:manage` | Dunning |
| APPROVAL | `approval:workflow:create/read`, `approval:action` | Approval Chains |
| COMPANY | `company:create/read/update` | Multi-Company |
| WEBHOOK | `webhook:create/read/delete` | Webhooks |
| AI | `ai:scan/forecast/categorize/reconcile/parse/predict` | AI Agents |
| AI | `ai:categorize:execute`, `ai:parse:execute` | AI Execute |
