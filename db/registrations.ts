import { env } from 'cloudflare:workers';

import { ensureActivityTable } from './activities';

export type ActivityRegistration = {
  id: number;
  activityId: number;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  createdAt: string;
};

export type ActivityRegistrationInput = {
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
};

function getD1() {
  if (!env.DB) {
    throw new Error('D1 binding `DB` is unavailable.');
  }
  return env.DB;
}

let initialization: Promise<void> | undefined;

async function ensureRegistrationTable() {
  await ensureActivityTable();
  if (!initialization) {
    const db = getD1();
    initialization = (async () => {
      await db.prepare(`CREATE TABLE IF NOT EXISTS activity_registrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          activity_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          phone TEXT NOT NULL,
          email TEXT,
          notes TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (activity_id) REFERENCES activity_submissions(id)
        )`).run();
      await db.prepare(
        'CREATE INDEX IF NOT EXISTS idx_activity_registrations_activity_id ON activity_registrations (activity_id)',
      ).run();
    })();
  }
  await initialization;
}

type RegistrationRow = {
  id: number;
  activity_id: number;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  created_at: string;
};

function mapRow(row: RegistrationRow): ActivityRegistration {
  return {
    id: row.id,
    activityId: row.activity_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export async function createRegistration(activityId: number, input: ActivityRegistrationInput) {
  await ensureRegistrationTable();
  const result = await getD1()
    .prepare(`INSERT INTO activity_registrations (activity_id, name, phone, email, notes)
      VALUES (?, ?, ?, ?, ?)`)
    .bind(activityId, input.name, input.phone, input.email, input.notes)
    .run();

  const id = Number(result.meta.last_row_id);
  const saved = await getD1()
    .prepare('SELECT id, activity_id, name, phone, email, notes, created_at FROM activity_registrations WHERE id = ?')
    .bind(id)
    .first<RegistrationRow>();

  if (!saved) throw new Error('Registration could not be read back.');
  return mapRow(saved);
}

export async function listRegistrations(activityId: number) {
  await ensureRegistrationTable();
  const result = await getD1()
    .prepare(`SELECT id, activity_id, name, phone, email, notes, created_at
      FROM activity_registrations
      WHERE activity_id = ?
      ORDER BY created_at DESC`)
    .bind(activityId)
    .all<RegistrationRow>();

  return (result.results ?? []).map(mapRow);
}

export async function countRegistrations(activityId: number) {
  await ensureRegistrationTable();
  const result = await getD1()
    .prepare('SELECT COUNT(*) AS total FROM activity_registrations WHERE activity_id = ?')
    .bind(activityId)
    .first<{ total: number }>();
  return Number(result?.total ?? 0);
}

export async function countRegistrationsByActivityIds(activityIds: number[]) {
  if (!activityIds.length) return new Map<number, number>();

  await ensureRegistrationTable();
  const placeholders = activityIds.map(() => '?').join(', ');
  const result = await getD1()
    .prepare(`SELECT activity_id, COUNT(*) AS total
      FROM activity_registrations
      WHERE activity_id IN (${placeholders})
      GROUP BY activity_id`)
    .bind(...activityIds)
    .all<{ activity_id: number; total: number }>();

  const counts = new Map<number, number>();
  for (const row of result.results ?? []) {
    counts.set(row.activity_id, Number(row.total));
  }
  return counts;
}
