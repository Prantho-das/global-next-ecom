"use server";

import { randomUUID } from "crypto";

import { z } from "zod";

import { createAction } from "@/lib/action";
import { getDb } from "@/lib/db";
import { siteSettings } from "@/modules/settings/schema";

const saveSettingsSchema = z.object({
  group: z.enum([
    "general",
    "seo",
    "tracking",
    "checkout",
    "notifications",
    "fraud",
    "storefront",
  ]),
  entries: z.record(z.string().min(1).max(120), z.unknown()),
});

export const saveSiteSettingsAction = createAction({
  permission: "setting:update",
  schema: saveSettingsSchema,
  revalidateTags: ["settings"],
  audit: {
    action: "update_settings",
    entity: "site_settings",
    getEntityId: (_out, input) => input.group,
  },
  handler: async (input) => {
    const db = getDb();
    const pairs = Object.entries(input.entries);
    for (const [key, value] of pairs) {
      await db
        .insert(siteSettings)
        .values({
          id: randomUUID(),
          group: input.group,
          key,
          value,
        })
        .onDuplicateKeyUpdate({
          set: {
            group: input.group,
            value,
            updatedAt: new Date(),
          },
        });
    }
    return { group: input.group, updatedKeys: pairs.length };
  },
});
