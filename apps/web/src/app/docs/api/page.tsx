'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Search, Globe } from 'lucide-react';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  auth: string;
  permission?: string;
  body?: string;
}

interface ApiGroup {
  name: string;
  endpoints: ApiEndpoint[];
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  POST: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  PUT: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const API_GROUPS: ApiGroup[] = [
  {
    name: 'System & Health',
    endpoints: [
      { method: 'GET', path: '/api/health', description: 'Health check — liveness/readiness probe', auth: 'None' },
    ],
  },
  {
    name: 'Authentication',
    endpoints: [
      { method: 'POST', path: '/api/v1/auth/register', description: 'Register new user account (สมัครสมาชิก)', auth: 'None', body: '{ email, password, name, tenantId? }' },
      { method: 'POST', path: '/api/v1/auth/login', description: 'Authenticate — issue JWT tokens (เข้าสู่ระบบ)', auth: 'None', body: '{ email, password }' },
      { method: 'POST', path: '/api/v1/auth/refresh', description: 'Rotate refresh token (ต่ออายุ token)', auth: 'None', body: '{ refreshToken }' },
      { method: 'POST', path: '/api/v1/auth/logout', description: 'Revoke refresh token — idempotent (ออกจากระบบ)', auth: 'None', body: '{ refreshToken }' },
    ],
  },
  {
    name: 'Users',
    endpoints: [
      { method: 'POST', path: '/api/v1/users/invite', description: 'Invite user with role assignment (เชิญผู้ใช้)', auth: 'Required', permission: 'user:invite', body: '{ email, name, role }' },
    ],
  },
  {
    name: 'Organizations (Tenants)',
    endpoints: [
      { method: 'POST', path: '/api/v1/organizations', description: 'Create org — seeds TFAC CoA, fiscal year, roles (สร้างองค์กร)', auth: 'Required', body: '{ name, businessType, fiscalYearStart? }' },
      { method: 'GET', path: '/api/v1/organizations/:id', description: 'Get organization details (ดูรายละเอียดองค์กร)', auth: 'Required' },
      { method: 'PUT', path: '/api/v1/organizations/:id', description: 'Update organization name/settings (แก้ไของค์กร)', auth: 'Required', permission: 'user:update' },
      { method: 'PUT', path: '/api/v1/organizations/:id/settings', description: 'Configure BYOK LLM API key & preferences (ตั้งค่า LLM)', auth: 'Required', permission: 'user:update' },
    ],
  },
  {
    name: 'GL — Chart of Accounts',
    endpoints: [
      { method: 'GET', path: '/api/v1/accounts', description: 'List Chart of Accounts (ผังบัญชี)', auth: 'Required', permission: 'gl:account:read' },
      { method: 'POST', path: '/api/v1/accounts', description: 'Create account (สร้างบัญชี)', auth: 'Required', permission: 'gl:account:create' },
      { method: 'PUT', path: '/api/v1/accounts/:id', description: 'Update account (แก้ไขบัญชี)', auth: 'Required', permission: 'gl:account:update' },
      { method: 'DELETE', path: '/api/v1/accounts/:id', description: 'Soft-delete account (ลบบัญชี)', auth: 'Required', permission: 'gl:account:delete' },
    ],
  },
  {
    name: 'GL — Journal Entries',
    endpoints: [
      { method: 'POST', path: '/api/v1/journal-entries', description: 'Create draft journal entry (สร้างรายการบันทึกบัญชี)', auth: 'Required', permission: 'gl:journal:create' },
      { method: 'GET', path: '/api/v1/journal-entries', description: 'List journal entries with filtering (รายการบันทึกบัญชี)', auth: 'Required', permission: 'gl:journal:read' },
      { method: 'POST', path: '/api/v1/journal-entries/:id/post', description: 'Post draft entry — immutable (ผ่านรายการ)', auth: 'Required', permission: 'gl:journal:post' },
      { method: 'POST', path: '/api/v1/journal-entries/:id/reverse', description: 'Reverse posted entry — creates reversal JE (กลับรายการ)', auth: 'Required', permission: 'gl:journal:reverse' },
    ],
  },
  {
    name: 'GL — Fiscal Periods',
    endpoints: [
      { method: 'GET', path: '/api/v1/fiscal-years', description: 'List fiscal years with periods (ปีงบประมาณ)', auth: 'Required', permission: 'gl:period:read' },
      { method: 'POST', path: '/api/v1/fiscal-years', description: 'Create fiscal year with 12 periods (สร้างปีงบประมาณ)', auth: 'Required', permission: 'gl:period:close' },
      { method: 'POST', path: '/api/v1/fiscal-periods/:id/close', description: 'Close fiscal period (ปิดงวด)', auth: 'Required', permission: 'gl:period:close' },
      { method: 'POST', path: '/api/v1/fiscal-periods/:id/reopen', description: 'Reopen closed period (เปิดงวดอีกครั้ง)', auth: 'Required', permission: 'gl:period:close' },
      { method: 'POST', path: '/api/v1/fiscal-years/:id/close', description: 'Year-end closing — zeroes Rev/Exp, carry-forward (ปิดบัญชีสิ้นปี)', auth: 'Required', permission: 'gl:period:close' },
      { method: 'POST', path: '/api/v1/fiscal-years/:id/reopen', description: 'Reopen closed fiscal year (เปิดปีงบประมาณ)', auth: 'Required', permission: 'gl:period:close' },
    ],
  },
  {
    name: 'GL — Budgets',
    endpoints: [
      { method: 'GET', path: '/api/v1/budgets', description: 'List budgets (งบประมาณ)', auth: 'Required', permission: 'gl:account:read' },
      { method: 'POST', path: '/api/v1/budgets', description: 'Create budget allocation (สร้างงบประมาณ)', auth: 'Required', permission: 'gl:account:create' },
      { method: 'PUT', path: '/api/v1/budgets/:id', description: 'Update budget amount (แก้ไขงบประมาณ)', auth: 'Required', permission: 'gl:account:update' },
    ],
  },
  {
    name: 'Recurring Journal Entries',
    endpoints: [
      { method: 'POST', path: '/api/v1/recurring-je', description: 'Create recurring JE template (รายการอัตโนมัติ)', auth: 'Required', permission: 'gl:journal:create' },
      { method: 'GET', path: '/api/v1/recurring-je', description: 'List recurring JE templates', auth: 'Required', permission: 'gl:journal:read' },
      { method: 'GET', path: '/api/v1/recurring-je/:id', description: 'Get recurring JE detail', auth: 'Required', permission: 'gl:journal:read' },
      { method: 'PUT', path: '/api/v1/recurring-je/:id', description: 'Update recurring JE', auth: 'Required', permission: 'gl:journal:create' },
      { method: 'DELETE', path: '/api/v1/recurring-je/:id', description: 'Deactivate recurring JE', auth: 'Required', permission: 'gl:journal:create' },
      { method: 'POST', path: '/api/v1/recurring-je/run', description: 'Execute pending recurring JEs (ประมวลผลรายการอัตโนมัติ)', auth: 'Required', permission: 'gl:journal:create' },
    ],
  },
  {
    name: 'AR — Invoices (ใบแจ้งหนี้)',
    endpoints: [
      { method: 'POST', path: '/api/v1/invoices', description: 'Create invoice in draft (สร้างใบแจ้งหนี้)', auth: 'Required', permission: 'ar:invoice:create' },
      { method: 'GET', path: '/api/v1/invoices', description: 'List invoices with filtering (รายการใบแจ้งหนี้)', auth: 'Required', permission: 'ar:invoice:read' },
      { method: 'GET', path: '/api/v1/invoices/:id', description: 'Get invoice detail with lines (รายละเอียดใบแจ้งหนี้)', auth: 'Required', permission: 'ar:invoice:read' },
      { method: 'POST', path: '/api/v1/invoices/:id/post', description: 'Post invoice — creates JE (ผ่านใบแจ้งหนี้)', auth: 'Required', permission: 'ar:invoice:create' },
      { method: 'POST', path: '/api/v1/invoices/:id/void', description: 'Void invoice — reversal JE if posted (ยกเลิกใบแจ้งหนี้)', auth: 'Required', permission: 'ar:invoice:void' },
      { method: 'GET', path: '/api/v1/invoices/:id/e-tax', description: 'e-Tax Invoice Thai T02 format (ใบกำกับภาษีอิเล็กทรอนิกส์)', auth: 'Required', permission: 'fi:etax:read' },
    ],
  },
  {
    name: 'AR — Payments (รับชำระ)',
    endpoints: [
      { method: 'POST', path: '/api/v1/payments', description: 'Record customer payment — auto JE (บันทึกรับชำระ)', auth: 'Required', permission: 'ar:payment:create' },
      { method: 'GET', path: '/api/v1/payments', description: 'List payments (รายการรับชำระ)', auth: 'Required', permission: 'ar:payment:read' },
      { method: 'POST', path: '/api/v1/payments/:id/void', description: 'Void payment — restore invoice balance (ยกเลิกรับชำระ)', auth: 'Required', permission: 'ar:payment:update' },
      { method: 'POST', path: '/api/v1/payments/:id/match', description: 'Match payment to invoices (จับคู่การชำระ)', auth: 'Required', permission: 'ar:payment:update' },
    ],
  },
  {
    name: 'Quotations (ใบเสนอราคา)',
    endpoints: [
      { method: 'POST', path: '/api/v1/quotations', description: 'Create quotation (สร้างใบเสนอราคา)', auth: 'Required', permission: 'ar:quotation:create' },
      { method: 'GET', path: '/api/v1/quotations', description: 'List quotations', auth: 'Required', permission: 'ar:quotation:read' },
      { method: 'GET', path: '/api/v1/quotations/:id', description: 'Get quotation detail', auth: 'Required', permission: 'ar:quotation:read' },
      { method: 'PUT', path: '/api/v1/quotations/:id', description: 'Update draft quotation (แก้ไขใบเสนอราคา)', auth: 'Required', permission: 'ar:quotation:update' },
      { method: 'POST', path: '/api/v1/quotations/:id/send', description: 'Mark as sent (draft -> sent)', auth: 'Required', permission: 'ar:quotation:send' },
      { method: 'POST', path: '/api/v1/quotations/:id/approve', description: 'Approve quotation', auth: 'Required', permission: 'ar:quotation:approve' },
      { method: 'POST', path: '/api/v1/quotations/:id/reject', description: 'Reject quotation', auth: 'Required', permission: 'ar:quotation:approve' },
      { method: 'POST', path: '/api/v1/quotations/:id/convert', description: 'Convert to invoice (QT -> INV shortcut)', auth: 'Required', permission: 'ar:quotation:convert' },
      { method: 'POST', path: '/api/v1/quotations/:id/duplicate', description: 'Clone as new draft (+30 days)', auth: 'Required', permission: 'ar:quotation:create' },
      { method: 'POST', path: '/api/v1/quotations/:id/convert-to-order', description: 'Convert to sales order (QT -> SO)', auth: 'Required', permission: 'ar:quotation:convert' },
    ],
  },
  {
    name: 'Sales Orders (ใบสั่งขาย)',
    endpoints: [
      { method: 'POST', path: '/api/v1/sales-orders', description: 'Create sales order (สร้างใบสั่งขาย)', auth: 'Required', permission: 'ar:so:create' },
      { method: 'GET', path: '/api/v1/sales-orders', description: 'List sales orders', auth: 'Required', permission: 'ar:so:read' },
      { method: 'GET', path: '/api/v1/sales-orders/:id', description: 'Get SO detail', auth: 'Required', permission: 'ar:so:read' },
      { method: 'PUT', path: '/api/v1/sales-orders/:id', description: 'Update draft SO', auth: 'Required', permission: 'ar:so:update' },
      { method: 'POST', path: '/api/v1/sales-orders/:id/confirm', description: 'Confirm SO (draft -> confirmed)', auth: 'Required', permission: 'ar:so:confirm' },
      { method: 'POST', path: '/api/v1/sales-orders/:id/cancel', description: 'Cancel SO', auth: 'Required', permission: 'ar:so:confirm' },
    ],
  },
  {
    name: 'Delivery Notes (ใบส่งของ)',
    endpoints: [
      { method: 'POST', path: '/api/v1/delivery-notes', description: 'Create delivery note from SO (สร้างใบส่งของ)', auth: 'Required', permission: 'ar:do:create' },
      { method: 'GET', path: '/api/v1/delivery-notes', description: 'List delivery notes', auth: 'Required', permission: 'ar:do:read' },
      { method: 'GET', path: '/api/v1/delivery-notes/:id', description: 'Get delivery note detail', auth: 'Required', permission: 'ar:do:read' },
      { method: 'POST', path: '/api/v1/delivery-notes/:id/deliver', description: 'Mark as delivered — updates SO + stock (ส่งของ)', auth: 'Required', permission: 'ar:do:deliver' },
      { method: 'POST', path: '/api/v1/delivery-notes/:id/convert-to-invoice', description: 'Convert DN to invoice (ออกใบแจ้งหนี้จากใบส่งของ)', auth: 'Required', permission: 'ar:invoice:create' },
    ],
  },
  {
    name: 'Receipts (ใบเสร็จรับเงิน)',
    endpoints: [
      { method: 'POST', path: '/api/v1/receipts', description: 'Issue official receipt (ออกใบเสร็จรับเงิน)', auth: 'Required', permission: 'ar:receipt:create' },
      { method: 'GET', path: '/api/v1/receipts', description: 'List receipts', auth: 'Required', permission: 'ar:receipt:read' },
      { method: 'GET', path: '/api/v1/receipts/:id', description: 'Get receipt detail', auth: 'Required', permission: 'ar:receipt:read' },
      { method: 'GET', path: '/api/v1/receipts/:id/pdf', description: 'Generate printable receipt in Thai format (พิมพ์ใบเสร็จ)', auth: 'Required', permission: 'ar:receipt:read' },
      { method: 'POST', path: '/api/v1/receipts/:id/void', description: 'Void receipt (ยกเลิกใบเสร็จ)', auth: 'Required', permission: 'ar:receipt:void' },
    ],
  },
  {
    name: 'Credit Notes (ใบลดหนี้)',
    endpoints: [
      { method: 'POST', path: '/api/v1/credit-notes', description: 'Create credit note — validates CN <= invoice (สร้างใบลดหนี้)', auth: 'Required', permission: 'ar:cn:create' },
      { method: 'GET', path: '/api/v1/credit-notes', description: 'List credit notes', auth: 'Required', permission: 'ar:cn:read' },
      { method: 'GET', path: '/api/v1/credit-notes/:id', description: 'Get credit note detail', auth: 'Required', permission: 'ar:cn:read' },
      { method: 'POST', path: '/api/v1/credit-notes/:id/issue', description: 'Issue credit note (draft -> issued) (ออกใบลดหนี้)', auth: 'Required', permission: 'ar:cn:issue' },
      { method: 'POST', path: '/api/v1/credit-notes/:id/void', description: 'Void credit note (ยกเลิกใบลดหนี้)', auth: 'Required', permission: 'ar:cn:void' },
    ],
  },
  {
    name: 'AP — Vendors (ผู้ขาย)',
    endpoints: [
      { method: 'GET', path: '/api/v1/vendors', description: 'List vendors with search (รายการผู้ขาย)', auth: 'Required', permission: 'ap:vendor:read' },
      { method: 'POST', path: '/api/v1/vendors', description: 'Create vendor (สร้างผู้ขาย)', auth: 'Required', permission: 'ap:vendor:create' },
      { method: 'PUT', path: '/api/v1/vendors/:id', description: 'Update vendor (แก้ไขผู้ขาย)', auth: 'Required', permission: 'ap:vendor:update' },
    ],
  },
  {
    name: 'AP — Bills (ใบแจ้งหนี้ซื้อ)',
    endpoints: [
      { method: 'POST', path: '/api/v1/bills', description: 'Create bill in draft (สร้างใบแจ้งหนี้ซื้อ)', auth: 'Required', permission: 'ap:bill:create' },
      { method: 'GET', path: '/api/v1/bills', description: 'List bills with filtering', auth: 'Required', permission: 'ap:bill:read' },
      { method: 'GET', path: '/api/v1/bills/:id', description: 'Get bill detail', auth: 'Required', permission: 'ap:bill:read' },
      { method: 'PUT', path: '/api/v1/bills/:id', description: 'Update draft bill', auth: 'Required', permission: 'ap:bill:update' },
      { method: 'POST', path: '/api/v1/bills/:id/post', description: 'Post bill (draft -> posted) (ผ่านใบแจ้งหนี้ซื้อ)', auth: 'Required', permission: 'ap:bill:approve' },
      { method: 'POST', path: '/api/v1/bills/:id/void', description: 'Void bill (ยกเลิกใบแจ้งหนี้ซื้อ)', auth: 'Required', permission: 'ap:bill:approve' },
    ],
  },
  {
    name: 'AP — Bill Payments (จ่ายชำระ)',
    endpoints: [
      { method: 'POST', path: '/api/v1/bill-payments', description: 'Record vendor payment — validates overpay (บันทึกจ่ายชำระ)', auth: 'Required', permission: 'ap:payment:create' },
      { method: 'GET', path: '/api/v1/bill-payments', description: 'List bill payments', auth: 'Required', permission: 'ap:payment:read' },
      { method: 'GET', path: '/api/v1/bill-payments/:id', description: 'Get bill payment detail', auth: 'Required', permission: 'ap:payment:read' },
    ],
  },
  {
    name: 'AP — Three-Way Match',
    endpoints: [
      { method: 'GET', path: '/api/v1/ap/bills/:id/match-status', description: '3-way match: PO vs GR vs Bill (ตรวจสอบ 3-way match)', auth: 'Required', permission: 'ap:bill:read' },
      { method: 'POST', path: '/api/v1/ap/bills/:id/match-override', description: 'Override match status (ข้ามการตรวจสอบ)', auth: 'Required', permission: 'ap:bill:approve' },
    ],
  },
  {
    name: 'Purchase Orders (ใบสั่งซื้อ)',
    endpoints: [
      { method: 'POST', path: '/api/v1/purchase-orders', description: 'Create PO in draft (สร้างใบสั่งซื้อ)', auth: 'Required', permission: 'ap:po:create' },
      { method: 'GET', path: '/api/v1/purchase-orders', description: 'List POs', auth: 'Required', permission: 'ap:po:read' },
      { method: 'GET', path: '/api/v1/purchase-orders/:id', description: 'Get PO detail', auth: 'Required', permission: 'ap:po:read' },
      { method: 'PUT', path: '/api/v1/purchase-orders/:id', description: 'Update draft PO', auth: 'Required', permission: 'ap:po:update' },
      { method: 'POST', path: '/api/v1/purchase-orders/:id/send', description: 'Send PO to vendor (draft -> sent) (ส่ง PO)', auth: 'Required', permission: 'ap:po:send' },
      { method: 'POST', path: '/api/v1/purchase-orders/:id/receive', description: 'Record goods received — partial OK (รับของ)', auth: 'Required', permission: 'ap:po:receive' },
      { method: 'POST', path: '/api/v1/purchase-orders/:id/convert-to-bill', description: 'Convert PO to AP bill (สร้างใบแจ้งหนี้จาก PO)', auth: 'Required', permission: 'ap:po:convert' },
      { method: 'POST', path: '/api/v1/purchase-orders/:id/cancel', description: 'Cancel PO (ยกเลิก PO)', auth: 'Required', permission: 'ap:po:send' },
    ],
  },
  {
    name: 'Purchase Requisitions (ใบขอซื้อ)',
    endpoints: [
      { method: 'POST', path: '/api/v1/purchase-requisitions', description: 'Create PR', auth: 'Required', permission: 'mm:pr:create' },
      { method: 'GET', path: '/api/v1/purchase-requisitions', description: 'List PRs', auth: 'Required', permission: 'mm:pr:read' },
      { method: 'GET', path: '/api/v1/purchase-requisitions/:id', description: 'Get PR detail', auth: 'Required', permission: 'mm:pr:read' },
      { method: 'PUT', path: '/api/v1/purchase-requisitions/:id', description: 'Update draft PR', auth: 'Required', permission: 'mm:pr:update' },
      { method: 'POST', path: '/api/v1/purchase-requisitions/:id/submit', description: 'Submit for approval (draft -> pending)', auth: 'Required', permission: 'mm:pr:create' },
      { method: 'POST', path: '/api/v1/purchase-requisitions/:id/approve', description: 'Approve PR (pending -> approved)', auth: 'Required', permission: 'mm:pr:approve' },
      { method: 'POST', path: '/api/v1/purchase-requisitions/:id/reject', description: 'Reject PR', auth: 'Required', permission: 'mm:pr:approve' },
      { method: 'POST', path: '/api/v1/purchase-requisitions/:id/convert-to-po', description: 'Convert approved PR to PO (สร้าง PO จากใบขอซื้อ)', auth: 'Required', permission: 'mm:pr:create' },
    ],
  },
  {
    name: 'RFQ — Request for Quotation (ใบขอราคา)',
    endpoints: [
      { method: 'POST', path: '/api/v1/rfqs', description: 'Create RFQ', auth: 'Required', permission: 'mm:rfq:create' },
      { method: 'GET', path: '/api/v1/rfqs', description: 'List RFQs', auth: 'Required', permission: 'mm:rfq:read' },
      { method: 'GET', path: '/api/v1/rfqs/:id', description: 'Get RFQ detail', auth: 'Required', permission: 'mm:rfq:read' },
      { method: 'POST', path: '/api/v1/rfqs/:id/send', description: 'Send to vendors (draft -> sent)', auth: 'Required', permission: 'mm:rfq:create' },
      { method: 'POST', path: '/api/v1/rfqs/:id/vendors', description: 'Add vendor response/quote', auth: 'Required', permission: 'mm:rfq:create' },
      { method: 'POST', path: '/api/v1/rfqs/:id/compare', description: 'Compare vendor responses (เปรียบเทียบราคา)', auth: 'Required', permission: 'mm:rfq:read' },
      { method: 'POST', path: '/api/v1/rfqs/:id/select-winner', description: 'Select winner & create PO (เลือกผู้ขาย)', auth: 'Required', permission: 'mm:rfq:create' },
    ],
  },
  {
    name: 'Vendor Returns (ส่งคืนผู้ขาย)',
    endpoints: [
      { method: 'POST', path: '/api/v1/vendor-returns', description: 'Create vendor return', auth: 'Required', permission: 'ap:vendor:read' },
      { method: 'GET', path: '/api/v1/vendor-returns', description: 'List vendor returns', auth: 'Required', permission: 'ap:vendor:read' },
      { method: 'GET', path: '/api/v1/vendor-returns/:id', description: 'Get vendor return detail', auth: 'Required', permission: 'ap:vendor:read' },
      { method: 'POST', path: '/api/v1/vendor-returns/:id/ship', description: 'Ship return — negative stock movements (ส่งคืน)', auth: 'Required', permission: 'inventory:movement:create' },
      { method: 'POST', path: '/api/v1/vendor-returns/:id/credit', description: 'Receive credit memo — negative AP bill', auth: 'Required', permission: 'ap:bill:create' },
    ],
  },
  {
    name: 'Contacts / CRM (รายชื่อ)',
    endpoints: [
      { method: 'POST', path: '/api/v1/contacts', description: 'Create contact (customer/vendor/both)', auth: 'Required', permission: 'crm:contact:create' },
      { method: 'GET', path: '/api/v1/contacts', description: 'List contacts with search', auth: 'Required', permission: 'crm:contact:read' },
      { method: 'GET', path: '/api/v1/contacts/:id', description: 'Get contact + AR/AP summary', auth: 'Required', permission: 'crm:contact:read' },
      { method: 'PUT', path: '/api/v1/contacts/:id', description: 'Update contact', auth: 'Required', permission: 'crm:contact:update' },
      { method: 'DELETE', path: '/api/v1/contacts/:id', description: 'Soft-delete contact', auth: 'Required', permission: 'crm:contact:delete' },
      { method: 'GET', path: '/api/v1/contacts/:id/transactions', description: 'List invoices & bills for contact', auth: 'Required', permission: 'crm:contact:read' },
      { method: 'GET', path: '/api/v1/contacts/:id/credit-exposure', description: 'Credit exposure vs limit (วงเงินเครดิต)', auth: 'Required', permission: 'crm:contact:read' },
      { method: 'POST', path: '/api/v1/credit/check', description: 'Credit check before SO — ok/warning/blocked', auth: 'Required', permission: 'ar:so:create' },
    ],
  },
  {
    name: 'Inventory — Products & Warehouses',
    endpoints: [
      { method: 'POST', path: '/api/v1/products', description: 'Create product (สร้างสินค้า)', auth: 'Required', permission: 'inventory:product:create' },
      { method: 'GET', path: '/api/v1/products', description: 'List products with search', auth: 'Required', permission: 'inventory:product:read' },
      { method: 'PUT', path: '/api/v1/products/:id', description: 'Update product', auth: 'Required', permission: 'inventory:product:update' },
      { method: 'POST', path: '/api/v1/warehouses', description: 'Create warehouse (สร้างคลัง)', auth: 'Required', permission: 'inventory:warehouse:create' },
      { method: 'GET', path: '/api/v1/warehouses', description: 'List warehouses', auth: 'Required', permission: 'inventory:warehouse:read' },
      { method: 'PUT', path: '/api/v1/warehouses/:id', description: 'Update warehouse', auth: 'Required', permission: 'inventory:warehouse:update' },
    ],
  },
  {
    name: 'Inventory — Stock Movements & Levels',
    endpoints: [
      { method: 'POST', path: '/api/v1/stock-movements', description: 'Record stock movement: receipt/issue/adjust/transfer (บันทึกสต็อก)', auth: 'Required', permission: 'inventory:movement:create' },
      { method: 'GET', path: '/api/v1/stock-movements', description: 'List stock movements', auth: 'Required', permission: 'inventory:movement:read' },
      { method: 'GET', path: '/api/v1/stock-levels', description: 'Current stock levels for all products (ระดับสต็อก)', auth: 'Required', permission: 'inventory:level:read' },
      { method: 'GET', path: '/api/v1/stock-levels/:productId', description: 'Stock for single product across warehouses', auth: 'Required', permission: 'inventory:level:read' },
      { method: 'GET', path: '/api/v1/inventory/valuation', description: 'Stock valuation — average cost method', auth: 'Required', permission: 'inventory:valuation:read' },
      { method: 'GET', path: '/api/v1/inventory/low-stock', description: 'Products below minimum level (แจ้งเตือนสต็อกต่ำ)', auth: 'Required', permission: 'inventory:level:read' },
    ],
  },
  {
    name: 'Stock Counts (ตรวจนับสต็อก)',
    endpoints: [
      { method: 'POST', path: '/api/v1/stock-counts', description: 'Create stock count session', auth: 'Required', permission: 'inventory:count:create' },
      { method: 'GET', path: '/api/v1/stock-counts', description: 'List stock counts', auth: 'Required', permission: 'inventory:count:read' },
      { method: 'GET', path: '/api/v1/stock-counts/:id', description: 'Get stock count detail', auth: 'Required', permission: 'inventory:count:read' },
      { method: 'POST', path: '/api/v1/stock-counts/:id/enter', description: 'Enter actual quantities', auth: 'Required', permission: 'inventory:count:create' },
      { method: 'POST', path: '/api/v1/stock-counts/:id/post', description: 'Post adjustments — creates JE for variance (ปรับยอดจริง)', auth: 'Required', permission: 'inventory:count:post' },
    ],
  },
  {
    name: 'Batches & Serial Numbers (ล็อต/ซีเรียล)',
    endpoints: [
      { method: 'POST', path: '/api/v1/batches', description: 'Create batch', auth: 'Required', permission: 'inventory:product:create' },
      { method: 'GET', path: '/api/v1/batches', description: 'List batches', auth: 'Required', permission: 'inventory:product:read' },
      { method: 'GET', path: '/api/v1/batches/:id', description: 'Batch detail with serial numbers', auth: 'Required', permission: 'inventory:product:read' },
      { method: 'POST', path: '/api/v1/serial-numbers', description: 'Create serial number', auth: 'Required', permission: 'inventory:product:create' },
      { method: 'GET', path: '/api/v1/serial-numbers', description: 'List serial numbers', auth: 'Required', permission: 'inventory:product:read' },
      { method: 'PUT', path: '/api/v1/serial-numbers/:id/status', description: 'Update serial number status', auth: 'Required', permission: 'inventory:product:create' },
      { method: 'GET', path: '/api/v1/inventory/trace/:batchId', description: 'Forward traceability — who received this batch (ตรวจสอบย้อนกลับ)', auth: 'Required', permission: 'inventory:movement:read' },
    ],
  },
  {
    name: 'HR — Departments & Employees',
    endpoints: [
      { method: 'POST', path: '/api/v1/departments', description: 'Create department', auth: 'Required', permission: 'hr:department:create' },
      { method: 'GET', path: '/api/v1/departments', description: 'List departments', auth: 'Required', permission: 'hr:department:read' },
      { method: 'PUT', path: '/api/v1/departments/:id', description: 'Update department', auth: 'Required', permission: 'hr:department:update' },
      { method: 'GET', path: '/api/v1/departments/tree', description: 'Organization hierarchy tree (แผนผังองค์กร)', auth: 'Required', permission: 'hr:department:read' },
      { method: 'POST', path: '/api/v1/employees', description: 'Create employee (สร้างพนักงาน)', auth: 'Required', permission: 'hr:employee:create' },
      { method: 'GET', path: '/api/v1/employees', description: 'List employees — PDPA masked', auth: 'Required', permission: 'hr:employee:read' },
      { method: 'GET', path: '/api/v1/employees/:id', description: 'Full employee detail (unmasked)', auth: 'Required', permission: 'hr:employee:read' },
      { method: 'PUT', path: '/api/v1/employees/:id', description: 'Update employee', auth: 'Required', permission: 'hr:employee:update' },
      { method: 'POST', path: '/api/v1/employees/:id/resign', description: 'Record resignation (active -> resigned)', auth: 'Required', permission: 'hr:employee:resign' },
      { method: 'POST', path: '/api/v1/employees/:id/anonymize', description: 'PDPA anonymization — replaces PII (ลบข้อมูล PDPA)', auth: 'Required', permission: 'hr:employee:anonymize' },
    ],
  },
  {
    name: 'Positions (ตำแหน่ง)',
    endpoints: [
      { method: 'POST', path: '/api/v1/positions', description: 'Create position', auth: 'Required', permission: 'hr:position:create' },
      { method: 'GET', path: '/api/v1/positions', description: 'List positions', auth: 'Required', permission: 'hr:position:read' },
      { method: 'GET', path: '/api/v1/positions/:id', description: 'Position detail with employees', auth: 'Required', permission: 'hr:position:read' },
      { method: 'PUT', path: '/api/v1/positions/:id', description: 'Update position', auth: 'Required', permission: 'hr:position:update' },
    ],
  },
  {
    name: 'Payroll (เงินเดือน)',
    endpoints: [
      { method: 'POST', path: '/api/v1/payroll', description: 'Create payroll run', auth: 'Required', permission: 'hr:payroll:create' },
      { method: 'GET', path: '/api/v1/payroll', description: 'List payroll runs', auth: 'Required', permission: 'hr:payroll:read' },
      { method: 'GET', path: '/api/v1/payroll/:id', description: 'Payroll run detail with items', auth: 'Required', permission: 'hr:payroll:read' },
      { method: 'POST', path: '/api/v1/payroll/:id/calculate', description: 'Auto-calculate — Thai SSC 5% + PIT brackets (คำนวณเงินเดือน)', auth: 'Required', permission: 'hr:payroll:calculate' },
      { method: 'POST', path: '/api/v1/payroll/:id/approve', description: 'Approve calculated payroll', auth: 'Required', permission: 'hr:payroll:approve' },
      { method: 'POST', path: '/api/v1/payroll/:id/pay', description: 'Mark as paid — auto JE (จ่ายเงินเดือน)', auth: 'Required', permission: 'hr:payroll:pay' },
      { method: 'GET', path: '/api/v1/payroll/:id/payslips', description: 'Individual payslips (สลิปเงินเดือน)', auth: 'Required', permission: 'hr:payroll:read' },
      { method: 'PUT', path: '/api/v1/payroll/:id/items/:itemId', description: 'Adjust individual payroll item', auth: 'Required', permission: 'hr:payroll:calculate' },
      { method: 'GET', path: '/api/v1/payroll/:id/bank-file', description: 'Bank transfer file — SCB CSV / KBank TXT', auth: 'Required', permission: 'hr:payroll:read' },
      { method: 'GET', path: '/api/v1/payroll/ytd-summary/:employeeId', description: 'YTD tax summary for employee', auth: 'Required', permission: 'hr:payroll:read' },
    ],
  },
  {
    name: 'Leave Management (การลา)',
    endpoints: [
      { method: 'POST', path: '/api/v1/leave-types', description: 'Create leave type', auth: 'Required', permission: 'hr:leave:type:create' },
      { method: 'GET', path: '/api/v1/leave-types', description: 'List leave types', auth: 'Required', permission: 'hr:leave:type:read' },
      { method: 'POST', path: '/api/v1/leave-requests', description: 'Submit leave request — validates balance (ขอลา)', auth: 'Required', permission: 'hr:leave:request:create' },
      { method: 'GET', path: '/api/v1/leave-requests', description: 'List leave requests', auth: 'Required', permission: 'hr:leave:request:read' },
      { method: 'GET', path: '/api/v1/leave-requests/:id', description: 'Get leave request detail', auth: 'Required', permission: 'hr:leave:request:read' },
      { method: 'POST', path: '/api/v1/leave-requests/:id/approve', description: 'Approve leave request', auth: 'Required', permission: 'hr:leave:request:approve' },
      { method: 'POST', path: '/api/v1/leave-requests/:id/reject', description: 'Reject leave request', auth: 'Required', permission: 'hr:leave:request:reject' },
      { method: 'GET', path: '/api/v1/leave-requests/balance/:employeeId', description: 'Remaining leave balance by type (วันลาคงเหลือ)', auth: 'Required', permission: 'hr:leave:request:read' },
      { method: 'GET', path: '/api/v1/leave-requests/accrual-balance/:employeeId', description: 'Accrual-based balance (probation + monthly)', auth: 'Required', permission: 'hr:leave:request:read' },
      { method: 'GET', path: '/api/v1/leave-requests/working-days', description: 'Calculate working days (exclude weekends/holidays)', auth: 'Required', permission: 'hr:leave:request:read' },
      { method: 'POST', path: '/api/v1/leave-accrual-rules', description: 'Create accrual rule', auth: 'Required', permission: 'hr:leave:type:create' },
      { method: 'GET', path: '/api/v1/leave-accrual-rules', description: 'List accrual rules', auth: 'Required', permission: 'hr:leave:type:read' },
      { method: 'POST', path: '/api/v1/public-holidays', description: 'Create public holiday', auth: 'Required', permission: 'hr:leave:type:create' },
      { method: 'GET', path: '/api/v1/public-holidays', description: 'List public holidays', auth: 'Required', permission: 'hr:leave:type:read' },
    ],
  },
  {
    name: 'Attendance (การลงเวลา)',
    endpoints: [
      { method: 'POST', path: '/api/v1/attendance/clock-in', description: 'Clock in — auto-detect late >09:00 (ลงเวลาเข้า)', auth: 'Required', permission: 'hr:attendance:create' },
      { method: 'POST', path: '/api/v1/attendance/clock-out', description: 'Clock out — auto-calc OT >8h (ลงเวลาออก)', auth: 'Required', permission: 'hr:attendance:create' },
      { method: 'GET', path: '/api/v1/attendance/daily/:employeeId', description: 'Daily attendance record', auth: 'Required', permission: 'hr:attendance:read' },
      { method: 'GET', path: '/api/v1/attendance/monthly/:employeeId', description: 'Monthly summary with aggregate stats', auth: 'Required', permission: 'hr:attendance:read' },
    ],
  },
  {
    name: 'Fixed Assets (สินทรัพย์ถาวร)',
    endpoints: [
      { method: 'POST', path: '/api/v1/fixed-assets', description: 'Register asset (ลงทะเบียนสินทรัพย์)', auth: 'Required', permission: 'fi:asset:create' },
      { method: 'GET', path: '/api/v1/fixed-assets', description: 'List fixed assets', auth: 'Required', permission: 'fi:asset:read' },
      { method: 'GET', path: '/api/v1/fixed-assets/:id', description: 'Get asset detail', auth: 'Required', permission: 'fi:asset:read' },
      { method: 'GET', path: '/api/v1/fixed-assets/report', description: 'Asset register report — totals by category (รายงานสินทรัพย์)', auth: 'Required', permission: 'fi:asset:read' },
      { method: 'PUT', path: '/api/v1/fixed-assets/:id', description: 'Update asset', auth: 'Required', permission: 'fi:asset:update' },
      { method: 'POST', path: '/api/v1/fixed-assets/:id/depreciate', description: 'Run monthly depreciation — creates JE (คิดค่าเสื่อมราคา)', auth: 'Required', permission: 'fi:asset:depreciate' },
      { method: 'POST', path: '/api/v1/fixed-assets/:id/dispose', description: 'Dispose/sell asset — gain/loss JE (จำหน่ายสินทรัพย์)', auth: 'Required', permission: 'fi:asset:dispose' },
    ],
  },
  {
    name: 'Bank Accounts & Reconciliation (ธนาคาร)',
    endpoints: [
      { method: 'POST', path: '/api/v1/bank-accounts', description: 'Create bank account', auth: 'Required', permission: 'fi:bank:create' },
      { method: 'GET', path: '/api/v1/bank-accounts', description: 'List bank accounts', auth: 'Required', permission: 'fi:bank:read' },
      { method: 'GET', path: '/api/v1/bank-accounts/:id', description: 'Bank account with recent transactions', auth: 'Required', permission: 'fi:bank:read' },
      { method: 'POST', path: '/api/v1/bank-accounts/:id/transactions', description: 'Add manual transaction', auth: 'Required', permission: 'fi:bank:create' },
      { method: 'POST', path: '/api/v1/bank-accounts/:id/import', description: 'Import CSV statement (multipart) (นำเข้า statement)', auth: 'Required', permission: 'fi:bank:import' },
      { method: 'GET', path: '/api/v1/bank-accounts/:id/reconciliation', description: 'Reconciliation report — unmatched items (รายการยังไม่กระทบยอด)', auth: 'Required', permission: 'fi:bank:read' },
      { method: 'POST', path: '/api/v1/bank-transactions/:id/reconcile', description: 'Match bank txn to JE (กระทบยอด)', auth: 'Required', permission: 'fi:bank:reconcile' },
    ],
  },
  {
    name: 'Bank Matching Rules (กฎจับคู่)',
    endpoints: [
      { method: 'POST', path: '/api/v1/bank-matching-rules', description: 'Create matching rule', auth: 'Required', permission: 'fi:bank:create' },
      { method: 'GET', path: '/api/v1/bank-matching-rules', description: 'List matching rules', auth: 'Required', permission: 'fi:bank:read' },
      { method: 'PUT', path: '/api/v1/bank-matching-rules/:id', description: 'Update matching rule', auth: 'Required', permission: 'fi:bank:create' },
      { method: 'DELETE', path: '/api/v1/bank-matching-rules/:id', description: 'Delete matching rule', auth: 'Required', permission: 'fi:bank:create' },
      { method: 'POST', path: '/api/v1/bank/:accountId/auto-reconcile', description: 'Auto-reconcile using rules (กระทบยอดอัตโนมัติ)', auth: 'Required', permission: 'fi:bank:reconcile' },
    ],
  },
  {
    name: 'WHT — Withholding Tax (หัก ณ ที่จ่าย)',
    endpoints: [
      { method: 'POST', path: '/api/v1/wht-certificates', description: 'Create WHT certificate PND3/PND53', auth: 'Required', permission: 'fi:wht:create' },
      { method: 'GET', path: '/api/v1/wht-certificates', description: 'List WHT certificates', auth: 'Required', permission: 'fi:wht:read' },
      { method: 'GET', path: '/api/v1/wht-certificates/summary', description: 'Monthly summary for filing (สรุปหัก ณ ที่จ่าย)', auth: 'Required', permission: 'fi:wht:read' },
      { method: 'GET', path: '/api/v1/wht-certificates/:id', description: 'Get certificate detail', auth: 'Required', permission: 'fi:wht:read' },
      { method: 'POST', path: '/api/v1/wht-certificates/:id/issue', description: 'Issue certificate (draft -> issued)', auth: 'Required', permission: 'fi:wht:issue' },
      { method: 'POST', path: '/api/v1/wht-certificates/:id/void', description: 'Void certificate', auth: 'Required', permission: 'fi:wht:void' },
      { method: 'POST', path: '/api/v1/wht-certificates/:id/file', description: 'Mark as filed with Revenue Dept (ยื่นแล้ว)', auth: 'Required', permission: 'fi:wht:file' },
      { method: 'POST', path: '/api/v1/wht/annual-certificate', description: 'Generate 50 ทวิ Annual Tax Certificate', auth: 'Required', permission: 'fi:wht:read' },
    ],
  },
  {
    name: 'Cost Centers (ศูนย์ต้นทุน)',
    endpoints: [
      { method: 'POST', path: '/api/v1/cost-centers', description: 'Create cost center', auth: 'Required', permission: 'co:cost-center:create' },
      { method: 'GET', path: '/api/v1/cost-centers', description: 'List cost centers', auth: 'Required', permission: 'co:cost-center:read' },
      { method: 'GET', path: '/api/v1/cost-centers/:id', description: 'Get cost center detail', auth: 'Required', permission: 'co:cost-center:read' },
      { method: 'PUT', path: '/api/v1/cost-centers/:id', description: 'Update cost center', auth: 'Required', permission: 'co:cost-center:update' },
      { method: 'GET', path: '/api/v1/cost-centers/:id/report', description: 'Cost report — JE lines by account', auth: 'Required', permission: 'co:cost-center:read' },
      { method: 'GET', path: '/api/v1/cost-centers/:id/budget-status', description: 'Budget utilization status (สถานะงบประมาณ)', auth: 'Required', permission: 'co:cost-center:read' },
      { method: 'POST', path: '/api/v1/cost-centers/budget-check', description: 'Pre-posting budget availability check', auth: 'Required', permission: 'co:cost-center:read' },
      { method: 'GET', path: '/api/v1/reports/budget-variance-detail', description: 'Budget variance analysis (วิเคราะห์ผลต่างงบประมาณ)', auth: 'Required', permission: 'co:cost-center:read' },
    ],
  },
  {
    name: 'Profit Centers (ศูนย์กำไร)',
    endpoints: [
      { method: 'POST', path: '/api/v1/profit-centers', description: 'Create profit center', auth: 'Required', permission: 'co:profit-center:create' },
      { method: 'GET', path: '/api/v1/profit-centers', description: 'List profit centers', auth: 'Required', permission: 'co:profit-center:read' },
      { method: 'GET', path: '/api/v1/profit-centers/:id', description: 'Get profit center detail', auth: 'Required', permission: 'co:profit-center:read' },
      { method: 'PUT', path: '/api/v1/profit-centers/:id', description: 'Update profit center', auth: 'Required', permission: 'co:profit-center:update' },
      { method: 'GET', path: '/api/v1/profit-centers/:id/report', description: 'P&L for profit center (งบกำไรขาดทุนศูนย์กำไร)', auth: 'Required', permission: 'co:profit-center:read' },
    ],
  },
  {
    name: 'Tax Rates (อัตราภาษี)',
    endpoints: [
      { method: 'GET', path: '/api/v1/tax-rates', description: 'List tax rates (VAT/WHT)', auth: 'Required' },
      { method: 'POST', path: '/api/v1/tax-rates', description: 'Create tax rate', auth: 'Required' },
      { method: 'PUT', path: '/api/v1/tax-rates/:id', description: 'Update tax rate', auth: 'Required' },
      { method: 'DELETE', path: '/api/v1/tax-rates/:id', description: 'Delete tax rate', auth: 'Required' },
    ],
  },
  {
    name: 'Pricing (ราคาสินค้า)',
    endpoints: [
      { method: 'POST', path: '/api/v1/price-lists', description: 'Create price list', auth: 'Required', permission: 'pricing:manage' },
      { method: 'GET', path: '/api/v1/price-lists', description: 'List price lists', auth: 'Required', permission: 'pricing:read' },
      { method: 'GET', path: '/api/v1/price-lists/:id', description: 'Price list detail with items', auth: 'Required', permission: 'pricing:read' },
      { method: 'PUT', path: '/api/v1/price-lists/:id', description: 'Update price list', auth: 'Required', permission: 'pricing:manage' },
      { method: 'DELETE', path: '/api/v1/price-lists/:id', description: 'Deactivate price list', auth: 'Required', permission: 'pricing:manage' },
      { method: 'POST', path: '/api/v1/price-lists/:id/items', description: 'Add item to price list', auth: 'Required', permission: 'pricing:manage' },
      { method: 'GET', path: '/api/v1/price-lists/:id/items', description: 'List price list items', auth: 'Required', permission: 'pricing:read' },
      { method: 'DELETE', path: '/api/v1/price-lists/:id/items/:itemId', description: 'Remove price list item', auth: 'Required', permission: 'pricing:manage' },
      { method: 'GET', path: '/api/v1/pricing/resolve', description: 'Resolve best price (cascade: customer -> list -> base) (หาราคาสินค้า)', auth: 'Required', permission: 'pricing:read' },
    ],
  },
  {
    name: 'Payment Terms (เงื่อนไขชำระ)',
    endpoints: [
      { method: 'POST', path: '/api/v1/payment-terms', description: 'Create payment term', auth: 'Required', permission: 'pricing:manage' },
      { method: 'POST', path: '/api/v1/payment-terms/seed', description: 'Seed defaults (NET30, NET60, COD, 2/10NET30)', auth: 'Required', permission: 'pricing:manage' },
      { method: 'GET', path: '/api/v1/payment-terms', description: 'List payment terms', auth: 'Required', permission: 'pricing:read' },
      { method: 'GET', path: '/api/v1/payment-terms/:id', description: 'Get payment term detail', auth: 'Required', permission: 'pricing:read' },
      { method: 'PUT', path: '/api/v1/payment-terms/:id', description: 'Update payment term', auth: 'Required', permission: 'pricing:manage' },
      { method: 'DELETE', path: '/api/v1/payment-terms/:id', description: 'Deactivate payment term', auth: 'Required', permission: 'pricing:manage' },
    ],
  },
  {
    name: 'Dunning (ติดตามหนี้)',
    endpoints: [
      { method: 'GET', path: '/api/v1/dunning/levels', description: 'List dunning levels', auth: 'Required', permission: 'ar:invoice:read' },
      { method: 'POST', path: '/api/v1/dunning/levels', description: 'Create/update dunning level (upsert)', auth: 'Required', permission: 'dunning:manage' },
      { method: 'POST', path: '/api/v1/dunning/run', description: 'Run dunning — find overdue invoices + assign levels (รันติดตามหนี้)', auth: 'Required', permission: 'dunning:manage' },
      { method: 'GET', path: '/api/v1/dunning/list', description: 'List all dunning cases', auth: 'Required', permission: 'ar:invoice:read' },
    ],
  },
  {
    name: 'Multi-Currency (หลายสกุลเงิน)',
    endpoints: [
      { method: 'POST', path: '/api/v1/currencies', description: 'Create currency', auth: 'Required', permission: 'fi:currency:create' },
      { method: 'GET', path: '/api/v1/currencies', description: 'List currencies', auth: 'Required', permission: 'fi:currency:read' },
      { method: 'PUT', path: '/api/v1/currencies/:id', description: 'Update currency', auth: 'Required', permission: 'fi:currency:update' },
      { method: 'POST', path: '/api/v1/exchange-rates', description: 'Add exchange rate (upsert)', auth: 'Required', permission: 'fi:currency:create' },
      { method: 'GET', path: '/api/v1/exchange-rates', description: 'List exchange rates', auth: 'Required', permission: 'fi:currency:read' },
      { method: 'GET', path: '/api/v1/exchange-rates/convert', description: 'Get rate for specific date', auth: 'Required', permission: 'fi:currency:read' },
      { method: 'POST', path: '/api/v1/gl/fx-revaluation', description: 'FX revaluation at month-end rate (ปรับมูลค่าอัตราแลกเปลี่ยน)', auth: 'Required', permission: 'gl:journal:create' },
    ],
  },
  {
    name: 'Multi-Company (หลายบริษัท)',
    endpoints: [
      { method: 'POST', path: '/api/v1/companies', description: 'Create company', auth: 'Required', permission: 'company:create' },
      { method: 'GET', path: '/api/v1/companies', description: 'List companies', auth: 'Required', permission: 'company:read' },
      { method: 'GET', path: '/api/v1/companies/:id', description: 'Get company detail', auth: 'Required', permission: 'company:read' },
      { method: 'PUT', path: '/api/v1/companies/:id', description: 'Update company', auth: 'Required', permission: 'company:update' },
      { method: 'POST', path: '/api/v1/companies/ic-transaction', description: 'Intercompany txn with auto mirror (รายการระหว่างบริษัท)', auth: 'Required', permission: 'gl:journal:create' },
      { method: 'GET', path: '/api/v1/reports/consolidated', description: 'Consolidated report with IC elimination (งบรวม)', auth: 'Required', permission: 'report:gl:read' },
    ],
  },
  {
    name: 'Approval Workflows (ระบบอนุมัติ)',
    endpoints: [
      { method: 'POST', path: '/api/v1/approval-workflows', description: 'Create approval workflow', auth: 'Required', permission: 'approval:workflow:create' },
      { method: 'GET', path: '/api/v1/approval-workflows', description: 'List approval workflows', auth: 'Required', permission: 'approval:workflow:read' },
      { method: 'POST', path: '/api/v1/approvals/submit', description: 'Submit document for approval', auth: 'Required', permission: 'approval:action' },
      { method: 'GET', path: '/api/v1/approvals', description: 'List approvals', auth: 'Required', permission: 'approval:workflow:read' },
      { method: 'GET', path: '/api/v1/approvals/:id', description: 'Approval detail with action history', auth: 'Required', permission: 'approval:workflow:read' },
      { method: 'POST', path: '/api/v1/approvals/:id/approve', description: 'Approve current step', auth: 'Required', permission: 'approval:action' },
      { method: 'POST', path: '/api/v1/approvals/:id/reject', description: 'Reject approval', auth: 'Required', permission: 'approval:action' },
      { method: 'POST', path: '/api/v1/approvals/:id/delegate', description: 'Delegate to another user (มอบหมาย)', auth: 'Required', permission: 'approval:action' },
    ],
  },
  {
    name: 'Reports (รายงาน)',
    endpoints: [
      { method: 'GET', path: '/api/v1/reports/balance-sheet', description: 'Balance Sheet (งบแสดงฐานะการเงิน)', auth: 'Required', permission: 'report:balance-sheet:read' },
      { method: 'GET', path: '/api/v1/reports/income-statement', description: 'Income Statement / P&L (งบกำไรขาดทุน)', auth: 'Required', permission: 'report:income-statement:read' },
      { method: 'GET', path: '/api/v1/reports/trial-balance', description: 'Trial Balance (งบทดลอง)', auth: 'Required', permission: 'report:trial-balance:read' },
      { method: 'GET', path: '/api/v1/reports/budget-variance', description: 'Budget vs Actual variance (วิเคราะห์ผลต่าง)', auth: 'Required', permission: 'report:gl:read' },
      { method: 'GET', path: '/api/v1/reports/equity-changes', description: 'Statement of Changes in Equity (งบส่วนของผู้ถือหุ้น)', auth: 'Required', permission: 'report:gl:read' },
      { method: 'GET', path: '/api/v1/reports/ar-aging', description: 'AR Aging by customer (รายงาน AR Aging)', auth: 'Required', permission: 'report:ar:read' },
      { method: 'GET', path: '/api/v1/reports/ap-aging', description: 'AP Aging by vendor (รายงาน AP Aging)', auth: 'Required', permission: 'report:ap:read' },
      { method: 'GET', path: '/api/v1/reports/pnl-comparison', description: 'P&L comparison — monthly/ytd/yoy/mom (เปรียบเทียบงบกำไร)', auth: 'Required', permission: 'report:pnl-comparison:read' },
      { method: 'GET', path: '/api/v1/reports/fixed-asset-register', description: 'Fixed asset register with depreciation', auth: 'Required', permission: 'report:gl:read' },
      { method: 'GET', path: '/api/v1/reports/low-stock', description: 'Low stock alert report', auth: 'Required', permission: 'report:gl:read' },
      { method: 'GET', path: '/api/v1/reports/stock-valuation', description: 'Stock valuation (average cost)', auth: 'Required', permission: 'report:gl:read' },
      { method: 'GET', path: '/api/v1/reports/wht-summary', description: 'WHT Certificate summary', auth: 'Required', permission: 'report:ap:read' },
      { method: 'GET', path: '/api/v1/reports/vat-return', description: 'Thai VAT Return (รายงานภาษีมูลค่าเพิ่ม)', auth: 'Required', permission: 'report:vat-return:read' },
      { method: 'GET', path: '/api/v1/reports/ssc-filing', description: 'SSC Monthly Filing (รายงานประกันสังคม)', auth: 'Required', permission: 'report:ssc-filing:read' },
      { method: 'GET', path: '/api/v1/reports/cash-flow', description: 'Cash Flow Statement — indirect method (งบกระแสเงินสด)', auth: 'Required', permission: 'report:gl:read' },
      { method: 'POST', path: '/api/v1/reports/custom', description: 'Save custom report definition', auth: 'Required', permission: 'report:gl:read' },
      { method: 'GET', path: '/api/v1/reports/custom', description: 'List saved custom reports', auth: 'Required', permission: 'report:gl:read' },
      { method: 'POST', path: '/api/v1/reports/custom/:id/run', description: 'Execute saved custom report', auth: 'Required', permission: 'report:gl:read' },
    ],
  },
  {
    name: 'Dashboard (แดชบอร์ด)',
    endpoints: [
      { method: 'GET', path: '/api/v1/dashboard/executive', description: 'Executive dashboard — revenue, expense, cash flow, AR aging', auth: 'Required', permission: 'report:gl:read' },
      { method: 'GET', path: '/api/v1/dashboard/consolidated', description: 'Cross-org consolidated overview (ภาพรวมทุกองค์กร)', auth: 'Required' },
      { method: 'GET', path: '/api/v1/dashboard/revenue-detail', description: 'Revenue drill-down — transaction level', auth: 'Required', permission: 'report:gl:read' },
      { method: 'GET', path: '/api/v1/dashboard/expense-detail', description: 'Expense drill-down — transaction level', auth: 'Required', permission: 'report:gl:read' },
      { method: 'GET', path: '/api/v1/dashboard/config', description: 'Role-based widget config (cfo/accountant/sales/hr)', auth: 'Required', permission: 'dashboard:config:read' },
    ],
  },
  {
    name: 'Month-End Close (ปิดงวด)',
    endpoints: [
      { method: 'POST', path: '/api/v1/month-end/close', description: 'Queue month-end close job (async)', auth: 'Required', permission: 'gl:period:close' },
      { method: 'GET', path: '/api/v1/month-end/:jobId', description: 'Check close job progress', auth: 'Required' },
    ],
  },
  {
    name: 'Import / Export (นำเข้า/ส่งออก)',
    endpoints: [
      { method: 'POST', path: '/api/v1/import', description: 'Upload CSV/XLSX and queue import (multipart)', auth: 'Required', permission: 'data:import' },
      { method: 'GET', path: '/api/v1/import/:jobId', description: 'Check import job progress', auth: 'Required', permission: 'data:import' },
      { method: 'POST', path: '/api/v1/import/preview', description: 'Preview first 5 rows with column mapping', auth: 'Required', permission: 'data:import' },
      { method: 'GET', path: '/api/v1/export/:type', description: 'Download data as CSV/Excel (Buddhist Era support)', auth: 'Required', permission: 'data:export' },
    ],
  },
  {
    name: 'Notifications (การแจ้งเตือน)',
    endpoints: [
      { method: 'GET', path: '/api/v1/notifications/settings', description: 'Get notification preferences', auth: 'Required' },
      { method: 'PUT', path: '/api/v1/notifications/settings', description: 'Update notification preferences (email, LINE)', auth: 'Required' },
      { method: 'GET', path: '/api/v1/notifications', description: 'Notification history', auth: 'Required' },
    ],
  },
  {
    name: 'Webhooks',
    endpoints: [
      { method: 'POST', path: '/api/v1/webhooks', description: 'Register webhook', auth: 'Required' },
      { method: 'GET', path: '/api/v1/webhooks', description: 'List webhooks', auth: 'Required' },
      { method: 'DELETE', path: '/api/v1/webhooks/:id', description: 'Delete webhook', auth: 'Required' },
    ],
  },
  {
    name: 'Roles — RBAC',
    endpoints: [
      { method: 'POST', path: '/api/v1/roles', description: 'Create custom role with permissions', auth: 'Required', permission: 'role:assign' },
      { method: 'GET', path: '/api/v1/roles', description: 'List all roles with permissions', auth: 'Required', permission: 'role:read' },
      { method: 'PUT', path: '/api/v1/roles/:id', description: 'Update role permissions', auth: 'Required', permission: 'role:assign' },
      { method: 'DELETE', path: '/api/v1/roles/:id', description: 'Delete custom role', auth: 'Required', permission: 'role:assign' },
    ],
  },
  {
    name: 'Audit Trail (บันทึกตรวจสอบ)',
    endpoints: [
      { method: 'GET', path: '/api/v1/audit-logs', description: 'Query audit trail with filters', auth: 'Required', permission: 'role:read' },
    ],
  },
  {
    name: 'PDPA Compliance',
    endpoints: [
      { method: 'POST', path: '/api/v1/pdpa/access-request', description: 'Data Access Request — export all PII (คำขอเข้าถึงข้อมูล)', auth: 'Required', permission: 'pdpa:manage' },
      { method: 'POST', path: '/api/v1/pdpa/erasure-request', description: 'Erasure Request — anonymize PII (คำขอลบข้อมูล)', auth: 'Required', permission: 'pdpa:manage' },
      { method: 'GET', path: '/api/v1/pdpa/requests', description: 'List PDPA data subject requests', auth: 'Required', permission: 'pdpa:manage' },
    ],
  },
  {
    name: 'Firm Management (สำนักงานบัญชี)',
    endpoints: [
      { method: 'POST', path: '/api/v1/firm/clients', description: 'Assign client organization to firm', auth: 'Required' },
      { method: 'GET', path: '/api/v1/firm/clients', description: 'List firm client organizations', auth: 'Required' },
      { method: 'DELETE', path: '/api/v1/firm/clients/:id', description: 'Unassign client (soft-delete)', auth: 'Required' },
    ],
  },
  {
    name: 'AI Agents (AI อัจฉริยะ)',
    endpoints: [
      { method: 'POST', path: '/api/v1/ai/anomaly-scan', description: 'Anomaly detection on journal entries (ตรวจจับความผิดปกติ)', auth: 'Required', permission: 'report:gl:read' },
      { method: 'GET', path: '/api/v1/ai/cash-forecast', description: 'Cash flow forecast from AR/AP aging (พยากรณ์กระแสเงินสด)', auth: 'Required', permission: 'report:gl:read' },
      { method: 'POST', path: '/api/v1/ai/categorize', description: 'Smart categorization of bank txn (จัดหมวดหมู่อัตโนมัติ)', auth: 'Required', permission: 'ai:categorize:execute' },
      { method: 'POST', path: '/api/v1/ai/bank-reconcile/:bankAccountId', description: 'Auto-reconcile bank vs JE (กระทบยอด AI)', auth: 'Required', permission: 'fi:bank:reconcile' },
      { method: 'POST', path: '/api/v1/ai/parse-document', description: 'NLP document parser — invoice/receipt (อ่านเอกสาร AI)', auth: 'Required', permission: 'ai:parse:execute' },
      { method: 'GET', path: '/api/v1/ai/predictions', description: 'Predictive analytics — revenue/expense forecast (พยากรณ์)', auth: 'Required', permission: 'report:gl:read' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
function MethodBadge({ method }: { method: string }) {
  return (
    <span className={`inline-block w-16 rounded px-2 py-0.5 text-center text-xs font-bold ${METHOD_COLORS[method] || ''}`}>
      {method}
    </span>
  );
}

function GroupSection({ group, filter }: { group: ApiGroup; filter: string }) {
  const [open, setOpen] = useState(true);
  const filtered = useMemo(() => {
    if (!filter) return group.endpoints;
    const q = filter.toLowerCase();
    return group.endpoints.filter(
      (e) =>
        e.path.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.method.toLowerCase().includes(q) ||
        (e.permission && e.permission.toLowerCase().includes(q)),
    );
  }, [group.endpoints, filter]);

  if (filtered.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-left font-semibold text-white hover:bg-slate-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
      >
        <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <span className="flex-1">{group.name}</span>
        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs dark:bg-gray-700">{filtered.length}</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="mt-1 overflow-x-auto rounded-lg border border-gray-400 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 border-b border-slate-300 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-900 dark:text-gray-300">Method</th>
                <th className="px-4 py-2 text-left font-medium text-gray-900 dark:text-gray-300">Endpoint</th>
                <th className="px-4 py-2 text-left font-medium text-gray-900 dark:text-gray-300">Description</th>
                <th className="px-4 py-2 text-left font-medium text-gray-900 dark:text-gray-300">Permission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300 dark:divide-gray-800">
              {filtered.map((ep) => (
                <tr key={`${ep.method}-${ep.path}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-2">
                    <MethodBadge method={ep.method} />
                  </td>
                  <td className="px-4 py-2">
                    <code className="font-mono text-xs text-black dark:text-white">{ep.path}</code>
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-950 dark:text-gray-200">{ep.description}</td>
                  <td className="px-4 py-2">
                    {ep.permission ? (
                      <code className="rounded bg-slate-100 border border-slate-300 px-1.5 py-0.5 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-400">
                        {ep.permission}
                      </code>
                    ) : (
                      <span className="text-xs text-gray-400">{ep.auth === 'None' ? 'Public' : '—'}</span>
                    )}
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
export default function ApiDocsPage() {
  const [search, setSearch] = useState('');

  const totalEndpoints = useMemo(() => API_GROUPS.reduce((sum, g) => sum + g.endpoints.length, 0), []);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-gray-400 p-4 lg:block dark:border-gray-700">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-900 dark:text-gray-400">
          Modules
        </p>
        <nav className="space-y-1">
          {API_GROUPS.map((g) => (
            <a
              key={g.name}
              href={`#api-${g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
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
          <span className="text-black dark:text-white">API Reference</span>
        </nav>

        <h1 className="text-3xl font-bold text-black dark:text-white">API Reference</h1>
        <p className="mt-2 text-gray-950 dark:text-gray-200">
          REST API ฉบับสมบูรณ์ — {totalEndpoints}+ Endpoints | Base URL: <code className="rounded bg-slate-100 border border-slate-300 px-1 dark:bg-gray-700">/api/v1</code> | Version 1.0.0
        </p>

        {/* API Info */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-gray-400 p-3 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-700">Auth</p>
            <p className="text-sm text-black dark:text-white">JWT Bearer Token</p>
            <p className="text-xs text-gray-600">Access: 1h | Refresh: 30d</p>
          </div>
          <div className="rounded-lg border border-gray-400 p-3 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-700">Rate Limit</p>
            <p className="text-sm text-black dark:text-white">300 req/min (prod)</p>
            <p className="text-xs text-gray-600">10,000 req/min (dev)</p>
          </div>
          <div className="rounded-lg border border-gray-400 p-3 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-700">Monetary Values</p>
            <p className="text-sm text-black dark:text-white">Satang (bigint/string)</p>
            <p className="text-xs text-gray-600">100 satang = 1 THB</p>
          </div>
          <div className="rounded-lg border border-gray-400 p-3 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-700">Error Format</p>
            <p className="text-sm text-black dark:text-white">RFC 7807</p>
            <p className="text-xs text-gray-600">Problem Details</p>
          </div>
        </div>

        {/* Method Legend */}
        <div className="mt-4 flex gap-3">
          {Object.entries(METHOD_COLORS).map(([method, color]) => (
            <span key={method} className={`rounded px-2 py-0.5 text-xs font-bold ${color}`}>
              {method}
            </span>
          ))}
        </div>

        {/* Search */}
        <div className="relative mt-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search endpoints... (e.g. invoice, POST, payroll, gl:journal, ใบแจ้งหนี้)"
            className="w-full rounded-lg border border-gray-400 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Endpoint Groups */}
        <div className="mt-6 space-y-4">
          {API_GROUPS.map((g) => (
            <div key={g.name} id={`api-${g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
              <GroupSection group={g} filter={search} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
