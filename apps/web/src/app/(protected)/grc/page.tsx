'use client';

import { useMemo, useState } from 'react';
import { Eye, Plus, ShieldAlert, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useApi } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { FilterBar } from '@/components/ui/filter-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonRow } from '@/components/ui/skeleton';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SoDViolation {
  id: string;
  ruleCode: string;
  ruleName: string;
  userName: string;
  conflictingRoles: string[];
  riskLevel: string;
  detectedAt: string;
  status: string;
}

interface GRCResponse {
  items: SoDViolation[];
  total: number;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

const STATUS_OPTIONS = [
  { label: 'Open', value: 'open' },
  { label: 'Mitigated', value: 'mitigated' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Resolved', value: 'resolved' },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function GRCPage(): React.JSX.Element {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p['search'] = search;
    if (status) p['status'] = status;
    return p;
  }, [search, status]);

  const { data, loading } = useApi<GRCResponse>('/grc/violations', params);
  const violations = data?.items ?? [];
  const summary = data?.summary;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Governance, Risk & Compliance</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Segregation of Duties rules and violation monitoring</p>
        </div>
        <Link href="/grc/rules/new">
          <Button variant="primary"><Plus className="h-4 w-4" /> New Rule</Button>
        </Link>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Critical', count: summary.critical, color: 'text-red-600 bg-red-50 border-red-200' },
            { label: 'High', count: summary.high, color: 'text-orange-600 bg-orange-50 border-orange-200' },
            { label: 'Medium', count: summary.medium, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
            { label: 'Low', count: summary.low, color: 'text-green-600 bg-green-50 border-green-200' },
          ].map((s) => (
            <div key={s.label} className={`rounded-lg border p-4 ${s.color}`}>
              <p className="text-2xl font-bold">{s.count}</p>
              <p className="text-xs font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search violations..." statusOptions={STATUS_OPTIONS} statusValue={status} onStatusChange={setStatus} resultCount={data?.total} />

      {loading ? (
        <SkeletonRow count={5} />
      ) : violations.length === 0 ? (
        <EmptyState context="search-results" message="No SoD violations found" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <th className="px-4 py-3">Rule</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Conflicting Roles</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Detected</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {violations.map((v) => (
                <tr key={v.id} className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-accent)]/30">
                  <td className="px-4 py-3">
                    <div className="font-medium font-mono text-xs">{v.ruleCode}</div>
                    <div className="text-xs text-[var(--color-muted-foreground)]">{v.ruleName}</div>
                  </td>
                  <td className="px-4 py-3">{v.userName}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {v.conflictingRoles.map((r) => (
                        <span key={r} className="inline-flex rounded bg-[var(--color-accent)]/50 px-1.5 py-0.5 text-xs">{r}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${v.riskLevel === 'critical' ? 'bg-red-100 text-red-800' : v.riskLevel === 'high' ? 'bg-orange-100 text-orange-800' : v.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                      <ShieldAlert className="h-3 w-3" /> {v.riskLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{new Date(v.detectedAt).toLocaleDateString('th-TH')}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${v.status === 'resolved' ? 'bg-green-100 text-green-800' : v.status === 'mitigated' ? 'bg-blue-100 text-blue-800' : v.status === 'accepted' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/grc/violations/${v.id}`}><Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /> View</Button></Link>
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
