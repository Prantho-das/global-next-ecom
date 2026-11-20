export interface ShippingZoneRecord {
  id: string;
  name: string;
  type: string;
  isDefault: boolean;
}

export interface ShippingZoneAreaRecord {
  zoneId: string;
  division: string;
  district: string;
  thana: string | null;
}

export interface ShippingRateRecord {
  id: string;
  zoneId: string;
  name: string;
  minWeightG: number;
  maxWeightG: number | null;
  minCartAmount: number;
  maxCartAmount: number | null;
  price: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  isFreeAbove: number | null;
}

export interface MatchedShippingOption {
  rateId: string;
  name: string;
  price: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  isFree: boolean;
}

export interface ShippingMatchResult {
  zone: ShippingZoneRecord | null;
  options: MatchedShippingOption[];
}

function norm(val: string | null | undefined): string {
  return (val ?? "").trim().toLowerCase();
}

export function matchShippingZone(
  address: { division: string; district: string; thana: string },
  zones: readonly ShippingZoneRecord[],
  areas: readonly ShippingZoneAreaRecord[],
): ShippingZoneRecord | null {
  const zoneMap = new Map(zones.map((z) => [z.id, z]));
  const div = norm(address.division);
  const dist = norm(address.district);
  const thana = norm(address.thana);

  const thanaMatch = areas.find(
    (a) =>
      norm(a.division) === div &&
      norm(a.district) === dist &&
      a.thana !== null &&
      norm(a.thana) === thana,
  );
  if (thanaMatch !== undefined) {
    return zoneMap.get(thanaMatch.zoneId) ?? null;
  }

  const districtMatch = areas.find(
    (a) =>
      norm(a.division) === div &&
      norm(a.district) === dist &&
      (a.thana === null || a.thana === ""),
  );
  if (districtMatch !== undefined) {
    return zoneMap.get(districtMatch.zoneId) ?? null;
  }

  const divisionMatch = areas.find(
    (a) => norm(a.division) === div && (a.district === "" || norm(a.district) === norm(a.division)),
  );
  if (divisionMatch !== undefined) {
    return zoneMap.get(divisionMatch.zoneId) ?? null;
  }

  return zones.find((z) => z.isDefault) ?? null;
}

export function matchShippingRates(input: {
  address: { division: string; district: string; thana: string };
  totalWeightG: number;
  cartSubtotal: number;
  zones: readonly ShippingZoneRecord[];
  areas: readonly ShippingZoneAreaRecord[];
  rates: readonly ShippingRateRecord[];
  globalFreeThreshold: number | null;
}): ShippingMatchResult {
  const zone = matchShippingZone(input.address, input.zones, input.areas);
  if (zone === null) {
    return { zone: null, options: [] };
  }

  const isGlobalFree =
    input.globalFreeThreshold !== null &&
    input.cartSubtotal >= input.globalFreeThreshold;

  const zoneRates = input.rates.filter((r) => r.zoneId === zone.id);
  const options: MatchedShippingOption[] = [];

  for (const rate of zoneRates) {
    const weightOk =
      input.totalWeightG >= rate.minWeightG &&
      (rate.maxWeightG === null || input.totalWeightG <= rate.maxWeightG);
    const cartOk =
      input.cartSubtotal >= rate.minCartAmount &&
      (rate.maxCartAmount === null || input.cartSubtotal <= rate.maxCartAmount);
    if (!weightOk || !cartOk) {
      continue;
    }

    const isZoneFree =
      rate.isFreeAbove !== null && input.cartSubtotal >= rate.isFreeAbove;
    const isFree = isGlobalFree || isZoneFree;

    options.push({
      rateId: rate.id,
      name: rate.name,
      price: isFree ? 0 : rate.price,
      estimatedDaysMin: rate.estimatedDaysMin,
      estimatedDaysMax: rate.estimatedDaysMax,
      isFree,
    });
  }

  return { zone, options };
}
