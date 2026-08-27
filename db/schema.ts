import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index('idx_activity_submissions_publish_date').on(table.publishDate)],
);
