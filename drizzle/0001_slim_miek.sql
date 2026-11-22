CREATE TABLE `site_settings` (
	`id` varchar(191) NOT NULL,
	`group` varchar(64) NOT NULL,
	`key` varchar(191) NOT NULL,
	`value` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `site_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `site_settings_key_idx` UNIQUE(`key`)
);
