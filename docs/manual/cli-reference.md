# nEIP CLI Reference

> คู่มืออ้างอิง CLI ฉบับสมบูรณ์ — Complete CLI Quick Reference
> Version: 0.9.0 | Total Commands: 89

## Global Flags (ใช้ได้กับทุกคำสั่ง)

| Flag | Description |
|------|-------------|
| `--format <table\|json>` | รูปแบบผลลัพธ์ — Output format (default: table) |
| `--dry-run` | ดูตัวอย่างก่อนบันทึก — Preview mutation without API call |
| `--explain` | แสดงรายการ debit/credit ก่อนทำรายการ — Show double-entry breakdown |
| `--non-interactive` | ปิด interactive prompts (สำหรับ CI/scripts) |
| `-v, --version` | แสดงเวอร์ชัน CLI |
| `--help` | แสดงคำแนะนำการใช้งาน |

---

## Authentication & System

### neip auth login
เข้าสู่ระบบ — Authenticate with the nEIP API and store credentials locally.
```
Example: neip auth login
```

### neip auth logout
ออกจากระบบ — Clear stored credentials.
```
Example: neip auth logout
```

### neip whoami
แสดงข้อมูลผู้ใช้ปัจจุบัน — Show current user, organisation, and API URL.
```
Example: neip whoami
```

### neip config set \<key\> \<value\>
ตั้งค่า configuration — Set a configuration value.
- Supports `llm-api-key` for BYOK (Bring Your Own Key)
```
Example: neip config set llm-api-key sk-xxx
```

### neip config get \<key\>
ดูค่า configuration — Get a configuration value.
```
Example: neip config get llm-api-key
```

### neip config list
แสดง configuration ทั้งหมด — List all config values (sensitive values masked).
```
Example: neip config list
```

### neip config unset \<key\>
ลบ configuration key — Remove a configuration key.
```
Example: neip config unset llm-api-key
```

---

## Organisation Management

### neip org create \<name\>
สร้างองค์กรใหม่ — Create a new organisation.
- `--business-type <type>` — ประเภทธุรกิจ: company, sme, individual, nonprofit, government
```
Example: neip org create "บริษัท ทดสอบ จำกัด" --business-type sme
```

### neip org list
แสดงองค์กรปัจจุบัน — Show your current organisation.
```
Example: neip org list
```

### neip org switch \<id\>
เปลี่ยนองค์กรที่ใช้งาน — Set the active organisation for all subsequent commands.
```
Example: neip org switch org_abc123
```

---

## General Ledger (GL) — บัญชีแยกประเภท

### neip gl accounts list
แสดงผังบัญชี — List all accounts in the chart of accounts.
- `--type <type>` — กรองตามประเภท: asset, liability, equity, revenue, expense
- `--search <term>` — ค้นหาชื่อบัญชี
- `--limit <n>` — จำนวนสูงสุด (default: 100)
- `--offset <n>` — ข้ามรายการ (default: 0)
```
Example: neip gl accounts list --type asset --format json
```

### neip gl accounts create
สร้างบัญชีใหม่ — Create a new account interactively.
```
Example: neip gl accounts create
```

### neip gl journal create
สร้างรายการบันทึกบัญชี — Create a new journal entry interactively.
- `--dry-run` — ดูตัวอย่างก่อนบันทึก
- `--explain` — แสดง debit/credit breakdown
```
Example: neip gl journal create --explain
```

### neip gl journal list
แสดงรายการบันทึกบัญชี — List journal entries.
- `--status <status>` — กรอง: draft, posted, voided
- `--limit <n>` — จำนวนสูงสุด (default: 20)
- `--offset <n>` — ข้ามรายการ (default: 0)
```
Example: neip gl journal list --status posted --limit 50
```

### neip gl journal post \<id\>
ผ่านรายการบัญชี — Post a draft journal entry, making it permanent.
```
Example: neip gl journal post je_abc123
```

---

## Accounts Receivable (AR) — ลูกหนี้

### neip ar invoice create
สร้างใบแจ้งหนี้ — Create a new invoice interactively.
```
Example: neip ar invoice create
```

### neip ar invoice list
แสดงรายการใบแจ้งหนี้ — List invoices.
- `--page <n>` — หน้า (default: 1)
- `--page-size <n>` — จำนวนต่อหน้า (default: 20)
- `--status <status>` — กรอง: draft, sent, paid, voided, overdue
- `--customer-id <id>` — กรองตามลูกค้า
```
Example: neip ar invoice list --status overdue
```

### neip ar invoice void \<id\>
ยกเลิกใบแจ้งหนี้ — Void an invoice, preventing further payment.
```
Example: neip ar invoice void inv_abc123
```

### neip ar payment create
บันทึกรับชำระเงิน — Record a new customer payment interactively.
- Payment methods: bank_transfer, check, credit_card, cash, other
```
Example: neip ar payment create
```

### neip ar payment list
แสดงรายการรับชำระ — List payments.
- `--page <n>` — หน้า (default: 1)
- `--page-size <n>` — จำนวนต่อหน้า (default: 20)
- `--customer-id <id>` — กรองตามลูกค้า
- `--status <status>` — กรอง: unallocated, partially_allocated, fully_allocated, voided
```
Example: neip ar payment list --status unallocated
```

### neip ar so list
แสดงใบสั่งขาย — List sales orders.
- `--page <n>` | `--page-size <n>` | `--status <status>` | `--customer-id <id>`
```
Example: neip ar so list --status confirmed
```

### neip ar so create
สร้างใบสั่งขาย — Create a new sales order interactively.

### neip ar so get \<id\>
ดูรายละเอียดใบสั่งขาย — Get sales order by ID.

### neip ar so confirm \<id\>
ยืนยันใบสั่งขาย — Confirm a draft sales order.

### neip ar so cancel \<id\>
ยกเลิกใบสั่งขาย — Cancel a sales order.

### neip ar do list
แสดงใบส่งของ — List delivery notes.
- `--page <n>` | `--page-size <n>` | `--status <status>` | `--sales-order-id <id>`
```
Example: neip ar do list --status pending
```

### neip ar do create
สร้างใบส่งของ — Create a delivery note interactively.

### neip ar do get \<id\>
ดูรายละเอียดใบส่งของ — Get delivery note by ID.

### neip ar do deliver \<id\>
บันทึกส่งของแล้ว — Mark delivery note as delivered.

### neip ar receipts list
แสดงใบเสร็จรับเงิน — List receipts.
- `--page <n>` | `--page-size <n>` | `--status <status>` | `--customer-id <id>`

### neip ar receipts create
ออกใบเสร็จรับเงิน — Issue a new receipt interactively.

### neip ar receipts get \<id\>
ดูรายละเอียดใบเสร็จ — Get receipt by ID.

### neip ar receipts void \<id\>
ยกเลิกใบเสร็จ — Void a receipt.

### neip ar cn list
แสดงใบลดหนี้ — List credit notes.
- `--page <n>` | `--page-size <n>` | `--status <status>` | `--customer-id <id>`

### neip ar cn create
สร้างใบลดหนี้ — Create a new credit note interactively.

### neip ar cn get \<id\>
ดูรายละเอียดใบลดหนี้ — Get credit note by ID.

### neip ar cn issue \<id\>
ออกใบลดหนี้ — Issue a draft credit note.

### neip ar cn void \<id\>
ยกเลิกใบลดหนี้ — Void a credit note.

---

## Accounts Payable (AP) — เจ้าหนี้

### neip ap bill list
แสดงรายการบิล — List bills.
- `--page <n>` | `--page-size <n>` | `--status <status>` (draft/posted/paid/voided/overdue) | `--vendor-id <id>`
```
Example: neip ap bill list --status posted --vendor-id v_123
```

### neip ap bill create
สร้างบิลค่าใช้จ่าย — Create a new bill interactively.

### neip ap bill get \<id\>
ดูรายละเอียดบิล — Get a single bill by ID.

### neip ap bill post \<id\>
ผ่านบิล — Post a draft bill, making it an open payable.

### neip ap bill void \<id\>
ยกเลิกบิล — Void a bill, preventing further payment.

### neip ap payment list
แสดงรายการจ่ายเงิน — List bill payments.
- `--page <n>` | `--page-size <n>` | `--vendor-id <id>` | `--status <status>`

### neip ap payment create
บันทึกจ่ายเงิน — Record a new bill payment interactively.

### neip ap po list
แสดงใบสั่งซื้อ — List purchase orders.
- `--page <n>` | `--page-size <n>` | `--status <status>` | `--vendor-id <id>`
```
Example: neip ap po list --status sent
```

### neip ap po create
สร้างใบสั่งซื้อ — Create a new purchase order interactively.

### neip ap po get \<id\>
ดูรายละเอียดใบสั่งซื้อ — Get purchase order by ID.

### neip ap po send \<id\>
ส่งใบสั่งซื้อให้ผู้ขาย — Send purchase order to vendor.

### neip ap po receive \<id\>
บันทึกรับสินค้า — Record received goods.

### neip ap po convert \<id\>
แปลงเป็นบิล — Convert purchase order to bill.

### neip ap po cancel \<id\>
ยกเลิกใบสั่งซื้อ — Cancel a purchase order.

---

## Quotations (ใบเสนอราคา)

### neip quotations list
แสดงใบเสนอราคา — List quotations.
- `--status <status>` | `--customer-id <id>` | `--limit <n>` (default: 20) | `--offset <n>`
```
Example: neip quotations list --status approved
```

### neip quotations create
สร้างใบเสนอราคา — Create a new quotation interactively.

### neip quotations get \<id\>
ดูรายละเอียด — Get quotation details by ID.

### neip quotations send \<id\>
ส่งให้ลูกค้า — Mark quotation as sent to customer.

### neip quotations approve \<id\>
อนุมัติ — Mark quotation as approved.

### neip quotations reject \<id\>
ปฏิเสธ — Mark quotation as rejected.
- `--reason "..."` — เหตุผล

### neip quotations convert \<id\>
แปลงเป็นใบแจ้งหนี้ — Convert approved quotation to invoice.

### neip quotations duplicate \<id\>
ทำสำเนา — Duplicate a quotation as a new draft.

---

## Purchase Requisitions (ใบขอซื้อ)

### neip pr list
แสดงใบขอซื้อ — List purchase requisitions.
- `--status <status>` — กรอง: draft, pending, approved, rejected
- `--limit <n>` — จำนวนสูงสุด (default: 50)
```
Example: neip pr list --status pending
```

### neip pr create
สร้างใบขอซื้อ — Create a purchase requisition interactively.

### neip pr approve \<id\>
อนุมัติใบขอซื้อ — Approve a purchase requisition.

### neip pr reject \<id\>
ปฏิเสธใบขอซื้อ — Reject a purchase requisition.
- `--reason <reason>` — เหตุผล

### neip pr convert \<id\>
แปลงเป็น PO — Convert purchase requisition to purchase order.

---

## RFQ — ใบขอเสนอราคา (Request for Quotation)

### neip rfq list
แสดง RFQ — List RFQs.
- `--status <status>` — กรอง: draft, sent, received, closed
- `--limit <n>` — จำนวนสูงสุด (default: 50)

### neip rfq create
สร้าง RFQ — Create a request for quotation interactively.

### neip rfq send \<id\>
ส่ง RFQ ให้ผู้ขาย — Send RFQ to vendors.

### neip rfq compare \<id\>
เปรียบเทียบราคา — Compare vendor responses.

### neip rfq select \<id\>
เลือกผู้ขาย — Select winning vendor for RFQ.
- `--vendor <vendorId>` — (required) รหัสผู้ขาย
```
Example: neip rfq select rfq_123 --vendor v_456
```

---

## Tax Management (ภาษี)

### neip tax list
แสดงอัตราภาษี — List all tax rates.
- `--limit <n>` (default: 50) | `--active <bool>`

### neip tax create
สร้างอัตราภาษี — Create a new tax rate interactively.

### neip tax update \<id\>
แก้ไขอัตราภาษี — Update an existing tax rate interactively.

### neip tax delete \<id\>
ลบอัตราภาษี — Delete a tax rate by ID.

---

## WHT Certificates (ใบหัก ณ ที่จ่าย)

### neip wht list
แสดงใบหัก ณ ที่จ่าย — List WHT certificates.
- `--status <status>` | `--month <month>` | `--year <year>`

### neip wht create
สร้างใบหัก ณ ที่จ่าย — Create a WHT certificate interactively.

### neip wht get \<id\>
ดูรายละเอียด — Get certificate detail.

### neip wht issue \<id\>
ออกใบหัก ณ ที่จ่าย — Issue a draft certificate.

### neip wht void \<id\>
ยกเลิก — Void a certificate.

### neip wht file \<id\>
บันทึกการยื่น — Mark as filed.

### neip wht summary
สรุปตามเดือน — Summary by month for ภ.ง.ด.3/53.

---

## Financial Reports (รายงานการเงิน)

### neip reports balance-sheet
งบดุล — Generate a balance sheet.
- `--as-of <date>` — ณ วันที่ (YYYY-MM-DD)
```
Example: neip reports balance-sheet --as-of 2026-03-31
```

### neip reports income-statement
งบกำไรขาดทุน — Generate an income statement.
- `--start-date <date>` | `--end-date <date>`

### neip reports trial-balance
งบทดลอง — Generate a trial balance.
- `--as-of <date>`

### neip reports budget-variance
งบประมาณเทียบจริง — Generate a budget vs actual variance report.
- `--year <year>` | `--period <period>`

### neip reports equity-changes
งบแสดงการเปลี่ยนแปลงส่วนของผู้ถือหุ้น — Statement of changes in equity.
- `--start-date <date>` | `--end-date <date>`

### neip reports ar-aging
รายงานอายุลูกหนี้ — Accounts receivable aging report.
- `--as-of <date>`

### neip reports ap-aging
รายงานอายุเจ้าหนี้ — Accounts payable aging report.
- `--as-of <date>`

### neip reports pnl
รายงานกำไรขาดทุนเปรียบเทียบ — P&L comparison report.
- `--mode <mode>` — (required) monthly (รายเดือน), ytd (สะสม), yoy (ปีต่อปี), mom (เดือนต่อเดือน)
- `--fiscal-year <year>` — (required)
- `--period <period>` | `--compare-year <year>`
```
Example: neip reports pnl --mode yoy --fiscal-year 2026 --compare-year 2025
```

### neip reports vat-return
แบบ ภ.พ.30 — VAT return report.
- `--year <year>` — (required) | `--month <month>` — (required)
```
Example: neip reports vat-return --year 2026 --month 3
```

### neip reports ssc-filing
แบบ สปส.1-10 — Social Security contribution filing.
- `--year <year>` — (required) | `--month <month>` — (required)

### neip reports cash-flow
งบกระแสเงินสด — Cash flow statement.
- `--year <year>` | `--period <period>`

---

## Fixed Assets (สินทรัพย์ถาวร — FI-AA)

### neip assets list
แสดงสินทรัพย์ถาวร — List fixed assets.
- `--category <cat>` | `--status <status>`

### neip assets create
ลงทะเบียนสินทรัพย์ — Register a new fixed asset interactively.

### neip assets get \<id\>
ดูรายละเอียด — Get fixed asset detail.

### neip assets depreciate \<id\>
คำนวณค่าเสื่อมราคา — Run monthly depreciation for an asset.

### neip assets dispose \<id\>
จำหน่ายสินทรัพย์ — Dispose a fixed asset.

### neip assets report
รายงานทะเบียนสินทรัพย์ — Asset register report by category.

---

## Bank Reconciliation (FI-BL)

### neip bank list
แสดงบัญชีธนาคาร — List bank accounts.

### neip bank create
สร้างบัญชีธนาคาร — Create a bank account interactively.

### neip bank transactions \<id\>
แสดงรายการเดินบัญชี — Show recent transactions for an account.

### neip bank reconcile \<txnId\>
กระทบยอด — Reconcile a bank transaction to a JE.

### neip bank report \<id\>
รายงานกระทบยอด — Reconciliation report (unmatched items).

---

## Inventory & Products (สินค้าคงคลัง — MM)

### neip products list
แสดงสินค้า — List products.
- `--limit <n>` (default: 50) | `--offset <n>` | `--search <text>`
```
Example: neip products list --search "laptop"
```

### neip products create
สร้างสินค้า — Create a product interactively.

### neip products update \<id\>
แก้ไขสินค้า — Update a product interactively.

### neip inventory levels
ดูสต็อกปัจจุบัน — Show current stock levels.

### neip inventory movement
บันทึกเคลื่อนไหวสต็อก — Record a stock movement interactively.
- Movement types: receive, issue, adjust, return

### neip inventory valuation
รายงานมูลค่าสต็อก — Show stock valuation report.

### neip inventory low-stock
สินค้าต่ำกว่า minimum — List products below minimum stock level.

---

## Stock Count (ตรวจนับสินค้า — MM-IM)

### neip stock-count list
แสดงการตรวจนับ — List stock counts.
- `--status <status>` — กรอง: draft, in-progress, posted
- `--limit <n>` (default: 50)

### neip stock-count create
สร้างการตรวจนับ — Create a stock count interactively.

### neip stock-count post \<id\>
บันทึกผลตรวจนับ — Post stock count adjustments.

---

## Batch / Lot Tracking (MM-BT)

### neip batch list
แสดง batch — List batches.
- `--product <productId>` | `--status <status>` (active/expired/recalled) | `--limit <n>`

### neip batch create
สร้าง batch — Create a batch interactively.

### neip batch trace \<id\>
ติดตาม batch — Trace batch movements and usage.

---

## HR — Employees & Departments (ทรัพยากรบุคคล)

### neip employees list
แสดงพนักงาน — List employees.
- `--status <status>` — กรอง: active, resigned, terminated, all (default: active)
- `--limit <n>` (default: 50) | `--search <text>`
```
Example: neip employees list --search "สมชาย"
```

### neip employees create
เพิ่มพนักงาน — Create an employee interactively.

### neip employees get \<id\>
ดูรายละเอียดพนักงาน — Get employee details.

### neip employees update \<id\>
แก้ไขข้อมูลพนักงาน — Update an employee interactively.

### neip employees resign \<id\>
บันทึกการลาออก — Process employee resignation.
- `--date <date>` — วันที่ลาออก (YYYY-MM-DD)
```
Example: neip employees resign emp_123 --date 2026-03-31
```

### neip departments list
แสดงแผนก — List departments.

### neip departments create
สร้างแผนก — Create a department interactively.

### neip departments update \<id\>
แก้ไขแผนก — Update a department interactively.

---

## Payroll (เงินเดือน)

### neip payroll list
แสดง payroll runs — List payroll runs.
- `--status <status>` — กรอง: draft, calculated, approved, paid
- `--limit <n>` (default: 20)

### neip payroll create
สร้าง payroll run — Create a payroll run interactively.

### neip payroll calculate \<id\>
คำนวณเงินเดือน — Calculate payroll for all active employees.

### neip payroll approve \<id\>
อนุมัติ payroll — Approve a calculated payroll run.

### neip payroll pay \<id\>
จ่ายเงินเดือน — Mark an approved payroll run as paid.

**Workflow:** `create` -> `calculate` -> `approve` -> `pay`

---

## Leave Management (การลาหยุด)

### neip leave types
แสดงประเภทการลา — List available leave types.

### neip leave request
ยื่นคำขอลา — Submit a leave request interactively.

### neip leave list
แสดงคำขอลา — List leave requests.
- `--status <status>` — กรอง: pending, approved, rejected, all (default: pending)
- `--limit <n>` (default: 50)

### neip leave approve \<id\>
อนุมัติ — Approve a pending leave request.

### neip leave reject \<id\>
ปฏิเสธ — Reject a pending leave request.
- `--reason <reason>` — เหตุผล

### neip leave balance \<employeeId\>
วันลาคงเหลือ — Show remaining leave balance by type.

---

## Attendance (การเข้างาน)

### neip attendance clock-in
ลงเวลาเข้า — Clock in.
- `--employee <employeeId>` — รหัสพนักงาน (defaults to self)
- `--note <note>` — หมายเหตุ

### neip attendance clock-out
ลงเวลาออก — Clock out.
- `--employee <employeeId>` | `--note <note>`

### neip attendance summary
สรุปการเข้างาน — Attendance summary.
- `--employee <employeeId>` | `--month <month>` | `--year <year>`
```
Example: neip attendance summary --month 3 --year 2026
```

---

## Positions & Org Structure (ตำแหน่ง — HR-OM)

### neip positions list
แสดงตำแหน่ง — List positions.
- `--department <deptId>` | `--limit <n>` (default: 50)

### neip positions create
สร้างตำแหน่ง — Create a position interactively.

### neip positions org-tree
แสดงผังองค์กร — Show organization tree.
- `--department <deptId>` — แสดงเฉพาะแผนก

---

## Contacts / CRM (ทะเบียนลูกค้า/ผู้ขาย)

### neip contacts list
แสดง contacts — List all contacts.
- `--limit <n>` (default: 50) | `--offset <n>` | `--type <type>` (customer/vendor/both) | `--search <text>`
```
Example: neip contacts list --type customer --search "ABC"
```

### neip contacts create
สร้าง contact — Create a contact interactively.

### neip contacts get \<id\>
ดูรายละเอียด — Get contact details.

### neip contacts update \<id\>
แก้ไข — Update a contact interactively.

### neip contacts delete \<id\>
ลบ (soft delete) — Deactivate a contact.

---

## Vendors (ผู้ขาย)

### neip vendors list
แสดงผู้ขาย — List vendors.
- `--limit <n>` (default: 20) | `--offset <n>` | `--search <text>`

### neip vendors create
สร้างผู้ขาย — Create a new vendor interactively.

### neip vendors update \<id\>
แก้ไขผู้ขาย — Update an existing vendor interactively.

---

## Pricing (ราคาสินค้า — SD-Pricing)

### neip pricing list
แสดง price lists — List price lists.
- `--limit <n>` (default: 50)

### neip pricing create
สร้าง price list — Create a price list interactively.

### neip pricing resolve
หาราคาที่ใช้ได้ — Resolve effective price for a product.
- `--product <productId>` — (required) รหัสสินค้า
- `--customer <customerId>` | `--quantity <qty>` (default: 1) | `--date <date>`
```
Example: neip pricing resolve --product p_123 --customer c_456
```

---

## Payment Terms (เงื่อนไขการชำระเงิน)

### neip payment-terms list
แสดงเงื่อนไข — List payment terms.
- `--limit <n>` (default: 50)

### neip payment-terms create
สร้างเงื่อนไข — Create payment terms interactively.

---

## Credit Management (วงเงินเครดิต)

### neip credit check \<contactId\>
ตรวจสอบวงเงิน — Check credit exposure for a contact.
```
Example: neip credit check c_abc123
```

---

## Dunning (การติดตามหนี้)

### neip dunning run
รัน dunning process — Run dunning process to generate notices.
- `--as-of <date>` — วันที่อ้างอิง (YYYY-MM-DD)
```
Example: neip dunning run --as-of 2026-03-31
```

### neip dunning list
แสดง dunning notices — List dunning notices.
- `--level <level>` — กรอง dunning level (1-3)
- `--status <status>` — กรอง: pending, sent, resolved
- `--limit <n>` (default: 50)

---

## Fiscal Years & Periods (ปีบัญชี)

### neip fiscal years
แสดงปีบัญชี — List all fiscal years.

### neip fiscal years create
สร้างปีบัญชี — Create a new fiscal year interactively.

### neip fiscal period close \<id\>
ปิดงวดบัญชี — Close a fiscal period.

### neip fiscal period reopen \<id\>
เปิดงวดบัญชี — Reopen a previously closed fiscal period.

### neip fiscal close-year \<yearId\>
ปิดปีบัญชี — Close a fiscal year.

### neip fiscal reopen-year \<yearId\>
เปิดปีบัญชี — Reopen a previously closed fiscal year.

---

## Budgets (งบประมาณ)

### neip budgets list
แสดงงบประมาณ — List all budgets.
- `--limit <n>` (default: 50) | `--year <year>` | `--status <status>`

### neip budgets create
สร้างงบประมาณ — Create a new budget interactively.

### neip budgets update \<id\>
แก้ไขงบประมาณ — Update an existing budget interactively.

---

## Cost Centers (ศูนย์ต้นทุน — CO-CCA)

### neip cost-centers list
แสดงศูนย์ต้นทุน — List cost centers.

### neip cost-centers create
สร้างศูนย์ต้นทุน — Create a cost center interactively.

### neip cost-centers update \<id\>
แก้ไขศูนย์ต้นทุน — Update a cost center interactively.

---

## Profit Centers (ศูนย์กำไร — CO-PCA)

### neip profit-centers list
แสดงศูนย์กำไร — List profit centers.

### neip profit-centers create
สร้างศูนย์กำไร — Create a profit center interactively.

### neip profit-centers update \<id\>
แก้ไขศูนย์กำไร — Update a profit center interactively.

---

## Currency Management (สกุลเงิน)

### neip currency list
แสดงสกุลเงิน — List currencies.

### neip currency create
สร้างสกุลเงิน — Create a currency interactively.

### neip currency rate
ดูอัตราแลกเปลี่ยน — Get exchange rate.
- `--from <currency>` — (required) สกุลเงินต้นทาง
- `--to <currency>` — (required) สกุลเงินปลายทาง
- `--date <date>` — วันที่
```
Example: neip currency rate --from USD --to THB
```

### neip currency convert
แปลงค่าเงิน — Convert amount between currencies.
- `--from <currency>` — (required) | `--to <currency>` — (required) | `--amount <amount>` — (required)
- `--date <date>`
```
Example: neip currency convert --from USD --to THB --amount 100
```

---

## Multi-Company (บริษัท)

### neip company list
แสดงบริษัท — List companies.

### neip company create
สร้างบริษัท — Create a company interactively.

### neip company switch \<id\>
เปลี่ยนบริษัท — Switch active company context.

---

## Approval Workflow (การอนุมัติ)

### neip approval list
แสดงรายการอนุมัติ — List approval requests.
- `--status <status>` — กรอง: pending, approved, rejected
- `--type <type>` — กรอง: po, pr, expense, leave
- `--limit <n>` (default: 50)

### neip approval approve \<id\>
อนุมัติ — Approve a request.
- `--comment <comment>` — ความเห็น

### neip approval reject \<id\>
ปฏิเสธ — Reject a request.
- `--reason <reason>` — เหตุผล

### neip approval delegate \<id\>
มอบหมาย — Delegate approval to another user.
- `--to <userId>` — (required) ผู้รับมอบหมาย
- `--comment <comment>`

---

## Recurring Journal Entries (รายการบัญชีรายงวด)

### neip recurring-je list
แสดงรายการรายงวด — List recurring journal entries.
- `--status <status>` | `--limit <n>` (default: 50)

### neip recurring-je create
สร้างรายการรายงวด — Create a recurring journal entry interactively.

### neip recurring-je run \<id\>
รัน — Execute a recurring journal entry now.

---

## Month-End Operations (ปิดงวดสิ้นเดือน)

### neip month-end close
ปิดงวดสิ้นเดือน — Initiate a month-end close.
- `--year <year>` — (required) | `--period <period>` — (required)
```
Example: neip month-end close --year 2026 --period 3
```

### neip month-end status \<jobId\>
ดูสถานะ — Get the status of a month-end close job.

---

## Dashboard (แดชบอร์ด)

### neip dashboard
ภาพรวมธุรกิจ — View executive dashboard (default).

### neip dashboard consolidated
ภาพรวมระดับบริษัท — View consolidated multi-entity dashboard (firm-level).

---

## Audit Trail (บันทึกการเปลี่ยนแปลง)

### neip audit list
แสดง audit log — List recent audit log entries.
- `--limit <n>` (default: 50) | `--offset <n>`

### neip audit search
ค้นหา audit log — Search audit log entries.
- `--resource <type>` | `--id <resourceId>` | `--user <userId>` | `--start <date>` | `--end <date>` | `--limit <n>`
```
Example: neip audit search --resource invoice --start 2026-03-01 --end 2026-03-31
```

---

## Data Import / Export

### neip import preview \<file\>
ดูตัวอย่าง — Preview a file import without committing data.

### neip import upload \<file\>
นำเข้าข้อมูล — Upload a file to start a background import job.

### neip import status \<jobId\>
ดูสถานะ — Get the status of an import job.

### neip export run \<type\>
ส่งออกข้อมูล — Export data by type.
- Valid types: journal_entries, chart_of_accounts, contacts
- `--output <file>` | `--start-date <date>` | `--end-date <date>`
```
Example: neip export run chart_of_accounts --output coa.csv
```

---

## Webhooks

### neip webhooks list
แสดง webhooks — List all registered webhook endpoints.
- `--limit <n>` (default: 50)

### neip webhooks create
สร้าง webhook — Create a new webhook subscription interactively.
- Events: invoice.created, invoice.paid, payment.received, bill.created, bill.paid, journal.posted, contact.created

### neip webhooks delete \<id\>
ลบ webhook — Delete a webhook by ID.

---

## Roles & Users (สิทธิ์และผู้ใช้)

### neip roles list
แสดง roles — List all roles in the organisation.
- `--limit <n>` (default: 50)

### neip roles create
สร้าง role — Create a new role interactively.

### neip roles update \<id\>
แก้ไข role — Update an existing role interactively.

### neip roles delete \<id\>
ลบ role — Delete a role by ID.

### neip users invite \<email\>
เชิญผู้ใช้ — Invite a user to the organisation by email.
- `--role <role>` — (required) บทบาท
- `--message "..."` — ข้อความ
```
Example: neip users invite user@example.com --role accountant
```

---

## Notifications (การแจ้งเตือน)

### neip notifications list
แสดงการแจ้งเตือน — List notifications for the current user.
- `--page <n>` | `--page-size <n>` | `--unread` — เฉพาะที่ยังไม่อ่าน

### neip notifications settings
ดูการตั้งค่า — View notification settings.

### neip notifications settings update
แก้ไขการตั้งค่า — Update notification settings interactively.

---

## Organisation Settings (ตั้งค่าองค์กร)

### neip settings get
ดูการตั้งค่า — Get current organisation settings.

### neip settings update
แก้ไขการตั้งค่า — Update organisation settings interactively.

### neip settings ai
ตั้งค่า AI — Update AI/LLM provider settings for this organisation.

---

## Firm Management (สำนักงานบัญชี)

### neip firm clients list
แสดงลูกค้า — List all firm client organisations.
- `--page <n>` | `--page-size <n>` | `--status <status>`

### neip firm clients add \<tenantId\>
เพิ่มลูกค้า — Add a client organisation to this firm.

### neip firm clients remove \<id\>
ลบลูกค้า — Remove a client from this firm.

---

## PDPA Compliance (พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล)

### neip pdpa access-request
ขอเข้าถึงข้อมูล — Submit a data access request (DSAR).

### neip pdpa erasure-request
ขอลบข้อมูล — Submit a data erasure request.

---

## AI-Powered Features (ปัญญาประดิษฐ์)

### neip ai anomaly-scan
สแกนความผิดปกติ — Scan for accounting anomalies.
- `--period <YYYY-MM>` — (required) ช่วงเวลา
- `--threshold <n>` — ค่าเกณฑ์ (default: 0.8)
```
Example: neip ai anomaly-scan --period 2026-03 --threshold 0.9
```

### neip ai forecast
พยากรณ์กระแสเงินสด — Cash flow forecast.
- `--days <n>` — จำนวนวัน (default: 30)

### neip ai categorize \<description\>
จัดหมวดหมู่ — Smart categorize a transaction description.
```
Example: neip ai categorize "ค่าเช่าสำนักงาน"
```

### neip ai predict
พยากรณ์ — Predictive analytics.
- `--type <type>` — (required) ประเภท: revenue, expense, cashflow
- `--months <n>` — จำนวนเดือน (default: 6)
```
Example: neip ai predict --type revenue --months 12
```
