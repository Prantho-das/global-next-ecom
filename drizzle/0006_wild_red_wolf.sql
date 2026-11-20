CREATE TABLE "agg_coupon_daily" (
	"id" text PRIMARY KEY NOT NULL,
	"day" date NOT NULL,
	"coupon_id" text NOT NULL,
	"redemptions" integer DEFAULT 0 NOT NULL,
	"discount_amount" integer DEFAULT 0 NOT NULL,
	"revenue_attributed" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agg_courier_daily" (
	"id" text PRIMARY KEY NOT NULL,
	"day" date NOT NULL,
	"provider" text NOT NULL,
	"shipped" integer DEFAULT 0 NOT NULL,
	"delivered" integer DEFAULT 0 NOT NULL,
	"returned" integer DEFAULT 0 NOT NULL,
	"cod_collected" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agg_product_daily" (
	"id" text PRIMARY KEY NOT NULL,
	"day" date NOT NULL,
	"product_id" text NOT NULL,
	"units_sold" integer DEFAULT 0 NOT NULL,
	"revenue" integer DEFAULT 0 NOT NULL,
	"cost_total" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agg_sales_daily" (
	"id" text PRIMARY KEY NOT NULL,
	"day" date NOT NULL,
	"orders_count" integer DEFAULT 0 NOT NULL,
	"revenue" integer DEFAULT 0 NOT NULL,
	"discount_total" integer DEFAULT 0 NOT NULL,
	"shipping_total" integer DEFAULT 0 NOT NULL,
	"refund_total" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cron_job_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"job_name" text NOT NULL,
	"status" text NOT NULL,
	"summary" jsonb,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agg_coupon_daily" ADD CONSTRAINT "agg_coupon_daily_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agg_product_daily" ADD CONSTRAINT "agg_product_daily_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agg_coupon_daily_pair_idx" ON "agg_coupon_daily" USING btree ("day","coupon_id");--> statement-breakpoint
CREATE UNIQUE INDEX "agg_courier_daily_pair_idx" ON "agg_courier_daily" USING btree ("day","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "agg_product_daily_pair_idx" ON "agg_product_daily" USING btree ("day","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "agg_sales_daily_day_idx" ON "agg_sales_daily" USING btree ("day");--> statement-breakpoint
CREATE INDEX "cron_job_runs_name_idx" ON "cron_job_runs" USING btree ("job_name","started_at");