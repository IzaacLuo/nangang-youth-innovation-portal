ALTER TABLE `activity_submissions` ADD `design_status` text DEFAULT '未開始' NOT NULL;--> statement-breakpoint
ALTER TABLE `activity_submissions` ADD `publication_status` text DEFAULT '未開始' NOT NULL;--> statement-breakpoint
ALTER TABLE `activity_submissions` ADD `assignee` text DEFAULT '' NOT NULL;