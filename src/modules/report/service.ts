export interface DailySalesBucket {
  day: string;
  ordersCount: number;
  revenue: number;
  discountTotal: number;
  shippingTotal: number;
}

export function aggregateSalesByDay(
  orders: ReadonlyArray<{
    createdAt: Date;
    status: string;
    total: number;
    discountTotal: number;
    shippingFee: number;
  }>,
): DailySalesBucket[] {
  const buckets = new Map<string, DailySalesBucket>();
  for (const ord of orders) {
    if (ord.status === "cancelled") {
      continue;
    }
    const day = ord.createdAt.toISOString().slice(0, 10);
    const existing = buckets.get(day) ?? {
      day,
      ordersCount: 0,
      revenue: 0,
      discountTotal: 0,
      shippingTotal: 0,
    };
    existing.ordersCount += 1;
    existing.revenue += ord.total;
    existing.discountTotal += ord.discountTotal;
    existing.shippingTotal += ord.shippingFee;
    buckets.set(day, existing);
  }
  return Array.from(buckets.values()).sort((a, b) =>
    a.day.localeCompare(b.day),
  );
}

export type RfmSegment =
  | "champions"
  | "loyal"
  | "at_risk"
  | "hibernating"
  | "promising";

export function computeRfmScore(input: {
  recencyDays: number;
  frequency: number;
  monetaryPoisha: number;
}): { r: number; f: number; m: number; segment: RfmSegment } {
  const r =
    input.recencyDays <= 7
      ? 5
      : input.recencyDays <= 30
        ? 4
        : input.recencyDays <= 60
          ? 3
          : input.recencyDays <= 120
            ? 2
            : 1;

  const f =
    input.frequency >= 10
      ? 5
      : input.frequency >= 5
        ? 4
        : input.frequency >= 3
          ? 3
          : input.frequency >= 2
            ? 2
            : 1;

  const m =
    input.monetaryPoisha >= 1_000_000
      ? 5
      : input.monetaryPoisha >= 500_000
        ? 4
        : input.monetaryPoisha >= 200_000
          ? 3
          : input.monetaryPoisha >= 50_000
            ? 2
            : 1;

  let segment: RfmSegment = "promising";
  if (r >= 4 && f >= 4) {
    segment = "champions";
  } else if (r <= 2 && f >= 3) {
    segment = "at_risk";
  } else if (f >= 3) {
    segment = "loyal";
  } else if (r === 1 && f <= 2) {
    segment = "hibernating";
  }

  return { r, f, m, segment };
}

export function computePeriodDelta(
  current: number,
  previous: number,
): { current: number; previous: number; deltaPct: number } {
  if (previous === 0) {
    return { current, previous, deltaPct: current > 0 ? 100 : 0 };
  }
  const deltaPct = Math.round(((current - previous) / previous) * 100);
  return { current, previous, deltaPct };
}

export function exportRowsToCsv(
  headers: readonly string[],
  rows: ReadonlyArray<ReadonlyArray<string | number>>,
): string {
  const escape = (val: string | number) => {
    const str = String(val);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  return [
    headers.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ].join("\n");
}
