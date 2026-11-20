import { asc } from "drizzle-orm";

import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { checkPermission } from "@/lib/guard";
import { toTaka } from "@/lib/money";
import { aggSalesDaily } from "@/modules/report/schema";
import { exportRowsToCsv } from "@/modules/report/service";

export async function GET(): Promise<Response> {
  const session = await getSession();
  const allowed = await checkPermission(
    session?.user?.id ?? null,
    "report:export",
  );
  if (!allowed) {
    return new Response("Forbidden", { status: 403 });
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(aggSalesDaily)
    .orderBy(asc(aggSalesDaily.day));

  const csv = exportRowsToCsv(
    ["Day", "Orders", "Revenue (BDT)", "Discounts (BDT)", "Shipping (BDT)"],
    rows.map((r) => [
      r.day,
      r.ordersCount,
      toTaka(r.revenue),
      toTaka(r.discountTotal),
      toTaka(r.shippingTotal),
    ]),
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="sales-report.csv"',
    },
  });
}
