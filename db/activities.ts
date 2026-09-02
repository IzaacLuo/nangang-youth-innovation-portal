import { env } from 'cloudflare:workers';

import { generateActivitySlug, buildPublicActivityPath } from '../lib/slug';
import { ensureTables } from './init';

export type DesignStatus = '未開始' | '不需要' | '進行中' | '完成';
export type PublicationStatus = '未開始' | '已排程' | '已刊登';

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
  slug: string;
  submittedBy: string;
  designStatus: DesignStatus;
  publicationStatus: PublicationStatus;
  assignee: string;
  createdAt: string;
};

export type PublicActivity = Pick<
  ActivitySubmission,
  | 'id'
  | 'sessionNumber'
  | 'youthProjectName'
  | 'activityDate'
  | 'publishDate'
  | 'promotionCopy'
  | 'imageUrl'
  | 'slug'
>;

export type ActivitySubmissionInput = Omit<
  ActivitySubmission,
  'id' | 'createdAt' | 'designStatus' | 'publicationStatus' | 'assignee' | 'slug' | 'submittedBy' | 'registrationUrl'
> & {
  registrationUrl?: string | null;
};

export type ActivityTrackingInput = Pick<ActivitySubmission, 'designStatus' | 'publicationStatus' | 'assignee'>;

const ACTIVITY_SELECT = `SELECT id, session_number, youth_project_name, activity_date, publish_date,
  promotion_copy, image_url, needs_design, registration_url, notes, slug, submitted_by,
  design_status, publication_status, assignee, created_at
  FROM activity_submissions`;

let initialization: Promise<void> | undefined;

function getD1() {
  if (!env.DB) {
    throw new Error('D1 binding `DB` is unavailable.');
  }
  return env.DB;
}

export async function ensureActivityTable() {
  if (!initialization) {
    const db = getD1();
    initialization = (async () => {
      await ensureTables();
      await db.prepare(`CREATE TABLE IF NOT EXISTS activity_submissions (
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
          slug TEXT,
          submitted_by TEXT NOT NULL DEFAULT '',
          design_status TEXT NOT NULL DEFAULT '未開始' CHECK (design_status IN ('未開始', '不需要', '進行中', '完成')),
          publication_status TEXT NOT NULL DEFAULT '未開始' CHECK (publication_status IN ('未開始', '已排程', '已刊登')),
          assignee TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`).run();

      const columns = await db.prepare('PRAGMA table_info(activity_submissions)').all<{ name: string }>();
      const columnNames = new Set((columns.results ?? []).map((column) => column.name));
      const updates: D1PreparedStatement[] = [];

      if (!columnNames.has('design_status')) {
        updates.push(db.prepare(`ALTER TABLE activity_submissions ADD COLUMN design_status TEXT NOT NULL DEFAULT '未開始' CHECK (design_status IN ('未開始', '不需要', '進行中', '完成'))`));
      }
      if (!columnNames.has('publication_status')) {
        updates.push(db.prepare(`ALTER TABLE activity_submissions ADD COLUMN publication_status TEXT NOT NULL DEFAULT '未開始' CHECK (publication_status IN ('未開始', '已排程', '已刊登'))`));
      }
      if (!columnNames.has('assignee')) {
        updates.push(db.prepare("ALTER TABLE activity_submissions ADD COLUMN assignee TEXT NOT NULL DEFAULT ''"));
      }
      if (!columnNames.has('slug')) {
        updates.push(db.prepare('ALTER TABLE activity_submissions ADD COLUMN slug TEXT'));
      }
      if (!columnNames.has('submitted_by')) {
        updates.push(db.prepare("ALTER TABLE activity_submissions ADD COLUMN submitted_by TEXT NOT NULL DEFAULT ''"));
      }

      updates.push(
        db.prepare('CREATE INDEX IF NOT EXISTS idx_activity_submissions_publish_date ON activity_submissions (publish_date)'),
        db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_submissions_slug ON activity_submissions (slug)'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_activity_submissions_submitted_by ON activity_submissions (submitted_by)'),
        db.prepare('PRAGMA optimize'),
      );
      await db.batch(updates);

      const missingSlugRows = await db
        .prepare('SELECT id, session_number FROM activity_submissions WHERE slug IS NULL OR slug = ""')
        .all<{ id: number; session_number: string }>();

      for (const row of missingSlugRows.results ?? []) {
        const slug = generateActivitySlug(row.session_number);
        await db.prepare('UPDATE activity_submissions SET slug = ? WHERE id = ?').bind(slug, row.id).run();
      }

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
  slug: string;
  submitted_by: string;
  design_status: DesignStatus;
  publication_status: PublicationStatus;
  assignee: string;
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
    slug: row.slug,
    submittedBy: row.submitted_by,
    designStatus: row.design_status,
    publicationStatus: row.publication_status,
    assignee: row.assignee,
    createdAt: row.created_at,
  };
}

function mapPublicRow(row: ActivityRow): PublicActivity {
  return {
    id: row.id,
    sessionNumber: row.session_number,
    youthProjectName: row.youth_project_name,
    activityDate: row.activity_date,
    publishDate: row.publish_date,
    promotionCopy: row.promotion_copy,
    imageUrl: row.image_url,
    slug: row.slug,
  };
}

export async function getActivityById(id: number) {
  await ensureActivityTable();
  const saved = await getD1()
    .prepare(`${ACTIVITY_SELECT} WHERE id = ?`)
    .bind(id)
    .first<ActivityRow>();
  return saved ? mapRow(saved) : null;
}

export async function getActivityBySlug(slug: string) {
  await ensureActivityTable();
  const saved = await getD1()
    .prepare(`${ACTIVITY_SELECT} WHERE slug = ?`)
    .bind(slug)
    .first<ActivityRow>();
  return saved ? mapRow(saved) : null;
}

export async function getPublicActivityBySlug(slug: string) {
  await ensureActivityTable();
  const saved = await getD1()
    .prepare(`${ACTIVITY_SELECT}
      WHERE slug = ?
        AND publication_status IN ('已排程', '已刊登')`)
    .bind(slug)
    .first<ActivityRow>();
  return saved ? mapPublicRow(saved) : null;
}

export async function listActivities() {
  await ensureActivityTable();
  const result = await getD1()
    .prepare(`${ACTIVITY_SELECT} ORDER BY publish_date ASC, created_at DESC`)
    .all<ActivityRow>();

  return (result.results ?? []).map(mapRow);
}

export async function listActivitiesByAccount(accountCode: string) {
  await ensureActivityTable();
  const result = await getD1()
    .prepare(`${ACTIVITY_SELECT}
      WHERE submitted_by = ?
      ORDER BY created_at DESC`)
    .bind(accountCode)
    .all<ActivityRow>();

  return (result.results ?? []).map(mapRow);
}

export async function listPublicActivities() {
  await ensureActivityTable();
  const result = await getD1()
    .prepare(`${ACTIVITY_SELECT}
      WHERE publication_status IN ('已排程', '已刊登')
      ORDER BY activity_date ASC, created_at DESC`)
    .all<ActivityRow>();

  return (result.results ?? []).map(mapPublicRow);
}

export async function createActivity(input: ActivitySubmissionInput, submittedBy: string) {
  await ensureActivityTable();
  const slug = generateActivitySlug(input.sessionNumber);
  const publicPath = buildPublicActivityPath(slug);

  const result = await getD1()
    .prepare(`INSERT INTO activity_submissions (
      session_number, youth_project_name, activity_date, publish_date,
      promotion_copy, image_url, needs_design, registration_url, notes, slug, submitted_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      input.sessionNumber,
      input.youthProjectName,
      input.activityDate,
      input.publishDate,
      input.promotionCopy,
      input.imageUrl,
      input.needsDesign ? 1 : 0,
      publicPath,
      input.notes,
      slug,
      submittedBy,
    )
    .run();

  const id = Number(result.meta.last_row_id);
  const saved = await getActivityById(id);

  if (!saved) throw new Error('Submitted activity could not be read back.');
  return saved;
}

export async function updateActivityTracking(id: number, input: ActivityTrackingInput) {
  await ensureActivityTable();
  const result = await getD1()
    .prepare(`UPDATE activity_submissions
      SET design_status = ?, publication_status = ?, assignee = ?
      WHERE id = ?`)
    .bind(input.designStatus, input.publicationStatus, input.assignee, id)
    .run();
  if (!result.meta.changes) return null;
  return getActivityById(id);
}

export async function deleteActivity(id: number) {
  await ensureActivityTable();
  const db = getD1();
  await db.prepare('DELETE FROM activity_registrations WHERE activity_id = ?').bind(id).run();
  const result = await db.prepare('DELETE FROM activity_submissions WHERE id = ?').bind(id).run();
  return Boolean(result.meta.changes);
}

export function canManageActivityRegistrations(
  activity: ActivitySubmission,
  accountCode: string,
  accountRole: 'partner' | 'admin',
) {
  return accountRole === 'admin' || activity.submittedBy === accountCode;
}
