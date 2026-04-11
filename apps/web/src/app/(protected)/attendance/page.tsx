'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FilterBar } from '@/components/ui/filter-bar';
import { SkeletonRow } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { showToast } from '@/components/ui/toast';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

interface AttendanceRecord {
  id: string;
  employeeCode: string;
  employeeName: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  hoursWorked: number | null;
  status: string;
}

interface AttendanceListResponse { items: AttendanceRecord[]; total: number; }

const STATUS_BADGE: Record<string, string> = {
  present: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  absent: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  late: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  leave: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
};

export default function AttendancePage(): React.JSX.Element {
  const tenantId = useAuthStore((s) => s.tenantId) ?? 'default';
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p['search'] = search;
    if (dateFilter) p['date'] = dateFilter;
    return p;
  }, [search, dateFilter]);

  const { data, isLoading, refetch } = useQuery<AttendanceListResponse>({
    queryKey: [tenantId, 'attendance', params],
    queryFn: () => api.get<AttendanceListResponse>('/attendance', params),
  });

  const handleClockIn = useCallback(async () => {
    try {
      await api.post('/attendance/clock-in');
      showToast.success('Clocked in successfully');
      refetch();
    } catch {
      showToast.error('Failed to clock in');
    }
  }, [refetch]);

  const handleClockOut = useCallback(async () => {
    try {
      await api.post('/attendance/clock-out');
      showToast.success('Clocked out successfully');
      refetch();
    } catch {
      showToast.error('Failed to clock out');
    }
  }, [refetch]);

  const items = data?.items ?? [];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Attendance</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Employee attendance records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleClockIn}>
            <LogIn className="h-4 w-4" />Clock In
          </Button>
          <Button variant="outline" onClick={handleClockOut}>
            <LogOut className="h-4 w-4" />Clock Out
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="text-sm text-[var(--color-muted-foreground)]">Date:</label>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        />
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or code..."
        resultCount={data?.total}
      />

      {isLoading ? (
        <SkeletonRow count={5} />
      ) : items.length === 0 ? (
        <EmptyState context="search-results" message="No attendance records found" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/50">
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Employee</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Date</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--color-muted-foreground)]">Clock In</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--color-muted-foreground)]">Clock Out</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--color-muted-foreground)]">Hours</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--color-muted-foreground)]">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((rec) => (
                <tr key={rec.id} className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-accent)]/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{rec.employeeName}</div>
                    <div className="text-xs text-[var(--color-muted-foreground)]">{rec.employeeCode}</div>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{rec.date}</td>
                  <td className="px-4 py-3 text-center font-mono text-xs">
                    {rec.clockIn ? <span className="flex items-center justify-center gap-1"><Clock className="h-3 w-3" />{rec.clockIn}</span> : '—'}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-xs">
                    {rec.clockOut ? <span className="flex items-center justify-center gap-1"><Clock className="h-3 w-3" />{rec.clockOut}</span> : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {rec.hoursWorked != null ? `${rec.hoursWorked.toFixed(1)}h` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[rec.status] ?? ''}`}>
                      {rec.status}
                    </span>
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
