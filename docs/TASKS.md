# Tasks Checklist

Every task is sized to `<= 2 hours` of work. Tick `[x]` only after tests, typecheck, and lint pass.

## Phase 1: Foundation
- [ ] Initialize Next.js 15 + React 19 + TypeScript strict (`noUncheckedIndexedAccess`), pnpm scripts, ESLint, Prettier, Vitest, Playwright
- [ ] Install `@materializecss/materialize`, Drizzle ORM, `drizzle-kit`, Upstash Redis, Better-Auth, Zod, `lucide-react` / icons
- [ ] Implement `src/lib/env.ts` (Zod env validation) & `.env.example`
- [ ] Implement `src/lib/errors.ts` (`ActionResult<T>`, `ErrorCode`), `src/lib/logger.ts` (PII redaction), `src/lib/money.ts` (poisha math + BDT formatting)
- [ ] Implement `src/lib/crypto.ts` (AES-256-GCM encrypt/decrypt + key rotation support) with unit tests
- [ ] Configure `src/lib/db.ts` & `drizzle.config.ts` (PostgreSQL connection)
- [ ] Create RBAC & Auth Drizzle schema (`users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `sessions`, `accounts`, `audit_logs`, `otp_codes`) + initial migration
- [ ] Configure Upstash Redis client (`src/lib/redis.ts`) & sliding-window rate limiter with unit tests
- [ ] Configure Better-Auth (`src/lib/auth.ts`) with email/password, OAuth (`email_verified` guard), and TOTP MFA
- [ ] Implement RBAC service (`src/modules/rbac/service.ts`), Redis permission cache, and `super_admin` bypass + audit logging (TDD)
- [ ] Implement `src/lib/action.ts` (`createAction` wrapper: guard -> rateLimit -> Zod parse -> handler -> audit -> error map) with tests
- [ ] Implement route middleware (`src/middleware.ts`) & security headers in `next.config.ts`
- [ ] Build Admin UI shell (Materialize CSS layout, sidebar, topbar, toast, loading/empty/error states, `<Can perm>`)
- [ ] Build Admin Roles & Permissions matrix UI, Role CRUD, Duplicate Role, and User Role assignment
- [ ] Build Admin Audit Logs viewer (paginated, filtered, redacted diffs)
- [ ] Create Phase 1 seed script (`super_admin`, default roles, all `resource:action` permissions) & verify DoD

## Phase 2: Catalog, Media & SEO
- [ ] Create Catalog & SEO Drizzle schemas (`brands`, `categories`, `products`, `product_categories`, `product_images`, `product_options`, `variants`, `stock_movements`, `reviews`, `redirects`, `seo_settings`) + GIN FTS & partial indexes + migration
- [ ] Implement Media upload service (MIME allowlist, size limit, sharp re-encode, EXIF strip, Cloudinary/S3 adapter) with unit tests
- [ ] Implement Brand & Category services/validators/actions (materialized path / ltree tree + D&D reorder) with tests
- [ ] Implement Product & Variant matrix service (Shopify-style options -> combinations, default variant, slug history -> 301 redirect) with tests
- [ ] Implement Stock movement service (`stock_movements` log, atomic stock adjust) with tests
- [ ] Implement Redirects & SEO Settings service (relative-path-only validation on `redirects.to`) with tests
- [ ] Build Admin Brands & Categories (tree D&D) UI
- [ ] Build Admin Products list (server-paginated, search, filter, sort) UI
- [ ] Build Admin Product Create/Edit Shopify-style single-page form (Basic, Media upload/reorder, Pricing, Options/Variants table + bulk edit, SEO SERP preview)
- [ ] Build Admin Stock management & Redirects/SEO Settings UI
- [ ] Update seed script with sample brands, categories, products, variants & verify DoD

## Phase 3: Storefront, Cart & Checkout
- [ ] Create Sales, Shipping & Payment Drizzle schemas (`customers`, `addresses`, `carts`, `cart_items`, `orders`, `order_items`, `order_events`, `payment_providers`, `payments`, `refunds`, `shipping_zones`, `shipping_zone_areas`, `shipping_rates`, `shipping_settings`) + migration
- [ ] Implement Shipping Zone matcher service (thana > district > division > default, weight/price rates, global/zone free threshold) with unit tests
- [ ] Build Admin Shipping Zones CRUD, Rates CRUD, Global Settings, and Address Test Tool UI
- [ ] Build Admin Checkout Settings UI (Simple/Advanced/Both toggle, guest checkout, OTP threshold, COD limit, terms link)
- [ ] Implement Payment Adapter interface & COD, SSLCommerz, bKash, Nagad adapters (mocked HTTP unit tests + AES-256-GCM config)
- [ ] Implement Payment webhooks (`/api/webhooks/payment/{sslcommerz,bkash,nagad}`) with signature verify, idempotency, amount match & gateway status verify
- [ ] Build Admin Payment Providers CRUD, Transaction Log, & Refund UI
- [ ] Implement Cart service (guest `session_id` cart, user cart merge keeping higher qty, stock check) with tests
- [ ] Implement Phone OTP service (6-digit, 5m expiry, max 3 attempts, 3/phone/hr + IP rate limit, CAPTCHA trigger) with tests
- [ ] Build Storefront layout (Materialize CSS, `next/font`, header, search bar, cart drawer, footer)
- [ ] Build Storefront Home page, Category/Brand listing (cursor pagination, filters, sort), and Search page (FTS + suggest)
- [ ] Build Storefront PDP (gallery, variant selector, stock badge, reviews, JSON-LD Product/Breadcrumb)
- [ ] Build Storefront Simple Checkout & Advanced Multi-Step Checkout + Division/District/Thana cascade + OTP verify
- [ ] Build Order Success page (Guest->Account 1-click conversion) & `/track` OTP-gated order tracking page
- [ ] Implement `sitemap.ts`, `robots.ts`, Org/WebSite JSON-LD, GSC/FB verification meta tags & verify DoD

## Phase 4: Pricing Engine
- [ ] Create Pricing Drizzle schema (`campaigns`, `campaign_targets`, `campaign_rules`, `special_days`, `coupons`, `coupon_targets`, `coupon_redemptions`) + migration
- [ ] Implement pure `PriceEngine` service (`modules/pricing/service.ts`) with 100% unit test coverage (sale, campaign priority, special day, half-up rounding)
- [ ] Implement Coupon validation & redemption service (exists, status, window, min_cart, global/per-user limits, scope, stackable, concurrent tx lock) with tests
- [ ] Build Admin Coupons CRUD UI & Coupon Redemptions log
- [ ] Build Admin Campaigns (flash/circular/mega) & Special Days CRUD UI
- [ ] Wire `PriceEngine` into Cart & Checkout server-side re-pricing
- [ ] Implement `campaign.activate/expire` & `special_day.toggle` cron jobs + verify DoD

## Phase 5: Order Management, Courier & Fraud
- [ ] Create Courier & Fraud Drizzle schemas (`courier_providers`, `shipments`, `shipment_events`, `cod_settlements`, `fraud_rules`, `fraud_checks`, `blacklist`, `customer_courier_stats`) + migration
- [ ] Implement Order state machine & transition service (`pending->confirmed->processing->shipped->delivered|cancelled|returned|on_hold`, `order_events`, restock + coupon rollback) with unit tests
- [ ] Implement Fraud scoring engine (`blacklist_hit`, velocity, `courier_ratio`, `fake_phone`, `address_quality`, `high_cod_new`, `multi_account`, `qty_anomaly`) with unit tests
- [ ] Integrate Fraud check & stock `SELECT ... FOR UPDATE` into Checkout order placement
- [ ] Implement Courier Adapter interface & Steadfast, Pathao, RedX adapters (mocked HTTP unit tests + AES-256-GCM config)
- [ ] Implement Courier auto-select, fallback retry queue, & `/api/webhooks/courier/[provider]` webhook
- [ ] Implement COD settlement reconciliation service & `courier.sync_status` / `cod.reconcile` cron jobs
- [ ] Implement Invoice PDF & packing slip generator (single + bulk print)
- [ ] Build Admin Orders list (bulk status, bulk courier book), Order Detail/Timeline/Edit-before-ship/Partial Return UI
- [ ] Build Admin Fraud Queue (approve/reject), Rules weight editor, Blacklist CRUD UI
- [ ] Build Admin Courier Providers CRUD, Shipments list, & COD Settlements UI & verify DoD

## Phase 6: Notifications & Queue
- [ ] Create Notify Drizzle schema (`notification_events`, `notification_logs`, `push_tokens`) + migration
- [ ] Implement Event Bus (`emit(type, payload)`) & template renderer (Handlebars-like vars, Bangla SMS segment calculator) with unit tests
- [ ] Implement Email (Resend), SMS (SSL Wireless / BulkSMSBD), and Push (Firebase FCM) adapters with unit tests
- [ ] Implement Notification worker (exponential backoff, max 5 retries, dead-letter) & `notification.retry` cron
- [ ] Wire notification events across Order, Payment, Fraud, Stock, and Auth flows
- [ ] Build Admin Notification Templates (preview + test-send) & Delivery Logs UI + Storefront user channel preferences & verify DoD

## Phase 7: Abandon Cart & Marketing
- [ ] Create Marketing Drizzle schema (`segments`, `campaigns_marketing`, `templates`, `referrals`, `tracking_events`, `product_feeds`) + migration
- [ ] Implement Abandon Cart capture action, `abandon.scan` cron (1h/24h/72h, quiet hours 22:00-08:00 Asia/Dhaka), and signed `/cart/recover/[token]` + `RECOVER-xxxx` coupon (TDD)
- [ ] Implement Customer Segments query builder & Marketing Campaigns scheduler (A/B subject, throttle, unsubscribe)
- [ ] Implement Server-side FB CAPI (hashed advanced matching, `event_id` dedupe) + client GA4/FB Pixel/Google Ads/TikTok Pixel + UTM capture
- [ ] Implement Product Feeds (Google Merchant XML, FB Catalog CSV) cached route handlers + scheduled refresh
- [ ] Implement Referral codes, Wishlist, Back-in-stock alerts, & +3d post-delivery review request job
- [ ] Build Admin Segments, Marketing Campaigns, Referrals, & Tracking Settings UI & verify DoD

## Phase 8: Reports & Dashboards
- [ ] Create Report aggregate Drizzle schemas (`agg_sales_daily`, `agg_product_daily`, `agg_coupon_daily`, `agg_courier_daily`) + migration
- [ ] Implement `report.aggregate` cron job (hourly incremental + nightly full refresh) with tests
- [ ] Implement Report queries (Sales, Product, Category/Brand, Customer LTV/RFM/Cohort, Coupon ROI, Campaign, Courier, Fraud, Abandon recovery, Inventory valuation, Profit, Staff activity)
- [ ] Implement CSV / XLSX export utility
- [ ] Build Admin Dashboard (KPI cards + sparklines, 60s cache) & Reports UI (date-range + compare-period + export) & verify DoD

## Phase 9: Hardening, Performance & Docs
- [ ] Run security audit: verify `createAction` coverage, PII redaction, SSRF host allowlists, headers, and `pnpm audit` clean
- [ ] Create Faker seed script (500 products, 5k orders) & benchmark queries
- [ ] Run `pnpm lighthouse` (>= 95 SEO/Perf/A11y, LCP < 2s, CLS < 0.05) & `pnpm rich-results` JSON-LD validation; fix regressions
- [ ] Write Playwright E2E suite (browse -> cart -> coupon -> checkout -> admin confirm -> ship -> deliver + `/track`)
- [ ] Write `README.md`, `docs/ARCHITECTURE.md`, `docs/RUNBOOK.md`, `docs/API-WEBHOOKS.md` & verify final DoD
