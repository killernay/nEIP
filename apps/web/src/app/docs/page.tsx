'use client';

import Link from 'next/link';
import {
  BookOpen,
  Settings,
  Brain,
  GitBranch,
  Terminal,
  Cpu,
  Globe,
} from 'lucide-react';

import { cn } from '@/lib/cn';

// ---------------------------------------------------------------------------
// Doc card data
// ---------------------------------------------------------------------------

interface DocCard {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  titleEn: string;
  description: string;
  readTime: string;
}

const docCards: DocCard[] = [
  {
    href: '/docs/finance',
    icon: BookOpen,
    title: 'คู่มือการเงิน',
    titleEn: 'Finance Manual',
    description:
      'ผังบัญชี, สมุดรายวัน, ภาษีมูลค่าเพิ่ม, หัก ณ ที่จ่าย, ปิดบัญชีรายเดือน, สินทรัพย์ถาวร, งบประมาณ',
    readTime: '25 min',
  },
  {
    href: '/docs/operations',
    icon: Settings,
    title: 'คู่มือปฏิบัติการ',
    titleEn: 'Operations Manual',
    description:
      'วงจรขาย, วงจรจัดซื้อ, คลังสินค้า, CRM, HR & Payroll, Approval Workflow',
    readTime: '30 min',
  },
  {
    href: '/docs/enterprise',
    icon: Brain,
    title: 'คู่มือองค์กร & AI',
    titleEn: 'Enterprise & AI Manual',
    description:
      'Multi-tenancy, RBAC, Audit Log, AI Anomaly Detection, AI Forecasting, Webhooks',
    readTime: '20 min',
  },
  {
    href: '/docs/training',
    icon: GitBranch,
    title: 'คู่มือฝึกอบรม',
    titleEn: 'Training Guide — Data Flow',
    description:
      'ขั้นตอนการทำงานจริง เช่น Quote-to-Cash, Procure-to-Pay, Record-to-Report',
    readTime: '15 min',
  },
  {
    href: '/docs/cli-reference',
    icon: Terminal,
    title: 'คู่มือ CLI',
    titleEn: 'CLI Reference',
    description: 'คำสั่ง CLI ทั้ง 89 คำสั่ง แบ่งตามโมดูล พร้อมตัวอย่างการใช้งาน',
    readTime: '20 min',
  },
  {
    href: '/docs/mcp-reference',
    icon: Cpu,
    title: 'คู่มือ MCP Tools',
    titleEn: 'MCP Reference',
    description: 'MCP Tools ทั้ง 110 ตัว สำหรับ AI Agent — parameters, responses, examples',
    readTime: '25 min',
  },
  {
    href: '/docs/api-reference',
    icon: Globe,
    title: 'คู่มือ API',
    titleEn: 'API Reference',
    description: 'REST API endpoints ทั้งหมด — authentication, request/response, error codes',
    readTime: '20 min',
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DocsHubPage(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-black dark:text-white">
          คู่มือการใช้งาน
        </h1>
        <p className="mt-1 text-sm text-gray-900 dark:text-gray-200">
          Documentation — nEIP ERP System
        </p>
        <p className="mt-2 text-base text-gray-800 dark:text-gray-300">
          เอกสารคู่มือทั้งหมดสำหรับระบบ nEIP ERP ครอบคลุมตั้งแต่การเงิน
          ปฏิบัติการ จนถึง API Reference
        </p>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {docCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className={cn(
                'group flex flex-col rounded-lg border-2 border-gray-300 bg-white p-5 shadow-md transition-all dark:border-gray-600 dark:bg-card',
                'hover:border-primary/40 hover:shadow-lg',
              )}
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold text-black dark:text-white">
                    {card.title}
                  </h2>
                  <p className="truncate text-sm font-medium text-blue-700 dark:text-blue-400">
                    {card.titleEn}
                  </p>
                </div>
              </div>
              <p className="mb-4 flex-1 text-sm leading-relaxed text-gray-800 dark:text-gray-300">
                {card.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {card.readTime} read
                </span>
                <span className="text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Read more →
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
