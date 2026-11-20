# AGENT-PROMPTS.md
Copy-paste prompts to build this project with **any** AI coding agent (Cursor, Copilot Workspace, Windsurf, plain ChatGPT/Claude in a terminal, etc.) — not just Claude Code. Most agents have no persistent memory across sessions, so every prompt below is self-contained: it repeats the stack/standards recap each time so the agent doesn't drift.

## How to use this file
1. Open a **new chat/session per phase**. Don't paste all phases at once — the agent will do a worse job trying to hold 9 phases in its head.
2. Paste the **"Global context" block** once at the start of every phase's session, then the phase's own prompt right after it.
3. After the agent finishes a phase, review the diff yourself (or ask a second agent/your own Claude Code session to review it) before starting the next phase's session.
4. If the agent asks a question instead of guessing, answer it before moving on — don't let it silently assume.
5. Never let the agent push to a remote, run destructive DB commands, or touch CI/CD/hosting — add that restriction explicitly if the agent you're using doesn't already respect it.

---

## GLOBAL CONTEXT (paste at the top of every phase session)

```
You are a senior full-stack engineer building a production-grade e-commerce
platform for the Bangladesh market. Full spec lives in plan.md in this repo —
read it fully before writing any code.

STACK (fixed, do not substitute):
- Next.js 15 App Router, React 19, TypeScript strict
- Mutations: Server Actions only. Reads: RSC + unstable_cache/use cache + revalidateTag
- DB: PostgreSQL + Drizzle ORM + drizzle-kit migrations
- Cache/rate-limit: Redis (Upstash). Queue/cron: Inngest or BullMQ
- Auth: Better-Auth. RBAC: resource:action permissions
- Validation: Zod (shared client+server)
- UI: @materializecss/materialize. No Tailwind/shadcn
- Email: Resend. SMS: SSL Wireless/BulkSMSBD adapter. Push: Firebase FCM
- Courier: Steadfast, Pathao, RedX (adapter pattern)
- Payment: SSLCommerz, bKash, Nagad, COD (adapter pattern)
- Media: Cloudinary/S3 + next/image
- Test: Vitest (unit), Playwright (e2e)
- Package manager: pnpm

LAYERING (never skip a layer):
action -> guard (permission check) -> validate (Zod) -> service (business logic) -> db
Services never import from next/*. No DB calls in components or actions directly.

CODE STANDARDS:
- strict TS, noUncheckedIndexedAccess, no any, no non-null !, import type for types
- ESLint zero warnings, Prettier
- kebab-case files, PascalCase components, camelCase functions, SCREAMING_SNAKE consts, snake_case DB
- Named exports only. One responsibility per file. ~150 lines/file, ~30 lines/fn max
- Money = integer minor units (poisha), never float
- Dates stored UTC timestamptz, displayed Asia/Dhaka
- Every table has id, created_at, updated_at. Soft delete (deleted_at) for catalog/order
- No console.log (use logger), no magic numbers, no dead code

SECURITY (non-negotiable, see plan.md SECURITY section for full list):
- Every Server Action wrapped in createAction (permission -> rate-limit -> Zod parse -> handler)
- Audit-log every admin mutation
- Webhooks: verify signature + idempotency key, never trust payload amount alone for payments
- Rate-limit auth, checkout, coupon-apply, OTP request/verify (by phone AND IP), password reset
- OAuth auto-link only if provider email_verified = true
- Media upload: allowlist MIME types, max size, re-encode server-side, strip EXIF
- Secrets at rest (courier/payment provider config) encrypted with AES-256-GCM, key from env
- Redirect table: internal relative paths only, never external absolute URLs
- No PII/secrets in logs or audit diffs — redact before writing

WORKFLOW RULES:
- Branch per phase: feat/phase-N-<name>. Conventional Commits. Commit locally only.
- NEVER git push. NEVER deploy. NEVER touch CI/CD or prod env.
- Never run destructive DB commands (drop/truncate/migrate reset) without explicit approval.
- Ask before adding any dependency not already in the stack list above.
- Write the test for service logic BEFORE implementing it, where logic is non-trivial.

DEFINITION OF DONE for this phase (do not report "done" until all pass):
- [ ] pnpm typecheck && pnpm lint && pnpm test && pnpm audit all pass
- [ ] Migration generated + reviewed, seed updated if schema changed
- [ ] Permissions registered + admin UI guarded (route + action + UI) if admin feature
- [ ] SEO/meta done for any new public page
- [ ] Loading / empty / error states present for any new UI
- [ ] Basic a11y: labels, focus order, aria attributes
- [ ] End with a written summary: files changed, key decisions made, open questions

Read plan.md now, then wait for the phase-specific task below before writing code.
```

---

## PHASE 0 — Planning output (run this once, before Phase 1)

```
[paste GLOBAL CONTEXT above, then:]

TASK: Do not write application code yet.
1. Produce docs/PLAN.md: architecture summary, ERD (as a Mermaid diagram), and a
   full task list broken down by the 9 phases in plan.md.
2. Produce docs/ERD.md: Mermaid entity-relationship diagram covering every table
   in plan.md's DATABASE section (rbac, catalog, pricing, auth, sales, payment,
   shipping, courier, fraud, marketing, notify, seo, report).
3. Produce docs/TASKS.md: a checklist per phase, each task sized to <=2 hours of
   work, checkboxes unticked.
4. Produce docs/QUESTIONS.md: list every ambiguity or missing detail you found in
   plan.md that you need an answer to before coding (do not guess on these).
5. List your assumptions, risks, and open questions directly in your reply too.

STOP after producing these four files. Do not start Phase 1 until the project
owner has reviewed and approved docs/PLAN.md and answered docs/QUESTIONS.md.
```

---

## PHASE 1 — Foundation

```
[paste GLOBAL CONTEXT above, then:]

TASK: Phase 1 — Foundation only. Do not touch catalog, storefront, or any later
phase's scope.

1. Scaffold the Next.js 15 + TypeScript strict project per the src/ layout in
   plan.md's ARCHITECTURE section (app/(store), app/(admin)/admin,
   app/api/webhooks/*, modules/<domain>, lib/*, components/*, config/).
2. lib/env.ts: Zod-validated environment variables. Write .env.example.
3. Set up Drizzle + PostgreSQL connection (lib/db.ts), drizzle-kit config.
4. RBAC schema + seed: roles, permissions, role_permissions, user_roles,
   sessions, accounts, audit_logs — per plan.md section 10 (RBAC). Seed default
   roles (admin, manager, order_staff, catalog_staff, marketing, support,
   accountant) + super_admin as system-protected.
5. Better-Auth setup: email/password + session cookies (httpOnly, secure,
   sameSite). Leave OAuth providers for a later phase unless trivial now.
6. lib/action.ts: the createAction wrapper exactly as specced in plan.md's
   SERVER ACTION CONTRACT section (permission -> rate-limit -> Zod parse ->
   handler -> map errors -> audit log -> revalidateTag).
7. lib/errors.ts: ActionResult<T> and ErrorCode types as specced.
8. lib/guard.ts: permission-check helper, Redis-cached (Upstash), busted on
   role change.
9. lib/logger.ts: structured logger, no PII passthrough.
10. Admin layout shell: sidebar/topbar using the easy-admin-by-prantho skill
    conventions if your tool has access to it, otherwise a clean Materialize
    CSS layout with nav, auth-gated.
11. Write Vitest tests for: createAction's guard/rate-limit/validation branches,
    permission-check logic, RBAC seed idempotency.

Follow the Definition of Done checklist above. Stop at the end of this phase,
summarize files changed and decisions made, and wait for review before Phase 2.
```

---

## PHASE 2 — Catalog

```
[paste GLOBAL CONTEXT above, then:]

TASK: Phase 2 — Catalog only. Foundation (Phase 1) is already built — reuse
lib/action.ts, lib/guard.ts, lib/db.ts, the RBAC system, and the admin layout.
Do not build storefront pages yet (Phase 3) or pricing logic (Phase 4).

1. modules/catalog/schema.ts: brands, categories (materialized path, depth),
   products (slug unique, status draft|active|archived, seo jsonb, deleted_at),
   product_categories, product_images, product_options, variants (sku unique,
   option_values jsonb), stock_movements, reviews — per plan.md DATABASE section.
2. modules/catalog/validators.ts: Zod schemas, shared client+server.
3. modules/catalog/queries.ts: cached RSC reads (unstable_cache/use cache),
   cursor-based pagination, no SELECT *, no N+1 (use Drizzle `with`/joins).
4. modules/catalog/service.ts: pure business logic — slug generation/uniqueness,
   variant generation from option combinations (max 3 options, like Shopify),
   stock movement recording.
5. modules/catalog/actions.ts: thin "use server" layer wrapping service calls in
   createAction, permission-gated (product:create, product:update, etc.).
6. Media upload: Cloudinary/S3 adapter with MIME allowlist (jpg/png/webp/avif),
   max size, server-side re-encode, EXIF stripped — per plan.md SECURITY section.
7. Admin UI (Materialize): product create/edit single-page form per plan.md
   section 13 (Basic Info / Media / Pricing / Options & Variants / SEO /
   Organization), categories tree with drag-drop reorder, brands CRUD, stock
   adjustment UI with movement log.
8. SEO: generateMetadata placeholders are fine for now (full SEO is Phase 9
   polish, but slug/meta fields must exist and be editable from Phase 2).
9. Tests: slug uniqueness, variant generation from options (incl. max-3-option
   limit, reorder-regenerates-with-confirmation), stock movement math.

Follow the Definition of Done checklist above. Stop, summarize, wait for review.
```

---

## PHASE 3 — Storefront (browse, cart, COD checkout)

```
[paste GLOBAL CONTEXT above, then:]

TASK: Phase 3 — Storefront only. Catalog (Phase 2) exists — reuse its queries
and schema. Build COD checkout only; payment gateways are Phase 5. Pricing is
still flat (base/sale price) — full price engine is Phase 4, don't build coupon
logic here.

1. Home page: banners, featured products (RSC, cached).
2. Category/brand listing: filters, sort, cursor pagination, FTS-ready search.
3. PDP: variant selection, gallery, stock display, related products, reviews.
4. Cart: drawer + full page, server actions for add/update/remove, cart stored
   per session_id or user_id (carts table per plan.md).
5. Guest checkout flow per plan.md section 3 (Guest & Auth Flow): phone + name
   + address, no account required, phone OTP verify at checkout.
6. Cart merge on login: guest session_id cart merges into user cart on auth,
   conflict on same variant keeps higher qty, old guest cart marked merged.
7. Checkout action: idempotency key, re-price server-side (never trust client
   even at this flat-pricing stage), stock reserve in a transaction
   (SELECT ... FOR UPDATE), create order with payment method = COD only.
8. Post-checkout: order success page with "Create account?" CTA pre-filled from
   order, order summary, estimated delivery placeholder.
9. Guest order tracking: /track?phone=&order= -> OTP verify -> status/timeline.
   Must return a generic response before OTP verification (no enumeration of
   valid phone/order combos) — see plan.md SECURITY section.
10. Rate-limit OTP request/verify by phone AND IP.
11. Tests: cart merge conflict resolution, checkout idempotency, stock
    reservation race (two concurrent checkouts on last unit).

Follow the Definition of Done checklist above. Stop, summarize, wait for review.
```

---

## PHASE 4 — Pricing engine

```
[paste GLOBAL CONTEXT above, then:]

TASK: Phase 4 — Pricing only. This is pure logic, heavily tested, used by
checkout from Phase 3 (wire it in at the end of this phase).

1. modules/pricing/schema.ts: campaigns, campaign_targets, campaign_rules,
   special_days, coupons, coupon_targets, coupon_redemptions — per plan.md.
2. modules/pricing/service.ts: implement the exact pipeline from plan.md
   section "PRICE ENGINE" — base -> sale override -> best campaign (priority
   DESC, highest discount, no stacking) -> special-day (max discount, no
   stack) -> line total -> coupon validation chain (exists -> status -> date
   window -> min_cart -> global limit -> per-user limit -> scope match ->
   stackable) -> coupon discount capped by max_discount, never below 0 ->
   free_ship zeroing -> shipping zone/rate match -> total.
   Rounding: half-up per line, once. Return a full PriceBreakdown object.
3. This MUST be pure (no next/*, no DB calls inside the pricing function
   itself — pass in already-fetched data).
4. Write tests FIRST, then implement: stacking rules, discount caps, expiry
   edges (inclusive start, exclusive end), concurrent coupon redemption (DB
   tx + unique constraint on coupon_redemptions), zero/negative guards.
   Target >=85% coverage on this module.
5. shipping_zones, shipping_zone_areas, shipping_rates, shipping_settings
   schema + admin CRUD UI per plan.md section 13 (Shipping Zone Config) +
   a test tool: enter address -> see matched zone + rates.
6. Wire the price engine into Phase 3's checkout action, replacing the flat
   pricing placeholder. Add coupon-apply UI in cart/checkout with rate
   limiting (see SECURITY section).

Follow the Definition of Done checklist above. Stop, summarize, wait for review.
```

---

## PHASE 5 — Order, courier, fraud, payment

```
[paste GLOBAL CONTEXT above, then:]

TASK: Phase 5 — Order lifecycle, courier booking, fraud scoring, and payment
gateways. Build in this order within the phase: fraud -> order state machine ->
payment adapters -> courier adapters (fraud must gate courier booking).

1. modules/fraud/schema.ts + service.ts: fraud_rules, fraud_checks, blacklist,
   customer_courier_stats. Scoring per plan.md section 5 table (weights
   configurable in DB). Thresholds: <30 low, 30-59 medium, >=60 high. Store
   signals jsonb for explainability.
2. modules/order: orders, order_items, order_events, state machine per
   plan.md section 3 (pending->confirmed->processing->shipped->
   delivered|cancelled|returned). Illegal transition -> CONFLICT. Every
   transition writes order_events. Risk-based routing: low=auto-confirm,
   medium=confirm+SMS verify, high=on_hold for manual review.
3. modules/payment: payments, refunds schema. Implement the PaymentAdapter
   interface from plan.md section 4.5 for SSLCommerz, bKash, Nagad, plus COD
   as a no-op adapter. Webhook routes at app/api/webhooks/payment/*,
   signature verified, idempotent. CRITICAL: verify amount against the
   server's stored order total, not just the webhook payload — see SECURITY
   section. Failed payment -> retry link via SMS/email, order held 30 min
   before auto-cancel.
4. modules/courier: courier_providers, shipments, shipment_events,
   cod_settlements. Implement CourierAdapter interface for Steadfast,
   Pathao, RedX per plan.md section 4. Auto-select by zone + success rate +
   admin default, fallback with retry/backoff. Courier booking only runs
   after fraud decision != hold, and runs via the job queue, not inline in
   the request.
5. Secrets: encrypt courier_providers.config and payment_providers.config
   with AES-256-GCM, key from lib/env.ts — not just a DB column convention.
6. Admin UI: orders list/detail/timeline/bulk actions, fraud queue +
   rules + blacklist editor, courier providers/shipments/COD settlement,
   payment providers CRUD + transaction log + refund management.
7. Invoice PDF + packing slip + bulk print.
8. Tests: fraud scoring per signal, order state machine transitions (incl.
   illegal ones), payment webhook idempotency + amount-mismatch rejection,
   courier adapter fallback on API failure (mocked HTTP).

Follow the Definition of Done checklist above. Stop, summarize, wait for review.
```

---

## PHASE 6 — Notifications

```
[paste GLOBAL CONTEXT above, then:]

TASK: Phase 6 — Notification system only.

1. modules/notify: notification_events, notification_logs, push_tokens,
   templates schema.
2. Event bus: emit(type, payload) -> resolve template+channels -> enqueue
   per channel -> adapter -> log -> retry (exponential backoff, max 5) ->
   dead-letter. Cover every event listed in plan.md section 7.
3. Channel adapters: Resend (email), SSL Wireless/BulkSMSBD (SMS, with
   Bangla unicode segment calc + sender ID masking), Firebase FCM (push,
   token register/refresh/cleanup, topic broadcast).
4. Admin: template editor (DB-stored, Handlebars-like vars) with preview +
   test-send, notification logs viewer, per-user channel preferences.
5. Wire the event bus into order/payment/fraud modules from Phase 5 so real
   events actually fire (order.created, payment.received, fraud.flagged,
   etc.) — add emit() calls at the relevant service boundaries.
6. Tests: template variable substitution, retry/backoff/dead-letter logic,
   SMS segment calculation for Bangla text.

Follow the Definition of Done checklist above. Stop, summarize, wait for review.
```

---

## PHASE 7 — Abandoned cart, marketing, tracking

```
[paste GLOBAL CONTEXT above, then:]

TASK: Phase 7 — Abandoned cart recovery, marketing, and tracking pixels/feeds.

1. Abandoned cart: capture phone/email at checkout step 1 (debounced server
   action). Cron job (every 10 min) per plan.md section 6: T+1h email/push,
   T+24h SMS + single-use coupon (48h expiry), T+72h final email. Signed,
   expiring recovery link /cart/recover/[token]. Respect opt-out and quiet
   hours (22:00-08:00 Asia/Dhaka). Stop flow on purchase.
2. modules/marketing: segments (rule builder: spent, orders, last_order_days,
   category, city, tag), campaigns_marketing, referrals, tracking_events,
   product_feeds schema + admin UI.
3. Tracking: GA4 + FB Pixel (client-side) + FB CAPI (server-side, dedupe via
   event_id, advanced matching via hashed email/phone/name/city/country) +
   Google Ads conversion tag + TikTok Pixel. Events: ViewContent, AddToCart,
   InitiateCheckout, Purchase, CompleteRegistration, Search, ViewCategory.
   UTM first+last touch capture saved on order.
4. Feeds: Google Merchant XML + FB catalog CSV, route handlers, cached +
   scheduled refresh.
5. Referral codes, wishlist, back-in-stock alerts, review request (+3 days
   post-delivery), bundle/upsell/cross-sell blocks, recently viewed.
6. Tests: segment rule evaluation, abandoned-cart flow stage transitions,
   FB CAPI event dedupe logic.

Follow the Definition of Done checklist above. Stop, summarize, wait for review.
```

---

## PHASE 8 — Reports & dashboards

```
[paste GLOBAL CONTEXT above, then:]

TASK: Phase 8 — Reports and admin dashboard only.

1. agg_sales_daily, agg_product_daily, agg_coupon_daily, agg_courier_daily
   tables, refreshed by a cron job (report.aggregate: hourly + nightly full)
   per plan.md section 12.
2. Reports per plan.md section 11: sales, product, category/brand, customer
   (new vs repeat, LTV, RFM, cohort), coupon ROI, campaign performance,
   courier performance, fraud, abandon recovery, inventory valuation, profit
   (needs cost_price on variants — add the column if missing), staff
   activity. Each: date-range + compare-period + CSV/XLSX export.
3. Admin dashboard: KPI cards + sparklines, cached 60s.
4. All remaining cron jobs from plan.md section 12 not yet built in earlier
   phases (campaign.activate/expire, special_day.toggle, courier.sync_status,
   cod.reconcile, stock.low_alert, sitemap.revalidate, cleanup). Idempotent,
   logged, observable.
5. Tests: aggregate table refresh correctness against known seed data, RFM
   bucket boundaries.

Follow the Definition of Done checklist above. Stop, summarize, wait for review.
```

---

## PHASE 9 — Hardening (perf, security, e2e, docs)

```
[paste GLOBAL CONTEXT above, then:]

TASK: Phase 9 — Final hardening pass across the whole app. Do not add new
features; only harden, document, and verify what exists.

1. Full SEO checklist from plan.md section 9: generateMetadata on every
   public route, canonical, OG/Twitter, sitemap.ts (chunked), robots.ts
   (block cart/checkout/admin/search params), JSON-LD (Product+Offer+
   AggregateRating, BreadcrumbList, Organization, WebSite+SearchAction,
   FAQPage), slug-history 301 redirects (validate internal-only, see
   SECURITY section), faceted-nav noindex+canonical, image alt required,
   one H1 per page, admin SEO editor with SERP preview + char counters.
2. Full security pass — walk every item in plan.md's SECURITY section and
   confirm/implement each one explicitly:
   - CSP, HSTS, X-Content-Type-Options, Referrer-Policy, X-Frame-Options
   - Rate limits on every sensitive endpoint (auth, checkout, coupon-apply,
     OTP request/verify by phone+IP, password reset, review submit, search)
   - OAuth auto-link only on verified email
   - Media upload MIME/size allowlist + re-encode + EXIF strip
   - Provider secrets encrypted at rest, key rotation documented
   - Payment amount double-verification against server order total
   - Redirect table same-origin validation
   - No PII/secrets in logs or audit diffs
   - TOTP MFA for super_admin (and offered to other admin roles)
   - SSRF allowlisting on outbound adapter calls
   - `pnpm audit` clean (or documented accepted risk for any unfixable
     transitive dependency)
3. Performance: Lighthouse >=95 (SEO/Perf/A11y), LCP<2s, CLS<0.05. Verify
   image formats (AVIF/WebP), font loading (next/font), no N+1 queries, no
   SELECT *, admin reports hitting aggregate tables not live heavy queries.
4. E2E (Playwright): browse -> cart -> coupon -> checkout -> admin confirm ->
   ship -> deliver, covering both Simple and Advanced checkout modes.
5. Seed script: faker-generated 500 products, 5k orders for perf testing.
6. Deliverables: README.md (setup, env table, scripts), docs/ARCHITECTURE.md,
   docs/ERD.md (final, Mermaid), docs/RUNBOOK.md (jobs, webhooks, failure
   handling), docs/API-WEBHOOKS.md.
7. Coverage gate check: services >=85%.

Follow the Definition of Done checklist above. This is the final phase —
produce a full project summary: what was built, known limitations, and any
items in docs/QUESTIONS.md still unanswered.
```
