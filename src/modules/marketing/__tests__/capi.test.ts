import { describe, expect, it } from "vitest";

import { buildMetaCapiPayload, hashCapiValue } from "@/modules/marketing/capi";

describe("conversion api helpers", () => {
  it("normalizes and hashes PII values using SHA-256", () => {
    const h1 = hashCapiValue("  User@Example.COM ");
    const h2 = hashCapiValue("user@example.com");
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });

  it("builds Meta CAPI Purchase payload with hashed user_data and event_id", () => {
    const payload = buildMetaCapiPayload(
      {
        eventName: "Purchase",
        eventId: "evt_123",
        eventTime: 1700000000,
        currency: "BDT",
        valueMajor: 1550,
        orderId: "ORD-1001",
        contentIds: ["var_1", "var_2"],
        numItems: 3,
        userData: {
          phone: "01712345678",
          email: "Buyer@Test.com",
          firstName: "Rahim",
          city: "Dhaka",
          country: "BD",
          clientIp: "103.10.10.1",
          fbp: "fb.1.1700000000.12345",
        },
      },
      "TEST99",
    );

    expect(payload.test_event_code).toBe("TEST99");
    const data = payload.data as Array<Record<string, unknown>>;
    expect(data).toHaveLength(1);
    expect(data[0]?.event_name).toBe("Purchase");
    expect(data[0]?.event_id).toBe("evt_123");
    expect(data[0]?.action_source).toBe("website");

    const userData = data[0]?.user_data as Record<string, unknown>;
    expect(userData.ph).toEqual([hashCapiValue("8801712345678")]);
    expect(userData.em).toEqual([hashCapiValue("buyer@test.com")]);
    expect(userData.client_ip_address).toBe("103.10.10.1");
    expect(userData.fbp).toBe("fb.1.1700000000.12345");

    const customData = data[0]?.custom_data as Record<string, unknown>;
    expect(customData.currency).toBe("BDT");
    expect(customData.value).toBe(1550);
    expect(customData.order_id).toBe("ORD-1001");
    expect(customData.content_type).toBe("product");
  });
});
