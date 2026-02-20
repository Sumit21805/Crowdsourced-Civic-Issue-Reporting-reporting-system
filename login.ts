import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { createToken } from '@/lib/auth';

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(['user', 'department']),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, role } = bodySchema.parse(body);

    const db = getDb();
    const row = db.prepare(
      'SELECT id, email, password_hash, role, name FROM users WHERE email = ? AND role = ?'
    ).get(email, role) as { id: number; email: string; password_hash: string; role: string; name: string } | undefined;

    if (!row || !(await bcrypt.compare(password, row.password_hash))) {
      return NextResponse.json({ error: 'Invalid email, password, or role' }, { status: 401 });
    }

    const token = createToken({
      userId: row.id,
      email: row.email,
      role: row.role as 'user' | 'department',
      name: row.name,
    });

    const res = NextResponse.json({ ok: true, name: row.name, role: row.role });
    res.cookies.set('token', token, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 7, sameSite: 'lax' });
    return res;
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}