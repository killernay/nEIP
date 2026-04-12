# nEIP Finance Modules — User Manual
# คู่มือการใช้งานระบบการเงิน nEIP

> Version: 0.9.0 | Last updated: 2026-04-12
> สำหรับนักบัญชี ผู้จัดการฝ่ายบัญชี และผู้ดูแลระบบ ERP

---

## Table of Contents / สารบัญ

1. [GL — General Ledger / บัญชีแยกประเภท](#1-gl--general-ledger--บัญชีแยกประเภท)
2. [AR — Accounts Receivable / ลูกหนี้การค้า](#2-ar--accounts-receivable--ลูกหนี้การค้า)
3. [AP — Accounts Payable / เจ้าหนี้การค้า](#3-ap--accounts-payable--เจ้าหนี้การค้า)
4. [FI-AA — Fixed Assets / สินทรัพย์ถาวร](#4-fi-aa--fixed-assets--สินทรัพย์ถาวร)
5. [FI-BL — Bank & Reconciliation / ธนาคารและกระทบยอด](#5-fi-bl--bank--reconciliation--ธนาคารและกระทบยอด)
6. [WHT — Withholding Tax / ภาษีหัก ณ ที่จ่าย](#6-wht--withholding-tax--ภาษีหัก-ณ-ที่จ่าย)
7. [Tax & VAT — อัตราภาษีและ VAT Return](#7-tax--vat--อัตราภาษีและ-vat-return)
8. [Recurring Journal Entries / รายการบันทึกอัตโนมัติ](#8-recurring-journal-entries--รายการบันทึกอัตโนมัติ)
9. [Financial Reports / รายงานทางการเงิน](#9-financial-reports--รายงานทางการเงิน)

---

## 1. GL — General Ledger / บัญชีแยกประเภท

### 1.1 Overview / ภาพรวม

General Ledger (GL) เป็นหัวใจของระบบบัญชี nEIP ประกอบด้วย 4 sub-modules:

| Sub-module | หน้าที่ |
|---|---|
| **Chart of Accounts (CoA)** | ผังบัญชี — สร้าง/แก้ไข/ปิดบัญชี |
| **Journal Entries (JE)** | สมุดรายวัน — บันทึก/ผ่านรายการ/กลับรายการ |
| **Fiscal Year & Periods** | ปีบัญชี/งวดบัญชี — เปิด/ปิดงวด, Year-End Closing |
| **Budgets** | งบประมาณรายบัญชี/รายปี |

**ผู้ใช้งาน:** นักบัญชี (Accountant), ผู้ตรวจสอบ (Auditor), ผู้จัดการฝ่ายบัญชี (Finance Manager)

### 1.2 Screens / หน้าจอ

| หน้าจอ | Path | คำอธิบาย |
|---|---|---|
| Chart of Accounts | `/accounts` | แสดงรายการบัญชีทั้งหมด กรองตามประเภท |
| Journal Entries List | `/journal-entries` | รายการสมุดรายวันทั้งหมด กรองตาม status/ปี |
| New Journal Entry | `/journal-entries/new` | สร้างใบบันทึกรายวันใหม่ |
| Budgets | `/budgets` | จัดการงบประมาณรายบัญชี |
| Fiscal Year Settings | `/settings/fiscal` | ตั้งค่าปีบัญชี เปิด/ปิดงวด |
| Recurring JE | `/recurring-je` | แม่แบบรายการอัตโนมัติ |
| Month-End Closing | `/month-end` | ปิดงวดบัญชีประจำเดือน |

### 1.3 Chart of Accounts / ผังบัญชี

#### Account Types / ประเภทบัญชี

| Type | รหัส | ตัวอย่าง |
|---|---|---|
| `asset` (สินทรัพย์) | 1xxx | เงินสด (1010), ลูกหนี้ (1100), สินค้าคงคลัง (1200) |
| `liability` (หนี้สิน) | 2xxx | เจ้าหนี้ (2100), ภาษีขาย (2110) |
| `equity` (ส่วนของเจ้าของ) | 3xxx | ทุน (3100), กำไรสะสม (3200) |
| `revenue` (รายได้) | 4xxx | รายได้จากขาย (4000) |
| `expense` (ค่าใช้จ่าย) | 5xxx | ต้นทุนขาย (5100), ค่าเสื่อม (5500) |

#### Step-by-Step: สร้างบัญชีใหม่

1. ไปที่ **Accounts** (`/accounts`)
2. กดปุ่ม **"+ New Account"**
3. กรอกข้อมูล:
   - **Code** — รหัสบัญชี (เช่น `1010`) — ต้องไม่ซ้ำภายใน tenant
   - **Name (TH)** — ชื่อไทย (เช่น "เงินสดในมือ")
   - **Name (EN)** — ชื่ออังกฤษ (เช่น "Cash on Hand")
   - **Account Type** — เลือก: asset / liability / equity / revenue / expense
   - **Parent Account** — (optional) บัญชีแม่สำหรับโครงสร้างลำดับชั้น
4. กด **Save**

#### Field Reference / ฟิลด์สำคัญ

| Field | Type | Required | Description |
|---|---|---|---|
| `code` | string (1-20) | Yes | รหัสบัญชี ต้องไม่ซ้ำ |
| `nameTh` | string (1-255) | Yes | ชื่อบัญชีภาษาไทย |
| `nameEn` | string (1-255) | Yes | ชื่อบัญชีภาษาอังกฤษ |
| `accountType` | enum | Yes | asset, liability, equity, revenue, expense |
| `parentId` | UUID | No | ID ของบัญชีแม่ |
| `isActive` | boolean | — | สถานะ (default: true) |

#### Business Rules / กฎทางธุรกิจ

- รหัสบัญชี (`code`) ต้องไม่ซ้ำกันภายใน organization เดียวกัน
- **ลบบัญชี = Soft-delete** (ตั้ง `isActive = false`) — ไม่ลบข้อมูลจริง
- ห้ามลบบัญชีที่มีรายการใน Journal Entry Lines (return 409 Conflict)
- การแก้ไข account type ไม่ได้หลังจากสร้างแล้ว (ต้องสร้างใหม่)

---

### 1.4 Journal Entries / สมุดรายวัน

#### Status Flow / วงจรสถานะ

```
draft ──→ posted ──→ reversed
                        ↓
                 (สร้าง Reversal JE ใหม่ สถานะ posted)
```

#### Step-by-Step: สร้างและผ่านรายการบันทึก

1. ไปที่ **Journal Entries** (`/journal-entries`) → กด **"+ New"**
2. กรอกข้อมูลหัวรายการ:
   - **Description** — คำอธิบายรายการ
   - **Fiscal Year** — ปีบัญชี (เช่น 2026)
   - **Fiscal Period** — งวดบัญชี (1-12)
3. เพิ่ม **Lines** (อย่างน้อย 2 บรรทัด):
   - เลือก **Account** จากผังบัญชี
   - ใส่ **Debit** หรือ **Credit** (หน่วย: สตางค์)
   - เพิ่ม Description สำหรับแต่ละบรรทัด
4. กด **Save** — สถานะ: `draft`
5. ตรวจสอบข้อมูล แล้วกด **Post** — สถานะ: `posted`

**ตัวอย่าง GL Entry — รับชำระเงิน:**
```
JE-2026-0001: รับชำระค่าสินค้า
┌──────────────────┬────────────┬────────────┐
│ Account          │ Debit (฿)  │ Credit (฿) │
├──────────────────┼────────────┼────────────┤
│ 1010 Cash        │  10,700.00 │            │
│ 4000 Revenue     │            │  10,000.00 │
│ 2110 VAT Payable │            │     700.00 │
└──────────────────┴────────────┴────────────┘
```

#### Step-by-Step: กลับรายการ (Reverse Entry)

1. ไปที่รายการ JE ที่ต้องการกลับ (สถานะ `posted`)
2. กด **Reverse** — ระบบจะ:
   - เปลี่ยนสถานะ JE เดิมเป็น `reversed`
   - สร้าง JE ใหม่ที่สลับ Dr/Cr (สถานะ `posted` ทันที)
   - เลข document: อัตโนมัติ (description: "Reversal of JE-xxxx")

#### Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `description` | string (1-500) | Yes | คำอธิบายรายการ |
| `fiscalYear` | integer (2000+) | Yes | ปีบัญชี |
| `fiscalPeriod` | integer (1-12) | Yes | งวดบัญชี |
| `lines` | array (min 2) | Yes | รายการ Dr/Cr |
| `lines[].accountId` | UUID | Yes | ID บัญชีจาก CoA |
| `lines[].debitSatang` | string (bigint) | Yes | จำนวนเงินเดบิต (สตางค์) |
| `lines[].creditSatang` | string (bigint) | Yes | จำนวนเงินเครดิต (สตางค์) |

#### Business Rules

- **ยอดเดบิตต้องเท่ากับเครดิต** — ระบบจะตรวจสอบ `totalDebit === totalCredit`
- **ยอดต้องมากกว่า 0** — ไม่อนุญาตรายการ 0 บาท
- **บัญชีที่อ้างอิงต้องมีอยู่จริง** และ `isActive = true` ใน CoA
- **ห้ามสร้าง/ผ่านรายการในงวดที่ปิดแล้ว** (fiscal period status = 'closed')
- **Idempotency**: ส่ง `X-Idempotency-Key` header เพื่อป้องกันการสร้างซ้ำ
- **Audit Log**: ทุกครั้งที่ Post จะบันทึก audit log

---

### 1.5 Fiscal Year & Periods / ปีบัญชีและงวดบัญชี

#### Step-by-Step: สร้างปีบัญชี

1. ไปที่ **Settings > Fiscal Year** (`/settings/fiscal`)
2. กด **"Create Fiscal Year"**
3. กรอก: Year (เช่น 2026), Start Date (`2026-01-01`), End Date (`2026-12-31`)
4. กด **Save** — ระบบสร้าง **12 งวดบัญชี (monthly)** อัตโนมัติ
5. ทุกงวดเริ่มต้นที่สถานะ `open`

#### Step-by-Step: ปิดงวดบัญชี (Close Period)

1. ไปที่ **Settings > Fiscal Year** → เลือกปีบัญชี
2. คลิก **Close** ที่งวดที่ต้องการปิด
3. เมื่อปิดแล้ว ไม่สามารถสร้าง/ผ่าน/กลับรายการ JE ในงวดนั้นได้
4. ถ้าต้องแก้ไข สามารถ **Reopen** ได้

#### Step-by-Step: Year-End Closing / ปิดบัญชีสิ้นปี

1. ตรวจสอบว่า **ทุก 12 งวดปิดแล้ว** (ถ้ายังเปิดอยู่ระบบจะ reject)
2. กด **Close Year** — ระบบทำงาน:
   - คำนวณยอด Revenue & Expense ทั้งหมดในปี
   - สร้าง **Closing JE** อัตโนมัติ:
     - Dr Revenue accounts (ล้างยอด credit balance)
     - Cr Expense accounts (ล้างยอด debit balance)
     - Dr/Cr Retained Earnings (3200) — กำไร/ขาดทุนสุทธิ
   - เปลี่ยนสถานะปีเป็น `closed`

**ตัวอย่าง Year-End Closing JE:**
```
JE-2026-CLOSE: Year-end closing entry for fiscal year 2026
┌────────────────────────────┬─────────────┬─────────────┐
│ Account                    │ Debit (฿)   │ Credit (฿)  │
├────────────────────────────┼─────────────┼─────────────┤
│ 4000 Revenue (ล้างรายได้)  │ 1,000,000   │             │
│ 5100 COGS (ล้างค่าใช้จ่าย)│             │   600,000   │
│ 5500 Depreciation          │             │    50,000   │
│ 3200 Retained Earnings     │             │   350,000   │
│   (กำไรสุทธิ)              │             │             │
└────────────────────────────┴─────────────┴─────────────┘
```

#### Reopen Year / เปิดปีบัญชีใหม่

- สามารถ Reopen ปีที่ปิดแล้วเพื่อแก้ไข
- ระบบจะ **Reverse Closing JE** อัตโนมัติ และเปิดทุกงวดกลับเป็น `open`

---

### 1.6 Budgets / งบประมาณ

#### Step-by-Step: ตั้งงบประมาณ

1. ไปที่ **Budgets** (`/budgets`)
2. กด **"+ New Budget"**
3. เลือก **Account** และ **Fiscal Year**
4. ใส่ **Amount** (สตางค์)
5. กด **Save**

| Field | Required | Description |
|---|---|---|
| `accountId` | Yes | บัญชีที่ตั้งงบประมาณ |
| `fiscalYear` | Yes | ปีบัญชี |
| `amountSatang` | Yes | จำนวนเงินงบประมาณ (สตางค์) |

- **1 account + 1 year = 1 budget** (ห้ามซ้ำ)
- ดูรายงาน Budget Variance ได้ที่ `/reports/budget-variance`

---

## 2. AR — Accounts Receivable / ลูกหนี้การค้า

### 2.1 Overview

ระบบ AR จัดการวงจรรายได้ตั้งแต่ออกใบแจ้งหนี้ (Invoice) จนถึงรับชำระเงิน (Payment) รองรับ VAT 7% อัตโนมัติ และ e-Tax Invoice (ใบกำกับภาษีอิเล็กทรอนิกส์)

**ผู้ใช้งาน:** พนักงานบัญชี (AR Clerk), ผู้จัดการฝ่ายขาย

### 2.2 Screens / หน้าจอ

| หน้าจอ | Path | คำอธิบาย |
|---|---|---|
| Invoice List | `/invoices` | รายการใบแจ้งหนี้ทั้งหมด |
| Invoice Detail | `/invoices/[id]` | รายละเอียดใบแจ้งหนี้ |
| New Invoice | `/invoices/new` | สร้างใบแจ้งหนี้ใหม่ |
| Payment List | `/payments` | รายการรับชำระทั้งหมด |
| New Payment | `/payments/new` | บันทึกรับชำระใหม่ |
| Receipt List | `/receipts` | รายการใบเสร็จ |
| Receipt Detail | `/receipts/[id]` | รายละเอียดใบเสร็จ |
| New Receipt | `/receipts/new` | สร้างใบเสร็จใหม่ |
| Credit Notes | `/credit-notes` | ใบลดหนี้ |
| Credit Note Detail | `/credit-notes/[id]` | รายละเอียดใบลดหนี้ |
| New Credit Note | `/credit-notes/new` | สร้างใบลดหนี้ |
| Dunning | `/dunning` | ระบบติดตามหนี้ |
| AR Aging Report | `/reports/ar-aging` | รายงานอายุลูกหนี้ |

### 2.3 Invoices / ใบแจ้งหนี้

#### Invoice Status Flow

```
draft ──→ posted ──→ sent ──→ partial ──→ paid
  │          │                               
  └──→ void  └──→ void (+ reversal JE)       
```

#### Step-by-Step: สร้างและผ่านใบแจ้งหนี้

1. ไปที่ **Invoices** (`/invoices`) → กด **"+ New"**
2. เลือก **Customer** (ต้องมีอยู่ใน Contacts)
3. กำหนด **Due Date** (วันครบกำหนดชำระ)
4. เพิ่ม **Line Items**:
   - Description — รายละเอียดสินค้า/บริการ
   - Quantity — จำนวน (จำนวนเต็ม)
   - Unit Price — ราคาต่อหน่วย (สตางค์)
   - Account — (optional) บัญชีรายได้
5. กด **Save** — สถานะ: `draft`
6. ตรวจสอบ → กด **Post** — ระบบสร้าง JE:

**GL Entry เมื่อ Post Invoice:**
```
JE: Invoice posted: INV-2026-0001
┌──────────────────────┬──────────────┬──────────────┐
│ Account              │ Debit (฿)    │ Credit (฿)   │
├──────────────────────┼──────────────┼──────────────┤
│ 1100 AR              │ grandTotal   │              │
│ 4000 Revenue (line1) │              │ lineTotal    │
│ 4000 Revenue (line2) │              │ lineTotal    │
│ 2110 VAT Payable     │              │ 7% of subTot │
└──────────────────────┴──────────────┴──────────────┘
```

> **VAT Calculation**: subTotal * 700 / 10000 (round half-up)
> **Grand Total** = subTotal + VAT (7%)

#### Step-by-Step: Void ใบแจ้งหนี้

1. ใบแจ้งหนี้ต้องอยู่ในสถานะ `draft`, `sent`, หรือ `posted`
2. **ห้าม void ถ้ามี payment ที่ยังไม่ได้ void** — ต้อง void payment ก่อน
3. กด **Void** — ระบบสร้าง Reversal JE อัตโนมัติ (สลับ Dr/Cr)

#### e-Tax Invoice / ใบกำกับภาษีอิเล็กทรอนิกส์

- เรียกผ่าน API: `GET /api/v1/invoices/:id/e-tax`
- ต้อง Post ใบแจ้งหนี้ก่อนถึงจะสร้าง e-Tax ได้
- รูปแบบตาม e-Tax Invoice ของกรมสรรพากร (Document Type Code: T02)
- ข้อมูลผู้ขาย (Seller) ดึงจาก Tenant/Firm settings
- ข้อมูลผู้ซื้อ (Buyer) ดึงจาก Contact (เลขประจำตัวผู้เสียภาษี, สาขา, ที่อยู่)

#### Invoice Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `customerId` | UUID | Yes | ID ลูกค้า (จาก Contacts) |
| `dueDate` | date | Yes | วันครบกำหนดชำระ |
| `notes` | string (max 2000) | No | หมายเหตุ |
| `lines[].description` | string | Yes | รายละเอียด |
| `lines[].quantity` | integer | Yes | จำนวน (จำนวนเต็ม) |
| `lines[].unitPriceSatang` | string (bigint) | Yes | ราคาต่อหน่วย (สตางค์) |
| `lines[].accountId` | UUID | No | บัญชีรายได้ (ถ้าไม่ระบุใช้ default) |

---

### 2.4 Payments / การรับชำระ

#### Payment Status Flow

```
unmatched ──→ matched
    │
    └──→ voided (+ reversal JE)
```

#### Payment Methods / วิธีชำระ

| Method | คำอธิบาย |
|---|---|
| `cash` | เงินสด |
| `bank_transfer` | โอนธนาคาร |
| `cheque` | เช็ค |
| `promptpay` | พร้อมเพย์ |

#### Step-by-Step: บันทึกรับชำระ

1. ไปที่ **Payments** (`/payments`) → กด **"+ New"**
2. กรอก:
   - **Amount** — จำนวนเงิน (สตางค์)
   - **Payment Date** — วันที่ชำระ
   - **Payment Method** — เลือกวิธีชำระ
   - **Customer** — (optional) เลือกลูกค้า
   - **Invoice** — (optional) เลือกใบแจ้งหนี้ที่จะ apply
   - **Reference** — เลขอ้างอิง (เช่น เลข slip)
3. กด **Save** — ระบบสร้าง JE อัตโนมัติ:

**GL Entry เมื่อรับชำระ:**
```
JE: AR payment received - PMT-2026-0001
┌──────────────────────┬──────────────┬──────────────┐
│ Account              │ Debit (฿)    │ Credit (฿)   │
├──────────────────────┼──────────────┼──────────────┤
│ 1010 Cash/Bank       │ amount       │              │
│ 1100 AR              │              │ amount       │
└──────────────────────┴──────────────┴──────────────┘
```

4. ถ้าเลือก Invoice — ระบบ match อัตโนมัติ + อัพเดทสถานะ Invoice
   - ชำระบางส่วน → Invoice status = `partial`
   - ชำระครบ (>= grandTotal) → Invoice status = `paid`

#### Step-by-Step: Match Payment กับหลาย Invoice

1. เลือก Payment ที่สถานะ `unmatched`
2. กด **Match** → เลือก Invoice(s) ที่ต้องการ apply
3. ระบบ **allocate ตามลำดับ**: invoice แรกได้ยอดเต็มก่อน แล้วค่อยส่งไป invoice ถัดไป
4. Payment status เปลี่ยนเป็น `matched`

#### Business Rules — Payment

- **ห้าม overpay**: จำนวนชำระต้อง <= ยอดคงค้าง (grandTotal - paidSatang)
- **ยอดคงค้างคำนวณจาก grandTotal** (subTotal + VAT 7%) ไม่ใช่แค่ subTotal
- **Void Payment** จะ reverse JE + อัพเดทสถานะ Invoice กลับ
- ต้องมีบัญชี Cash (1010*) และ AR (1100*) ในผังบัญชี ถึงจะบันทึกได้

---

## 3. AP — Accounts Payable / เจ้าหนี้การค้า

### 3.1 Overview

ระบบ AP จัดการวงจรค่าใช้จ่ายตั้งแต่บันทึกใบแจ้งหนี้ (Bill) จนถึงจ่ายชำระ (Bill Payment) รวมถึง 3-Way Matching กับ Purchase Order

**ผู้ใช้งาน:** พนักงานบัญชี (AP Clerk), ผู้อนุมัติจ่ายเงิน

### 3.2 Screens / หน้าจอ

| หน้าจอ | Path | คำอธิบาย |
|---|---|---|
| Bill List | `/bills` | รายการใบแจ้งหนี้จากผู้ขายทั้งหมด |
| Bill Detail | `/bills/[id]` | รายละเอียด Bill |
| New Bill | `/bills/new` | สร้าง Bill ใหม่ |
| Vendor List | `/vendors` | รายการผู้ขาย |
| Vendor Returns | `/vendor-returns` | ส่งคืนสินค้า |

### 3.3 Vendors / ผู้ขาย

#### Step-by-Step: สร้างผู้ขาย

1. ไปที่ **Vendors** (`/vendors`)
2. กด **"+ New Vendor"**
3. กรอก: Name (ชื่อ), Tax ID (เลขประจำตัวผู้เสียภาษี), Address
4. กด **Save**

| Field | Required | Description |
|---|---|---|
| `name` | Yes | ชื่อผู้ขาย (1-255 ตัวอักษร) |
| `taxId` | No | เลขประจำตัวผู้เสียภาษี (max 50) |
| `address` | No | ที่อยู่ (max 1000) |

- ค้นหาได้ด้วยชื่อหรือ Tax ID (search query)

---

### 3.4 Bills / ใบแจ้งหนี้จากผู้ขาย

#### Bill Status Flow

```
draft ──→ posted ──→ partial ──→ paid
  │          │
  └──→ voided └──→ voided
```

#### Step-by-Step: สร้างและจ่าย Bill

1. ไปที่ **Bills** (`/bills`) → กด **"+ New"**
2. เลือก **Vendor** และ **Due Date**
3. เพิ่ม **Line Items**:
   - Description — รายละเอียด
   - Amount — จำนวนเงิน (สตางค์)
   - Account — บัญชีค่าใช้จ่าย (ต้องระบุ)
4. กด **Save** (สถานะ: `draft`)
5. ตรวจสอบ → กด **Post** (สถานะ: `posted`)
6. กด **Pay** → สร้าง Bill Payment

#### Bill Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `vendorId` | UUID | Yes | ID ผู้ขาย |
| `dueDate` | date | Yes | วันครบกำหนดชำระ |
| `notes` | string | No | หมายเหตุ |
| `lines[].description` | string | Yes | รายละเอียด |
| `lines[].amountSatang` | string (bigint) | Yes | จำนวนเงิน (สตางค์) |
| `lines[].accountId` | UUID | Yes | บัญชีค่าใช้จ่าย/สินทรัพย์ |

#### Business Rules — Bill

- แก้ไขได้เฉพาะ Bill ที่สถานะ `draft`
- การ Update lines จะ **ลบ lines เดิมแล้วสร้างใหม่ทั้งหมด**
- Void ได้เฉพาะสถานะ `draft` หรือ `posted`

---

### 3.5 Bill Payments / การจ่ายชำระ

#### Step-by-Step: จ่ายชำระ Bill

1. เลือก Bill ที่สถานะ `posted`
2. กด **"Record Payment"**
3. กรอก:
   - **Amount** — จำนวนเงิน (สตางค์) — ต้อง <= ยอดคงค้าง
   - **Payment Date** — วันที่จ่าย
   - **Payment Method** — cash, bank_transfer, cheque, promptpay
   - **Reference** — เลขอ้างอิง
4. กด **Save**

| Scenario | Bill Status |
|---|---|
| จ่ายบางส่วน | `partial` |
| จ่ายครบ (paidSatang >= totalSatang) | `paid` |

#### Business Rules — Bill Payment

- **ห้ามจ่ายเกิน**: `currentPaid + paymentAmount <= totalSatang`
- Payment method: `cash`, `bank_transfer`, `cheque`, `promptpay`

---

### 3.6 Three-Way Matching / การตรวจสอบ 3 ทาง

#### Overview

3-Way Match เปรียบเทียบข้อมูลจาก 3 แหล่ง:
1. **Purchase Order (PO)** — สั่งซื้ออะไร จำนวนเท่าไหร่
2. **Goods Receipt (GR)** — รับสินค้าจริงเท่าไหร่
3. **Bill** — ผู้ขายแจ้งเก็บเงินเท่าไหร่

#### Match Status

| Status | ความหมาย |
|---|---|
| `matched` | PO/GR/Bill ตรงกัน — จ่ายได้ |
| `quantity_mismatch` | จำนวนรับ (GR) ไม่ตรงกับ PO |
| `price_mismatch` | ราคา Bill ไม่ตรงกับ PO |
| `unmatched` | Bill มี line ที่ไม่มีใน PO |
| `no_po` | Bill ไม่ได้เชื่อมกับ PO |
| `overridden` | ผู้มีอำนาจอนุมัติให้ผ่าน (override) |

#### Step-by-Step: ตรวจสอบ 3-Way Match

1. ไปที่ Bill Detail
2. กด **"Check Match Status"** — API: `GET /api/v1/ap/bills/:id/match-status`
3. ระบบเปรียบเทียบทีละ line ตาม line_number
4. แสดงผลลัพธ์: billAmount vs poAmount vs receivedQuantity
5. ถ้า mismatch → ผู้อนุมัติสามารถ **Override** ได้

---

## 4. FI-AA — Fixed Assets / สินทรัพย์ถาวร

### 4.1 Overview

ระบบสินทรัพย์ถาวร (FI-AA) จัดการสินทรัพย์ตั้งแต่ซื้อ คำนวณค่าเสื่อมราคา ไปจนถึงจำหน่ายสินทรัพย์

**ผู้ใช้งาน:** นักบัญชีสินทรัพย์, ผู้จัดการฝ่ายบัญชี

### 4.2 Screens / หน้าจอ

| หน้าจอ | Path | คำอธิบาย |
|---|---|---|
| Fixed Asset List | `/fixed-assets` | รายการสินทรัพย์ถาวรทั้งหมด |
| Asset Detail | `/fixed-assets/[id]` | รายละเอียดสินทรัพย์ |
| New Asset | `/fixed-assets/new` | ลงทะเบียนสินทรัพย์ใหม่ |

### 4.3 Asset Categories / หมวดสินทรัพย์

| Category | Thai | ตัวอย่าง |
|---|---|---|
| `land` | ที่ดิน | ที่ดินโรงงาน |
| `building` | อาคาร | สำนักงาน, คลังสินค้า |
| `equipment` | เครื่องจักร/อุปกรณ์ | เครื่อง CNC, เครื่องพิมพ์ |
| `vehicle` | ยานพาหนะ | รถบรรทุก, รถยนต์ |
| `furniture` | เฟอร์นิเจอร์ | โต๊ะ, เก้าอี้, ชั้นวาง |
| `it_equipment` | อุปกรณ์ IT | คอมพิวเตอร์, เซิร์ฟเวอร์ |
| `other` | อื่นๆ | — |

### 4.4 Asset Status Flow

```
active ──→ disposed
   │
   └──→ written_off
```

### 4.5 Depreciation Methods / วิธีคิดค่าเสื่อมราคา

| Method | สูตร | ใช้กับ |
|---|---|---|
| `straight_line` | (Cost - Salvage) / usefulLifeMonths | สินทรัพย์ทั่วไป |
| `declining_balance` | 2 / usefulLifeMonths * NBV | สินทรัพย์ที่เสื่อมเร็วช่วงแรก |

### 4.6 Step-by-Step: ลงทะเบียนสินทรัพย์

1. ไปที่ **Fixed Assets** (`/fixed-assets`) → กด **"+ New"**
2. กรอกข้อมูล:
   - **Asset Code** — รหัสสินทรัพย์ (ต้องไม่ซ้ำ)
   - **Name (TH/EN)** — ชื่อ
   - **Category** — หมวดสินทรัพย์
   - **Purchase Date** — วันที่ซื้อ
   - **Purchase Cost** — ราคาซื้อ (สตางค์)
   - **Salvage Value** — มูลค่าซาก (default: 0)
   - **Useful Life** — อายุการใช้งาน (เดือน)
   - **Depreciation Method** — วิธีคิดค่าเสื่อม
   - **GL Account** — (optional) บัญชีสินทรัพย์ใน CoA
   - **Depreciation Account** — (optional) บัญชีค่าเสื่อมราคา
3. กด **Save**

#### Business Rules

- Salvage Value ต้อง <= Purchase Cost
- Asset Code ต้องไม่ซ้ำภายใน tenant
- Net Book Value (NBV) เริ่มต้น = Cost - Salvage

### 4.7 Step-by-Step: คิดค่าเสื่อมราคาประจำเดือน

1. เลือกสินทรัพย์ที่ต้องการ (สถานะ `active`)
2. กด **"Run Depreciation"** → ระบุ Period Date
3. ระบบคำนวณค่าเสื่อมและสร้าง JE:

**GL Entry — Monthly Depreciation:**
```
JE: Monthly depreciation: EQ-001 (2026-03-31)
┌─────────────────────────────┬──────────┬──────────┐
│ Account                     │ Debit    │ Credit   │
├─────────────────────────────┼──────────┼──────────┤
│ 5500 Depreciation Expense   │ amount   │          │
│ 1500 Accumulated Depr.      │          │ amount   │
└─────────────────────────────┴──────────┴──────────┘
```

- ถ้าสินทรัพย์หมดค่าเสื่อมแล้ว → Error: "Asset is fully depreciated"
- Cap: ค่าเสื่อมจะไม่เกินยอดที่เหลือ (Cost - Salvage - AccumDepr)

### 4.8 Step-by-Step: จำหน่ายสินทรัพย์ (Dispose)

1. เลือกสินทรัพย์ที่ต้องการจำหน่าย (สถานะ `active`)
2. กด **"Dispose"**
3. กรอก: Disposal Date, Disposal Amount (ราคาขาย), Reason
4. ระบบคำนวณ **Gain/Loss** = ราคาขาย - NBV
5. สร้าง JE อัตโนมัติ:

**GL Entry — Asset Disposal (Gain):**
```
JE: Disposal of asset: EQ-001
┌─────────────────────────────┬──────────┬──────────┐
│ Account                     │ Debit    │ Credit   │
├─────────────────────────────┼──────────┼──────────┤
│ [GL Account] Fixed Asset    │          │ Cost     │
│ [Depr Account] Accum Depr   │ accumDep │          │
│ [GL Account] Gain on disp.  │          │ gain     │
└─────────────────────────────┴──────────┴──────────┘
```

### 4.9 Asset Register Report

- API: `GET /api/v1/fixed-assets/report`
- Web: `/reports/fixed-asset-register` (ในส่วน Reports)
- แสดงสรุปตามหมวด: จำนวน, ต้นทุนรวม, ค่าเสื่อมสะสม, NBV รวม

---

## 5. FI-BL — Bank & Reconciliation / ธนาคารและกระทบยอด

### 5.1 Overview

ระบบจัดการบัญชีธนาคาร นำเข้า statement กระทบยอดกับ GL อัตโนมัติ

**ผู้ใช้งาน:** นักบัญชี, ผู้จัดการฝ่ายบัญชี

### 5.2 Screens / หน้าจอ

| หน้าจอ | Path | คำอธิบาย |
|---|---|---|
| Bank Account List | `/bank` | รายการบัญชีธนาคาร |
| Bank Detail | `/bank/[id]` | รายละเอียด + รายการล่าสุด |
| Bank Matching | `/bank/matching` | กระทบยอดอัตโนมัติ |

### 5.3 Step-by-Step: สร้างบัญชีธนาคาร

1. ไปที่ **Bank** (`/bank`) → กด **"+ New Account"**
2. กรอก:
   - **Account Name** — ชื่อบัญชี (เช่น "บัญชีออมทรัพย์ KBank")
   - **Account Number** — เลขที่บัญชี
   - **Bank Name** — ชื่อธนาคาร
   - **GL Account** — (optional) เชื่อมกับบัญชี GL
   - **Currency** — สกุลเงิน (default: THB)
3. กด **Save**

### 5.4 Step-by-Step: เพิ่ม Transaction ด้วยมือ

1. เข้า Bank Detail → กด **"+ Transaction"**
2. กรอก: Date, Description, Debit/Credit amount, Reference
3. ระบบอัพเดท running balance อัตโนมัติ (balance += credit - debit)

### 5.5 Step-by-Step: นำเข้า Bank Statement (CSV)

1. เข้า Bank Detail → กด **"Import CSV"**
2. อัพโหลดไฟล์ CSV รูปแบบ:
   ```
   date,description,debit,credit,reference
   2026-01-15,รับโอน ABC,0,50000,REF001
   2026-01-16,จ่ายค่าไฟ,3500,0,ELC-2026
   ```
3. ระบบ import ทีละรายการ + update balance
4. แสดงผลลัพธ์: imported / skipped count

### 5.6 Step-by-Step: กระทบยอดด้วยมือ (Manual Reconcile)

1. ไปที่ Bank Detail → Reconciliation section
2. ดูรายการ **Unreconciled Transactions**
3. เลือก Transaction → กด **"Match to JE"**
4. เลือก Journal Entry ที่ต้องการจับคู่
5. Transaction เปลี่ยนสถานะเป็น `reconciled`

### 5.7 Auto-Reconcile / กระทบยอดอัตโนมัติ

#### Matching Rule Types

| Type | คำอธิบาย | ตัวอย่าง |
|---|---|---|
| `exact_amount` | จับคู่ตามจำนวนเงินตรง | pattern: "5000000" (50,000 บาท) |
| `reference` | จับคู่ตาม reference/description | pattern: "ค่าเช่า" |
| `amount_range` | จับคู่ตามช่วงจำนวนเงิน | min: 100000, max: 200000 |

#### Step-by-Step: ตั้งค่า Auto-Reconcile

1. ไปที่ **Bank Matching** (`/bank/matching`)
2. สร้าง **Matching Rule**:
   - Match Type — exact_amount / reference / amount_range
   - Pattern — ข้อความ/จำนวนที่ต้องการจับคู่
   - Target Account — บัญชี GL ที่ต้องการ map
   - Priority — ลำดับความสำคัญ (ตัวเลขน้อย = ทำก่อน)
3. กด **"Run Auto-Reconcile"** — ระบบทำงาน:
   - โหลด unreconciled transactions (max 200 per batch)
   - ทดสอบแต่ละ rule ตามลำดับ priority
   - สร้าง JE + reconcile อัตโนมัติ
4. แสดงผลลัพธ์: matched / unmatched / suggested count

#### Reconciliation Report

- API: `GET /api/v1/bank-accounts/:id/reconciliation`
- แสดง: unreconciled count, total debit/credit, รายการที่ยังไม่ได้กระทบยอด

---

## 6. WHT — Withholding Tax / ภาษีหัก ณ ที่จ่าย

### 6.1 Overview

ระบบจัดการใบหัก ณ ที่จ่าย (ภ.ง.ด.3 สำหรับบุคคลธรรมดา / ภ.ง.ด.53 สำหรับนิติบุคคล) และ 50 ทวิ (หนังสือรับรองหัก ณ ที่จ่ายประจำปี)

**ผู้ใช้งาน:** พนักงานบัญชี, ฝ่ายภาษี

### 6.2 Screens / หน้าจอ

| หน้าจอ | Path | คำอธิบาย |
|---|---|---|
| WHT Certificate List | `/wht` | รายการใบหัก ณ ที่จ่ายทั้งหมด |
| WHT Detail | `/wht/[id]` | รายละเอียดใบหัก ณ ที่จ่าย |
| New WHT | `/wht/new` | สร้างใบหัก ณ ที่จ่ายใหม่ |
| Annual Certificate | `/wht/annual-certificate` | 50 ทวิ — หนังสือรับรองประจำปี |

### 6.3 Certificate Types / ประเภทใบหัก ณ ที่จ่าย

| Type | Thai | ใช้กับ |
|---|---|---|
| `pnd3` | ภ.ง.ด.3 | บุคคลธรรมดา (Tax ID ไม่ขึ้นต้นด้วย '0') |
| `pnd53` | ภ.ง.ด.53 | นิติบุคคล (Tax ID ขึ้นต้นด้วย '0') |

### 6.4 WHT Status Flow

```
draft ──→ issued ──→ filed
  │          │
  └──→ voided └──→ voided
```

> **ห้าม void ใบที่ filed แล้ว** (ยื่นกรมสรรพากรแล้ว)

### 6.5 Step-by-Step: สร้างใบหัก ณ ที่จ่าย

1. ไปที่ **WHT** (`/wht`) → กด **"+ New"**
2. กรอกข้อมูล:

   **ข้อมูลผู้จ่าย (Payer):**
   - Payer Name — ชื่อบริษัท/ผู้จ่าย
   - Payer Tax ID — เลข 13 หลัก

   **ข้อมูลผู้รับ (Payee):**
   - Payee Name — ชื่อผู้รับเงิน
   - Payee Tax ID — เลข 13 หลัก
   - Payee Address — ที่อยู่

   **ข้อมูลเงินได้:**
   - Certificate Type — `pnd3` หรือ `pnd53`
   - Income Type — ประเภทเงินได้ (เช่น "40(2)")
   - Income Description — รายละเอียด
   - Payment Date — วันที่จ่ายเงิน
   - Income Amount — เงินได้ (สตางค์)
   - WHT Rate — อัตราหัก (basis points, เช่น 300 = 3%)
   - Tax Month/Year — เดือน/ปีภาษี

3. กด **Save** — สถานะ: `draft`

**การคำนวณภาษีหัก ณ ที่จ่าย:**
```
WHT Amount = Income Amount * WHT Rate / 10000 (round half-up)
ตัวอย่าง: 100,000 บาท * 300bp = 3,000 บาท
```

### 6.6 WHT Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `certificateType` | enum | Yes | `pnd3` หรือ `pnd53` |
| `payerName` | string | Yes | ชื่อผู้จ่าย |
| `payerTaxId` | string (13 digits) | Yes | เลขผู้เสียภาษี (ผู้จ่าย) |
| `payeeName` | string | Yes | ชื่อผู้รับเงิน |
| `payeeTaxId` | string (13 digits) | Yes | เลขผู้เสียภาษี (ผู้รับ) |
| `payeeAddress` | string | Yes | ที่อยู่ผู้รับ |
| `incomeType` | string | Yes | ประเภทเงินได้ |
| `incomeAmountSatang` | string (bigint) | Yes | จำนวนเงินได้ (สตางค์) |
| `whtRateBasisPoints` | integer (1-10000) | Yes | อัตราหักภาษี (basis points) |
| `taxMonth` | integer (1-12) | Yes | เดือนภาษี |
| `taxYear` | integer | Yes | ปีภาษี |
| `billPaymentId` | UUID | No | เชื่อมกับ Bill Payment |

### 6.7 Business Rules — WHT

- **Auto-validate type**: ถ้า Tax ID ขึ้นต้นด้วย '0' (นิติบุคคล) ต้องเป็น `pnd53` เท่านั้น
- **Issue**: เปลี่ยนจาก draft → issued (ออกใบจริง)
- **File**: เปลี่ยนจาก issued → filed (ยื่นกรมสรรพากรแล้ว)
- **Void**: ได้เฉพาะ draft และ issued (filed ห้ามยกเลิก)

### 6.8 WHT Summary / สรุปภาษีหัก ณ ที่จ่าย

- API: `GET /api/v1/wht-certificates/summary`
- กรองตาม: taxYear, taxMonth, certificateType
- แสดง: จำนวนใบ, รวมเงินได้, รวมภาษีหัก — จัดกลุ่มตามเดือน/ประเภท
- ใช้สำหรับจัดทำ ภ.ง.ด.3/53 รายเดือน

### 6.9 50 ทวิ — Annual Tax Certificate / หนังสือรับรองประจำปี

- API: `POST /api/v1/wht/annual-certificate`
- Web: `/wht/annual-certificate`
- ระบุ: Employee ID + Tax Year
- ระบบ aggregate ยอดจาก Payroll (gross income + personal income tax) ทั้งปี
- แสดงข้อมูล: ผู้จ่าย (บริษัท), ผู้รับ (พนักงาน), รายละเอียดรายเดือน, รวมเงินได้/ภาษี

---

## 7. Tax & VAT / อัตราภาษีและ VAT Return

### 7.1 Tax Rates / อัตราภาษี

#### Screens

| หน้าจอ | Path | คำอธิบาย |
|---|---|---|
| Tax Settings | `/settings/tax` | ตั้งค่าอัตราภาษี VAT/WHT |

#### Step-by-Step: ตั้งค่าอัตราภาษี

1. ไปที่ **Settings > Tax** (`/settings/tax`)
2. กด **"+ New Tax Rate"**
3. กรอก:
   - **Tax Type** — `vat` หรือ `wht`
   - **Rate (Basis Points)** — เช่น 700 = VAT 7%, 300 = WHT 3%
   - **Income Type** — (optional สำหรับ WHT) ประเภทเงินได้
   - **Effective From** — วันที่มีผล
4. กด **Save**

| Field | Required | Description |
|---|---|---|
| `taxType` | Yes | `vat` หรือ `wht` |
| `rateBasisPoints` | Yes | อัตราภาษี (basis points) |
| `incomeType` | No | ประเภทเงินได้ (WHT) |
| `effectiveFrom` | Yes | วันที่มีผลบังคับใช้ |

> **Default VAT Rate**: nEIP ใช้ 7% (700 basis points) เป็น hardcoded ใน Invoice/AR

### 7.2 VAT Return Report / รายงาน ภ.พ.30

- Web: `/reports/vat-return`
- แสดงสรุป VAT สำหรับการยื่น ภ.พ.30 ต่อกรมสรรพากร

---

## 8. Recurring Journal Entries / รายการบันทึกอัตโนมัติ

### 8.1 Overview

สร้างแม่แบบ (Template) สำหรับรายการ JE ที่เกิดซ้ำ เช่น ค่าเช่ารายเดือน ค่าเสื่อมราคา ปรับปรุงรายการ

### 8.2 Screens

| หน้าจอ | Path | คำอธิบาย |
|---|---|---|
| Recurring JE List | `/recurring-je` | รายการแม่แบบทั้งหมด |

### 8.3 Frequency / ความถี่

| Frequency | คำอธิบาย |
|---|---|
| `monthly` | ทุกเดือน |
| `quarterly` | ทุก 3 เดือน |
| `annually` | ทุกปี |

### 8.4 Step-by-Step: สร้างและ Run Template

1. ไปที่ **Recurring JE** (`/recurring-je`) → กด **"+ New Template"**
2. กรอก:
   - **Description** — คำอธิบาย (เช่น "ค่าเช่าสำนักงาน")
   - **Frequency** — monthly / quarterly / annually
   - **Next Run Date** — วันที่จะ execute ครั้งถัดไป
   - **Lines** — รายการ Dr/Cr (ต้อง balance)
3. กด **Save**
4. เมื่อถึงวันที่ → กด **"Run"** (หรือ API: `POST /api/v1/recurring-je/run`)
5. ระบบสร้าง JE แบบ posted อัตโนมัติ + เลื่อน nextRunDate

#### Business Rules

- Lines ต้อง balance (totalDebit = totalCredit, > 0)
- Run ได้เฉพาะ template ที่ `isActive = true` และ `nextRunDate <= today`
- Max 50 templates per batch run (rate limit: 5 runs/minute)
- Delete = soft-deactivate (`isActive = false`)

---

## 9. Financial Reports / รายงานทางการเงิน

### 9.1 Available Reports / รายงานที่มี

| Report | Path | คำอธิบาย |
|---|---|---|
| **Balance Sheet** | `/reports/balance-sheet` | งบดุล — สินทรัพย์ = หนี้สิน + ส่วนของเจ้าของ |
| **Income Statement** | `/reports/income-statement` | งบกำไรขาดทุน |
| **P&L** | `/reports/pnl` | กำไรขาดทุนเปรียบเทียบ |
| **Trial Balance** | `/reports/trial-balance` | งบทดลอง |
| **Budget Variance** | `/reports/budget-variance` | งบประมาณ vs จริง |
| **Equity Changes** | `/reports/equity-changes` | งบแสดงการเปลี่ยนแปลงส่วนของเจ้าของ |
| **Cash Flow** | `/reports/cash-flow` | งบกระแสเงินสด |
| **AR Aging** | `/reports/ar-aging` | รายงานอายุลูกหนี้ |
| **AP Aging** | `/reports/ap-aging` | รายงานอายุเจ้าหนี้ |
| **VAT Return** | `/reports/vat-return` | รายงาน ภ.พ.30 |
| **SSC Filing** | `/reports/ssc-filing` | รายงานประกันสังคม |
| **Custom Reports** | `/reports/custom` | รายงานที่กำหนดเอง |

### 9.2 Report Parameters / พารามิเตอร์

รายงานส่วนใหญ่รับ query parameters:

| Parameter | Type | Description |
|---|---|---|
| `fiscalYear` | integer | ปีบัญชี |
| `period` | integer (1-12) | งวดบัญชี |
| `asOfDate` | date | วันที่ ณ วันที่ (สำหรับ Balance Sheet) |

### 9.3 Money Format / รูปแบบตัวเลข

ทุกจำนวนเงินในรายงานใช้ Money Value Object:
```json
{
  "amountSatang": "10700000",
  "currency": "THB"
}
```
- 1 บาท = 100 สตางค์
- ตัวอย่าง: 107,000 บาท = "10700000" สตางค์

---

## Common Errors & Solutions / ข้อผิดพลาดที่พบบ่อย

| Error | สาเหตุ | แก้ไข |
|---|---|---|
| `Debits and credits must balance` | ยอด Dr ไม่เท่า Cr | ตรวจสอบจำนวนเงินทุก line |
| `Fiscal period is closed` | งวดบัญชีปิดแล้ว | Reopen period ก่อน หรือใช้งวดอื่น |
| `Account not found in CoA` | บัญชีไม่อยู่ในผังหรือ inactive | ตรวจสอบ account ID / สร้างบัญชีใหม่ |
| `Account is referenced by JE lines` | ลบบัญชีที่มีรายการ | Deactivate แทนลบ |
| `Overpayment` | ชำระเกินยอดคงค้าง | ตรวจสอบยอดรวม VAT (grandTotal) |
| `Invoice has payments — void payments first` | Void invoice ที่มี payment | Void payment ก่อน แล้ว void invoice |
| `Cannot post: AR/Revenue/VAT account not found` | ไม่มีบัญชี 1100/4000/2110 | สร้างบัญชีเหล่านี้ใน CoA ก่อน |
| `Cannot record payment: no Cash and AR accounts` | ไม่มีบัญชี 1010/1100 | สร้างบัญชี Cash (1010) และ AR (1100) |
| `Asset is fully depreciated` | สินทรัพย์หมดค่าเสื่อมแล้ว | ไม่ต้องคิดค่าเสื่อมเพิ่ม |
| `Filed certificates cannot be voided` | Void WHT ที่ filed แล้ว | ไม่สามารถทำได้ — ต้องยื่นเพิ่มเติม |
| `Certificate type mismatch` | pnd3/pnd53 ไม่ตรงกับ Tax ID | Tax ID ขึ้นต้น '0' ต้องใช้ pnd53 |

---

## Tips & Best Practices / คำแนะนำ

### Chart of Accounts
- วางผังบัญชีให้ครบตั้งแต่เริ่ม: 1010 Cash, 1100 AR, 2100 AP, 2110 VAT Payable, 3200 Retained Earnings, 4000 Revenue, 5100 COGS, 5500 Depreciation
- ใช้ Parent-Child structure เพื่อจัดกลุ่มบัญชี

### Journal Entries
- ใช้ `X-Idempotency-Key` header เสมอเมื่อสร้าง JE ผ่าน API เพื่อป้องกันรายการซ้ำ
- ปิดงวดทันทีเมื่อทำงานเสร็จ เพื่อป้องกันการแก้ไขย้อนหลัง

### Invoices & Payments
- Post Invoice ก่อน collect payment เพื่อให้ JE ถูกต้อง
- ยอดชำระเทียบกับ **grandTotal** (รวม VAT) ไม่ใช่แค่ subTotal

### Fixed Assets
- ตั้ง GL Account และ Depreciation Account ให้สินทรัพย์ตั้งแต่ลงทะเบียน เพื่อให้ JE ถูกบัญชี
- Run depreciation ทุกสิ้นเดือน (ใช้ Recurring JE ช่วยได้)

### Bank Reconciliation
- Import statement ทุกวัน/ทุกสัปดาห์ เพื่อ reconcile ทัน
- ตั้ง Matching Rules ให้ครอบคลุมรายการประจำ (ค่าเช่า, เงินเดือน)

### WHT
- ตรวจสอบ Tax ID format ก่อนสร้างใบ — ป้องกัน type mismatch
- ทำ summary report ทุกเดือนเพื่อเตรียมยื่น ภ.ง.ด.3/53

### Year-End
- ปิดทุก 12 งวดก่อน → Close Year → ระบบสร้าง Closing JE ให้อัตโนมัติ
- ถ้ามีข้อผิดพลาด สามารถ Reopen Year แก้ไข แล้ว Close ใหม่ได้
