'use client';

import { useState } from 'react';
import { User, FileText, Calendar } from 'lucide-react';

import { useApi } from '@/lib/hooks';
import { SkeletonRow } from '@/components/ui/skeleton';
import { MoneyDisplay } from '@/components/domain/money-display';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ESSProfile {
  employeeId: string;
  name: string;
  position: string;
  department: string;
  email: string;
  hireDate: string;
  manager: string;
}

interface Payslip {
  id: string;
  period: string;
  grossSatang: number;
  netSatang: number;
  paidDate: string;
}

interface LeaveBalance {
  type: string;
  entitled: number;
  used: number;
  remaining: number;
}

interface ESSResponse {
  profile: ESSProfile;
  recentPayslips: Payslip[];
  leaveBalances: LeaveBalance[];
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ESSPage(): React.JSX.Element {
  const { data, loading } = useApi<ESSResponse>('/ess/dashboard');
  const [tab, setTab] = useState<'profile' | 'payslips' | 'leave'>('profile');

  const profile = data?.profile;
  const payslips = data?.recentPayslips ?? [];
  const leaves = data?.leaveBalances ?? [];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Employee Self-Service</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">View your profile, payslips, and leave balances</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 rounded-lg bg-[var(--color-accent)]/30 p-1">
        {([
          { key: 'profile' as const, label: 'Profile', icon: User },
          { key: 'payslips' as const, label: 'Payslips', icon: FileText },
          { key: 'leave' as const, label: 'Leave', icon: Calendar },
        ]).map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} type="button" onClick={() => setTab(t.key)} className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === t.key ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm' : 'text-[var(--color-muted-foreground)]'}`}>
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <SkeletonRow count={5} />
      ) : (
        <>
          {tab === 'profile' && profile && (
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: 'Employee ID', value: profile.employeeId },
                { label: 'Name', value: profile.name },
                { label: 'Position', value: profile.position },
                { label: 'Department', value: profile.department },
                { label: 'Email', value: profile.email },
                { label: 'Hire Date', value: new Date(profile.hireDate).toLocaleDateString('th-TH') },
                { label: 'Manager', value: profile.manager },
              ].map((f) => (
                <div key={f.label} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                  <p className="text-xs text-[var(--color-muted-foreground)]">{f.label}</p>
                  <p className="mt-1 font-medium text-[var(--color-foreground)]">{f.value}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'payslips' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3 text-right">Gross</th>
                    <th className="px-4 py-3 text-right">Net</th>
                    <th className="px-4 py-3">Paid Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.map((p) => (
                    <tr key={p.id} className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-accent)]/30">
                      <td className="px-4 py-3 font-medium">{p.period}</td>
                      <td className="px-4 py-3 text-right"><MoneyDisplay amount={BigInt(p.grossSatang)} /></td>
                      <td className="px-4 py-3 text-right font-medium"><MoneyDisplay amount={BigInt(p.netSatang)} /></td>
                      <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{new Date(p.paidDate).toLocaleDateString('th-TH')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'leave' && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {leaves.map((l) => (
                <div key={l.type} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                  <p className="text-sm font-medium text-[var(--color-foreground)]">{l.type}</p>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-bold text-[var(--color-foreground)]">{l.remaining}</p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">remaining</p>
                    </div>
                    <p className="text-xs text-[var(--color-muted-foreground)]">{l.used}/{l.entitled} used</p>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--color-accent)]/30">
                    <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${l.entitled > 0 ? (l.used / l.entitled) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
