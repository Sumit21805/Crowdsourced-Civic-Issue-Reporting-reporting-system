'use client';

import { useRouter } from 'next/navigation';
import type { UserReport } from '@/app/dashboard/page';

export function ReportList({ reports }: { reports: UserReport[] }) {
  const router = useRouter();

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/reports/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  };

  if (reports.length === 0) {
    return <p className="text-slate-500">No reports yet. Create one above.</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Your reports</h2>
      {reports.map((r) => (
        <div
          key={r.id}
          className="rounded-xl bg-slate-900/80 border border-slate-700 p-4 flex flex-wrap items-start justify-between gap-4"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-white">#{r.id} {r.title}</span>
              <StatusBadge status={r.status} />
            </div>
            <p className="text-slate-400 text-sm mt-1">{r.description}</p>
            <p className="text-slate-500 text-xs mt-2">PIN: **** · Updated {new Date(r.updated_at).toLocaleString()}</p>
          </div>
          {r.status === 'resolved' && (
            <button
              onClick={() => updateStatus(r.id, 'verified')}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"
            >
              Mark verified (earn points)
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: 'bg-amber-500/20 text-amber-400',
    in_progress: 'bg-blue-500/20 text-blue-400',
    resolved: 'bg-emerald-500/20 text-emerald-400',
    verified: 'bg-slate-500/20 text-slate-300',
  };
  const label = status.replace('_', ' ');
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] || 'bg-slate-500/20'}`}>
      {label}
    </span>
  );
}