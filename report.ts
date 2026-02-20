import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sendReportToDepartment } from '@/lib/email';

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  pin: z.string().length(4).regex(/^\d{4}$/, 'PIN must be 4 digits'),
});

export async function GET() {
  try {
    const session = await requireSession();
    const db = getDb();

    if (session.role === 'department') {
      const reports = db.prepare(`
        SELECT r.id, r.user_id, r.title, r.description, r.pin, r.status, r.created_at, r.updated_at, u.name as user_name, u.email as user_email
        FROM reports r
        JOIN users u ON u.id = r.user_id
        ORDER BY r.updated_at DESC
      `).all();
      return NextResponse.json({ reports });
    }

    const reports = db.prepare(`
      SELECT id, user_id, title, description, pin, status, created_at, updated_at
      FROM reports WHERE user_id = ? ORDER BY updated_at DESC
    `).all(session.userId);
    return NextResponse.json({ reports });
  } catch (e) {
    if ((e as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (session.role !== 'user') {
      return NextResponse.json({ error: 'Only users can create reports' }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, pin } = createSchema.parse(body);

    const db = getDb();
    const result = db.prepare(
      'INSERT INTO reports (user_id, title, description, pin, status) VALUES (?, ?, ?, ?, ?)'
    ).run(session.userId, title, description, pin, 'open');

    const reportId = result.lastInsertRowid as number;

    const departmentEmail = process.env.DEPARTMENT_EMAIL || 'department@example.com';
    await sendReportToDepartment({
      to: departmentEmail,
      reportId,
      title,
      description,
      pin,
      userName: session.name,
    });

    return NextResponse.json({ id: reportId, status: 'open' });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    if ((e as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
  }
}