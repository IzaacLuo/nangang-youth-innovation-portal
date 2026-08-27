import { env } from 'cloudflare:workers';

export type ActivitySubmission = {
  id: number;
  sessionNumber: string;
  youthProjectName: string;
  activityDate: string;
  publishDate: string;
  promotionCopy: string;
  imageUrl: string;
  needsDesign: boolean;
  registrationUrl: string | null;
  notes: string | null;
  createdAt: string;
};

export type ActivitySubmissionInput = Omit<ActivitySubmission, 'id' | 'createdAt'>;

let initialization: Promise<void> | undefined;

function getD1() {
  if (!env.DB) {
    throw new Error('D1 binding `DB` is unavailable.');
  }
  return env.DB;
}

async function ensureActivityTable() {
  if (!initialization) {
    const db = getD1();
    initialization = db
      .batch([
        db.prepare(`CREATE TABLE IF NOT EXISTS activity_submissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_number TEXT NOT NULL,
          youth_project_name TEXT NOT NULL,
          activity_date TEXT NOT NULL,
          publish_date TEXT NOT NULL,
          promotion_copy TEXT NOT NULL,
          image_url TEXT NOT NULL,
          needs_design INTEGER NOT NULL CHECK (needs_design IN (0, 1)),
          registration_url TEXT,
          notes TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`),
        db.prepare(`CREATE INDEX IF NOT EXISTS idx_activity_submissions_publish_date
          ON activity_submissions (publish_date)`),
        db.prepare('PRAGMA optimize'),
      ])
      .then(() => undefined);
  }
  await initialization;
}

type ActivityRow = {
  id: number;
  session_number: string;
  youth_project_name: string;
  activity_date: string;
  publish_date: string;
  promotion_copy: string;
  image_url: string;
  needs_design: number;
  registration_url: string | null;
  notes: string | null;
  created_at: string;
};

function mapRow(row: ActivityRow): ActivitySubmission {
  return {
    id: row.id,
    sessionNumber: row.session_number,
    youthProjectName: row.youth_project_name,
    activityDate: row.activity_date,
    publishDate: row.publish_date,
    promotionCopy: row.promotion_copy,
    imageUrl: row.image_url,
    needsDesign: row.needs_design === 1,
    registrationUrl: row.registration_url,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export async function listActivities() {
  await ensureActivityTable();
  const result = await getD1()
    .prepare(`SELECT id, session_number, youth_project_name, activity_date, publish_date,
      promotion_copy, image_url, needs_design, registration_url, notes, created_at
      FROM activity_submissions
      ORDER BY publish_date ASC, created_at DESC`)
    .all<ActivityRow>();

  return (result.results ?? []).map(mapRow);
}

export async function createActivity(input: ActivitySubmissionInput) {
  await ensureActivityTable();
  const result = await getD1()
    .prepare(`INSERT INTO activity_submissions (
      session_number, youth_project_name, activity_date, publish_date,
      promotion_copy, image_url, needs_design, registration_url, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      input.sessionNumber,
      input.youthProjectName,
      input.activityDate,
      input.publishDate,
      input.promotionCopy,
      input.imageUrl,
      input.needsDesign ? 1 : 0,
      input.registrationUrl,
      input.notes,
    )
    .run();

  const id = Number(result.meta.last_row_id);
  const saved = await getD1()
    .prepare(`SELECT id, session_number, youth_project_name, activity_date, publish_date,
      promotion_copy, image_url, needs_design, registration_url, notes, created_at
      FROM activity_submissions WHERE id = ?`)
    .bind(id)
    .first<ActivityRow>();

  if (!saved) throw new Error('Submitted activity could not be read back.');
  return mapRow(saved);
}
