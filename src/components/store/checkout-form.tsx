"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { formatBdt } from "@/lib/money";
import { trackStoreEvent } from "@/lib/tracking";
import { captureAbandonContactAction } from "@/modules/marketing/actions";
import { applyCouponPreviewAction } from "@/modules/pricing/actions";
import type { PriceBreakdown } from "@/modules/pricing/types";
import {
  placeCodOrderAction,
  requestCheckoutOtpAction,
} from "@/modules/sales/actions";
import type { CartViewItem } from "@/modules/sales/queries";
import { DEFAULT_FLAT_SHIPPING_POISHA } from "@/modules/sales/service";
import type { ShippingLocationRule } from "@/modules/settings/queries";

const LOCATION_TREE: Record<
  string,
  Record<string, Record<string, string[]>>
> = {
  Bangladesh: {
    Dhaka: {
      Dhaka: ["Dhanmondi", "Gulshan", "Mirpur", "Uttara", "Mohammadpur", "Motijheel", "Banani"],
      Gazipur: ["Gazipur Sadar", "Tongi", "Sreepur"],
      Narayanganj: ["Narayanganj Sadar", "Siddhirganj", "Fatullah"],
      Savar: ["Savar Sadar", "Ashulia"],
    },
    Chattogram: {
      Chattogram: ["Kotwali", "Panchlaish", "Halishahar", "Agrabad"],
      "Cox's Bazar": ["Cox's Bazar Sadar", "Teknaf"],
      Cumilla: ["Cumilla Sadar", "Daudkandi"],
    },
    Sylhet: {
      Sylhet: ["Sylhet Sadar", "Beanibazar", "Zindabazar"],
      Moulvibazar: ["Moulvibazar Sadar", "Sreemangal"],
    },
    Rajshahi: {
      Rajshahi: ["Boalia", "Motihar", "Rajpara"],
      Bogura: ["Bogura Sadar", "Sherpur"],
    },
    Khulna: {
      Khulna: ["Khulna Sadar", "Sonadanga", "Khalishpur"],
      Jashore: ["Jashore Sadar", "Benapole"],
    },
    Barishal: {
      Barishal: ["Barishal Sadar", "Babuganj"],
    },
    Rangpur: {
      Rangpur: ["Rangpur Sadar", "Mithapukur"],
    },
    Mymensingh: {
      Mymensingh: ["Mymensingh Sadar", "Trishal"],
    },
  },
  India: {
    "West Bengal": {
      Kolkata: ["Salt Lake", "Park Street", "New Town", "Howrah"],
      Siliguri: ["Siliguri Town", "Matigara"],
    },
    Maharashtra: {
      Mumbai: ["Andheri", "Bandra", "Colaba"],
      Pune: ["Kothrud", "Hinjewadi"],
    },
    Delhi: {
      "New Delhi": ["Connaught Place", "Saket", "Dwarka"],
    },
  },
  "United Arab Emirates": {
    Dubai: {
      Dubai: ["Deira", "Bur Dubai", "Downtown", "Marina"],
    },
    "Abu Dhabi": {
      "Abu Dhabi": ["Al Reem", "Khalifa City"],
    },
  },
  "United Kingdom": {
    England: {
      London: ["Central London", "East London", "Canary Wharf"],
      Manchester: ["City Centre", "Salford"],
    },
  },
  "United States": {
    "New York": {
      "New York City": ["Manhattan", "Brooklyn", "Queens"],
    },
    California: {
      "Los Angeles": ["Downtown LA", "Santa Monica"],
    },
  },
};

export interface CheckoutFormProps {
  items: readonly CartViewItem[];
  subtotal: number;
  shippingMode?: "simple" | "advanced";
  insideDhakaFee?: number;
  outsideDhakaFee?: number;
  defaultCountry?: string;
  shippingLocations?: readonly ShippingLocationRule[];
}

export function CheckoutForm({
  items,
  subtotal,
  shippingMode = "simple",
  insideDhakaFee = 60,
  outsideDhakaFee = 120,
  defaultCountry = "Bangladesh",
  shippingLocations = [],
}: CheckoutFormProps) {
  const router = useRouter();
  const dynamicTree: Record<string, Record<string, Record<string, string[]>>> =
    shippingLocations.length > 0
      ? shippingLocations.reduce<
          Record<string, Record<string, Record<string, string[]>>>
        >((acc, loc) => {
          const cMap = (acc[loc.country] ??= {});
          const sMap = (cMap[loc.state] ??= {});
          const existingThanas =
            LOCATION_TREE[loc.country]?.[loc.state]?.[loc.area] ?? [loc.area];
          sMap[loc.area] = existingThanas;
          return acc;
        }, {})
      : LOCATION_TREE;

  const initialCountry =
    dynamicTree[defaultCountry] !== undefined
      ? defaultCountry
      : (Object.keys(dynamicTree)[0] ?? "Bangladesh");
  const initialState = Object.keys(dynamicTree[initialCountry] ?? {})[0] ?? "Dhaka";
  const initialDistrict =
    Object.keys(dynamicTree[initialCountry]?.[initialState] ?? {})[0] ?? "Dhaka";
  const initialThana =
    dynamicTree[initialCountry]?.[initialState]?.[initialDistrict]?.[0] ??
    "Dhanmondi";

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [simpleZone, setSimpleZone] = useState<"inside" | "outside">("inside");
  const [country, setCountry] = useState(initialCountry);
  const [division, setDivision] = useState(initialState);
  const [district, setDistrict] = useState(initialDistrict);
  const [thana, setThana] = useState(initialThana);
  const [line, setLine] = useState("");
  const [note, setNote] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponPreview, setCouponPreview] = useState<PriceBreakdown | null>(
    null,
  );
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trackStoreEvent("InitiateCheckout", {
      valueMajor: subtotal / 100,
      contentIds: items.map((i) => i.variantId),
      numItems: items.reduce((sum, i) => sum + i.qty, 0),
    });
  }, []);

  const states = Object.keys(dynamicTree[country] ?? {});
  const districts = Object.keys(dynamicTree[country]?.[division] ?? {});
  const thanas = dynamicTree[country]?.[division]?.[district] ?? [];

  const matchedRule = shippingLocations.find(
    (loc) =>
      loc.country === country &&
      loc.state === division &&
      loc.area === district,
  );

  const shippingFeePoisha =
    shippingMode === "simple"
      ? (simpleZone === "inside" ? insideDhakaFee : outsideDhakaFee) * 100
      : matchedRule !== undefined
        ? Math.round(matchedRule.cost * 100)
        : (country === "Bangladesh" && district === "Dhaka"
            ? insideDhakaFee
            : outsideDhakaFee) * 100 || DEFAULT_FLAT_SHIPPING_POISHA;

  async function handleSendOtp() {
    setError(null);
    setLoading(true);
    const res = await requestCheckoutOtpAction({ phone });
    setLoading(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setOtpSent(true);
  }

  async function handleApplyCoupon() {
    setError(null);
    const res = await applyCouponPreviewAction({
      code: couponCode,
      shippingFee: shippingFeePoisha,
    });
    if (!res.ok) {
      setCouponPreview(null);
      setError(res.message);
      return;
    }
    setCouponPreview(res.data);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const effectiveCountry = shippingMode === "simple" ? "Bangladesh" : country;
    const effectiveDivision =
      shippingMode === "simple"
        ? simpleZone === "inside"
          ? "Dhaka"
          : "Outside Dhaka"
        : division;
    const effectiveDistrict =
      shippingMode === "simple"
        ? simpleZone === "inside"
          ? "Dhaka"
          : "Outside Dhaka"
        : district;
    const effectiveThana =
      shippingMode === "simple"
        ? simpleZone === "inside"
          ? "Dhaka"
          : "Outside Dhaka"
        : thana;
    const res = await placeCodOrderAction({
      phone,
      name,
      country: effectiveCountry,
      division: effectiveDivision,
      district: effectiveDistrict,
      thana: effectiveThana,
      line,
      note: note.trim() || undefined,
      couponCode: couponCode.trim() || undefined,
      otpCode,
      idempotencyKey,
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    router.push(`/order-success/${encodeURIComponent(res.data.orderNumber)}`);
  }

  return (
    <div className="row">
      <div className="col s12 l7">
        <form onSubmit={handleSubmit} className="card-panel white">
          <h2 style={{ fontSize: "1.35rem", marginTop: 0 }}>
            Shipping &amp; Contact (Cash on Delivery)
          </h2>
          {error !== null && (
            <div
              role="alert"
              className="card-panel red lighten-5 red-text text-darken-4"
            >
              {error}
            </div>
          )}

          <div className="row">
            <div className="col s12 m8">
              <label htmlFor="chk-phone">Mobile Number (BD)</label>
              <input
                id="chk-phone"
                type="tel"
                required
                placeholder="01XXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => {
                  if (phone.trim().length >= 11) {
                    void captureAbandonContactAction({ contact: phone.trim() });
                  }
                }}
              />
            </div>
            <div className="col s12 m4" style={{ paddingTop: "24px" }}>
              <button
                type="button"
                className="btn-small waves-effect waves-light"
                disabled={loading || phone.trim().length < 11}
                onClick={handleSendOtp}
              >
                {otpSent ? "Resend OTP" : "Send OTP"}
              </button>
            </div>
          </div>

          <div className="input-field">
            <label htmlFor="chk-otp" className="active">
              6-Digit OTP
            </label>
            <input
              id="chk-otp"
              type="text"
              required
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
            />
          </div>

          <div className="input-field">
            <label htmlFor="chk-name" className="active">
              Full Name
            </label>
            <input
              id="chk-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {shippingMode === "simple" ? (
            <div className="row">
              <div className="col s12">
                <label htmlFor="chk-zone">Delivery Area</label>
                <select
                  id="chk-zone"
                  className="browser-default"
                  value={simpleZone}
                  onChange={(e) => {
                    const nextZone = e.target.value as "inside" | "outside";
                    setSimpleZone(nextZone);
                    setCouponPreview(null);
                  }}
                >
                  <option value="inside">
                    Inside Dhaka ({formatBdt(insideDhakaFee * 100)})
                  </option>
                  <option value="outside">
                    Outside Dhaka ({formatBdt(outsideDhakaFee * 100)})
                  </option>
                </select>
              </div>
            </div>
          ) : (
            <div className="row">
              <div className="col s12 m6">
                <label htmlFor="chk-country">Country</label>
                <select
                  id="chk-country"
                  className="browser-default"
                  value={country}
                  onChange={(e) => {
                    const nextCountry = e.target.value;
                    setCountry(nextCountry);
                    const nextState =
                      Object.keys(dynamicTree[nextCountry] ?? {})[0] ?? "";
                    setDivision(nextState);
                    const nextDist =
                      Object.keys(
                        dynamicTree[nextCountry]?.[nextState] ?? {},
                      )[0] ?? "";
                    setDistrict(nextDist);
                    setThana(
                      dynamicTree[nextCountry]?.[nextState]?.[nextDist]?.[0] ??
                        "",
                    );
                    setCouponPreview(null);
                  }}
                >
                  {Object.keys(dynamicTree).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col s12 m6">
                <label htmlFor="chk-div">State / Division</label>
                <select
                  id="chk-div"
                  className="browser-default"
                  value={division}
                  onChange={(e) => {
                    const nextDiv = e.target.value;
                    setDivision(nextDiv);
                    const nextDist =
                      Object.keys(
                        dynamicTree[country]?.[nextDiv] ?? {},
                      )[0] ?? "";
                    setDistrict(nextDist);
                    setThana(
                      dynamicTree[country]?.[nextDiv]?.[nextDist]?.[0] ?? "",
                    );
                    setCouponPreview(null);
                  }}
                >
                  {states.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col s12 m6" style={{ marginTop: "12px" }}>
                <label htmlFor="chk-dist">District / City</label>
                <select
                  id="chk-dist"
                  className="browser-default"
                  value={district}
                  onChange={(e) => {
                    const nextDist = e.target.value;
                    setDistrict(nextDist);
                    setThana(
                      dynamicTree[country]?.[division]?.[nextDist]?.[0] ?? "",
                    );
                    setCouponPreview(null);
                  }}
                >
                  {districts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col s12 m6" style={{ marginTop: "12px" }}>
                <label htmlFor="chk-thana">Area / Thana</label>
                <select
                  id="chk-thana"
                  className="browser-default"
                  value={thana}
                  onChange={(e) => setThana(e.target.value)}
                >
                  {thanas.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="input-field">
            <label htmlFor="chk-line" className="active">
              Full Address
            </label>
            <input
              id="chk-line"
              type="text"
              required
              placeholder="House, Road, Block"
              value={line}
              onChange={(e) => setLine(e.target.value)}
            />
          </div>

          <div className="input-field">
            <label htmlFor="chk-note" className="active">
              Order Note (Optional)
            </label>
            <input
              id="chk-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn-large waves-effect waves-light"
            disabled={loading}
            style={{ width: "100%" }}
          >
            {loading ? "Placing Order..." : "Place COD Order"}
          </button>
        </form>
      </div>

      <div className="col s12 l5">
        <div className="card-panel white">
          <h2 style={{ fontSize: "1.35rem", marginTop: 0 }}>Order Summary</h2>
          <ul className="collection">
            {items.map((item) => (
              <li key={item.variantId} className="collection-item">
                {item.productName} × {item.qty}
                <span className="right">
                  {formatBdt(item.unitPrice * item.qty)}
                </span>
              </li>
            ))}
          </ul>
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <input
              type="text"
              aria-label="Coupon code"
              placeholder="Coupon code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
            />
            <button
              type="button"
              className="btn-small"
              onClick={handleApplyCoupon}
              disabled={couponCode.trim().length === 0}
            >
              Apply
            </button>
          </div>
          <p>
            Subtotal{" "}
            <span className="right">
              {formatBdt(couponPreview?.subtotal ?? subtotal)}
            </span>
          </p>
          {couponPreview !== null && couponPreview.couponDiscount > 0 && (
            <p className="green-text">
              Coupon ({couponPreview.couponCode})
              <span className="right">
                -{formatBdt(couponPreview.couponDiscount)}
              </span>
            </p>
          )}
          <p>
            Shipping{" "}
            <span className="right">
              {formatBdt(
                couponPreview?.shippingFee ?? shippingFeePoisha,
              )}
            </span>
          </p>
          <p style={{ fontWeight: 700, fontSize: "1.15rem" }}>
            Total{" "}
            <span className="right">
              {formatBdt(
                couponPreview?.total ??
                  subtotal + shippingFeePoisha,
              )}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
