# Open Questions & Ambiguities

Items below are ambiguous or underspecified in `plan.md`. Answers are required before coding the affected modules.

1. **Missing Admin UI Skill (`easy-admin-by-prantho`)**: `plan.md` instructs to read `easy-admin-by-prantho/SKILL.md` for admin UI conventions, but this skill was not found in the workspace. Where is it located, or should we proceed using standard `@materializecss/materialize` conventions directly?
2. **Queue / Cron Provider**: `plan.md` lists `Inngest or BullMQ`. Which one should we use? (Note: BullMQ requires a persistent worker process, whereas Inngest works serverless with Next.js App Router).
3. **Media Storage Provider**: `plan.md` lists `Cloudinary/S3`. Which primary provider should we implement first (or both behind an adapter)?
4. **SMS Provider**: `plan.md` lists `SSL Wireless/BulkSMSBD adapter`. Should we implement both adapters in Phase 6, or one primary?
5. **i18n (`next-intl`)**: `plan.md` notes `Bangla/English i18n-ready (next-intl) — ask before adding`. Should `next-intl` be added in Phase 1 (or Phase 3), or kept English-only for v1?
6. **ID Generation Strategy**: `plan.md` lists `UUIDv7 / cuid2`. Which one should be standardized across all Drizzle schemas?
7. **Category Tree Column Type**: `plan.md` lists `path ltree/materialized path`. Should we use PostgreSQL `ltree` extension or plain `text` materialized path (e.g. `root/electronics/phones`)?
8. **CAPTCHA Provider & Threshold**: `plan.md` Security requires CAPTCHA (`hCaptcha/Turnstile`) after `N` OTP requests. Which provider (Cloudflare Turnstile vs hCaptcha), and what is `N`?
9. **Admin MFA Scope**: `plan.md` requires TOTP 2FA for `super_admin` and recommends it for other admin roles. Should MFA enrollment be enforced on first login for `super_admin` only, or all admin roles?
10. **Coupon `stackable` Semantics**: `plan.md` Price Engine states "ONE campaign per item, no stacking" and "special-day rule if active and not already discounted deeper", yet `coupons` has `stackable bool`. Does `stackable = true` mean the coupon can stack with *campaign/special-day discounts*, or with *other coupons*?
11. **Order Number Format**: What format should `orders.number` follow (e.g. `ORD-YYYYMMDD-XXXXXX` or sequential `ORD-10001`)?
12. **Unpaid Online Order Hold & Stock Release**: `plan.md` states failed/unpaid online payment orders are held 30 min before auto-cancel. Should inventory remain reserved during those 30 minutes and be released by a cron job on auto-cancel?
13. **`variants.cost_price` Column**: `plan.md` Section 11 (Reports) requires `cost_price` on `variants` for Profit reporting, though Section 1 (`variants`) omits it. Confirm adding nullable `cost_price` (integer poisha) to `variants`?
14. **Shipping Zone Match Precedence**: Confirm specificity precedence when an address matches multiple zones: `thana > district > division > default`.
15. **Currency Scope**: Confirm BDT-only (integer poisha) for v1 across storefront, pricing, and reporting.
