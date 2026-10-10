CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`label` text NOT NULL,
	`color` text NOT NULL,
	`icon` text NOT NULL,
	`position` integer NOT NULL,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `activities_user_idx` ON `activities` (`user_id`,`position`);--> statement-breakpoint
CREATE TABLE `changes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`at` text NOT NULL,
	`action` text NOT NULL,
	`activity_id` text,
	`entry_id` text,
	`source` text NOT NULL,
	`data` text NOT NULL,
	`reverted_at` text,
	`reverted_by` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `changes_user_idx` ON `changes` (`user_id`,`id`);--> statement-breakpoint
CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`activity_id` text NOT NULL,
	`date` text NOT NULL,
	`logged_at` text NOT NULL,
	`time_zone` text NOT NULL,
	`source` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entries_once_per_day` ON `entries` (`user_id`,`activity_id`,`date`) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX `entries_user_date_idx` ON `entries` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`external_id` text NOT NULL,
	`name` text NOT NULL,
	`settings` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_external_id_unique` ON `users` (`external_id`);