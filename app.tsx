import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { SeedButton } from '@/components/SeedButton';

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect('/dashboard');
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-3xl font-bold text-emerald-400">Report Dashboard</h1>
      <p className="text-slate-400">Issue reports, track status, earn points.</p>
      <Link
        href="/login"
        className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition"
      >
        Log in
      </Link>
      <Link href="/leaderboard" className="text-slate-400 hover:text-emerald-400 text-sm">
        View leaderboard →
      </Link>
      <SeedButton />
    </div>
  );
}