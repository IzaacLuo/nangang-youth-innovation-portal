CREATE TABLE `activity_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_number` text NOT NULL,
	`youth_project_name` text NOT NULL,
	`activity_date` text NOT NULL,
	`publish_date` text NOT NULL,
	`promotion_copy` text NOT NULL,
	`image_url` text NOT NULL,
	`needs_design` integer NOT NULL,
	`registration_url` text,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_activity_submissions_publish_date` ON `activity_submissions` (`publish_date`);