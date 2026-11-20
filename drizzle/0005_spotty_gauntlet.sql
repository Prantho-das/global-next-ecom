CREATE TABLE "abandon_cart_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"cart_id" text NOT NULL,
	"stage" text NOT NULL,
	"coupon_code" text,
	"contact" text NOT NULL,
	"opted_out" boolean DEFAULT false NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recovered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "back_in_stock_alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"variant_id" text NOT NULL,
	"contact" text NOT NULL,
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns_marketing" (
	"id" text PRIMARY KEY NOT NULL,
	"channel" text NOT NULL,
	"template_id" text,
	"segment_id" text,
	"scheduled_at" timestamp with time zone,
	"status" text DEFAULT 'draft' NOT NULL,
	"stats" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_feeds" (
	"id" text PRIMARY KEY NOT NULL,
	"channel" text NOT NULL,
	"url" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_generated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" text PRIMARY KEY NOT NULL,
	"referrer_user_id" text NOT NULL,
	"referred_user_id" text,
	"code" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"reward_amount" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "segments" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracking_events" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text,
	"platform" text NOT NULL,
	"event_id" text NOT NULL,
	"sent_at" timestamp with time zone,
	"status" text DEFAULT 'sent' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlists" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"product_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "abandon_cart_logs" ADD CONSTRAINT "abandon_cart_logs_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "back_in_stock_alerts" ADD CONSTRAINT "back_in_stock_alerts_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns_marketing" ADD CONSTRAINT "campaigns_marketing_segment_id_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_user_id_users_id_fk" FOREIGN KEY ("referrer_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_user_id_users_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "abandon_cart_logs_cart_idx" ON "abandon_cart_logs" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX "back_in_stock_variant_idx" ON "back_in_stock_alerts" USING btree ("variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "referrals_code_idx" ON "referrals" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "tracking_events_event_id_idx" ON "tracking_events" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wishlists_pair_idx" ON "wishlists" USING btree ("user_id","product_id");