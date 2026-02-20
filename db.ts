import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), 'data');
const usersPath = path.join(dataDir, 'users.json');
const reportsPath = path.join(dataDir, 'reports.json');

interface User {
  id: number;
  email: string;
  password_hash: string;
  role: 'user' | 'department';
  name: string;
  points: number;
  created_at: string;
}

interface Report {
  id: number;
  user_id: number;
  title: string;
  description: string;
  pin: string;
  status: 'open' | 'in_progress' | 'resolved' | 'verified';
  created_at: string;
  updated_at: string;
}

class Database {
  private users: User[] = [];
  private reports: Report[] = [];
  private usersNextId = 1;
  private reportsNextId = 1;

  constructor() {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.load();
  }

  private load() {
    if (fs.existsSync(usersPath)) {
      try {
        const data = fs.readFileSync(usersPath, 'utf-8');
        this.users = JSON.parse(data);
        this.usersNextId = Math.max(0, ...this.users.map(u => u.id)) + 1;
      } catch {
        this.users = [];
      }
    }
    if (fs.existsSync(reportsPath)) {
      try {
        const data = fs.readFileSync(reportsPath, 'utf-8');
        this.reports = JSON.parse(data);
        this.reportsNextId = Math.max(0, ...this.reports.map(r => r.id)) + 1;
      } catch {
        this.reports = [];
      }
    }
  }

  private save() {
    fs.writeFileSync(usersPath, JSON.stringify(this.users, null, 2));
    fs.writeFileSync(reportsPath, JSON.stringify(this.reports, null, 2));
  }

  prepare(query: string) {
    const queryLower = query.toLowerCase().trim();
    
    return {
      get: (...args: unknown[]) => {
        // SELECT from users
        if (queryLower.includes('select') && queryLower.includes('from users')) {
          if (queryLower.includes('where email = ?') && queryLower.includes('role = ?')) {
            const email = args[0] as string;
            const role = args[1] as string;
            return this.users.find(u => u.email === email && u.role === role) || undefined;
          }
          if (queryLower.includes('where id = ?')) {
            const id = args[0] as number;
            return this.users.find(u => u.id === id) || undefined;
          }
          return this.users[0];
        }
        
        // SELECT from reports
        if (queryLower.includes('select') && queryLower.includes('from reports')) {
          if (queryLower.includes('where id = ?')) {
            const id = args[0] as number;
            return this.reports.find(r => r.id === id) || undefined;
          }
          if (queryLower.includes('where user_id = ?')) {
            const userId = args[0] as number;
            return this.reports.find(r => r.user_id === userId) || undefined;
          }
          return this.reports[0];
        }
        
        return undefined;
      },
      
      all: (...args: unknown[]) => {
        // SELECT from users
        if (queryLower.includes('select') && queryLower.includes('from users')) {
          if (queryLower.includes('where role = ?')) {
            const role = args[0] as string;
            let result = this.users.filter(u => u.role === role);
            if (queryLower.includes('order by points desc')) {
              result = result.sort((a, b) => b.points - a.points);
            }
            return result;
          }
          return this.users;
        }
        
        // SELECT from reports with JOIN
        if (queryLower.includes('select') && queryLower.includes('from reports') && queryLower.includes('join users')) {
          let result = this.reports.map(r => {
            const user = this.users.find(u => u.id === r.user_id);
            return {
              id: r.id,
              user_id: r.user_id,
              title: r.title,
              description: r.description,
              pin: r.pin,
              status: r.status,
              created_at: r.created_at,
              updated_at: r.updated_at,
              user_name: user?.name || '',
              user_email: user?.email || '',
            };
          });
          
          if (queryLower.includes('order by')) {
            if (queryLower.includes('updated_at desc')) {
              result = result.sort((a, b) => 
                new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
              );
            }
          }
          
          return result;
        }
        
        // SELECT from reports without JOIN
        if (queryLower.includes('select') && queryLower.includes('from reports')) {
          let result: Report[];
          
          if (queryLower.includes('where user_id = ?')) {
            const userId = args[0] as number;
            result = this.reports.filter(r => r.user_id === userId);
          } else {
            result = [...this.reports];
          }
          
          if (queryLower.includes('order by')) {
            if (queryLower.includes('updated_at desc')) {
              result = result.sort((a, b) => 
                new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
              );
            }
          }
          
          return result;
        }
        
        return [];
      },
      
      run: (...args: unknown[]) => {
        // INSERT INTO users
        if (queryLower.includes('insert into users')) {
          const now = new Date().toISOString();
          const user: User = {
            id: this.usersNextId++,
            email: args[0] as string,
            password_hash: args[1] as string,
            role: args[2] as 'user' | 'department',
            name: args[3] as string,
            points: 0,
            created_at: now,
          };
          
          // Check for duplicate email
          if (this.users.some(u => u.email === user.email)) {
            throw new Error('UNIQUE constraint failed: users.email');
          }
          
          this.users.push(user);
          this.save();
          return { lastInsertRowid: user.id };
        }
        
        // INSERT INTO reports
        if (queryLower.includes('insert into reports')) {
          const now = new Date().toISOString();
          const report: Report = {
            id: this.reportsNextId++,
            user_id: args[0] as number,
            title: args[1] as string,
            description: args[2] as string,
            pin: args[3] as string,
            status: (args[4] || 'open') as Report['status'],
            created_at: now,
            updated_at: now,
          };
          this.reports.push(report);
          this.save();
          return { lastInsertRowid: report.id };
        }
        
        // UPDATE users SET points
        if (queryLower.includes('update users') && queryLower.includes('set points')) {
          const points = args[0] as number;
          const userId = args[1] as number;
          const user = this.users.find(u => u.id === userId);
          if (user) {
            user.points += points;
            this.save();
          }
          return {};
        }
        
        // UPDATE reports SET status
        if (queryLower.includes('update reports') && queryLower.includes('set status')) {
          const status = args[0] as Report['status'];
          const id = args[args.length - 1] as number;
          const report = this.reports.find(r => r.id === id);
          if (report) {
            report.status = status;
            report.updated_at = new Date().toISOString();
            this.save();
          }
          return {};
        }
        
        return {};
      },
    };
  }

  exec(_query: string) {
    // Schema initialization handled in constructor/load
  }

  pragma(_mode: string) {
    // No-op for JSON database
  }
}

let dbInstance: Database | null = null;

export function getDb() {
  if (!dbInstance) {
    dbInstance = new Database();
  }
  return dbInstance;
}

const POINTS_PER_VERIFIED = 10;

export function awardPoints(db: ReturnType<typeof getDb>, reportId: number) {
  const report = db.prepare('SELECT user_id FROM reports WHERE id = ?').get(reportId) as { user_id: number } | undefined;
  if (!report) return;
  db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(POINTS_PER_VERIFIED, report.user_id);
}

export const POINTS_FOR_VERIFIED = POINTS_PER_VERIFIED;
