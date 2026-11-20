import { asc } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  shippingRates,
  shippingSettings,
  shippingZoneAreas,
  shippingZones,
} from "@/modules/shipping/schema";

export async function getAllShippingConfig() {
  const db = getDb();
  const [zones, areas, rates, settingsRows] = await Promise.all([
    db
      .select({
        id: shippingZones.id,
        name: shippingZones.name,
        type: shippingZones.type,
        isDefault: shippingZones.isDefault,
      })
      .from(shippingZones)
      .orderBy(asc(shippingZones.name)),
    db
      .select({
        id: shippingZoneAreas.id,
        zoneId: shippingZoneAreas.zoneId,
        division: shippingZoneAreas.division,
        district: shippingZoneAreas.district,
        thana: shippingZoneAreas.thana,
      })
      .from(shippingZoneAreas),
    db
      .select({
        id: shippingRates.id,
        zoneId: shippingRates.zoneId,
        name: shippingRates.name,
        minWeightG: shippingRates.minWeightG,
        maxWeightG: shippingRates.maxWeightG,
        minCartAmount: shippingRates.minCartAmount,
        maxCartAmount: shippingRates.maxCartAmount,
        price: shippingRates.price,
        estimatedDaysMin: shippingRates.estimatedDaysMin,
        estimatedDaysMax: shippingRates.estimatedDaysMax,
        isFreeAbove: shippingRates.isFreeAbove,
      })
      .from(shippingRates)
      .orderBy(asc(shippingRates.price)),
    db
      .select({
        id: shippingSettings.id,
        freeShippingGlobalThreshold:
          shippingSettings.freeShippingGlobalThreshold,
        defaultWeightG: shippingSettings.defaultWeightG,
      })
      .from(shippingSettings)
      .limit(1),
  ]);

  return {
    zones,
    areas,
    rates,
    settings: settingsRows[0] ?? null,
  };
}
