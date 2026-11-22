CREATE TABLE `purchase_order_items` (
	`id` varchar(191) NOT NULL,
	`purchase_order_id` varchar(191) NOT NULL,
	`variant_id` varchar(191) NOT NULL,
	`qty` int NOT NULL,
	`unit_cost` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `purchase_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` varchar(191) NOT NULL,
	`po_number` varchar(64) NOT NULL,
	`supplier_name` varchar(191) NOT NULL,
	`supplier_phone` varchar(64),
	`status` varchar(32) NOT NULL DEFAULT 'received',
	`total_cost` int NOT NULL DEFAULT 0,
	`note` text,
	`received_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `purchase_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchase_orders_number_idx` UNIQUE(`po_number`)
);
--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_purchase_order_id_purchase_orders_id_fk` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_variant_id_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `variants`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `purchase_order_items_po_idx` ON `purchase_order_items` (`purchase_order_id`);