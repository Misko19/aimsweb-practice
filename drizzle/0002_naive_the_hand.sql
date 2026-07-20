DROP INDEX `attempt_parent_child_idx`;--> statement-breakpoint
DROP INDEX `attempt_child_completed_idx`;--> statement-breakpoint
CREATE INDEX `attempt_parent_child_created_idx` ON `practice_attempt` (`parent_user_id`,`child_profile_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `attempt_child_created_idx` ON `practice_attempt` (`child_profile_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `attempt_parent_created_idx` ON `practice_attempt` (`parent_user_id`,`created_at`);