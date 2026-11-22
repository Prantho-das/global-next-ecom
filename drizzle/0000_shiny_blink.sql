CREATE TABLE `otp_codes` (
	`id` varchar(191) NOT NULL,
	`phone` varchar(191) NOT NULL,
	`code` text NOT NULL,
	`purpose` varchar(191) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`verified_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `otp_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `brands` (
	`id` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`logo_url` text,
	`seo` json,
	`deleted_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `brands_id` PRIMARY KEY(`id`),
	CONSTRAINT `brands_slug_idx` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` varchar(191) NOT NULL,
	`parent_id` varchar(191),
	`name` varchar(191) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`path` varchar(191) NOT NULL,
	`depth` int NOT NULL DEFAULT 0,
	`position` int NOT NULL DEFAULT 0,
	`seo` json,
	`deleted_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_idx` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `product_categories` (
	`id` varchar(191) NOT NULL,
	`product_id` varchar(191) NOT NULL,
	`category_id` varchar(191) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_categories_pair_idx` UNIQUE(`product_id`,`category_id`)
);
--> statement-breakpoint
CREATE TABLE `product_images` (
	`id` varchar(191) NOT NULL,
	`product_id` varchar(191) NOT NULL,
	`url` text NOT NULL,
	`alt` text NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`variant_ids` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_images_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_options` (
	`id` varchar(191) NOT NULL,
	`product_id` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`values` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`status` varchar(64) NOT NULL DEFAULT 'draft',
	`brand_id` varchar(191),
	`description` text NOT NULL,
	`base_price` int NOT NULL DEFAULT 0,
	`sale_price` int,
	`compare_at_price` int,
	`seo` json,
	`has_variants` boolean NOT NULL DEFAULT false,
	`vendor` varchar(191),
	`product_type` varchar(191),
	`tags` json NOT NULL,
	`deleted_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_slug_idx` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` varchar(191) NOT NULL,
	`product_id` varchar(191) NOT NULL,
	`user_id` varchar(191),
	`customer_id` varchar(191),
	`rating` int NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`is_verified` boolean NOT NULL DEFAULT false,
	`status` varchar(64) NOT NULL DEFAULT 'pending',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` varchar(191) NOT NULL,
	`variant_id` varchar(191) NOT NULL,
	`delta` int NOT NULL,
	`reason` varchar(191) NOT NULL,
	`ref_type` varchar(191) NOT NULL,
	`ref_id` varchar(191) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stock_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `variants` (
	`id` varchar(191) NOT NULL,
	`product_id` varchar(191) NOT NULL,
	`sku` varchar(191) NOT NULL,
	`price` int NOT NULL DEFAULT 0,
	`compare_at_price` int,
	`cost_price` int,
	`stock` int NOT NULL DEFAULT 0,
	`weight_g` int NOT NULL DEFAULT 0,
	`barcode` varchar(191),
	`option_values` json NOT NULL,
	`image_id` varchar(191),
	`is_default` boolean NOT NULL DEFAULT false,
	`deleted_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `variants_id` PRIMARY KEY(`id`),
	CONSTRAINT `variants_sku_idx` UNIQUE(`sku`)
);
--> statement-breakpoint
CREATE TABLE `cod_settlements` (
	`id` varchar(191) NOT NULL,
	`provider` varchar(191) NOT NULL,
	`batch_ref` varchar(191) NOT NULL,
	`total_collected` int NOT NULL DEFAULT 0,
	`total_fee` int NOT NULL DEFAULT 0,
	`net_amount` int NOT NULL DEFAULT 0,
	`status` varchar(64) NOT NULL DEFAULT 'pending',
	`settled_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cod_settlements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `courier_providers` (
	`id` varchar(191) NOT NULL,
	`code` varchar(191) NOT NULL,
	`config_enc` text NOT NULL,
	`status` varchar(64) NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `courier_providers_id` PRIMARY KEY(`id`),
	CONSTRAINT `courier_providers_code_idx` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `shipment_events` (
	`id` varchar(191) NOT NULL,
	`shipment_id` varchar(191) NOT NULL,
	`status` varchar(64) NOT NULL,
	`payload` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shipment_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shipments` (
	`id` varchar(191) NOT NULL,
	`order_id` varchar(191) NOT NULL,
	`provider` varchar(191) NOT NULL,
	`consignment_id` varchar(191),
	`tracking_code` varchar(191),
	`status` varchar(64) NOT NULL DEFAULT 'pending',
	`cod_amount` int NOT NULL DEFAULT 0,
	`cod_collected` int NOT NULL DEFAULT 0,
	`fee` int NOT NULL DEFAULT 0,
	`raw` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shipments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blacklist` (
	`id` varchar(191) NOT NULL,
	`type` varchar(64) NOT NULL,
	`value` varchar(191) NOT NULL,
	`reason` text NOT NULL,
	`expires_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `blacklist_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_courier_stats` (
	`id` varchar(191) NOT NULL,
	`phone` varchar(191) NOT NULL,
	`delivered` int NOT NULL DEFAULT 0,
	`returned` int NOT NULL DEFAULT 0,
	`cancelled` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customer_courier_stats_id` PRIMARY KEY(`id`),
	CONSTRAINT `customer_courier_stats_phone_idx` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `fraud_checks` (
	`id` varchar(191) NOT NULL,
	`order_id` varchar(191) NOT NULL,
	`score` int NOT NULL,
	`signals` json NOT NULL,
	`decision` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fraud_checks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fraud_rules` (
	`id` varchar(191) NOT NULL,
	`key` varchar(191) NOT NULL,
	`weight` int NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`config` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fraud_rules_id` PRIMARY KEY(`id`),
	CONSTRAINT `fraud_rules_key_idx` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `abandon_cart_logs` (
	`id` varchar(191) NOT NULL,
	`cart_id` varchar(191) NOT NULL,
	`stage` varchar(64) NOT NULL,
	`coupon_code` varchar(191),
	`contact` varchar(191) NOT NULL,
	`opted_out` boolean NOT NULL DEFAULT false,
	`sent_at` timestamp NOT NULL DEFAULT (now()),
	`recovered_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `abandon_cart_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `back_in_stock_alerts` (
	`id` varchar(191) NOT NULL,
	`variant_id` varchar(191) NOT NULL,
	`contact` varchar(191) NOT NULL,
	`notified_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `back_in_stock_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaigns_marketing` (
	`id` varchar(191) NOT NULL,
	`channel` varchar(64) NOT NULL,
	`template_id` varchar(191),
	`segment_id` varchar(191),
	`scheduled_at` timestamp,
	`status` varchar(64) NOT NULL DEFAULT 'draft',
	`stats` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaigns_marketing_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_feeds` (
	`id` varchar(191) NOT NULL,
	`channel` varchar(64) NOT NULL,
	`url` text NOT NULL,
	`status` varchar(64) NOT NULL DEFAULT 'active',
	`last_generated_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_feeds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` varchar(191) NOT NULL,
	`referrer_user_id` varchar(191) NOT NULL,
	`referred_user_id` varchar(191),
	`code` varchar(191) NOT NULL,
	`status` varchar(64) NOT NULL DEFAULT 'active',
	`reward_amount` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referrals_id` PRIMARY KEY(`id`),
	CONSTRAINT `referrals_code_idx` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `segments` (
	`id` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`rules` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `segments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tracking_events` (
	`id` varchar(191) NOT NULL,
	`order_id` varchar(191),
	`platform` varchar(64) NOT NULL,
	`event_id` varchar(191) NOT NULL,
	`sent_at` timestamp,
	`status` varchar(64) NOT NULL DEFAULT 'sent',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tracking_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `tracking_events_event_id_idx` UNIQUE(`event_id`)
);
--> statement-breakpoint
CREATE TABLE `wishlists` (
	`id` varchar(191) NOT NULL,
	`user_id` varchar(191) NOT NULL,
	`product_id` varchar(191) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wishlists_id` PRIMARY KEY(`id`),
	CONSTRAINT `wishlists_pair_idx` UNIQUE(`user_id`,`product_id`)
);
--> statement-breakpoint
CREATE TABLE `notification_events` (
	`id` varchar(191) NOT NULL,
	`type` varchar(191) NOT NULL,
	`payload` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notification_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_logs` (
	`id` varchar(191) NOT NULL,
	`event_id` varchar(191),
	`channel` varchar(64) NOT NULL,
	`recipient` varchar(191) NOT NULL,
	`template` varchar(191) NOT NULL,
	`status` varchar(64) NOT NULL DEFAULT 'queued',
	`provider_id` varchar(191),
	`error` text,
	`attempts` int NOT NULL DEFAULT 0,
	`next_retry_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notification_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`id` varchar(191) NOT NULL,
	`user_id` varchar(191) NOT NULL,
	`email_enabled` boolean NOT NULL DEFAULT true,
	`sms_enabled` boolean NOT NULL DEFAULT true,
	`push_enabled` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_preferences_user_idx` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `push_tokens` (
	`id` varchar(191) NOT NULL,
	`user_id` varchar(191) NOT NULL,
	`token` varchar(191) NOT NULL,
	`platform` varchar(64) NOT NULL DEFAULT 'web',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `push_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `push_tokens_token_idx` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `templates` (
	`id` varchar(191) NOT NULL,
	`channel` varchar(64) NOT NULL,
	`key` varchar(191) NOT NULL,
	`subject` text,
	`body` text NOT NULL,
	`vars` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `templates_channel_key_idx` UNIQUE(`channel`,`key`)
);
--> statement-breakpoint
CREATE TABLE `payment_providers` (
	`id` varchar(191) NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(191) NOT NULL,
	`config_enc` text NOT NULL,
	`is_active` boolean NOT NULL DEFAULT false,
	`position` int NOT NULL DEFAULT 0,
	`sandbox_mode` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payment_providers_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_providers_code_idx` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `refunds` (
	`id` varchar(191) NOT NULL,
	`payment_id` varchar(191) NOT NULL,
	`order_id` varchar(191) NOT NULL,
	`amount` int NOT NULL,
	`reason` text NOT NULL,
	`status` varchar(64) NOT NULL DEFAULT 'pending',
	`gateway_refund_id` varchar(191),
	`processed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `refunds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaign_rules` (
	`id` varchar(191) NOT NULL,
	`campaign_id` varchar(191),
	`discount_type` varchar(64) NOT NULL,
	`value` int NOT NULL,
	`max_discount` int,
	`stock_cap` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaign_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaign_targets` (
	`id` varchar(191) NOT NULL,
	`campaign_id` varchar(191) NOT NULL,
	`scope` varchar(64) NOT NULL,
	`target_id` varchar(191),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaign_targets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`type` varchar(64) NOT NULL,
	`starts_at` timestamp NOT NULL,
	`ends_at` timestamp NOT NULL,
	`priority` int NOT NULL DEFAULT 0,
	`status` varchar(64) NOT NULL DEFAULT 'draft',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coupon_redemptions` (
	`id` varchar(191) NOT NULL,
	`coupon_id` varchar(191) NOT NULL,
	`user_id` varchar(191),
	`order_id` varchar(191) NOT NULL,
	`amount` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coupon_redemptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupon_redemptions_order_unique_idx` UNIQUE(`coupon_id`,`order_id`)
);
--> statement-breakpoint
CREATE TABLE `coupon_targets` (
	`id` varchar(191) NOT NULL,
	`coupon_id` varchar(191) NOT NULL,
	`scope` varchar(64) NOT NULL,
	`target_id` varchar(191) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coupon_targets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` varchar(191) NOT NULL,
	`code` varchar(191) NOT NULL,
	`type` varchar(64) NOT NULL,
	`value` int NOT NULL,
	`min_cart` int NOT NULL DEFAULT 0,
	`max_discount` int,
	`usage_limit` int,
	`per_user_limit` int,
	`starts_at` timestamp NOT NULL,
	`expires_at` timestamp NOT NULL,
	`scope` varchar(64) NOT NULL DEFAULT 'all',
	`stackable` boolean NOT NULL DEFAULT true,
	`status` varchar(64) NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_code_idx` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `special_days` (
	`id` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`starts_at` timestamp NOT NULL,
	`ends_at` timestamp NOT NULL,
	`banner` text,
	`rule_id` varchar(191) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `special_days_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `accounts` (
	`id` varchar(191) NOT NULL,
	`user_id` varchar(191) NOT NULL,
	`account_id` varchar(191) NOT NULL,
	`provider_id` varchar(191) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`access_token_expires_at` timestamp,
	`refresh_token_expires_at` timestamp,
	`scope` text,
	`id_token` text,
	`password` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` varchar(191) NOT NULL,
	`actor_id` varchar(191),
	`action` varchar(191) NOT NULL,
	`entity` varchar(191) NOT NULL,
	`entity_id` varchar(191) NOT NULL,
	`diff` json,
	`ip` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` varchar(191) NOT NULL,
	`resource` varchar(191) NOT NULL,
	`action` varchar(191) NOT NULL,
	`key` varchar(191) NOT NULL,
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `permissions_key_idx` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`id` varchar(191) NOT NULL,
	`role_id` varchar(191) NOT NULL,
	`permission_id` varchar(191) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `role_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `role_permissions_pair_idx` UNIQUE(`role_id`,`permission_id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`slug` varchar(191) NOT NULL,
	`description` text,
	`is_system` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_name_idx` UNIQUE(`name`),
	CONSTRAINT `roles_slug_idx` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(191) NOT NULL,
	`user_id` varchar(191) NOT NULL,
	`token` varchar(191) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_token_idx` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`id` varchar(191) NOT NULL,
	`user_id` varchar(191) NOT NULL,
	`role_id` varchar(191) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_roles_pair_idx` UNIQUE(`user_id`,`role_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(191) NOT NULL,
	`name` text NOT NULL,
	`email` varchar(191) NOT NULL,
	`email_verified` boolean NOT NULL DEFAULT false,
	`phone` varchar(191),
	`phone_verified` boolean NOT NULL DEFAULT false,
	`image` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_idx` UNIQUE(`email`),
	CONSTRAINT `users_phone_idx` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `verifications` (
	`id` varchar(191) NOT NULL,
	`identifier` varchar(191) NOT NULL,
	`value` text NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `verifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agg_coupon_daily` (
	`id` varchar(191) NOT NULL,
	`day` date NOT NULL,
	`coupon_id` varchar(191) NOT NULL,
	`redemptions` int NOT NULL DEFAULT 0,
	`discount_amount` int NOT NULL DEFAULT 0,
	`revenue_attributed` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agg_coupon_daily_id` PRIMARY KEY(`id`),
	CONSTRAINT `agg_coupon_daily_pair_idx` UNIQUE(`day`,`coupon_id`)
);
--> statement-breakpoint
CREATE TABLE `agg_courier_daily` (
	`id` varchar(191) NOT NULL,
	`day` date NOT NULL,
	`provider` varchar(191) NOT NULL,
	`shipped` int NOT NULL DEFAULT 0,
	`delivered` int NOT NULL DEFAULT 0,
	`returned` int NOT NULL DEFAULT 0,
	`cod_collected` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agg_courier_daily_id` PRIMARY KEY(`id`),
	CONSTRAINT `agg_courier_daily_pair_idx` UNIQUE(`day`,`provider`)
);
--> statement-breakpoint
CREATE TABLE `agg_product_daily` (
	`id` varchar(191) NOT NULL,
	`day` date NOT NULL,
	`product_id` varchar(191) NOT NULL,
	`units_sold` int NOT NULL DEFAULT 0,
	`revenue` int NOT NULL DEFAULT 0,
	`cost_total` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agg_product_daily_id` PRIMARY KEY(`id`),
	CONSTRAINT `agg_product_daily_pair_idx` UNIQUE(`day`,`product_id`)
);
--> statement-breakpoint
CREATE TABLE `agg_sales_daily` (
	`id` varchar(191) NOT NULL,
	`day` date NOT NULL,
	`orders_count` int NOT NULL DEFAULT 0,
	`revenue` int NOT NULL DEFAULT 0,
	`discount_total` int NOT NULL DEFAULT 0,
	`shipping_total` int NOT NULL DEFAULT 0,
	`refund_total` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agg_sales_daily_id` PRIMARY KEY(`id`),
	CONSTRAINT `agg_sales_daily_day_idx` UNIQUE(`day`)
);
--> statement-breakpoint
CREATE TABLE `cron_job_runs` (
	`id` varchar(191) NOT NULL,
	`job_name` varchar(191) NOT NULL,
	`status` varchar(64) NOT NULL,
	`summary` json,
	`started_at` timestamp NOT NULL,
	`finished_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cron_job_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `addresses` (
	`id` varchar(191) NOT NULL,
	`customer_id` varchar(191) NOT NULL,
	`division` varchar(191) NOT NULL,
	`district` varchar(191) NOT NULL,
	`thana` varchar(191) NOT NULL,
	`line` text NOT NULL,
	`is_default` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cart_items` (
	`id` varchar(191) NOT NULL,
	`cart_id` varchar(191) NOT NULL,
	`variant_id` varchar(191) NOT NULL,
	`qty` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cart_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `cart_items_pair_idx` UNIQUE(`cart_id`,`variant_id`)
);
--> statement-breakpoint
CREATE TABLE `carts` (
	`id` varchar(191) NOT NULL,
	`session_id` varchar(191),
	`user_id` varchar(191),
	`customer_id` varchar(191),
	`status` varchar(64) NOT NULL DEFAULT 'active',
	`last_activity_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `carts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` varchar(191) NOT NULL,
	`user_id` varchar(191),
	`phone` varchar(191) NOT NULL,
	`email` varchar(191),
	`name` varchar(191) NOT NULL,
	`is_guest` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `customers_phone_idx` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `order_events` (
	`id` varchar(191) NOT NULL,
	`order_id` varchar(191) NOT NULL,
	`from_status` varchar(64),
	`to_status` varchar(64) NOT NULL,
	`actor` varchar(191) NOT NULL,
	`note` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` varchar(191) NOT NULL,
	`order_id` varchar(191) NOT NULL,
	`variant_id` varchar(191) NOT NULL,
	`qty` int NOT NULL,
	`price_snapshot` int NOT NULL,
	`name_snapshot` text NOT NULL,
	`sku_snapshot` varchar(191) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` varchar(191) NOT NULL,
	`number` varchar(191) NOT NULL,
	`customer_id` varchar(191) NOT NULL,
	`status` varchar(64) NOT NULL DEFAULT 'pending',
	`payment_status` varchar(64) NOT NULL DEFAULT 'pending',
	`subtotal` int NOT NULL,
	`discount_total` int NOT NULL DEFAULT 0,
	`shipping_fee` int NOT NULL DEFAULT 0,
	`total` int NOT NULL,
	`shipping_address` json NOT NULL,
	`note` text,
	`ip` text,
	`user_agent` text,
	`idempotency_key` varchar(191) NOT NULL,
	`deleted_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_number_idx` UNIQUE(`number`),
	CONSTRAINT `orders_idempotency_idx` UNIQUE(`idempotency_key`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` varchar(191) NOT NULL,
	`order_id` varchar(191) NOT NULL,
	`method` varchar(64) NOT NULL DEFAULT 'cod',
	`gateway_provider` varchar(64),
	`status` varchar(64) NOT NULL DEFAULT 'pending',
	`txn_id` varchar(191),
	`gateway_txn_id` varchar(191),
	`amount` int NOT NULL,
	`refunded_amount` int NOT NULL DEFAULT 0,
	`currency` varchar(16) NOT NULL DEFAULT 'BDT',
	`raw_response` json,
	`idempotency_key` varchar(191) NOT NULL,
	`paid_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_idempotency_idx` UNIQUE(`idempotency_key`)
);
--> statement-breakpoint
CREATE TABLE `shipping_rates` (
	`id` varchar(191) NOT NULL,
	`zone_id` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`min_weight_g` int NOT NULL DEFAULT 0,
	`max_weight_g` int,
	`min_cart_amount` int NOT NULL DEFAULT 0,
	`max_cart_amount` int,
	`price` int NOT NULL,
	`estimated_days_min` int NOT NULL DEFAULT 1,
	`estimated_days_max` int NOT NULL DEFAULT 3,
	`is_free_above` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shipping_rates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shipping_settings` (
	`id` varchar(191) NOT NULL,
	`free_shipping_global_threshold` int,
	`default_weight_g` int NOT NULL DEFAULT 500,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shipping_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shipping_zone_areas` (
	`id` varchar(191) NOT NULL,
	`zone_id` varchar(191) NOT NULL,
	`division` varchar(191) NOT NULL,
	`district` varchar(191) NOT NULL,
	`thana` varchar(191),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shipping_zone_areas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shipping_zones` (
	`id` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`type` varchar(64) NOT NULL DEFAULT 'flat',
	`is_default` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shipping_zones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `product_categories` ADD CONSTRAINT `product_categories_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_categories` ADD CONSTRAINT `product_categories_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_images` ADD CONSTRAINT `product_images_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_options` ADD CONSTRAINT `product_options_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_brand_id_brands_id_fk` FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_variant_id_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `variants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variants` ADD CONSTRAINT `variants_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variants` ADD CONSTRAINT `variants_image_id_product_images_id_fk` FOREIGN KEY (`image_id`) REFERENCES `product_images`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shipment_events` ADD CONSTRAINT `shipment_events_shipment_id_shipments_id_fk` FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shipments` ADD CONSTRAINT `shipments_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fraud_checks` ADD CONSTRAINT `fraud_checks_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `abandon_cart_logs` ADD CONSTRAINT `abandon_cart_logs_cart_id_carts_id_fk` FOREIGN KEY (`cart_id`) REFERENCES `carts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `back_in_stock_alerts` ADD CONSTRAINT `back_in_stock_alerts_variant_id_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `variants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaigns_marketing` ADD CONSTRAINT `campaigns_marketing_segment_id_segments_id_fk` FOREIGN KEY (`segment_id`) REFERENCES `segments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_referrer_user_id_users_id_fk` FOREIGN KEY (`referrer_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_referred_user_id_users_id_fk` FOREIGN KEY (`referred_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tracking_events` ADD CONSTRAINT `tracking_events_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wishlists` ADD CONSTRAINT `wishlists_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wishlists` ADD CONSTRAINT `wishlists_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_logs` ADD CONSTRAINT `notification_logs_event_id_notification_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `notification_events`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_preferences` ADD CONSTRAINT `notification_preferences_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `push_tokens` ADD CONSTRAINT `push_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_payment_id_payments_id_fk` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_rules` ADD CONSTRAINT `campaign_rules_campaign_id_campaigns_id_fk` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_targets` ADD CONSTRAINT `campaign_targets_campaign_id_campaigns_id_fk` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupon_redemptions` ADD CONSTRAINT `coupon_redemptions_coupon_id_coupons_id_fk` FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupon_redemptions` ADD CONSTRAINT `coupon_redemptions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupon_redemptions` ADD CONSTRAINT `coupon_redemptions_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupon_targets` ADD CONSTRAINT `coupon_targets_coupon_id_coupons_id_fk` FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `special_days` ADD CONSTRAINT `special_days_rule_id_campaign_rules_id_fk` FOREIGN KEY (`rule_id`) REFERENCES `campaign_rules`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_id_permissions_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agg_coupon_daily` ADD CONSTRAINT `agg_coupon_daily_coupon_id_coupons_id_fk` FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agg_product_daily` ADD CONSTRAINT `agg_product_daily_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `addresses` ADD CONSTRAINT `addresses_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_cart_id_carts_id_fk` FOREIGN KEY (`cart_id`) REFERENCES `carts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_variant_id_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `variants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `carts` ADD CONSTRAINT `carts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `carts` ADD CONSTRAINT `carts_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customers` ADD CONSTRAINT `customers_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_events` ADD CONSTRAINT `order_events_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_variant_id_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `variants`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shipping_rates` ADD CONSTRAINT `shipping_rates_zone_id_shipping_zones_id_fk` FOREIGN KEY (`zone_id`) REFERENCES `shipping_zones`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shipping_zone_areas` ADD CONSTRAINT `shipping_zone_areas_zone_id_shipping_zones_id_fk` FOREIGN KEY (`zone_id`) REFERENCES `shipping_zones`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `otp_codes_phone_purpose_idx` ON `otp_codes` (`phone`,`purpose`);--> statement-breakpoint
CREATE INDEX `brands_active_idx` ON `brands` (`name`);--> statement-breakpoint
CREATE INDEX `categories_parent_idx` ON `categories` (`parent_id`);--> statement-breakpoint
CREATE INDEX `categories_path_idx` ON `categories` (`path`);--> statement-breakpoint
CREATE INDEX `product_categories_category_idx` ON `product_categories` (`category_id`);--> statement-breakpoint
CREATE INDEX `product_images_product_idx` ON `product_images` (`product_id`);--> statement-breakpoint
CREATE INDEX `product_options_product_idx` ON `product_options` (`product_id`);--> statement-breakpoint
CREATE INDEX `products_status_idx` ON `products` (`status`);--> statement-breakpoint
CREATE INDEX `products_brand_id_idx` ON `products` (`brand_id`);--> statement-breakpoint
CREATE INDEX `products_active_idx` ON `products` (`created_at`);--> statement-breakpoint
CREATE INDEX `reviews_product_status_idx` ON `reviews` (`product_id`,`status`);--> statement-breakpoint
CREATE INDEX `stock_movements_variant_idx` ON `stock_movements` (`variant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `variants_product_idx` ON `variants` (`product_id`);--> statement-breakpoint
CREATE INDEX `shipment_events_shipment_idx` ON `shipment_events` (`shipment_id`);--> statement-breakpoint
CREATE INDEX `shipments_order_idx` ON `shipments` (`order_id`);--> statement-breakpoint
CREATE INDEX `shipments_consignment_idx` ON `shipments` (`consignment_id`);--> statement-breakpoint
CREATE INDEX `blacklist_type_value_idx` ON `blacklist` (`type`,`value`);--> statement-breakpoint
CREATE INDEX `fraud_checks_order_idx` ON `fraud_checks` (`order_id`);--> statement-breakpoint
CREATE INDEX `abandon_cart_logs_cart_idx` ON `abandon_cart_logs` (`cart_id`);--> statement-breakpoint
CREATE INDEX `back_in_stock_variant_idx` ON `back_in_stock_alerts` (`variant_id`);--> statement-breakpoint
CREATE INDEX `notification_events_type_idx` ON `notification_events` (`type`);--> statement-breakpoint
CREATE INDEX `notification_logs_status_idx` ON `notification_logs` (`status`,`next_retry_at`);--> statement-breakpoint
CREATE INDEX `push_tokens_user_idx` ON `push_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `refunds_payment_idx` ON `refunds` (`payment_id`);--> statement-breakpoint
CREATE INDEX `refunds_order_idx` ON `refunds` (`order_id`);--> statement-breakpoint
CREATE INDEX `campaign_rules_campaign_idx` ON `campaign_rules` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `campaign_targets_campaign_idx` ON `campaign_targets` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `campaigns_status_window_idx` ON `campaigns` (`status`,`starts_at`,`ends_at`);--> statement-breakpoint
CREATE INDEX `coupon_redemptions_user_idx` ON `coupon_redemptions` (`coupon_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `coupon_targets_coupon_idx` ON `coupon_targets` (`coupon_id`);--> statement-breakpoint
CREATE INDEX `special_days_window_idx` ON `special_days` (`starts_at`,`ends_at`);--> statement-breakpoint
CREATE INDEX `accounts_user_id_idx` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_actor_id_idx` ON `audit_logs` (`actor_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_entity_idx` ON `audit_logs` (`entity`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `permissions_resource_idx` ON `permissions` (`resource`);--> statement-breakpoint
CREATE INDEX `role_permissions_role_id_idx` ON `role_permissions` (`role_id`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_roles_user_id_idx` ON `user_roles` (`user_id`);--> statement-breakpoint
CREATE INDEX `verifications_identifier_idx` ON `verifications` (`identifier`);--> statement-breakpoint
CREATE INDEX `cron_job_runs_name_idx` ON `cron_job_runs` (`job_name`,`started_at`);--> statement-breakpoint
CREATE INDEX `addresses_customer_id_idx` ON `addresses` (`customer_id`);--> statement-breakpoint
CREATE INDEX `carts_session_status_idx` ON `carts` (`session_id`,`status`);--> statement-breakpoint
CREATE INDEX `carts_user_status_idx` ON `carts` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `customers_user_id_idx` ON `customers` (`user_id`);--> statement-breakpoint
CREATE INDEX `order_events_order_idx` ON `order_events` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `orders_customer_idx` ON `orders` (`customer_id`);--> statement-breakpoint
CREATE INDEX `orders_status_created_idx` ON `orders` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `payments_order_idx` ON `payments` (`order_id`);--> statement-breakpoint
CREATE INDEX `shipping_rates_zone_idx` ON `shipping_rates` (`zone_id`);--> statement-breakpoint
CREATE INDEX `shipping_zone_areas_zone_idx` ON `shipping_zone_areas` (`zone_id`);