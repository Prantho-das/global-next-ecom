"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { formatBdt } from "@/lib/money";
import {
  requestTrackOtpAction,
  verifyTrackOrderAction,
} from "@/modules/sales/actions";

export interface TrackOrderClientProps {
  initialPhone: string;
  initialOrder: string;
}

interface TrackResult {
  order: {
    id: string;
    number: string;
    status: string;
    paymentStatus: string;
    total: number;
    createdAt: Date;
  };
  events: Array<{
    id: string;
    toStatus: string;
    note: string | null;
    createdAt: Date;
  }>;
}

export function TrackOrderClient({
  initialPhone,
  initialOrder,
}: TrackOrderClientProps) {
  const [phone, setPhone] = useState(initialPhone);
  const [orderNumber, setOrderNumber] = useState(initialOrder);
  const [otpCode, setOtpCode] = useState("");
  const [genericMsg, setGenericMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackResult | null>(null);

  async function handleRequestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const res = await requestTrackOtpAction({ phone, orderNumber });
    setLoading(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setGenericMsg(res.data.message);
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const res = await verifyTrackOrderAction({ phone, orderNumber, otpCode });
    setLoading(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setResult(res.data);
  }

  return (
    <div className="row">
      <div className="col s12 m6">
        <div className="card-panel white">
          <h2 style={{ fontSize: "1.25rem", marginTop: 0 }}>
            1. Request Verification OTP
          </h2>
          {error !== null && (
            <div role="alert" className="red-text">
              {error}
            </div>
          )}
          {genericMsg !== null && (
            <div role="status" className="teal-text">
              {genericMsg}
            </div>
          )}
          <form onSubmit={handleRequestOtp}>
            <div className="input-field">
              <label htmlFor="trk-phone" className="active">
                Phone Number
              </label>
              <input
                id="trk-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="input-field">
              <label htmlFor="trk-order" className="active">
                Order Number
              </label>
              <input
                id="trk-order"
                type="text"
                required
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="btn waves-effect waves-light"
              disabled={loading}
            >
              Send OTP
            </button>
          </form>

          <form onSubmit={handleVerify} style={{ marginTop: "24px" }}>
            <h2 style={{ fontSize: "1.25rem" }}>2. Verify OTP</h2>
            <div className="input-field">
              <label htmlFor="trk-otp" className="active">
                6-Digit OTP
              </label>
              <input
                id="trk-otp"
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="btn waves-effect waves-light"
              disabled={loading}
            >
              View Order Status
            </button>
          </form>
        </div>
      </div>

      {result !== null && (
        <div className="col s12 m6">
          <div className="card-panel white">
            <h2 style={{ fontSize: "1.25rem", marginTop: 0 }}>
              Order {result.order.number}
            </h2>
            <p>
              Status: <strong>{result.order.status}</strong>
            </p>
            <p>Total: {formatBdt(result.order.total)}</p>
            <ul className="collection">
              {result.events.map((ev) => (
                <li key={ev.id} className="collection-item">
                  <strong>{ev.toStatus}</strong>
                  {ev.note !== null ? ` — ${ev.note}` : ""}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
