import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare(
      'SELECT id, name, email, points FROM users WHERE role = ? ORDER BY points DESC LIMIT 50'
    ).all('user') as { id: number; name: string; email: string; points: number }[];
    return NextResponse.json({ leaderboard: rows });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}