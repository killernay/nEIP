'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Search, Copy, Check, Terminal } from 'lucide-react';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
interface CliCommand {
  command: string;
  description: string;
  descriptionTh: string;
  flags?: string;
  example?: string;
}

interface CliGroup {
  name: string;
  commands: CliCommand[];
}

const CLI_GROUPS: CliGroup[] = [
  {
    name: 'Authentication & System',
    commands: [
      { command: 'neip auth login', description: 'Authenticate with the nEIP API', descriptionTh: 'เข้าสู่ระบบ' },
      { command: 'neip auth logout', description: 'Clear stored credentials', descriptionTh: 'ออกจากระบบ' },
      { command: 'neip whoami', description: 'Show current user, org, and API URL', descriptionTh: 'แสดงข้อมูลผู้ใช้ปัจจุบัน' },
      { command: 'neip config set <key> <value>', description: 'Set a configuration value', descriptionTh: 'ตั้งค่า configuration', example: 'neip config set llm-api-key sk-xxx' },
      { command: 'neip config get <key>', description: 'Get a configuration value', descriptionTh: 'ดูค่า configuration' },
      { command: 'neip config list', description: 'List all config values (sensitive masked)', descriptionTh: 'แสดง configuration ทั้งหมด' },
      { command: 'neip config unset <key>', description: 'Remove a configuration key', descriptionTh: 'ลบ configuration key' },
    ],
  },
  {
    name: 'Organisation Management',
    commands: [
      { command: 'neip org create <name>', description: 'Create a new organisation', descriptionTh: 'สร้างองค์กรใหม่', flags: '--business-type <type>', example: 'neip org create "บริษัท ทดสอบ จำกัด" --business-type sme' },
      { command: 'neip org list', description: 'Show your current organisation', descriptionTh: 'แสดงองค์กรปัจจุบัน' },
      { command: 'neip org switch <id>', description: 'Set the active organisation', descriptionTh: 'เปลี่ยนองค์กร' },
    ],
  },
  {
    name: 'General Ledger (GL)',
    commands: [
      { command: 'neip gl accounts list', description: 'List chart of accounts', descriptionTh: 'แสดงผังบัญชี', flags: '--type, --search, --limit, --offset', example: 'neip gl accounts list --type asset --format json' },
      { command: 'neip gl accounts create', description: 'Create a new account (interactive)', descriptionTh: 'สร้างบัญชีใหม่' },
      { command: 'neip gl journal create', description: 'Create a journal entry (interactive)', descriptionTh: 'สร้างรายการบัญชี', flags: '--dry-run, --explain', example: 'neip gl journal create --explain' },
      { command: 'neip gl journal list', description: 'List journal entries', descriptionTh: 'แสดงรายการบัญชี', flags: '--status, --limit, --offset', example: 'neip gl journal list --status posted' },
      { command: 'neip gl journal post <id>', description: 'Post a draft journal entry', descriptionTh: 'ผ่านรายการบัญชี' },
    ],
  },
  {
    name: 'Accounts Receivable (AR)',
    commands: [
      { command: 'neip ar invoice create', description: 'Create a new invoice (interactive)', descriptionTh: 'สร้างใบแจ้งหนี้' },
      { command: 'neip ar invoice list', description: 'List invoices', descriptionTh: 'แสดงรายการใบแจ้งหนี้', flags: '--page, --page-size, --status, --customer-id' },
      { command: 'neip ar invoice void <id>', description: 'Void an invoice', descriptionTh: 'ยกเลิกใบแจ้งหนี้' },
      { command: 'neip ar payment create', description: 'Record a customer payment', descriptionTh: 'บันทึกรับชำระเงิน' },
      { command: 'neip ar payment list', description: 'List payments', descriptionTh: 'แสดงรายการรับชำระ', flags: '--page, --page-size, --customer-id, --status' },
      { command: 'neip ar so list', description: 'List sales orders', descriptionTh: 'แสดงใบสั่งขาย', flags: '--page, --page-size, --status, --customer-id' },
      { command: 'neip ar so create', description: 'Create a sales order (interactive)', descriptionTh: 'สร้างใบสั่งขาย' },
      { command: 'neip ar so get <id>', description: 'Get sales order detail', descriptionTh: 'ดูรายละเอียดใบสั่งขาย' },
      { command: 'neip ar so confirm <id>', description: 'Confirm a sales order', descriptionTh: 'ยืนยันใบสั่งขาย' },
      { command: 'neip ar so cancel <id>', description: 'Cancel a sales order', descriptionTh: 'ยกเลิกใบสั่งขาย' },
      { command: 'neip ar do list', description: 'List delivery notes', descriptionTh: 'แสดงใบส่งของ', flags: '--page, --page-size, --status, --sales-order-id' },
      { command: 'neip ar do create', description: 'Create delivery note (interactive)', descriptionTh: 'สร้างใบส่งของ' },
      { command: 'neip ar do get <id>', description: 'Get delivery note detail', descriptionTh: 'ดูรายละเอียดใบส่งของ' },
      { command: 'neip ar do deliver <id>', description: 'Mark as delivered', descriptionTh: 'บันทึกส่งของแล้ว' },
      { command: 'neip ar receipts list', description: 'List receipts', descriptionTh: 'แสดงใบเสร็จรับเงิน', flags: '--page, --page-size, --status, --customer-id' },
      { command: 'neip ar receipts create', description: 'Issue a receipt (interactive)', descriptionTh: 'ออกใบเสร็จ' },
      { command: 'neip ar receipts get <id>', description: 'Get receipt detail', descriptionTh: 'ดูรายละเอียดใบเสร็จ' },
      { command: 'neip ar receipts void <id>', description: 'Void a receipt', descriptionTh: 'ยกเลิกใบเสร็จ' },
      { command: 'neip ar cn list', description: 'List credit notes', descriptionTh: 'แสดงใบลดหนี้', flags: '--page, --page-size, --status, --customer-id' },
      { command: 'neip ar cn create', description: 'Create a credit note (interactive)', descriptionTh: 'สร้างใบลดหนี้' },
      { command: 'neip ar cn get <id>', description: 'Get credit note detail', descriptionTh: 'ดูรายละเอียดใบลดหนี้' },
      { command: 'neip ar cn issue <id>', description: 'Issue a draft credit note', descriptionTh: 'ออกใบลดหนี้' },
      { command: 'neip ar cn void <id>', description: 'Void a credit note', descriptionTh: 'ยกเลิกใบลดหนี้' },
    ],
  },
  {
    name: 'Accounts Payable (AP)',
    commands: [
      { command: 'neip ap bill list', description: 'List bills', descriptionTh: 'แสดงรายการบิล', flags: '--page, --page-size, --status, --vendor-id' },
      { command: 'neip ap bill create', description: 'Create a bill (interactive)', descriptionTh: 'สร้างบิล' },
      { command: 'neip ap bill get <id>', description: 'Get bill detail', descriptionTh: 'ดูรายละเอียดบิล' },
      { command: 'neip ap bill post <id>', description: 'Post a draft bill', descriptionTh: 'ผ่านบิล' },
      { command: 'neip ap bill void <id>', description: 'Void a bill', descriptionTh: 'ยกเลิกบิล' },
      { command: 'neip ap payment list', description: 'List vendor payments', descriptionTh: 'แสดงรายการจ่ายเงิน', flags: '--page, --page-size, --vendor-id, --status' },
      { command: 'neip ap payment create', description: 'Record a vendor payment (interactive)', descriptionTh: 'บันทึกจ่ายเงิน' },
      { command: 'neip ap po list', description: 'List purchase orders', descriptionTh: 'แสดงใบสั่งซื้อ', flags: '--page, --page-size, --status, --vendor-id' },
      { command: 'neip ap po create', description: 'Create a PO (interactive)', descriptionTh: 'สร้างใบสั่งซื้อ' },
      { command: 'neip ap po get <id>', description: 'Get PO detail', descriptionTh: 'ดูรายละเอียดใบสั่งซื้อ' },
      { command: 'neip ap po send <id>', description: 'Send PO to vendor', descriptionTh: 'ส่งให้ผู้ขาย' },
      { command: 'neip ap po receive <id>', description: 'Record received goods', descriptionTh: 'บันทึกรับสินค้า' },
      { command: 'neip ap po convert <id>', description: 'Convert PO to bill', descriptionTh: 'แปลงเป็นบิล' },
      { command: 'neip ap po cancel <id>', description: 'Cancel a PO', descriptionTh: 'ยกเลิกใบสั่งซื้อ' },
    ],
  },
  {
    name: 'Quotations',
    commands: [
      { command: 'neip quotations list', description: 'List quotations', descriptionTh: 'แสดงใบเสนอราคา', flags: '--status, --customer-id, --limit, --offset' },
      { command: 'neip quotations create', description: 'Create a quotation (interactive)', descriptionTh: 'สร้างใบเสนอราคา' },
      { command: 'neip quotations get <id>', description: 'Get quotation detail', descriptionTh: 'ดูรายละเอียดใบเสนอราคา' },
      { command: 'neip quotations send <id>', description: 'Mark as sent to customer', descriptionTh: 'ส่งให้ลูกค้า' },
      { command: 'neip quotations approve <id>', description: 'Approve quotation', descriptionTh: 'อนุมัติ' },
      { command: 'neip quotations reject <id>', description: 'Reject quotation', descriptionTh: 'ปฏิเสธใบเสนอราคา', flags: '--reason <text>' },
      { command: 'neip quotations convert <id>', description: 'Convert to invoice', descriptionTh: 'แปลงเป็นใบแจ้งหนี้' },
      { command: 'neip quotations duplicate <id>', description: 'Duplicate a quotation', descriptionTh: 'คัดลอกใบเสนอราคา' },
    ],
  },
  {
    name: 'Purchase Requisitions & RFQ',
    commands: [
      { command: 'neip pr list', description: 'List purchase requisitions', descriptionTh: 'แสดงใบขอซื้อ', flags: '--status, --limit' },
      { command: 'neip pr create', description: 'Create a PR (interactive)', descriptionTh: 'สร้างใบขอซื้อ' },
      { command: 'neip pr approve <id>', description: 'Approve a PR', descriptionTh: 'อนุมัติใบขอซื้อ' },
      { command: 'neip pr reject <id>', description: 'Reject a PR', descriptionTh: 'ปฏิเสธใบขอซื้อ', flags: '--reason <text>' },
      { command: 'neip pr convert <id>', description: 'Convert PR to PO', descriptionTh: 'แปลงเป็น PO' },
      { command: 'neip rfq list', description: 'List RFQs', descriptionTh: 'แสดง RFQ', flags: '--status, --limit' },
      { command: 'neip rfq create', description: 'Create an RFQ (interactive)', descriptionTh: 'สร้าง RFQ' },
      { command: 'neip rfq send <id>', description: 'Send RFQ to vendors', descriptionTh: 'ส่ง RFQ' },
      { command: 'neip rfq compare <id>', description: 'Compare vendor responses', descriptionTh: 'เปรียบเทียบราคา' },
      { command: 'neip rfq select <id>', description: 'Select winning vendor', descriptionTh: 'เลือกผู้ขาย', flags: '--vendor <vendorId> (required)', example: 'neip rfq select rfq_123 --vendor v_456' },
    ],
  },
  {
    name: 'Tax & WHT',
    commands: [
      { command: 'neip tax list', description: 'List tax rates', descriptionTh: 'แสดงอัตราภาษี', flags: '--limit, --active' },
      { command: 'neip tax create', description: 'Create a tax rate (interactive)', descriptionTh: 'สร้างอัตราภาษี' },
      { command: 'neip tax update <id>', description: 'Update a tax rate (interactive)', descriptionTh: 'แก้ไขอัตราภาษี' },
      { command: 'neip tax delete <id>', description: 'Delete a tax rate', descriptionTh: 'ลบอัตราภาษี' },
      { command: 'neip wht list', description: 'List WHT certificates', descriptionTh: 'แสดงใบหัก ณ ที่จ่าย', flags: '--status, --month, --year' },
      { command: 'neip wht create', description: 'Create WHT certificate (interactive)', descriptionTh: 'สร้างใบหัก ณ ที่จ่าย' },
      { command: 'neip wht get <id>', description: 'Get WHT certificate detail', descriptionTh: 'ดูรายละเอียดใบหัก ณ ที่จ่าย' },
      { command: 'neip wht issue <id>', description: 'Issue certificate (draft to issued)', descriptionTh: 'ออกใบหัก ณ ที่จ่าย' },
      { command: 'neip wht void <id>', description: 'Void a WHT certificate', descriptionTh: 'ยกเลิกใบหัก ณ ที่จ่าย' },
      { command: 'neip wht file <id>', description: 'Mark certificate as filed', descriptionTh: 'ยื่นแบบแล้ว' },
      { command: 'neip wht summary', description: 'WHT summary for filing', descriptionTh: 'สรุปตามเดือน', flags: '--year, --month', example: 'neip wht summary --year 2026' },
      { command: 'neip wht annual-cert', description: 'Generate annual cert (50 tawi)', descriptionTh: 'ออก 50 ทวิ', flags: '--employee (req), --year (req)', example: 'neip wht annual-cert --employee emp_123 --year 2026' },
    ],
  },
  {
    name: 'Financial Reports',
    commands: [
      { command: 'neip reports balance-sheet', description: 'Generate balance sheet', descriptionTh: 'งบดุล', flags: '--as-of <date>', example: 'neip reports balance-sheet --as-of 2026-03-31' },
      { command: 'neip reports income-statement', description: 'Generate income statement', descriptionTh: 'งบกำไรขาดทุน', flags: '--start-date, --end-date' },
      { command: 'neip reports trial-balance', description: 'Generate trial balance', descriptionTh: 'งบทดลอง', flags: '--as-of <date>' },
      { command: 'neip reports budget-variance', description: 'Budget vs actual analysis', descriptionTh: 'วิเคราะห์ Budget vs Actual', flags: '--year, --period' },
      { command: 'neip reports equity-changes', description: 'Statement of equity changes', descriptionTh: 'งบแสดงการเปลี่ยนแปลงส่วนของเจ้าของ', flags: '--start-date, --end-date' },
      { command: 'neip reports ar-aging', description: 'AR aging report', descriptionTh: 'รายงานอายุลูกหนี้', flags: '--as-of <date>' },
      { command: 'neip reports ap-aging', description: 'AP aging report', descriptionTh: 'รายงานอายุเจ้าหนี้', flags: '--as-of <date>' },
      { command: 'neip reports pnl', description: 'P&L comparison (monthly/quarterly/YoY)', descriptionTh: 'กำไรขาดทุนเปรียบเทียบ', flags: '--mode (req), --fiscal-year (req), --period, --compare-year', example: 'neip reports pnl --mode yoy --fiscal-year 2026' },
      { command: 'neip reports vat-return', description: 'VAT return report', descriptionTh: 'แบบ ภ.พ.30', flags: '--year (req), --month (req)', example: 'neip reports vat-return --year 2026 --month 3' },
      { command: 'neip reports ssc-filing', description: 'Social Security filing report', descriptionTh: 'แบบ สปส.', flags: '--year (req), --month (req)', example: 'neip reports ssc-filing --year 2026 --month 3' },
      { command: 'neip reports cash-flow', description: 'Cash flow statement', descriptionTh: 'งบกระแสเงินสด', flags: '--year (req), --period (req)' },
    ],
  },
  {
    name: 'HR & Payroll',
    commands: [
      { command: 'neip employees list', description: 'List employees', descriptionTh: 'แสดงพนักงาน', flags: '--status, --limit, --search', example: 'neip employees list --search "สมชาย"' },
      { command: 'neip employees create', description: 'Create employee (interactive)', descriptionTh: 'เพิ่มพนักงาน' },
      { command: 'neip employees get <id>', description: 'Get employee detail', descriptionTh: 'ดูรายละเอียดพนักงาน' },
      { command: 'neip employees update <id>', description: 'Update employee (interactive)', descriptionTh: 'แก้ไขข้อมูลพนักงาน' },
      { command: 'neip employees resign <id>', description: 'Process resignation', descriptionTh: 'บันทึกการลาออก', flags: '--date <date>' },
      { command: 'neip departments list', description: 'List departments', descriptionTh: 'แสดงแผนก' },
      { command: 'neip departments create', description: 'Create department (interactive)', descriptionTh: 'สร้างแผนก' },
      { command: 'neip departments update <id>', description: 'Update department (interactive)', descriptionTh: 'แก้ไขแผนก' },
      { command: 'neip payroll list', description: 'List payroll runs', descriptionTh: 'แสดง payroll runs', flags: '--status, --limit' },
      { command: 'neip payroll create', description: 'Create payroll run (interactive)', descriptionTh: 'สร้าง payroll run' },
      { command: 'neip payroll calculate <id>', description: 'Calculate payroll', descriptionTh: 'คำนวณเงินเดือน' },
      { command: 'neip payroll approve <id>', description: 'Approve payroll', descriptionTh: 'อนุมัติ payroll' },
      { command: 'neip payroll pay <id>', description: 'Mark as paid', descriptionTh: 'จ่ายเงินเดือน' },
      { command: 'neip leave types', description: 'List leave types', descriptionTh: 'แสดงประเภทการลา' },
      { command: 'neip leave request', description: 'Submit leave request (interactive)', descriptionTh: 'ยื่นคำขอลา' },
      { command: 'neip leave list', description: 'List leave requests', descriptionTh: 'แสดงคำขอลา', flags: '--status, --limit' },
      { command: 'neip leave approve <id>', description: 'Approve leave', descriptionTh: 'อนุมัติ' },
      { command: 'neip leave reject <id>', description: 'Reject leave', descriptionTh: 'ปฏิเสธคำขอลา', flags: '--reason <text>' },
      { command: 'neip leave balance <employeeId>', description: 'Check leave balance', descriptionTh: 'ดูวันลาคงเหลือ' },
      { command: 'neip attendance clock-in', description: 'Clock in', descriptionTh: 'ลงเวลาเข้า', flags: '--employee, --note', example: 'neip attendance clock-in --note "WFH"' },
      { command: 'neip attendance clock-out', description: 'Clock out', descriptionTh: 'ลงเวลาออก', flags: '--employee, --note' },
      { command: 'neip attendance summary', description: 'Attendance summary', descriptionTh: 'สรุปเวลาเข้าออก', flags: '--employee, --month, --year' },
      { command: 'neip positions list', description: 'List positions', descriptionTh: 'แสดงตำแหน่ง', flags: '--department, --limit' },
      { command: 'neip positions create', description: 'Create position (interactive)', descriptionTh: 'สร้างตำแหน่ง' },
      { command: 'neip positions org-tree', description: 'Display org chart', descriptionTh: 'แสดงผังองค์กร', flags: '--department' },
    ],
  },
  {
    name: 'Inventory & Products',
    commands: [
      { command: 'neip products list', description: 'List products', descriptionTh: 'แสดงสินค้า', flags: '--limit, --offset, --search', example: 'neip products list --search "laptop"' },
      { command: 'neip products create', description: 'Create a product (interactive)', descriptionTh: 'สร้างสินค้า' },
      { command: 'neip products update <id>', description: 'Update a product (interactive)', descriptionTh: 'แก้ไขสินค้า' },
      { command: 'neip inventory levels', description: 'Current stock levels', descriptionTh: 'ดูสต็อกปัจจุบัน' },
      { command: 'neip inventory movement', description: 'Stock movement history', descriptionTh: 'ความเคลื่อนไหวสต็อก' },
      { command: 'neip inventory valuation', description: 'Inventory valuation', descriptionTh: 'มูลค่าสต็อก' },
      { command: 'neip inventory low-stock', description: 'Products below minimum', descriptionTh: 'สินค้าต่ำกว่า minimum' },
      { command: 'neip stock-count list', description: 'List stock counts', descriptionTh: 'แสดงการตรวจนับ', flags: '--status, --limit' },
      { command: 'neip stock-count create', description: 'Create stock count (interactive)', descriptionTh: 'สร้างการตรวจนับ' },
      { command: 'neip stock-count post <id>', description: 'Post stock count adjustments', descriptionTh: 'บันทึกผลตรวจนับ' },
    ],
  },
  {
    name: 'Fixed Assets',
    commands: [
      { command: 'neip assets list', description: 'List fixed assets', descriptionTh: 'แสดงสินทรัพย์ถาวร', flags: '--category, --status' },
      { command: 'neip assets create', description: 'Create a fixed asset (interactive)', descriptionTh: 'เพิ่มสินทรัพย์' },
      { command: 'neip assets get <id>', description: 'Get asset detail', descriptionTh: 'ดูรายละเอียดสินทรัพย์' },
      { command: 'neip assets depreciate <id>', description: 'Run depreciation', descriptionTh: 'คำนวณค่าเสื่อมราคา' },
      { command: 'neip assets dispose <id>', description: 'Dispose of an asset', descriptionTh: 'จำหน่ายสินทรัพย์' },
      { command: 'neip assets report', description: 'Fixed assets summary report', descriptionTh: 'รายงานสินทรัพย์' },
    ],
  },
  {
    name: 'Banking',
    commands: [
      { command: 'neip bank list', description: 'List bank accounts', descriptionTh: 'แสดงบัญชีธนาคาร' },
      { command: 'neip bank create', description: 'Create bank account (interactive)', descriptionTh: 'สร้างบัญชีธนาคาร' },
      { command: 'neip bank transactions <id>', description: 'List bank transactions', descriptionTh: 'แสดงรายการเดินบัญชี' },
      { command: 'neip bank reconcile <txnId>', description: 'Reconcile a transaction', descriptionTh: 'กระทบยอด' },
      { command: 'neip bank report <id>', description: 'Bank account report', descriptionTh: 'รายงานธนาคาร' },
    ],
  },
  {
    name: 'Contacts & Vendors',
    commands: [
      { command: 'neip contacts list', description: 'List contacts', descriptionTh: 'แสดงผู้ติดต่อ', flags: '--limit, --offset, --type, --search', example: 'neip contacts list --type customer --search "สมชาย"' },
      { command: 'neip contacts create', description: 'Create contact (interactive)', descriptionTh: 'สร้างผู้ติดต่อ' },
      { command: 'neip contacts get <id>', description: 'Get contact detail', descriptionTh: 'ดูรายละเอียดผู้ติดต่อ' },
      { command: 'neip contacts update <id>', description: 'Update contact (interactive)', descriptionTh: 'แก้ไขผู้ติดต่อ' },
      { command: 'neip contacts delete <id>', description: 'Delete a contact', descriptionTh: 'ลบผู้ติดต่อ' },
      { command: 'neip vendors list', description: 'List vendors', descriptionTh: 'แสดงผู้ขาย', flags: '--limit, --offset, --search' },
      { command: 'neip vendors create', description: 'Create vendor (interactive)', descriptionTh: 'สร้างผู้ขาย' },
      { command: 'neip vendors update <id>', description: 'Update vendor (interactive)', descriptionTh: 'แก้ไขผู้ขาย' },
    ],
  },
  {
    name: 'Cost Centers & Profit Centers',
    commands: [
      { command: 'neip cost-centers list', description: 'List cost centers', descriptionTh: 'แสดงศูนย์ต้นทุน' },
      { command: 'neip cost-centers create', description: 'Create cost center (interactive)', descriptionTh: 'สร้างศูนย์ต้นทุน' },
      { command: 'neip cost-centers update <id>', description: 'Update cost center (interactive)', descriptionTh: 'แก้ไขศูนย์ต้นทุน' },
      { command: 'neip profit-centers list', description: 'List profit centers', descriptionTh: 'แสดงศูนย์กำไร' },
      { command: 'neip profit-centers create', description: 'Create profit center (interactive)', descriptionTh: 'สร้างศูนย์กำไร' },
      { command: 'neip profit-centers update <id>', description: 'Update profit center (interactive)', descriptionTh: 'แก้ไขศูนย์กำไร' },
    ],
  },
  {
    name: 'Fiscal Periods & Budgets',
    commands: [
      { command: 'neip fiscal years', description: 'List fiscal years', descriptionTh: 'แสดงปีบัญชี', flags: '--limit' },
      { command: 'neip fiscal years create', description: 'Create fiscal year (interactive)', descriptionTh: 'สร้างปีบัญชี' },
      { command: 'neip fiscal period close <id>', description: 'Close a fiscal period', descriptionTh: 'ปิดงวดบัญชี' },
      { command: 'neip fiscal period reopen <id>', description: 'Reopen a fiscal period', descriptionTh: 'เปิดงวดบัญชีใหม่' },
      { command: 'neip fiscal close-year <yearId>', description: 'Close fiscal year', descriptionTh: 'ปิดปีบัญชี' },
      { command: 'neip fiscal reopen-year <yearId>', description: 'Reopen fiscal year', descriptionTh: 'เปิดปีบัญชีใหม่' },
      { command: 'neip budgets list', description: 'List budgets', descriptionTh: 'แสดงงบประมาณ', flags: '--limit, --year, --status' },
      { command: 'neip budgets create', description: 'Create budget (interactive)', descriptionTh: 'สร้างงบประมาณ' },
      { command: 'neip budgets update <id>', description: 'Update budget (interactive)', descriptionTh: 'แก้ไขงบประมาณ' },
    ],
  },
  {
    name: 'Recurring JE & Pricing',
    commands: [
      { command: 'neip recurring-je list', description: 'List recurring journal entries', descriptionTh: 'แสดงรายการบัญชีประจำ', flags: '--status, --limit' },
      { command: 'neip recurring-je create', description: 'Create recurring JE (interactive)', descriptionTh: 'สร้างรายการบัญชีประจำ' },
      { command: 'neip recurring-je run <id>', description: 'Execute recurring JE now', descriptionTh: 'รันรายการบัญชีประจำ' },
      { command: 'neip pricing list', description: 'List pricing rules', descriptionTh: 'แสดงกฎราคา', flags: '--limit' },
      { command: 'neip pricing create', description: 'Create pricing rule (interactive)', descriptionTh: 'สร้างกฎราคา' },
      { command: 'neip pricing resolve', description: 'Resolve effective price', descriptionTh: 'คำนวณราคา', flags: '--product (req), --customer, --quantity, --date' },
      { command: 'neip payment-terms list', description: 'List payment terms', descriptionTh: 'แสดงเงื่อนไขชำระเงิน', flags: '--limit' },
      { command: 'neip payment-terms create', description: 'Create payment terms (interactive)', descriptionTh: 'สร้างเงื่อนไขชำระเงิน' },
    ],
  },
  {
    name: 'Dunning & Credit',
    commands: [
      { command: 'neip dunning run', description: 'Execute dunning process', descriptionTh: 'รันการทวงถาม', flags: '--as-of <date>' },
      { command: 'neip dunning list', description: 'List dunning records', descriptionTh: 'แสดงรายการทวงถาม', flags: '--level, --status, --limit' },
      { command: 'neip credit check <contactId>', description: 'Check credit status', descriptionTh: 'ตรวจสอบเครดิต' },
    ],
  },
  {
    name: 'Currency & Multi-company',
    commands: [
      { command: 'neip currency list', description: 'List currencies', descriptionTh: 'แสดงสกุลเงิน' },
      { command: 'neip currency create', description: 'Create currency (interactive)', descriptionTh: 'สร้างสกุลเงิน' },
      { command: 'neip currency rate', description: 'Get exchange rate', descriptionTh: 'ดูอัตราแลกเปลี่ยน', flags: '--from (req), --to (req), --date', example: 'neip currency rate --from USD --to THB' },
      { command: 'neip currency convert', description: 'Convert between currencies', descriptionTh: 'แปลงสกุลเงิน', flags: '--from (req), --to (req), --amount (req), --date', example: 'neip currency convert --from USD --to THB --amount 1000' },
      { command: 'neip company list', description: 'List companies', descriptionTh: 'แสดงบริษัท' },
      { command: 'neip company create', description: 'Create company (interactive)', descriptionTh: 'สร้างบริษัท' },
      { command: 'neip company switch <id>', description: 'Switch active company', descriptionTh: 'เปลี่ยนบริษัท' },
    ],
  },
  {
    name: 'Batch Tracking',
    commands: [
      { command: 'neip batch list', description: 'List batches', descriptionTh: 'แสดง Lot/Batch', flags: '--product, --status, --limit' },
      { command: 'neip batch create', description: 'Create batch (interactive)', descriptionTh: 'สร้าง Batch' },
      { command: 'neip batch trace <id>', description: 'Trace batch history', descriptionTh: 'ติดตาม Batch' },
    ],
  },
  {
    name: 'Approvals & Workflows',
    commands: [
      { command: 'neip approval list', description: 'List approval requests', descriptionTh: 'แสดงรายการอนุมัติ', flags: '--status, --type, --limit' },
      { command: 'neip approval approve <id>', description: 'Approve a request', descriptionTh: 'อนุมัติ', flags: '--comment' },
      { command: 'neip approval reject <id>', description: 'Reject a request', descriptionTh: 'ปฏิเสธ', flags: '--reason' },
      { command: 'neip approval delegate <id>', description: 'Delegate approval', descriptionTh: 'มอบหมาย', flags: '--to (req), --comment' },
    ],
  },
  {
    name: 'Settings & Admin',
    commands: [
      { command: 'neip settings get', description: 'Get organisation settings', descriptionTh: 'ดูการตั้งค่า' },
      { command: 'neip settings update', description: 'Update settings (interactive)', descriptionTh: 'แก้ไขการตั้งค่า' },
      { command: 'neip settings ai', description: 'Get AI feature settings', descriptionTh: 'ดูการตั้งค่า AI' },
      { command: 'neip notifications list', description: 'List notifications', descriptionTh: 'แสดงการแจ้งเตือน', flags: '--page, --page-size, --unread' },
      { command: 'neip notifications settings', description: 'Get notification settings', descriptionTh: 'ดูการตั้งค่าการแจ้งเตือน' },
      { command: 'neip notifications settings update', description: 'Update notification settings', descriptionTh: 'แก้ไขการตั้งค่าการแจ้งเตือน' },
      { command: 'neip roles list', description: 'List roles', descriptionTh: 'แสดง roles', flags: '--limit' },
      { command: 'neip roles create', description: 'Create role (interactive)', descriptionTh: 'สร้าง role' },
      { command: 'neip roles update <id>', description: 'Update role (interactive)', descriptionTh: 'แก้ไข role' },
      { command: 'neip roles delete <id>', description: 'Delete a role', descriptionTh: 'ลบ role' },
      { command: 'neip users invite <email>', description: 'Invite a user', descriptionTh: 'เชิญผู้ใช้', flags: '--role (req), --message', example: 'neip users invite user@example.com --role role_accountant' },
      { command: 'neip webhooks list', description: 'List webhooks', descriptionTh: 'แสดง webhooks', flags: '--limit' },
      { command: 'neip webhooks create', description: 'Create webhook (interactive)', descriptionTh: 'สร้าง webhook' },
      { command: 'neip webhooks delete <id>', description: 'Delete a webhook', descriptionTh: 'ลบ webhook' },
      { command: 'neip audit list', description: 'List audit log entries', descriptionTh: 'แสดง audit log', flags: '--limit, --offset' },
      { command: 'neip audit search', description: 'Search audit log', descriptionTh: 'ค้นหา audit log', flags: '--resource, --id, --user, --start, --end, --limit' },
    ],
  },
  {
    name: 'Dashboard & Month-End',
    commands: [
      { command: 'neip dashboard', description: 'Executive dashboard', descriptionTh: 'ภาพรวมธุรกิจ' },
      { command: 'neip dashboard consolidated', description: 'Consolidated multi-company dashboard', descriptionTh: 'แดชบอร์ดรวม' },
      { command: 'neip month-end close', description: 'Month-end close process', descriptionTh: 'ปิดงวดสิ้นเดือน', flags: '--year (req), --period (req)', example: 'neip month-end close --year 2026 --period 3' },
      { command: 'neip month-end status <jobId>', description: 'Check close job status', descriptionTh: 'ดูสถานะ month-end' },
    ],
  },
  {
    name: 'Import & Export',
    commands: [
      { command: 'neip import upload <file>', description: 'Upload file for import', descriptionTh: 'นำเข้าข้อมูล' },
      { command: 'neip import preview <file>', description: 'Preview import data', descriptionTh: 'ดูตัวอย่างข้อมูลนำเข้า' },
      { command: 'neip import status <jobId>', description: 'Check import job status', descriptionTh: 'ดูสถานะนำเข้า' },
      { command: 'neip export run <type>', description: 'Export data to file', descriptionTh: 'ส่งออกข้อมูล', flags: '--output, --start-date, --end-date', example: 'neip export run chart_of_accounts --output coa.csv' },
    ],
  },
  {
    name: 'Firm Management',
    commands: [
      { command: 'neip firm clients list', description: "List firm's managed clients", descriptionTh: 'แสดงลูกค้าสำนักงานบัญชี', flags: '--page, --page-size, --status' },
      { command: 'neip firm clients add <tenantId>', description: 'Add a managed client', descriptionTh: 'เพิ่มลูกค้า' },
      { command: 'neip firm clients remove <id>', description: 'Remove a managed client', descriptionTh: 'ลบลูกค้า' },
    ],
  },
  {
    name: 'PDPA Compliance',
    commands: [
      { command: 'neip pdpa access-request', description: 'Submit data access request', descriptionTh: 'ขอดูข้อมูลส่วนบุคคล' },
      { command: 'neip pdpa erasure-request', description: 'Submit data erasure request', descriptionTh: 'ขอลบข้อมูลส่วนบุคคล' },
    ],
  },
  {
    name: 'AI Features',
    commands: [
      { command: 'neip ai anomaly-scan', description: 'Scan for financial anomalies', descriptionTh: 'ตรวจจับความผิดปกติ', flags: '--period (req), --threshold', example: 'neip ai anomaly-scan --period 2026-Q1 --threshold 0.7' },
      { command: 'neip ai forecast', description: 'AI revenue/expense forecast', descriptionTh: 'พยากรณ์รายรับ/รายจ่าย', flags: '--days', example: 'neip ai forecast --days 180' },
      { command: 'neip ai categorize <description>', description: 'AI transaction categorization', descriptionTh: 'จัดหมวดหมู่อัตโนมัติ', example: 'neip ai categorize "ค่าน้ำมันรถ"' },
      { command: 'neip ai predict', description: 'AI predictions (cash-flow, churn, demand)', descriptionTh: 'พยากรณ์เชิงลึก', flags: '--type (req), --months', example: 'neip ai predict --type cash-flow --months 12' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={handleCopy} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700">
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function GroupSection({ group, filter }: { group: CliGroup; filter: string }) {
  const [open, setOpen] = useState(true);
  const filtered = useMemo(() => {
    if (!filter) return group.commands;
    const q = filter.toLowerCase();
    return group.commands.filter(
      (c) => c.command.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.descriptionTh.includes(q),
    );
  }, [group.commands, filter]);

  if (filtered.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-left font-semibold text-white hover:bg-slate-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
      >
        <Terminal className="h-4 w-4 text-green-600 dark:text-green-400" />
        <span className="flex-1">{group.name}</span>
        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs dark:bg-gray-700">{filtered.length}</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="mt-1 overflow-x-auto rounded-lg border border-gray-400 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 border-b border-slate-300 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-900 dark:text-gray-300">Command</th>
                <th className="px-4 py-2 text-left font-medium text-gray-900 dark:text-gray-300">Description</th>
                <th className="px-4 py-2 text-left font-medium text-gray-900 dark:text-gray-300">Flags</th>
                <th className="w-10 px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300 dark:divide-gray-800">
              {filtered.map((cmd) => (
                <tr key={cmd.command} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-2">
                    <code className="rounded bg-slate-100 border border-slate-300 px-1.5 py-0.5 font-mono text-xs text-gray-900 dark:bg-gray-700 dark:text-gray-100">
                      {cmd.command}
                    </code>
                    {cmd.example && (
                      <p className="mt-1 font-mono text-[10px] text-gray-400">{cmd.example}</p>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-950 dark:text-gray-200">
                    <p className="text-xs">{cmd.description}</p>
                    <p className="text-xs text-gray-600">{cmd.descriptionTh}</p>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-700">{cmd.flags || '\u2014'}</td>
                  <td className="px-2 py-2">
                    <CopyButton text={cmd.example || cmd.command} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function CliDocsPage() {
  const [search, setSearch] = useState('');

  const totalCommands = useMemo(() => CLI_GROUPS.reduce((sum, g) => sum + g.commands.length, 0), []);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar TOC */}
      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-gray-400 p-4 lg:block dark:border-gray-700">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-900 dark:text-gray-400">
          Modules
        </p>
        <nav className="space-y-1">
          {CLI_GROUPS.map((g) => (
            <a
              key={g.name}
              href={`#${g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              className="block rounded px-2 py-1.5 text-sm text-gray-800 hover:bg-gray-200 hover:text-black dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              {g.name}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 px-6 py-8 lg:px-12">
        <nav className="mb-6 flex items-center gap-2 text-sm text-gray-900 dark:text-gray-400">
          <Link href="/docs" className="hover:text-gray-700 dark:hover:text-gray-200">Docs</Link>
          <span>/</span>
          <span className="text-black dark:text-white">CLI Reference</span>
        </nav>

        <h1 className="text-3xl font-bold text-black dark:text-white">CLI Reference</h1>
        <p className="mt-2 text-gray-950 dark:text-gray-200">
          คู่มืออ้างอิง CLI ฉบับสมบูรณ์ — {totalCommands} Commands | Version 0.9.0
        </p>

        {/* Global Flags */}
        <div className="mt-4 rounded-lg border border-gray-400 bg-slate-100 p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-300">Global Flags</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              { flag: '--format <table|json>', desc: 'Output format' },
              { flag: '--dry-run', desc: 'Preview without saving' },
              { flag: '--explain', desc: 'Show Dr/Cr breakdown' },
              { flag: '--non-interactive', desc: 'For CI/scripts' },
              { flag: '-v, --version', desc: 'Show version' },
              { flag: '--help', desc: 'Show help' },
            ].map((f) => (
              <span key={f.flag} className="rounded border border-gray-400 px-2 py-1 font-mono text-xs dark:border-gray-600">
                <span className="text-green-700 dark:text-green-400">{f.flag}</span>
                <span className="ml-1 text-gray-400">{'\u2014'} {f.desc}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search commands... (e.g. invoice, payroll, ใบแจ้งหนี้)"
            className="w-full rounded-lg border border-gray-400 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Command Groups */}
        <div className="mt-6 space-y-4">
          {CLI_GROUPS.map((g) => (
            <div key={g.name} id={g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}>
              <GroupSection group={g} filter={search} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
