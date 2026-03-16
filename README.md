# nEIP — AI-Native EIP for Thai SMEs & Startups

## ทำไมต้อง EIP ไม่ใช่ ERP?

**ERP** (Enterprise Resource Planning) คือซอฟต์แวร์ "วางแผนทรัพยากร" — ออกแบบมาให้คน operate ทุกขั้นตอน: คีย์ข้อมูล → ตรวจสอบ → อนุมัติ → ออกรายงาน ทุกอย่างผ่านหน้าจอ

**EIP** (Enterprise Intelligence Platform) คือแนวคิดใหม่ — ระบบที่ **AI เข้าถึงข้อมูลและทำงานได้ตั้งแต่วันแรก** ไม่ใช่ ERP เดิมที่แปะ AI เข้าไปทีหลัง

```
Traditional ERP:    User → UI Screen → Business Logic → Database
nEIP (AI-Native):   Agent/User → Tool Registry → Business Logic → Database
                                        ↕
                               Event Bus (async)
                                        ↕
                              Other Modules / Agents
```

---

## ปัญหาของ ERP แบบเดิม (Pain Points)

### SMEs/Startups ติดอยู่ในสถานการณ์ที่ยากลำบาก:

| ระบบที่มีในตลาด | ปัญหาหลัก |
|-----------------|-----------|
| **WinSpeed / FlowAccount / PeakAccount** | ทำได้แค่บัญชี ไม่ใช่ ERP ครบวงจร ไม่มี API/CLI ให้ AI เชื่อมต่อ |
| **SAP B1 / SAP HANA** | แพงมาก ซับซ้อน ต้องมีทีม IT ใหญ่ AI integration ยากมาก |
| **Odoo** | ต้อง hack customize ตลอด tech stack โบราณ (Python/XML) ต้องใช้ XML-RPC |
| **Excel** | ยืดหยุ่นแต่ไม่มี structure ไม่มี audit trail ไม่ scale |

**ปัญหาร่วมของทุกระบบ**: ไม่ได้ออกแบบมาให้ AI เข้าถึงได้ — ไม่มี CLI, ไม่มี Tool Registry, ไม่มี MCP

### ผลกระทบ:
- **เสียโอกาสทางธุรกิจ** — ข้อมูลอยู่ใน ERP แต่ดึงออกมาวิเคราะห์ไม่ได้
- **ต้นทุนคนสูง** — ทุกขั้นตอนต้องพึ่งคน ตั้งแต่คีย์ข้อมูล ตรวจสอบ จนถึงออกรายงาน
- **ปิดงบเดือนใช้เวลา 15 วัน** — ดึงข้อมูลจาก ERP ไปหยอด Excel ด้วยมือ
- **ไม่สามารถ scale** — การเชื่อมต่อระบบภายนอกทำได้ยากหรือทำไม่ได้เลย

---

## nEIP แก้ปัญหาเหล่านี้อย่างไร

### AI-Native ตั้งแต่ออกแบบ

ทุก business function เป็น **callable tool** ที่ทั้งคนและ AI เรียกใช้ได้ผ่าน interface เดียวกัน:

```typescript
// AI agent สามารถเรียกใช้ได้เลย
{
  name: "finance.create_invoice",
  description: "สร้างใบแจ้งหนี้ลูกค้า",
  risk_level: "medium",
  requires_approval: false,
  audit_required: true
}
```

### Zero-setup AI Integration ผ่าน CLI

AI tools ที่ทำงานผ่าน terminal เช่น **Claude Code** เชื่อมต่อ nEIP ได้ทันทีผ่าน CLI — ไม่ต้อง setup MCP หรือ config เพิ่ม:

```bash
# Claude Code สั่งงาน nEIP ผ่าน CLI ได้เลย
neip ar invoice create    # สร้างใบแจ้งหนี้
neip reports trial-balance # ดูงบทดลอง
neip gl journal list       # ดูรายการบันทึกบัญชี
neip dashboard             # ดูภาพรวมธุรกิจ
```

> **ทำไมไม่ใช้ MCP?** MCP ต้อง serialize ข้อมูลทุก request ทำให้เปลือง token โดยเฉพาะกับข้อมูล ERP ที่มีขนาดใหญ่ CLI approach ประหยัด token กว่ามาก และในอนาคตสามารถเพิ่ม MCP Server ได้ไม่ยากเพราะมี REST API ครบอยู่แล้ว

### Human-in-the-Loop (HITL) ที่โปร่งใส

AI ช่วยตัดสินใจ แต่ action สำคัญต้องผ่านคน:
- **Auto Zone** — AI ทำเองได้เลย (เช่น จับคู่ใบเสร็จ)
- **Suggest Zone** — AI แนะนำ คนกดอนุมัติ (เช่น อนุมัติ PO)
- **Review Zone** — AI flag ความผิดปกติ คนตรวจสอบ (เช่น discount เกินนโยบาย)
- **Manual Zone** — คนทำเองเท่านั้น (เช่น ปิดงบปี)

### 3 ช่องทางเข้าถึงเท่าเทียมกัน

| ช่องทาง | ใครใช้ | ทำอะไรได้ |
|---------|--------|----------|
| **Web UI** | พนักงาน, ผู้จัดการ | ดูข้อมูล สร้างเอกสาร อนุมัติ |
| **REST API** | Developer, ระบบภายนอก | Integration, webhook, automation |
| **CLI** | AI agent, DevOps, power user | ทุกอย่างที่ Web ทำได้ ผ่าน terminal |

ทุกช่องทางผ่าน **Business Logic เดียวกัน, RBAC เดียวกัน, Audit Trail เดียวกัน**

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

# 5. Start API (port 5400)
node apps/api/dist/index.js

# 6. Start Web UI (port 3100)
pnpm --filter web dev -- -p 3100
```

## Access

| Service | URL |
|---------|-----|
| Web UI | http://localhost:3100 |
| API Docs (Swagger) | http://localhost:5400/api/docs |
| CLI | `node apps/cli/dist/index.js --help` |

---

## Architecture

```
┌─ Clients ─────────────────────────────────┐
│ Web UI (Next.js 15) │ CLI │ Swagger UI   │
│ พนักงาน/ผู้จัดการ      │ AI  │ Developer   │
├─ API Gateway ─────────────────────────────┤
│ Fastify 5.8 · 186 endpoints              │
│ JWT Auth · RBAC 140 perms · Rate Limit   │
│ Audit Trail (auto-log ทุก mutation)       │
├─ Tool Registry ───────────────────────────┤
│ ทุก business function = callable tool    │
│ Schema + Risk Level + Approval Required  │
├─ Shared Packages ─────────────────────────┤
│ @neip/shared · @neip/core · @neip/db    │
│ @neip/ai · @neip/tax                    │
├─ Business Modules ────────────────────────┤
│ Finance: GL·AR·AP·Assets·Bank·WHT·Tax   │
│ Sales: QT→SO→DO→Invoice→Receipt→CN       │
│ Purchase: PO→Bill→Payment · Inventory    │
│ HR: Employee·Dept·Payroll·Leave          │
│ CO: Cost Center·Profit Center·Budget     │
│ CRM: Contacts · Reports · Dashboard     │
├─ AI Layer ────────────────────────────────┤
│ BaseAgent · Invoice Matching · HITL      │
│ Month-End Close · Confidence Zones       │
├─ Infrastructure ──────────────────────────┤
│ PostgreSQL 17 · 58 tables · RLS         │
│ pg-boss · Docker · Pino logging         │
└───────────────────────────────────────────┘
```

## Modules (31 Enterprise-Grade)

| Module | ภาษาไทย | API | Web | CLI |
|--------|---------|:---:|:---:|:---:|
| FI-GL | บัญชีแยกประเภท | ✓ | ✓ | ✓ |
| FI-AR | ลูกหนี้การค้า | ✓ | ✓ | ✓ |
| FI-AP | เจ้าหนี้การค้า | ✓ | ✓ | ✓ |
| FI-AA | สินทรัพย์ถาวร | ✓ | ✓ | ✓ |
| FI-BL | กระทบยอดธนาคาร | ✓ | ✓ | ✓ |
| FI-TV | ใบหัก ณ ที่จ่าย (ภ.ง.ด.3/53) | ✓ | ✓ | ✓ |
| FI-TX | ภาษี VAT/WHT | ✓ | ✓ | ✓ |
| CO | ศูนย์ต้นทุน / ศูนย์กำไร / งบประมาณ | ✓ | ✓ | ✓ |
| SD-QT | ใบเสนอราคา | ✓ | ✓ | ✓ |
| SD-SO | ใบสั่งขาย | ✓ | ✓ | ✓ |
| SD-DO | ใบส่งของ | ✓ | ✓ | ✓ |
| SD-INV | ใบแจ้งหนี้ / ใบกำกับภาษี | ✓ | ✓ | ✓ |
| SD-RC | ใบเสร็จรับเงิน | ✓ | ✓ | ✓ |
| SD-CN | ใบลดหนี้ | ✓ | ✓ | ✓ |
| SD-PAY | รับชำระเงิน | ✓ | ✓ | ✓ |
| MM-PO | ใบสั่งซื้อ | ✓ | ✓ | ✓ |
| MM-IM | คลังสินค้า / สต็อก | ✓ | ✓ | ✓ |
| MM-PR | สินค้า / SKU | ✓ | ✓ | ✓ |
| HR | พนักงาน / แผนก / เงินเดือน / ลา | ✓ | ✓ | ✓ |
| CRM | ทะเบียนลูกค้า+ผู้ขาย | ✓ | ✓ | ✓ |
| RPT | รายงาน + P&L Comparison | ✓ | ✓ | ✓ |
| DASH | แดชบอร์ด | ✓ | ✓ | ✓ |
| AUDIT | บันทึกการเปลี่ยนแปลง (Audit Trail) | ✓ | ✓ | ✓ |

## Business Cycles

```
วงจรขาย:    ใบเสนอราคา → ใบสั่งขาย → ใบส่งของ → ใบแจ้งหนี้ → รับชำระ → ใบเสร็จ
วงจรซื้อ:    ใบสั่งซื้อ → บิลค่าใช้จ่าย → จ่ายเจ้าหนี้ → ใบหัก ณ ที่จ่าย
วงจรบัญชี:   บันทึกรายวัน → ผ่านรายการ → งบทดลอง → งบกำไรขาดทุน → งบดุล → ปิดงวด
วงจร HR:    รับพนักงาน → เงินเดือน → ประกันสังคม → ลางาน → ลาออก
วงจรคลัง:    สร้างสินค้า → รับเข้าคลัง → ขาย → ส่งของ → ตรวจนับ
```

## Thai Compliance (กฎหมายไทย)

- **VAT 7%** — คำนวณแบบ round-half-up ตามกรมสรรพากร
- **WHT 8 ประเภท** — ภ.ง.ด.3/53 พร้อมออกใบรับรอง
- **ประกันสังคม** — 5% สูงสุด 750 บาท (เพดานเงินเดือน 15,000)
- **PDPA** — ปิดบัง PII ใน list, anonymize พนักงานที่ลาออก, audit trail ครบ
- **TFAC** — ผังบัญชีมาตรฐานสภาวิชาชีพบัญชี
- **ปีพุทธศักราช** — รองรับ พ.ศ. ในรายงานและ export
- **Data Retention** — 7 ปีตามประมวลรัษฎากร มาตรา 87/3

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + pnpm workspaces |
| API | Fastify 5.8, TypeScript 5.x strict mode |
| Web | Next.js 15.5, React 19, Tailwind CSS 4, Zustand, TanStack Query |
| CLI | Commander.js |
| Database | PostgreSQL 17, Drizzle ORM, Row-Level Security |
| AI | BaseAgent abstract class, Confidence Zones, pluggable LLM |
| Tax | bigint satang arithmetic, round-half-up |
| Auth | argon2id hash, JWT (1hr access + 30d refresh) |
| Queue | pg-boss v12 (PostgreSQL-based, no Redis) |
| Container | Docker Compose (db + api + worker) |

## License

Proprietary — Copyright (c) 2026 Chanon N.
