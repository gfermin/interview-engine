CREATE TABLE `ai_generation_records` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`job_description_id` text,
	`template_id` text,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`prompt_version` text NOT NULL,
	`blueprint` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`job_description_id`) REFERENCES `job_descriptions`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`template_id`) REFERENCES `interview_templates`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `job_analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`job_description_id` text NOT NULL,
	`detected_role_family` text,
	`detected_seniority` text,
	`mandatory_requirements` text DEFAULT '[]' NOT NULL,
	`preferred_requirements` text DEFAULT '[]' NOT NULL,
	`optional_requirements` text DEFAULT '[]' NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`job_description_id`) REFERENCES `job_descriptions`(`id`) ON UPDATE no action ON DELETE cascade
);
