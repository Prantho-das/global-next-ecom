# Entity-Relationship Diagram (ERD)

Complete database schema across all 13 domains (`rbac`, `catalog`, `pricing`, `auth`, `sales`, `payment`, `shipping`, `courier`, `fraud`, `marketing`, `notify`, `seo`, `report`).

Conventions:
- Every table includes `id`, `created_at` (`timestamptz` UTC), `updated_at` (`timestamptz` UTC).
- Soft delete (`deleted_at` `timestamptz` nullable) on `catalog` and `orders` entities.
- All monetary values stored as integer minor units (poisha).

```mermaid
erDiagram
    %% ==================== RBAC & AUTH ====================
    users {
        string id PK
        string name
        string email UK
        boolean email_verified
        string phone UK
        boolean phone_verified
        string image
        boolean two_factor_enabled
        timestamptz created_at
        timestamptz updated_at
    }
    roles {
        string id PK
        string name UK
        string slug UK
        string description
        boolean is_system
        timestamptz created_at
        timestamptz updated_at
    }
    permissions {
        string id PK
        string resource
        string action
        string key UK
        string description
        timestamptz created_at
        timestamptz updated_at
    }
    role_permissions {
        string id PK
        string role_id FK
        string permission_id FK
        timestamptz created_at
        timestamptz updated_at
    }
    user_roles {
        string id PK
        string user_id FK
        string role_id FK
        timestamptz created_at
        timestamptz updated_at
    }
    sessions {
        string id PK
        string user_id FK
        string token UK
        timestamptz expires_at
        string ip_address
        string user_agent
        timestamptz created_at
        timestamptz updated_at
    }
    accounts {
        string id PK
        string user_id FK
        string account_id
        string provider_id
        string access_token
        string refresh_token
        timestamptz expires_at
        timestamptz created_at
        timestamptz updated_at
    }
    audit_logs {
        string id PK
        string actor_id FK
        string action
        string entity
        string entity_id
        jsonb diff
        string ip
        timestamptz created_at
        timestamptz updated_at
    }
    otp_codes {
        string id PK
        string phone
        string code
        string purpose
        timestamptz expires_at
        int attempts
        timestamptz verified_at
        timestamptz created_at
        timestamptz updated_at
    }

    users ||--o{ user_roles : "has"
    roles ||--o{ user_roles : "assigned_to"
    roles ||--o{ role_permissions : "grants"
    permissions ||--o{ role_permissions : "included_in"
    users ||--o{ sessions : "owns"
    users ||--o{ accounts : "links"
    users ||--o{ audit_logs : "performs"

    %% ==================== CATALOG ====================
    brands {
        string id PK
        string name
        string slug UK
        string logo_url
        jsonb seo
        timestamptz deleted_at
        timestamptz created_at
        timestamptz updated_at
    }
    categories {
        string id PK
        string parent_id FK
        string name
        string slug UK
        string path
        int depth
        jsonb seo
        timestamptz deleted_at
        timestamptz created_at
        timestamptz updated_at
    }
    products {
        string id PK
        string name
        string slug UK
        string status
        string brand_id FK
        text description
        int base_price
        int sale_price
        int compare_at_price
        jsonb seo
        boolean has_variants
        string vendor
        string product_type
        jsonb tags
        timestamptz deleted_at
        timestamptz created_at
        timestamptz updated_at
    }
    product_categories {
        string id PK
        string product_id FK
        string category_id FK
        timestamptz created_at
        timestamptz updated_at
    }
    product_images {
        string id PK
        string product_id FK
        string url
        string alt
        int position
        jsonb variant_ids
        timestamptz created_at
        timestamptz updated_at
    }
    product_options {
        string id PK
        string product_id FK
        string name
        int position
        jsonb values
        timestamptz created_at
        timestamptz updated_at
    }
    variants {
        string id PK
        string product_id FK
        string sku UK
        int price
        int compare_at_price
        int cost_price
        int stock
        int weight_g
        string barcode
        jsonb option_values
        string image_id FK
        boolean is_default
        timestamptz deleted_at
        timestamptz created_at
        timestamptz updated_at
    }
    stock_movements {
        string id PK
        string variant_id FK
        int delta
        string reason
        string ref_type
        string ref_id
        timestamptz created_at
        timestamptz updated_at
    }
    reviews {
        string id PK
        string product_id FK
        string user_id FK
        string customer_id FK
        int rating
        string title
        text body
        boolean is_verified
        string status
        timestamptz created_at
        timestamptz updated_at
    }

    categories ||--o{ categories : "parent_of"
    brands ||--o{ products : "owns"
    products ||--o{ product_categories : "belongs_to"
    categories ||--o{ product_categories : "contains"
    products ||--o{ product_images : "has"
    products ||--o{ product_options : "defines"
    products ||--o{ variants : "has"
    product_images ||--o{ variants : "featured_on"
    variants ||--o{ stock_movements : "tracks"
    products ||--o{ reviews : "receives"
    users ||--o{ reviews : "writes"

    %% ==================== PRICING ====================
    campaigns {
        string id PK
        string name
        string type
        timestamptz starts_at
        timestamptz ends_at
        int priority
        string status
        timestamptz created_at
        timestamptz updated_at
    }
    campaign_targets {
        string id PK
        string campaign_id FK
        string scope
        string target_id
        timestamptz created_at
        timestamptz updated_at
    }
    campaign_rules {
        string id PK
        string campaign_id FK
        string discount_type
        int value
        int max_discount
        int stock_cap
        timestamptz created_at
        timestamptz updated_at
    }
    special_days {
        string id PK
        string name
        timestamptz starts_at
        timestamptz ends_at
        string banner
        string rule_id FK
        timestamptz created_at
        timestamptz updated_at
    }
    coupons {
        string id PK
        string code UK
        string type
        int value
        int min_cart
        int max_discount
        int usage_limit
        int per_user_limit
        timestamptz starts_at
        timestamptz expires_at
        string scope
        boolean stackable
        string status
        timestamptz created_at
        timestamptz updated_at
    }
    coupon_targets {
        string id PK
        string coupon_id FK
        string scope
        string target_id
        timestamptz created_at
        timestamptz updated_at
    }
    coupon_redemptions {
        string id PK
        string coupon_id FK
        string user_id FK
        string order_id FK
        int amount
        timestamptz created_at
        timestamptz updated_at
    }

    campaigns ||--o{ campaign_targets : "targets"
    campaigns ||--o{ campaign_rules : "has"
    campaign_rules ||--o{ special_days : "applied_by"
    coupons ||--o{ coupon_targets : "scopes"
    coupons ||--o{ coupon_redemptions : "redeemed_in"
    users ||--o{ coupon_redemptions : "uses"

    %% ==================== SALES & PAYMENT ====================
    customers {
        string id PK
        string user_id FK
        string phone UK
        string email
        string name
        boolean is_guest
        timestamptz created_at
        timestamptz updated_at
    }
    addresses {
        string id PK
        string customer_id FK
        string division
        string district
        string thana
        string line
        boolean is_default
        timestamptz created_at
        timestamptz updated_at
    }
    carts {
        string id PK
        string session_id
        string user_id FK
        string customer_id FK
        string status
        timestamptz last_activity_at
        timestamptz created_at
        timestamptz updated_at
    }
    cart_items {
        string id PK
        string cart_id FK
        string variant_id FK
        int qty
        timestamptz created_at
        timestamptz updated_at
    }
    orders {
        string id PK
        string number UK
        string customer_id FK
        string status
        string payment_status
        int subtotal
        int discount_total
        int shipping_fee
        int total
        string coupon_id FK
        int risk_score
        string risk_level
        string ip
        string user_agent
        jsonb utm
        jsonb shipping_address
        string idempotency_key UK
        timestamptz deleted_at
        timestamptz created_at
        timestamptz updated_at
    }
    order_items {
        string id PK
        string order_id FK
        string variant_id FK
        int qty
        int price_snapshot
        string name_snapshot
        string sku_snapshot
        timestamptz created_at
        timestamptz updated_at
    }
    order_events {
        string id PK
        string order_id FK
        string from_status
        string to_status
        string actor
        string note
        timestamptz created_at
        timestamptz updated_at
    }
    payment_providers {
        string id PK
        string code UK
        string name
        jsonb config_enc
        boolean is_active
        int position
        boolean sandbox_mode
        timestamptz created_at
        timestamptz updated_at
    }
    payments {
        string id PK
        string order_id FK
        string method
        string gateway_provider
        string status
        string txn_id
        string gateway_txn_id
        int amount
        int refunded_amount
        string currency
        jsonb raw_response
        string idempotency_key UK
        timestamptz paid_at
        timestamptz created_at
        timestamptz updated_at
    }
    refunds {
        string id PK
        string payment_id FK
        string order_id FK
        int amount
        string reason
        string status
        string gateway_refund_id
        timestamptz processed_at
        timestamptz created_at
        timestamptz updated_at
    }

    users ||--o| customers : "linked_to"
    customers ||--o{ addresses : "owns"
    customers ||--o{ carts : "owns"
    carts ||--o{ cart_items : "contains"
    variants ||--o{ cart_items : "in"
    customers ||--o{ orders : "places"
    coupons ||--o{ orders : "applied_to"
    orders ||--o{ order_items : "contains"
    variants ||--o{ order_items : "ordered_as"
    orders ||--o{ order_events : "logs"
    orders ||--o{ coupon_redemptions : "records"
    orders ||--o{ payments : "paid_by"
    payments ||--o{ refunds : "refunded_by"
    orders ||--o{ refunds : "has"

    %% ==================== SHIPPING ====================
    shipping_zones {
        string id PK
        string name
        string type
        boolean is_default
        timestamptz created_at
        timestamptz updated_at
    }
    shipping_zone_areas {
        string id PK
        string zone_id FK
        string division
        string district
        string thana
        timestamptz created_at
        timestamptz updated_at
    }
    shipping_rates {
        string id PK
        string zone_id FK
        string name
        int min_weight_g
        int max_weight_g
        int min_cart_amount
        int max_cart_amount
        int price
        int estimated_days_min
        int estimated_days_max
        int is_free_above
        timestamptz created_at
        timestamptz updated_at
    }
    shipping_settings {
        string id PK
        int free_shipping_global_threshold
        int default_weight_g
        timestamptz created_at
        timestamptz updated_at
    }

    shipping_zones ||--o{ shipping_zone_areas : "covers"
    shipping_zones ||--o{ shipping_rates : "offers"

    %% ==================== COURIER ====================
    courier_providers {
        string id PK
        string code UK
        jsonb config_enc
        string status
        timestamptz created_at
        timestamptz updated_at
    }
    shipments {
        string id PK
        string order_id FK
        string provider
        string consignment_id
        string tracking_code
        string status
        int cod_amount
        int cod_collected
        int fee
        jsonb raw
        timestamptz created_at
        timestamptz updated_at
    }
    shipment_events {
        string id PK
        string shipment_id FK
        string status
        jsonb payload
        timestamptz created_at
        timestamptz updated_at
    }
    cod_settlements {
        string id PK
        string provider
        string batch_ref
        int total_collected
        int total_fee
        int net_amount
        string status
        timestamptz settled_at
        timestamptz created_at
        timestamptz updated_at
    }

    orders ||--o{ shipments : "fulfilled_by"
    shipments ||--o{ shipment_events : "tracks"

    %% ==================== FRAUD ====================
    fraud_rules {
        string id PK
        string key UK
        int weight
        boolean enabled
        jsonb config
        timestamptz created_at
        timestamptz updated_at
    }
    fraud_checks {
        string id PK
        string order_id FK
        int score
        jsonb signals
        string decision
        timestamptz created_at
        timestamptz updated_at
    }
    blacklist {
        string id PK
        string type
        string value
        string reason
        timestamptz expires_at
        timestamptz created_at
        timestamptz updated_at
    }
    customer_courier_stats {
        string id PK
        string phone UK
        int delivered
        int returned
        int cancelled
        timestamptz created_at
        timestamptz updated_at
    }

    orders ||--o{ fraud_checks : "evaluated_by"

    %% ==================== MARKETING & NOTIFY ====================
    segments {
        string id PK
        string name
        jsonb rules
        timestamptz created_at
        timestamptz updated_at
    }
    templates {
        string id PK
        string channel
        string key UK
        string subject
        text body
        jsonb vars
        timestamptz created_at
        timestamptz updated_at
    }
    campaigns_marketing {
        string id PK
        string channel
        string template_id FK
        string segment_id FK
        timestamptz scheduled_at
        string status
        jsonb stats
        timestamptz created_at
        timestamptz updated_at
    }
    referrals {
        string id PK
        string referrer_user_id FK
        string referred_user_id FK
        string code UK
        string status
        int reward_amount
        timestamptz created_at
        timestamptz updated_at
    }
    tracking_events {
        string id PK
        string order_id FK
        string platform
        string event_id UK
        timestamptz sent_at
        string status
        timestamptz created_at
        timestamptz updated_at
    }
    product_feeds {
        string id PK
        string channel
        string url
        string status
        timestamptz last_generated_at
        timestamptz created_at
        timestamptz updated_at
    }
    notification_events {
        string id PK
        string type
        jsonb payload
        timestamptz created_at
        timestamptz updated_at
    }
    notification_logs {
        string id PK
        string event_id FK
        string channel
        string recipient
        string template
        string status
        string provider_id
        text error
        int attempts
        timestamptz created_at
        timestamptz updated_at
    }
    push_tokens {
        string id PK
        string user_id FK
        string token UK
        string platform
        timestamptz created_at
        timestamptz updated_at
    }

    segments ||--o{ campaigns_marketing : "targets"
    templates ||--o{ campaigns_marketing : "renders"
    users ||--o{ referrals : "refers"
    orders ||--o{ tracking_events : "triggers"
    notification_events ||--o{ notification_logs : "dispatches"
    users ||--o{ push_tokens : "registers"

    %% ==================== SEO & REPORT ====================
    redirects {
        string id PK
        string from_path UK
        string to_path
        int code
        int hits
        timestamptz created_at
        timestamptz updated_at
    }
    seo_settings {
        string id PK
        string site_name
        string gsc_verification
        string fb_domain_verification
        jsonb org_jsonld
        timestamptz created_at
        timestamptz updated_at
    }
    agg_sales_daily {
        string id PK
        date day UK
        int orders_count
        int revenue
        int discount_total
        int shipping_total
        int refund_total
        timestamptz created_at
        timestamptz updated_at
    }
    agg_product_daily {
        string id PK
        date day
        string product_id FK
        int units_sold
        int revenue
        timestamptz created_at
        timestamptz updated_at
    }
    agg_coupon_daily {
        string id PK
        date day
        string coupon_id FK
        int redemptions
        int discount_amount
        int revenue_attributed
        timestamptz created_at
        timestamptz updated_at
    }
    agg_courier_daily {
        string id PK
        date day
        string provider
        int shipped
        int delivered
        int returned
        int cod_collected
        timestamptz created_at
        timestamptz updated_at
    }

    products ||--o{ agg_product_daily : "summarized_in"
    coupons ||--o{ agg_coupon_daily : "summarized_in"
```
