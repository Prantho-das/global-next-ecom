import { describe, expect, it } from "vitest";

import { matchShippingRates, matchShippingZone } from "@/modules/shipping/service";

const zones = [
  { id: "z-dhaka", name: "Dhaka Metro", type: "flat", isDefault: false },
  { id: "z-uttara", name: "Uttara Express", type: "flat", isDefault: false },
  { id: "z-default", name: "Outside Dhaka", type: "flat", isDefault: true },
];

const areas = [
  { zoneId: "z-dhaka", division: "Dhaka", district: "Dhaka", thana: null },
  { zoneId: "z-uttara", division: "Dhaka", district: "Dhaka", thana: "Uttara" },
];

const rates = [
  {
    id: "r1",
    zoneId: "z-uttara",
    name: "Same Day",
    minWeightG: 0,
    maxWeightG: 5000,
    minCartAmount: 0,
    maxCartAmount: null,
    price: 8000,
    estimatedDaysMin: 1,
    estimatedDaysMax: 1,
    isFreeAbove: 300000,
  },
  {
    id: "r2",
    zoneId: "z-default",
    name: "Standard",
    minWeightG: 0,
    maxWeightG: null,
    minCartAmount: 0,
    maxCartAmount: null,
    price: 12000,
    estimatedDaysMin: 2,
    estimatedDaysMax: 4,
    isFreeAbove: null,
  },
];

describe("shipping zone & rate matching", () => {
  it("prefers thana match over district and default", () => {
    const zone = matchShippingZone(
      { division: "Dhaka", district: "Dhaka", thana: "Uttara" },
      zones,
      areas,
    );
    expect(zone?.id).toBe("z-uttara");
  });

  it("falls back to default zone when address has no explicit match", () => {
    const zone = matchShippingZone(
      { division: "Sylhet", district: "Sylhet", thana: "Sylhet Sadar" },
      zones,
      areas,
    );
    expect(zone?.id).toBe("z-default");
  });

  it("applies global or zone-level free shipping threshold", () => {
    const paid = matchShippingRates({
      address: { division: "Dhaka", district: "Dhaka", thana: "Uttara" },
      totalWeightG: 500,
      cartSubtotal: 100000,
      zones,
      areas,
      rates,
      globalFreeThreshold: 500000,
    });
    expect(paid.options[0]?.price).toBe(8000);
    expect(paid.options[0]?.isFree).toBe(false);

    const freeByGlobal = matchShippingRates({
      address: { division: "Sylhet", district: "Sylhet", thana: "Sylhet Sadar" },
      totalWeightG: 500,
      cartSubtotal: 500000,
      zones,
      areas,
      rates,
      globalFreeThreshold: 500000,
    });
    expect(freeByGlobal.options[0]?.price).toBe(0);
    expect(freeByGlobal.options[0]?.isFree).toBe(true);
  });
});
