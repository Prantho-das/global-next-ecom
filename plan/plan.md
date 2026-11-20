# ROLE
Senior full-stack engineer. Build production-grade e-commerce platform. Optimize for speed, correctness, maintainability.

# FIRST STEPS (mandatory)
1. Read skill `easy-admin-by-prantho` (SKILL.md). Follow for admin UI. Materialize CSS = design system for ALL UI.
2. Read this file fully. Produce `docs/PLAN.md` (arch, ERD, task list). Wait for approval before coding.
3. Work ONE phase at a time. After each phase: run checks, summarize diff, stop.

# STACK (fixed, no substitutions without asking)
- Next.js 15 App Router, React 19, TypeScript strict
- Mutations: Server Actions only. Reads: RSC + `unstable_cache`/`use cache` + `revalidateTag`
- DB: PostgreSQL + Drizzle ORM + drizzle-kit migrations
- Cache/rate-limit: Redis (Upstash). Queue/cron: Inngest or BullMQ
- Auth: Better-Auth. RBAC: `resource:action` permissions
- Validation: Zod (shared client+server)
- UI: `@materializecss/materialize` + skill conventions. No Tailwind/shadcn
- Email: Resend. SMS: SSL Wireless/BulkSMSBD adapter. Push: Firebase FCM
- Courier: Steadfast, Pathao, RedX (adapter pattern)
- Media: Cloudinary/S3 + `next/image`
- Test: Vitest (unit), Playwright (e2e critical flow)
- Pkg mgr: pnpm

# SCOPE
Catalog: product, variant, category(tree), brand, attributes, stock
Pricing: sale → circular discount(campaign) → special-day promo → coupon (fixed priority)
Coupon: %/flat/free-ship, min cart, global+per-user limit, expiry, scope(product/category/brand)
SEO: generateMetadata, sitemap.ts, robots.ts, JSON-LD (Product/Breadcrumb/Org/FAQ), canonical, OG/Twitter, slug, 301 redirect table, hreflang-ready
Order: pending→confirmed→processing→shipped→delivered|cancelled|returned, timeline log, invoice PDF
Courier: booking, tracking webhook, COD reconcile, provider fallback
Fraud: phone/IP/device velocity, blacklist, courier success ratio, risk score, manual-review hold
Marketing: email/SMS campaign, segments, UTM, referral, FB Pixel+CAPI, GA4, product feeds
Abandon cart: snapshot → 1h/24h/72h flow → email/SMS/push + recovery link + auto coupon
Notification: event bus → channel adapters, templates, delivery log, retry
Reports: sales, product, category, customer(LTV/RFM), coupon ROI, courier perf, fraud, abandon recovery
RBAC: roles, permissions, user-role, guard in action + UI + route

# ARCHITECTURE
```
src/
├─ app/
│  ├─ (store)/            # public storefront
│  ├─ (admin)/admin/      # admin panel
│  └─ api/webhooks/{courier,sms,fcm,payment}/route.ts
├─ modules/<domain>/      # catalog|pricing|order|courier|fraud|marketing|notify|report|rbac
│  ├─ schema.ts           # Drizzle tables
│  ├─ validators.ts       # Zod
│  ├─ queries.ts          # read, cached, server-only
│  ├─ actions.ts          # "use server" thin layer
│  ├─ service.ts          # business logic, pure where possible
│  ├─ types.ts
│  └─ __tests__/
├─ lib/{db,redis,auth,guard,queue,logger,env,errors}.ts
├─ components/{ui,admin,store}/
└─ config/
```
Layering: `action → guard → validate → service → db`. No DB call in components/actions directly. Services never import from `next/*`.

# CODE STANDARDS (strict)
- TS: `strict`, `noUncheckedIndexedAccess`, no `any`, no non-null `!`, `import type` for types
- ESLint (next/core-web-vitals + typescript-eslint strict + import/order) + Prettier. Zero warnings
- Naming: files `kebab-case`, comps `PascalCase`, fns `camelCase`, consts `SCREAMING_SNAKE`, DB `snake_case`
- Named exports only (except Next special files). One responsibility per file. Max ~150 lines/file, ~30 lines/fn
- Env: validate with Zod in `lib/env.ts`. Never read `process.env` elsewhere
- Money: integer minor units (poisha). Never float. Currency util in `lib/money.ts`
- Dates: store UTC `timestamptz`. Display `Asia/Dhaka`
- IDs: UUIDv7 / cuid2. Soft delete (`deleted_at`) for catalog/order
- Every table: `id, created_at, updated_at`. Index FK + filter + sort cols
- Comments: why, not what. TSDoc on public service fns
- No dead code, no `console.log` (use `logger`), no magic numbers

# SERVER ACTION CONTRACT
Return typed result, never throw to client:
```ts
// lib/errors.ts
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; message: string; fieldErrors?: Record<string, string[]> };

export type ErrorCode =
  | "VALIDATION" | "UNAUTHORIZED" | "FORBIDDEN"
  | "NOT_FOUND" | "CONFLICT" | "RATE_LIMITED" | "INTERNAL";
```
```ts
// lib/action.ts — wrap every action
export function createAction<I, O>(opts: {
  permission?: string;
  schema: z.ZodType<I>;
  rateLimit?: { key: string; limit: number; windowSec: number };
  handler: (input: I, ctx: { userId: string | null }) => Promise<O>;
}) {
  return async (raw: unknown): Promise<ActionResult<O>> => { /* guard → rateLimit → parse → handler → map errors → log */ };
}
```
Rules: all actions use `createAction`. Auth+permission check first. Zod parse second. Audit-log every admin mutation (`audit_logs`). `revalidateTag` after write.

# PERFORMANCE
- Storefront: RSC + tag cache; PPR/Suspense for cart/user parts
- Zero client JS where possible. Materialize JS init only on admin comps that need it
- Admin reports: aggregate tables/materialized views refreshed by cron. No heavy live query
- Pagination: cursor-based. No `SELECT *`. No N+1 (use joins/`with`)
- Image AVIF/WebP, `priority` hero only. Font `next/font`
- Targets: LCP < 2s, CLS < 0.05, Lighthouse ≥ 95 (SEO/Perf/A11y)

# SECURITY
- CSRF safe via Server Actions origin check. Rate-limit auth, checkout, coupon-apply, OTP request/verify (phone AND IP), password reset, review submit, search
- Webhook: verify signature, idempotency key, replay protection
- Sanitize rich text. Parameterized queries only. Secrets via env only
- Fraud hold before courier booking. PII never in logs, anywhere (not just fraud) — redact password/token/card fields before writing `audit_logs.diff` or `payments.raw_response`
- **OAuth auto-link**: only auto-link Google/Facebook account to existing email if provider claims `email_verified = true`. Never auto-link on unverified email (account-takeover vector)
- **Media upload**: allowlist MIME types (jpg/png/webp/avif only, no svg/html), max file size, re-encode on server (don't trust client-reported type), strip EXIF
- **Secrets at rest**: `courier_providers.config` / `payment_providers.config` encrypted with AEAD (e.g. AES-256-GCM) using a key from `lib/env.ts`, never DB-level "enc" convention alone. Document key rotation procedure
- **Payment verify**: never trust IPN/webhook amount alone — compare against server-stored order total; for SSLCommerz/bKash also call the gateway's transaction-status/search API as second confirmation before marking paid
- **Redirect table**: `redirects.to` must be validated as same-origin relative path only — never allow absolute external URLs (open-redirect/phishing vector)
- **OTP/SMS abuse**: rate-limit by IP *and* phone; require CAPTCHA (hCaptcha/Turnstile) after N requests to prevent SMS-pumping/toll fraud
- **Admin MFA**: TOTP-based 2FA required for `super_admin` and recommended for all admin roles; super_admin bypass of permission checks still fully audit-logged
- **Order tracking**: `/track` must not reveal whether a phone/order combo exists before OTP verification — always return a generic "OTP sent if valid" response
- **Headers**: CSP, HSTS, X-Content-Type-Options, Referrer-Policy, X-Frame-Options set in `next.config`/middleware
- **SSRF**: validate/allowlist outbound hosts for courier/payment adapter calls; never fetch arbitrary user-supplied URLs server-side
- **Dependency scanning**: `pnpm audit` (or Snyk) run as part of each phase's Definition of Done

# GIT / WORKFLOW RULES
- Branch per phase: `feat/phase-N-<name>`. Commits: Conventional Commits (`feat(catalog): add variant schema`)
- Small atomic commits. Commit locally only.
- NEVER `git push`. NEVER deploy. NEVER touch CI/CD, hosting, or prod env
- Never run destructive DB cmd (`drop`, `truncate`, `migrate reset`) without explicit approval
- Ask before adding any dependency not in stack

# DEFINITION OF DONE (per phase)
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm audit` pass
- [ ] Migration generated + reviewed, seed updated
- [ ] Permissions registered + admin UI guarded
- [ ] SEO/meta done for new public pages
- [ ] Loading/empty/error states present
- [ ] A11y: labels, focus, aria
- [ ] Phase summary: files changed, decisions, open questions

# PHASES
1. Foundation: env, db, auth, RBAC, audit log, action wrapper, admin layout (skill + Materialize)
2. Catalog: product/variant/category/brand/stock + media + SEO
3. Storefront: list/filter/search, detail, cart, checkout (COD)
4. Pricing: coupon, circular discount, special-day, price engine + tests
5. Order + courier + fraud
6. Notify: email/SMS/FCM + queue + templates
7. Abandon cart + marketing + tracking pixels/feeds
8. Reports + dashboards
9. Hardening: perf, security audit, e2e, docs

---

# DETAILED SPEC (addendum)
Conflict → detailed spec wins. Missing detail → ask, never guess.

## 0. WORKING PROTOCOL
- Create `docs/TASKS.md`: checklist per phase, each task ≤ 2h. Tick as done.
- Create `docs/DECISIONS.md`: ADR log (context, decision, tradeoff).
- Per task: write test first for service logic → impl → typecheck/lint/test → commit.
- Unclear req → append to `docs/QUESTIONS.md`, continue other task, do not block.
- Stop at end of each phase. Print summary + next-phase plan.

## 1. DATABASE (Drizzle, snake_case, all: id/created_at/updated_at)
**rbac**: users, roles, permissions, role_permissions, user_roles, sessions, accounts, audit_logs(actor_id, action, entity, entity_id, diff jsonb, ip)
**catalog**: brands, categories(parent_id, path ltree/materialized path, depth), products(slug uniq, status draft|active|archived, brand_id, base_price, sale_price, compare_at_price, seo jsonb, has_variants bool, deleted_at), product_categories, product_images(product_id, url, alt, position, variant_ids jsonb nullable), product_options(product_id, name e.g. "Size"/"Color", position, values jsonb e.g. ["S","M","L"]), variants(product_id, sku uniq, price, compare_at_price, stock, weight_g, barcode, option_values jsonb e.g. {"Size":"M","Color":"Red"}, image_id nullable, is_default bool), stock_movements(variant_id, delta, reason, ref_type, ref_id), reviews
**pricing**: campaigns(type flash|circular|mega, starts_at, ends_at, priority, status), campaign_targets(campaign_id, scope product|category|brand|all, target_id), campaign_rules(discount_type pct|flat, value, max_discount, stock_cap), special_days(name, starts_at, ends_at, banner, rule_id), coupons(code uniq ci, type pct|flat|free_ship, value, min_cart, max_discount, usage_limit, per_user_limit, starts_at, expires_at, scope, stackable bool, status), coupon_targets, coupon_redemptions(coupon_id, user_id, order_id, amount)
**auth**: otp_codes(phone, code, purpose login|checkout_verify, expires_at, attempts, verified_at)
**sales**: customers(user_id nullable, phone uniq, email, name, is_guest bool), addresses(division, district, thana, line, is_default), carts(session_id/user_id, status active|abandoned|recovered|converted|merged, last_activity_at), cart_items, orders(number uniq, customer_id, status, payment_status pending|paid|partially_refunded|refunded|failed, subtotal, discount_total, shipping_fee, total, coupon_id, risk_score, risk_level, ip, user_agent, utm jsonb, idempotency_key uniq), order_items(price snapshot, name snapshot, sku snapshot), order_events(order_id, from, to, actor, note), payments(order_id, method cod|bkash|nagad|sslcommerz, gateway_provider, status pending|processing|completed|failed|refunded, txn_id, gateway_txn_id, amount, refunded_amount, currency BDT, raw_response jsonb, paid_at), refunds(payment_id, order_id, amount, reason, status pending|processed|failed, gateway_refund_id, processed_at)
**payment**: payment_providers(code sslcommerz|bkash|nagad|cod, name, config enc jsonb, is_active, position — display order, sandbox_mode bool)
**shipping**: shipping_zones(name, type flat|weight|price_based, is_default), shipping_zone_areas(zone_id, division, district, thana nullable — granular match), shipping_rates(zone_id, name e.g. "Standard"/"Express", min_weight_g, max_weight_g, min_cart_amount, max_cart_amount, price, estimated_days_min, estimated_days_max, is_free_above nullable — free shipping threshold), shipping_settings(free_shipping_global_threshold, default_weight_g)
**courier**: courier_providers(code, config enc, status), shipments(order_id, provider, consignment_id, tracking_code, status, cod_amount, cod_collected, fee, raw jsonb), shipment_events, cod_settlements
**fraud**: fraud_rules(key, weight, enabled, config jsonb), fraud_checks(order_id, score, signals jsonb, decision), blacklist(type phone|ip|email|device|address, value, reason, expires_at), customer_courier_stats(phone, delivered, returned, cancelled)
**marketing**: segments(name, rules jsonb), campaigns_marketing(channel, template_id, segment_id, scheduled_at, status, stats jsonb), templates(channel, key, subject, body, vars), referrals, tracking_events(order_id, platform, event_id, sent_at, status), product_feeds
**notify**: notification_events(type, payload), notification_logs(channel, to, template, status, provider_id, error, attempts), push_tokens(user_id, token, platform)
**seo**: redirects(from uniq, to, code 301|302, hits), seo_settings
**report**: agg_sales_daily, agg_product_daily, agg_coupon_daily, agg_courier_daily (refreshed by cron)
Indexes: FK cols, `orders(status, created_at)`, `orders(customer_id)`, `products(status, category via join)`, `variants(sku)`, GIN FTS on products(name, description). Partial index on `deleted_at IS NULL`.

## 2. PRICE ENGINE (`modules/pricing/service.ts`, pure, 100% unit tested)
Pipeline per line item (integer poisha):
1. base = variant.price
2. sale_price override if set and < base
3. best active campaign (by priority DESC, then highest discount). ONE campaign per item, no stacking
4. special-day rule if active and not already discounted deeper (take max discount, no stack)
5. line_total = unit × qty
Cart level:
6. coupon validation order: exists → status → date window → min_cart → global limit → per-user limit → scope match → stackable check
7. coupon discount applies only to eligible lines; cap by `max_discount`; never below 0
8. free_ship coupon zeroes shipping_fee
9. shipping = match customer address → zone → applicable rate (by weight or cart amount). Multiple rates per zone (Standard/Express). Free shipping if cart ≥ zone threshold or global threshold.
10. total = subtotal − coupon + shipping
Rounding: half-up per line, once. Tests: stacking, caps, expiry edge (inclusive start, exclusive end), concurrent redemption (DB tx + unique constraint), zero/negative guard.
Return full breakdown object `PriceBreakdown` for UI + order snapshot.

## 3. ORDER FLOW
- Checkout action: idempotency key → re-price server side (never trust client) → stock reserve in tx (`SELECT … FOR UPDATE`) → fraud check → create order → emit `order.created`.
- Risk: low → auto-confirm. medium → confirm + SMS verify. high → status `on_hold` (manual review).
- Transitions guarded by state machine map; illegal transition → `CONFLICT`. Every transition writes `order_events`.
- Cancel/return → restock via `stock_movements`. Coupon redemption rolled back on cancel.
- Invoice PDF + packing slip + bulk print.
- Admin: bulk status, bulk courier booking, internal notes, edit items before ship, partial return.

### Guest & Auth Flow
- **Guest checkout**: phone + name + address → order. No account required. Phone OTP verify at checkout (BD SMS).
- **Cart merge on login**: guest `session_id` cart items merge into user cart. Conflict (same variant) → keep higher qty. Old guest cart marked `merged`.
- **Guest → account conversion**: after successful order, show "Create account to track orders" prompt. Pre-fill phone/email/name from order. One-click with password set.
- **Order tracking without login**: `/track?phone=01XXXXXXXXX&order=ORD-XXXXX` → OTP verify phone → show order status/timeline. No account needed.
- **Phone OTP**: 6-digit, expires 5 min, max 3 attempts, rate-limit 3 OTP/phone/hour. Used for: guest checkout verify, login, order tracking, password reset.
- **Social login**: Google + Facebook via Better-Auth providers. Auto-link if same email exists.

## 4. COURIER (adapter pattern)
```ts
export interface CourierAdapter {
  readonly code: "steadfast" | "pathao" | "redx";
  book(input: BookingInput): Promise<BookingResult>;
  track(consignmentId: string): Promise<TrackingResult>;
  cancel(consignmentId: string): Promise<void>;
  parseWebhook(req: Request): Promise<NormalizedEvent>; // verify signature inside
  getBalance?(): Promise<number>;
}
```
- Registry by code. Config from `courier_providers` (encrypted).
- Auto-select rule: zone + success rate + admin default. Fallback on API fail (retry 3, backoff, then next provider).
- Webhook: signature verify → idempotent upsert → map to internal status → update order → notify.
- COD: collected amount per shipment, settlement batch, mismatch report.
- Courier call only after fraud decision ≠ hold. Run in queue, not in request.

## 4.5. PAYMENT GATEWAY (adapter pattern, like courier)
```ts
export interface PaymentAdapter {
  readonly code: "sslcommerz" | "bkash" | "nagad";
  initiate(input: PaymentInput): Promise<PaymentInitResult>;  // returns redirect URL or token
  verify(params: Record<string, string>): Promise<PaymentVerifyResult>;  // IPN/callback verify
  refund(input: RefundInput): Promise<RefundResult>;
  parseWebhook(req: Request): Promise<NormalizedPaymentEvent>;  // IPN handler, verify signature
  getTransactionStatus?(txnId: string): Promise<TransactionStatus>;
}
```

### SSLCommerz
- Init: server-side session API → redirect to SSLCommerz hosted page → customer pays (card/MFS/bank) → redirect back
- IPN (Instant Payment Notification): webhook to `/api/webhooks/payment/sslcommerz` → verify hash → update payment status
- Success/Fail/Cancel URL handling
- Refund API: full + partial refund
- Sandbox mode for dev/testing
- Supported: Visa, Mastercard, AMEX, bKash (via SSLCommerz), Nagad (via SSLCommerz), bank transfer, mobile banking

### bKash (Tokenized — direct API)
- Create payment → returns bKash deeplink/redirect → customer authorizes → execute payment → callback
- Tokenized checkout: save customer bKash agreement for one-tap future payments
- Refund API
- Webhook: payment success/fail notification
- Search transaction API for reconciliation

### Nagad (direct API)
- Initialize → decrypt challenge → complete payment → callback
- Redirect flow: customer verifies on Nagad app/USSD → redirect back
- Refund API
- Verify payment status API

### Payment Flow (shared)
- Checkout → select method → `initiate()` → redirect/popup → customer pays → callback/IPN → `verify()` → update `payments` table → update `order.payment_status` → emit `payment.received` → notify
- COD: no gateway call, payment_status = `pending` until delivery confirmed
- Double-payment guard: idempotency key on payment record
- Failed payment: retry link sent via SMS/email, order held 30 min before auto-cancel
- Refund: admin initiates → `refund()` → gateway processes → webhook confirms → update `refunds` table → partial/full refund amount tracked
- Admin UI: payment providers CRUD (enable/disable, config, sandbox toggle, display order), transaction log, refund management, reconciliation report

## 5. FRAUD ENGINE
Rules (weight configurable in DB, sum → score 0–100):
| Key | Signal | Weight |
|---|---|---|
| blacklist_hit | phone/ip/email/device/address match | 100 |
| phone_velocity | >3 orders / 24h same phone | 25 |
| ip_velocity | >5 orders / 1h same IP | 20 |
| courier_ratio | past success < 60% (min 3 orders) | 30 |
| fake_phone | invalid BD format / repeated digits | 20 |
| address_quality | too short / gibberish | 10 |
| high_cod_new | new customer + COD > threshold | 15 |
| multi_account | same device many phones | 20 |
| qty_anomaly | qty > N single SKU | 10 |
Thresholds: <30 low, 30–59 medium, ≥60 high. Store `signals` jsonb for explainability. Admin: review queue, approve/reject, add to blacklist, rule weight editor. Feedback loop: returned/cancelled updates `customer_courier_stats`.

## 6. ABANDON CART
- Capture: cart + (phone|email) when entered at checkout step 1. Debounced server action.
- Cron (every 10 min): carts idle ≥ 1h, not converted → flow.
- Flow: T+1h email/push → T+24h SMS + coupon `RECOVER-xxxx` (single-use, 48h) → T+72h final email.
- Recovery link `/cart/recover/[token]` (signed, expiring) → restore cart + apply coupon.
- Stop flow on purchase. Respect opt-out + quiet hours (22:00–08:00 Asia/Dhaka).
- Track: sent, opened, clicked, recovered revenue → report.

## 7. NOTIFICATIONS
Event bus: `emit(type, payload)` → handler resolves template+channels → enqueue per channel → adapter → log → retry (exp backoff, max 5) → dead-letter.
Events: order.created|confirmed|shipped|delivered|cancelled|returned|on_hold, payment.received, cart.abandoned, coupon.issued, stock.low, fraud.flagged, user.registered, password.reset.
Channel matrix: customer (email+SMS+push), admin (email+push+in-app). User-level channel preferences. Templates: DB-stored, Handlebars-like vars, preview + test-send in admin. BD SMS: unicode (Bangla) segment calc, masking sender ID.
Firebase: token register/refresh/cleanup invalid tokens, topic broadcast.

## 8. MARKETING
- Segments: rule builder (spent, orders, last_order_days, category, city, tag) → saved query.
- Campaigns: schedule, A/B subject, throttle, unsubscribe link, stats.
- Tracking: GA4 + FB Pixel (client) + FB CAPI (server, dedupe via `event_id`) + Google Ads GTAG conversion + TikTok Pixel. Events: ViewContent, AddToCart, InitiateCheckout, Purchase, CompleteRegistration, Search, ViewCategory.
- FB CAPI advanced matching: hash(email, phone, name, city, country) sent server-side for better attribution.
- Google Ads: purchase conversion tag, dynamic remarketing tag (product ID, value, currency).
- UTM capture first+last touch → saved on order.
- Feeds: Google Merchant XML (product, price, availability, GTIN, shipping, tax), FB catalog CSV (id, title, description, link, image_link, price, availability), route handler cached + scheduled refresh.
- Referral code, wishlist, back-in-stock alert, review request after delivery (+3d).
- Bundle/upsell/cross-sell blocks, recently viewed.

## 9. SEO CHECKLIST
`generateMetadata` on every public route; canonical; OG/Twitter; `sitemap.ts` (chunked, products/categories/brands/pages); `robots.ts` (block cart/checkout/admin/search params); JSON-LD: Product(+Offer, AggregateRating), BreadcrumbList, Organization, WebSite+SearchAction, FAQPage; slug history → 301 via `redirects`; faceted-nav `noindex` + canonical to base; pagination rel handling; image alt required; semantic HTML, one H1; admin SEO editor per entity with SERP preview + char counters; Core Web Vitals budget enforced in CI-less local script `pnpm lighthouse`.
Google Search Console: verification meta tag (admin settings এ configurable). Facebook Domain Verification: meta tag (admin settings এ configurable). Google Rich Results: dev script `pnpm rich-results` to validate JSON-LD output against Google structured data specs.

## 10. RBAC
Roles: fully dynamic. Admin creates/edits/deletes roles from UI. Only `super_admin` is system-protected (cannot delete/rename, always has full access). Default seed roles (`admin`, `manager`, `order_staff`, `catalog_staff`, `marketing`, `support`, `accountant`) created on first setup — all editable/deletable by super_admin.
Role schema: `roles(id, name uniq, slug uniq, description, is_system bool, created_at, updated_at)`. `is_system = true` only for `super_admin`.
Permission format `resource:action`. Resources: product, category, brand, stock, order, customer, coupon, campaign, courier, fraud, marketing, notification, report, seo, user, role, setting, audit.
Actions: `view|create|update|delete|export|approve` (+ resource-specific e.g. `order:bulk_ship`, `report:financial`).
Admin UI: role CRUD + permission matrix (resource × action checkbox grid). Duplicate role. Assign multiple roles to user.
Enforce 3 layers: route middleware, action guard (`createAction.permission`), UI (`<Can perm>` hides). Permission cache in Redis, bust on role change. Super admin bypass. Audit all role changes (create/update/delete/assign).

## 11. REPORTS (aggregate tables, date-range + compare-period + CSV/XLSX export)
Sales (day/week/month, channel, payment), Product (top/slow/stock-out), Category/Brand, Customer (new vs repeat, LTV, RFM, cohort), Coupon ROI, Campaign performance, Courier (delivery rate, avg days, return rate, COD pending), Fraud (flagged, blocked, saved amount), Abandon recovery, Inventory valuation, Profit (needs cost_price on variants), Staff activity.
Dashboard: KPI cards + sparkline, cached 60s.

## 12. JOBS / CRON (Inngest/BullMQ)
| Job | Schedule |
|---|---|
| campaign.activate/expire | every 1 min |
| special_day.toggle | every 5 min |
| abandon.scan | every 10 min |
| courier.sync_status | every 30 min |
| cod.reconcile | daily 02:00 |
| report.aggregate | hourly + nightly full |
| stock.low_alert | hourly |
| sitemap.revalidate | daily |
| notification.retry | every 5 min |
| cleanup (expired carts/tokens) | daily |
All jobs idempotent, logged, observable.

## 13. ADMIN UI (Materialize + skill)
Pages: dashboard, products(list/create/edit — Shopify-style), categories(tree dnd), brands, stock, orders(list/detail/timeline/bulk), customers, coupons, campaigns, special-days, courier(providers/shipments/COD), fraud(queue/rules/blacklist), marketing(segments/campaigns/templates), notifications(logs), reports, SEO(redirects/meta), users/roles/permissions, settings(general/shipping/payment/checkout/tracking ids), audit log.
Pattern: server-paginated data table (search, filter, sort, column toggle, export), URL-synced state, optimistic UI where safe, toast + inline field errors from `ActionResult`.

### Shipping Zone Config (Admin Settings → Shipping)
- Zone CRUD: name, type (flat/weight-based/price-based), set as default
- Zone areas: assign division → district → thana (multi-select, granular). Visual map optional.
- Rates per zone: add multiple rates (e.g. "Standard ৳60, 2-3 days" / "Express ৳120, 1 day"). Fields: name, price, min/max weight, min/max cart amount, estimated days, free shipping above threshold.
- Default zone: catch-all for unmatched addresses
- Global free shipping threshold (overrides zone-level)
- Test tool: enter address → see which zone matches + available rates

### Checkout Settings (Admin Settings → Checkout)
- Toggle: Simple checkout / Advanced checkout / Both (let customer choose)
- Guest checkout: enable/disable
- OTP verification: enable/disable, required above cart amount threshold
- COD: enable/disable, max COD amount limit
- Min order amount
- Terms & conditions checkbox: enable + link to page
- Order note field: show/hide

### Product Create/Edit UX (Shopify-style)
Single-page form, sections:
1. **Basic Info**: title (auto-generates slug, editable), rich-text description, status (draft/active/archived), brand, categories (multi-select)
2. **Media**: drag-drop multi-upload, reorder by drag, alt text per image, set featured image. Cloudinary/S3 upload with progress bar
3. **Pricing** (for simple product): base price, compare-at price (shows strikethrough on storefront), sale price
4. **Options & Variants** (Shopify-flow):
   - Toggle "This product has variants" → reveals option builder
   - Add option (e.g. "Size") → type comma-separated values ("S, M, L") or add one-by-one with chips
   - Max 3 options (like Shopify). Add another option → "Color" → "Red, Blue"
   - Variants auto-generated from option combinations (S-Red, S-Blue, M-Red, M-Blue, etc.)
   - Variant table: inline-editable price, compare-at, SKU, barcode, stock, weight per variant
   - Bulk edit: select multiple variants → edit price/stock together
   - Per-variant image: click variant row → pick from uploaded media
   - Remove specific variants (uncheck combinations you don't sell)
   - Reorder options → variants regenerate (with confirmation if data exists)
   - Simple product (no variants) → single default variant auto-created behind the scenes, user sees flat price/stock/SKU fields
5. **SEO**: slug, meta title (char counter 60), meta description (char counter 160), OG image, SERP preview live
6. **Organization**: tags, vendor, product type (for filtering/feeds)

## 14. STOREFRONT
Home (banners, campaigns countdown, featured), category/brand listing (filters, sort, cursor pagination), search (FTS + suggest), PDP (variants, gallery, stock, related, reviews), cart (drawer + page), order success/track, account (orders, addresses, wishlist, profile edit, password change). Mobile-first. Bangla/English i18n-ready (`next-intl`) — ask before adding.
- **Guest order track page**: `/track` → enter phone + order number → OTP verify → order status + timeline + courier tracking link.
- **Post-checkout**: order success page → "Create account?" CTA (pre-filled) + order summary + estimated delivery.

### Checkout (Simple & Advanced mode — admin toggleable from settings)

**Simple Checkout** (default, single-page, BD-optimized):
1. Phone number input → auto-detect returning customer → pre-fill name/address
2. Name + Address (division → district → thana dropdown cascade + address line)
3. Shipping method selection (rates from matched zone, show estimated days + price)
4. Order note (optional)
5. Payment: COD (default) / bKash / Nagad / Card
6. Order summary sidebar (items, price breakdown, coupon apply field)
7. Place order button → OTP verify (if guest + configurable) → submit
- No account required. Phone = customer identity. Minimal fields, max conversion.

**Advanced Checkout** (multi-step, full-featured):
- Step 1: Contact — phone/email, login prompt if account exists, guest continue
- Step 2: Shipping address — saved addresses (logged-in) or new address form (division/district/thana cascade), address book save checkbox
- Step 3: Shipping method — available rates for zone, estimated delivery date, express option
- Step 4: Payment — COD / bKash / Nagad / Card, promo code / coupon apply
- Step 5: Review & confirm — full summary, edit links per step, terms checkbox, place order
- Progress bar top. Each step validated before next. Back navigation preserves state.

**Shared checkout features** (both modes):
- Server-side re-price on submit (never trust client)
- Coupon apply with live discount preview
- Stock check real-time (show "Only X left" warning)
- Shipping fee live-update on address change
- Estimated delivery date based on zone + courier
- Order idempotency key (prevent double-submit)
- Address auto-save for logged-in users

## 15. TESTING
- Unit (Vitest): price engine, coupon validation, fraud scoring, state machine, adapters (mock HTTP).
- Integration: actions against test Postgres (testcontainers/docker, never prod DB).
- E2E (Playwright): browse → cart → coupon → checkout → admin confirm → ship → deliver.
- Seed script: faker, 500 products, 5k orders for perf testing.
- Coverage gate: services ≥ 85%.

## 16. EXTRA DELIVERABLES
`README.md` (setup, env table, scripts), `.env.example`, `docs/ARCHITECTURE.md`, `docs/ERD.md` (Mermaid), `docs/RUNBOOK.md` (jobs, webhooks, failure handling), `docs/API-WEBHOOKS.md`. Scripts: `db:generate|migrate|seed`, `typecheck`, `lint`, `test`, `test:e2e`, `lighthouse`.

# START
1. Read skill + this full plan.
2. Output: `docs/PLAN.md`, `docs/ERD.md`, `docs/TASKS.md`, `docs/QUESTIONS.md`.
3. List assumptions + risks + open questions. STOP. Await approval.
