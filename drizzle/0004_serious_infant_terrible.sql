CREATE TABLE `interview_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`file_path` text NOT NULL,
	`file_size` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `interview_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
