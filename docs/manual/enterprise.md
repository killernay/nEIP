# nEIP User Manual — Enterprise, AI & System Modules
# คู่มือผู้ใช้ nEIP — โมดูล Enterprise, AI และระบบ

> **Version:** 0.9.0 | **Last updated:** 2026-04-12

---

## Table of Contents / สารบัญ

1. [Multi-Currency / หลายสกุลเงิน](#1-multi-currency--หลายสกุลเงิน)
2. [Multi-Company / หลายบริษัท](#2-multi-company--หลายบริษัท)
3. [Approval Workflows / ขั้นตอนอนุมัติ](#3-approval-workflows--ขั้นตอนอนุมัติ)
4. [AI Agents / ตัวแทน AI](#4-ai-agents--ตัวแทน-ai)
5. [Reports / รายงาน](#5-reports--รายงาน)
6. [Dashboard / แดชบอร์ด](#6-dashboard--แดชบอร์ด)
7. [Authentication / การยืนยันตัวตน](#7-authentication--การยืนยันตัวตน)
8. [Roles & Permissions / บทบาทและสิทธิ์](#8-roles--permissions--บทบาทและสิทธิ์)
9. [PDPA Data Subject Rights / สิทธิ์เจ้าของข้อมูล PDPA](#9-pdpa-data-subject-rights--สิทธิ์เจ้าของข้อมูล-pdpa)
10. [Settings / การตั้งค่า](#10-settings--การตั้งค่า)

---

## 1. Multi-Currency / หลายสกุลเงิน

### Overview / ภาพรวม

The Multi-Currency module (Phase 5.1) enables businesses that transact in foreign currencies to manage currency definitions, exchange rates, rate lookups, and month-end FX revaluation — all with automatic journal entry generation.

โมดูลหลายสกุลเงิน (Phase 5.1) รองรับธุรกิจที่มีธุรกรรมสกุลเงินต่างประเทศ ครอบคลุมการจัดการสกุลเงิน อัตราแลกเปลี่ยน การค้นหาอัตรา และการปรับมูลค่าสิ้นเดือน พร้อมสร้างใบสำคัญบัญชีอัตโนมัติ

### Screens / หน้าจอ

| Screen | Path | Description |
|--------|------|-------------|
| Currency List | `/settings/currencies` | จัดการรายการสกุลเงิน — Manage currency list |

### 1.1 Create Currency / สร้างสกุลเงิน

**API:** `POST /api/v1/currencies`

**Step-by-step / ขั้นตอน:**
1. Go to **Settings > Currencies** / ไปที่ **ตั้งค่า > สกุลเงิน**
2. Click **Add Currency** / คลิก **เพิ่มสกุลเงิน**
3. Fill in the required fields / กรอกข้อมูลที่จำเป็น
4. Click **Save** / คลิก **บันทึก**

**Fields / ฟิลด์:**

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| code | string | Yes | 3 characters exactly (ISO 4217) | รหัสสกุลเงิน e.g. USD, EUR, JPY |
| name | string | Yes | min 1 char | ชื่อสกุลเงิน e.g. US Dollar |
| symbol | string | No | — | สัญลักษณ์ e.g. $, €, ¥ |
| decimalPlaces | integer | No | 0–6, default 2 | จำนวนทศนิยม |

**Permission required:** `fi:currency:create`

### 1.2 List Currencies / ดูรายการสกุลเงิน

**API:** `GET /api/v1/currencies`

Returns all currencies for the tenant, sorted by code. / แสดงสกุลเงินทั้งหมดของ tenant เรียงตามรหัส

**Permission required:** `fi:currency:read`

### 1.3 Update Currency / แก้ไขสกุลเงิน

**API:** `PUT /api/v1/currencies/:id`

**Editable fields:** name, symbol, isActive (boolean to enable/disable)

**Permission required:** `fi:currency:update`

**Rules / กฎ:**
- Currency code cannot be changed after creation / ไม่สามารถเปลี่ยนรหัสสกุลเงินหลังสร้างแล้ว
- Deactivating a currency does not delete existing transactions / การปิดการใช้งานไม่ลบธุรกรรมที่มีอยู่

### 1.4 Add Exchange Rate / เพิ่มอัตราแลกเปลี่ยน

**API:** `POST /api/v1/exchange-rates`

**Fields / ฟิลด์:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| fromCurrency | string | Yes | สกุลเงินต้นทาง (3 chars, ISO 4217) |
| toCurrency | string | Yes | สกุลเงินปลายทาง (3 chars, ISO 4217) |
| rate | string | Yes | อัตราแลกเปลี่ยน (numeric string) |
| effectiveDate | string | Yes | วันที่มีผล (YYYY-MM-DD) |
| source | string | No | `manual` or `bot`, default `manual` |

**Rules / กฎ:**
- If a rate for the same from/to/date exists, it is **updated** (upsert) / ถ้ามีอัตราเดิมอยู่แล้ว จะอัปเดตทับ
- Rate is stored as numeric (arbitrary precision) / อัตราเก็บเป็น numeric (ความแม่นยำสูง)

### 1.5 List Exchange Rates / ดูอัตราแลกเปลี่ยน

**API:** `GET /api/v1/exchange-rates`

**Query parameters:**
- `fromCurrency` — filter by source currency
- `toCurrency` — filter by target currency
- `limit` — max results (default 50)

### 1.6 Get Rate for Conversion / ดูอัตราสำหรับแปลง

**API:** `GET /api/v1/exchange-rates/convert?from=USD&to=THB&date=2026-01-15`

Returns the **most recent rate on or before** the specified date. / ส่งคืนอัตราล่าสุดที่มีผลก่อนหรือในวันที่ระบุ

**Rules / กฎ:**
- Same currency → rate = 1.000000 / สกุลเงินเดียวกัน อัตรา = 1
- If no rate found → `404 Not Found` / ถ้าไม่พบอัตรา → 404

### 1.7 FX Revaluation / ปรับมูลค่าอัตราแลกเปลี่ยนสิ้นเดือน

**API:** `POST /api/v1/gl/fx-revaluation`

Revalues all open foreign currency bills at the month-end exchange rate and creates a journal entry for the unrealized FX gain/loss.

ปรับมูลค่าใบเรียกเก็บเงินสกุลเงินต่างประเทศทั้งหมดตามอัตราสิ้นเดือน พร้อมสร้างใบสำคัญบัญชีสำหรับกำไร/ขาดทุนจากอัตราแลกเปลี่ยนที่ยังไม่เกิดขึ้นจริง

**Fields / ฟิลด์:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| currencyCode | string | Yes | สกุลเงินที่ต้องการปรับ |
| asOfDate | string | Yes | วันที่สิ้นเดือน (YYYY-MM-DD) |
| fiscalYear | integer | Yes | ปีบัญชี |
| fiscalPeriod | integer | Yes | งวดบัญชี (1-12) |

**Permission required:** `gl:journal:create`

**How it works / วิธีการทำงาน:**
1. Looks up the month-end rate for `currencyCode → THB` / ค้นหาอัตราสิ้นเดือน
2. Finds all open bills (`posted`, `partial`) with that currency / ค้นหาใบเรียกเก็บเงินที่เปิดอยู่
3. Calculates new local amount = foreign amount × new rate / คำนวณจำนวนเงินท้องถิ่นใหม่
4. Updates `local_amount_satang` and `exchange_rate` on each bill / อัปเดตยอดเงินในแต่ละบิล
5. Creates a **posted journal entry** with: / สร้างใบสำคัญบัญชี:
   - **FX Gain:** Dr AP (2100), Cr FX Gain (4300)
   - **FX Loss:** Dr FX Loss (5300), Cr AP (2100)

**Response:** Returns count of revalued items, total gain/loss in satang, and the journal entry ID.

**Errors / ข้อผิดพลาด:**
- `404` — No exchange rate found for the currency/date / ไม่พบอัตราแลกเปลี่ยน

**Tips / เคล็ดลับ:**
- Run FX revaluation at the end of each month before closing the period / รัน FX revaluation ก่อนปิดงวดทุกเดือน
- Ensure exchange rates are entered for the month-end date / ตรวจสอบว่ามีอัตราแลกเปลี่ยนของวันสิ้นเดือน

---

## 2. Multi-Company / หลายบริษัท

### Overview / ภาพรวม

The Multi-Company module (Phase 5.2) supports organizational structures with multiple companies and branches under a single tenant. It provides intercompany transaction management with automatic mirror journal entries, and consolidated reporting across companies.

โมดูลหลายบริษัท (Phase 5.2) รองรับโครงสร้างองค์กรที่มีหลายบริษัทและสาขาภายใต้ tenant เดียว มีระบบธุรกรรมระหว่างบริษัทพร้อมสร้างใบสำคัญบัญชีกระจกอัตโนมัติ และรายงานรวมข้ามบริษัท

### Screens / หน้าจอ

| Screen | Path | Description |
|--------|------|-------------|
| Company List | `/settings/companies` | จัดการบริษัท/สาขา — Manage companies/branches |

### 2.1 Create Company / สร้างบริษัท

**API:** `POST /api/v1/companies`

**Fields / ฟิลด์:**

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| code | string | Yes | min 1 char | รหัสบริษัท |
| name | string | Yes | min 1 char | ชื่อบริษัท |
| taxId | string | No | — | เลขประจำตัวผู้เสียภาษี |
| isBranch | boolean | No | default false | เป็นสาขาหรือไม่ |
| parentCompanyId | string | No* | *Required if isBranch=true | บริษัทแม่ (ถ้าเป็นสาขา) |

**Permission required:** `company:create`

**Rules / กฎ:**
- If `isBranch = true`, `parentCompanyId` is required / ถ้าเป็นสาขา ต้องระบุบริษัทแม่
- Code must be unique within the tenant / รหัสต้องไม่ซ้ำภายใน tenant

### 2.2 List Companies / ดูรายการบริษัท

**API:** `GET /api/v1/companies`

**Query parameters:** `limit` (default 50, max 100), `offset`

Returns paginated list with `hasMore` flag. / ส่งคืนรายการแบบแบ่งหน้า

**Permission required:** `company:read`

### 2.3 Get Company Detail / ดูรายละเอียดบริษัท

**API:** `GET /api/v1/companies/:id`

**Permission required:** `company:read`

### 2.4 Update Company / แก้ไขบริษัท

**API:** `PUT /api/v1/companies/:id`

**Editable fields:** name, taxId, isActive

**Permission required:** `company:update`

### 2.5 Intercompany Transaction / ธุรกรรมระหว่างบริษัท

**API:** `POST /api/v1/companies/ic-transaction`

Creates a transaction between two companies with **automatic mirror journal entries**. / สร้างธุรกรรมระหว่างสองบริษัทพร้อมใบสำคัญบัญชีกระจกอัตโนมัติ

**Fields / ฟิลด์:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| fromCompanyId | string | Yes | บริษัทต้นทาง |
| toCompanyId | string | Yes | บริษัทปลายทาง |
| description | string | Yes | คำอธิบาย |
| amountSatang | string | Yes | จำนวนเงิน (สตางค์) |
| fiscalYear | integer | Yes | ปีบัญชี |
| fiscalPeriod | integer | Yes | งวดบัญชี |

**Permission required:** `gl:journal:create`

**How it works / วิธีการทำงาน:**
1. Verifies both companies belong to the same tenant / ตรวจสอบว่าทั้งสองบริษัทอยู่ใน tenant เดียวกัน
2. Creates **JE in "from" company**: / สร้างใบสำคัญในบริษัทต้นทาง:
   - Dr IC Receivable (1300) / เดบิต ลูกหนี้ระหว่างบริษัท
   - Cr Cash/Bank (1000) / เครดิต เงินสด/ธนาคาร
3. Creates **mirror JE in "to" company**: / สร้างใบสำคัญกระจกในบริษัทปลายทาง:
   - Dr Cash/Bank (1000) / เดบิต เงินสด/ธนาคาร
   - Cr IC Payable (2300) / เครดิต เจ้าหนี้ระหว่างบริษัท
4. Both entries are auto-posted / ทั้งสองรายการถูกผ่านรายการอัตโนมัติ

**Response:** Returns both journal entry IDs (`fromJournalEntryId`, `toJournalEntryId`).

**Errors / ข้อผิดพลาด:**
- `400` — Both companies must exist within the same tenant / ทั้งสองบริษัทต้องอยู่ใน tenant เดียวกัน

### 2.6 Consolidated Report / รายงานรวม

**API:** `GET /api/v1/reports/consolidated?companies=id1,id2&fiscalYear=2026`

Generates a consolidated financial report across multiple companies with **intercompany elimination**.

สร้างรายงานการเงินรวมข้ามหลายบริษัทพร้อมตัดรายการระหว่างบริษัท

**Query parameters:**
- `companies` (required) — comma-separated company IDs
- `fiscalYear` — defaults to current year

**Permission required:** `report:gl:read`

**Output includes:** Account type summaries (debit/credit/net per type) and IC elimination amount.

**Tips / เคล็ดลับ:**
- IC elimination identifies intercompany entries by `description LIKE 'IC:%'` / ระบบตัดรายการ IC โดยดูจากคำอธิบายที่ขึ้นต้นด้วย `IC:`
- Always include all related companies for accurate consolidation / ระบุบริษัทที่เกี่ยวข้องทั้งหมดเพื่อความถูกต้อง

---

## 3. Approval Workflows / ขั้นตอนอนุมัติ

### Overview / ภาพรวม

The Approval module (Phase 5.3) provides configurable multi-step approval workflows for any document type. Each workflow defines a chain of approval steps with role-based approvers, amount thresholds, and auto-escalation timers. Supports approve, reject, and delegate actions.

โมดูลอนุมัติ (Phase 5.3) ให้ระบบ workflow อนุมัติหลายขั้นตอนที่กำหนดเองได้สำหรับเอกสารทุกประเภท แต่ละ workflow กำหนดลำดับการอนุมัติตามบทบาท เกณฑ์จำนวนเงิน และตัวจับเวลา auto-escalation รองรับการอนุมัติ ปฏิเสธ และมอบหมาย

### Screens / หน้าจอ

| Screen | Path | Description |
|--------|------|-------------|
| Approval Settings | `/settings/approvals` | ตั้งค่า workflow อนุมัติ |

### 3.1 Create Approval Workflow / สร้าง Workflow อนุมัติ

**API:** `POST /api/v1/approval-workflows`

**Fields / ฟิลด์:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| documentType | string | Yes | ประเภทเอกสาร e.g. `purchase_order`, `invoice`, `payment` |
| name | string | Yes | ชื่อ workflow |
| steps | array | Yes | ขั้นตอนอนุมัติ (min 1 step) |

**Step fields / ฟิลด์ขั้นตอน:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| stepOrder | integer | Yes | ลำดับขั้นตอน (1, 2, 3...) |
| approverRole | string | Yes | บทบาทผู้อนุมัติ e.g. `manager`, `director`, `cfo` |
| amountThresholdSatang | string | No | เกณฑ์จำนวนเงิน (สตางค์) — default 0 |
| autoEscalateHours | integer | No | ชั่วโมงก่อน auto-escalate |

**Permission required:** `approval:workflow:create`

**Example / ตัวอย่าง:**
```json
{
  "documentType": "purchase_order",
  "name": "PO Approval Chain",
  "steps": [
    { "stepOrder": 1, "approverRole": "manager", "amountThresholdSatang": "0" },
    { "stepOrder": 2, "approverRole": "director", "amountThresholdSatang": "10000000" },
    { "stepOrder": 3, "approverRole": "cfo", "amountThresholdSatang": "50000000" }
  ]
}
```

### 3.2 List Approval Workflows / ดูรายการ Workflow

**API:** `GET /api/v1/approval-workflows`

**Permission required:** `approval:workflow:read`

### 3.3 Submit Document for Approval / ส่งเอกสารเพื่ออนุมัติ

**API:** `POST /api/v1/approvals/submit`

**Fields / ฟิลด์:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| documentId | string | Yes | ID เอกสาร |
| documentType | string | Yes | ประเภทเอกสาร (ต้องตรงกับ workflow ที่ active) |

**Permission required:** `approval:action`

**Rules / กฎ:**
- System auto-finds the active workflow for the document type / ระบบค้นหา workflow ที่ active อัตโนมัติ
- Cannot submit if document already has a pending request / ไม่สามารถส่งซ้ำถ้ามี request ค้างอยู่
- Initial `currentStep = 1` / เริ่มต้นที่ขั้นตอนที่ 1

**Errors / ข้อผิดพลาด:**
- `404` — No active workflow for this document type / ไม่มี workflow สำหรับเอกสารประเภทนี้
- `409` — Document already has a pending approval / เอกสารมี request อนุมัติค้างอยู่แล้ว

### 3.4 List Pending Approvals / ดูรายการรอนุมัติ

**API:** `GET /api/v1/approvals?status=pending&documentType=purchase_order`

**Query parameters:**
- `status` — `pending`, `approved`, `rejected`, `delegated`
- `documentType` — filter by document type

### 3.5 Get Approval Detail / ดูรายละเอียดการอนุมัติ

**API:** `GET /api/v1/approvals/:id`

Returns the approval request with full action history (who approved/rejected at each step).

### 3.6 Approve / อนุมัติ

**API:** `POST /api/v1/approvals/:id/approve`

**Body:** `{ "comment": "Approved — within budget" }` (optional)

**Behavior / พฤติกรรม:**
- If more steps remain → advances to next step (`status = pending`, `currentStep++`) / ถ้ามีขั้นตอนเหลือ → ข้ามไปขั้นตอนถัดไป
- If no more steps → fully approved (`status = approved`) / ถ้าไม่มีขั้นตอนเหลือ → อนุมัติสมบูรณ์

### 3.7 Reject / ปฏิเสธ

**API:** `POST /api/v1/approvals/:id/reject`

**Body:** `{ "comment": "Over budget — needs revision" }` (optional)

Sets `status = rejected` immediately. / เปลี่ยนสถานะเป็น rejected ทันที

### 3.8 Delegate / มอบหมาย

**API:** `POST /api/v1/approvals/:id/delegate`

**Fields / ฟิลด์:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| delegateTo | string | Yes | User ID ของผู้รับมอบหมาย |
| comment | string | No | ข้อความ |

Records the delegation action. Status remains `pending`. / บันทึกการมอบหมาย สถานะยังคงเป็น pending

**Tips / เคล็ดลับ:**
- Set `autoEscalateHours` in workflow steps to prevent approval bottlenecks / ตั้ง auto-escalate เพื่อป้องกันคอขวด
- Use amount thresholds to skip unnecessary steps for small transactions / ใช้เกณฑ์จำนวนเงินเพื่อข้ามขั้นตอนที่ไม่จำเป็น

---

## 4. AI Agents / ตัวแทน AI

### Overview / ภาพรวม

nEIP includes **8 AI agents** that augment accounting workflows. All agents follow a rule-based, deterministic approach with full reasoning transparency (no black-box AI). Each agent returns a **confidence score** and a **confidence zone** (AUTO / REVIEW / MANUAL / BLOCKED) that guides whether results can be auto-applied or need human review.

nEIP มี **AI agent 8 ตัว** ที่ช่วยเสริมขั้นตอนการทำงานบัญชี Agent ทุกตัวใช้วิธีการแบบ rule-based ที่โปร่งใส (ไม่ใช่ AI กล่องดำ) แต่ละ agent ส่งคืน **คะแนนความเชื่อมั่น** และ **โซนความเชื่อมั่น** (AUTO / REVIEW / MANUAL / BLOCKED) เพื่อบอกว่าผลลัพธ์สามารถใช้อัตโนมัติหรือต้องตรวจสอบ

### Screens / หน้าจอ

| Screen | Path | Description |
|--------|------|-------------|
| AI Hub | `/ai` | หน้ารวม AI agents |
| Anomaly Scanner | `/ai/anomaly` | ตรวจจับความผิดปกติ |
| Cash Forecast | `/ai/forecast` | พยากรณ์กระแสเงินสด |
| Smart Categorize | `/ai/categorize` | จัดหมวดหมู่อัจฉริยะ |
| Predictions | `/ai/predictions` | การวิเคราะห์เชิงพยากรณ์ |

### Confidence Zones / โซนความเชื่อมั่น

| Zone | Score Range | Meaning | Action |
|------|-------------|---------|--------|
| AUTO | ≥ 0.90 | High confidence | ใช้ผลอัตโนมัติได้ |
| REVIEW | 0.50 – 0.89 | Moderate confidence | ต้องตรวจสอบก่อนใช้ |
| MANUAL | 0.10 – 0.49 | Low confidence | ต้องตรวจสอบด้วยตนเอง |
| BLOCKED | < 0.10 | Cannot proceed | ไม่สามารถดำเนินการได้ |

---

### 4.1 Anomaly Detection Agent / ตรวจจับความผิดปกติ

**API:** `POST /api/v1/ai/anomaly-scan?period=2026-03`
**Rate limit:** 5 requests/minute
**Permission:** `report:gl:read`

Scans journal entries for a given period and detects anomalous patterns. / สแกนรายการบัญชีของงวดที่กำหนดเพื่อตรวจจับรูปแบบที่ผิดปกติ

**Detection patterns / รูปแบบที่ตรวจจับ:**

| Pattern | Severity | Description |
|---------|----------|-------------|
| Duplicate amounts | Medium/High | ยอดเงินซ้ำกันในวันเดียวกัน (≥3 = High) |
| Unusual hours | Low | ลงรายการนอกเวลาปกติ (ก่อน 06:00 หรือหลัง 22:00) |
| Round numbers | Medium/High | ยอดกลมเกิน 100,000 บาท (≥1M = High) |
| Unusual account combos | Low | ชุดบัญชีที่ไม่เคยใช้ร่วมกันมาก่อน |
| Rarely-used accounts | Medium | บัญชีที่ใช้น้อยกว่า 2 ครั้งในงวด |

**Step-by-step / ขั้นตอน:**
1. Go to **AI > Anomaly Scanner** / ไปที่ **AI > ตรวจจับความผิดปกติ**
2. Select the period (YYYY-MM) / เลือกงวด
3. Click **Run Scan** / คลิก **สแกน**
4. Review findings sorted by severity / ตรวจสอบผลลัพธ์เรียงตามความรุนแรง

**Response fields:** `totalEntriesScanned`, `findings[]` (type, severity, description, affectedJeIds, score), `summary` (highCount, mediumCount, lowCount)

---

### 4.2 Cash Flow Forecast Agent / พยากรณ์กระแสเงินสด

**API:** `GET /api/v1/ai/cash-forecast?days=30`
**Permission:** `report:gl:read`

Projects daily cash positions based on AR aging (expected inflows), AP aging (expected outflows), and recurring journal entries.

พยากรณ์สถานะเงินสดรายวันจากอายุลูกหนี้ (เงินรับ) อายุเจ้าหนี้ (เงินจ่าย) และรายการบัญชีประจำ

**Query parameters:**
- `days` — forecast period, 1–365, default 30

**How it works / วิธีการทำงาน:**
1. Calculates opening cash balance from asset accounts / คำนวณยอดเงินสดเปิด
2. Maps AR invoices → expected inflows by due date / แมปใบแจ้งหนี้ → เงินรับตามวันครบกำหนด
3. Maps AP bills → expected outflows by due date / แมปใบเรียกเก็บเงิน → เงินจ่ายตามวันครบกำหนด
4. Projects recurring JEs across forecast window / คาดการณ์รายการประจำ
5. Returns daily projections with running balance / ส่งคืนการคาดการณ์รายวันพร้อมยอดสะสม

**Response fields:** `forecastDays`, `openingBalance`, `dailyProjections[]` (date, expectedInflow, expectedOutflow, projectedBalance), `summary` (totalExpectedInflow, totalExpectedOutflow, closingBalance, lowestBalance, lowestBalanceDate)

**Tips / เคล็ดลับ:**
- Watch for the `lowestBalanceDate` — this is when your cash position is tightest / สังเกต `lowestBalanceDate` — วันที่เงินสดต่ำสุด
- Confidence is higher when both AR and AP data are available / ความเชื่อมั่นสูงขึ้นเมื่อมีข้อมูลทั้ง AR และ AP

---

### 4.3 Smart Categorization Agent / จัดหมวดหมู่อัจฉริยะ

**API:** `POST /api/v1/ai/categorize`
**Permission:** `ai:categorize:execute`

Automatically suggests GL account categorization for bank transactions using keyword matching (Thai + English).

แนะนำการจัดหมวดหมู่บัญชี GL สำหรับธุรกรรมธนาคารอัตโนมัติ โดยใช้การจับคู่คำสำคัญ (ไทย + อังกฤษ)

**Fields / ฟิลด์:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| description | string | Yes | คำอธิบายธุรกรรม |
| amount | number | Yes | จำนวนเงิน (สตางค์) |

**How it works / วิธีการทำงาน:**
1. **Tenant-specific rules first** — matches against `categorization_rules` table (learned from corrections). Higher confidence due to historical hit counts. / ตรวจสอบกฎเฉพาะ tenant ก่อน (เรียนรู้จากการแก้ไข)
2. **Default patterns** — matches against built-in Thai/English patterns: / จับคู่กับรูปแบบเริ่มต้น:

| Pattern | Account | Code |
|---------|---------|------|
| sale, ขาย, รายรับ | Sales Revenue | 4100 |
| interest, ดอกเบี้ย | Interest Income | 4200 |
| rent, ค่าเช่า | Rent Expense | 5200 |
| salary, เงินเดือน | Salary Expense | 5100 |
| electric, ไฟฟ้า, utility | Utilities Expense | 5300 |
| internet, โทรศัพท์ | Communication Expense | 5400 |
| office, สำนักงาน | Office Supplies | 5500 |
| transport, ขนส่ง | Transportation Expense | 5600 |
| insurance, ประกัน | Insurance Expense | 5700 |
| tax, ภาษี, vat | Tax Payable | 2100 |
| bank fee, ค่าธรรมเนียม | Bank Charges | 5800 |

3. Returns sorted suggestions by confidence / ส่งคืนคำแนะนำเรียงตามความเชื่อมั่น

**Response fields:** `suggestions[]` (accountId, accountCode, accountName, confidence, matchedKeyword, reason), `bestMatch`, `description`

---

### 4.4 Bank Auto-Reconciliation Agent / กระทบยอดธนาคารอัตโนมัติ

**API:** `POST /api/v1/ai/bank-reconcile/:bankAccountId`
**Permission:** `fi:bank:reconcile`

Automatically matches unreconciled bank transactions against ledger entries using a weighted scoring algorithm.

จับคู่ธุรกรรมธนาคารที่ยังไม่กระทบยอดกับรายการบัญชีอัตโนมัติ โดยใช้อัลกอริทึมให้คะแนนแบบถ่วงน้ำหนัก

**Scoring weights / น้ำหนักการให้คะแนน:**

| Signal | Weight | Scoring |
|--------|--------|---------|
| Amount match | 50% | Exact=1.0, Absolute=0.9, Within 1%=0.7 |
| Reference match | 30% | Exact ref=1.0, Ref in desc=0.8, Word overlap=proportional |
| Date proximity | 20% | Same day=1.0, 1 day=0.9, 3 days=0.7, 7 days=0.4, 14 days=0.2 |

**Output categories / หมวดหมู่ผลลัพธ์:**

| Category | Score | Action |
|----------|-------|--------|
| auto_matched | ≥ 0.90 | ปลอดภัยสำหรับกระทบยอดอัตโนมัติ |
| suggested_matches | 0.50 – 0.89 | ต้องตรวจสอบก่อนยืนยัน |
| unmatched | < 0.50 | ไม่พบรายการที่ตรงกัน |

**Response fields:** `autoMatched[]`, `suggestedMatches[]`, `unmatched[]`, `summary`

---

### 4.5 NLP Document Parser Agent / วิเคราะห์เอกสารด้วย NLP

**API:** `POST /api/v1/ai/parse-document` (multipart/form-data)
**Rate limit:** 5 requests/minute
**Permission:** `ai:parse:execute`

Parses vendor invoices and receipts to extract structured data (vendor name, date, amount, tax ID, line items).

วิเคราะห์ใบแจ้งหนี้และใบเสร็จเพื่อดึงข้อมูลแบบมีโครงสร้าง (ชื่อผู้ขาย วันที่ จำนวนเงิน เลขประจำตัวผู้เสียภาษี รายการ)

**Supported file types:** text/plain, text/csv, application/pdf, image/jpeg, image/png
**Max file size:** 10 MB

**Extraction strategy / กลยุทธ์การดึงข้อมูล:**
1. **LLM extraction** (if `LLM_API_KEY` configured) — sends document content to LLM for structured JSON extraction / ส่งเนื้อหาเอกสารไป LLM
2. **Regex fallback** — uses Thai receipt patterns for common fields: / ใช้ regex สำหรับรูปแบบใบเสร็จไทย:
   - Tax ID: `เลขประจำตัวผู้เสียภาษี`, `Tax ID` → 13-digit number
   - Date: `วันที่`, `Date` → DD/MM/YYYY (supports Buddhist Era year conversion)
   - Amount: `รวมทั้งสิ้น`, `Grand Total`, `ยอดรวม` → numeric
   - Vendor: `บริษัท`, `ห้างหุ้นส่วน`, `Company` → company name

**Response fields:** `vendorName`, `date`, `amount`, `taxId` (each with `value` and `confidence`), `items[]`, `extractionMethod` (`llm` or `regex`)

---

### 4.6 Invoice Matching Agent / จับคู่ใบแจ้งหนี้

**Used internally** (not exposed as a direct API endpoint — invoked during payment processing)

Matches incoming payments to outstanding invoices using a weighted scoring algorithm.

จับคู่การรับเงินกับใบแจ้งหนี้ค้างชำระ โดยใช้อัลกอริทึมให้คะแนนแบบถ่วงน้ำหนัก

**Scoring weights / น้ำหนักการให้คะแนน:**

| Signal | Weight | Scoring |
|--------|--------|---------|
| Amount match | 55% | Exact=1.0, Within ±0.5%=0.75, Otherwise=0.0 |
| Customer match | 30% | Same customerId=1.0, Unknown/differs=0.0 |
| Date proximity | 15% | Within 90 days=1.0, 90-180 days=linear decay, >180=0.0 |

**Special handling:**
- **Amount ambiguity:** When multiple invoices share the same amount, a penalty of 5% per extra invoice is applied / เมื่อหลายใบแจ้งหนี้มียอดเท่ากัน ลดคะแนน 5% ต่อใบที่ซ้ำ
- **Minimum threshold:** Candidates scoring below 0.10 are filtered out / ตัดรายการที่คะแนนต่ำกว่า 0.10

---

### 4.7 Month-End Close Agent / ปิดงวดสิ้นเดือน

**Used internally** (invoked during month-end close process)

Performs comprehensive month-end reconciliation checks and suggests closing journal entries.

ตรวจสอบความถูกต้องสิ้นเดือนอย่างครบถ้วนและแนะนำใบสำคัญปิดงวด

**Reconciliation checklist / รายการตรวจสอบ:**

| Check | Status if Problem |
|-------|-------------------|
| Unmatched payments | needs-review (≤5) / error (>5) |
| Journal entry balance (Dr = Cr) | error if any unbalanced |
| Draft journal entries | needs-review |
| Subledger vs GL discrepancies | error |
| Trial balance | error if out of balance |
| Revenue/expense activity | needs-review if no activity |

**Suggested entries / รายการแนะนำ:**
- **Depreciation entries:** Generated from fixed asset records (monthly depreciation amount) / สร้างจากข้อมูลสินทรัพย์ถาวร
- **Accrual entries:** Generated from outstanding accrual items / สร้างจากรายการค้างจ่าย

**Auto-close decision:** `canAutoClose = true` only if zero errors AND zero reviews / ปิดอัตโนมัติได้เมื่อไม่มี error และ review

---

### 4.8 Predictive Analytics Agent / วิเคราะห์เชิงพยากรณ์

**API:** `GET /api/v1/ai/predictions?type=revenue&months=6`
**Permission:** `report:gl:read`

Forecasts future revenue or expenses using linear regression and moving averages based on historical GL data.

พยากรณ์รายรับหรือรายจ่ายในอนาคตโดยใช้ linear regression และ moving average จากข้อมูลบัญชีย้อนหลัง

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| type | string | revenue | `revenue` or `expense` |
| months | integer | 6 | จำนวนเดือนที่พยากรณ์ (1–24) |

**How it works / วิธีการทำงาน:**
1. Fetches last 12 months of posted journal data for the selected account type / ดึงข้อมูลบัญชี 12 เดือนย้อนหลัง
2. Computes **linear regression** (slope, intercept, R²) / คำนวณ linear regression
3. Computes **3-period moving average** / คำนวณ moving average 3 งวด
4. Generates forecast points with **95% confidence bands** (±1.96σ) / สร้างจุดพยากรณ์พร้อมช่วงความเชื่อมั่น 95%

**Response fields:**
- `historical[]` — period + amount
- `trendLine` — slope, intercept, rSquared
- `forecast[]` — period, forecastedAmount, lowerBound, upperBound
- `movingAverage[]` — period + amount

**Requirements / ข้อกำหนด:**
- Minimum 3 historical data points required / ต้องมีข้อมูลย้อนหลังอย่างน้อย 3 จุด
- Forecast limited to 24 months maximum / พยากรณ์ได้สูงสุด 24 เดือน

**Tips / เคล็ดลับ:**
- Check `rSquared` value: closer to 1.0 means better trend fit / ค่า R² ยิ่งใกล้ 1.0 ยิ่งแม่นยำ
- Use both trend line and moving average for more balanced analysis / ใช้ทั้ง trend line และ moving average เพื่อการวิเคราะห์ที่สมดุล

---

## 5. Reports / รายงาน

### Overview / ภาพรวม

nEIP provides standard financial reports and a custom report builder. All reports enforce tenant isolation and require `report:gl:read` permission.

nEIP มีรายงานการเงินมาตรฐานและตัวสร้างรายงานแบบกำหนดเอง รายงานทุกฉบับแยกข้อมูลตาม tenant และต้องมีสิทธิ์ `report:gl:read`

### Screens / หน้าจอ

| Screen | Path | Description |
|--------|------|-------------|
| Reports Hub | `/reports` | หน้ารวมรายงาน |
| Trial Balance | `/reports/trial-balance` | งบทดลอง |
| Balance Sheet | `/reports/balance-sheet` | งบดุล |
| Income Statement | `/reports/income-statement` | งบกำไรขาดทุน |
| P&L | `/reports/pnl` | กำไรขาดทุน |
| Cash Flow | `/reports/cash-flow` | งบกระแสเงินสด |
| AR Aging | `/reports/ar-aging` | รายงานอายุลูกหนี้ |
| AP Aging | `/reports/ap-aging` | รายงานอายุเจ้าหนี้ |
| Equity Changes | `/reports/equity-changes` | งบแสดงการเปลี่ยนแปลงส่วนของเจ้าของ |
| Budget Variance | `/reports/budget-variance` | รายงานเปรียบเทียบงบประมาณ |
| VAT Return | `/reports/vat-return` | รายงานภาษีมูลค่าเพิ่ม |
| SSC Filing | `/reports/ssc-filing` | รายงานประกันสังคม |
| Custom Reports | `/reports/custom` | รายงานแบบกำหนดเอง |

### 5.1 Cash Flow Statement / งบกระแสเงินสด

**API:** `GET /api/v1/reports/cash-flow?year=2026&period=3`

Uses the **indirect method**: starts from net income, adjusts for non-cash items, and classifies GL movements into operating, investing, and financing activities.

ใช้ **วิธีทางอ้อม**: เริ่มจากกำไรสุทธิ ปรับปรุงรายการที่ไม่ใช่เงินสด และจำแนกการเคลื่อนไหวบัญชีเป็นกิจกรรมดำเนินงาน ลงทุน และจัดหาเงิน

**Account classification / การจำแนกบัญชี:**

| Category | Accounts | Description |
|----------|----------|-------------|
| Cash | 100x, 101x, 110x | เงินสดและเงินฝากธนาคาร — excluded from classification |
| Operating | Revenue, expense, current assets/liabilities | กิจกรรมดำเนินงาน |
| Investing | Asset accounts 1500-1999 (fixed assets) | กิจกรรมลงทุน |
| Financing | Equity (3xxx), long-term liabilities (2200+) | กิจกรรมจัดหาเงิน |

**Response fields:** `netIncomeSatang`, `operating` (total + items), `investing` (total + items), `financing` (total + items), `netChange`, `openingCash`, `closingCash`

### 5.2 Custom Report Builder / ตัวสร้างรายงานแบบกำหนดเอง

The custom report builder lets users define, save, and execute ad-hoc reports by selecting data sources, dimensions, and measures.

ตัวสร้างรายงานให้ผู้ใช้กำหนด บันทึก และรันรายงานเฉพาะกิจ โดยเลือกแหล่งข้อมูล มิติ และตัวชี้วัด

#### Save Report Definition / บันทึกนิยามรายงาน

**API:** `POST /api/v1/reports/custom`

**Fields / ฟิลด์:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | ชื่อรายงาน |
| data_source | string | Yes | แหล่งข้อมูล: `gl`, `ar`, `ap`, `hr`, `inventory` |
| dimensions | string[] | Yes | มิติการจัดกลุ่ม |
| measures | object[] | Yes | ตัวชี้วัด (field + aggregation) |
| filters | object[] | No | ตัวกรอง |

**Available data sources / แหล่งข้อมูลที่ใช้ได้:**

| Source | Base Table | Joins |
|--------|-----------|-------|
| gl | journal_entries | journal_entry_lines, chart_of_accounts |
| ar | invoices | contacts |
| ap | bills | contacts |
| hr | employees | departments |
| inventory | products | stock_movements |

**Available dimensions / มิติที่ใช้ได้:**
`account`, `account_name`, `customer`, `vendor`, `department`, `period`, `month`, `status`, `year`

**Available measures / ตัวชี้วัดที่ใช้ได้:**

| Field | Column | Description |
|-------|--------|-------------|
| debit | jel.debit_satang | ยอดเดบิต |
| credit | jel.credit_satang | ยอดเครดิต |
| amount | inv.total_satang | ยอดรวมใบแจ้งหนี้ |
| balance_due | inv.balance_due_satang | ยอดค้างชำระ |
| bill_amount | b.total_satang | ยอดรวมใบเรียกเก็บ |
| quantity | sm.quantity | ปริมาณ |
| count | 1 | จำนวนรายการ |

**Aggregation types:** `sum`, `count`, `avg`

#### List Saved Reports / ดูรายงานที่บันทึก

**API:** `GET /api/v1/reports/custom`

#### Execute Report / รันรายงาน

**API:** `POST /api/v1/reports/custom/:id/run`
**Rate limit:** 5 requests/minute

Runs the saved report definition and returns up to **5,000 rows** of results.

**Response fields:** `reportId`, `reportName`, `dataSource`, `generatedAt`, `rowCount`, `data[]`

**Tips / เคล็ดลับ:**
- All column references are whitelisted to prevent SQL injection / คอลัมน์ทั้งหมดผ่าน whitelist ป้องกัน SQL injection
- Max 5,000 rows per report execution / สูงสุด 5,000 แถวต่อการรัน
- Use filters to narrow results for large datasets / ใช้ตัวกรองเพื่อจำกัดผลลัพธ์

---

## 6. Dashboard / แดชบอร์ด

### Overview / ภาพรวม

The Dashboard module provides executive-level financial overview, consolidated cross-organization views, drill-down capabilities, and role-based widget configuration.

โมดูลแดชบอร์ดให้ภาพรวมการเงินระดับผู้บริหาร มุมมองรวมข้ามองค์กร ความสามารถในการเจาะลึก และการกำหนดค่า widget ตามบทบาท

### 6.1 Executive Dashboard / แดชบอร์ดผู้บริหาร

**API:** `GET /api/v1/dashboard/executive?period=mtd`
**Permission:** `report:gl:read`

**Period options / ตัวเลือกช่วงเวลา:**

| Period | Description |
|--------|-------------|
| `mtd` | Month to date / ต้นเดือนถึงปัจจุบัน (default) |
| `qtd` | Quarter to date / ต้นไตรมาสถึงปัจจุบัน |
| `ytd` | Year to date / ต้นปีถึงปัจจุบัน |
| `custom` | Custom range (requires `startDate` and `endDate`) / กำหนดเอง |

**Dashboard widgets / วิดเจ็ต:**

1. **Revenue Trend** — Last 6 months of revenue by month / แนวโน้มรายรับ 6 เดือนย้อนหลัง
2. **Total Revenue** — Sum for the selected period / รายรับรวมของช่วงเวลาที่เลือก
3. **Expense Breakdown** — By account, sorted by amount descending / ค่าใช้จ่ายแยกตามบัญชี
4. **Total Expenses** — Sum for the selected period / ค่าใช้จ่ายรวม
5. **Cash Flow** — Inflow, outflow, and net / กระแสเงินสด: เข้า ออก สุทธิ
6. **AR Aging** — 5 buckets: Current, 1-30, 31-60, 61-90, 90+ days / อายุลูกหนี้ 5 ช่วง
7. **Budget Utilization** — Budget vs actual with percentage / งบประมาณ vs จริง พร้อมเปอร์เซ็นต์

All monetary values are in **satang strings** for bigint precision. / ค่าเงินทั้งหมดเป็น **สตางค์** เพื่อความแม่นยำ

### 6.2 Consolidated Dashboard / แดชบอร์ดรวม

**API:** `GET /api/v1/dashboard/consolidated`

Shows cross-organization metrics for all tenants the user belongs to. / แสดงตัวชี้วัดข้ามองค์กรสำหรับทุก tenant ที่ผู้ใช้สังกัด

**Per-organization metrics:**
- Revenue MTD / รายรับเดือนปัจจุบัน
- Expenses MTD / ค่าใช้จ่ายเดือนปัจจุบัน
- Net Income / กำไรสุทธิ
- Outstanding AR / ลูกหนี้ค้างชำระ
- Outstanding AP / เจ้าหนี้ค้างชำระ

### 6.3 Revenue Drill-Down / เจาะลึกรายรับ

**API:** `GET /api/v1/dashboard/revenue-detail?startDate=2026-01-01&endDate=2026-03-31&limit=100`
**Permission:** `report:gl:read`

Returns **transaction-level detail** for revenue entries. / ส่งคืนรายละเอียดระดับธุรกรรมของรายรับ

**Response fields per transaction:** entryId, entryNumber, date, accountCode, accountName, description, amount

### 6.4 Expense Drill-Down / เจาะลึกค่าใช้จ่าย

**API:** `GET /api/v1/dashboard/expense-detail?startDate=2026-01-01&endDate=2026-03-31&limit=100`
**Permission:** `report:gl:read`

Same structure as revenue drill-down but for expense entries. / โครงสร้างเดียวกับ revenue drill-down แต่สำหรับค่าใช้จ่าย

### 6.5 Role-Based Widget Configuration / กำหนดวิดเจ็ตตามบทบาท

**API:** `GET /api/v1/dashboard/config?role=cfo`
**Permission:** `dashboard:config:read`

Returns the widget configuration for a specific role. / ส่งคืนการกำหนดค่าวิดเจ็ตสำหรับบทบาทที่ระบุ

**Available roles:** `cfo`, `accountant`, `sales`, `hr`

**Default widgets** (if no custom config exists):
`revenue_trend`, `expense_breakdown`, `cash_flow`, `ar_aging`

---

## 7. Authentication / การยืนยันตัวตน

### Overview / ภาพรวม

nEIP uses JWT-based authentication with argon2id password hashing, access + refresh token pattern, and brute-force protection.

nEIP ใช้การยืนยันตัวตนแบบ JWT พร้อมแฮชรหัสผ่าน argon2id รูปแบบ access + refresh token และการป้องกัน brute-force

### 7.1 Register / ลงทะเบียน

**API:** `POST /api/v1/auth/register`

**Fields / ฟิลด์:**

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| email | string | Yes | valid email format | อีเมล |
| password | string | Yes | min 12 characters | รหัสผ่าน (ขั้นต่ำ 12 ตัวอักษร) |
| name | string | Yes | 1–255 characters | ชื่อที่แสดง |
| tenantId | string | No | — | Tenant ID (default: `default`) |

**Rules / กฎ:**
- Email is normalized to lowercase / อีเมลถูกแปลงเป็นตัวพิมพ์เล็ก
- Password hashed with argon2id (64 MiB memory, 3 iterations, 4 parallel lanes) / แฮชด้วย argon2id
- Duplicate email → `409 Conflict` / อีเมลซ้ำ → 409

**Response:** User profile (id, email, name, tenantId, createdAt) — **no password hash** returned

### 7.2 Login / เข้าสู่ระบบ

**API:** `POST /api/v1/auth/login`

**Fields / ฟิลด์:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | อีเมล |
| password | string | Yes | รหัสผ่าน |

**Response:**

| Field | Description |
|-------|-------------|
| accessToken | JWT access token (expires in 1 hour) / โทเค็นเข้าถึง (หมดอายุ 1 ชม.) |
| refreshToken | Opaque refresh token (expires in 30 days) / โทเค็นรีเฟรช (หมดอายุ 30 วัน) |
| tokenType | `Bearer` |
| expiresIn | 3600 (seconds) |

**Security measures / มาตรการความปลอดภัย:**
- **Brute-force protection:** Max 10 failed attempts per IP within 5-minute window → `429 Too Many Requests` / ป้องกัน brute-force: ผิดเกิน 10 ครั้งใน 5 นาที
- **Timing-safe:** Runs dummy argon2 hash for unknown emails to prevent timing attacks / ป้องกัน timing attack
- **Generic error message:** "Invalid email or password" — never reveals whether email exists / ข้อความทั่วไป ไม่เปิดเผยว่ามีอีเมลหรือไม่

### 7.3 Refresh Token / รีเฟรชโทเค็น

**API:** `POST /api/v1/auth/refresh`

Rotates the refresh token and issues a new access token. / หมุนเวียน refresh token และออก access token ใหม่

### 7.4 Logout / ออกจากระบบ

**API:** `POST /api/v1/auth/logout`

Revokes the refresh token. / เพิกถอน refresh token

---

## 8. Roles & Permissions / บทบาทและสิทธิ์

### Overview / ภาพรวม

Enhanced RBAC (Role-Based Access Control) with custom permissions. Permission format: `resource:action` or `resource:action:scope` (e.g., `fi:currency:create`, `report:gl:read`).

RBAC แบบเพิ่มประสิทธิภาพพร้อมสิทธิ์ที่กำหนดเอง รูปแบบสิทธิ์: `resource:action` หรือ `resource:action:scope`

### Default Roles / บทบาทเริ่มต้น

| Role | Description | Can Delete? |
|------|-------------|-------------|
| Owner | เจ้าของ — full access | No |
| Accountant | นักบัญชี — financial operations | No |
| Approver | ผู้อนุมัติ — approval actions | No |

### 8.1 Create Custom Role / สร้างบทบาทแบบกำหนดเอง

**API:** `POST /api/v1/roles`
**Permission required:** `role:assign`

**Fields / ฟิลด์:**

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| name | string | Yes | 1–100 chars, unique per tenant | ชื่อบทบาท |
| permissions | string[] | Yes | min 1, format `resource:action` | สิทธิ์ที่กำหนด |

**Permission format:** Must match pattern `^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*(:[a-z][a-z0-9-]*)?$`

**Errors / ข้อผิดพลาด:**
- `409` — Role name already exists in tenant / ชื่อบทบาทซ้ำ

### 8.2 List Roles / ดูรายการบทบาท

**API:** `GET /api/v1/roles`
**Permission required:** `role:read`

Returns all roles with their permission sets. Each role indicates `isDefault: true/false`.

### 8.3 Update Role Permissions / อัปเดตสิทธิ์ของบทบาท

**API:** `PUT /api/v1/roles/:id`
**Permission required:** `role:assign`

**Behavior:** Replaces all existing permissions with the new set (full replacement, not merge). / แทนที่สิทธิ์ทั้งหมดด้วยชุดใหม่

### 8.4 Delete Custom Role / ลบบทบาทแบบกำหนดเอง

**API:** `DELETE /api/v1/roles/:id`
**Permission required:** `role:assign`

**Rules / กฎ:**
- Default roles (Owner, Accountant, Approver) cannot be deleted / ลบบทบาทเริ่มต้นไม่ได้
- Roles with assigned users cannot be deleted / ลบบทบาทที่มีผู้ใช้สังกัดไม่ได้

**Errors / ข้อผิดพลาด:**
- `403` — Attempting to delete a default role / พยายามลบบทบาทเริ่มต้น
- `409` — Role has users assigned / บทบาทมีผู้ใช้สังกัดอยู่

---

## 9. PDPA Data Subject Rights / สิทธิ์เจ้าของข้อมูล PDPA

### Overview / ภาพรวม

The PDPA module implements Thai Personal Data Protection Act (พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล) compliance for data subject rights — specifically the right to access and right to erasure of personal data.

โมดูล PDPA รองรับ พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล สำหรับสิทธิ์ของเจ้าของข้อมูล — สิทธิ์ในการเข้าถึงและสิทธิ์ในการลบข้อมูลส่วนบุคคล

### Screens / หน้าจอ

| Screen | Path | Description |
|--------|------|-------------|
| PDPA Settings | `/settings/pdpa` | จัดการคำร้องสิทธิ์ PDPA |

**Permission required for all PDPA operations:** `pdpa:manage`

### 9.1 Data Access Request / คำร้องขอเข้าถึงข้อมูล

**API:** `POST /api/v1/pdpa/access-request`

Exports all PII for a specified person (employee or contact). / ส่งออก PII ทั้งหมดของบุคคลที่ระบุ

**Fields / ฟิลด์:**

| Field | Type | Required | Values | Description |
|-------|------|----------|--------|-------------|
| subjectType | string | Yes | `employee`, `contact` | ประเภทเจ้าของข้อมูล |
| subjectId | string | Yes | — | ID ของเจ้าของข้อมูล |

**Data exported for employees / ข้อมูลที่ส่งออกสำหรับพนักงาน:**
- Personal info: employee_code, title_th, first_name_th/en, last_name_th/en, nickname, email, phone
- Sensitive: national_id, tax_id, social_security_number, date_of_birth
- Employment: hire_date, position, employment_type, bank_account_number, bank_name, nationality, status
- Payroll history: last 24 periods (gross, net, SSO, PIT)

**Data exported for contacts / ข้อมูลที่ส่งออกสำหรับผู้ติดต่อ:**
- contact_type, code, company_name, contact_person, email, phone, tax_id, branch_number, full address

**Response:** `requestId`, `status: completed`, data object, `generatedAt`

### 9.2 Data Erasure Request / คำร้องขอลบข้อมูล

**API:** `POST /api/v1/pdpa/erasure-request`

Anonymizes all PII across tables for a specified person. / ลบข้อมูลส่วนบุคคลในทุกตารางของบุคคลที่ระบุ

**Fields:** Same as access request (subjectType, subjectId)

**Employee anonymization / การลบข้อมูลพนักงาน:**
- Names → `ลบข้อมูล` (TH) / `Anonymized` (EN)
- Email → `anonymized-{id}@deleted`
- Nullified: phone, national_id, tax_id, social_security_number, bank_account_number, date_of_birth, title_th, nickname, notes
- Status → `anonymized`
- **WHT certificates** referencing the employee's tax ID are also redacted / ใบรับรอง WHT ที่อ้างอิงเลขประจำตัวผู้เสียภาษีถูก redact ด้วย

**Contact anonymization / การลบข้อมูลผู้ติดต่อ:**
- company_name → `ลบข้อมูล (Anonymized)`
- Nullified: contact_person, email, phone, tax_id, all address fields
- **WHT certificates** referencing the contact's tax ID are also redacted

**Rules / กฎ:**
- Cannot erasure an already-anonymized employee → `400 Validation Error` / ไม่สามารถลบข้อมูลที่ anonymized แล้ว
- Erasure is **irreversible** — financial records are preserved but PII is removed / การลบไม่สามารถย้อนกลับได้

**Response:** `requestId`, `anonymizedFields[]`, `completedAt`

### 9.3 List PDPA Requests / ดูรายการคำร้อง PDPA

**API:** `GET /api/v1/pdpa/requests?status=completed&limit=20&offset=0`

Lists all PDPA data subject requests with status tracking.

**Query parameters:** `limit` (1-100, default 20), `offset`, `status` (pending, processing, completed, rejected)

**Response fields per request:** id, requestType (access/erasure), subjectType, subjectId, status, requestedBy, completedAt, createdAt

---

## 10. Settings / การตั้งค่า

### Overview / ภาพรวม

The Settings section provides configuration pages for all system-level parameters. / ส่วนตั้งค่าสำหรับพารามิเตอร์ระดับระบบ

### Screens / หน้าจอ

| Screen | Path | Description |
|--------|------|-------------|
| Settings Hub | `/settings` | หน้ารวมการตั้งค่า |
| Organization | `/settings/organization` | ข้อมูลองค์กร — Company profile, logo, address |
| Team | `/settings/team` | จัดการทีม — User management, role assignment |
| Companies | `/settings/companies` | หลายบริษัท — Multi-company/branch management |
| Currencies | `/settings/currencies` | สกุลเงิน — Currency and exchange rate management |
| Approvals | `/settings/approvals` | ขั้นตอนอนุมัติ — Approval workflow configuration |
| Tax | `/settings/tax` | ภาษี — WHT rates, VAT settings |
| Fiscal | `/settings/fiscal` | ปีบัญชี — Fiscal year/period configuration |
| Payment Terms | `/settings/payment-terms` | เงื่อนไขการชำระเงิน — Net 30, Net 60, etc. |
| Leave Calendar | `/settings/leave-calendar` | ปฏิทินวันหยุด — Public holidays, company holidays |
| AI Config | `/settings/ai-config` | ตั้งค่า AI — Agent configuration, LLM API key |
| Audit | `/settings/audit` | บันทึกตรวจสอบ — Audit log viewer |
| PDPA | `/settings/pdpa` | คุ้มครองข้อมูล — PDPA data subject rights management |

### Settings Quick Reference / อ้างอิงการตั้งค่า

#### Organization / องค์กร
- Company name, address, tax ID, branch number / ชื่อบริษัท ที่อยู่ เลขผู้เสียภาษี เลขสาขา
- Logo upload / อัปโหลดโลโก้
- Base currency (THB default) / สกุลเงินหลัก

#### Team / ทีม
- Invite users / เชิญผู้ใช้
- Assign roles / กำหนดบทบาท
- Deactivate users / ปิดการใช้งานผู้ใช้

#### Fiscal / ปีบัญชี
- Fiscal year start month / เดือนเริ่มต้นปีบัญชี
- Period locking / ล็อคงวดบัญชี
- Year-end close / ปิดสิ้นปี

#### AI Config / ตั้งค่า AI
- LLM API Key for document parsing / API Key สำหรับวิเคราะห์เอกสาร
- Confidence thresholds / เกณฑ์ความเชื่อมั่น
- Auto-apply settings for bank reconciliation / ตั้งค่าอัตโนมัติสำหรับกระทบยอด

#### Audit / บันทึกตรวจสอบ
- View all system audit logs / ดูบันทึกตรวจสอบทั้งหมด
- Filter by user, action, date range / กรองตามผู้ใช้ การกระทำ ช่วงวันที่
- Export audit trail / ส่งออกรายงานตรวจสอบ

---

## Common Error Codes / รหัสข้อผิดพลาดทั่วไป

| Code | Description (EN) | Description (TH) |
|------|------------------|-------------------|
| 400 | Validation Error — invalid input | ข้อมูลไม่ถูกต้อง |
| 401 | Unauthorized — missing or invalid token | ไม่ได้ยืนยันตัวตน |
| 403 | Forbidden — insufficient permissions | ไม่มีสิทธิ์เพียงพอ |
| 404 | Not Found — resource does not exist | ไม่พบข้อมูล |
| 409 | Conflict — duplicate or state conflict | ข้อมูลซ้ำหรือสถานะขัดแย้ง |
| 429 | Too Many Requests — rate limit exceeded | คำขอมากเกินไป |

---

## Tips & Best Practices / เคล็ดลับและแนวปฏิบัติที่ดี

1. **FX Revaluation:** Run at month-end before closing the period. Ensure exchange rates are up-to-date. / รัน FX revaluation ก่อนปิดงวด
2. **Approval Workflows:** Design workflows with amount thresholds to skip unnecessary steps. / ออกแบบ workflow ด้วยเกณฑ์จำนวนเงิน
3. **AI Confidence:** Always review REVIEW-zone results manually. AUTO-zone results can be applied without review. / ตรวจสอบผลลัพธ์โซน REVIEW ด้วยตนเอง
4. **PDPA Erasure:** This is irreversible. Ensure proper authorization before executing. / การลบ PDPA ย้อนกลับไม่ได้
5. **Custom Reports:** Use filters to limit result sets. Max 5,000 rows per execution. / ใช้ตัวกรองจำกัดผลลัพธ์
6. **Passwords:** Minimum 12 characters. Use a strong, unique password. / รหัสผ่านขั้นต่ำ 12 ตัวอักษร
7. **Roles:** Cannot delete roles with assigned users. Reassign users first. / ลบบทบาทที่มีผู้ใช้ไม่ได้ ต้องย้ายผู้ใช้ก่อน
8. **Intercompany:** Mirror journal entries are auto-created. IC elimination in consolidated reports relies on `IC:` prefix in descriptions. / รายการกระจกสร้างอัตโนมัติ
9. **Dashboard:** Use role-based config to customize widgets per role (CFO, Accountant, Sales, HR). / ใช้ config ตามบทบาทเพื่อปรับแต่งวิดเจ็ต
10. **Token Security:** Access tokens expire in 1 hour. Use refresh tokens to obtain new access tokens. / Access token หมดอายุ 1 ชม. ใช้ refresh token ต่ออายุ
