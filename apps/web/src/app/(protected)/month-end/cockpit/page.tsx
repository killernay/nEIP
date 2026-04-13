'use client';

import { useCallback, useState } from 'react';
import { CheckCircle2, Circle, Clock, AlertTriangle, Play } from 'lucide-react';

import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { SkeletonRow } from '@/components/ui/skeleton';
import { showToast } from '@/components/ui/toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClosingTask {
  id: string;
  step: number;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  assignee: string;
  dueDate: string;
}

interface CockpitResponse {
  period: string;
  tasks: ClosingTask[];
  completedCount: number;
  totalCount: number;
}

const STATUS_ICON = {
  pending: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
  blocked: AlertTriangle,
};

const STATUS_COLOR = {
  pending: 'text-gray-400',
  in_progress: 'text-blue-500',
  completed: 'text-green-500',
  blocked: 'text-red-500',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MonthEndCockpitPage(): React.JSX.Element {
  const { data, loading, refetch } = useApi<CockpitResponse>('/month-end/cockpit');
  const tasks = data?.tasks ?? [];
  const [running, setRunning] = useState<string | null>(null);

  const handleRunTask = useCallback(async (task: ClosingTask) => {
    setRunning(task.id);
    try {
      await api.post(`/month-end/tasks/${task.id}/execute`);
      showToast.success(`${task.name} completed`);
      refetch();
    } catch {
      showToast.error(`Failed to run ${task.name}`);
    } finally {
      setRunning(null);
    }
  }, [refetch]);

  const progress = data ? Math.round((data.completedCount / data.totalCount) * 100) : 0;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Month-End Closing Cockpit</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Period: {data?.period ?? '—'} — {data?.completedCount ?? 0}/{data?.totalCount ?? 0} tasks completed
        </p>
      </div>

      {/* Progress bar */}
      <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--color-accent)]/30">
        <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${progress}%` }} />
      </div>

      {loading ? (
        <SkeletonRow count={8} />
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const Icon = STATUS_ICON[task.status];
            return (
              <div key={task.id} className="flex items-center gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent)]/30 text-sm font-medium">
                  {task.step}
                </span>
                <Icon className={`h-5 w-5 ${STATUS_COLOR[task.status]}`} />
                <div className="flex-1">
                  <p className="font-medium text-[var(--color-foreground)]">{task.name}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">{task.description}</p>
                </div>
                <span className="text-xs text-[var(--color-muted-foreground)]">{task.assignee}</span>
                <span className="text-xs text-[var(--color-muted-foreground)]">{task.dueDate}</span>
                {task.status === 'pending' && (
                  <Button variant="ghost" size="sm" onClick={() => handleRunTask(task)} disabled={running === task.id}>
                    <Play className="h-3.5 w-3.5" /> Run
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
