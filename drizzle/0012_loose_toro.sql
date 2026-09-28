CREATE INDEX `ai_generation_records_job_description_id_idx` ON `ai_generation_records` (`job_description_id`);--> statement-breakpoint
CREATE INDEX `ai_generation_records_template_id_idx` ON `ai_generation_records` (`template_id`);--> statement-breakpoint
CREATE INDEX `competencies_template_id_idx` ON `competencies` (`template_id`);--> statement-breakpoint
CREATE INDEX `interview_reports_session_id_idx` ON `interview_reports` (`session_id`);--> statement-breakpoint
CREATE INDEX `interview_sessions_candidate_id_idx` ON `interview_sessions` (`candidate_id`);--> statement-breakpoint
CREATE INDEX `interview_sessions_template_id_idx` ON `interview_sessions` (`template_id`);--> statement-breakpoint
CREATE INDEX `interview_templates_position_id_idx` ON `interview_templates` (`position_id`);--> statement-breakpoint
CREATE INDEX `interview_templates_job_description_id_idx` ON `interview_templates` (`job_description_id`);--> statement-breakpoint
CREATE INDEX `job_descriptions_position_id_idx` ON `job_descriptions` (`position_id`);--> statement-breakpoint
CREATE INDEX `mandatory_requirements_template_id_idx` ON `mandatory_requirements` (`template_id`);--> statement-breakpoint
CREATE INDEX `questions_template_id_idx` ON `questions` (`template_id`);--> statement-breakpoint
CREATE INDEX `questions_competency_id_idx` ON `questions` (`competency_id`);