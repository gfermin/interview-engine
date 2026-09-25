CREATE TABLE `supplementary_assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`kind` text NOT NULL,
	`level` integer,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `interview_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `supplementary_assessments_session_kind_idx` ON `supplementary_assessments` (`session_id`,`kind`);--> statement-breakpoint
ALTER TABLE `interview_templates` ADD `english_required` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `interview_templates` ADD `english_min_level` integer DEFAULT 3 NOT NULL;