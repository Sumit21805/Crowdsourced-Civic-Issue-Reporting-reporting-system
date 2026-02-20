import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { LogoutButton } from '@/components/LogoutButton';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect('/login?from=/dashboard');

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-semibold text-emerald-400">
              Dashboard
            </Link>
            <Link href="/leaderboard" className="text-slate-400 hover:text-white text-sm">
              Leaderboard
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm">
              {session.name} <span className="text-emerald-500">({session.role})</span>
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}