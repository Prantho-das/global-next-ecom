export const RBAC_RESOURCES = [
  "product",
  "category",
  "brand",
  "stock",
  "order",
  "customer",
  "coupon",
  "campaign",
  "courier",
  "fraud",
  "marketing",
  "notification",
  "report",
  "seo",
  "user",
  "role",
  "setting",
  "audit",
] as const;

export const RBAC_STANDARD_ACTIONS = [
  "view",
  "create",
  "update",
  "delete",
  "export",
  "approve",
] as const;

export const RBAC_EXTRA_PERMISSIONS = [
  "order:bulk_ship",
  "report:financial",
] as const;

export type RbacResource = (typeof RBAC_RESOURCES)[number];
export type RbacAction = (typeof RBAC_STANDARD_ACTIONS)[number];

export const SYSTEM_ROLE_SLUG = "super_admin";

export interface RoleSeedDefinition {
  name: string;
  slug: string;
  description: string;
  isSystem: boolean;
  permissions: readonly string[];
}

export function getAllPermissionKeys(): string[] {
  const keys: string[] = [];
  for (const resource of RBAC_RESOURCES) {
    for (const action of RBAC_STANDARD_ACTIONS) {
      keys.push(`${resource}:${action}`);
    }
  }
  for (const extra of RBAC_EXTRA_PERMISSIONS) {
    keys.push(extra);
  }
  return keys;
}

export const DEFAULT_ROLE_SEEDS: readonly RoleSeedDefinition[] = [
  {
    name: "Super Admin",
    slug: SYSTEM_ROLE_SLUG,
    description: "System-protected full access role",
    isSystem: true,
    permissions: getAllPermissionKeys(),
  },
  {
    name: "Admin",
    slug: "admin",
    description: "Store administrator",
    isSystem: false,
    permissions: getAllPermissionKeys(),
  },
  {
    name: "Manager",
    slug: "manager",
    description: "Operations manager",
    isSystem: false,
    permissions: [
      "product:view",
      "product:create",
      "product:update",
      "category:view",
      "category:update",
      "brand:view",
      "stock:view",
      "stock:update",
      "order:view",
      "order:update",
      "order:approve",
      "order:bulk_ship",
      "customer:view",
      "coupon:view",
      "campaign:view",
      "courier:view",
      "fraud:view",
      "fraud:approve",
      "report:view",
    ],
  },
  {
    name: "Order Staff",
    slug: "order_staff",
    description: "Order fulfillment and courier booking",
    isSystem: false,
    permissions: [
      "order:view",
      "order:update",
      "order:bulk_ship",
      "courier:view",
      "courier:create",
      "customer:view",
    ],
  },
  {
    name: "Catalog Staff",
    slug: "catalog_staff",
    description: "Catalog, inventory, and SEO management",
    isSystem: false,
    permissions: [
      "product:view",
      "product:create",
      "product:update",
      "category:view",
      "category:create",
      "category:update",
      "brand:view",
      "brand:create",
      "brand:update",
      "stock:view",
      "stock:update",
      "seo:view",
      "seo:update",
    ],
  },
  {
    name: "Marketing",
    slug: "marketing",
    description: "Campaigns, coupons, and customer segments",
    isSystem: false,
    permissions: [
      "coupon:view",
      "coupon:create",
      "coupon:update",
      "campaign:view",
      "campaign:create",
      "campaign:update",
      "marketing:view",
      "marketing:create",
      "marketing:update",
      "notification:view",
      "seo:view",
    ],
  },
  {
    name: "Support",
    slug: "support",
    description: "Customer support and order lookup",
    isSystem: false,
    permissions: ["order:view", "customer:view", "fraud:view"],
  },
  {
    name: "Accountant",
    slug: "accountant",
    description: "Financial reports and COD settlements",
    isSystem: false,
    permissions: [
      "order:view",
      "order:export",
      "courier:view",
      "report:view",
      "report:export",
      "report:financial",
    ],
  },
];
