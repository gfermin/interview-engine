ALTER TABLE `candidates` ADD `archived_at` integer;--> statement-breakpoint
ALTER TABLE `interview_sessions` ADD `archived_at` integer;--> statement-breakpoint
ALTER TABLE `interview_templates` ADD `archived_at` integer;--> statement-breakpoint
ALTER TABLE `positions` ADD `archived_at` integer;