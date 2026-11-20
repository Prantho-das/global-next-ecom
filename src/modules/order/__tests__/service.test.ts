import { describe, expect, it } from "vitest";

import { AppError } from "@/lib/errors";
import {
  assertValidOrderTransition,
  routeOrderByRisk,
  shouldRestockOnTransition,
} from "@/modules/order/service";

describe("order state machine", () => {
  it("allows valid lifecycle transitions", () => {
    expect(() =>
      assertValidOrderTransition("pending", "confirmed"),
    ).not.toThrow();
    expect(() =>
      assertValidOrderTransition("confirmed", "processing"),
    ).not.toThrow();
    expect(() =>
      assertValidOrderTransition("processing", "shipped"),
    ).not.toThrow();
    expect(() =>
      assertValidOrderTransition("shipped", "delivered"),
    ).not.toThrow();
  });

  it("throws CONFLICT on illegal transitions", () => {
    expect(() =>
      assertValidOrderTransition("delivered", "pending"),
    ).toThrow(AppError);
    expect(() =>
      assertValidOrderTransition("cancelled", "confirmed"),
    ).toThrow(/Illegal order transition/);
    expect(() =>
      assertValidOrderTransition("pending", "delivered"),
    ).toThrow(/Illegal order transition/);
  });

  it("routes orders by fraud risk level", () => {
    expect(routeOrderByRisk("low")).toEqual({
      initialStatus: "confirmed",
      requiresSmsVerify: false,
    });
    expect(routeOrderByRisk("medium")).toEqual({
      initialStatus: "confirmed",
      requiresSmsVerify: true,
    });
    expect(routeOrderByRisk("high")).toEqual({
      initialStatus: "on_hold",
      requiresSmsVerify: false,
    });
  });

  it("identifies restock transitions", () => {
    expect(shouldRestockOnTransition("cancelled")).toBe(true);
    expect(shouldRestockOnTransition("returned")).toBe(true);
    expect(shouldRestockOnTransition("shipped")).toBe(false);
  });
});
