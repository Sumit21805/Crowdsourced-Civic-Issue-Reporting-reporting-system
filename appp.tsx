import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { UserDashboard } from '@/components/UserDashboard';
import { DepartmentDashboard } from '@/components/DepartmentDashboard';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const db = getDb();
  let reports: unknown[];

  if (session.role === 'department') {
    reports = db.prepare(`
      SELECT r.id, r.user_id, r.title, r.description, r.pin, r.status, r.created_at, r.updated_at, u.name as user_name, u.email as user_email
      FROM reports r
      JOIN users u ON u.id = r.user_id
      ORDER BY r.updated_at DESC
    `).all();
  } else {
    reports = db.prepare(`
      SELECT id, user_id, title, description, pin, status, created_at, updated_at
      FROM reports WHERE user_id = ? ORDER BY updated_at DESC
    `).all(session.userId);
  }

  if (session.role === 'department') {
    return <DepartmentDashboard reports={reports as DepartmentReport[]} />;
  }
  return <UserDashboard reports={reports as UserReport[]} />;
}

export interface UserReport {
  id: number;
  user_id: number;
  title: string;
  description: string;
  pin: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DepartmentReport {
  id: number;
  user_id: number;
  title: string;
  description: string;
  pin: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_name: string;
  user_email: string;
}