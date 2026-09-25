CREATE TABLE `attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`date` text NOT NULL,
	`status` text NOT NULL,
	`note` text,
	`updated_at` integer,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `att_course_date_uq` ON `attendance` (`course_id`,`date`);--> statement-breakpoint
CREATE TABLE `courses` (
	`id` text PRIMARY KEY NOT NULL,
	`term_id` text,
	`code` text DEFAULT '' NOT NULL,
	`name` text NOT NULL,
	`emoji` text DEFAULT '📘' NOT NULL,
	`color` text DEFAULT '#141414' NOT NULL,
	`pattern` text DEFAULT 'dots' NOT NULL,
	`banner_uri` text,
	`credits` real DEFAULT 1 NOT NULL,
	`default_duration_min` integer DEFAULT 60 NOT NULL,
	`reminder_lead_override_min` integer,
	`updated_at` integer,
	FOREIGN KEY (`term_id`) REFERENCES `terms`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`course_id` text,
	`due_at` integer NOT NULL,
	`remind_lead_override_min` integer,
	`done` integer DEFAULT false NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `events_due_idx` ON `events` (`due_at`);--> statement-breakpoint
CREATE TABLE `files` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text,
	`category` text DEFAULT 'other' NOT NULL,
	`name` text NOT NULL,
	`sandbox_uri` text NOT NULL,
	`size` integer DEFAULT 0 NOT NULL,
	`mime` text,
	`description` text,
	`added_at` integer NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `gpa_scales` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`rows` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `grade_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`name` text NOT NULL,
	`weight` real DEFAULT 1 NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `grades` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`category_id` text,
	`title` text NOT NULL,
	`score` real NOT NULL,
	`max_score` real DEFAULT 100 NOT NULL,
	`weight_override` real,
	`date` text NOT NULL,
	`note` text,
	`updated_at` integer,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `grade_categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `grades_course_idx` ON `grades` (`course_id`);--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text,
	`kind` text NOT NULL,
	`body` text NOT NULL,
	`description` text,
	`updated_at` integer,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `schedule_exceptions` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`pattern_id` text,
	`date` text NOT NULL,
	`kind` text NOT NULL,
	`start_time` text,
	`end_time` text,
	`updated_at` integer,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pattern_id`) REFERENCES `schedule_patterns`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exc_course_date_uq` ON `schedule_exceptions` (`course_id`,`date`);--> statement-breakpoint
CREATE TABLE `schedule_patterns` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`weekday` integer NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`location` text,
	`valid_from` text,
	`valid_to` text,
	`updated_at` integer,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `patterns_course_idx` ON `schedule_patterns` (`course_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `study_promises` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text,
	`subject` text NOT NULL,
	`target_min` integer NOT NULL,
	`period` text DEFAULT 'day' NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `study_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text,
	`started_at` integer NOT NULL,
	`duration_min` integer NOT NULL,
	`note` text,
	`updated_at` integer,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `sessions_started_idx` ON `study_sessions` (`started_at`);--> statement-breakpoint
CREATE TABLE `terms` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`updated_at` integer
);
