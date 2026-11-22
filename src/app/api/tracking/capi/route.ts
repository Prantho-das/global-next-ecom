import { NextResponse } from "next/server";
import { z } from "zod";

import { sendServerConversionEvent } from "@/modules/marketing/capi";

const capiRequestSchema = z.object({
  eventName: z.enum([
    "PageView",
    "ViewContent",
    "AddToCart",
    "InitiateCheckout",
    "Purchase",
  ]),
  eventId: z.string().min(4).max(120).optional(),
  sourceUrl: z.string().max(500).optional(),
  currency: z.string().max(10).optional(),
  valueMajor: z.number().min(0).optional(),
  orderId: z.string().max(120).optional(),
  contentIds: z.array(z.string().max(120)).max(50).optional(),
  numItems: z.number().int().min(0).optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = capiRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Validation failed" },
      { status: 400 },
    );
  }

  const result = await sendServerConversionEvent(parsed.data);
  return NextResponse.json({ ok: true, ...result });
}
