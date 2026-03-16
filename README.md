<p align="center">
  <img src="https://img.shields.io/badge/status-alpha-orange" alt="Status: Alpha" />
  <img src="https://img.shields.io/badge/modules-31-blue" alt="31 Modules" />
  <img src="https://img.shields.io/badge/API-186_endpoints-green" alt="186 API Endpoints" />
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
| **WinSpeed / FlowAccount / PeakAccount** | ทำได้แค่บัญชี ไม่ใช่ ERP ครบวงจร ไม่มี API ให้ต่อ |
| **SAP B1 / HANA** | แพงมาก ซับซ้อน ต้องมีทีม IT ใหญ่ |
| **Odoo** | ต้อง hack ตลอด tech stack เก่า ต้องใช้ XML-RPC |
| **Excel** | ยืดหยุ่นแต่ไม่มี structure ไม่มี audit trail |

---

## แนวคิดของ nEIP

ให้มองอย่างนี้ — **3 ช่องทาง สำหรับ 3 กลุ่มคน**:

### 1. 🖥️ Web UI — สำหรับคนทำงานเดิม
บัญชี, การเงิน, admin — **ใช้หน้าจอเหมือน ERP ปกติ** กดๆ คลิกๆ ได้เลย ไม่ต้องเรียนรู้อะไรใหม่ ปล่อยเขาทำงานไป

### 2. 🔌 REST API — สำหรับ Dev / IT
เชื่อมต่อระบบอื่น อ่านข้อมูลใน ERP ได้ทันที auto-migrate ข้อมูลเข้าได้ ไม่ต้องจ้าง consultant อีกต่อไป — **186 endpoints พร้อม Swagger docs**

### 3. ⌨️ CLI — สำหรับ AI Agent
ทำมาเพื่อรองรับ **agent-based AI worker** เช่น:
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

> **เรื่อง MCP** — กำลังศึกษาอยู่ว่าจะเพิ่มดีไหม เพราะ MCP serialize ข้อมูลทุก request ทำให้เปลือง token โดยเฉพาะข้อมูล ERP ที่ใหญ่ ตอนนี้ CLI approach ประหยัดกว่า แต่เพิ่ม MCP ได้ไม่ยากเพราะมี API ครบอยู่แล้ว

---

## สถานะปัจจุบัน

> ⚠️ **Alpha — ยังไม่เสร็จ** แต่ทดสอบผ่านบางส่วนแล้ว

### 31 Modules (ลอกโครงสร้างจาก SAP มาเลย บอกตรงๆ)

| กลุ่ม | Module | ภาษาไทย | API | Web | CLI |
|-------|--------|---------|:---:|:---:|:---:|
| **การเงิน** | FI-GL | บัญชีแยกประเภท | ✓ | ✓ | ✓ |
| | FI-AR | ลูกหนี้การค้า | ✓ | ✓ | ✓ |
| | FI-AP | เจ้าหนี้การค้า | ✓ | ✓ | ✓ |
| | FI-AA | สินทรัพย์ถาวร | ✓ | ✓ | ✓ |
| | FI-BL | กระทบยอดธนาคาร | ✓ | ✓ | ✓ |
| | FI-TV | ใบหัก ณ ที่จ่าย (ภ.ง.ด.3/53) | ✓ | ✓ | ✓ |
| | FI-TX | ภาษี VAT 7% / WHT | ✓ | ✓ | ✓ |
| **ควบคุม** | CO | ศูนย์ต้นทุน / ศูนย์กำไร / งบประมาณ | ✓ | ✓ | ✓ |
| **ขาย** | SD-QT | ใบเสนอราคา | ✓ | ✓ | ✓ |
| | SD-SO | ใบสั่งขาย | ✓ | ✓ | ✓ |
| | SD-DO | ใบส่งของ | ✓ | ✓ | ✓ |
| | SD-INV | ใบแจ้งหนี้ / ใบกำกับภาษี | ✓ | ✓ | ✓ |
| | SD-RC | ใบเสร็จรับเงิน | ✓ | ✓ | ✓ |
| | SD-CN | ใบลดหนี้ | ✓ | ✓ | ✓ |
| | SD-PAY | รับชำระเงิน | ✓ | ✓ | ✓ |
| **จัดซื้อ** | MM-PO | ใบสั่งซื้อ | ✓ | ✓ | ✓ |
| **คลัง** | MM-IM | คลังสินค้า / สต็อก | ✓ | ✓ | ✓ |
| | MM-PR | สินค้า / SKU | ✓ | ✓ | ✓ |
| **บุคคล** | HR | พนักงาน / แผนก / เงินเดือน / ลา | ✓ | ✓ | ✓ |
| **CRM** | CRM | ทะเบียนลูกค้า + ผู้ขาย | ✓ | ✓ | ✓ |
| **รายงาน** | RPT | งบทดลอง, กำไรขาดทุน, งบดุล, P&L | ✓ | ✓ | ✓ |
| **แดชบอร์ด** | DASH | ภาพรวมธุรกิจ | ✓ | ✓ | ✓ |
| **ตรวจสอบ** | AUDIT | บันทึกทุกการเปลี่ยนแปลง | ✓ | ✓ | ✓ |

### วงจรเอกสาร

```
ขาย:    ใบเสนอราคา → ใบสั่งขาย → ใบส่งของ → ใบแจ้งหนี้ → รับเงิน → ใบเสร็จ
ซื้อ:    ใบสั่งซื้อ → บิล → จ่ายเงิน → ใบหัก ณ ที่จ่าย
บัญชี:   บันทึกรายวัน → ผ่านรายการ → งบทดลอง → งบการเงิน → ปิดงวด
HR:     รับพนักงาน → เงินเดือน → ประกันสังคม → ลา → ลาออก
คลัง:    สร้างสินค้า → รับเข้า → ขาย → ส่งของ → ตรวจนับ
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
  -f packages/db/migrations/0007_compliance_fixes.sql

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

---

## Architecture

```
┌─ ใครใช้อะไร ──────────────────────────────┐
│ 🖥️ Web UI      → บัญชี, การเงิน, admin    │
│ 🔌 REST API    → Dev, IT, integration     │
│ ⌨️ CLI         → AI agent, power user     │
├─ API Gateway ─────────────────────────────┤
│ Fastify 5.8 · 186 endpoints · JWT        │
│ RBAC 140 permissions · Audit auto-log    │
├─ Shared Logic ────────────────────────────┤
│ @neip/shared · @neip/core · @neip/db    │
│ @neip/ai · @neip/tax                    │
├─ Business Modules (31 modules) ──────────┤
│ Finance · Sales · Purchase · Inventory   │
│ HR · Controlling · CRM · Reports         │
├─ AI Layer ────────────────────────────────┤
│ BaseAgent · HITL · Confidence Zones      │
├─ Infrastructure ──────────────────────────┤
│ PostgreSQL 17 · 58 tables · RLS         │
│ pg-boss · Docker · Pino                 │
└───────────────────────────────────────────┘
```

## Thai Compliance (กฎหมายไทย)

| หัวข้อ | รายละเอียด |
|--------|-----------|
| VAT | 7% round-half-up ตามกรมสรรพากร |
| WHT | 8 ประเภทรายได้ พร้อมออก ภ.ง.ด.3/53 |
| ประกันสังคม | 5% สูงสุด 750 บาท |
| PDPA | ปิดบัง PII, anonymize, audit trail |
| ผังบัญชี | มาตรฐาน TFAC สภาวิชาชีพบัญชี |
| ปี พ.ศ. | รองรับพุทธศักราชในรายงาน |
| เก็บข้อมูล | 7 ปีตามประมวลรัษฎากร ม.87/3 |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + pnpm |
| API | Fastify 5.8, TypeScript strict |
| Web | Next.js 15, React 19, Tailwind 4 |
| CLI | Commander.js |
| DB | PostgreSQL 17, Drizzle ORM, RLS |
| AI | BaseAgent, HITL, Confidence Zones |
| Auth | argon2id, JWT |
| Queue | pg-boss v12 |

## แผนต่อไป

- [ ] แก้ Web UI ให้ใช้งานได้ครบทุกหน้า
- [ ] เพิ่ม E2E tests (Playwright)
- [ ] พิจารณา MCP Server
- [ ] เพิ่ม AI agents เฉพาะทาง (cashflow forecast, demand planning)
- [ ] Mobile app (React Native)
- [ ] Open source core modules

## License

MIT — แจกฟรี ใช้ได้เลย

---

<p align="center">
  <strong>nEIP</strong> — เนถีบ ERP<br/>
  สร้างโดย <a href="https://github.com/killernay">เน (Chanon N.)</a><br/>
  เพราะข้อมูลของคุณ ควรเข้าถึงได้ง่ายๆ ไม่ต้องจ่ายแพง
</p>
