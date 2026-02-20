import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production' && req.headers.get('x-seed-secret') !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = [
    { email: 'department@example.com', password: 'dept123', role: 'department' as const, name: 'Support Department' },
    { email: 'user@example.com', password: 'user123', role: 'user' as const, name: 'Jane Doe' },
  ];

  const db = getDb();
  const created: string[] = [];
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    try {
      db.prepare('INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, ?, ?)').run(u.email, hash, u.role, u.name);
      created.push(u.email);
    } catch (e: unknown) {
      if ((e as { code?: string }).code !== 'SQLITE_CONSTRAINT') throw e;
    }
  }

  return NextResponse.json({
    ok: true,
    message: 'Seed done. Login: department@example.com / dept123 (department), user@example.com / user123 (user)',
    created,
  });
}