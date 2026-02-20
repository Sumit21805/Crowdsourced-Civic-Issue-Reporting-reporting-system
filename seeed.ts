import bcrypt from 'bcryptjs';
import { getDb } from '../lib/db';

const users = [
  { email: 'department@example.com', password: 'dept123', role: 'department' as const, name: 'Support Department' },
  { email: 'user@example.com', password: 'user123', role: 'user' as const, name: 'Jane Doe' },
];

async function main() {
  const db = getDb();
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    try {
      db.prepare(
        'INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, ?, ?)'
      ).run(u.email, hash, u.role, u.name);
      console.log('Created:', u.role, u.email);
    } catch (e: unknown) {
      if ((e as { code?: string }).code === 'SQLITE_CONSTRAINT') {
        console.log('Exists:', u.email);
      } else throw e;
    }
  }
  console.log('Seed done. Login: department@example.com / dept123 (department), user@example.com / user123 (user)');
}

main();