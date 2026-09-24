CREATE TABLE `candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `competencies` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`name` text NOT NULL,
	`weight` integer NOT NULL,
	`critical` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `interview_templates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `competency_evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`competency_id` text NOT NULL,
	`evaluated` integer DEFAULT 0 NOT NULL,
	`na` integer DEFAULT 0 NOT NULL,
	`percent` real,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `interview_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`competency_id`) REFERENCES `competencies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `competency_evaluations_session_comp_idx` ON `competency_evaluations` (`session_id`,`competency_id`);--> statement-breakpoint
CREATE TABLE `interview_decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`calculated_status` text NOT NULL,
	`calculated_reason` text NOT NULL,
	`calculated_recommendation` text,
	`mode` text,
	`final_decision` text,
	`reason` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `interview_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `interview_decisions_session_id_unique` ON `interview_decisions` (`session_id`);--> statement-breakpoint
CREATE TABLE `interview_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`candidate_id` text NOT NULL,
	`template_id` text NOT NULL,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`reopened_at` integer,
	`reopen_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_id`) REFERENCES `interview_templates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `interview_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`position_id` text NOT NULL,
	`job_description_id` text,
	`stage` text NOT NULL,
	`name` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`pass_threshold` integer DEFAULT 70 NOT NULL,
	`borderline_min` integer DEFAULT 50 NOT NULL,
	`critical_min` integer DEFAULT 50 NOT NULL,
	`min_completion` integer DEFAULT 70 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`position_id`) REFERENCES `positions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`job_description_id`) REFERENCES `job_descriptions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `job_descriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`position_id` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`raw_text` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`position_id`) REFERENCES `positions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `mandatory_requirement_evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`requirement_id` text NOT NULL,
	`status` text DEFAULT 'unknown' NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `interview_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`requirement_id`) REFERENCES `mandatory_requirements`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mandatory_requirement_evaluations_session_req_idx` ON `mandatory_requirement_evaluations` (`session_id`,`requirement_id`);--> statement-breakpoint
CREATE TABLE `mandatory_requirements` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`label` text NOT NULL,
	`description` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `interview_templates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `positions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`department` text,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `question_evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`question_id` text NOT NULL,
	`score` integer,
	`is_na` integer DEFAULT false NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `interview_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `question_evaluations_session_question_idx` ON `question_evaluations` (`session_id`,`question_id`);--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`competency_id` text NOT NULL,
	`text` text NOT NULL,
	`difficulty` text DEFAULT 'medium' NOT NULL,
	`importance` text DEFAULT 'core' NOT NULL,
	`expected` text,
	`strong` text,
	`acceptable` text,
	`concepts` text DEFAULT '[]' NOT NULL,
	`red_flags` text DEFAULT '[]' NOT NULL,
	`follow_ups` text DEFAULT '[]' NOT NULL,
	`rubric` text DEFAULT '[]' NOT NULL,
	`code` text,
	`solution` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `interview_templates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`competency_id`) REFERENCES `competencies`(`id`) ON UPDATE no action ON DELETE cascade
);
