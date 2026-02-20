import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getDb, awardPoints, POINTS_FOR_VERIFIED } from '@/lib/db';

const validStatuses = ['open', 'in_progress', 'resolved', 'verified'] as const;

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const id = Number((await params).id);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: 'Invalid report ID' }, { status: 400 });
    }

    const body = await _req.json();
    const { status } = body as { status?: string };
    if (!status || !validStatuses.includes(status as typeof validStatuses[number])) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const db = getDb();
    const report = db.prepare('SELECT id, user_id, status FROM reports WHERE id = ?').get(id) as
      | { id: number; user_id: number; status: string }
      | undefined;

    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

    if (status === 'verified') {
      if (session.role !== 'user' || report.user_id !== session.userId) {
        return NextResponse.json({ error: 'Only the report author can verify' }, { status: 403 });
      }
      if (report.status !== 'resolved') {
        return NextResponse.json({ error: 'Report must be resolved before verification' }, { status: 400 });
      }
      db.prepare('UPDATE reports SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('verified', id);
      awardPoints(db, id);
      return NextResponse.json({ status: 'verified', pointsAwarded: POINTS_FOR_VERIFIED });
    }

    if (session.role === 'department') {
      if (status !== 'in_progress' && status !== 'resolved') {
        return NextResponse.json({ error: 'Department can only set in_progress or resolved' }, { status: 403 });
      }
      db.prepare('UPDATE reports SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
      return NextResponse.json({ status });
    }

    return NextResponse.json({ error: 'Only department can update to in_progress or resolved' }, { status: 403 });
  } catch (e) {
    if ((e as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}