'use client';

import './_docs-override.css';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Brain,
  ChevronDown,
  Cpu,
  GitBranch,
  Globe,
  Menu,
  Settings,
  Terminal,
  X,
} from 'lucide-react';

import { cn } from '@/lib/cn';

// ---------------------------------------------------------------------------
// Sidebar navigation structure
// ---------------------------------------------------------------------------

interface DocNavItem {
  href: string;
  label: string;
  labelEn: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface DocNavGroup {
  id: string;
  label: string;
  items: DocNavItem[];
}

const navGroups: DocNavGroup[] = [
  {
    id: 'manuals',
    label: 'User Manuals',
    items: [
      {
        href: '/docs/finance',
        label: 'คู่มือการเงิน',
        labelEn: 'Finance',
        icon: BookOpen,
      },
      {
        href: '/docs/operations',
        label: 'คู่มือปฏิบัติการ',
        labelEn: 'Operations',
        icon: Settings,
      },
      {
        href: '/docs/enterprise',
        label: 'องค์กร & AI',
        labelEn: 'Enterprise & AI',
        icon: Brain,
      },
    ],
  },
  {
    id: 'guides',
    label: 'Training Guides',
    items: [
      {
        href: '/docs/training',
        label: 'Data Flow',
        labelEn: 'Training Guide',
        icon: GitBranch,
      },
    ],
  },
  {
    id: 'reference',
    label: 'Reference',
    items: [
      {
        href: '/docs/cli-reference',
        label: 'CLI Reference',
        labelEn: '89 Commands',
        icon: Terminal,
      },
      {
        href: '/docs/mcp-reference',
        label: 'MCP Reference',
        labelEn: '110 Tools',
        icon: Cpu,
      },
      {
        href: '/docs/api-reference',
        label: 'API Reference',
        labelEn: 'REST API',
        icon: Globe,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Sidebar group
// ---------------------------------------------------------------------------

function SidebarGroup({
  group,
  pathname,
  onNavigate,
}: {
  group: DocNavGroup;
  pathname: string;
  onNavigate?: () => void;
}): React.JSX.Element {
  const [open, setOpen] = useState<boolean>(true);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-900 hover:text-black dark:text-gray-300 dark:hover:text-white transition-colors"
        aria-expanded={open}
      >
        <span>{group.label}</span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 transition-transform duration-200',
            open && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          open ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <ul className="flex flex-col gap-0.5 pb-2">
          {group.items.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  {...(onNavigate ? { onClick: () => onNavigate() } : {})}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-blue-100 font-semibold text-blue-900 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'text-gray-800 hover:bg-gray-200 hover:text-black dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="flex-1 truncate leading-snug">
                    <span className="block text-[13px]">{item.label}</span>
                    <span className="block text-[10px] opacity-60">
                      {item.labelEn}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

interface DocsLayoutProps {
  children: React.ReactNode;
}

export default function DocsLayout({
  children,
}: DocsLayoutProps): React.JSX.Element {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isHubPage = pathname === '/docs';

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="border-b border-border px-4 py-4">
        <Link
          href="/docs"
          className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
        >
          คู่มือการใช้งาน
        </Link>
        <p className="text-xs text-muted-foreground">Documentation</p>
      </div>

      {/* Nav groups */}
      <nav aria-label="Documentation navigation" className="flex-1 overflow-y-auto px-2 py-3">
        <div className="flex flex-col gap-1">
          {navGroups.map((group) => (
            <SidebarGroup
              key={group.id}
              group={group}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </div>
      </nav>
    </>
  );

  return (
    <div className="docs-content flex min-h-0 flex-1">
      {/* Desktop sidebar — hidden on hub page and below lg */}
      {!isHubPage && (
        <aside
          aria-label="Docs sidebar"
          className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-border lg:bg-card"
        >
          {sidebarContent}
        </aside>
      )}

      {/* Mobile sidebar overlay */}
      {!isHubPage && mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          {/* Panel */}
          <aside className="relative flex h-full w-72 flex-col bg-card shadow-xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:text-foreground"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {/* Mobile hamburger bar */}
        {!isHubPage && (
          <div className="flex items-center gap-2 border-b border-border px-4 py-2 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Open docs navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium text-foreground">Docs</span>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
