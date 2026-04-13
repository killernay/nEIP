# nEIP Operations Manual — Sales, Procurement, HR, Payroll, Inventory & Controlling
# คู่มือการใช้งาน nEIP — ระบบขาย จัดซื้อ ทรัพยากรบุคคล เงินเดือน สินค้าคงคลัง และ Controlling

> **Version / เวอร์ชัน:** 0.9.0  
> **Last updated / อัปเดตล่าสุด:** 2026-04-12  
> **Audience / กลุ่มเป้าหมาย:** Sales, Procurement, HR, Warehouse, and Operations staff  

---

## Table of Contents / สารบัญ

1. [Sales & Distribution (SD) — ระบบขาย](#1-sales--distribution-sd--ระบบขาย)
   - 1.1 [Quotations — ใบเสนอราคา](#11-quotations--ใบเสนอราคา)
   - 1.2 [Sales Orders — ใบสั่งขาย](#12-sales-orders--ใบสั่งขาย)
   - 1.3 [Delivery Notes — ใบส่งของ](#13-delivery-notes--ใบส่งของ)
   - 1.4 [DO to Invoice Conversion — แปลง DO เป็นใบแจ้งหนี้](#14-do-to-invoice-conversion--แปลง-do-เป็นใบแจ้งหนี้)
   - 1.5 [Pricing Engine — ระบบราคา](#15-pricing-engine--ระบบราคา)
   - 1.6 [Payment Terms — เงื่อนไขการชำระ](#16-payment-terms--เงื่อนไขการชำระ)
   - 1.7 [Dunning — ติดตามหนี้](#17-dunning--ติดตามหนี้)
   - 1.8 [Credit Management — บริหารวงเงินเครดิต](#18-credit-management--บริหารวงเงินเครดิต)
2. [CRM — Contacts / ระบบผู้ติดต่อ](#2-crm--contacts--ระบบผู้ติดต่อ)
3. [Procurement (MM) — ระบบจัดซื้อ](#3-procurement-mm--ระบบจัดซื้อ)
   - 3.1 [Purchase Requisitions — ใบขอซื้อ](#31-purchase-requisitions--ใบขอซื้อ)
   - 3.2 [RFQ — ใบขอใบเสนอราคา](#32-rfq--ใบขอใบเสนอราคา)
   - 3.3 [Purchase Orders — ใบสั่งซื้อ](#33-purchase-orders--ใบสั่งซื้อ)
   - 3.4 [Goods Receipt — รับสินค้า](#34-goods-receipt--รับสินค้า)
   - 3.5 [PO to Bill Conversion — แปลง PO เป็นใบวางบิล](#35-po-to-bill-conversion--แปลง-po-เป็นใบวางบิล)
   - 3.6 [Vendor Returns — ส่งคืนผู้ขาย](#36-vendor-returns--ส่งคืนผู้ขาย)
4. [Inventory Management (MM-IM) — สินค้าคงคลัง](#4-inventory-management-mm-im--สินค้าคงคลัง)
   - 4.1 [Products — สินค้า](#41-products--สินค้า)
   - 4.2 [Warehouses — คลังสินค้า](#42-warehouses--คลังสินค้า)
   - 4.3 [Stock Movements — ความเคลื่อนไหวสินค้า](#43-stock-movements--ความเคลื่อนไหวสินค้า)
   - 4.4 [Stock Levels — ยอดคงเหลือ](#44-stock-levels--ยอดคงเหลือ)
   - 4.5 [Stock Counts — ตรวจนับสต็อก](#45-stock-counts--ตรวจนับสต็อก)
   - 4.6 [Batch & Serial Tracking — ติดตาม Lot/Serial](#46-batch--serial-tracking--ติดตาม-lotserial)
   - 4.7 [Valuation & Low Stock — มูลค่าสินค้าและแจ้งเตือน](#47-valuation--low-stock--มูลค่าสินค้าและแจ้งเตือน)
5. [Human Resources (HR) — ทรัพยากรบุคคล](#5-human-resources-hr--ทรัพยากรบุคคล)
   - 5.1 [Departments — แผนก](#51-departments--แผนก)
   - 5.2 [Positions — ตำแหน่ง](#52-positions--ตำแหน่ง)
   - 5.3 [Employees — พนักงาน](#53-employees--พนักงาน)
   - 5.4 [Attendance — ลงเวลาทำงาน](#54-attendance--ลงเวลาทำงาน)
   - 5.5 [Leave Management — ระบบลา](#55-leave-management--ระบบลา)
6. [Payroll (HR-PY) — ระบบเงินเดือน](#6-payroll-hr-py--ระบบเงินเดือน)
7. [Controlling (CO) — ระบบ Controlling](#7-controlling-co--ระบบ-controlling)
   - 7.1 [Cost Centers — ศูนย์ต้นทุน](#71-cost-centers--ศูนย์ต้นทุน)
   - 7.2 [Profit Centers — ศูนย์กำไร](#72-profit-centers--ศูนย์กำไร)
8. [End-to-End Process Flows — ขั้นตอนทำงานครบวงจร](#8-end-to-end-process-flows--ขั้นตอนทำงานครบวงจร)
9. [Manufacturing (PP) — ระบบการผลิต](#9-manufacturing-pp--ระบบการผลิต)
10. [Plant Maintenance (PM) — ระบบบำรุงรักษา](#10-plant-maintenance-pm--ระบบบำรุงรักษา)
11. [Service Procurement — ใบรับงานบริการ](#11-service-procurement--ใบรับงานบริการ)
12. [EWM — Extended Warehouse Management](#12-ewm--extended-warehouse-management--การจัดการคลังสินค้าขั้นสูง)
13. [Purchasing Advanced — จัดซื้อขั้นสูง](#13-purchasing-advanced--จัดซื้อขั้นสูง)
14. [PP Advanced — การผลิตขั้นสูง](#14-pp-advanced--การผลิตขั้นสูง)

---

## 1. Sales & Distribution (SD) — ระบบขาย

### 1.1 Quotations — ใบเสนอราคา

**Web UI:** `/quotations` (list), `/quotations/new` (create), `/quotations/[id]` (detail)

#### Overview / ภาพรวม

ใบเสนอราคาคือจุดเริ่มต้นของกระบวนการขาย สามารถแปลงเป็นใบสั่งขาย (SO) หรือใบแจ้งหนี้ (Invoice) ได้โดยตรง

The quotation is the starting point of the sales process. It can be converted to a Sales Order (SO) or directly to an Invoice.

#### Status Transitions / สถานะเอกสาร

```
draft → sent → approved → converted
              → rejected
```

| From | To | Action | Permission |
|------|-----|--------|-----------|
| draft | sent | Send / ส่ง | `ar:quotation:send` |
| sent | approved | Approve / อนุมัติ | `ar:quotation:approve` |
| sent | rejected | Reject / ปฏิเสธ | `ar:quotation:approve` |
| approved | converted | Convert to SO | `ar:so:create` |
| approved | converted | Convert to Invoice (shortcut) | `ar:quotation:convert` |
| any | draft (new) | Duplicate / ทำสำเนา | `ar:quotation:create` |

#### Step-by-Step: Create Quotation / ขั้นตอนสร้างใบเสนอราคา

1. Navigate to **Quotations > New** (`/quotations/new`)
2. Fill in required fields:
   - **Customer / ลูกค้า** (`customerId`, `customerName`) — required
   - **Subject / หัวข้อ** — max 500 characters
   - **Valid Until / ใช้ได้ถึง** — date format YYYY-MM-DD
   - **Notes / หมายเหตุ** — max 2,000 characters (optional)
3. Add line items (at least 1):
   - **Description / รายการ** — required, max 500 chars
   - **Quantity / จำนวน** — integer, minimum 1
   - **Unit Price (satang) / ราคาต่อหน่วย** — string format, in satang (100 satang = 1 THB)
   - **Account ID / บัญชี** — optional revenue account
4. Click **Save** — system generates document number (format: `QT-YYYY-XXXX`)
5. System auto-calculates `totalSatang` = sum of (qty × unitPrice) per line

#### Step-by-Step: Convert QT to Sales Order / แปลงเป็นใบสั่งขาย

1. Open an **approved** quotation
2. Click **Convert to Order** (`POST /quotations/:id/convert-to-order`)
3. System creates a new Sales Order (status: `draft`) with:
   - All line items copied from quotation
   - `quotationId` linked
   - Quotation status changes to `converted`

#### Field Reference / อ้างอิงฟิลด์

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `customerId` | string | Yes | Contact UUID / รหัสลูกค้า |
| `customerName` | string | Yes | ชื่อลูกค้า (max 200) |
| `subject` | string | Yes | หัวข้อใบเสนอราคา (max 500) |
| `validUntil` | date | Yes | วันหมดอายุ (YYYY-MM-DD) |
| `notes` | string | No | หมายเหตุ (max 2,000) |
| `lines[].description` | string | Yes | รายละเอียดรายการ (max 500) |
| `lines[].quantity` | integer | Yes | จำนวน (min 1) |
| `lines[].unitPriceSatang` | string | Yes | ราคาต่อหน่วย (satang) |
| `lines[].accountId` | string | No | รหัสบัญชีรายได้ |

#### Business Rules / กฎทางธุรกิจ

- Only `draft` quotations can be edited / แก้ไขได้เฉพาะสถานะ draft
- Only `sent` quotations can be approved/rejected / อนุมัติ/ปฏิเสธได้เฉพาะสถานะ sent
- Only `approved` quotations can be converted / แปลงได้เฉพาะสถานะ approved
- Duplicate creates a new `draft` from any quotation status / ทำสำเนาได้จากทุกสถานะ
- Document numbering is auto-generated per tenant per fiscal year

#### Common Errors / ข้อผิดพลาดที่พบบ่อย

| Error | Cause | Solution |
|-------|-------|----------|
| `409 Conflict` | Quotation not in correct status for action | Check current status before acting |
| `404 Not Found` | Invalid quotation ID or wrong tenant | Verify the quotation exists |
| `400 Validation` | Missing required fields | Ensure all required fields are filled |

---

### 1.2 Sales Orders — ใบสั่งขาย

**Web UI:** `/sales-orders` (list), `/sales-orders/new` (create), `/sales-orders/[id]` (detail)

#### Status Transitions / สถานะเอกสาร

```
draft → confirmed → partial_delivered → delivered
                                       → cancelled
draft → cancelled
confirmed → cancelled
```

| From | To | Action | Permission |
|------|-----|--------|-----------|
| draft | confirmed | Confirm / ยืนยัน | `ar:so:confirm` |
| draft, confirmed | cancelled | Cancel / ยกเลิก | `ar:so:confirm` |

> **Note:** `partial_delivered` and `delivered` are set automatically by the Delivery Note process.

#### Step-by-Step: Create Sales Order / ขั้นตอนสร้างใบสั่งขาย

1. Navigate to **Sales Orders > New** (`/sales-orders/new`) or convert from QT
2. Fill in required fields:
   - **Customer / ลูกค้า** (`customerId`, `customerName`)
   - **Order Date / วันที่สั่ง** (YYYY-MM-DD)
   - **Expected Delivery Date / วันที่คาดว่าจะส่ง** (optional)
   - **Quotation ID / อ้างอิง QT** (optional, auto-filled when converting)
   - **Notes / หมายเหตุ** (optional, max 2,000)
3. Add line items (at least 1):
   - **Description / รายการ** — required, max 500 chars
   - **Quantity / จำนวน** — decimal, min 0.01
   - **Unit Price (satang) / ราคาต่อหน่วย** — string
   - **Account ID / บัญชี** — optional revenue account
4. Click **Save** — document number generated as `SO-YYYY-XXXX`
5. Click **Confirm** to move from draft → confirmed

#### Field Reference / อ้างอิงฟิลด์

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `customerId` | string | Yes | รหัสลูกค้า |
| `customerName` | string | Yes | ชื่อลูกค้า (max 255) |
| `orderDate` | date | Yes | วันที่สั่งซื้อ |
| `expectedDeliveryDate` | date | No | วันที่คาดส่ง |
| `quotationId` | string | No | อ้างอิงใบเสนอราคา |
| `notes` | string | No | หมายเหตุ (max 2,000) |
| `lines[].description` | string | Yes | รายละเอียด (max 500) |
| `lines[].quantity` | number | Yes | จำนวน (min 0.01) |
| `lines[].unitPriceSatang` | string | Yes | ราคาต่อหน่วย (satang) |
| `lines[].accountId` | string | No | รหัสบัญชีรายได้ |

#### Business Rules / กฎทางธุรกิจ

- Only `draft` SOs can be updated / แก้ไขได้เฉพาะสถานะ draft
- Cancel allowed from `draft` or `confirmed` (not after delivery starts)
- Each SO line tracks `deliveredQuantity` — updated by Delivery Notes
- Total is auto-calculated: sum of (quantity × unitPriceSatang) per line, using BigInt arithmetic
- Amount calculation: `qty × 10000 → BigInt`, `price → BigInt`, `amount = (qty × price) / 10000`

---

### 1.3 Delivery Notes — ใบส่งของ

**Web UI:** `/delivery-notes` (list), `/delivery-notes/new` (create), `/delivery-notes/[id]` (detail)

#### Status Transitions / สถานะเอกสาร

```
draft → delivered → (convert to invoice)
      → cancelled
```

#### Step-by-Step: Create Delivery Note / ขั้นตอนสร้างใบส่งของ

1. Navigate to **Delivery Notes > New** (`/delivery-notes/new`)
2. Select the **Sales Order** — must be in `confirmed` or `partial_delivered` status
3. Fill in:
   - **Customer / ลูกค้า** (`customerId`, `customerName`)
   - **Delivery Date / วันที่ส่ง** (YYYY-MM-DD)
   - **Notes / หมายเหตุ** (optional)
4. Add delivery lines (at least 1):
   - **SO Line ID** — reference to sales order line
   - **Description / รายการ**
   - **Quantity Delivered / จำนวนที่ส่ง** — min 0.01
   - **Product ID / รหัสสินค้า** — optional, for stock tracking
   - **Warehouse ID / รหัสคลัง** — optional, for stock tracking
5. Click **Save** — document number generated as `DN-YYYY-XXXX`

#### Step-by-Step: Mark as Delivered / บันทึกการส่งสินค้า

1. Open a `draft` Delivery Note
2. Click **Deliver** (`POST /delivery-notes/:id/deliver`)
3. System performs the following automatically:
   - **Stock Check:** If product + warehouse are specified, validates `quantity_on_hand >= quantityDelivered`
   - **Stock Deduction:** Creates `stock_movement` (type: `issue`) and updates `stock_levels` (decrease on_hand and available)
   - **SO Line Update:** Increases `delivered_quantity` on each referenced SO line
   - **SO Status Recalculation:**
     - If all lines fully delivered → SO status = `delivered`
     - If some lines partially delivered → SO status = `partial_delivered`
     - Otherwise stays `confirmed`

#### Business Rules / กฎทางธุรกิจ

- SO must be `confirmed` or `partial_delivered` to create a DO
- Stock availability is checked before delivery (if product/warehouse linked)
- Partial delivery is supported — create multiple DOs against one SO
- DO status changes to `delivered` after mark-deliver action

#### Common Errors / ข้อผิดพลาดที่พบบ่อย

| Error | Cause | Solution |
|-------|-------|----------|
| `409 Conflict: SO must be confirmed` | SO is in draft or cancelled | Confirm the SO first |
| `409 Conflict: Insufficient stock` | Not enough inventory | Check stock levels or adjust quantity |
| `409 Conflict: Already delivered` | DO is not in draft status | Cannot deliver again |

---

### 1.4 DO to Invoice Conversion — แปลง DO เป็นใบแจ้งหนี้

**Action:** `POST /delivery-notes/:id/convert-to-invoice`

#### Step-by-Step / ขั้นตอน

1. Open a **delivered** Delivery Note
2. Click **Convert to Invoice**
3. System creates an Invoice with:
   - Status: `draft`
   - Due date: 30 days from today
   - Lines: quantity from DO × unit price from SO lines
   - Links: `delivery_note_id` and `sales_order_id`
   - Invoice number generated as `INV-YYYY-XXXX`
4. Returns `invoiceId` and `invoiceNumber`

#### Business Rules / กฎทางธุรกิจ

- Only `delivered` DOs can be converted / แปลงได้เฉพาะสถานะ delivered
- **Double-conversion prevention:** If an invoice already exists for this DO, returns `409 Conflict`
- Price is taken from the original SO line `unit_price_satang`

---

### 1.5 Pricing Engine — ระบบราคา

**Web UI:** `/pricing` (list), `/pricing/[id]` (detail)

#### Overview / ภาพรวม

The pricing engine resolves the best price through a 3-tier cascade:
ระบบราคาค้นหาราคาที่ดีที่สุดผ่าน 3 ระดับ:

1. **Customer-specific price list** — ราคาเฉพาะลูกค้า (via `customer_price_lists`)
2. **Active price list** — ราคาจาก price list ที่ active
3. **Product base price** — ราคาพื้นฐานจากสินค้า (`selling_price_satang`)

#### Price Lists / รายการราคา

| Action | API | Permission |
|--------|-----|-----------|
| Create price list | `POST /price-lists` | `pricing:manage` |
| List price lists | `GET /price-lists` | `pricing:read` |
| Get detail | `GET /price-lists/:id` | `pricing:read` |
| Update | `PUT /price-lists/:id` | `pricing:manage` |
| Deactivate (soft) | `DELETE /price-lists/:id` | `pricing:manage` |
| Add item | `POST /price-lists/:id/items` | `pricing:manage` |
| List items | `GET /price-lists/:id/items` | `pricing:read` |
| Remove item | `DELETE /price-lists/:id/items/:itemId` | `pricing:manage` |
| **Resolve price** | `GET /pricing/resolve?productId=&customerId=&quantity=` | `pricing:read` |

#### Price List Fields / ฟิลด์รายการราคา

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | ชื่อรายการราคา (required) |
| `currency` | string | สกุลเงิน (default: THB) |
| `validFrom` | date | วันเริ่มใช้ |
| `validTo` | date | วันหมดอายุ |

#### Price List Item Fields / ฟิลด์รายการสินค้าในราคา

| Field | Type | Description |
|-------|------|-------------|
| `productId` | string | รหัสสินค้า (required) |
| `unitPriceSatang` | string | ราคาต่อหน่วย (required) |
| `minQuantity` | number | จำนวนขั้นต่ำ (default: 1) |
| `discountPercent` | number | ส่วนลด % (default: 0) |

#### Resolve Price Logic / ลอจิกการค้นหาราคา

The `GET /pricing/resolve` endpoint:
1. Checks customer-specific price lists (via `customer_price_lists` join, filtered by `priority DESC`, valid date range, and `min_quantity`)
2. Falls back to any active price list matching the product
3. Falls back to product's `selling_price_satang`
4. Returns `{ unitPriceSatang, source, priceListName, discountPercent }`

Discount is applied as: `finalPrice = base - (base × discountPercent / 100)`

---

### 1.6 Payment Terms — เงื่อนไขการชำระ

**Web UI:** `/settings/payment-terms`

#### Default Terms / เงื่อนไขเริ่มต้น (seed)

| Code | Name | Days | Discount | Discount Days |
|------|------|------|----------|--------------|
| `NET30` | Net 30 Days | 30 | 0% | 0 |
| `NET60` | Net 60 Days | 60 | 0% | 0 |
| `COD` | Cash on Delivery | 0 | 0% | 0 |
| `2/10NET30` | 2% 10 Net 30 | 30 | 2% | 10 |

Use `POST /payment-terms/seed` to auto-create these defaults for your tenant.

#### Fields / ฟิลด์

| Field | Type | Description |
|-------|------|-------------|
| `code` | string | รหัส (required) |
| `name` | string | ชื่อ (required) |
| `days` | number | จำนวนวัน (default: 30) |
| `discountPercent` | number | ส่วนลดชำระก่อน % |
| `discountDays` | number | จำนวนวันที่ได้ส่วนลด |

---

### 1.7 Dunning — ติดตามหนี้

**Web UI:** `/dunning`

#### Overview / ภาพรวม

Dunning automates overdue invoice follow-up by assigning dunning levels based on days past due.
ระบบติดตามหนี้อัตโนมัติจัดระดับตามจำนวนวันที่เกินกำหนด

#### Dunning Levels / ระดับการติดตาม

| Action | API | Permission |
|--------|-----|-----------|
| List levels | `GET /dunning/levels` | `ar:invoice:read` |
| Create/update level | `POST /dunning/levels` | `dunning:manage` |
| **Run dunning** | `POST /dunning/run` | `dunning:manage` |
| List dunning cases | `GET /dunning/list` | `ar:invoice:read` |

#### Dunning Level Fields / ฟิลด์ระดับการติดตาม

| Field | Type | Description |
|-------|------|-------------|
| `level` | number | ระดับ (1, 2, 3...) |
| `daysOverdue` | number | จำนวนวันเกิน |
| `template` | string | เทมเพลตข้อความ |
| `feeSatang` | string | ค่าธรรมเนียม |

#### Run Dunning Process / การรันกระบวนการ

When `POST /dunning/run` is called:
1. Fetches all dunning levels for the tenant (sorted by `days_overdue DESC`)
2. Finds overdue invoices (status: `posted`, `sent`, `partial`, `overdue`; past `due_date`)
3. For each invoice with outstanding balance:
   - Calculates days overdue
   - Matches to highest applicable dunning level
   - Skips if already dunned at this level
   - Creates `dunning_history` record (status: `sent`)
   - Updates invoice status to `overdue` if not already
   - Sends notification (best-effort, via `notification_log`)
4. Returns `{ processed, results: [{ invoiceId, invoiceNumber, level, feeSatang }] }`

**Rate limit:** 5 requests per minute (expensive batch operation)

---

### 1.8 Credit Management — บริหารวงเงินเครดิต

#### Overview / ภาพรวม

Credit management monitors customer exposure and can warn or block new sales orders when credit limits are exceeded.

#### Endpoints / API

| Action | API | Permission |
|--------|-----|-----------|
| Get credit exposure | `GET /contacts/:id/credit-exposure` | `crm:contact:read` |
| Check credit for SO | `POST /credit/check` | `ar:so:create` |

#### Credit Exposure Calculation / การคำนวณวงเงิน

```
Total Exposure = Open Invoices (posted/sent/partial/overdue outstanding)
               + Open SOs (draft/confirmed total)

Available Credit = Credit Limit - Total Exposure
Exceeded = Total Exposure > Credit Limit
```

#### Credit Check Modes / โหมดตรวจสอบ

Configured at tenant level (`tenants.credit_check_mode`):

| Mode | Behavior |
|------|----------|
| `warn_only` (default) | Returns `warning` result — allows SO creation with alert |
| `hard_block` | Returns `blocked` result — prevents SO creation |

#### Credit Check Response / ผลการตรวจสอบ

When calling `POST /credit/check` with `{ customerId, orderTotalSatang }`:
- If no credit limit set → `ok`
- If projected exposure <= limit → `ok`
- If exceeded + warn_only → `warning`
- If exceeded + hard_block → `blocked`

---

## 2. CRM — Contacts / ระบบผู้ติดต่อ

**Web UI:** `/contacts` (list), `/contacts/new` (create), `/contacts/[id]` (detail)

#### Overview / ภาพรวม

Contacts manage both customers and vendors in a unified system. Each contact has a `contactType` field.

#### Actions / คำสั่ง

| Action | API | Permission |
|--------|-----|-----------|
| Create | `POST /contacts` | `crm:contact:create` |
| List | `GET /contacts` | `crm:contact:read` |
| Detail + transaction summary | `GET /contacts/:id` | `crm:contact:read` |
| Update | `PUT /contacts/:id` | `crm:contact:update` |
| Soft delete | `DELETE /contacts/:id` | `crm:contact:delete` |
| Related transactions | `GET /contacts/:id/transactions` | `crm:contact:read` |

#### Field Reference / อ้างอิงฟิลด์

| Field | Type | Description |
|-------|------|-------------|
| `contactType` | string | `customer` / `vendor` / `both` |
| `code` | string | รหัสผู้ติดต่อ |
| `companyName` | string | ชื่อบริษัท (required) |
| `contactPerson` | string | ผู้ติดต่อ |
| `email` | string | อีเมล |
| `phone` | string | เบอร์โทร |
| `taxId` | string | เลขประจำตัวผู้เสียภาษี |
| `branchNumber` | string | สาขา |
| `addressLine1/2` | string | ที่อยู่ |
| `city`, `province`, `postalCode` | string | เมือง/จังหวัด/รหัสไปรษณีย์ |
| `country` | string | ประเทศ (default: TH) |
| `paymentTermsDays` | number | จำนวนวันชำระ |
| `creditLimitSatang` | number | วงเงินเครดิต |

#### Business Rules / กฎทางธุรกิจ

- All text inputs are XSS-sanitized server-side (HTML tags stripped)
- Delete is soft-delete (`is_active = false`)
- Transaction summary shows related invoices and bills

---

## 3. Procurement (MM) — ระบบจัดซื้อ

### 3.1 Purchase Requisitions — ใบขอซื้อ

**Web UI:** `/purchase-requisitions`

#### Status Transitions / สถานะเอกสาร

```
draft → pending → approved → converted (to PO)
                → rejected
```

| From | To | Action | Permission |
|------|-----|--------|-----------|
| draft | pending | Submit / ส่งอนุมัติ | `mm:pr:create` |
| pending | approved | Approve / อนุมัติ | `mm:pr:approve` |
| pending | rejected | Reject / ปฏิเสธ | `mm:pr:approve` |
| approved | converted | Convert to PO / แปลงเป็น PO | `mm:pr:create` |

#### Step-by-Step: Create PR / ขั้นตอนสร้างใบขอซื้อ

1. Navigate to **Purchase Requisitions** (`/purchase-requisitions`)
2. Click **New** and fill in:
   - **Requester / ผู้ขอ** — defaults to current user
   - **Department / แผนก** (optional)
   - **Notes / หมายเหตุ** (optional)
3. Add line items:
   - **Description / รายละเอียด** (required)
   - **Quantity / จำนวน** (required)
   - **Estimated Price (satang) / ราคาประมาณ** (required)
   - **Product ID / รหัสสินค้า** (optional)
4. Click **Save** — document number: `PR-YYYYMMDD-XXX`
5. Click **Submit** to send for approval (draft → pending)

#### Step-by-Step: Convert PR to PO / แปลง PR เป็นใบสั่งซื้อ

1. Open an **approved** PR
2. Click **Convert to PO** — provide `vendorId`
3. System runs in a database transaction:
   - Creates PO with status `draft`, copying all PR lines
   - Updates PR status to `converted`
4. Returns `{ purchaseOrderId, purchaseOrderDocumentNumber }`

#### Business Rules / กฎทางธุรกิจ

- Only `draft` PRs can be edited
- Approval requires a different permission than creation (segregation of duties)
- Rejection can include a `reason` that is stored in notes

---

### 3.2 RFQ — ใบขอใบเสนอราคา

**Web UI:** `/rfqs`

#### Status Transitions / สถานะเอกสาร

```
draft → sent → received → closed
```

#### Step-by-Step: RFQ Process / ขั้นตอน RFQ

1. **Create RFQ** — optionally link to a PR (`prId`), add initial vendor IDs
2. **Send RFQ** — draft → sent (notifies vendors)
3. **Add Vendor Responses** — record each vendor's quote:
   - `vendorId`, `responseDate`, `totalAmountSatang`, `notes`
   - First response changes status: sent → received
4. **Compare Responses** — `POST /rfqs/:id/compare`:
   - Returns all vendors sorted by lowest price
   - Recommends vendor with lowest `totalAmountSatang`
5. **Select Winner** — `POST /rfqs/:id/select-winner`:
   - Marks selected vendor
   - Creates PO automatically (with PR lines if linked)
   - Closes the RFQ

#### Business Rules / กฎทางธุรกิจ

- RFQ can be created with or without a PR reference
- Multiple vendor responses are supported per RFQ
- Winner selection automatically creates a PO and closes the RFQ
- If RFQ has a linked PR, PO lines are copied from PR lines

---

### 3.3 Purchase Orders — ใบสั่งซื้อ

**Web UI:** `/purchase-orders` (list), `/purchase-orders/new` (create), `/purchase-orders/[id]` (detail)

#### Status Transitions / สถานะเอกสาร

```
draft → sent → partial_received → received → converted (to bill)
                                            → cancelled
draft → cancelled
sent → cancelled
```

| From | To | Action | Permission |
|------|-----|--------|-----------|
| draft | sent | Send / ส่ง | `ap:po:send` |
| sent, partial_received | received | Receive (auto) | `ap:po:receive` |
| sent, partial_received, received | converted | Convert to Bill | `ap:po:convert` |
| draft, sent | cancelled | Cancel / ยกเลิก | `ap:po:send` |

#### Field Reference / อ้างอิงฟิลด์

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `vendorId` | string | Yes | รหัสผู้จำหน่าย |
| `orderDate` | date | Yes | วันที่สั่งซื้อ |
| `expectedDate` | date | No | วันที่คาดรับ |
| `notes` | string | No | หมายเหตุ (max 2,000) |
| `lines[].description` | string | Yes | รายละเอียด (max 500) |
| `lines[].quantity` | number | Yes | จำนวน (min 0.01) |
| `lines[].unitPriceSatang` | string | Yes | ราคาต่อหน่วย (satang) |
| `lines[].accountId` | string | No | รหัสบัญชีค่าใช้จ่าย |
| `lines[].productId` | string | No | รหัสสินค้า (for stock) |
| `lines[].warehouseId` | string | No | รหัสคลัง (for stock) |

---

### 3.4 Goods Receipt — รับสินค้า

**Action:** `POST /purchase-orders/:id/receive`

#### Step-by-Step / ขั้นตอน

1. Open a PO in `sent` or `partial_received` status
2. Click **Receive Goods** and specify lines:
   - `lineId` — PO line to receive against
   - `quantityReceived` — amount received (supports partial)
   - `productId`, `warehouseId` — override or from PO line
3. System performs:
   - Updates `received_quantity` on each PO line
   - **Stock Update:** If product + warehouse available (from receive body or PO line):
     - Upserts `stock_levels`: increases `quantity_on_hand` and `quantity_available`
     - Creates `stock_movement` (type: `receive`, reference: `purchase_order`)
   - **PO Status Recalculation:**
     - All lines fully received → `received`
     - Some received → `partial_received`

#### Business Rules / กฎทางธุรกิจ

- Partial receiving is fully supported
- Stock movements are created automatically when product/warehouse are specified
- PO must be `sent` or `partial_received`

---

### 3.5 PO to Bill Conversion — แปลง PO เป็นใบวางบิล

**Action:** `POST /purchase-orders/:id/convert-to-bill`

#### Step-by-Step / ขั้นตอน

1. Open a PO in `sent`, `partial_received`, or `received` status
2. Click **Convert to Bill**
3. System creates a Bill with:
   - Status: `draft`
   - Due date: 30 days from now
   - Lines: copied from PO lines
   - Account: uses PO line's `account_id`, falls back to first expense account in CoA
   - Bill number generated as `BILL-YYYY-XXXX`
4. PO status changes to `converted`, `converted_bill_id` is set

#### Business Rules / กฎทางธุรกิจ

- **Double-conversion prevention:** If PO already has `converted_bill_id`, returns `409 Conflict`
- Each PO line must have an account_id or a default expense account must exist
- PO must be sent or received (not draft or cancelled)

---

### 3.6 Vendor Returns — ส่งคืนผู้ขาย

**Web UI:** `/vendor-returns`

#### Status Transitions / สถานะเอกสาร

```
draft → shipped → received_credit
```

#### Step-by-Step / ขั้นตอน

1. **Create Return** (`POST /vendor-returns`):
   - `vendorId` (required), `poId` (optional), `reason` (optional)
   - Lines: `productId`, `quantity`, `unitPriceSatang`
2. **Ship Return** (`POST /vendor-returns/:id/ship`):
   - Provide `warehouseId`
   - Creates `stock_movement` (type: `return`, negative quantity)
   - Status → `shipped`
3. **Receive Credit** (`POST /vendor-returns/:id/credit`):
   - Creates a negative bill (AP credit) with total = sum(qty × unitPrice)
   - Status → `received_credit`

---

## 4. Inventory Management (MM-IM) — สินค้าคงคลัง

### 4.1 Products — สินค้า

**Web UI:** `/products` (list), `/products/new` (create)

#### Field Reference / อ้างอิงฟิลด์

| Field | Type | Description |
|-------|------|-------------|
| `sku` | string | รหัสสินค้า (unique per tenant) |
| `nameTh` | string | ชื่อภาษาไทย |
| `nameEn` | string | ชื่อภาษาอังกฤษ |
| `description` | string | รายละเอียด |
| `category` | string | หมวดหมู่ |
| `unit` | string | หน่วยนับ (e.g., ชิ้น, กล่อง) |
| `costPriceSatang` | number | ราคาทุน (satang) |
| `sellingPriceSatang` | number | ราคาขาย (satang) |
| `minStockLevel` | number | จำนวนขั้นต่ำ (for low-stock alert) |
| `isActive` | boolean | สถานะการใช้งาน |
| `glAccountId` | string | บัญชี GL ที่ผูก |

#### Actions / คำสั่ง

| Action | API | Permission |
|--------|-----|-----------|
| Create | `POST /products` | `inventory:product:create` |
| List | `GET /products` | `inventory:product:read` |
| Update | `PUT /products/:id` | `inventory:product:update` |

---

### 4.2 Warehouses — คลังสินค้า

#### Field Reference / อ้างอิงฟิลด์

| Field | Type | Description |
|-------|------|-------------|
| `code` | string | รหัสคลัง (unique per tenant) |
| `name` | string | ชื่อคลัง |
| `address` | string | ที่อยู่ |
| `isDefault` | boolean | คลังหลัก |

#### Actions / คำสั่ง

| Action | API | Permission |
|--------|-----|-----------|
| Create | `POST /warehouses` | `inventory:warehouse:create` |
| List | `GET /warehouses` | `inventory:warehouse:read` |
| Update | `PUT /warehouses/:id` | `inventory:warehouse:update` |

---

### 4.3 Stock Movements — ความเคลื่อนไหวสินค้า

#### Overview / ภาพรวม

Stock movements track every inventory change. They are created automatically by:
- **Delivery Notes (deliver)** → type: `issue` (negative)
- **PO Goods Receipt** → type: `receive` (positive)
- **Vendor Returns (ship)** → type: `return` (negative)
- **Stock Count adjustments** → type: `adjustment`
- **Manual entry** → any type

#### Movement Types / ประเภทการเคลื่อนไหว

| Type | Direction | Source |
|------|-----------|--------|
| `receive` | + (inbound) | PO goods receipt |
| `issue` | - (outbound) | Delivery note |
| `return` | - (outbound) | Vendor return |
| `adjustment` | +/- | Stock count, manual |
| `transfer` | +/- | Warehouse transfer |

#### Actions / คำสั่ง

| Action | API | Permission |
|--------|-----|-----------|
| Record movement | `POST /stock-movements` | `inventory:movement:create` |
| Movement history | `GET /stock-movements` | `inventory:movement:read` |

#### Fields / ฟิลด์

| Field | Type | Description |
|-------|------|-------------|
| `productId` | string | รหัสสินค้า |
| `warehouseId` | string | รหัสคลัง |
| `movementType` | string | ประเภท (receive/issue/return/adjustment/transfer) |
| `quantity` | number | จำนวน (negative for outbound) |
| `referenceType` | string | ประเภทอ้างอิง (purchase_order, delivery_note, etc.) |
| `referenceId` | string | รหัสเอกสารอ้างอิง |
| `batchNumber` | string | เลข batch (optional) |
| `balanceAfter` | number | ยอดคงเหลือหลังทำรายการ |
| `unitCostSatang` | number | ต้นทุนต่อหน่วย |

---

### 4.4 Stock Levels — ยอดคงเหลือ

**Web UI:** `/inventory`

| Action | API | Permission |
|--------|-----|-----------|
| All stock levels | `GET /stock-levels` | `inventory:level:read` |
| Single product | `GET /stock-levels/:productId` | `inventory:level:read` |

#### Fields / ฟิลด์

| Field | Type | Description |
|-------|------|-------------|
| `productId` | string | รหัสสินค้า |
| `warehouseId` | string | รหัสคลัง |
| `quantityOnHand` | number | จำนวนในมือ |
| `quantityReserved` | number | จำนวนจอง |
| `quantityAvailable` | number | จำนวนพร้อมใช้ (on_hand - reserved) |

---

### 4.5 Stock Counts — ตรวจนับสต็อก

**Web UI:** `/stock-counts`

#### Status Transitions / สถานะเอกสาร

```
open → counted → posted
```

#### Step-by-Step / ขั้นตอน

1. **Create Count** (`POST /stock-counts`):
   - Provide `warehouseId` and optional `countDate`, `productIds`
   - System auto-populates lines from current `stock_levels` for that warehouse
   - Document number: `SC-YYYYMMDD-XXX`

2. **Enter Actual Quantities** (`POST /stock-counts/:id/enter`):
   - For each line, enter `actualQuantity`
   - System calculates `variance = actualQuantity - bookQuantity`
   - Status → `counted`

3. **Post Adjustments** (`POST /stock-counts/:id/post`):
   - Creates `stock_movement` (type: `adjustment`) for each line with variance != 0
   - Creates journal entry for inventory variance (if applicable)
   - Status → `posted`

#### Business Rules / กฎทางธุรกิจ

- Lines are auto-populated from `stock_levels` for the selected warehouse
- Additional products can be added manually via `productIds`
- Posting creates both stock movements and accounting entries

---

### 4.6 Batch & Serial Tracking — ติดตาม Lot/Serial

**Web UI:** `/inventory/batches`

#### Batches / Lot

| Action | API | Permission |
|--------|-----|-----------|
| Create batch | `POST /batches` | `inventory:product:create` |
| List batches | `GET /batches` | `inventory:product:read` |
| Get detail | `GET /batches/:id` | `inventory:product:read` |

Fields: `productId`, `batchNumber`, `manufactureDate`, `expiryDate`

#### Serial Numbers / เลข Serial

| Action | API | Permission |
|--------|-----|-----------|
| Create serial | `POST /serial-numbers` | `inventory:product:create` |
| List serials | `GET /serial-numbers` | `inventory:product:read` |
| Update status | `PUT /serial-numbers/:id/status` | `inventory:product:create` |

Fields: `productId`, `serialNumber`, `batchId` (optional), `status`

#### Batch Traceability / ตรวจสอบย้อนกลับ

`GET /inventory/trace/:batchId` — Traces a batch forward through stock movements to find which customers received products from this batch.

---

### 4.7 Valuation & Low Stock — มูลค่าสินค้าและแจ้งเตือน

| Action | API | Permission |
|--------|-----|-----------|
| Stock valuation report | `GET /inventory/valuation` | `inventory:valuation:read` |
| Low stock alert | `GET /inventory/low-stock` | `inventory:level:read` |

- **Valuation:** Calculates total inventory value = sum(quantity_on_hand × cost_price_satang) per product
- **Low Stock:** Returns products where `quantity_on_hand < min_stock_level`

---

## 5. Human Resources (HR) — ทรัพยากรบุคคล

### 5.1 Departments — แผนก

**Web UI:** `/departments`

#### Actions / คำสั่ง

| Action | API | Permission |
|--------|-----|-----------|
| Create | `POST /departments` | `hr:department:create` |
| List | `GET /departments` | `hr:department:read` |
| Update | `PUT /departments/:id` | `hr:department:update` |
| Org tree | `GET /departments/tree` | `hr:department:read` |

#### Fields / ฟิลด์

| Field | Type | Description |
|-------|------|-------------|
| `code` | string | รหัสแผนก |
| `nameTh` | string | ชื่อภาษาไทย |
| `nameEn` | string | ชื่อภาษาอังกฤษ |
| `managerId` | string | รหัสผู้จัดการ |
| `costCenterId` | string | ศูนย์ต้นทุนที่ผูก |

The org tree endpoint returns a nested hierarchy based on parent-child relationships.

---

### 5.2 Positions — ตำแหน่ง

**Web UI:** `/positions`

#### Actions / คำสั่ง

| Action | API | Permission |
|--------|-----|-----------|
| Create | `POST /positions` | `hr:position:create` |
| List | `GET /positions` | `hr:position:read` |
| Detail | `GET /positions/:id` | `hr:position:read` |
| Update | `PUT /positions/:id` | `hr:position:update` |

#### Fields / ฟิลด์

| Field | Type | Description |
|-------|------|-------------|
| `code` | string | รหัสตำแหน่ง |
| `title` | string | ชื่อตำแหน่ง |
| `departmentId` | string | แผนก |
| `reportsToPositionId` | string | ตำแหน่งที่รายงาน |
| `headcount` | number | จำนวนอัตรา |
| `isActive` | boolean | สถานะ |

---

### 5.3 Employees — พนักงาน

**Web UI:** `/employees` (list), `/employees/new` (create), `/employees/[id]` (detail)

#### Actions / คำสั่ง

| Action | API | Permission |
|--------|-----|-----------|
| Create | `POST /employees` | `hr:employee:create` |
| List | `GET /employees` | `hr:employee:read` |
| Detail | `GET /employees/:id` | `hr:employee:read` |
| Update | `PUT /employees/:id` | `hr:employee:update` |
| Resign | `POST /employees/:id/resign` | `hr:employee:resign` |

#### Field Reference / อ้างอิงฟิลด์

| Field | Type | Description |
|-------|------|-------------|
| `employeeCode` | string | รหัสพนักงาน |
| `titleTh` | string | คำนำหน้า (นาย/นาง/นางสาว) |
| `firstNameTh` | string | ชื่อภาษาไทย |
| `lastNameTh` | string | นามสกุลภาษาไทย |
| `firstNameEn` | string | First name |
| `lastNameEn` | string | Last name |
| `nickname` | string | ชื่อเล่น |
| `email` | string | อีเมล |
| `phone` | string | เบอร์โทร |
| `nationalId` | string | เลขบัตรประชาชน (13 หลัก) |
| `taxId` | string | เลขประจำตัวผู้เสียภาษี |
| `socialSecurityNumber` | string | เลขประกันสังคม |
| `dateOfBirth` | date | วันเกิด |
| `hireDate` | date | วันเริ่มงาน |
| `position` | string | ตำแหน่ง |
| `departmentId` | string | แผนก |
| `employmentType` | string | ประเภทการจ้าง (full_time/part_time/contract) |
| `status` | string | สถานะ (active/resigned/terminated) |
| `salarySatang` | number | เงินเดือน (satang) |
| `bankAccountNumber` | string | เลขบัญชีธนาคาร |
| `bankName` | string | ธนาคาร |
| `providentFundPercent` | number | กองทุนสำรองเลี้ยงชีพ % |
| `nationality` | string | สัญชาติ (default: TH) |

#### PDPA Compliance / การปฏิบัติตาม PDPA

- **List endpoint** (`GET /employees`): Strips sensitive PII — returns masked `nationalId` (format: `X-XXXX-XXXXX-XX-X`), hides `salarySatang`
- **Detail endpoint** (`GET /employees/:id`): Returns full data (requires explicit read permission)
- National ID masking: shows first digit + first 4 digits, masks the rest

---

### 5.4 Attendance — ลงเวลาทำงาน

**Web UI:** `/attendance`

#### Actions / คำสั่ง

| Action | API | Permission |
|--------|-----|-----------|
| Clock in | `POST /attendance/clock-in` | `hr:attendance:create` |
| Clock out | `POST /attendance/clock-out` | `hr:attendance:create` |
| Daily summary | `GET /attendance/daily/:employeeId` | `hr:attendance:read` |
| Monthly summary | `GET /attendance/monthly/:employeeId` | `hr:attendance:read` |

#### Clock In Logic / ลอจิกเข้างาน

- Requires `employeeId`
- Checks if already clocked in today → `409 Conflict` if so
- **Late detection:** If clock-in hour >= 9 → status = `late`, otherwise `present`
- Creates/updates `attendance_records` for today

#### Clock Out Logic / ลอจิกออกงาน

- Requires `employeeId`
- Must have clocked in today (no clock-in → error)
- Cannot clock out twice → `409 Conflict`
- Calculates `hoursWorked` = clock_out - clock_in
- Calculates `overtimeHours` = hours beyond 8 (if any)

#### Attendance Fields / ฟิลด์

| Field | Type | Description |
|-------|------|-------------|
| `employeeId` | string | รหัสพนักงาน |
| `date` | date | วันที่ |
| `clockIn` | datetime | เวลาเข้า |
| `clockOut` | datetime | เวลาออก |
| `hoursWorked` | number | ชั่วโมงทำงาน |
| `overtimeHours` | number | ชั่วโมง OT |
| `status` | string | present / late / absent |

---

### 5.5 Leave Management — ระบบลา

**Web UI:** `/leave` (list), `/leave/new` (create)

#### Leave Types / ประเภทการลา

| Action | API | Permission |
|--------|-----|-----------|
| Create type | `POST /leave-types` | `hr:leave:type:create` |
| List types | `GET /leave-types` | `hr:leave:type:read` |

Fields: `code`, `nameTh`, `nameEn`, `annualQuotaDays`, `isPaid`

#### Leave Requests / คำขอลา

| Action | API | Permission |
|--------|-----|-----------|
| Submit | `POST /leave-requests` | `hr:leave:request:create` |
| List | `GET /leave-requests` | `hr:leave:request:read` |
| Detail | `GET /leave-requests/:id` | `hr:leave:request:read` |
| Approve | `POST /leave-requests/:id/approve` | `hr:leave:request:approve` |
| Reject | `POST /leave-requests/:id/reject` | `hr:leave:request:reject` |
| Balance | `GET /leave-requests/balance/:employeeId` | `hr:leave:request:read` |

#### Status Transitions / สถานะ

```
pending → approved
        → rejected
```

#### Leave Request Fields / ฟิลด์

| Field | Type | Description |
|-------|------|-------------|
| `employeeId` | string | รหัสพนักงาน |
| `leaveTypeId` | string | ประเภทการลา |
| `startDate` | date | วันที่เริ่มลา |
| `endDate` | date | วันที่สิ้นสุด |
| `days` | number | จำนวนวัน |
| `reason` | string | เหตุผล |
| `status` | string | pending / approved / rejected |
| `rejectionReason` | string | เหตุผลที่ปฏิเสธ |

#### Balance Check / ตรวจสอบวันลาคงเหลือ

`GET /leave-requests/balance/:employeeId` returns remaining days by leave type (annual quota - used days).

---

## 6. Payroll (HR-PY) — ระบบเงินเดือน

**Web UI:** `/payroll` (list), `/payroll/[id]` (detail)

#### Status Transitions / สถานะเอกสาร

```
draft → calculated → approved → paid
```

| From | To | Action | Permission |
|------|-----|--------|-----------|
| draft | calculated | Calculate / คำนวณ | `hr:payroll:calculate` |
| calculated | approved | Approve / อนุมัติ | `hr:payroll:approve` |
| approved | paid | Pay / จ่ายเงิน | `hr:payroll:pay` |

#### Step-by-Step: Payroll Process / ขั้นตอนระบบเงินเดือน

1. **Create Payroll Run** (`POST /payroll`):
   - `payPeriodStart`, `payPeriodEnd`, `runDate`, `notes`
   - Status: `draft`

2. **Calculate** (`POST /payroll/:id/calculate`):
   - Fetches all **active** employees
   - For each employee, creates a payroll item:
     - `baseSalarySatang` = employee's `salary_satang`
     - `grossSatang` = base + overtime + bonus + allowance
     - **Social Security (SSC):** 5% of salary, capped at 750 THB
       - Floor: 1,650 THB minimum wage
       - Cap: 15,000 THB salary cap
       - Max contribution: 750 THB (75,000 satang)
     - **Provident Fund:** employee's `provident_fund_percent` × gross
     - **Personal Income Tax (PIT):** Thai Revenue Department brackets
       - Annualizes monthly gross (×12)
       - Expense deduction: 50%, max 100k THB
       - Personal allowance: 60k THB
       - Progressive brackets: 0-150k (0%), 150-300k (5%), 300-500k (10%), 500-750k (15%), 750k-1M (20%), 1-2M (25%), 2-5M (30%), 5M+ (35%)
       - Monthly tax = annual tax / 12
     - `totalDeductions` = SSC + provident + PIT + other
     - `netSatang` = gross - totalDeductions
     - `employerSSC` = same calculation (employer matches employee SSC)
   - Status → `calculated`
   - Run totals updated

3. **Review & Adjust** (`PUT /payroll/:id/items/:itemId`):
   - Adjust individual payroll items before approval
   - Can modify: overtime, bonus, allowance, otherDeductions

4. **Approve** (`POST /payroll/:id/approve`):
   - Status → `approved`
   - Records `approved_by` user

5. **Pay** (`POST /payroll/:id/pay`):
   - Status → `paid`
   - Records payment timestamp

6. **View Payslips** (`GET /payroll/:id/payslips`):
   - Returns individual payslip details per employee

#### Thai Tax Brackets (PIT) / ขั้นภาษีเงินได้บุคคลธรรมดา

| Taxable Income (THB/year) | Rate |
|---------------------------|------|
| 0 – 150,000 | 0% (exempt) |
| 150,001 – 300,000 | 5% |
| 300,001 – 500,000 | 10% |
| 500,001 – 750,000 | 15% |
| 750,001 – 1,000,000 | 20% |
| 1,000,001 – 2,000,000 | 25% |
| 2,000,001 – 5,000,000 | 30% |
| 5,000,001+ | 35% |

#### Social Security Contribution (SSC) / ประกันสังคม

| Parameter | Value |
|-----------|-------|
| Rate | 5% |
| Salary floor | 1,650 THB |
| Salary cap | 15,000 THB |
| Max contribution | 750 THB/month |
| Employer matches | Yes (same amount) |

#### Payroll Item Fields / ฟิลด์รายการเงินเดือน

| Field | Type | Description |
|-------|------|-------------|
| `employeeId` | string | รหัสพนักงาน |
| `baseSalarySatang` | number | เงินเดือนพื้นฐาน |
| `overtimeSatang` | number | ค่าล่วงเวลา |
| `bonusSatang` | number | โบนัส |
| `allowanceSatang` | number | เงินค่าเบี้ยเลี้ยง |
| `grossSatang` | number | รวมรายได้ |
| `socialSecuritySatang` | number | ประกันสังคม (ลูกจ้าง) |
| `providentFundSatang` | number | กองทุนสำรองเลี้ยงชีพ |
| `personalIncomeTaxSatang` | number | ภาษีเงินได้ |
| `otherDeductionsSatang` | number | หักอื่นๆ |
| `totalDeductionsSatang` | number | รวมรายการหัก |
| `netSatang` | number | เงินสุทธิ |
| `employerSscSatang` | number | ประกันสังคม (นายจ้าง) |
| `paymentMethod` | string | วิธีจ่าย (bank_transfer, etc.) |

---

## 7. Controlling (CO) — ระบบ Controlling

### 7.1 Cost Centers — ศูนย์ต้นทุน

**Web UI:** `/cost-centers`

#### Actions / คำสั่ง

| Action | API | Permission |
|--------|-----|-----------|
| Create | `POST /cost-centers` | `co:cost-center:create` |
| List | `GET /cost-centers` | `co:cost-center:read` |
| Detail | `GET /cost-centers/:id` | `co:cost-center:read` |
| Update | `PUT /cost-centers/:id` | `co:cost-center:update` |
| **Cost Report** | `GET /cost-centers/:id/report` | `co:cost-center:read` |

#### Fields / ฟิลด์

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | string | Yes | รหัส (max 20) |
| `nameTh` | string | Yes | ชื่อภาษาไทย (max 255) |
| `nameEn` | string | Yes | ชื่อภาษาอังกฤษ (max 255) |
| `parentId` | string | No | ศูนย์ต้นทุนแม่ (for hierarchy) |
| `isActive` | boolean | No | สถานะ |

#### Cost Center Report / รายงานศูนย์ต้นทุน

`GET /cost-centers/:id/report` returns costs grouped by this center — aggregates journal entry line items tagged with the cost center.

---

### 7.2 Profit Centers — ศูนย์กำไร

**Web UI:** `/profit-centers`

#### Actions / คำสั่ง

| Action | API | Permission |
|--------|-----|-----------|
| Create | `POST /profit-centers` | `co:profit-center:create` |
| List | `GET /profit-centers` | `co:profit-center:read` |
| Detail | `GET /profit-centers/:id` | `co:profit-center:read` |
| Update | `PUT /profit-centers/:id` | `co:profit-center:update` |
| **P&L Report** | `GET /profit-centers/:id/report` | `co:profit-center:read` |

#### Fields / ฟิลด์

Same structure as Cost Centers: `code`, `nameTh`, `nameEn`, `parentId`, `isActive`

#### Profit Center Report / รายงานศูนย์กำไร

`GET /profit-centers/:id/report` returns a P&L (Profit & Loss) grouped by this profit center.

---

## 8. End-to-End Process Flows — ขั้นตอนทำงานครบวงจร

### Sales Flow: QT → SO → DO → INV

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Quotation│───▶│  Sales   │───▶│ Delivery │───▶│ Invoice  │
│   (QT)   │    │ Order(SO)│    │ Note(DO) │    │  (INV)   │
│  draft   │    │  draft   │    │  draft   │    │  draft   │
│  sent    │    │ confirmed│    │ delivered│    │  posted  │
│ approved │    │ delivered│    │          │    │  paid    │
│ converted│    │          │    │          │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                                     │
                              Stock Deduction
                            (issue movement)
```

**GL Impact (Invoice posting):**
- DR: Accounts Receivable
- CR: Revenue

**GL Impact (Delivery — stock):**
- DR: Cost of Goods Sold
- CR: Inventory

### Procurement Flow: PR → RFQ → PO → GR → Bill

```
┌───────────┐    ┌──────┐    ┌──────────┐    ┌──────────┐    ┌──────┐
│  Purchase │───▶│ RFQ  │───▶│ Purchase │───▶│  Goods   │───▶│ Bill │
│Requisition│    │      │    │Order (PO)│    │ Receipt  │    │      │
│   draft   │    │ draft│    │  draft   │    │(PO recv) │    │draft │
│  pending  │    │ sent │    │  sent    │    │          │    │posted│
│ approved  │    │recv'd│    │ received │    │ Stock +  │    │ paid │
│ converted │    │closed│    │converted │    │          │    │      │
└───────────┘    └──────┘    └──────────┘    └──────────┘    └──────┘
```

**GL Impact (Bill posting):**
- DR: Expense / Inventory
- CR: Accounts Payable

**GL Impact (Goods Receipt — stock):**
- DR: Inventory
- CR: GR/IR Clearing

### HR/Payroll Flow: Employee → Attendance → Payroll → Payment

```
┌──────────┐    ┌──────────┐    ┌───────────┐    ┌──────────┐
│ Employee │───▶│Attendance│───▶│  Payroll  │───▶│ Payment  │
│  Master  │    │Clock In/ │    │   Run     │    │          │
│  active  │    │Clock Out │    │  draft    │    │  Bank    │
│          │    │  daily   │    │calculated │    │ Transfer │
│          │    │ monthly  │    │ approved  │    │          │
│          │    │          │    │   paid    │    │          │
└──────────┘    └──────────┘    └───────────┘    └──────────┘
                                     │
                              ┌──────┴──────┐
                              │ Deductions  │
                              │ • SSC 5%    │
                              │ • PVD Fund  │
                              │ • PIT Tax   │
                              └─────────────┘
```

**GL Impact (Payroll posting):**
- DR: Salary Expense
- DR: Employer SSC Expense
- CR: Net Pay Payable (bank)
- CR: SSC Payable
- CR: PIT Payable
- CR: Provident Fund Payable

### Inventory Flow: Product → Stock → Count → Valuation

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Products │───▶│  Stock   │───▶│  Stock   │───▶│Valuation │
│ Master   │    │ Levels   │    │  Count   │    │ Report   │
│          │    │          │    │  open    │    │          │
│ Batches  │    │Movements │    │ counted  │    │Low Stock │
│ Serials  │    │          │    │ posted   │    │ Alert    │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                     ▲
              ┌──────┴──────┐
              │ Auto-update │
              │ • PO Receive│
              │ • DO Deliver│
              │ • VR Ship   │
              └─────────────┘
```

---

## Tips & Best Practices / เคล็ดลับ

1. **Satang Arithmetic:** All monetary values are in satang (1 THB = 100 satang). The system uses BigInt internally to avoid floating-point rounding errors.
   ค่าเงินทั้งหมดเป็นสตางค์ (1 บาท = 100 สตางค์) ระบบใช้ BigInt เพื่อป้องกันข้อผิดพลาดจากทศนิยม

2. **Document Numbering:** Auto-generated per tenant, per fiscal year. Format varies by module (QT-YYYY-XXXX, SO-YYYY-XXXX, etc.).
   เลขที่เอกสารสร้างอัตโนมัติตาม tenant และปีงบประมาณ

3. **Partial Delivery/Receipt:** Both SO delivery and PO receipt support partial quantities. System auto-tracks remaining amounts.
   ส่งของ/รับของบางส่วนได้ ระบบติดตามจำนวนที่เหลืออัตโนมัติ

4. **Stock Integration:** Link products and warehouses on DO lines and PO lines to get automatic stock movement tracking.
   ผูกสินค้าและคลังในรายการ DO/PO เพื่อให้ระบบติดตามสต็อกอัตโนมัติ

5. **Tenant Isolation:** All data is scoped by `tenant_id`. Users can only access data within their own tenant.
   ข้อมูลทั้งหมดแยกตาม tenant ผู้ใช้เห็นข้อมูลเฉพาะ tenant ของตัวเอง

6. **Permission-Based Access:** Each action requires specific permissions. Configure roles in Settings > Team.
   ทุกการกระทำต้องมีสิทธิ์ ตั้งค่า role ใน ตั้งค่า > ทีม

7. **Credit Check Before SO:** Always run credit check before creating large SOs to avoid exceeding customer credit limits.
   ตรวจสอบวงเงินก่อนสร้าง SO ขนาดใหญ่

8. **Dunning Setup:** Configure dunning levels before running the dunning process. Common setup: Level 1 at 7 days, Level 2 at 30 days, Level 3 at 60 days.
   ตั้งค่าระดับติดตามหนี้ก่อนรัน ตัวอย่าง: ระดับ 1 ที่ 7 วัน ระดับ 2 ที่ 30 วัน ระดับ 3 ที่ 60 วัน

---

> **nEIP v0.9.0** — AI-Native ERP for Thai SMEs  
> Generated from source code analysis on 2026-04-12

---

## 9. Manufacturing (PP) — ระบบการผลิต

### 9.1 Overview / ภาพรวม

Manufacturing module (Production Planning — PP) จัดการกระบวนการผลิตครบวงจร ตั้งแต่ Bill of Materials (BOM), Work Centers, Production Orders, ไปจนถึง Material Requirements Planning (MRP)

The Manufacturing module covers end-to-end production management: BOM, Work Centers, Production Orders, and MRP.

### 9.2 Screens / หน้าจอ

| Screen | Path | Description |
|--------|------|-------------|
| BOM List | `/manufacturing/bom` | รายการสูตรการผลิต — BOM list |
| New BOM | `/manufacturing/bom/new` | สร้าง BOM — Create BOM |
| Work Centers | `/manufacturing/work-centers` | ศูนย์การทำงาน — Work center list |
| Production Orders | `/manufacturing/production-orders` | ใบสั่งผลิต — Production order list |
| MRP Run | `/manufacturing/mrp` | วางแผนความต้องการวัสดุ — MRP run |
| Shop Floor | `/manufacturing/shop-floor` | ควบคุมพื้นที่ผลิต — Shop floor control |

### 9.3 Bill of Materials (BOM) / สูตรการผลิต

#### Step-by-Step: สร้าง BOM

1. ไปที่ **Manufacturing > BOM** (`/manufacturing/bom`) → กด **"+ New BOM"**
2. เลือก **Finished Product** — สินค้าสำเร็จรูปที่ต้องการผลิต
3. กำหนด **Batch Size** — จำนวนผลิตต่อ 1 ครั้ง (เช่น 100 ชิ้น)
4. เพิ่ม **Components** — วัตถุดิบแต่ละรายการ:
   - **Material** — เลือกวัตถุดิบจาก Product master
   - **Quantity** — จำนวนที่ใช้ต่อ batch
   - **UOM** — หน่วย (ชิ้น/กก./ลิตร)
   - **Scrap %** — เปอร์เซ็นต์ของเสีย (optional)
5. เพิ่ม **Operations** — ขั้นตอนการผลิต:
   - **Work Center** — ศูนย์การทำงาน
   - **Setup Time** — เวลาตั้งเครื่อง (นาที)
   - **Run Time** — เวลาผลิตต่อชิ้น (นาที)
6. กด **Save** → สถานะ `draft`
7. กด **Activate** → สถานะ `active` พร้อมใช้ผลิต

### 9.4 Work Centers / ศูนย์การทำงาน

| Field | Description | ตัวอย่าง |
|-------|-------------|---------|
| Code | รหัสศูนย์งาน | WC-ASSEMBLY-01 |
| Name | ชื่อศูนย์งาน | สายการประกอบ 1 |
| Capacity/Hour | กำลังผลิตต่อชั่วโมง | 50 ชิ้น/ชม. |
| Cost Rate | อัตราต้นทุนต่อชั่วโมง | 500 บาท/ชม. |
| Calendar | ปฏิทินทำงาน | Mon-Sat, 08:00-17:00 |

### 9.5 Production Orders / ใบสั่งผลิต

#### Status Flow:

```
planned → released → in_progress → completed → closed
                                  → partially_completed
```

#### Step-by-Step: สร้างใบสั่งผลิต

1. ไปที่ **Production Orders** → กด **"+ New Order"**
2. เลือก **BOM** → ระบบดึง Components & Operations อัตโนมัติ
3. ระบุ **Planned Quantity** และ **Planned Start/End Date**
4. กด **Release** → สถานะเปลี่ยนเป็น `released`
5. เริ่มผลิต → บันทึก **Confirmations** (จำนวนที่ผลิตได้/ของเสีย)
6. ระบบตัดวัตถุดิบจากคลังอัตโนมัติ (Goods Issue)
7. เสร็จผลิต → **Goods Receipt** → รับสินค้าสำเร็จรูปเข้าคลัง

#### GL Entries — Production Order:

**Goods Issue (ตัดวัตถุดิบ):**
| Dr/Cr | Account | Amount | คำอธิบาย |
|-------|---------|--------|---------|
| Dr | WIP — Work in Process (1400) | Material cost | งานระหว่างทำ |
| Cr | Raw Material Inventory (1200) | Material cost | ตัดวัตถุดิบ |

**Goods Receipt (รับสำเร็จรูป):**
| Dr/Cr | Account | Amount | คำอธิบาย |
|-------|---------|--------|---------|
| Dr | Finished Goods Inventory (1210) | Production cost | รับสินค้าสำเร็จรูป |
| Cr | WIP — Work in Process (1400) | Production cost | ตัดงานระหว่างทำ |

### 9.6 MRP — Material Requirements Planning / วางแผนความต้องการวัสดุ

#### Step-by-Step: รัน MRP

1. ไปที่ **MRP Run** (`/manufacturing/mrp`) → กด **"Run MRP"**
2. ระบุ **Planning Horizon** — ช่วงเวลาที่ต้องการวางแผน (เช่น 30 วัน)
3. ระบบคำนวณ:
   - **Gross Requirement** — ความต้องการรวม (จาก SO + Forecast)
   - **Available Stock** — สต็อกที่มี + PO ที่อยู่ระหว่างรับ
   - **Net Requirement** — ความต้องการสุทธิ
4. ระบบสร้าง **Planned Orders**:
   - **Production Order** — สำหรับสินค้าที่ผลิตเอง (มี BOM)
   - **Purchase Requisition** — สำหรับวัตถุดิบที่ต้องซื้อ
5. ตรวจสอบ → กด **Convert** → แปลงเป็น Production Order / PR จริง

---

## 10. Plant Maintenance (PM) — ระบบบำรุงรักษา

### 10.1 Overview / ภาพรวม

Plant Maintenance module จัดการการบำรุงรักษาเครื่องจักรและอุปกรณ์ ครอบคลุม Equipment Master, Maintenance Plans, Work Orders, และ OEE (Overall Equipment Effectiveness)

Plant Maintenance module manages machinery and equipment maintenance: Equipment Master, Maintenance Plans, Work Orders, and OEE tracking.

### 10.2 Screens / หน้าจอ

| Screen | Path | Description |
|--------|------|-------------|
| Equipment List | `/maintenance/equipment` | ทะเบียนเครื่องจักร — Equipment register |
| New Equipment | `/maintenance/equipment/new` | เพิ่มเครื่องจักร — Add equipment |
| Maintenance Plans | `/maintenance/plans` | แผนบำรุงรักษา — Maintenance plans |
| Work Orders | `/maintenance/work-orders` | ใบสั่งงานซ่อม — Work order list |
| OEE Dashboard | `/maintenance/oee` | ดัชนีประสิทธิภาพ — OEE dashboard |

### 10.3 Equipment Master / ทะเบียนเครื่องจักร

| Field | Description | ตัวอย่าง |
|-------|-------------|---------|
| Equipment ID | รหัสเครื่องจักร | EQ-CNC-001 |
| Name | ชื่อเครื่อง | CNC Lathe #1 |
| Category | ประเภท | Machine / Vehicle / Building |
| Location | ตำแหน่งที่ตั้ง | Factory A, Line 3 |
| Status | สถานะ | active / maintenance / retired |
| Warranty End | วันหมดประกัน | 2027-12-31 |
| Cost Center | ศูนย์ต้นทุน | CC-PROD-01 |

### 10.4 Maintenance Plans / แผนบำรุงรักษา

#### Types:

| Type | Description | ตัวอย่าง |
|------|-------------|---------|
| `time_based` | ตามระยะเวลา | ทุก 3 เดือน |
| `counter_based` | ตามจำนวนการใช้งาน | ทุก 1,000 ชั่วโมงเดินเครื่อง |
| `condition_based` | ตามสภาพ (IoT sensor) | เมื่อ vibration > threshold |

#### Step-by-Step: สร้างแผนบำรุงรักษา

1. ไปที่ **Maintenance Plans** → กด **"+ New Plan"**
2. เลือก **Equipment** ที่ต้องบำรุง
3. เลือก **Plan Type** (time/counter/condition)
4. สำหรับ time_based: ระบุ **Interval** (เช่น ทุก 90 วัน)
5. ระบุ **Task List** — รายการงานที่ต้องทำ:
   - เช่น "เปลี่ยนน้ำมัน", "ตรวจสอบสายพาน", "ทดสอบระบบนิรภัย"
6. ระบุ **Spare Parts** ที่ต้องใช้ (link กับ Product master)
7. กด **Activate** → ระบบสร้าง Work Order อัตโนมัติตาม schedule

### 10.5 Work Orders / ใบสั่งงานซ่อม

#### Status Flow:

```
planned → released → in_progress → completed → closed
                                  → cancelled
```

#### Step-by-Step: ดำเนินการ Work Order

1. Work Order สร้างอัตโนมัติจาก Maintenance Plan (หรือสร้างมือจาก Breakdown)
2. ช่างดูรายละเอียด → กด **Start** → สถานะ `in_progress`
3. บันทึก **Time** ที่ใช้, **Spare Parts** ที่เบิก
4. ระบบตัดอะไหล่จากคลังอัตโนมัติ (Goods Issue)
5. เสร็จงาน → กด **Complete** → บันทึกสาเหตุ/ผลการซ่อม
6. ระบบสร้าง JE ต้นทุนซ่อมบำรุงอัตโนมัติ

#### GL Entries — Work Order:

| Dr/Cr | Account | Amount | คำอธิบาย |
|-------|---------|--------|---------|
| Dr | Maintenance Expense (5800) | Parts + Labor | ค่าซ่อมบำรุง |
| Cr | Spare Parts Inventory (1220) | Parts cost | ตัดอะไหล่ |
| Cr | Wages Payable (2300) | Labor cost | ค่าแรงช่าง |

### 10.6 OEE — Overall Equipment Effectiveness / ดัชนีประสิทธิภาพ

| Metric | Formula | คำอธิบาย |
|--------|---------|---------|
| Availability | (Run Time / Planned Time) × 100 | ความพร้อมใช้งาน |
| Performance | (Actual Output / Theoretical Output) × 100 | ประสิทธิภาพ |
| Quality | (Good Units / Total Units) × 100 | คุณภาพ |
| **OEE** | Availability × Performance × Quality | ดัชนีรวม |

---

## 11. Service Procurement — ใบรับงานบริการ

### 11.1 Overview / ภาพรวม

Service Entry Sheet (SES) จัดการการจัดซื้อบริการ (ไม่ใช่สินค้า) เช่น งานรับเหมาก่อสร้าง, ที่ปรึกษา, ทำความสะอาด โดยยืนยันงานที่ทำเสร็จก่อนจ่ายเงิน

Service Entry Sheet manages service procurement (non-goods) such as construction, consulting, and cleaning. It confirms work completion before payment.

### 11.2 Screens / หน้าจอ

| Screen | Path | Description |
|--------|------|-------------|
| Service Entries | `/procurement/service-entries` | ใบรับงานบริการ — SES list |
| New SES | `/procurement/service-entries/new` | สร้างใบรับงาน — Create SES |

### 11.3 Step-by-Step: Service Entry Sheet

1. สร้าง **Purchase Order** ประเภท `service` (ไม่ใช่ `goods`)
2. ผู้รับเหมาส่งงาน → ไปที่ **Service Entries** → กด **"+ New Entry"**
3. เลือก **PO** ที่เกี่ยวข้อง
4. ระบุ **Service Lines**:
   - Description — คำอธิบายงาน (เช่น "ทาสีอาคาร ชั้น 1-3")
   - Quantity — จำนวน (เช่น 500 ตร.ม.)
   - Unit Price — ราคาต่อหน่วย
5. กด **Submit** → ส่งอนุมัติ (ผ่าน Approval Workflow)
6. อนุมัติ → ระบบสร้าง **Goods Receipt (Service)** + สามารถสร้าง Bill ได้

#### GL Entries:

| Dr/Cr | Account | Amount | คำอธิบาย |
|-------|---------|--------|---------|
| Dr | Service Expense (5400) | Service cost | ค่าบริการ |
| Dr | Input VAT (1110) | VAT 7% | ภาษีซื้อ |
| Cr | Accounts Payable (2100) | Total | เจ้าหนี้ |
| Cr | WHT Payable (2120) | WHT amount | ภาษีหัก ณ ที่จ่าย |

---

## 12. EWM — Extended Warehouse Management / การจัดการคลังสินค้าขั้นสูง

### 12.1 Overview / ภาพรวม

EWM module ขยายความสามารถจากระบบ Inventory พื้นฐาน เพิ่มการจัดการ Storage Bins (ตำแหน่งจัดเก็บ), Pick/Pack/Ship process, Wave Management, และ Putaway Strategy

EWM extends basic inventory with Storage Bins, Pick/Pack/Ship processes, Wave Management, and Putaway Strategies.

### 12.2 Screens / หน้าจอ

| Screen | Path | Description |
|--------|------|-------------|
| Storage Bins | `/warehouse/bins` | ตำแหน่งจัดเก็บ — Bin locations |
| Putaway | `/warehouse/putaway` | จัดเก็บสินค้า — Putaway tasks |
| Pick Lists | `/warehouse/picking` | รายการหยิบสินค้า — Pick lists |
| Pack Station | `/warehouse/packing` | สถานีแพ็ค — Packing station |
| Shipments | `/warehouse/shipments` | การจัดส่ง — Shipment management |
| Wave Management | `/warehouse/waves` | จัดกลุ่มงาน — Wave management |

### 12.3 Storage Bin Structure / โครงสร้างตำแหน่งจัดเก็บ

```
Warehouse → Zone → Aisle → Rack → Level → Bin
คลัง      → โซน  → ทางเดิน → ชั้นวาง → ระดับ → ช่อง

ตัวอย่าง: WH01-A-03-R2-L3-B05
         คลัง1-โซนA-ทางเดิน3-ชั้น2-ระดับ3-ช่อง05
```

### 12.4 Pick/Pack/Ship Process

1. **Sales Order** → สร้าง **Delivery Note** (DO)
2. ระบบสร้าง **Pick List** → กำหนด Bin ที่ต้องหยิบ (FIFO/FEFO)
3. พนักงานหยิบสินค้า → Confirm Pick → สินค้าย้ายไปพื้นที่ Pack
4. **Packing** → สแกนสินค้า → จัดใส่กล่อง → Print Shipping Label
5. **Shipment** → บันทึกข้อมูลขนส่ง (carrier, tracking#) → Post Goods Issue
6. ระบบตัดสต็อกอัตโนมัติ

---

## 13. Purchasing Advanced — จัดซื้อขั้นสูง

### 13.1 Outline Agreements / สัญญาร่มจัดซื้อ

สัญญาระยะยาวกับผู้ขาย กำหนดราคาและเงื่อนไขล่วงหน้า สามารถสร้าง PO อ้างอิงสัญญาได้เรื่อยๆ

| Type | Description | ตัวอย่าง |
|------|-------------|---------|
| `contract` | สัญญาราคา — ตกลงราคา ไม่กำหนดจำนวน | สัญญาซื้อเหล็กราคา 25 บาท/กก. |
| `scheduling_agreement` | สัญญากำหนดการส่ง — กำหนดจำนวน+วันส่ง | ส่งเหล็ก 100 ตัน/เดือน 12 เดือน |

#### Step-by-Step: สร้าง Outline Agreement

1. ไปที่ **Procurement > Agreements** (`/procurement/agreements`) → กด **"+ New"**
2. เลือก **Type** (contract / scheduling_agreement)
3. เลือก **Vendor** → กำหนด **Validity Period** (เช่น 1 ปี)
4. เพิ่ม **Line Items** — สินค้า, ราคาตกลง, จำนวน (ถ้า scheduling)
5. กด **Activate** → สามารถสร้าง PO อ้างอิงสัญญาได้

### 13.2 Scheduling Agreements / สัญญากำหนดการส่ง

Schedule Lines กำหนดวันส่งและจำนวนล่วงหน้า:

| Delivery Date | Quantity | Status |
|---------------|----------|--------|
| 2026-05-01 | 100 ตัน | Pending |
| 2026-06-01 | 100 ตัน | Pending |
| 2026-07-01 | 100 ตัน | Pending |

### 13.3 Consignment / ฝากขาย

Vendor ส่งสินค้ามาเก็บที่คลังเรา แต่ยังเป็นกรรมสิทธิ์ของ vendor จนกว่าจะใช้/ขาย

- **Consignment Fill-Up** — vendor ส่งสินค้ามาเติม (ไม่สร้าง AP)
- **Consignment Issue** — เบิกใช้/ขาย → โอนกรรมสิทธิ์ → สร้าง AP
- **Consignment Return** — คืนสินค้าให้ vendor

### 13.4 Source List / รายการแหล่งจัดหา

กำหนดว่าแต่ละสินค้าสามารถซื้อจาก vendor ไหนได้บ้าง ระบุ preferred vendor, validity period, และ fixed/blocked status

### 13.5 Stock Transfer Order (STO) / ใบโอนสต็อกระหว่างคลัง

โอนสินค้าระหว่างคลัง โดยใช้กระบวนการ procurement (PR → PO → GR) สำหรับกรณีโอนข้ามบริษัท (Intercompany STO)

#### Step-by-Step: สร้าง STO

1. ไปที่ **Procurement > STO** (`/procurement/sto`) → กด **"+ New STO"**
2. เลือก **Source Warehouse** (คลังต้นทาง) และ **Target Warehouse** (คลังปลายทาง)
3. เพิ่ม **Line Items** — สินค้า + จำนวน
4. กด **Release** → สร้าง Goods Issue จากคลังต้นทาง
5. ปลายทาง → **Goods Receipt** → รับสินค้าเข้าคลัง

---

## 14. PP Advanced — การผลิตขั้นสูง

### 14.1 Kanban / คัมบัง

ระบบดึง (Pull System) สำหรับการผลิตแบบ Just-in-Time:

| Field | Description |
|-------|-------------|
| Kanban Board | กระดาน Kanban แสดงสถานะ containers |
| Container | ภาชนะบรรจุสินค้า กำหนดจำนวน fixed |
| Status | `full` → `empty` → `in_process` → `full` |
| Trigger | เมื่อ container `empty` → สร้าง Production Order อัตโนมัติ |

### 14.2 Process Orders / ใบสั่งผลิตแบบกระบวนการ

สำหรับอุตสาหกรรมกระบวนการ (เคมี, อาหาร, ยา) ต่างจาก Production Order ตรงที่:

| Feature | Production Order | Process Order |
|---------|-----------------|---------------|
| Industry | Discrete (ชิ้นส่วน) | Process (เคมี/อาหาร) |
| Recipe | BOM | Master Recipe |
| Phases | Operations | Phases + Process Instructions |
| Batch | Optional | Mandatory |
| Co-Products | ไม่รองรับ | รองรับ |

### 14.3 CRP — Capacity Requirements Planning / วางแผนกำลังการผลิต

วิเคราะห์ว่า Work Centers มีกำลังเพียงพอต่อแผนการผลิตหรือไม่:

1. รัน MRP → ได้ Planned Production Orders
2. รัน **CRP** → ระบบคำนวณ capacity load ต่อ Work Center
3. แสดง **Capacity Leveling Chart** — สีเขียว (ปกติ) / สีแดง (เกิน capacity)
4. ปรับแผน: เลื่อนวันผลิต, เพิ่มกะ, ย้าย work center

### 14.4 Co-Products & By-Products / ผลิตภัณฑ์ร่วมและผลิตภัณฑ์พลอยได้

เมื่อกระบวนการผลิตได้สินค้ามากกว่า 1 ชนิด:

| Type | Description | ตัวอย่าง |
|------|-------------|---------|
| Co-Product | ผลิตภัณฑ์ร่วม (ต้องการ) | น้ำมันปาล์มดิบ + กากปาล์ม |
| By-Product | ผลิตภัณฑ์พลอยได้ (ได้เอง) | ไอน้ำจากการกลั่น |

### 14.5 ECM — Engineering Change Management / จัดการการเปลี่ยนแปลงทางวิศวกรรม

จัดการการเปลี่ยนแปลง BOM/Routing อย่างเป็นระบบ:

```
Change Request → Review → Approve → Change Order → Implement → Close
```

- **Effectivity Date** — วันที่มีผลบังคับ
- **Version Control** — BOM version 1.0 → 1.1
- **Impact Analysis** — แสดงผลกระทบต่อ Production Orders / Stock

### 14.6 Demand Management / จัดการความต้องการ

วางแผนความต้องการ (Demand Plan) เพื่อเป็น input ให้ MRP:

| Source | Description |
|--------|-------------|
| Sales Forecast | พยากรณ์ยอดขาย (manual / AI-predicted) |
| Customer Orders | ยอดสั่งจริงจาก SO |
| Safety Stock | สต็อกสำรอง |
| Planned Independent Req. | ความต้องการวางแผน (PIR) |
