import Link from 'next/link';
import { getDb } from '@/lib/db';

export default async function LeaderboardPage() {
  const db = getDb();
  const leaderboard = db.prepare(
    'SELECT id, name, email, points FROM users WHERE role = ? ORDER BY points DESC LIMIT 50'
  ).all('user') as { id: number; name: string; email: string; points: number }[];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-semibold text-emerald-400">
            Report Dashboard
          </Link>
          <Link href="/login" className="text-slate-400 hover:text-white text-sm">
            Log in
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Leaderboard</h1>
        <p className="text-slate-400 mb-8">Top users by points (earned by verifying resolved reports).</p>

        {leaderboard.length === 0 ? (
          <p className="text-slate-500">No users yet.</p>
        ) : (
          <div className="rounded-xl bg-slate-900/80 border border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/50">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">#</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Name</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Points</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((u, i) => (
                  <tr key={u.id} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/30">
                    <td className="py-3 px-4 text-slate-500">{i + 1}</td>
                    <td className="py-3 px-4 text-white font-medium">{u.name}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-emerald-400 font-semibold">{u.points}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}