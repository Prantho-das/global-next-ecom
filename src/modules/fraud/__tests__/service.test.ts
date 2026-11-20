import { describe, expect, it } from "vitest";

import {
  DEFAULT_FRAUD_RULES,
  evaluateFraudRisk,
} from "@/modules/fraud/service";

const cleanInput = {
  phone: "01712345678",
  addressLine: "House 12, Road 5, Dhanmondi",
  isNewCustomer: false,
  paymentMethod: "cod" as const,
  orderTotalPoisha: 150000,
  maxLineQty: 2,
  blacklistHit: false,
  ordersLast24hByPhone: 1,
  ordersLast1hByIp: 1,
  distinctPhonesOnDevice: 1,
  courierStats: { delivered: 5, returned: 0, cancelled: 0 },
  rules: DEFAULT_FRAUD_RULES,
};

describe("fraud scoring engine", () => {
  it("scores clean order as low risk and approve", () => {
    const res = evaluateFraudRisk(cleanInput);
    expect(res.score).toBe(0);
    expect(res.riskLevel).toBe("low");
    expect(res.decision).toBe("approve");
  });

  it("flags blacklist hit as 100 high risk hold", () => {
    const res = evaluateFraudRisk({ ...cleanInput, blacklistHit: true });
    expect(res.score).toBe(100);
    expect(res.riskLevel).toBe("high");
    expect(res.decision).toBe("hold");
  });

  it("scores medium risk (30-59) as sms_verify", () => {
    const res = evaluateFraudRisk({
      ...cleanInput,
      ordersLast24hByPhone: 5,
      addressLine: "short",
    });
    expect(res.score).toBe(35);
    expect(res.riskLevel).toBe("medium");
    expect(res.decision).toBe("sms_verify");
  });

  it("evaluates courier_ratio, fake_phone, high_cod_new, and qty_anomaly signals", () => {
    const res = evaluateFraudRisk({
      ...cleanInput,
      phone: "01711111111",
      isNewCustomer: true,
      orderTotalPoisha: 700000,
      maxLineQty: 15,
      courierStats: { delivered: 1, returned: 3, cancelled: 1 },
    });
    expect(res.score).toBe(75);
    expect(res.riskLevel).toBe("high");
    expect(res.decision).toBe("hold");
    const matchedKeys = res.signals
      .filter((s) => s.matched)
      .map((s) => s.key);
    expect(matchedKeys).toEqual(
      expect.arrayContaining([
        "courier_ratio",
        "fake_phone",
        "high_cod_new",
        "qty_anomaly",
      ]),
    );
  });
});
