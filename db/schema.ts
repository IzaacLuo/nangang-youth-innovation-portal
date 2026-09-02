import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const accounts = sqliteTable('accounts', {
  code: text('code').primaryKey(),
  role: text('role').notNull(),
  memberName: text('member_name').notNull().default(''),
  projectName: text('project_name').notNull().default(''),
  displayName: text('display_name').notNull().default(''),
  passwordHash: text('password_hash').notNull(),
  mustChangePassword: integer('must_change_password', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const sessions = sqliteTable(
  'sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    accountCode: text('account_code').notNull(),
    expiresAt: text('expires_at').notNull(),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('idx_sessions_account_code').on(table.accountCode),
    index('idx_sessions_expires_at').on(table.expiresAt),
  ],
);

export const activitySubmissions = sqliteTable(
  'activity_submissions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sessionNumber: text('session_number').notNull(),
    youthProjectName: text('youth_project_name').notNull(),
    activityDate: text('activity_date').notNull(),
    publishDate: text('publish_date').notNull(),
    promotionCopy: text('promotion_copy').notNull(),
    imageUrl: text('image_url').notNull(),
    needsDesign: integer('needs_design', { mode: 'boolean' }).notNull(),
    registrationUrl: text('registration_url'),
    notes: text('notes'),
    designStatus: text('design_status').notNull().default('未開始'),
    publicationStatus: text('publication_status').notNull().default('未開始'),
    assignee: text('assignee').notNull().default(''),
    slug: text('slug'),
    submittedBy: text('submitted_by').notNull().default(''),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('idx_activity_submissions_publish_date').on(table.publishDate),
    index('idx_activity_submissions_submitted_by').on(table.submittedBy),
  ],
);

export const activityRegistrations = sqliteTable(
  'activity_registrations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    activityId: integer('activity_id').notNull(),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    email: text('email'),
    notes: text('notes'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index('idx_activity_registrations_activity_id').on(table.activityId)],
);
