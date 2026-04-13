'use client';

import { useMemo, useState } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { useApi } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { SkeletonRow } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Shift {
  id: string;
  employeeName: string;
  shiftType: string;
  date: string;
  startTime: string;
  endTime: string;
  department: string;
  status: string;
}

interface ShiftResponse {
  items: Shift[];
  total: number;
  weekStart: string;
  weekEnd: string;
}

const SHIFT_COLORS: Record<string, string> = {
  morning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  afternoon: 'bg-blue-100 text-blue-800 border-blue-200',
  night: 'bg-purple-100 text-purple-800 border-purple-200',
  day: 'bg-green-100 text-green-800 border-green-200',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ShiftsPage(): React.JSX.Element {
  const [weekOffset, setWeekOffset] = useState(0);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (weekOffset !== 0) p['weekOffset'] = String(weekOffset);
    return p;
  }, [weekOffset]);

  const { data, loading } = useApi<ShiftResponse>('/shifts/schedule', params);
  const shifts = data?.items ?? [];

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Group shifts by employee
  const employees = [...new Set(shifts.map((s) => s.employeeName))];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Shift Scheduling</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Week: {data?.weekStart ?? '—'} to {data?.weekEnd ?? '—'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setWeekOffset((w) => w - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>Today</Button>
          <Button variant="ghost" size="sm" onClick={() => setWeekOffset((w) => w + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Link href="/shifts/new">
            <Button variant="primary"><Plus className="h-4 w-4" /> Assign Shift</Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <SkeletonRow count={8} />
      ) : employees.length === 0 ? (
        <EmptyState context="search-results" message="No shifts scheduled for this week" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <th className="px-4 py-3 min-w-[150px]">Employee</th>
                {days.map((d) => (
                  <th key={d} className="px-2 py-3 text-center min-w-[100px]">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const empShifts = shifts.filter((s) => s.employeeName === emp);
                return (
                  <tr key={emp} className="border-b border-[var(--color-border)]">
                    <td className="px-4 py-3 font-medium">{emp}</td>
                    {days.map((_, di) => {
                      const dayShift = empShifts.find((s) => new Date(s.date).getDay() === (di + 1) % 7);
                      return (
                        <td key={di} className="px-2 py-2 text-center">
                          {dayShift ? (
                            <div className={`rounded-md border px-2 py-1 text-xs font-medium ${SHIFT_COLORS[dayShift.shiftType] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                              {dayShift.startTime}–{dayShift.endTime}
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--color-muted-foreground)]">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
