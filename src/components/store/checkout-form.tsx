"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import { formatBdt } from "@/lib/money";
import {
  placeCodOrderAction,
  requestCheckoutOtpAction,
} from "@/modules/sales/actions";
import type { CartViewItem } from "@/modules/sales/queries";
import { DEFAULT_FLAT_SHIPPING_POISHA } from "@/modules/sales/service";

const BD_DIVISIONS: Record<string, Record<string, string[]>> = {
  Dhaka: {
    Dhaka: ["Dhanmondi", "Gulshan", "Mirpur", "Uttara", "Mohammadpur"],
    Gazipur: ["Gazipur Sadar", "Tongi", "Sreepur"],
  },
  Chattogram: {
    Chattogram: ["Kotwali", "Panchlaish", "Halishahar", "Agrabad"],
    "Cox's Bazar": ["Cox's Bazar Sadar", "Teknaf"],
  },
  Sylhet: {
    Sylhet: ["Sylhet Sadar", "Beanibazar"],
  },
};

export interface CheckoutFormProps {
  items: readonly CartViewItem[];
  subtotal: number;
}

export function CheckoutForm({ items, subtotal }: CheckoutFormProps) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [division, setDivision] = useState("Dhaka");
  const [district, setDistrict] = useState("Dhaka");
  const [thana, setThana] = useState("Dhanmondi");
  const [line, setLine] = useState("");
  const [note, setNote] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const districts = Object.keys(BD_DIVISIONS[division] ?? {});
  const thanas = BD_DIVISIONS[division]?.[district] ?? [];

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const res = await placeCodOrderAction({
      phone,
      name,
      division,
      district,
      thana,
      line,
      note: note.trim() || undefined,
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

          <div className="row">
            <div className="col s12 m4">
              <label htmlFor="chk-div">Division</label>
              <select
                id="chk-div"
                className="browser-default"
                value={division}
                onChange={(e) => {
                  const nextDiv = e.target.value;
                  setDivision(nextDiv);
                  const nextDist = Object.keys(BD_DIVISIONS[nextDiv] ?? {})[0] ?? "";
                  setDistrict(nextDist);
                  setThana(BD_DIVISIONS[nextDiv]?.[nextDist]?.[0] ?? "");
                }}
              >
                {Object.keys(BD_DIVISIONS).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="col s12 m4">
              <label htmlFor="chk-dist">District</label>
              <select
                id="chk-dist"
                className="browser-default"
                value={district}
                onChange={(e) => {
                  const nextDist = e.target.value;
                  setDistrict(nextDist);
                  setThana(BD_DIVISIONS[division]?.[nextDist]?.[0] ?? "");
                }}
              >
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="col s12 m4">
              <label htmlFor="chk-thana">Thana</label>
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
          <p>
            Subtotal <span className="right">{formatBdt(subtotal)}</span>
          </p>
          <p>
            Shipping (Flat){" "}
            <span className="right">
              {formatBdt(DEFAULT_FLAT_SHIPPING_POISHA)}
            </span>
          </p>
          <p style={{ fontWeight: 700, fontSize: "1.15rem" }}>
            Total{" "}
            <span className="right">
              {formatBdt(subtotal + DEFAULT_FLAT_SHIPPING_POISHA)}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
