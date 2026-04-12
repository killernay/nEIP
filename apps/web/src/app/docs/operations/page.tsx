'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Search, ChevronDown, ChevronRight } from 'lucide-react';

// ---------------------------------------------------------------------------
// Table of Contents
// ---------------------------------------------------------------------------
const tocSections = [
  { id: 'sales', label: '1. Sales & Distribution (SD)' },
  { id: 'crm', label: '2. CRM — Contacts' },
  { id: 'procurement', label: '3. Procurement (MM)' },
  { id: 'inventory', label: '4. Inventory Management' },
  { id: 'hr', label: '5. Human Resources (HR)' },
  { id: 'payroll', label: '6. Payroll (HR-PY)' },
  { id: 'controlling', label: '7. Controlling (CO)' },
  { id: 'e2e-flows', label: '8. End-to-End Flows' },
  { id: 'tips', label: 'Tips & Best Practices' },
];

// ---------------------------------------------------------------------------
// Reusable components
// ---------------------------------------------------------------------------

function Badge({ children, color = 'blue' }: { children: React.ReactNode; color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple' }) {
  const colors = {
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[color]}`}>{children}</span>;
}

function InfoBox({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="my-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
      {title && <p className="mb-1 font-semibold text-blue-800 dark:text-blue-300">{title}</p>}
      <div className="text-sm text-blue-700 dark:text-blue-300">{children}</div>
    </div>
  );
}

function WarningBox({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="my-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950/30">
      {title && <p className="mb-1 font-semibold text-yellow-800 dark:text-yellow-300">{title}</p>}
      <div className="text-sm text-yellow-700 dark:text-yellow-300">{children}</div>
    </div>
  );
}

function StatusFlow({ steps }: { steps: { label: string; color: 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple' }[] }) {
  return (
    <div className="my-3 flex flex-wrap items-center gap-1">
      {steps.map((s, i) => (
        <span key={i} className="flex items-center gap-1">
          <Badge color={s.color}>{s.label}</Badge>
          {i < steps.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
        </span>
      ))}
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="my-4 overflow-x-auto rounded-lg border border-[var(--color-border)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-2 text-left font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[var(--color-border)] last:border-0 even:bg-[var(--color-muted)]/30 hover:bg-[var(--color-muted)]/50">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Collapsible({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="my-3 rounded-lg border border-[var(--color-border)]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium hover:bg-[var(--color-muted)]/50"
      >
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? '' : '-rotate-90'}`} />
        {title}
      </button>
      {open && <div className="border-t border-[var(--color-border)] px-4 py-3">{children}</div>}
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-[var(--color-muted)] px-1.5 py-0.5 font-mono text-sm">{children}</code>;
}

function FlowDiagram({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="my-4 overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/50 p-4">
      <p className="mb-2 text-sm font-semibold">{title}</p>
      <pre className="font-mono text-xs leading-relaxed">{children}</pre>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function OperationsManualPage() {
  const [filter, setFilter] = useState('');
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -70% 0px' }
    );
    for (const s of tocSections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const filteredToc = tocSections.filter((s) =>
    s.label.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="mx-auto flex max-w-7xl gap-8 px-4 py-6">
      {/* Main content */}
      <div className="min-w-0 flex-1">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/docs" className="flex items-center gap-1 hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
            Docs
          </Link>
          <span>/</span>
          <span className="text-foreground">Operations Manual</span>
        </nav>

        <h1 className="mb-2 text-3xl font-bold">Operations Manual</h1>
        <p className="mb-1 text-base text-muted-foreground">คู่มือการใช้งาน nEIP — ระบบขาย จัดซื้อ ทรัพยากรบุคคล เงินเดือน สินค้าคงคลัง และ Controlling</p>
        <p className="mb-8 text-sm text-muted-foreground">Version 0.9.0 | Last updated: 2026-04-12 | For Sales, Procurement, HR, Warehouse, and Operations staff</p>

        {/* ================================================================ */}
        {/* 1. Sales & Distribution */}
        {/* ================================================================ */}
        <section id="sales" className="mb-12 scroll-mt-20">
          <h2 className="mb-4 border-b border-[var(--color-border)] pb-2 text-2xl font-bold">1. Sales &amp; Distribution (SD) — ระบบขาย</h2>

          <Collapsible title="1.1 Quotations — ใบเสนอราคา" defaultOpen>
            <p className="mb-3 text-sm">ใบเสนอราคาคือจุดเริ่มต้นของกระบวนการขาย สามารถแปลงเป็น SO หรือ Invoice ได้โดยตรง</p>
            <p className="mb-2 text-sm"><strong>Web UI:</strong> <Code>/quotations</Code> (list), <Code>/quotations/new</Code> (create)</p>

            <h4 className="mb-2 text-base font-semibold">Status Flow</h4>
            <StatusFlow steps={[
              { label: 'draft', color: 'gray' },
              { label: 'sent', color: 'blue' },
              { label: 'approved', color: 'green' },
              { label: 'converted', color: 'purple' },
            ]} />
            <p className="mb-3 text-xs text-muted-foreground">sent &rarr; rejected ก็เป็นไปได้</p>

            <DataTable
              headers={['From', 'To', 'Action', 'Permission']}
              rows={[
                ['draft', 'sent', 'Send / ส่ง', 'ar:quotation:send'],
                ['sent', 'approved', 'Approve / อนุมัติ', 'ar:quotation:approve'],
                ['sent', 'rejected', 'Reject / ปฏิเสธ', 'ar:quotation:approve'],
                ['approved', 'converted', 'Convert to SO / Invoice', 'ar:so:create'],
              ]}
            />

            <h4 className="mb-2 text-base font-semibold">Step-by-Step: Create Quotation</h4>
            <ol className="mb-4 list-inside list-decimal space-y-1 text-sm">
              <li>Navigate to <strong>Quotations &gt; New</strong> (<Code>/quotations/new</Code>)</li>
              <li>Fill in: Customer, Subject, Valid Until, Notes</li>
              <li>Add line items: Description, Quantity, Unit Price (satang)</li>
              <li>Click <strong>Save</strong> &mdash; generates <Code>QT-YYYY-XXXX</Code></li>
            </ol>

            <h4 className="mb-2 text-base font-semibold">Field Reference</h4>
            <DataTable
              headers={['Field', 'Type', 'Required', 'Description']}
              rows={[
                ['customerId', 'string', 'Yes', 'Contact UUID / รหัสลูกค้า'],
                ['customerName', 'string', 'Yes', 'ชื่อลูกค้า (max 200)'],
                ['subject', 'string', 'Yes', 'หัวข้อ (max 500)'],
                ['validUntil', 'date', 'Yes', 'วันหมดอายุ (YYYY-MM-DD)'],
                ['lines[].description', 'string', 'Yes', 'รายละเอียด (max 500)'],
                ['lines[].quantity', 'integer', 'Yes', 'จำนวน (min 1)'],
                ['lines[].unitPriceSatang', 'string', 'Yes', 'ราคาต่อหน่วย (satang)'],
              ]}
            />

            <h4 className="mb-2 text-base font-semibold">Common Errors</h4>
            <DataTable
              headers={['Error', 'Cause', 'Solution']}
              rows={[
                ['409 Conflict', 'Not in correct status', 'Check current status before acting'],
                ['404 Not Found', 'Invalid ID or wrong tenant', 'Verify the quotation exists'],
                ['400 Validation', 'Missing required fields', 'Fill all required fields'],
              ]}
            />
          </Collapsible>

          <Collapsible title="1.2 Sales Orders — ใบสั่งขาย" defaultOpen>
            <p className="mb-2 text-sm"><strong>Web UI:</strong> <Code>/sales-orders</Code></p>

            <h4 className="mb-2 text-base font-semibold">Status Flow</h4>
            <StatusFlow steps={[
              { label: 'draft', color: 'gray' },
              { label: 'confirmed', color: 'blue' },
              { label: 'partial_delivered', color: 'yellow' },
              { label: 'delivered', color: 'green' },
            ]} />

            <h4 className="mb-2 text-base font-semibold">Step-by-Step: Create Sales Order</h4>
            <ol className="mb-4 list-inside list-decimal space-y-1 text-sm">
              <li>Navigate to <strong>Sales Orders &gt; New</strong> or convert from QT</li>
              <li>Fill in: Customer, Order Date, Expected Delivery Date</li>
              <li>Add line items: Description, Quantity (decimal), Unit Price</li>
              <li>Click <strong>Save</strong> &mdash; <Code>SO-YYYY-XXXX</Code></li>
              <li>Click <strong>Confirm</strong> to activate</li>
            </ol>

            <h4 className="mb-2 text-base font-semibold">Business Rules</h4>
            <ul className="list-inside list-disc space-y-1 text-sm">
              <li>Only <Badge color="gray">draft</Badge> SOs can be edited</li>
              <li>Cancel allowed from draft or confirmed (not after delivery starts)</li>
              <li>Each SO line tracks <Code>deliveredQuantity</Code> &mdash; updated by Delivery Notes</li>
              <li>Amount: BigInt arithmetic &mdash; <Code>qty * 10000 &rarr; BigInt</Code></li>
            </ul>
          </Collapsible>

          <Collapsible title="1.3 Delivery Notes — ใบส่งของ">
            <p className="mb-2 text-sm"><strong>Web UI:</strong> <Code>/delivery-notes</Code></p>

            <h4 className="mb-2 text-base font-semibold">Status Flow</h4>
            <StatusFlow steps={[
              { label: 'draft', color: 'gray' },
              { label: 'delivered', color: 'green' },
            ]} />

            <h4 className="mb-2 text-base font-semibold">Mark as Delivered</h4>
            <p className="mb-3 text-sm">When delivered, the system automatically:</p>
            <ul className="list-inside list-disc space-y-1 text-sm">
              <li><strong>Stock Check:</strong> Validates <Code>quantity_on_hand &ge; quantityDelivered</Code></li>
              <li><strong>Stock Deduction:</strong> Creates <Code>stock_movement</Code> (type: issue)</li>
              <li><strong>SO Update:</strong> Increases <Code>delivered_quantity</Code> on each SO line</li>
              <li><strong>SO Status:</strong> Auto-recalculates (partial_delivered / delivered)</li>
            </ul>
          </Collapsible>

          <Collapsible title="1.4 DO to Invoice Conversion">
            <ol className="mb-4 list-inside list-decimal space-y-1 text-sm">
              <li>Open a <Badge color="green">delivered</Badge> Delivery Note</li>
              <li>Click <strong>Convert to Invoice</strong></li>
              <li>System creates Invoice (draft) with lines from DO &times; SO unit price</li>
            </ol>
            <WarningBox><strong>Double-conversion prevention:</strong> If invoice already exists, returns 409 Conflict</WarningBox>
          </Collapsible>

          <Collapsible title="1.5 Pricing Engine — ระบบราคา">
            <p className="mb-3 text-sm">The pricing engine resolves the best price through a 3-tier cascade:</p>
            <ol className="mb-4 list-inside list-decimal space-y-1 text-sm">
              <li><strong>Customer-specific price list</strong> &mdash; ราคาเฉพาะลูกค้า</li>
              <li><strong>Active price list</strong> &mdash; ราคาจาก price list ที่ active</li>
              <li><strong>Product base price</strong> &mdash; <Code>selling_price_satang</Code></li>
            </ol>
            <InfoBox>
              <p>Resolve: <Code>GET /pricing/resolve?productId=&amp;customerId=&amp;quantity=</Code></p>
              <p>Discount: <Code>finalPrice = base - (base &times; discountPercent / 100)</Code></p>
            </InfoBox>
          </Collapsible>

          <Collapsible title="1.6 Payment Terms — เงื่อนไขการชำระ">
            <DataTable
              headers={['Code', 'Name', 'Days', 'Discount', 'Discount Days']}
              rows={[
                ['NET30', 'Net 30 Days', '30', '0%', '0'],
                ['NET60', 'Net 60 Days', '60', '0%', '0'],
                ['COD', 'Cash on Delivery', '0', '0%', '0'],
                ['2/10NET30', '2% 10 Net 30', '30', '2%', '10'],
              ]}
            />
            <p className="text-sm">Use <Code>POST /payment-terms/seed</Code> to auto-create defaults for your tenant.</p>
          </Collapsible>

          <Collapsible title="1.7 Dunning — ติดตามหนี้">
            <p className="mb-3 text-sm">Dunning automates overdue invoice follow-up by assigning levels based on days past due.</p>
            <DataTable
              headers={['Field', 'Type', 'Description']}
              rows={[
                ['level', 'number', 'ระดับ (1, 2, 3...)'],
                ['daysOverdue', 'number', 'จำนวนวันเกิน'],
                ['template', 'string', 'เทมเพลตข้อความ'],
                ['feeSatang', 'string', 'ค่าธรรมเนียม'],
              ]}
            />
            <InfoBox title="Rate Limit">
              <p><Code>POST /dunning/run</Code> &mdash; 5 requests per minute (expensive batch operation)</p>
            </InfoBox>
          </Collapsible>

          <Collapsible title="1.8 Credit Management — บริหารวงเงินเครดิต">
            <pre className="mb-3 overflow-x-auto rounded-lg bg-[var(--color-muted)] p-4 font-mono text-xs">
{`Total Exposure = Open Invoices (outstanding)
               + Open SOs (draft/confirmed total)

Available Credit = Credit Limit - Total Exposure
Exceeded = Total Exposure > Credit Limit`}
            </pre>
            <DataTable
              headers={['Mode', 'Behavior']}
              rows={[
                ['warn_only (default)', 'Returns warning — allows SO creation with alert'],
                ['hard_block', 'Returns blocked — prevents SO creation'],
              ]}
            />
          </Collapsible>
        </section>

        {/* ================================================================ */}
        {/* 2. CRM */}
        {/* ================================================================ */}
        <section id="crm" className="mb-12 scroll-mt-20">
          <h2 className="mb-4 border-b border-[var(--color-border)] pb-2 text-2xl font-bold">2. CRM — Contacts / ระบบผู้ติดต่อ</h2>

          <p className="mb-3 text-sm"><strong>Web UI:</strong> <Code>/contacts</Code> &mdash; Contacts manage both customers and vendors in a unified system.</p>

          <DataTable
            headers={['Action', 'API', 'Permission']}
            rows={[
              ['Create', 'POST /contacts', 'crm:contact:create'],
              ['List', 'GET /contacts', 'crm:contact:read'],
              ['Detail + summary', 'GET /contacts/:id', 'crm:contact:read'],
              ['Update', 'PUT /contacts/:id', 'crm:contact:update'],
              ['Soft delete', 'DELETE /contacts/:id', 'crm:contact:delete'],
            ]}
          />

          <h3 className="mb-3 text-xl font-semibold">Field Reference</h3>
          <DataTable
            headers={['Field', 'Type', 'Description']}
            rows={[
              ['contactType', 'string', 'customer / vendor / both'],
              ['code', 'string', 'รหัสผู้ติดต่อ'],
              ['companyName', 'string', 'ชื่อบริษัท (required)'],
              ['contactPerson', 'string', 'ผู้ติดต่อ'],
              ['email', 'string', 'อีเมล'],
              ['taxId', 'string', 'เลขประจำตัวผู้เสียภาษี'],
              ['paymentTermsDays', 'number', 'จำนวนวันชำระ'],
              ['creditLimitSatang', 'number', 'วงเงินเครดิต'],
            ]}
          />
          <ul className="list-inside list-disc space-y-1 text-sm">
            <li>All text inputs are XSS-sanitized server-side</li>
            <li>Delete is soft-delete (<Code>is_active = false</Code>)</li>
          </ul>
        </section>

        {/* ================================================================ */}
        {/* 3. Procurement */}
        {/* ================================================================ */}
        <section id="procurement" className="mb-12 scroll-mt-20">
          <h2 className="mb-4 border-b border-[var(--color-border)] pb-2 text-2xl font-bold">3. Procurement (MM) — ระบบจัดซื้อ</h2>

          <Collapsible title="3.1 Purchase Requisitions — ใบขอซื้อ" defaultOpen>
            <p className="mb-2 text-sm"><strong>Web UI:</strong> <Code>/purchase-requisitions</Code></p>

            <h4 className="mb-2 text-base font-semibold">Status Flow</h4>
            <StatusFlow steps={[
              { label: 'draft', color: 'gray' },
              { label: 'pending', color: 'yellow' },
              { label: 'approved', color: 'green' },
              { label: 'converted', color: 'purple' },
            ]} />

            <h4 className="mb-2 text-base font-semibold">Step-by-Step: Create PR</h4>
            <ol className="mb-4 list-inside list-decimal space-y-1 text-sm">
              <li>Navigate to <strong>Purchase Requisitions</strong></li>
              <li>Click <strong>New</strong>: Requester, Department, Notes</li>
              <li>Add lines: Description, Quantity, Estimated Price</li>
              <li>Save &mdash; <Code>PR-YYYYMMDD-XXX</Code></li>
              <li>Submit for approval (draft &rarr; pending)</li>
            </ol>

            <h4 className="mb-2 text-base font-semibold">Convert PR to PO</h4>
            <ol className="mb-4 list-inside list-decimal space-y-1 text-sm">
              <li>Open an <Badge color="green">approved</Badge> PR</li>
              <li>Click <strong>Convert to PO</strong> &mdash; provide <Code>vendorId</Code></li>
              <li>System creates PO (draft) + updates PR to <Badge color="purple">converted</Badge></li>
            </ol>
          </Collapsible>

          <Collapsible title="3.2 RFQ — ใบขอใบเสนอราคา">
            <p className="mb-2 text-sm"><strong>Web UI:</strong> <Code>/rfqs</Code></p>

            <h4 className="mb-2 text-base font-semibold">Status Flow</h4>
            <StatusFlow steps={[
              { label: 'draft', color: 'gray' },
              { label: 'sent', color: 'blue' },
              { label: 'received', color: 'yellow' },
              { label: 'closed', color: 'green' },
            ]} />

            <h4 className="mb-2 text-base font-semibold">RFQ Process</h4>
            <ol className="mb-4 list-inside list-decimal space-y-1 text-sm">
              <li><strong>Create RFQ</strong> &mdash; optionally link to PR, add vendor IDs</li>
              <li><strong>Send RFQ</strong> &mdash; notifies vendors</li>
              <li><strong>Add Vendor Responses</strong> &mdash; record each vendor&apos;s quote</li>
              <li><strong>Compare Responses</strong> &mdash; sorted by lowest price + recommendation</li>
              <li><strong>Select Winner</strong> &mdash; creates PO automatically, closes RFQ</li>
            </ol>
          </Collapsible>

          <Collapsible title="3.3 Purchase Orders — ใบสั่งซื้อ" defaultOpen>
            <p className="mb-2 text-sm"><strong>Web UI:</strong> <Code>/purchase-orders</Code></p>

            <h4 className="mb-2 text-base font-semibold">Status Flow</h4>
            <StatusFlow steps={[
              { label: 'draft', color: 'gray' },
              { label: 'sent', color: 'blue' },
              { label: 'partial_received', color: 'yellow' },
              { label: 'received', color: 'green' },
              { label: 'converted', color: 'purple' },
            ]} />

            <h4 className="mb-2 text-base font-semibold">Field Reference</h4>
            <DataTable
              headers={['Field', 'Type', 'Required', 'Description']}
              rows={[
                ['vendorId', 'string', 'Yes', 'รหัสผู้จำหน่าย'],
                ['orderDate', 'date', 'Yes', 'วันที่สั่งซื้อ'],
                ['expectedDate', 'date', 'No', 'วันที่คาดรับ'],
                ['lines[].description', 'string', 'Yes', 'รายละเอียด (max 500)'],
                ['lines[].quantity', 'number', 'Yes', 'จำนวน (min 0.01)'],
                ['lines[].unitPriceSatang', 'string', 'Yes', 'ราคาต่อหน่วย (satang)'],
                ['lines[].productId', 'string', 'No', 'รหัสสินค้า (for stock)'],
                ['lines[].warehouseId', 'string', 'No', 'รหัสคลัง (for stock)'],
              ]}
            />
          </Collapsible>

          <Collapsible title="3.4 Goods Receipt — รับสินค้า">
            <p className="mb-3 text-sm"><strong>Action:</strong> <Code>POST /purchase-orders/:id/receive</Code></p>
            <ol className="mb-4 list-inside list-decimal space-y-1 text-sm">
              <li>Open a PO in <Badge color="blue">sent</Badge> or <Badge color="yellow">partial_received</Badge></li>
              <li>Click <strong>Receive Goods</strong> &mdash; specify lines: lineId, quantityReceived</li>
              <li>System updates PO lines, creates stock movements, recalculates PO status</li>
            </ol>
            <InfoBox>Partial receiving is fully supported. Stock movements are created automatically when product/warehouse are specified.</InfoBox>
          </Collapsible>

          <Collapsible title="3.5 PO to Bill Conversion">
            <ol className="mb-4 list-inside list-decimal space-y-1 text-sm">
              <li>Open a PO in sent/partial_received/received</li>
              <li>Click <strong>Convert to Bill</strong></li>
              <li>System creates Bill (draft), due 30 days, lines from PO</li>
              <li>PO status &rarr; <Badge color="purple">converted</Badge></li>
            </ol>
            <WarningBox><strong>Double-conversion prevention:</strong> If PO already has a bill, returns 409</WarningBox>
          </Collapsible>

          <Collapsible title="3.6 Vendor Returns — ส่งคืนผู้ขาย">
            <h4 className="mb-2 text-base font-semibold">Status Flow</h4>
            <StatusFlow steps={[
              { label: 'draft', color: 'gray' },
              { label: 'shipped', color: 'blue' },
              { label: 'received_credit', color: 'green' },
            ]} />
            <ol className="mb-4 list-inside list-decimal space-y-1 text-sm">
              <li><strong>Create Return</strong> &mdash; vendorId, lines (product, qty, price)</li>
              <li><strong>Ship Return</strong> &mdash; provide warehouseId, creates stock_movement (return)</li>
              <li><strong>Receive Credit</strong> &mdash; creates negative bill (AP credit)</li>
            </ol>
          </Collapsible>
        </section>

        {/* ================================================================ */}
        {/* 4. Inventory */}
        {/* ================================================================ */}
        <section id="inventory" className="mb-12 scroll-mt-20">
          <h2 className="mb-4 border-b border-[var(--color-border)] pb-2 text-2xl font-bold">4. Inventory Management (MM-IM) — สินค้าคงคลัง</h2>

          <Collapsible title="4.1 Products — สินค้า" defaultOpen>
            <p className="mb-2 text-sm"><strong>Web UI:</strong> <Code>/products</Code></p>
            <DataTable
              headers={['Field', 'Type', 'Description']}
              rows={[
                ['sku', 'string', 'รหัสสินค้า (unique per tenant)'],
                ['nameTh / nameEn', 'string', 'ชื่อสินค้า TH/EN'],
                ['category', 'string', 'หมวดหมู่'],
                ['unit', 'string', 'หน่วยนับ (ชิ้น, กล่อง)'],
                ['costPriceSatang', 'number', 'ราคาทุน (satang)'],
                ['sellingPriceSatang', 'number', 'ราคาขาย (satang)'],
                ['minStockLevel', 'number', 'จำนวนขั้นต่ำ (low-stock alert)'],
              ]}
            />
          </Collapsible>

          <Collapsible title="4.2 Warehouses — คลังสินค้า">
            <DataTable
              headers={['Field', 'Type', 'Description']}
              rows={[
                ['code', 'string', 'รหัสคลัง (unique per tenant)'],
                ['name', 'string', 'ชื่อคลัง'],
                ['address', 'string', 'ที่อยู่'],
                ['isDefault', 'boolean', 'คลังหลัก'],
              ]}
            />
          </Collapsible>

          <Collapsible title="4.3 Stock Movements — ความเคลื่อนไหวสินค้า">
            <DataTable
              headers={['Type', 'Direction', 'Source']}
              rows={[
                ['receive', '+ (inbound)', 'PO goods receipt'],
                ['issue', '- (outbound)', 'Delivery note'],
                ['return', '- (outbound)', 'Vendor return'],
                ['adjustment', '+/-', 'Stock count, manual'],
                ['transfer', '+/-', 'Warehouse transfer'],
              ]}
            />
          </Collapsible>

          <Collapsible title="4.4 Stock Levels — ยอดคงเหลือ">
            <p className="mb-2 text-sm"><strong>Web UI:</strong> <Code>/inventory</Code></p>
            <DataTable
              headers={['Field', 'Type', 'Description']}
              rows={[
                ['quantityOnHand', 'number', 'จำนวนในมือ'],
                ['quantityReserved', 'number', 'จำนวนจอง'],
                ['quantityAvailable', 'number', 'จำนวนพร้อมใช้ (on_hand - reserved)'],
              ]}
            />
          </Collapsible>

          <Collapsible title="4.5 Stock Counts — ตรวจนับสต็อก">
            <h4 className="mb-2 text-base font-semibold">Status Flow</h4>
            <StatusFlow steps={[
              { label: 'open', color: 'gray' },
              { label: 'counted', color: 'yellow' },
              { label: 'posted', color: 'green' },
            ]} />
            <ol className="mb-4 list-inside list-decimal space-y-1 text-sm">
              <li><strong>Create Count</strong> &mdash; select warehouse, system populates lines from stock_levels</li>
              <li><strong>Enter Actual Quantities</strong> &mdash; system calculates <Code>variance = actual - book</Code></li>
              <li><strong>Post Adjustments</strong> &mdash; creates stock_movements + journal entries for variances</li>
            </ol>
          </Collapsible>

          <Collapsible title="4.6 Batch & Serial Tracking">
            <p className="mb-3 text-sm"><strong>Web UI:</strong> <Code>/inventory/batches</Code></p>
            <h4 className="mb-2 text-base font-semibold">Batches</h4>
            <p className="mb-3 text-sm">Fields: <Code>productId</Code>, <Code>batchNumber</Code>, <Code>manufactureDate</Code>, <Code>expiryDate</Code></p>
            <h4 className="mb-2 text-base font-semibold">Serial Numbers</h4>
            <p className="mb-3 text-sm">Fields: <Code>productId</Code>, <Code>serialNumber</Code>, <Code>batchId</Code> (optional), <Code>status</Code></p>
            <InfoBox title="Batch Traceability">
              <p><Code>GET /inventory/trace/:batchId</Code> &mdash; Traces a batch forward through stock movements to find which customers received products from this batch.</p>
            </InfoBox>
          </Collapsible>

          <Collapsible title="4.7 Valuation & Low Stock">
            <ul className="list-inside list-disc space-y-1 text-sm">
              <li><strong>Valuation:</strong> <Code>GET /inventory/valuation</Code> &mdash; total value = sum(on_hand &times; cost_price)</li>
              <li><strong>Low Stock:</strong> <Code>GET /inventory/low-stock</Code> &mdash; products where <Code>on_hand &lt; min_stock_level</Code></li>
            </ul>
          </Collapsible>
        </section>

        {/* ================================================================ */}
        {/* 5. HR */}
        {/* ================================================================ */}
        <section id="hr" className="mb-12 scroll-mt-20">
          <h2 className="mb-4 border-b border-[var(--color-border)] pb-2 text-2xl font-bold">5. Human Resources (HR) — ทรัพยากรบุคคล</h2>

          <Collapsible title="5.1 Departments — แผนก">
            <p className="mb-2 text-sm"><strong>Web UI:</strong> <Code>/departments</Code></p>
            <DataTable
              headers={['Field', 'Type', 'Description']}
              rows={[
                ['code', 'string', 'รหัสแผนก'],
                ['nameTh / nameEn', 'string', 'ชื่อภาษาไทย/อังกฤษ'],
                ['managerId', 'string', 'รหัสผู้จัดการ'],
                ['costCenterId', 'string', 'ศูนย์ต้นทุนที่ผูก'],
              ]}
            />
            <InfoBox>Org tree endpoint returns nested hierarchy: <Code>GET /departments/tree</Code></InfoBox>
          </Collapsible>

          <Collapsible title="5.2 Positions — ตำแหน่ง">
            <p className="mb-2 text-sm"><strong>Web UI:</strong> <Code>/positions</Code></p>
            <DataTable
              headers={['Field', 'Type', 'Description']}
              rows={[
                ['code', 'string', 'รหัสตำแหน่ง'],
                ['title', 'string', 'ชื่อตำแหน่ง'],
                ['departmentId', 'string', 'แผนก'],
                ['reportsToPositionId', 'string', 'ตำแหน่งที่รายงาน'],
                ['headcount', 'number', 'จำนวนอัตรา'],
              ]}
            />
          </Collapsible>

          <Collapsible title="5.3 Employees — พนักงาน" defaultOpen>
            <p className="mb-2 text-sm"><strong>Web UI:</strong> <Code>/employees</Code></p>

            <h4 className="mb-2 text-base font-semibold">Key Fields</h4>
            <DataTable
              headers={['Field', 'Type', 'Description']}
              rows={[
                ['employeeCode', 'string', 'รหัสพนักงาน'],
                ['firstNameTh / lastNameTh', 'string', 'ชื่อ-นามสกุลไทย'],
                ['firstNameEn / lastNameEn', 'string', 'ชื่อ-นามสกุลอังกฤษ'],
                ['nationalId', 'string', 'เลขบัตรประชาชน (13 หลัก)'],
                ['hireDate', 'date', 'วันเริ่มงาน'],
                ['employmentType', 'string', 'full_time / part_time / contract'],
                ['status', 'string', 'active / resigned / terminated'],
                ['salarySatang', 'number', 'เงินเดือน (satang)'],
                ['providentFundPercent', 'number', 'กองทุนสำรองเลี้ยงชีพ %'],
              ]}
            />

            <WarningBox title="PDPA Compliance">
              <p><strong>List endpoint</strong> strips sensitive PII &mdash; masked nationalId, hidden salary.</p>
              <p><strong>Detail endpoint</strong> returns full data (requires explicit read permission).</p>
            </WarningBox>
          </Collapsible>

          <Collapsible title="5.4 Attendance — ลงเวลาทำงาน">
            <p className="mb-2 text-sm"><strong>Web UI:</strong> <Code>/attendance</Code></p>
            <h4 className="mb-2 text-base font-semibold">Clock In / Clock Out</h4>
            <ul className="mb-4 list-inside list-disc space-y-1 text-sm">
              <li><strong>Clock In:</strong> If hour &ge; 9 &rarr; status = <Badge color="yellow">late</Badge>, else <Badge color="green">present</Badge></li>
              <li><strong>Clock Out:</strong> Calculates <Code>hoursWorked</Code> and <Code>overtimeHours</Code> (beyond 8h)</li>
              <li>Already clocked in/out &rarr; 409 Conflict</li>
            </ul>
          </Collapsible>

          <Collapsible title="5.5 Leave Management — ระบบลา">
            <p className="mb-2 text-sm"><strong>Web UI:</strong> <Code>/leave</Code></p>
            <h4 className="mb-2 text-base font-semibold">Status Flow</h4>
            <StatusFlow steps={[
              { label: 'pending', color: 'yellow' },
              { label: 'approved', color: 'green' },
            ]} />
            <p className="mb-3 text-xs text-muted-foreground">pending &rarr; rejected ก็เป็นไปได้</p>

            <h4 className="mb-2 text-base font-semibold">Leave Request Fields</h4>
            <DataTable
              headers={['Field', 'Type', 'Description']}
              rows={[
                ['employeeId', 'string', 'รหัสพนักงาน'],
                ['leaveTypeId', 'string', 'ประเภทการลา'],
                ['startDate / endDate', 'date', 'วันที่เริ่ม/สิ้นสุด'],
                ['days', 'number', 'จำนวนวัน'],
                ['reason', 'string', 'เหตุผล'],
              ]}
            />
            <InfoBox>Balance check: <Code>GET /leave-requests/balance/:employeeId</Code> &mdash; remaining days by leave type</InfoBox>
          </Collapsible>
        </section>

        {/* ================================================================ */}
        {/* 6. Payroll */}
        {/* ================================================================ */}
        <section id="payroll" className="mb-12 scroll-mt-20">
          <h2 className="mb-4 border-b border-[var(--color-border)] pb-2 text-2xl font-bold">6. Payroll (HR-PY) — ระบบเงินเดือน</h2>

          <p className="mb-2 text-sm"><strong>Web UI:</strong> <Code>/payroll</Code></p>

          <h3 className="mb-3 text-xl font-semibold">Status Flow</h3>
          <StatusFlow steps={[
            { label: 'draft', color: 'gray' },
            { label: 'calculated', color: 'blue' },
            { label: 'approved', color: 'yellow' },
            { label: 'paid', color: 'green' },
          ]} />

          <h3 className="mb-3 text-xl font-semibold">Payroll Process</h3>
          <ol className="mb-4 list-inside list-decimal space-y-2 text-sm">
            <li><strong>Create Payroll Run</strong> &mdash; payPeriodStart, payPeriodEnd, runDate</li>
            <li><strong>Calculate</strong> &mdash; For each active employee: base + overtime + bonus + allowance = gross, then deductions</li>
            <li><strong>Review &amp; Adjust</strong> &mdash; Modify individual payroll items</li>
            <li><strong>Approve</strong> &mdash; Records approved_by user</li>
            <li><strong>Pay</strong> &mdash; Records payment timestamp</li>
            <li><strong>View Payslips</strong> &mdash; Individual payslip details per employee</li>
          </ol>

          <Collapsible title="Thai Tax Brackets (PIT) — ขั้นภาษีเงินได้" defaultOpen>
            <DataTable
              headers={['Taxable Income (THB/year)', 'Rate']}
              rows={[
                ['0 – 150,000', '0% (exempt)'],
                ['150,001 – 300,000', '5%'],
                ['300,001 – 500,000', '10%'],
                ['500,001 – 750,000', '15%'],
                ['750,001 – 1,000,000', '20%'],
                ['1,000,001 – 2,000,000', '25%'],
                ['2,000,001 – 5,000,000', '30%'],
                ['5,000,001+', '35%'],
              ]}
            />
            <InfoBox>
              <p>Annualizes monthly gross (&times;12), expense deduction 50% (max 100k), personal allowance 60k THB</p>
            </InfoBox>
          </Collapsible>

          <Collapsible title="Social Security Contribution (SSC)" defaultOpen>
            <DataTable
              headers={['Parameter', 'Value']}
              rows={[
                ['Rate', '5%'],
                ['Salary floor', '1,650 THB'],
                ['Salary cap', '15,000 THB'],
                ['Max contribution', '750 THB/month'],
                ['Employer matches', 'Yes (same amount)'],
              ]}
            />
          </Collapsible>

          <Collapsible title="Payroll Item Fields">
            <DataTable
              headers={['Field', 'Type', 'Description']}
              rows={[
                ['baseSalarySatang', 'number', 'เงินเดือนพื้นฐาน'],
                ['overtimeSatang', 'number', 'ค่าล่วงเวลา'],
                ['bonusSatang', 'number', 'โบนัส'],
                ['allowanceSatang', 'number', 'เงินค่าเบี้ยเลี้ยง'],
                ['grossSatang', 'number', 'รวมรายได้'],
                ['socialSecuritySatang', 'number', 'ประกันสังคม (ลูกจ้าง)'],
                ['providentFundSatang', 'number', 'กองทุนสำรองเลี้ยงชีพ'],
                ['personalIncomeTaxSatang', 'number', 'ภาษีเงินได้'],
                ['totalDeductionsSatang', 'number', 'รวมรายการหัก'],
                ['netSatang', 'number', 'เงินสุทธิ'],
                ['employerSscSatang', 'number', 'ประกันสังคม (นายจ้าง)'],
              ]}
            />
          </Collapsible>
        </section>

        {/* ================================================================ */}
        {/* 7. Controlling */}
        {/* ================================================================ */}
        <section id="controlling" className="mb-12 scroll-mt-20">
          <h2 className="mb-4 border-b border-[var(--color-border)] pb-2 text-2xl font-bold">7. Controlling (CO) — ระบบ Controlling</h2>

          <Collapsible title="7.1 Cost Centers — ศูนย์ต้นทุน" defaultOpen>
            <p className="mb-2 text-sm"><strong>Web UI:</strong> <Code>/cost-centers</Code></p>
            <DataTable
              headers={['Field', 'Type', 'Required', 'Description']}
              rows={[
                ['code', 'string', 'Yes', 'รหัส (max 20)'],
                ['nameTh', 'string', 'Yes', 'ชื่อภาษาไทย'],
                ['nameEn', 'string', 'Yes', 'ชื่อภาษาอังกฤษ'],
                ['parentId', 'string', 'No', 'ศูนย์ต้นทุนแม่ (hierarchy)'],
              ]}
            />
            <InfoBox>Cost Center Report: <Code>GET /cost-centers/:id/report</Code> &mdash; aggregates JE line items tagged with this center</InfoBox>
          </Collapsible>

          <Collapsible title="7.2 Profit Centers — ศูนย์กำไร">
            <p className="mb-2 text-sm"><strong>Web UI:</strong> <Code>/profit-centers</Code></p>
            <p className="mb-3 text-sm">Same structure as Cost Centers: <Code>code</Code>, <Code>nameTh</Code>, <Code>nameEn</Code>, <Code>parentId</Code></p>
            <InfoBox>P&amp;L Report: <Code>GET /profit-centers/:id/report</Code> &mdash; Profit &amp; Loss grouped by this profit center</InfoBox>
          </Collapsible>
        </section>

        {/* ================================================================ */}
        {/* 8. End-to-End Process Flows */}
        {/* ================================================================ */}
        <section id="e2e-flows" className="mb-12 scroll-mt-20">
          <h2 className="mb-4 border-b border-[var(--color-border)] pb-2 text-2xl font-bold">8. End-to-End Process Flows — ขั้นตอนทำงานครบวงจร</h2>

          <FlowDiagram title="Sales Flow: QT → SO → DO → INV">
{`┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Quotation│───▶│  Sales   │───▶│ Delivery │───▶│ Invoice  │
│   (QT)   │    │ Order(SO)│    │ Note(DO) │    │  (INV)   │
│  draft   │    │  draft   │    │  draft   │    │  draft   │
│  sent    │    │ confirmed│    │ delivered│    │  posted  │
│ approved │    │ delivered│    │          │    │  paid    │
│ converted│    │          │    │          │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                                     │
                              Stock Deduction
                            (issue movement)`}
          </FlowDiagram>
          <div className="mb-4 space-y-1 text-sm">
            <p><strong>GL Impact (Invoice posting):</strong> DR Accounts Receivable &mdash; CR Revenue</p>
            <p><strong>GL Impact (Delivery stock):</strong> DR Cost of Goods Sold &mdash; CR Inventory</p>
          </div>

          <FlowDiagram title="Procurement Flow: PR → RFQ → PO → GR → Bill">
{`┌───────────┐    ┌──────┐    ┌──────────┐    ┌──────────┐    ┌──────┐
│  Purchase │───▶│ RFQ  │───▶│ Purchase │───▶│  Goods   │───▶│ Bill │
│Requisition│    │      │    │Order (PO)│    │ Receipt  │    │      │
│   draft   │    │ draft│    │  draft   │    │(PO recv) │    │draft │
│  pending  │    │ sent │    │  sent    │    │          │    │posted│
│ approved  │    │recv'd│    │ received │    │ Stock +  │    │ paid │
│ converted │    │closed│    │converted │    │          │    │      │
└───────────┘    └──────┘    └──────────┘    └──────────┘    └──────┘`}
          </FlowDiagram>
          <div className="mb-4 space-y-1 text-sm">
            <p><strong>GL Impact (Bill posting):</strong> DR Expense/Inventory &mdash; CR Accounts Payable</p>
            <p><strong>GL Impact (Goods Receipt):</strong> DR Inventory &mdash; CR GR/IR Clearing</p>
          </div>

          <FlowDiagram title="HR/Payroll Flow: Employee → Attendance → Payroll → Payment">
{`┌──────────┐    ┌──────────┐    ┌───────────┐    ┌──────────┐
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
                              └─────────────┘`}
          </FlowDiagram>
          <div className="mb-4 space-y-1 text-sm">
            <p><strong>GL Impact:</strong> DR Salary Expense + Employer SSC &mdash; CR Net Pay + SSC Payable + PIT Payable + PVD Payable</p>
          </div>

          <FlowDiagram title="Inventory Flow: Product → Stock → Count → Valuation">
{`┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
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
              └─────────────┘`}
          </FlowDiagram>
        </section>

        {/* ================================================================ */}
        {/* Tips */}
        {/* ================================================================ */}
        <section id="tips" className="mb-12 scroll-mt-20">
          <h2 className="mb-4 border-b border-[var(--color-border)] pb-2 text-2xl font-bold">Tips &amp; Best Practices / เคล็ดลับ</h2>

          <div className="space-y-3">
            <InfoBox title="1. Satang Arithmetic">
              <p>All monetary values are in satang (1 THB = 100 satang). System uses BigInt internally to avoid floating-point errors.</p>
            </InfoBox>
            <InfoBox title="2. Document Numbering">
              <p>Auto-generated per tenant, per fiscal year: QT-YYYY-XXXX, SO-YYYY-XXXX, DN-YYYY-XXXX, etc.</p>
            </InfoBox>
            <InfoBox title="3. Partial Delivery/Receipt">
              <p>Both SO delivery and PO receipt support partial quantities. System auto-tracks remaining amounts.</p>
            </InfoBox>
            <InfoBox title="4. Stock Integration">
              <p>Link products + warehouses on DO/PO lines for automatic stock movement tracking.</p>
            </InfoBox>
            <InfoBox title="5. Tenant Isolation">
              <p>All data scoped by <Code>tenant_id</Code>. Users only access data within their own tenant.</p>
            </InfoBox>
            <InfoBox title="6. Permission-Based Access">
              <p>Each action requires specific permissions. Configure roles in Settings &gt; Team.</p>
            </InfoBox>
            <InfoBox title="7. Credit Check Before SO">
              <p>Always run credit check before creating large SOs to avoid exceeding customer credit limits.</p>
            </InfoBox>
            <InfoBox title="8. Dunning Setup">
              <p>Configure dunning levels before running: Level 1 at 7 days, Level 2 at 30 days, Level 3 at 60 days.</p>
            </InfoBox>
          </div>
        </section>
      </div>

      {/* ================================================================ */}
      {/* Sticky Table of Contents - Desktop */}
      {/* ================================================================ */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-20">
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter sections..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <nav className="space-y-1">
            {filteredToc.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`block rounded px-3 py-1.5 text-xs transition-colors hover:bg-[var(--color-muted)] ${
                  activeSection === s.id ? 'bg-[var(--color-muted)] font-semibold text-foreground' : 'text-muted-foreground'
                }`}
              >
                {s.label}
              </a>
            ))}
          </nav>
        </div>
      </aside>
    </div>
  );
}
