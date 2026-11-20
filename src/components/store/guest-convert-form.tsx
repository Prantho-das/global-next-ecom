"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { convertGuestToAccountAction } from "@/modules/sales/actions";

export interface GuestConvertFormProps {
  orderNumber: string;
  phone: string;
}

export function GuestConvertForm({ orderNumber, phone }: GuestConvertFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const res = await convertGuestToAccountAction({
      orderNumber,
      phone,
      email,
      password,
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="card-panel green lighten-5 green-text text-darken-4">
        Account created! You can now sign in with {email}.
      </div>
    );
  }

  return (
    <div className="card-panel white">
      <h2 style={{ fontSize: "1.25rem", marginTop: 0 }}>
        Create account to track orders
      </h2>
      {error !== null && (
        <div role="alert" className="red-text">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="input-field">
          <label htmlFor="conv-email" className="active">
            Email
          </label>
          <input
            id="conv-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="input-field">
          <label htmlFor="conv-pass" className="active">
            Password (min 8 chars)
          </label>
          <input
            id="conv-pass"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="btn waves-effect waves-light"
          disabled={loading}
        >
          {loading ? "Creating..." : "Create Account"}
        </button>
      </form>
    </div>
  );
}
