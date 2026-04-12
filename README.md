<p align="center">
  <img src="https://img.shields.io/badge/status-beta-brightgreen" alt="Status: Beta" />
  <img src="https://img.shields.io/badge/modules-31-blue" alt="31 Modules" />
  <img src="https://img.shields.io/badge/API-300+_endpoints-green" alt="300+ API Endpoints" />
  <img src="https://img.shields.io/badge/MCP-110_tools-purple" alt="110 MCP Tools" />
  <img src="https://img.shields.io/badge/license-MIT-yellow" alt="MIT License" />
</p>

# nEIP — เนถีบ ERP

**Enterprise Intelligence Platform** — ระบบ ERP ยุคใหม่ที่ข้อมูลเข้าง่าย ออกง่าย ไม่ต้องจ่ายแพงทุกครั้งที่อยากดูข้อมูลของตัวเอง

> **nEIP** มาจากชื่อ "เน" (คนเขียน) + **EIP** — เริ่มจาก AI-Native ERP แล้วกลายเป็น Enterprise Intelligence Platform เพราะ ERP มันเก่าไปแล้ว

---

## ทำไมต้องทำใหม่?

**20 ปีที่ผ่านมา ERP มีปัญหาเดิมซ้ำๆ:**

😤 **เอาข้อมูลเข้า ERP = ลำบาก** — คีย์ด้วยมือ ทีละรายการ ทีละหน้าจอ

😤 **เอาข้อมูลออกจาก ERP = ลำบากกว่า** — อยากได้รายงานสักอัน ต้องจ้าง consultant ทุกครั้ง

😤 **จ่ายแพงทุกครั้งที่อยากดูข้อมูลของตัวเอง** — License, customization, report, integration ทุกอย่างเสียเงิน

😤 **AI เข้าถึงข้อมูลไม่ได้** — ERP ทุกตัวในตลาดไม่มีทางให้ AI อ่านหรือเขียนข้อมูลได้

### ระบบที่มีอยู่ในตลาด

| ระบบ | ปัญหา |
|------|-------|
| **โปรแกรมบัญชีในตลาด** | ทำได้แค่บัญชี ไม่ใช่ ERP ครบวงจร ไม่มี API ให้ต่อ |
| **ERP เจ้ายักษ์ระดับโลก** | แพงมาก ซับซ้อน ต้องมีทีม IT ใหญ่ |
| **ERP Open Source ยอดนิยม** | ต้อง hack ตลอด tech stack เก่า ต้องใช้ XML-RPC |
| **Excel** | ยืดหยุ่นแต่ไม่มี structure ไม่มี audit trail |

---

## แนวคิดของ nEIP

ให้มองอย่างนี้ — **4 ช่องทาง สำหรับ 4 กลุ่มคน**:

### 1. 🖥️ Web UI — สำหรับคนทำงานเดิม
บัญชี, การเงิน, admin — **ใช้หน้าจอเหมือน ERP ปกติ** กดๆ คลิกๆ ได้เลย ไม่ต้องเรียนรู้อะไรใหม่ ปล่อยเขาทำงานไป — **113+ หน้าจอ**

### 2. 🔌 REST API — สำหรับ Dev / IT
เชื่อมต่อระบบอื่น อ่านข้อมูลใน ERP ได้ทันที auto-migrate ข้อมูลเข้าได้ ไม่ต้องจ้าง consultant อีกต่อไป — **300+ endpoints พร้อม Swagger docs**

### 3. 🤖 MCP Server — สำหรับ AI Agent
**110 MCP tools** ให้ AI เข้าถึงข้อมูล ERP ได้ทุกมิติ:
- สร้าง invoice, payment, journal entry ผ่าน AI
- ดูรายงาน งบทดลอง กำไรขาดทุน ได้ทันที
- AI วิเคราะห์ anomaly, forecast cash flow, auto-reconcile bank ได้เลย

### 4. ⌨️ CLI — สำหรับ Power User & AI Agent
**89 commands** ครอบคลุมทุก module — ทำมาเพื่อรองรับ **agent-based AI worker** เช่น:
- **Claude Code** — สั่งงาน ERP ผ่าน terminal ได้เลย
- **OpenClaw (น้องกุ้ง)** — ต่อไปจะสร้าง invoice ก็สั่งผ่านน้องกุ้งได้

```bash
# น้องกุ้งสั่งสร้างใบแจ้งหนี้
neip ar invoice create

# Claude Code ดูงบทดลอง
neip reports trial-balance

# ดูภาพรวมธุรกิจ
neip dashboard
```

---

## สถานะปัจจุบัน

> 🟢 **v0.9.0 Beta** — ฟีเจอร์ครบ ทดสอบผ่าน 417 unit tests + 21 E2E specs

### 31 Modules (ลอกโครงสร้างจาก ERP เจ้าใหญ่มาเลย บอกตรงๆ)

| กลุ่ม | Module | ภาษาไทย | API | Web | CLI | MCP |
|-------|--------|---------|:---:|:---:|:---:|:---:|
| **การเงิน** | FI-GL | บัญชีแยกประเภท / Recurring JE | ✓ | ✓ | ✓ | ✓ |
| | FI-AR | ลูกหนี้ / Credit Management / Dunning | ✓ | ✓ | ✓ | ✓ |
| | FI-AP | เจ้าหนี้ / Payment Terms / 3-Way Matching | ✓ | ✓ | ✓ | ✓ |
| | FI-AA | สินทรัพย์ถาวร | ✓ | ✓ | ✓ | ✓ |
| | FI-BL | กระทบยอดธนาคาร / Bank Auto-Matching | ✓ | ✓ | ✓ | ✓ |
| | FI-TV | ใบหัก ณ ที่จ่าย (ภ.ง.ด.3/53) | ✓ | ✓ | ✓ | ✓ |
| | FI-TX | ภาษี VAT 7% / WHT / Multi-Currency | ✓ | ✓ | ✓ | ✓ |
| | FI-CF | Cash Flow Statement | ✓ | ✓ | ✓ | ✓ |
| **ควบคุม** | CO | ศูนย์ต้นทุน / ศูนย์กำไร / งบประมาณ | ✓ | ✓ | ✓ | ✓ |
| | CO-MC | Multi-Company / Intercompany | ✓ | ✓ | ✓ | ✓ |
| **ขาย** | SD-QT | ใบเสนอราคา | ✓ | ✓ | ✓ | ✓ |
| | SD-SO | ใบสั่งขาย | ✓ | ✓ | ✓ | ✓ |
| | SD-DO | ใบส่งของ | ✓ | ✓ | ✓ | ✓ |
| | SD-INV | ใบแจ้งหนี้ / ใบกำกับภาษี | ✓ | ✓ | ✓ | ✓ |
| | SD-RC | ใบเสร็จรับเงิน | ✓ | ✓ | ✓ | ✓ |
| | SD-CN | ใบลดหนี้ | ✓ | ✓ | ✓ | ✓ |
| | SD-PAY | รับชำระเงิน | ✓ | ✓ | ✓ | ✓ |
| | SD-PX | Pricing Engine | ✓ | ✓ | ✓ | ✓ |
| **จัดซื้อ** | MM-PO | ใบสั่งซื้อ | ✓ | ✓ | ✓ | ✓ |
| | MM-PR | Purchase Requisitions / RFQ | ✓ | ✓ | ✓ | ✓ |
| | MM-VR | Vendor Returns | ✓ | ✓ | ✓ | ✓ |
| **คลัง** | MM-IM | คลังสินค้า / Batch & Serial Tracking | ✓ | ✓ | ✓ | ✓ |
| | MM-SC | Stock Count / Cycle Count | ✓ | ✓ | ✓ | ✓ |
| | MM-PD | สินค้า / SKU | ✓ | ✓ | ✓ | ✓ |
| **บุคคล** | HR | พนักงาน / แผนก / เงินเดือน / ลา | ✓ | ✓ | ✓ | ✓ |
| | HR-POS | Positions / Attendance | ✓ | ✓ | ✓ | ✓ |
| **CRM** | CRM | ทะเบียนลูกค้า + ผู้ขาย | ✓ | ✓ | ✓ | ✓ |
| **รายงาน** | RPT | งบทดลอง, กำไรขาดทุน, งบดุล, Cash Flow, Custom Report Builder | ✓ | ✓ | ✓ | ✓ |
| **แดชบอร์ด** | DASH | ภาพรวมธุรกิจ | ✓ | ✓ | ✓ | ✓ |
| **ตรวจสอบ** | AUDIT | บันทึกทุกการเปลี่ยนแปลง / Approval Chains | ✓ | ✓ | ✓ | ✓ |
| **AI** | AI | 8 AI Agents (ดูรายละเอียดด้านล่าง) | ✓ | ✓ | ✓ | ✓ |

### 8 AI Agents

| Agent | ทำอะไร |
|-------|--------|
| **Anomaly Detection** | ตรวจจับรายการผิดปกติอัตโนมัติ |
| **Cash Flow Forecast** | พยากรณ์กระแสเงินสดล่วงหน้า |
| **Smart Categorization** | จัดหมวดรายการอัตโนมัติ |
| **Bank Auto-Reconciliation** | กระทบยอดธนาคารอัตโนมัติ |
| **NLP Document Parsing** | อ่านเอกสารด้วย AI (invoice, receipt) |
| **Predictive Analytics** | วิเคราะห์แนวโน้มและ demand planning |
| **Fraud Detection** | ตรวจจับธุรกรรมต้องสงสัย |
| **Smart Approval** | แนะนำ approval routing ตาม pattern |

### วงจรเอกสาร

```
ขาย:    ใบเสนอราคา → ใบสั่งขาย → ใบส่งของ → ใบแจ้งหนี้ → รับเงิน → ใบเสร็จ
ซื้อ:    PR → RFQ → ใบสั่งซื้อ → 3-Way Matching → บิล → จ่ายเงิน → ใบหัก ณ ที่จ่าย
บัญชี:   บันทึกรายวัน → ผ่านรายการ → งบทดลอง → งบการเงิน → ปิดงวด
HR:     รับพนักงาน → ตำแหน่ง → เงินเดือน → ประกันสังคม → ลา → ลาออก
คลัง:    สร้างสินค้า → Batch/Serial → รับเข้า → ขาย → ส่งของ → Stock Count
```

---

## Quick Start

```bash
# 1. Start database
docker compose up -d db

# 2. Install & build
pnpm install && pnpm run build

# 3. Run migrations
PGPASSWORD=neip psql -h localhost -p 5433 -U neip -d neip \
  -f packages/db/migrations/0000_initial_schema.sql \
  -f packages/db/migrations/0001_domain_events.sql \
  -f packages/db/migrations/0002_complete_schema.sql \
  -f packages/db/migrations/0003_quotations.sql \
  -f packages/db/migrations/0004_sales_purchase_documents.sql \
  -f packages/db/migrations/0005_financial_modules.sql \
  -f packages/db/migrations/0006_inventory_hr_crm.sql \
  -f packages/db/migrations/0007_compliance_fixes.sql \
  -f packages/db/migrations/0008_ar_payment_journal_entry.sql \
  -f packages/db/migrations/0009_document_flow.sql \
  -f packages/db/migrations/0010_year_end_closing.sql \
  -f packages/db/migrations/0011_phase3_core_business.sql \
  -f packages/db/migrations/0012_phase4_operations.sql \
  -f packages/db/migrations/0013_enterprise_features.sql \
  -f packages/db/migrations/0014_ai_analytics.sql \
  -f packages/db/migrations/0015_fix_audit_findings.sql

# 4. Setup environment
cp .env.example .env

# 5. Start API
node apps/api/dist/index.js

# 6. Start Web UI
pnpm --filter web dev -- -p 3100
```

| Service | URL |
|---------|-----|
| Web UI | http://localhost:3100 |
| API Docs (Swagger) | http://localhost:5400/api/docs |
| CLI Help | `neip --help` |
| MCP Server | `neip mcp start` |

---

## Architecture

```
┌─ ใครใช้อะไร ──────────────────────────────┐
│ 🖥️ Web UI (113+ pages) → บัญชี, การเงิน   │
│ 🔌 REST API (300+ endpoints) → Dev, IT    │
│ 🤖 MCP Server (110 tools) → AI Agent     │
│ ⌨️ CLI (89 commands) → Power User         │
├─ API Gateway ─────────────────────────────┤
│ Fastify 5.8 · 300+ endpoints · JWT       │
│ RBAC 140+ permissions · Audit auto-log   │
├─ Shared Logic ────────────────────────────┤
│ @neip/shared · @neip/core · @neip/db    │
│ @neip/ai · @neip/tax · @neip/mcp        │
├─ Business Modules (31 modules) ──────────┤
│ Finance · Sales · Purchase · Inventory   │
│ HR · Controlling · CRM · Reports         │
├─ AI Layer (8 agents) ────────────────────┤
│ Anomaly · Forecast · Categorization      │
│ Auto-Reconcile · NLP Parse · Predict     │
├─ Infrastructure ──────────────────────────┤
│ PostgreSQL 17 · 100+ tables · RLS        │
│ pg-boss · Docker · Pino                  │
└───────────────────────────────────────────┘
```

## Thai Compliance (กฎหมายไทย)

| หัวข้อ | รายละเอียด |
|--------|-----------|
| VAT | 7% round-half-up ตามกรมสรรพากร |
| WHT | 8 ประเภทรายได้ พร้อมออก ภ.ง.ด.3/53 |
| ภ.พ.30 | แบบยื่นภาษีมูลค่าเพิ่มรายเดือน |
| 50 ทวิ | หนังสือรับรองการหักภาษี ณ ที่จ่าย |
| e-Tax Invoice | รองรับ e-Tax Invoice ตามมาตรฐานกรมสรรพากร |
| ประกันสังคม | 5% สูงสุด 750 บาท + SSC filing |
| PDPA | ปิดบัง PII, anonymize, consent management, audit trail |
| ผังบัญชี | มาตรฐาน TFAC สภาวิชาชีพบัญชี |
| ปี พ.ศ. | รองรับพุทธศักราชในรายงาน |
| เก็บข้อมูล | 7 ปีตามประมวลรัษฎากร ม.87/3 |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + pnpm |
| API | Fastify 5.8, TypeScript strict |
| Web | Next.js 15, React 19, Tailwind 4 |
| CLI | Commander.js (89 commands) |
| MCP | 110 tools, JSON-RPC |
| DB | PostgreSQL 17, Drizzle ORM, RLS, 100+ tables |
| AI | 8 Agents, BaseAgent, HITL, Confidence Zones |
| Auth | argon2id, JWT, RBAC |
| Queue | pg-boss v12 |
| Tests | 417 unit tests (Vitest) + 21 E2E specs (Playwright) |

## แผนต่อไป

- [ ] แก้ Web UI ให้ใช้งานได้ครบทุกหน้า
- [ ] เพิ่ม E2E tests ให้ครบ flow
- [ ] Mobile app (React Native)
- [ ] เพิ่ม AI agents เฉพาะทาง (demand planning, inventory optimization)
- [ ] Open source core modules
- [ ] Production deployment guide

## License

MIT — แจกฟรี ใช้ได้เลย

---

<p align="center">
  <strong>nEIP</strong> — เนถีบ ERP<br/>
  สร้างโดย <a href="https://github.com/killernay">เน (Chanon N.)</a><br/>
  เพราะข้อมูลของคุณ ควรเข้าถึงได้ง่ายๆ ไม่ต้องจ่ายแพง
</p>

<p align="center">
  <a href="https://twitter.com/killernay">𝕏 @killernay</a> ·
  <a href="https://github.com/killernay">GitHub</a> ·
  <a href="mailto:chanon@ngernthongdee.co.th">Email</a>
</p>
