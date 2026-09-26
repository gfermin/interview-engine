ALTER TABLE `interview_templates` ADD `include_compensation_question` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `interview_templates` ADD `include_work_authorization_check` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `questions` ADD `requires_technical_knowledge` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `questions` ADD `technical_term_helper` text;