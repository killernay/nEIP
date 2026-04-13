'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpDown,
  BarChart3,
  BookOpen,
  BoxIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ClipboardCheck,
  FileCheck,
  FileText,
  LayoutDashboard,
  Landmark,
  MinusCircle,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Truck,
  CreditCard,
  Users,
  UserCircle,
  Warehouse,
  Building2,
  Calendar,
  PieChart,
  UserSquare2,
  BookUser,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/cn';
import { useSidebarStore } from '@/stores/sidebar-store';
import { useAuthStore } from '@/stores/auth-store';
import { useModuleAccess } from '@/hooks/use-module-access';
import { TenantSwitcher } from '@/components/tenant-switcher';
import type { Organization } from '@/components/tenant-switcher';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NavSubItem {
  label: string;
  labelTh?: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface NavGroup {
  id: string;
  label: string;
  labelTh?: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavSubItem[];
}

interface StandaloneNavItem {
  id: string;
  label: string;
  labelTh?: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

// ---------------------------------------------------------------------------
// Navigation structure
// ---------------------------------------------------------------------------

const standaloneTopItems: StandaloneNavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
];

const navGroups: NavGroup[] = [
  {
    id: 'sales',
    label: 'Sales',
    labelTh: 'ขาย',
    icon: ShoppingCart,
    items: [
      { label: 'Quotations', labelTh: 'ใบเสนอราคา', href: '/quotations', icon: FileCheck },
      { label: 'Sales Orders', labelTh: 'ใบสั่งขาย', href: '/sales-orders', icon: ShoppingCart },
      { label: 'Delivery Notes', labelTh: 'ใบส่งของ', href: '/delivery-notes', icon: Truck },
      { label: 'Invoices', labelTh: 'ใบแจ้งหนี้', href: '/invoices', icon: FileText },
      { label: 'Payments', labelTh: 'รับชำระ', href: '/payments', icon: CreditCard },
      { label: 'Receipts', labelTh: 'ใบเสร็จ', href: '/receipts', icon: Receipt },
      { label: 'Credit Notes', labelTh: 'ใบลดหนี้', href: '/credit-notes', icon: MinusCircle },
    ],
  },
  {
    id: 'purchasing',
    label: 'Purchasing',
    labelTh: 'จัดซื้อ',
    icon: Package,
    items: [
      { label: 'Purchase Orders', labelTh: 'ใบสั่งซื้อ', href: '/purchase-orders', icon: Package },
      { label: 'Bills', labelTh: 'บิล', href: '/bills', icon: FileText },
      { label: 'Bill Payments', labelTh: 'จ่ายเจ้าหนี้', href: '/bill-payments', icon: CreditCard },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    labelTh: 'คลังสินค้า',
    icon: BoxIcon,
    items: [
      { label: 'Products', labelTh: 'สินค้า', href: '/products', icon: Package },
      { label: 'Warehouses', labelTh: 'คลัง', href: '/warehouses', icon: Warehouse },
      { label: 'Stock Levels', labelTh: 'สต็อก', href: '/inventory', icon: BoxIcon },
    ],
  },
  {
    id: 'accounting',
    label: 'Accounting',
    labelTh: 'บัญชี',
    icon: BookOpen,
    items: [
      { label: 'Chart of Accounts', labelTh: 'ผังบัญชี', href: '/accounts', icon: BookOpen },
      { label: 'Journal Entries', labelTh: 'สมุดรายวัน', href: '/journal-entries', icon: FileText },
      { label: 'Budgets', labelTh: 'งบประมาณ', href: '/budgets', icon: PieChart },
      { label: 'Month-End', labelTh: 'ปิดบัญชี', href: '/month-end', icon: Calendar },
      { label: 'Fixed Assets', labelTh: 'สินทรัพย์ถาวร', href: '/fixed-assets', icon: TrendingDown },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    labelTh: 'การเงิน',
    icon: Landmark,
    items: [
      { label: 'Bank', labelTh: 'ธนาคาร', href: '/bank', icon: Landmark },
      { label: 'Tax Rates', labelTh: 'ภาษี', href: '/tax-rates', icon: FileText },
      { label: 'WHT', labelTh: 'ใบหัก ณ ที่จ่าย', href: '/wht', icon: Wallet },
      { label: 'Cost Centers', labelTh: 'ศูนย์ต้นทุน', href: '/cost-centers', icon: PieChart },
    ],
  },
  {
    id: 'hr',
    label: 'HR',
    labelTh: 'บุคคล',
    icon: Users,
    items: [
      { label: 'Employees', labelTh: 'พนักงาน', href: '/employees', icon: UserSquare2 },
      { label: 'Departments', labelTh: 'แผนก', href: '/departments', icon: Building2 },
      { label: 'Payroll', labelTh: 'เงินเดือน', href: '/payroll', icon: CreditCard },
      { label: 'Leave', labelTh: 'ลางาน', href: '/leave', icon: Calendar },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    labelTh: 'รายงาน',
    icon: BarChart3,
    items: [
      { label: 'Trial Balance', labelTh: 'งบทดลอง', href: '/reports/trial-balance', icon: BarChart3 },
      { label: 'Profit & Loss', labelTh: 'งบกำไรขาดทุน', href: '/reports/profit-loss', icon: TrendingDown },
      { label: 'Balance Sheet', labelTh: 'งบดุล', href: '/reports/balance-sheet', icon: BookOpen },
      { label: 'P&L Comparison', href: '/reports/pl-comparison', icon: BarChart3 },
      { label: 'All Reports', labelTh: 'อื่นๆ', href: '/reports', icon: BarChart3 },
    ],
  },
  {
    id: 'crm',
    label: 'CRM',
    icon: UserCircle,
    items: [
      { label: 'Contacts', labelTh: 'ลูกค้า/ผู้ขาย', href: '/contacts', icon: BookUser },
      { label: 'Vendors', labelTh: 'ผู้ขาย', href: '/vendors', icon: Building2 },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    labelTh: 'ตั้งค่า',
    icon: Settings,
    items: [
      { label: 'Organization', labelTh: 'องค์กร', href: '/settings/organization', icon: Building2 },
      { label: 'Team', labelTh: 'ทีม', href: '/settings/team', icon: Users },
      { label: 'AI Config', href: '/settings/ai', icon: Settings },
      { label: 'Fiscal Year', labelTh: 'ปีงบ', href: '/settings/fiscal-year', icon: Calendar },
      { label: 'Roles', href: '/settings/roles', icon: UserCircle },
      { label: 'Webhooks', href: '/settings/webhooks', icon: ArrowUpDown },
      { label: 'Audit Log', href: '/settings/audit-log', icon: FileText },
    ],
  },
];

const standaloneBottomItems: StandaloneNavItem[] = [
  {
    id: 'import-export',
    label: 'Import / Export',
    labelTh: 'Import/Export',
    href: '/import',
    icon: ArrowUpDown,
  },
  {
    id: 'approvals',
    label: 'Approvals',
    labelTh: 'อนุมัติ',
    href: '/approvals',
    icon: ClipboardCheck,
  },
];

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

interface TooltipProps {
  label: string;
  children: React.ReactNode;
  show: boolean;
  /** Position the tooltip flyout relative to the trigger. */
  side?: 'right';
}

function Tooltip({ label, children, show }: TooltipProps): React.JSX.Element {
  if (!show) {
    return <>{children}</>;
  }
  return (
    <div className="group/tooltip relative">
      {children}
      <div
        role="tooltip"
        className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-100 opacity-0 shadow-lg transition-opacity group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100"
      >
        {label}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Flyout (collapsed mode — group hover panel)
// ---------------------------------------------------------------------------

interface FlyoutMenuProps {
  group: NavGroup;
  /** Currently active pathname */
  pathname: string;
}

function FlyoutMenu({ group, pathname }: FlyoutMenuProps): React.JSX.Element {
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const Icon = group.icon;

  const groupLabel = group.labelTh
    ? `${group.labelTh} (${group.label})`
    : group.label;

  const isGroupActive = group.items.some(
    (item) =>
      pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {/* Collapsed icon trigger */}
      <button
        type="button"
        aria-label={groupLabel}
        aria-expanded={visible}
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-md transition-colors mx-auto',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400',
          isGroupActive
            ? 'bg-primary/20 text-primary'
            : 'text-slate-400 hover:bg-slate-800 hover:text-white',
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* Flyout panel */}
      {visible && (
        <div
          role="menu"
          aria-label={groupLabel}
          className={cn(
            'absolute left-full top-0 z-50 ml-2 w-56 overflow-hidden rounded-md',
            'border border-slate-700 bg-slate-900 shadow-xl',
          )}
        >
          {/* Group header in flyout */}
          <div className="border-b border-slate-700 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {groupLabel}
            </p>
          </div>

          <ul className="py-1" role="list">
            {group.items.map((item) => {
              const SubIcon = item.icon;
              const isActive =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    role="menuitem"
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-slate-700 font-medium text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                    )}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => setVisible(false)}
                  >
                    <SubIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="flex-1 truncate">
                      {item.labelTh ?? item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// NavGroup (expanded sidebar)
// ---------------------------------------------------------------------------

interface NavGroupProps {
  group: NavGroup;
  collapsed: boolean;
}

function NavGroupSection({ group, collapsed }: NavGroupProps): React.JSX.Element {
  const pathname = usePathname();
  const { openGroups, toggleGroup, openGroup } = useSidebarStore();
  const Icon = group.icon;

  const isOpen = openGroups[group.id] ?? false;

  const isGroupActive = group.items.some(
    (item) =>
      pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  // Stable refs so the effect can read current values without re-subscribing
  const openGroupRef = useRef(openGroup);
  openGroupRef.current = openGroup;
  const openGroupsRef = useRef(openGroups);
  openGroupsRef.current = openGroups;
  const groupIdRef = useRef(group.id);
  groupIdRef.current = group.id;

  // Auto-open group when a child route becomes active.
  // Reading through refs keeps pathname as the sole reactive dependency.
  useEffect(() => {
    const active = group.items.some(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    );
    if (active && !openGroupsRef.current[groupIdRef.current]) {
      openGroupRef.current(groupIdRef.current);
    }
  }, [pathname, group.items]);

  if (collapsed) {
    return <FlyoutMenu group={group} pathname={pathname} />;
  }

  const groupLabel = group.labelTh
    ? `${group.labelTh} (${group.label})`
    : group.label;

  return (
    <li className="list-none">
      {/* Group header button */}
      <button
        type="button"
        onClick={() => toggleGroup(group.id)}
        aria-expanded={isOpen}
        aria-controls={`group-${group.id}`}
        className={cn(
          'group flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-semibold transition-colors',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400',
          isGroupActive && !isOpen
            ? 'text-white'
            : 'text-slate-300 hover:bg-slate-800 hover:text-white',
        )}
      >
        <Icon
          className={cn(
            'h-4 w-4 shrink-0 transition-colors',
            isGroupActive ? 'text-primary' : 'text-slate-400 group-hover:text-slate-200',
          )}
          aria-hidden="true"
        />
        <span className="flex-1 truncate text-left leading-snug">
          {group.labelTh && (
            <span className="block text-[13px] font-semibold leading-tight">
              {group.labelTh}
            </span>
          )}
          <span
            className={cn(
              'block leading-tight',
              group.labelTh ? 'text-[10px] font-normal text-slate-500' : 'text-[13px]',
            )}
          >
            {group.label}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      {/* Collapsible sub-items */}
      <div
        id={`group-${group.id}`}
        role="region"
        aria-label={groupLabel}
        className={cn(
          'overflow-hidden transition-all duration-200 ease-in-out',
          isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        {/* SAP Fiori-style left border rail */}
        <ul role="list" className="relative ml-3.5 mt-0.5 mb-1 border-l border-slate-700 pl-2">
          {group.items.map((item) => {
            const SubIcon = item.icon;
            const isActive =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'group/sub flex min-h-[38px] w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400',
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <SubIcon
                    className={cn(
                      'h-3.5 w-3.5 shrink-0',
                      isActive
                        ? 'text-white'
                        : 'text-slate-500 group-hover/sub:text-slate-300',
                    )}
                    aria-hidden="true"
                  />
                  <span className="flex-1 truncate leading-snug">
                    {item.labelTh && (
                      <span className="block text-[12px] font-medium leading-tight">
                        {item.labelTh}
                      </span>
                    )}
                    <span
                      className={cn(
                        'block leading-tight',
                        item.labelTh
                          ? 'text-[10px] opacity-70'
                          : 'text-[13px]',
                      )}
                    >
                      {item.label}
                    </span>
                  </span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      aria-label={`${item.badge} pending`}
                      className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white"
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Standalone nav link (Dashboard, Import/Export, Approvals)
// ---------------------------------------------------------------------------

interface StandaloneNavLinkProps {
  item: StandaloneNavItem;
  collapsed: boolean;
}

function StandaloneNavLink({
  item,
  collapsed,
}: StandaloneNavLinkProps): React.JSX.Element {
  const pathname = usePathname();
  const isActive =
    item.href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  const displayLabel = item.labelTh
    ? `${item.labelTh} (${item.label})`
    : item.label;

  return (
    <Tooltip label={displayLabel} show={collapsed}>
      <Link
        href={item.href}
        className={cn(
          'group flex min-h-[40px] w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400',
          isActive
            ? 'bg-primary text-white'
            : 'text-slate-300 hover:bg-slate-800 hover:text-white',
          collapsed && 'justify-center px-2',
        )}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon
          className={cn(
            'h-5 w-5 shrink-0',
            isActive ? 'text-white' : 'text-slate-400 group-hover:text-white',
          )}
          aria-hidden="true"
        />
        {!collapsed && (
          <span className="flex-1 truncate leading-snug">
            {item.labelTh && (
              <span className="block text-[13px] font-semibold leading-tight">
                {item.labelTh}
              </span>
            )}
            <span
              className={cn(
                'block leading-tight',
                item.labelTh ? 'text-[10px] opacity-70' : 'text-[13px]',
              )}
            >
              {item.label}
            </span>
          </span>
        )}
        {!collapsed && item.badge !== undefined && item.badge > 0 && (
          <span
            aria-label={`${item.badge} pending`}
            className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white"
          >
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
      </Link>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// UserMenu
// ---------------------------------------------------------------------------

interface UserMenuProps {
  collapsed: boolean;
}

function UserMenu({ collapsed }: UserMenuProps): React.JSX.Element {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const displayName = user?.name ?? user?.email?.split('@')[0] ?? 'User';
  const displayEmail = user?.email ?? '';
  const initials =
    displayName
      .split(' ')
      .map((n) => n[0] ?? '')
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

  return (
    <Tooltip label={displayName} show={collapsed}>
      <button
        type="button"
        onClick={logout}
        className={cn(
          'group flex min-h-[44px] w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors',
          'hover:bg-slate-800 hover:text-white',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400',
          collapsed && 'justify-center px-2',
        )}
        aria-label="User menu / Sign out"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
          {initials}
        </span>
        {!collapsed && (
          <span className="flex-1 truncate text-left">
            <span className="block truncate text-sm font-medium text-white">
              {displayName}
            </span>
            <span className="block truncate text-xs text-slate-400">
              {displayEmail}
            </span>
          </span>
        )}
      </button>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// Sidebar root
// ---------------------------------------------------------------------------

export function Sidebar(): React.JSX.Element {
  const { collapsed, toggle } = useSidebarStore();
  const user = useAuthStore((s) => s.user);
  const tenantId = useAuthStore((s) => s.tenantId);
  const { isPageAllowed } = useModuleAccess();

  const userOrgs: Organization[] = tenantId
    ? [
        {
          id: tenantId,
          name: user?.orgName || user?.name || 'My Org',
          role: user?.role || 'owner',
        },
      ]
    : [];

  // Filter nav groups: remove items the user's role cannot access
  const filteredNavGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => isPageAllowed(item.href)),
    }))
    .filter((group) => group.items.length > 0);

  // Filter standalone items
  const filteredTopItems = standaloneTopItems.filter((item) => isPageAllowed(item.href));
  const filteredBottomItems = standaloneBottomItems.filter((item) => isPageAllowed(item.href));

  return (
    <aside
      aria-label="Main navigation"
      className={cn(
        'relative flex h-screen shrink-0 flex-col bg-slate-900 transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Top section — logo */}
      <div
        className={cn(
          'flex shrink-0 items-center gap-3 border-b border-slate-800 px-4 py-4',
          collapsed && 'justify-center px-2',
        )}
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-white"
          aria-label="nEIP logo"
        >
          nE
        </span>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">nEIP</p>
            <p className="truncate text-xs text-slate-400">
              {user?.orgName || user?.name || 'nEIP'}
            </p>
          </div>
        )}
      </div>

      {/* Tenant switcher */}
      <div className="shrink-0 border-b border-slate-800 px-2 py-2">
        <TenantSwitcher organizations={userOrgs} collapsed={collapsed} />
      </div>

      {/* Main nav — scrollable */}
      <nav
        aria-label="Module navigation"
        className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3"
      >
        {/* Standalone top items (Dashboard) */}
        <ul role="list" className="flex flex-col gap-0.5">
          {filteredTopItems.map((item) => (
            <li key={item.id}>
              <StandaloneNavLink item={item} collapsed={collapsed} />
            </li>
          ))}
        </ul>

        {/* Divider */}
        {!collapsed && (
          <div className="my-2 border-t border-slate-800" aria-hidden="true" />
        )}

        {/* Grouped sections */}
        {collapsed ? (
          /* Collapsed: icon row with flyouts */
          <div className="mt-2 flex flex-col items-center gap-0.5">
            {filteredNavGroups.map((group) => (
              <NavGroupSection key={group.id} group={group} collapsed={true} />
            ))}
          </div>
        ) : (
          <ul role="list" className="flex flex-col gap-0.5">
            {filteredNavGroups.map((group) => (
              <NavGroupSection key={group.id} group={group} collapsed={false} />
            ))}
          </ul>
        )}

        {/* Divider */}
        {!collapsed && (
          <div className="my-2 border-t border-slate-800" aria-hidden="true" />
        )}

        {/* Standalone bottom items (Import/Export, Approvals) */}
        <ul role="list" className="flex flex-col gap-0.5">
          {filteredBottomItems.map((item) => (
            <li key={item.id}>
              <StandaloneNavLink item={item} collapsed={collapsed} />
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer — user menu */}
      <div className="shrink-0 border-t border-slate-800 px-2 py-3">
        <UserMenu collapsed={collapsed} />
      </div>

      {/* Collapse toggle */}
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!collapsed}
        className={cn(
          'absolute -right-3 top-[4.5rem] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-400 shadow-md',
          'transition-colors hover:bg-slate-800 hover:text-white',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400',
        )}
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </button>
    </aside>
  );
}
