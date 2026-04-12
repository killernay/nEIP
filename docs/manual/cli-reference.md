# nEIP CLI Reference

> คู่มืออ้างอิง CLI ฉบับสมบูรณ์ — Complete CLI Reference
> Version: 0.9.0 | Total Commands: 180+

## Global Flags (ใช้ได้กับทุกคำสั่ง)

| Flag | Description | Default |
|------|-------------|---------|
| `--format <table\|json>` | รูปแบบผลลัพธ์ — Output format | `table` |
| `--dry-run` | ดูตัวอย่างก่อนบันทึก — Preview mutation without API call | `false` |
| `--explain` | แสดงรายการ debit/credit ก่อนทำรายการ — Show double-entry breakdown | `false` |
| `--non-interactive` | ปิด interactive prompts สำหรับ CI/scripts — Disable prompts | `false` |
| `-v, --version` | แสดงเวอร์ชัน CLI — Print CLI version | — |
| `--help` | แสดงคำแนะนำการใช้งาน — Show help | — |

---

## 1. Authentication & System

### neip auth login
เข้าสู่ระบบ — Authenticate with the nEIP API and store credentials locally.

**Usage:** `neip auth login`

Prompts interactively for email and password. Stores `accessToken`, `refreshToken`, `tokenExpiresAt`, `userId`, `tenantId` in local config.

```
$ neip auth login
Email: user@example.com
Password: ********
✔ Logged in as user@example.com (org: บริษัท ทดสอบ จำกัด)
```

### neip auth logout
ออกจากระบบ — Clear stored credentials.

**Usage:** `neip auth logout`

Removes `accessToken`, `refreshToken`, `tokenExpiresAt`, `userId`, `tenantId` from local config.

```
$ neip auth logout
✔ Logged out.
```

### neip whoami
แสดงข้อมูลผู้ใช้ปัจจุบัน — Show current user, organisation, and API URL.

**Usage:** `neip whoami`

```
$ neip whoami
✔ { user: "user@example.com", tenantId: "t_abc", apiUrl: "http://localhost:5400" }
```

---

## 2. Configuration

### neip config set \<key\> \<value\>
ตั้งค่า configuration — Set a configuration value.

**Usage:** `neip config set <key> <value>`

Auth-managed keys (`accessToken`, `refreshToken`, `tokenExpiresAt`, `userId`, `tenantId`) are protected and cannot be set directly.

```
$ neip config set llm-api-key sk-xxx
✔ Set "llm-api-key".
```

### neip config get \<key\>
ดูค่า configuration — Get a single configuration value.

**Usage:** `neip config get <key>`

```
$ neip config get apiUrl
✔ apiUrl = http://localhost:5400
```

### neip config list
แสดง configuration ทั้งหมด — List all config values (sensitive values masked).

**Usage:** `neip config list`

```
$ neip config list
✔ { apiUrl: "http://localhost:5400", accessToken: "***", ... }
```

### neip config unset \<key\>
ลบ configuration key — Remove a configuration key.

**Usage:** `neip config unset <key>`

```
$ neip config unset llm-api-key
✔ Unset "llm-api-key".
```

---

## 3. Organisation Management

### neip org create \<name\>
สร้างองค์กรใหม่ — Create a new organisation.

**Usage:** `neip org create <name> [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--business-type <type>` | ประเภทธุรกิจ: company, sme, individual, nonprofit, government | No | — |

```
$ neip org create "บริษัท ทดสอบ จำกัด" --business-type sme
✔ Organisation created (id: org_abc123)
```

### neip org list
แสดงองค์กรปัจจุบัน — Show your current organisation.

**Usage:** `neip org list`

```
$ neip org list
✔ { id: "org_abc", name: "บริษัท ทดสอบ จำกัด", role: "owner" }
```

### neip org switch \<id\>
เปลี่ยนองค์กร — Set the active organisation by ID.

**Usage:** `neip org switch <id>`

```
$ neip org switch org_abc123
✔ Switched to organisation org_abc123.
```

---

## 4. General Ledger (GL)

### neip gl accounts list
แสดงผังบัญชี — List chart of accounts with pagination and filters.

**Usage:** `neip gl accounts list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--limit <number>` | จำนวนสูงสุด — Max entries | No | `20` |
| `--offset <number>` | ข้าม N รายการ — Skip N entries | No | `0` |
| `--type <type>` | กรองตามประเภท — Filter by account type | No | — |
| `--search <query>` | ค้นหาตามชื่อหรือรหัส — Search by name or code | No | — |

```
$ neip gl accounts list --type asset --limit 10
$ neip gl accounts list --search "เงินสด" --format json
```

### neip gl accounts create
สร้างบัญชีใหม่ — Create a new account (interactive).

**Usage:** `neip gl accounts create`

Prompts for: code, name, type (asset/liability/equity/revenue/expense), sub-type, parent account ID.

```
$ neip gl accounts create
Code: 1100
Name: เงินสดในมือ
Type: asset
✔ Account 1100 created.
```

### neip gl journal create
สร้างรายการบัญชี — Create a new journal entry interactively.

**Usage:** `neip gl journal create [--dry-run] [--explain]`

Supports global mutation flags `--dry-run` and `--explain`. Prompts for description, fiscal year, fiscal period, and line items (account ID, debit/credit in THB). Amounts entered in THB are converted to satang (×100) for the API.

```
$ neip gl journal create --explain
Description: ค่าเช่าสำนักงาน
Fiscal year: 2026
Fiscal period: 3
Line 1 — Account ID: 5200
  Debit: 15000
  Credit: 0
Line 2 — Account ID: 1100
  Debit: 0
  Credit: 15000
✔ Journal entry JE-2026-0042 created.
```

### neip gl journal list
แสดงรายการบัญชี — List journal entries with pagination and status filter.

**Usage:** `neip gl journal list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--limit <number>` | จำนวนสูงสุด — Max entries | No | `20` |
| `--offset <number>` | ข้าม N รายการ — Skip entries | No | `0` |
| `--status <status>` | กรองตามสถานะ: draft, posted, voided | No | — |

```
$ neip gl journal list --status posted --limit 5
$ neip gl journal list --format json
```

### neip gl journal post \<id\>
ผ่านรายการบัญชี — Post a draft journal entry, making it permanent.

**Usage:** `neip gl journal post <id>`

```
$ neip gl journal post je_abc123
✔ Journal entry JE-2026-0042 posted successfully.
```

---

## 5. Accounts Receivable (AR)

### neip ar invoice create
สร้างใบแจ้งหนี้ — Create a new AR invoice (interactive).

**Usage:** `neip ar invoice create`

Prompts for customer, line items, tax, due date. Supports `--dry-run` and `--explain`.

```
$ neip ar invoice create
```

### neip ar invoice list
แสดงรายการใบแจ้งหนี้ — List AR invoices with filters.

**Usage:** `neip ar invoice list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--page <number>` | หน้า — Page number | No | `1` |
| `--page-size <number>` | จำนวนต่อหน้า — Items per page | No | `20` |
| `--status <status>` | กรองตามสถานะ: draft, sent, paid, voided | No | — |
| `--customer-id <id>` | กรองตามลูกค้า — Filter by customer | No | — |

```
$ neip ar invoice list --status sent --customer-id c_123
```

### neip ar invoice void \<id\>
ยกเลิกใบแจ้งหนี้ — Void an AR invoice.

**Usage:** `neip ar invoice void <id>`

```
$ neip ar invoice void inv_abc123
✔ Invoice INV-2026-0015 voided.
```

### neip ar payment create
บันทึกรับชำระเงิน — Record a customer payment (interactive).

**Usage:** `neip ar payment create`

Prompts for customer, invoice to apply, amount, payment method.

```
$ neip ar payment create
```

### neip ar payment list
แสดงรายการรับชำระ — List AR payments.

**Usage:** `neip ar payment list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--page <number>` | หน้า — Page number | No | `1` |
| `--page-size <number>` | จำนวนต่อหน้า — Items per page | No | `20` |
| `--customer-id <id>` | กรองตามลูกค้า — Filter by customer | No | — |
| `--status <status>` | กรองตามสถานะ | No | — |

```
$ neip ar payment list --customer-id c_123
```

### neip ar so list
แสดงใบสั่งขาย — List sales orders.

**Usage:** `neip ar so list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--page <number>` | หน้า | No | `1` |
| `--page-size <number>` | จำนวนต่อหน้า | No | `20` |
| `--status <status>` | กรองตามสถานะ: draft, confirmed, cancelled | No | — |
| `--customer-id <id>` | กรองตามลูกค้า | No | — |

```
$ neip ar so list --status confirmed
```

### neip ar so create
สร้างใบสั่งขาย — Create a sales order (interactive).

**Usage:** `neip ar so create`

```
$ neip ar so create
```

### neip ar so get \<id\>
ดูรายละเอียดใบสั่งขาย — Get sales order detail.

**Usage:** `neip ar so get <id>`

```
$ neip ar so get so_abc123
```

### neip ar so confirm \<id\>
ยืนยันใบสั่งขาย — Confirm a draft sales order.

**Usage:** `neip ar so confirm <id>`

```
$ neip ar so confirm so_abc123
✔ Sales order SO-2026-0008 confirmed.
```

### neip ar so cancel \<id\>
ยกเลิกใบสั่งขาย — Cancel a sales order.

**Usage:** `neip ar so cancel <id>`

```
$ neip ar so cancel so_abc123
✔ Sales order SO-2026-0008 cancelled.
```

### neip ar do list
แสดงใบส่งของ — List delivery notes.

**Usage:** `neip ar do list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--page <number>` | หน้า | No | `1` |
| `--page-size <number>` | จำนวนต่อหน้า | No | `20` |
| `--status <status>` | กรองตามสถานะ: draft, delivered | No | — |
| `--sales-order-id <id>` | กรองตามใบสั่งขาย | No | — |

```
$ neip ar do list --status draft
```

### neip ar do create
สร้างใบส่งของ — Create a delivery note (interactive).

**Usage:** `neip ar do create`

```
$ neip ar do create
```

### neip ar do get \<id\>
ดูรายละเอียดใบส่งของ — Get delivery note detail.

**Usage:** `neip ar do get <id>`

```
$ neip ar do get do_abc123
```

### neip ar do deliver \<id\>
บันทึกส่งของแล้ว — Mark a delivery note as delivered.

**Usage:** `neip ar do deliver <id>`

```
$ neip ar do deliver do_abc123
✔ Delivery note DO-2026-0003 marked as delivered.
```

### neip ar receipts list
แสดงใบเสร็จรับเงิน — List receipts.

**Usage:** `neip ar receipts list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--page <number>` | หน้า | No | `1` |
| `--page-size <number>` | จำนวนต่อหน้า | No | `20` |
| `--status <status>` | กรองตามสถานะ | No | — |
| `--customer-id <id>` | กรองตามลูกค้า | No | — |

```
$ neip ar receipts list --customer-id c_123
```

### neip ar receipts create
ออกใบเสร็จ — Create/issue a receipt (interactive).

**Usage:** `neip ar receipts create`

```
$ neip ar receipts create
```

### neip ar receipts get \<id\>
ดูรายละเอียดใบเสร็จ — Get receipt detail.

**Usage:** `neip ar receipts get <id>`

```
$ neip ar receipts get rcpt_abc123
```

### neip ar receipts void \<id\>
ยกเลิกใบเสร็จ — Void a receipt.

**Usage:** `neip ar receipts void <id>`

```
$ neip ar receipts void rcpt_abc123
✔ Receipt voided.
```

### neip ar cn list
แสดงใบลดหนี้ — List credit notes.

**Usage:** `neip ar cn list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--page <number>` | หน้า | No | `1` |
| `--page-size <number>` | จำนวนต่อหน้า | No | `20` |
| `--status <status>` | กรองตามสถานะ | No | — |
| `--customer-id <id>` | กรองตามลูกค้า | No | — |

```
$ neip ar cn list --status draft
```

### neip ar cn create
สร้างใบลดหนี้ — Create a credit note (interactive).

**Usage:** `neip ar cn create`

```
$ neip ar cn create
```

### neip ar cn get \<id\>
ดูรายละเอียดใบลดหนี้ — Get credit note detail.

**Usage:** `neip ar cn get <id>`

```
$ neip ar cn get cn_abc123
```

### neip ar cn issue \<id\>
ออกใบลดหนี้ — Issue a draft credit note.

**Usage:** `neip ar cn issue <id>`

```
$ neip ar cn issue cn_abc123
✔ Credit note CN-2026-0002 issued.
```

### neip ar cn void \<id\>
ยกเลิกใบลดหนี้ — Void a credit note.

**Usage:** `neip ar cn void <id>`

```
$ neip ar cn void cn_abc123
✔ Credit note voided.
```

---

## 6. Accounts Payable (AP)

### neip ap bill list
แสดงรายการบิล — List AP bills.

**Usage:** `neip ap bill list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--page <number>` | หน้า | No | `1` |
| `--page-size <number>` | จำนวนต่อหน้า | No | `20` |
| `--status <status>` | กรองตามสถานะ: draft, posted, paid, voided | No | — |
| `--vendor-id <id>` | กรองตามผู้ขาย | No | — |

```
$ neip ap bill list --status draft --vendor-id v_123
```

### neip ap bill create
สร้างบิล — Create a vendor bill (interactive).

**Usage:** `neip ap bill create`

```
$ neip ap bill create
```

### neip ap bill get \<id\>
ดูรายละเอียดบิล — Get bill detail.

**Usage:** `neip ap bill get <id>`

```
$ neip ap bill get bill_abc123
```

### neip ap bill post \<id\>
ผ่านบิล — Post a draft bill to make it permanent.

**Usage:** `neip ap bill post <id>`

```
$ neip ap bill post bill_abc123
✔ Bill BILL-2026-0010 posted.
```

### neip ap bill void \<id\>
ยกเลิกบิล — Void a bill.

**Usage:** `neip ap bill void <id>`

```
$ neip ap bill void bill_abc123
✔ Bill voided.
```

### neip ap payment list
แสดงรายการจ่ายเงิน — List AP payments.

**Usage:** `neip ap payment list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--page <number>` | หน้า | No | `1` |
| `--page-size <number>` | จำนวนต่อหน้า | No | `20` |
| `--vendor-id <id>` | กรองตามผู้ขาย | No | — |
| `--status <status>` | กรองตามสถานะ | No | — |

```
$ neip ap payment list --vendor-id v_123
```

### neip ap payment create
บันทึกจ่ายเงิน — Record a vendor payment (interactive).

**Usage:** `neip ap payment create`

```
$ neip ap payment create
```

### neip ap po list
แสดงใบสั่งซื้อ — List purchase orders.

**Usage:** `neip ap po list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--page <number>` | หน้า | No | `1` |
| `--page-size <number>` | จำนวนต่อหน้า | No | `20` |
| `--status <status>` | กรองตามสถานะ: draft, sent, received, billed, cancelled | No | — |
| `--vendor-id <id>` | กรองตามผู้ขาย | No | — |

```
$ neip ap po list --status sent
```

### neip ap po create
สร้างใบสั่งซื้อ — Create a purchase order (interactive).

**Usage:** `neip ap po create`

```
$ neip ap po create
```

### neip ap po get \<id\>
ดูรายละเอียดใบสั่งซื้อ — Get PO detail.

**Usage:** `neip ap po get <id>`

```
$ neip ap po get po_abc123
```

### neip ap po send \<id\>
ส่งใบสั่งซื้อให้ผู้ขาย — Send PO to vendor.

**Usage:** `neip ap po send <id>`

```
$ neip ap po send po_abc123
✔ PO sent to vendor.
```

### neip ap po receive \<id\>
บันทึกรับสินค้า — Record received goods against a PO.

**Usage:** `neip ap po receive <id>`

```
$ neip ap po receive po_abc123
✔ Goods received for PO-2026-0005.
```

### neip ap po convert \<id\>
แปลงใบสั่งซื้อเป็นบิล — Convert PO to a vendor bill.

**Usage:** `neip ap po convert <id>`

```
$ neip ap po convert po_abc123
✔ PO converted to bill BILL-2026-0015.
```

### neip ap po cancel \<id\>
ยกเลิกใบสั่งซื้อ — Cancel a purchase order.

**Usage:** `neip ap po cancel <id>`

```
$ neip ap po cancel po_abc123
✔ PO cancelled.
```

---

## 7. Quotations (ใบเสนอราคา)

### neip quotations list
แสดงใบเสนอราคา — List quotations.

**Usage:** `neip quotations list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--status <status>` | กรองตามสถานะ: draft, sent, approved, rejected, converted | No | — |
| `--customer-id <id>` | กรองตามลูกค้า | No | — |
| `--limit <number>` | จำนวนสูงสุด | No | `20` |
| `--offset <number>` | ข้าม N รายการ | No | `0` |

```
$ neip quotations list --status sent
```

### neip quotations create
สร้างใบเสนอราคา — Create a quotation (interactive).

**Usage:** `neip quotations create`

```
$ neip quotations create
```

### neip quotations get \<id\>
ดูรายละเอียดใบเสนอราคา — Get quotation detail.

**Usage:** `neip quotations get <id>`

```
$ neip quotations get qt_abc123
```

### neip quotations send \<id\>
ส่งใบเสนอราคาให้ลูกค้า — Mark quotation as sent to customer.

**Usage:** `neip quotations send <id>`

```
$ neip quotations send qt_abc123
✔ Quotation QT-2026-0010 sent.
```

### neip quotations approve \<id\>
อนุมัติใบเสนอราคา — Approve a quotation.

**Usage:** `neip quotations approve <id>`

```
$ neip quotations approve qt_abc123
✔ Quotation approved.
```

### neip quotations reject \<id\>
ปฏิเสธใบเสนอราคา — Reject a quotation.

**Usage:** `neip quotations reject <id> [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--reason <text>` | เหตุผลในการปฏิเสธ — Rejection reason | No | — |

```
$ neip quotations reject qt_abc123 --reason "ราคาสูงเกินไป"
```

### neip quotations convert \<id\>
แปลงใบเสนอราคาเป็นใบแจ้งหนี้ — Convert quotation to invoice.

**Usage:** `neip quotations convert <id>`

```
$ neip quotations convert qt_abc123
✔ Converted to invoice INV-2026-0020.
```

### neip quotations duplicate \<id\>
คัดลอกใบเสนอราคา — Duplicate a quotation.

**Usage:** `neip quotations duplicate <id>`

```
$ neip quotations duplicate qt_abc123
✔ Duplicated as QT-2026-0011.
```

---

## 8. Tax & WHT (ภาษี & หัก ณ ที่จ่าย)

### neip tax list
แสดงอัตราภาษี — List tax rates.

**Usage:** `neip tax list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--limit <number>` | จำนวนสูงสุด | No | `50` |
| `--active <true\|false>` | เฉพาะที่ใช้งานอยู่ | No | — |

```
$ neip tax list --active true
```

### neip tax create
สร้างอัตราภาษี — Create a tax rate (interactive).

**Usage:** `neip tax create`

```
$ neip tax create
```

### neip tax update \<id\>
แก้ไขอัตราภาษี — Update a tax rate (interactive).

**Usage:** `neip tax update <id>`

```
$ neip tax update tax_abc123
```

### neip tax delete \<id\>
ลบอัตราภาษี — Delete a tax rate.

**Usage:** `neip tax delete <id>`

```
$ neip tax delete tax_abc123
✔ Tax rate deleted.
```

### neip wht list
แสดงใบหัก ณ ที่จ่าย — List WHT certificates.

**Usage:** `neip wht list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--status <status>` | กรองตามสถานะ: draft, issued, filed, voided | No | — |
| `--month <month>` | กรองตามเดือนภาษี (1-12) | No | — |
| `--year <year>` | กรองตามปีภาษี | No | — |

```
$ neip wht list --status draft --year 2026
```

### neip wht create
สร้างใบหัก ณ ที่จ่าย — Create a WHT certificate (interactive).

**Usage:** `neip wht create`

Prompts for: certificate type (pnd3/pnd53), payer/payee info, income type, amounts, WHT rate, tax period.

```
$ neip wht create
Type (pnd3/pnd53) [pnd53]: pnd53
Payer company name: บริษัท ทดสอบ จำกัด
...
✔ Certificate WHT-2026-0001 created.
```

### neip wht get \<id\>
ดูรายละเอียดใบหัก ณ ที่จ่าย — Get WHT certificate detail.

**Usage:** `neip wht get <id>`

```
$ neip wht get wht_abc123
```

### neip wht issue \<id\>
ออกใบรับรอง (draft → issued) — Issue a WHT certificate.

**Usage:** `neip wht issue <id>`

```
$ neip wht issue wht_abc123
✔ Certificate wht_abc123 issued.
```

### neip wht void \<id\>
ยกเลิกใบหัก ณ ที่จ่าย — Void a WHT certificate.

**Usage:** `neip wht void <id>`

```
$ neip wht void wht_abc123
✔ Certificate wht_abc123 voided.
```

### neip wht file \<id\>
ทำเครื่องหมายว่ายื่นแบบแล้ว — Mark a WHT certificate as filed.

**Usage:** `neip wht file <id>`

```
$ neip wht file wht_abc123
✔ Certificate wht_abc123 filed.
```

### neip wht summary
สรุป WHT รายเดือนสำหรับ ภ.ง.ด.3/53 — WHT summary by month.

**Usage:** `neip wht summary [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--year <year>` | ปีภาษี — Tax year | No | — |
| `--month <month>` | เดือนภาษี — Tax month | No | — |

```
$ neip wht summary --year 2026
✔ WHT Summary — Total: ฿45,000.00
```

### neip wht annual-cert
ออก 50 ทวิ — Generate annual WHT certificate (50 ทวิ) for an employee.

**Usage:** `neip wht annual-cert --employee <id> --year <year>`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--employee <employeeId>` | รหัสพนักงาน — Employee ID | **Yes** | — |
| `--year <year>` | ปีภาษี — Tax year | **Yes** | — |

```
$ neip wht annual-cert --employee emp_123 --year 2026
```

---

## 9. Financial Reports

### neip reports balance-sheet
งบดุล — Generate a balance sheet.

**Usage:** `neip reports balance-sheet [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--as-of <date>` | ณ วันที่ — As-of date (YYYY-MM-DD) | No | today |

```
$ neip reports balance-sheet --as-of 2026-03-31
```

### neip reports income-statement
งบกำไรขาดทุน — Generate an income statement.

**Usage:** `neip reports income-statement [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--start-date <date>` | วันที่เริ่มต้น | No | — |
| `--end-date <date>` | วันที่สิ้นสุด | No | — |

```
$ neip reports income-statement --start-date 2026-01-01 --end-date 2026-03-31
```

### neip reports trial-balance
งบทดลอง — Generate a trial balance.

**Usage:** `neip reports trial-balance [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--as-of <date>` | ณ วันที่ | No | today |

```
$ neip reports trial-balance --as-of 2026-03-31
```

### neip reports budget-variance
รายงานความแตกต่าง Budget vs Actual — Budget variance analysis.

**Usage:** `neip reports budget-variance [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--year <year>` | ปีงบประมาณ — Budget year | No | — |
| `--period <period>` | งวดบัญชี — Fiscal period | No | — |

```
$ neip reports budget-variance --year 2026 --period 3
```

### neip reports equity-changes
งบแสดงการเปลี่ยนแปลงส่วนของเจ้าของ — Statement of changes in equity.

**Usage:** `neip reports equity-changes [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--start-date <date>` | วันที่เริ่มต้น | No | — |
| `--end-date <date>` | วันที่สิ้นสุด | No | — |

```
$ neip reports equity-changes --start-date 2026-01-01 --end-date 2026-12-31
```

### neip reports ar-aging
รายงานอายุลูกหนี้ — Accounts receivable aging report.

**Usage:** `neip reports ar-aging [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--as-of <date>` | ณ วันที่ | No | today |

```
$ neip reports ar-aging --as-of 2026-03-31
```

### neip reports ap-aging
รายงานอายุเจ้าหนี้ — Accounts payable aging report.

**Usage:** `neip reports ap-aging [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--as-of <date>` | ณ วันที่ | No | today |

```
$ neip reports ap-aging --as-of 2026-03-31
```

### neip reports pnl
กำไรขาดทุนเปรียบเทียบ — P&L comparison report (monthly, quarterly, YoY).

**Usage:** `neip reports pnl --mode <mode> --fiscal-year <year> [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--mode <mode>` | โหมด: monthly, quarterly, yoy | **Yes** | — |
| `--fiscal-year <year>` | ปีบัญชี | **Yes** | — |
| `--period <period>` | งวดเฉพาะ | No | — |
| `--compare-year <year>` | ปีเปรียบเทียบ (for yoy mode) | No | — |

```
$ neip reports pnl --mode monthly --fiscal-year 2026
$ neip reports pnl --mode yoy --fiscal-year 2026 --compare-year 2025
```

### neip reports vat-return
แบบ ภ.พ.30 — VAT return report for filing.

**Usage:** `neip reports vat-return --year <year> --month <month>`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--year <year>` | ปีภาษี | **Yes** | — |
| `--month <month>` | เดือนภาษี (1-12) | **Yes** | — |

```
$ neip reports vat-return --year 2026 --month 3
```

### neip reports ssc-filing
แบบ สปส. — Social Security contribution filing report.

**Usage:** `neip reports ssc-filing --year <year> --month <month>`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--year <year>` | ปี | **Yes** | — |
| `--month <month>` | เดือน (1-12) | **Yes** | — |

```
$ neip reports ssc-filing --year 2026 --month 3
```

### neip reports cash-flow
งบกระแสเงินสด — Cash flow statement.

**Usage:** `neip reports cash-flow --year <year> --period <period>`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--year <year>` | ปีบัญชี | **Yes** | — |
| `--period <period>` | งวดบัญชี | **Yes** | — |

```
$ neip reports cash-flow --year 2026 --period 3
```

---

## 10. Purchase Requisitions & RFQ

### neip pr list
แสดงใบขอซื้อ — List purchase requisitions.

**Usage:** `neip pr list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--status <status>` | กรองตามสถานะ: draft, pending, approved, rejected, converted | No | — |
| `--limit <number>` | จำนวนสูงสุด | No | `20` |

```
$ neip pr list --status pending
```

### neip pr create
สร้างใบขอซื้อ — Create a purchase requisition (interactive).

**Usage:** `neip pr create`

```
$ neip pr create
```

### neip pr approve \<id\>
อนุมัติใบขอซื้อ — Approve a purchase requisition.

**Usage:** `neip pr approve <id>`

```
$ neip pr approve pr_abc123
✔ PR approved.
```

### neip pr reject \<id\>
ปฏิเสธใบขอซื้อ — Reject a purchase requisition.

**Usage:** `neip pr reject <id> [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--reason <text>` | เหตุผลในการปฏิเสธ | No | — |

```
$ neip pr reject pr_abc123 --reason "งบประมาณไม่เพียงพอ"
```

### neip pr convert \<id\>
แปลงใบขอซื้อเป็น PO — Convert PR to purchase order.

**Usage:** `neip pr convert <id>`

```
$ neip pr convert pr_abc123
✔ Converted to PO PO-2026-0012.
```

### neip rfq list
แสดง RFQ — List requests for quotation.

**Usage:** `neip rfq list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--status <status>` | กรองตามสถานะ | No | — |
| `--limit <number>` | จำนวนสูงสุด | No | `20` |

```
$ neip rfq list --status open
```

### neip rfq create
สร้าง RFQ — Create an RFQ (interactive).

**Usage:** `neip rfq create`

```
$ neip rfq create
```

### neip rfq send \<id\>
ส่ง RFQ ให้ผู้ขาย — Send RFQ to vendors.

**Usage:** `neip rfq send <id>`

```
$ neip rfq send rfq_abc123
✔ RFQ sent to vendors.
```

### neip rfq compare \<id\>
เปรียบเทียบราคา — Compare vendor responses for an RFQ.

**Usage:** `neip rfq compare <id>`

```
$ neip rfq compare rfq_abc123
```

### neip rfq select \<id\>
เลือกผู้ขาย — Select the winning vendor for an RFQ.

**Usage:** `neip rfq select <id> --vendor <vendorId>`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--vendor <vendorId>` | รหัสผู้ขายที่เลือก | **Yes** | — |

```
$ neip rfq select rfq_abc123 --vendor v_456
✔ Vendor v_456 selected for RFQ.
```

---

## 11. Inventory & Products

### neip products list
แสดงสินค้า — List products.

**Usage:** `neip products list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--limit <number>` | จำนวนสูงสุด | No | `50` |
| `--offset <number>` | ข้าม N รายการ | No | `0` |
| `--search <query>` | ค้นหาตามชื่อ | No | — |

```
$ neip products list --search "laptop"
```

### neip products create
สร้างสินค้า — Create a product (interactive).

**Usage:** `neip products create`

```
$ neip products create
```

### neip products update \<id\>
แก้ไขสินค้า — Update a product (interactive).

**Usage:** `neip products update <id>`

```
$ neip products update prod_abc123
```

### neip inventory levels
ดูสต็อกปัจจุบัน — Show current stock levels for all products.

**Usage:** `neip inventory levels`

```
$ neip inventory levels
```

### neip inventory movement
แสดงความเคลื่อนไหวสต็อก — Show stock movement history.

**Usage:** `neip inventory movement`

```
$ neip inventory movement
```

### neip inventory valuation
มูลค่าสต็อก — Show inventory valuation.

**Usage:** `neip inventory valuation`

```
$ neip inventory valuation
```

### neip inventory low-stock
สินค้าต่ำกว่า minimum — Show products below minimum stock level.

**Usage:** `neip inventory low-stock`

```
$ neip inventory low-stock
```

### neip stock-count list
แสดงการตรวจนับสต็อก — List stock counts.

**Usage:** `neip stock-count list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--status <status>` | กรองตามสถานะ: draft, posted | No | — |
| `--limit <number>` | จำนวนสูงสุด | No | `20` |

```
$ neip stock-count list --status draft
```

### neip stock-count create
สร้างการตรวจนับ — Create a stock count (interactive).

**Usage:** `neip stock-count create`

```
$ neip stock-count create
```

### neip stock-count post \<id\>
บันทึกผลตรวจนับ — Post stock count adjustments.

**Usage:** `neip stock-count post <id>`

```
$ neip stock-count post sc_abc123
✔ Stock count posted. Adjustments applied.
```

---

## 12. Fixed Assets (สินทรัพย์ถาวร)

### neip assets list
แสดงสินทรัพย์ถาวร — List fixed assets.

**Usage:** `neip assets list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--category <category>` | กรองตามหมวดหมู่ | No | — |
| `--status <status>` | กรองตามสถานะ: active, disposed, fully_depreciated | No | — |

```
$ neip assets list --status active
```

### neip assets create
เพิ่มสินทรัพย์ — Create a fixed asset (interactive).

**Usage:** `neip assets create`

```
$ neip assets create
```

### neip assets get \<id\>
ดูรายละเอียดสินทรัพย์ — Get asset detail.

**Usage:** `neip assets get <id>`

```
$ neip assets get asset_abc123
```

### neip assets depreciate \<id\>
คำนวณค่าเสื่อมราคา — Run depreciation for an asset.

**Usage:** `neip assets depreciate <id>`

```
$ neip assets depreciate asset_abc123
✔ Depreciation calculated and recorded.
```

### neip assets dispose \<id\>
จำหน่ายสินทรัพย์ — Dispose of a fixed asset.

**Usage:** `neip assets dispose <id>`

```
$ neip assets dispose asset_abc123
✔ Asset disposed.
```

### neip assets report
รายงานสินทรัพย์ — Generate fixed assets summary report.

**Usage:** `neip assets report`

```
$ neip assets report
```

---

## 13. Banking (ธนาคาร)

### neip bank list
แสดงบัญชีธนาคาร — List bank accounts.

**Usage:** `neip bank list`

```
$ neip bank list
```

### neip bank create
สร้างบัญชีธนาคาร — Create a bank account (interactive).

**Usage:** `neip bank create`

```
$ neip bank create
```

### neip bank transactions \<id\>
แสดงรายการเดินบัญชี — List transactions for a bank account.

**Usage:** `neip bank transactions <id>`

```
$ neip bank transactions bank_abc123
```

### neip bank reconcile \<txnId\>
กระทบยอด — Reconcile a bank transaction.

**Usage:** `neip bank reconcile <txnId>`

```
$ neip bank reconcile txn_abc123
✔ Transaction reconciled.
```

### neip bank report \<id\>
รายงานธนาคาร — Generate bank account report.

**Usage:** `neip bank report <id>`

```
$ neip bank report bank_abc123
```

---

## 14. Contacts (ผู้ติดต่อ)

### neip contacts list
แสดงผู้ติดต่อ — List contacts (customers and vendors).

**Usage:** `neip contacts list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--limit <number>` | จำนวนสูงสุด | No | `50` |
| `--offset <number>` | ข้าม N รายการ | No | `0` |
| `--type <type>` | กรองตามประเภท: customer, vendor | No | — |
| `--search <query>` | ค้นหาตามชื่อ | No | — |

```
$ neip contacts list --type customer --search "สมชาย"
```

### neip contacts create
สร้างผู้ติดต่อ — Create a contact (interactive).

**Usage:** `neip contacts create`

```
$ neip contacts create
```

### neip contacts get \<id\>
ดูรายละเอียดผู้ติดต่อ — Get contact detail.

**Usage:** `neip contacts get <id>`

```
$ neip contacts get contact_abc123
```

### neip contacts update \<id\>
แก้ไขผู้ติดต่อ — Update a contact (interactive).

**Usage:** `neip contacts update <id>`

```
$ neip contacts update contact_abc123
```

### neip contacts delete \<id\>
ลบผู้ติดต่อ — Delete a contact.

**Usage:** `neip contacts delete <id>`

```
$ neip contacts delete contact_abc123
✔ Contact deleted.
```

---

## 15. Vendors (ผู้ขาย)

### neip vendors list
แสดงผู้ขาย — List vendors.

**Usage:** `neip vendors list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--limit <number>` | จำนวนสูงสุด | No | `50` |
| `--offset <number>` | ข้าม N รายการ | No | `0` |
| `--search <query>` | ค้นหาตามชื่อ | No | — |

```
$ neip vendors list --search "ABC Corp"
```

### neip vendors create
สร้างผู้ขาย — Create a vendor (interactive).

**Usage:** `neip vendors create`

```
$ neip vendors create
```

### neip vendors update \<id\>
แก้ไขผู้ขาย — Update a vendor (interactive).

**Usage:** `neip vendors update <id>`

```
$ neip vendors update vendor_abc123
```

---

## 16. HR & Payroll (ทรัพยากรบุคคล)

### neip employees list
แสดงพนักงาน — List employees.

**Usage:** `neip employees list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--status <status>` | กรองตามสถานะ: active, resigned | No | — |
| `--limit <number>` | จำนวนสูงสุด | No | `50` |
| `--search <query>` | ค้นหาตามชื่อ | No | — |

```
$ neip employees list --search "สมชาย"
```

### neip employees create
เพิ่มพนักงาน — Create an employee (interactive).

**Usage:** `neip employees create`

```
$ neip employees create
```

### neip employees get \<id\>
ดูรายละเอียดพนักงาน — Get employee detail.

**Usage:** `neip employees get <id>`

```
$ neip employees get emp_abc123
```

### neip employees update \<id\>
แก้ไขข้อมูลพนักงาน — Update an employee (interactive).

**Usage:** `neip employees update <id>`

```
$ neip employees update emp_abc123
```

### neip employees resign \<id\>
บันทึกการลาออก — Process employee resignation.

**Usage:** `neip employees resign <id> [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--date <date>` | วันที่มีผล — Effective date (YYYY-MM-DD) | No | today |

```
$ neip employees resign emp_abc123 --date 2026-04-30
```

### neip departments list
แสดงแผนก — List departments.

**Usage:** `neip departments list`

```
$ neip departments list
```

### neip departments create
สร้างแผนก — Create a department (interactive).

**Usage:** `neip departments create`

```
$ neip departments create
```

### neip departments update \<id\>
แก้ไขแผนก — Update a department (interactive).

**Usage:** `neip departments update <id>`

```
$ neip departments update dept_abc123
```

### neip payroll list
แสดง payroll runs — List payroll runs.

**Usage:** `neip payroll list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--status <status>` | กรองตามสถานะ: draft, calculated, approved, paid | No | — |
| `--limit <number>` | จำนวนสูงสุด | No | `20` |

```
$ neip payroll list --status draft
```

### neip payroll create
สร้าง payroll run — Create a payroll run (interactive).

**Usage:** `neip payroll create`

```
$ neip payroll create
```

### neip payroll calculate \<id\>
คำนวณเงินเดือน — Calculate payroll for a run.

**Usage:** `neip payroll calculate <id>`

```
$ neip payroll calculate payroll_abc123
✔ Payroll calculated.
```

### neip payroll approve \<id\>
อนุมัติ payroll — Approve a payroll run.

**Usage:** `neip payroll approve <id>`

```
$ neip payroll approve payroll_abc123
✔ Payroll approved.
```

### neip payroll pay \<id\>
จ่ายเงินเดือน — Mark payroll as paid.

**Usage:** `neip payroll pay <id>`

```
$ neip payroll pay payroll_abc123
✔ Payroll marked as paid.
```

### neip leave types
แสดงประเภทการลา — List leave types.

**Usage:** `neip leave types`

```
$ neip leave types
```

### neip leave request
ยื่นคำขอลา — Submit a leave request (interactive).

**Usage:** `neip leave request`

```
$ neip leave request
```

### neip leave list
แสดงคำขอลา — List leave requests.

**Usage:** `neip leave list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--status <status>` | กรองตามสถานะ: pending, approved, rejected | No | — |
| `--limit <number>` | จำนวนสูงสุด | No | `20` |

```
$ neip leave list --status pending
```

### neip leave approve \<id\>
อนุมัติคำขอลา — Approve a leave request.

**Usage:** `neip leave approve <id>`

```
$ neip leave approve leave_abc123
✔ Leave approved.
```

### neip leave reject \<id\>
ปฏิเสธคำขอลา — Reject a leave request.

**Usage:** `neip leave reject <id> [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--reason <text>` | เหตุผล | No | — |

```
$ neip leave reject leave_abc123 --reason "ช่วงที่มีงานเร่ง"
```

### neip leave balance \<employeeId\>
ดูวันลาคงเหลือ — Check leave balance for an employee.

**Usage:** `neip leave balance <employeeId>`

```
$ neip leave balance emp_abc123
```

### neip attendance clock-in
ลงเวลาเข้า — Clock in.

**Usage:** `neip attendance clock-in [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--employee <id>` | รหัสพนักงาน (admin use) | No | current user |
| `--note <text>` | หมายเหตุ | No | — |

```
$ neip attendance clock-in --note "WFH"
```

### neip attendance clock-out
ลงเวลาออก — Clock out.

**Usage:** `neip attendance clock-out [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--employee <id>` | รหัสพนักงาน (admin use) | No | current user |
| `--note <text>` | หมายเหตุ | No | — |

```
$ neip attendance clock-out
```

### neip attendance summary
สรุปเวลาเข้าออก — Attendance summary.

**Usage:** `neip attendance summary [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--employee <id>` | รหัสพนักงาน | No | current user |
| `--month <month>` | เดือน (1-12) | No | current |
| `--year <year>` | ปี | No | current |

```
$ neip attendance summary --month 3 --year 2026
```

### neip positions list
แสดงตำแหน่ง — List positions.

**Usage:** `neip positions list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--department <id>` | กรองตามแผนก | No | — |
| `--limit <number>` | จำนวนสูงสุด | No | `50` |

```
$ neip positions list --department dept_abc123
```

### neip positions create
สร้างตำแหน่ง — Create a position (interactive).

**Usage:** `neip positions create`

```
$ neip positions create
```

### neip positions org-tree
แสดงผังองค์กร — Display organisation chart.

**Usage:** `neip positions org-tree [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--department <id>` | กรองตามแผนก | No | — |

```
$ neip positions org-tree
```

---

## 17. Cost Centers & Profit Centers

### neip cost-centers list
แสดงศูนย์ต้นทุน — List cost centers.

**Usage:** `neip cost-centers list`

```
$ neip cost-centers list
```

### neip cost-centers create
สร้างศูนย์ต้นทุน — Create a cost center (interactive).

**Usage:** `neip cost-centers create`

```
$ neip cost-centers create
```

### neip cost-centers update \<id\>
แก้ไขศูนย์ต้นทุน — Update a cost center (interactive).

**Usage:** `neip cost-centers update <id>`

```
$ neip cost-centers update cc_abc123
```

### neip profit-centers list
แสดงศูนย์กำไร — List profit centers.

**Usage:** `neip profit-centers list`

```
$ neip profit-centers list
```

### neip profit-centers create
สร้างศูนย์กำไร — Create a profit center (interactive).

**Usage:** `neip profit-centers create`

```
$ neip profit-centers create
```

### neip profit-centers update \<id\>
แก้ไขศูนย์กำไร — Update a profit center (interactive).

**Usage:** `neip profit-centers update <id>`

```
$ neip profit-centers update pc_abc123
```

---

## 18. Fiscal Periods & Budgets

### neip fiscal years
แสดงปีบัญชี — List fiscal years.

**Usage:** `neip fiscal years [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--limit <number>` | จำนวนสูงสุด | No | `10` |

```
$ neip fiscal years
```

### neip fiscal years create
สร้างปีบัญชี — Create a fiscal year (interactive).

**Usage:** `neip fiscal years create`

```
$ neip fiscal years create
```

### neip fiscal period close \<id\>
ปิดงวดบัญชี — Close a fiscal period.

**Usage:** `neip fiscal period close <id>`

```
$ neip fiscal period close period_abc123
✔ Period closed.
```

### neip fiscal period reopen \<id\>
เปิดงวดบัญชีใหม่ — Reopen a closed fiscal period.

**Usage:** `neip fiscal period reopen <id>`

```
$ neip fiscal period reopen period_abc123
✔ Period reopened.
```

### neip fiscal close-year \<yearId\>
ปิดปีบัญชี — Close an entire fiscal year.

**Usage:** `neip fiscal close-year <yearId>`

```
$ neip fiscal close-year fy_2026
✔ Fiscal year 2026 closed.
```

### neip fiscal reopen-year \<yearId\>
เปิดปีบัญชีใหม่ — Reopen a closed fiscal year.

**Usage:** `neip fiscal reopen-year <yearId>`

```
$ neip fiscal reopen-year fy_2026
✔ Fiscal year 2026 reopened.
```

### neip budgets list
แสดงงบประมาณ — List budgets.

**Usage:** `neip budgets list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--limit <number>` | จำนวนสูงสุด | No | `20` |
| `--year <year>` | กรองตามปี | No | — |
| `--status <status>` | กรองตามสถานะ: draft, approved | No | — |

```
$ neip budgets list --year 2026
```

### neip budgets create
สร้างงบประมาณ — Create a budget (interactive).

**Usage:** `neip budgets create`

```
$ neip budgets create
```

### neip budgets update \<id\>
แก้ไขงบประมาณ — Update a budget (interactive).

**Usage:** `neip budgets update <id>`

```
$ neip budgets update budget_abc123
```

---

## 19. Recurring Journal Entries

### neip recurring-je list
แสดงรายการบัญชีประจำ — List recurring journal entries.

**Usage:** `neip recurring-je list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--status <status>` | กรองตามสถานะ: active, paused | No | — |
| `--limit <number>` | จำนวนสูงสุด | No | `20` |

```
$ neip recurring-je list --status active
```

### neip recurring-je create
สร้างรายการบัญชีประจำ — Create a recurring JE (interactive).

**Usage:** `neip recurring-je create`

```
$ neip recurring-je create
```

### neip recurring-je run \<id\>
รันรายการบัญชีประจำ — Execute a recurring JE now.

**Usage:** `neip recurring-je run <id>`

```
$ neip recurring-je run rje_abc123
✔ Recurring JE executed. Created JE-2026-0050.
```

---

## 20. Pricing & Payment Terms

### neip pricing list
แสดงกฎราคา — List pricing rules.

**Usage:** `neip pricing list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--limit <number>` | จำนวนสูงสุด | No | `20` |

```
$ neip pricing list
```

### neip pricing create
สร้างกฎราคา — Create a pricing rule (interactive).

**Usage:** `neip pricing create`

```
$ neip pricing create
```

### neip pricing resolve
คำนวณราคา — Resolve the effective price for a product/customer/quantity.

**Usage:** `neip pricing resolve --product <id> [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--product <id>` | รหัสสินค้า | **Yes** | — |
| `--customer <id>` | รหัสลูกค้า | No | — |
| `--quantity <number>` | จำนวน | No | — |
| `--date <date>` | วันที่ | No | today |

```
$ neip pricing resolve --product prod_123 --customer c_456 --quantity 100
```

### neip payment-terms list
แสดงเงื่อนไขชำระเงิน — List payment terms.

**Usage:** `neip payment-terms list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--limit <number>` | จำนวนสูงสุด | No | `20` |

```
$ neip payment-terms list
```

### neip payment-terms create
สร้างเงื่อนไขชำระเงิน — Create payment terms (interactive).

**Usage:** `neip payment-terms create`

```
$ neip payment-terms create
```

---

## 21. Dunning & Credit

### neip dunning run
รันการทวงถาม — Execute dunning process.

**Usage:** `neip dunning run [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--as-of <date>` | ณ วันที่ | No | today |

```
$ neip dunning run --as-of 2026-03-31
```

### neip dunning list
แสดงรายการทวงถาม — List dunning records.

**Usage:** `neip dunning list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--level <number>` | ระดับการทวงถาม | No | — |
| `--status <status>` | กรองตามสถานะ | No | — |
| `--limit <number>` | จำนวนสูงสุด | No | `20` |

```
$ neip dunning list --level 2
```

### neip credit check \<contactId\>
ตรวจสอบเครดิต — Check credit status for a contact.

**Usage:** `neip credit check <contactId>`

```
$ neip credit check contact_abc123
```

---

## 22. Currency & Multi-company

### neip currency list
แสดงสกุลเงิน — List currencies.

**Usage:** `neip currency list`

```
$ neip currency list
```

### neip currency create
สร้างสกุลเงิน — Create a currency (interactive).

**Usage:** `neip currency create`

```
$ neip currency create
```

### neip currency rate
ดูอัตราแลกเปลี่ยน — Get exchange rate.

**Usage:** `neip currency rate --from <code> --to <code> [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--from <code>` | สกุลเงินต้นทาง (e.g. USD) | **Yes** | — |
| `--to <code>` | สกุลเงินปลายทาง (e.g. THB) | **Yes** | — |
| `--date <date>` | วันที่ | No | today |

```
$ neip currency rate --from USD --to THB
```

### neip currency convert
แปลงสกุลเงิน — Convert between currencies.

**Usage:** `neip currency convert --from <code> --to <code> --amount <number> [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--from <code>` | สกุลเงินต้นทาง | **Yes** | — |
| `--to <code>` | สกุลเงินปลายทาง | **Yes** | — |
| `--amount <number>` | จำนวนเงิน | **Yes** | — |
| `--date <date>` | วันที่ | No | today |

```
$ neip currency convert --from USD --to THB --amount 1000
```

### neip company list
แสดงบริษัท — List companies in multi-company setup.

**Usage:** `neip company list`

```
$ neip company list
```

### neip company create
สร้างบริษัท — Create a company (interactive).

**Usage:** `neip company create`

```
$ neip company create
```

### neip company switch \<id\>
เปลี่ยนบริษัท — Switch active company.

**Usage:** `neip company switch <id>`

```
$ neip company switch company_abc123
✔ Switched to company_abc123.
```

---

## 23. Batch Tracking

### neip batch list
แสดง Lot/Batch — List batches.

**Usage:** `neip batch list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--product <id>` | กรองตามสินค้า | No | — |
| `--status <status>` | กรองตามสถานะ | No | — |
| `--limit <number>` | จำนวนสูงสุด | No | `20` |

```
$ neip batch list --product prod_abc123
```

### neip batch create
สร้าง Batch — Create a batch (interactive).

**Usage:** `neip batch create`

```
$ neip batch create
```

### neip batch trace \<id\>
ติดตาม Batch — Trace batch history and movements.

**Usage:** `neip batch trace <id>`

```
$ neip batch trace batch_abc123
```

---

## 24. Approvals & Workflows

### neip approval list
แสดงรายการอนุมัติ — List approval requests.

**Usage:** `neip approval list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--status <status>` | กรองตามสถานะ: pending, approved, rejected | No | — |
| `--type <type>` | กรองตามประเภท | No | — |
| `--limit <number>` | จำนวนสูงสุด | No | `20` |

```
$ neip approval list --status pending
```

### neip approval approve \<id\>
อนุมัติ — Approve a request.

**Usage:** `neip approval approve <id> [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--comment <text>` | ความเห็น | No | — |

```
$ neip approval approve appr_abc123 --comment "OK"
```

### neip approval reject \<id\>
ปฏิเสธ — Reject a request.

**Usage:** `neip approval reject <id> [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--reason <text>` | เหตุผล | No | — |

```
$ neip approval reject appr_abc123 --reason "เกินงบ"
```

### neip approval delegate \<id\>
มอบหมาย — Delegate an approval to another user.

**Usage:** `neip approval delegate <id> --to <userId> [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--to <userId>` | ผู้รับมอบ | **Yes** | — |
| `--comment <text>` | ความเห็น | No | — |

```
$ neip approval delegate appr_abc123 --to user_456 --comment "กรุณาพิจารณาแทน"
```

---

## 25. Settings & Administration

### neip settings get
ดูการตั้งค่า — Get organisation settings.

**Usage:** `neip settings get`

```
$ neip settings get
```

### neip settings update
แก้ไขการตั้งค่า — Update organisation settings (interactive).

**Usage:** `neip settings update`

```
$ neip settings update
```

### neip settings ai
ดูการตั้งค่า AI — Get AI feature settings.

**Usage:** `neip settings ai`

```
$ neip settings ai
```

### neip notifications list
แสดงการแจ้งเตือน — List notifications.

**Usage:** `neip notifications list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--page <number>` | หน้า | No | `1` |
| `--page-size <number>` | จำนวนต่อหน้า | No | `20` |
| `--unread` | เฉพาะที่ยังไม่อ่าน — Only unread | No | `false` |

```
$ neip notifications list --unread
```

### neip notifications settings
ดูการตั้งค่าการแจ้งเตือน — Get notification settings.

**Usage:** `neip notifications settings`

```
$ neip notifications settings
```

### neip notifications settings update
แก้ไขการตั้งค่าการแจ้งเตือน — Update notification settings (interactive).

**Usage:** `neip notifications settings update`

```
$ neip notifications settings update
```

### neip roles list
แสดง roles — List roles.

**Usage:** `neip roles list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--limit <number>` | จำนวนสูงสุด | No | `50` |

```
$ neip roles list
```

### neip roles create
สร้าง role — Create a role (interactive).

**Usage:** `neip roles create`

```
$ neip roles create
```

### neip roles update \<id\>
แก้ไข role — Update a role (interactive).

**Usage:** `neip roles update <id>`

```
$ neip roles update role_abc123
```

### neip roles delete \<id\>
ลบ role — Delete a role.

**Usage:** `neip roles delete <id>`

```
$ neip roles delete role_abc123
✔ Role deleted.
```

### neip users invite \<email\>
เชิญผู้ใช้ — Invite a user to the organisation.

**Usage:** `neip users invite <email> --role <roleId> [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--role <roleId>` | รหัส role | **Yes** | — |
| `--message <text>` | ข้อความเชิญ | No | — |

```
$ neip users invite user@example.com --role role_accountant --message "ยินดีต้อนรับ"
```

### neip webhooks list
แสดง webhooks — List webhooks.

**Usage:** `neip webhooks list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--limit <number>` | จำนวนสูงสุด | No | `20` |

```
$ neip webhooks list
```

### neip webhooks create
สร้าง webhook — Create a webhook (interactive).

**Usage:** `neip webhooks create`

```
$ neip webhooks create
```

### neip webhooks delete \<id\>
ลบ webhook — Delete a webhook.

**Usage:** `neip webhooks delete <id>`

```
$ neip webhooks delete wh_abc123
✔ Webhook deleted.
```

### neip audit list
แสดง audit log — List audit log entries.

**Usage:** `neip audit list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--limit <number>` | จำนวนสูงสุด | No | `50` |
| `--offset <number>` | ข้าม N รายการ | No | `0` |

```
$ neip audit list --limit 10
```

### neip audit search
ค้นหา audit log — Search audit log with filters.

**Usage:** `neip audit search [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--resource <type>` | ประเภท resource | No | — |
| `--id <id>` | รหัส resource | No | — |
| `--user <userId>` | ผู้ดำเนินการ | No | — |
| `--start <date>` | วันที่เริ่มต้น | No | — |
| `--end <date>` | วันที่สิ้นสุด | No | — |
| `--limit <number>` | จำนวนสูงสุด | No | `50` |

```
$ neip audit search --resource invoice --user user_123 --start 2026-03-01
```

---

## 26. Dashboard & Month-End

### neip dashboard
แดชบอร์ดภาพรวม — Executive dashboard showing key financial metrics.

**Usage:** `neip dashboard`

```
$ neip dashboard
```

### neip dashboard consolidated
แดชบอร์ดรวม — Consolidated dashboard for multi-company.

**Usage:** `neip dashboard consolidated`

```
$ neip dashboard consolidated
```

### neip month-end close
ปิดงวดสิ้นเดือน — Run month-end close process.

**Usage:** `neip month-end close --year <year> --period <period>`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--year <year>` | ปีบัญชี | **Yes** | — |
| `--period <period>` | งวดบัญชี (1-12) | **Yes** | — |

```
$ neip month-end close --year 2026 --period 3
```

### neip month-end status \<jobId\>
ดูสถานะ month-end — Check month-end close job status.

**Usage:** `neip month-end status <jobId>`

```
$ neip month-end status job_abc123
```

---

## 27. Import & Export

### neip import upload \<file\>
นำเข้าข้อมูล — Upload a file for data import.

**Usage:** `neip import upload <file>`

```
$ neip import upload contacts.csv
```

### neip import preview \<file\>
ดูตัวอย่างข้อมูลนำเข้า — Preview import data before processing.

**Usage:** `neip import preview <file>`

```
$ neip import preview contacts.csv
```

### neip import status \<jobId\>
ดูสถานะนำเข้า — Check import job status.

**Usage:** `neip import status <jobId>`

```
$ neip import status job_abc123
```

### neip export run \<type\>
ส่งออกข้อมูล — Export data to file.

**Usage:** `neip export run <type> [options]`

Types: `journal_entries`, `chart_of_accounts`, `contacts`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--output <file>` | ชื่อไฟล์ผลลัพธ์ | No | auto-generated |
| `--start-date <date>` | วันที่เริ่มต้น | No | — |
| `--end-date <date>` | วันที่สิ้นสุด | No | — |

```
$ neip export run chart_of_accounts --output coa.csv
$ neip export run journal_entries --start-date 2026-01-01 --end-date 2026-03-31
```

---

## 28. Firm Management (Accounting Firm)

### neip firm clients list
แสดงลูกค้าสำนักงานบัญชี — List firm's managed clients.

**Usage:** `neip firm clients list [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--page <number>` | หน้า | No | `1` |
| `--page-size <number>` | จำนวนต่อหน้า | No | `20` |
| `--status <status>` | กรองตามสถานะ | No | — |

```
$ neip firm clients list
```

### neip firm clients add \<tenantId\>
เพิ่มลูกค้า — Add a tenant as a managed client.

**Usage:** `neip firm clients add <tenantId>`

```
$ neip firm clients add tenant_abc123
✔ Client added.
```

### neip firm clients remove \<id\>
ลบลูกค้า — Remove a managed client.

**Usage:** `neip firm clients remove <id>`

```
$ neip firm clients remove client_abc123
✔ Client removed.
```

---

## 29. PDPA Compliance

### neip pdpa access-request
ขอดูข้อมูลส่วนบุคคล — Submit a PDPA data access request (interactive).

**Usage:** `neip pdpa access-request`

```
$ neip pdpa access-request
```

### neip pdpa erasure-request
ขอลบข้อมูลส่วนบุคคล — Submit a PDPA data erasure request (interactive).

**Usage:** `neip pdpa erasure-request`

```
$ neip pdpa erasure-request
```

---

## 30. AI Features

### neip ai anomaly-scan
ตรวจจับความผิดปกติ — Scan for anomalies in financial data.

**Usage:** `neip ai anomaly-scan --period <period> [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--period <period>` | ช่วงเวลา (e.g. 2026-Q1, 2026-03) | **Yes** | — |
| `--threshold <number>` | ค่าขีดจำกัด (0-1) | No | `0.8` |

```
$ neip ai anomaly-scan --period 2026-Q1 --threshold 0.7
```

### neip ai forecast
พยากรณ์รายรับ/รายจ่าย — AI-powered revenue/expense forecast.

**Usage:** `neip ai forecast [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--days <number>` | จำนวนวันที่พยากรณ์ | No | `90` |

```
$ neip ai forecast --days 180
```

### neip ai categorize \<description\>
จัดหมวดหมู่อัตโนมัติ — AI-powered transaction categorization.

**Usage:** `neip ai categorize <description>`

```
$ neip ai categorize "ค่าน้ำมันรถ"
✔ Suggested: 5300 — ค่าเดินทาง (Travel & Transportation)
```

### neip ai predict
พยากรณ์เชิงลึก — AI predictions (cash-flow, churn, etc.).

**Usage:** `neip ai predict --type <type> [options]`

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--type <type>` | ประเภทการพยากรณ์: cash-flow, churn, demand | **Yes** | — |
| `--months <number>` | จำนวนเดือน | No | `6` |

```
$ neip ai predict --type cash-flow --months 12
```

---

## Error Handling

All commands return structured errors:

| Status | Meaning |
|--------|---------|
| `401` | ไม่ได้เข้าสู่ระบบ — Not authenticated. Run `neip auth login`. |
| `403` | ไม่มีสิทธิ์ — Insufficient permissions. |
| `404` | ไม่พบข้อมูล — Resource not found. |
| `409` | ข้อมูลขัดแย้ง — Conflict (e.g. duplicate, invalid state transition). |
| `422` | ข้อมูลไม่ถูกต้อง — Validation error. |
| `500` | ข้อผิดพลาดภายใน — Internal server error. |

```
$ neip gl journal post invalid_id
✗ [404] Journal entry not found.
```

---

## Quick Reference Card

| Task | Command |
|------|---------|
| เข้าสู่ระบบ | `neip auth login` |
| ดูผังบัญชี | `neip gl accounts list` |
| สร้างรายการบัญชี | `neip gl journal create` |
| สร้างใบแจ้งหนี้ | `neip ar invoice create` |
| รับชำระเงิน | `neip ar payment create` |
| สร้างบิลค่าใช้จ่าย | `neip ap bill create` |
| จ่ายเงิน | `neip ap payment create` |
| ใบเสนอราคา | `neip quotations create` |
| งบทดลอง | `neip reports trial-balance` |
| งบดุล | `neip reports balance-sheet` |
| งบกำไรขาดทุน | `neip reports income-statement` |
| ใบหัก ณ ที่จ่าย | `neip wht create` |
| แดชบอร์ด | `neip dashboard` |
| ปิดงวด | `neip month-end close --year 2026 --period 3` |
| เงินเดือน | `neip payroll create` |
| ลงเวลา | `neip attendance clock-in` |
| AI ตรวจจับ | `neip ai anomaly-scan --period 2026-Q1` |
