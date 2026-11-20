"use server";

import { randomUUID } from "crypto";

import { eq } from "drizzle-orm";

import { createAction } from "@/lib/action";
import { getDb } from "@/lib/db";
import { getAllShippingConfig } from "@/modules/shipping/queries";
import {
  shippingRates,
  shippingSettings,
  shippingZoneAreas,
  shippingZones,
} from "@/modules/shipping/schema";
import { matchShippingRates } from "@/modules/shipping/service";
import {
  shippingRateInputSchema,
  shippingSettingsInputSchema,
  shippingTestAddressSchema,
  shippingZoneAreaInputSchema,
  shippingZoneInputSchema,
} from "@/modules/shipping/validators";

export const upsertShippingZoneAction = createAction({
  permission: "setting:update",
  schema: shippingZoneInputSchema,
  revalidateTags: ["shipping"],
  audit: {
    action: "upsert",
    entity: "shipping_zone",
    getEntityId: (out: { id: string }) => out.id,
  },
  handler: async (input) => {
    const db = getDb();
    const id = input.id ?? randomUUID();
    if (input.isDefault) {
      await db.update(shippingZones).set({ isDefault: false });
    }
    if (input.id !== undefined) {
      await db
        .update(shippingZones)
        .set({
          name: input.name,
          type: input.type ?? "flat",
          isDefault: input.isDefault ?? false,
          updatedAt: new Date(),
        })
        .where(eq(shippingZones.id, input.id));
    } else {
      await db.insert(shippingZones).values({
        id,
        name: input.name,
        type: input.type ?? "flat",
        isDefault: input.isDefault ?? false,
      });
    }
    return { id };
  },
});

export const addShippingZoneAreaAction = createAction({
  permission: "setting:update",
  schema: shippingZoneAreaInputSchema,
  revalidateTags: ["shipping"],
  audit: {
    action: "create",
    entity: "shipping_zone_area",
    getEntityId: (out: { id: string }) => out.id,
  },
  handler: async (input) => {
    const db = getDb();
    const id = randomUUID();
    await db.insert(shippingZoneAreas).values({
      id,
      zoneId: input.zoneId,
      division: input.division,
      district: input.district ?? "",
      thana: input.thana ?? null,
    });
    return { id };
  },
});

export const addShippingRateAction = createAction({
  permission: "setting:update",
  schema: shippingRateInputSchema,
  revalidateTags: ["shipping"],
  audit: {
    action: "create",
    entity: "shipping_rate",
    getEntityId: (out: { id: string }) => out.id,
  },
  handler: async (input) => {
    const db = getDb();
    const id = randomUUID();
    await db.insert(shippingRates).values({
      id,
      zoneId: input.zoneId,
      name: input.name,
      minWeightG: input.minWeightG ?? 0,
      maxWeightG: input.maxWeightG ?? null,
      minCartAmount: input.minCartAmount ?? 0,
      maxCartAmount: input.maxCartAmount ?? null,
      price: input.price,
      estimatedDaysMin: input.estimatedDaysMin ?? 1,
      estimatedDaysMax: input.estimatedDaysMax ?? 3,
      isFreeAbove: input.isFreeAbove ?? null,
    });
    return { id };
  },
});

export const saveShippingSettingsAction = createAction({
  permission: "setting:update",
  schema: shippingSettingsInputSchema,
  revalidateTags: ["shipping"],
  audit: {
    action: "update",
    entity: "shipping_settings",
    getEntityId: () => "global",
  },
  handler: async (input) => {
    const db = getDb();
    const existing = await db
      .select({ id: shippingSettings.id })
      .from(shippingSettings)
      .limit(1);
    const id = existing[0]?.id ?? randomUUID();
    if (existing[0] !== undefined) {
      await db
        .update(shippingSettings)
        .set({
          freeShippingGlobalThreshold: input.freeShippingGlobalThreshold,
          defaultWeightG: input.defaultWeightG ?? 500,
          updatedAt: new Date(),
        })
        .where(eq(shippingSettings.id, id));
    } else {
      await db.insert(shippingSettings).values({
        id,
        freeShippingGlobalThreshold: input.freeShippingGlobalThreshold,
        defaultWeightG: input.defaultWeightG ?? 500,
      });
    }
    return { id };
  },
});

export const testShippingAddressAction = createAction({
  permission: "setting:view",
  schema: shippingTestAddressSchema,
  handler: async (input) => {
    const cfg = await getAllShippingConfig();
    return matchShippingRates({
      address: {
        division: input.division,
        district: input.district ?? "",
        thana: input.thana ?? "",
      },
      totalWeightG: input.totalWeightG ?? 500,
      cartSubtotal: input.cartSubtotal ?? 100000,
      zones: cfg.zones,
      areas: cfg.areas,
      rates: cfg.rates,
      globalFreeThreshold: cfg.settings?.freeShippingGlobalThreshold ?? null,
    });
  },
});
