'use client';

import { CreateReportForm } from './CreateReportForm';
import { ReportList } from './ReportList';
import type { UserReport } from '@/app/dashboard/page';

export function UserDashboard({ reports }: { reports: UserReport[] }) {
  return (
    <>
      <h1 className="text-2xl font-bold text-white mb-2">User dashboard</h1>
      <p className="text-slate-400 mb-6">Create a report with a 4-digit PIN. The department will be notified by email. When they mark it resolved, you can verify to earn points.</p>
      <CreateReportForm />
      <ReportList reports={reports} />
    </>
  );
}