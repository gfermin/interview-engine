PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_interview_decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`calculated_status` text NOT NULL,
	`calculated_reason` text NOT NULL,
	`calculated_recommendation` text,
	`overall` real,
	`completion` real,
	`mode` text,
	`final_decision` text,
	`reason` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `interview_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "interview_decisions_calculated_status_check" CHECK("__new_interview_decisions"."calculated_status" IN ('NOT_EVALUATED', 'PROVISIONAL', 'FAIL', 'BORDERLINE', 'PASS')),
	CONSTRAINT "interview_decisions_calculated_recommendation_check" CHECK("__new_interview_decisions"."calculated_recommendation" IS NULL OR "__new_interview_decisions"."calculated_recommendation" IN ('PASS', 'FAIL', 'REVIEW_REQUIRED'))
);
--> statement-breakpoint
INSERT INTO `__new_interview_decisions`("id", "session_id", "calculated_status", "calculated_reason", "calculated_recommendation", "overall", "completion", "mode", "final_decision", "reason", "created_at", "updated_at") SELECT "id", "session_id", "calculated_status", "calculated_reason", "calculated_recommendation", "overall", "completion", "mode", "final_decision", "reason", "created_at", "updated_at" FROM `interview_decisions`;--> statement-breakpoint
DROP TABLE `interview_decisions`;--> statement-breakpoint
ALTER TABLE `__new_interview_decisions` RENAME TO `interview_decisions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `interview_decisions_session_id_unique` ON `interview_decisions` (`session_id`);