"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import { formatBdt } from "@/lib/money";
import {
  createSpecialDayAction,
  deleteCouponAction,
  deleteSpecialDayAction,
  seedYearlyEventsAction,
  upsertCampaignAction,
  upsertCouponAction,
} from "@/modules/pricing/actions";

export interface CouponsManagerProps {
  section?: "coupons" | "campaigns" | "events" | "all";
  coupons: ReadonlyArray<{
    id: string;
    code: string;
    type: string;
    value: number;
    minCart: number;
    status: string;
    expiresAt: string;
  }>;
  campaigns: ReadonlyArray<{
    id: string;
    name: string;
    type: string;
    status: string;
    startsAt: string;
    endsAt: string;
  }>;
  specialDays: ReadonlyArray<{
    id: string;
    name: string;
    startsAt: string;
    endsAt: string;
    banner: string | null;
    discountType: string;
    value: number;
  }>;
}

const INPUT_CLS =
  "w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition";
const LABEL_CLS = "block text-xs font-semibold text-slate-600 mb-1";

export function CouponsManager({
  section = "all",
  coupons,
  campaigns,
  specialDays,
}: CouponsManagerProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percentage" | "fixed">("percentage");
  const [value, setValue] = useState("10");
  const [minCart, setMinCart] = useState("0");
  const [daysValid, setDaysValid] = useState("30");

  const [campName, setCampName] = useState("");
  const [campType, setCampType] = useState<"flash_sale" | "seasonal" | "bundle">("flash_sale");
  const [campDiscountType, setCampDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [campValue, setCampValue] = useState("15");
  const [campHours, setCampHours] = useState("24");

  const currentYear = new Date().getUTCFullYear();
  const [evName, setEvName] = useState("");
  const [evDate, setEvDate] = useState(`${currentYear}-12-16`);
  const [evEndDate, setEvEndDate] = useState(`${currentYear}-12-16`);
  const [evDiscountType, setEvDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [evValue, setEvValue] = useState("16");
  const [evBanner, setEvBanner] = useState("");

  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleCreateCoupon(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const now = new Date();
    const expires = new Date(
      now.getTime() + (Number.parseInt(daysValid || "30", 10) || 30) * 86_400_000,
    );
    const res = await upsertCouponAction({
      code,
      type,
      value: Number.parseInt(value || "10", 10),
      minCart: Number.parseInt(minCart || "0", 10),
      startsAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      status: "active",
    });
    setSaving(false);
    if (!res.ok) {
      setMsg({ ok: false, text: res.message });
      return;
    }
    const savedCode = code;
    setCode("");
    setMsg({ ok: true, text: `Coupon ${savedCode} saved.` });
    router.refresh();
  }

  async function handleDeleteCoupon(id: string) {
    const res = await deleteCouponAction({ id });
    if (!res.ok) {
      setMsg({ ok: false, text: res.message });
      return;
    }
    router.refresh();
  }

  async function handleCreateCampaign(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const now = new Date();
    const ends = new Date(
      now.getTime() + (Number.parseInt(campHours || "24", 10) || 24) * 3_600_000,
    );
    const res = await upsertCampaignAction({
      name: campName,
      type: campType,
      startsAt: now.toISOString(),
      endsAt: ends.toISOString(),
      discountType: campDiscountType,
      value: Number.parseInt(campValue || "15", 10),
      status: "active",
    });
    setSaving(false);
    if (!res.ok) {
      setMsg({ ok: false, text: res.message });
      return;
    }
    setCampName("");
    setMsg({ ok: true, text: "Flash sale / campaign created." });
    router.refresh();
  }

  async function handleCreateSpecialDay(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const res = await createSpecialDayAction({
      name: evName,
      startsAt: `${evDate}T00:00:00Z`,
      endsAt: `${evEndDate}T23:59:59Z`,
      banner: evBanner.trim() || null,
      discountType: evDiscountType,
      value: Number.parseInt(evValue || "10", 10),
    });
    setSaving(false);
    if (!res.ok) {
      setMsg({ ok: false, text: res.message });
      return;
    }
    setEvName("");
    setEvBanner("");
    setMsg({ ok: true, text: "Yearly event promotion scheduled." });
    router.refresh();
  }

  async function handleSeedYearlyEvents() {
    setSaving(true);
    setMsg(null);
    const res = await seedYearlyEventsAction({ year: currentYear });
    setSaving(false);
    if (!res.ok) {
      setMsg({ ok: false, text: res.message });
      return;
    }
    setMsg({
      ok: true,
      text: `Added ${currentYear} yearly events (Valentine's, 26 Mar, Pohela Boishakh, 11.11, 16 Dec).`,
    });
    router.refresh();
  }

  async function handleDeleteSpecialDay(id: string) {
    const res = await deleteSpecialDayAction({ id });
    if (!res.ok) {
      setMsg({ ok: false, text: res.message });
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {msg !== null && (
        <div
          role="status"
          className={`p-3 rounded text-xs font-medium border ${
            msg.ok
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-rose-50 border-rose-200 text-rose-700"
          }`}
        >
          {msg.text}
        </div>
      )}

      {(section === "all" || section === "coupons") && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900 m-0">
            Create Coupon
          </h3>
          <form onSubmit={handleCreateCoupon} className="space-y-3">
            <div>
              <label className={LABEL_CLS}>Coupon Code</label>
              <input
                type="text"
                required
                placeholder="SAVE10"
                className={INPUT_CLS}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLS}>Type</label>
                <select
                  className={INPUT_CLS}
                  value={type}
                  onChange={(e) =>
                    setType(e.target.value as "percentage" | "fixed")
                  }
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed (Poisha)</option>
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Value</label>
                <input
                  type="number"
                  min={1}
                  required
                  className={INPUT_CLS}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLS}>Min Cart (Poisha)</label>
                <input
                  type="number"
                  min={0}
                  className={INPUT_CLS}
                  value={minCart}
                  onChange={(e) => setMinCart(e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Valid Days</label>
                <input
                  type="number"
                  min={1}
                  className={INPUT_CLS}
                  value={daysValid}
                  onChange={(e) => setDaysValid(e.target.value)}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded shadow-sm"
            >
              {saving ? "Saving..." : "Save Coupon"}
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200/80">
            <h3 className="text-sm font-bold text-slate-900 m-0">
              Coupons ({coupons.length})
            </h3>
          </div>
          {coupons.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No coupons created yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200/80">
                  <tr>
                    <th className="py-2.5 px-4">Code</th>
                    <th className="py-2.5 px-4">Discount</th>
                    <th className="py-2.5 px-4">Min Cart</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {coupons.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-bold text-indigo-600">
                        {c.code}
                      </td>
                      <td className="py-2.5 px-4">
                        {c.type === "percentage"
                          ? `${c.value}%`
                          : formatBdt(c.value)}
                      </td>
                      <td className="py-2.5 px-4">{formatBdt(c.minCart)}</td>
                      <td className="py-2.5 px-4">{c.status}</td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteCoupon(c.id)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-xs font-semibold"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      )}

      {(section === "all" || section === "campaigns") && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900 m-0">
            Create Flash Sale / Campaign
          </h3>
          <form onSubmit={handleCreateCampaign} className="space-y-3">
            <div>
              <label className={LABEL_CLS}>Campaign Name</label>
              <input
                type="text"
                required
                placeholder="Eid Flash Sale"
                className={INPUT_CLS}
                value={campName}
                onChange={(e) => setCampName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLS}>Type</label>
                <select
                  className={INPUT_CLS}
                  value={campType}
                  onChange={(e) =>
                    setCampType(
                      e.target.value as "flash_sale" | "seasonal" | "bundle",
                    )
                  }
                >
                  <option value="flash_sale">Flash Sale</option>
                  <option value="seasonal">Seasonal</option>
                  <option value="bundle">Bundle</option>
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Duration (Hours)</label>
                <input
                  type="number"
                  min={1}
                  className={INPUT_CLS}
                  value={campHours}
                  onChange={(e) => setCampHours(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLS}>Discount Type</label>
                <select
                  className={INPUT_CLS}
                  value={campDiscountType}
                  onChange={(e) =>
                    setCampDiscountType(
                      e.target.value as "percentage" | "fixed",
                    )
                  }
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed (Poisha)</option>
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Discount Value</label>
                <input
                  type="number"
                  min={1}
                  required
                  className={INPUT_CLS}
                  value={campValue}
                  onChange={(e) => setCampValue(e.target.value)}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded shadow-sm"
            >
              {saving ? "Saving..." : "Launch Campaign"}
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200/80">
            <h3 className="text-sm font-bold text-slate-900 m-0">
              Campaigns ({campaigns.length})
            </h3>
          </div>
          {campaigns.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No campaigns created yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200/80">
                  <tr>
                    <th className="py-2.5 px-4">Name</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Ends</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {campaigns.map((cp) => (
                    <tr key={cp.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        {cp.name}
                      </td>
                      <td className="py-2.5 px-4">{cp.type}</td>
                      <td className="py-2.5 px-4">{cp.status}</td>
                      <td className="py-2.5 px-4 text-right text-slate-500">
                        {cp.endsAt.slice(0, 10)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      )}

      {(section === "all" || section === "events") && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900 m-0">
              Yearly Event Promotion
            </h3>
            <button
              type="button"
              disabled={saving}
              onClick={handleSeedYearlyEvents}
              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[11px] font-semibold"
            >
              + Auto-Seed {currentYear} Events
            </button>
          </div>
          <form onSubmit={handleCreateSpecialDay} className="space-y-3">
            <div>
              <label className={LABEL_CLS}>Event Name</label>
              <input
                type="text"
                required
                placeholder="16 December Victory Day"
                className={INPUT_CLS}
                value={evName}
                onChange={(e) => setEvName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLS}>Start Date</label>
                <input
                  type="date"
                  required
                  className={INPUT_CLS}
                  value={evDate}
                  onChange={(e) => setEvDate(e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>End Date</label>
                <input
                  type="date"
                  required
                  className={INPUT_CLS}
                  value={evEndDate}
                  onChange={(e) => setEvEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLS}>Discount Type</label>
                <select
                  className={INPUT_CLS}
                  value={evDiscountType}
                  onChange={(e) =>
                    setEvDiscountType(e.target.value as "percentage" | "fixed")
                  }
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed (Poisha)</option>
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Discount Value</label>
                <input
                  type="number"
                  min={1}
                  required
                  className={INPUT_CLS}
                  value={evValue}
                  onChange={(e) => setEvValue(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className={LABEL_CLS}>Storefront Promo Banner</label>
              <input
                type="text"
                placeholder="16 December Victory Day: 16% OFF!"
                className={INPUT_CLS}
                value={evBanner}
                onChange={(e) => setEvBanner(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded shadow-sm"
            >
              {saving ? "Saving..." : "Schedule Event Promo"}
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200/80">
            <h3 className="text-sm font-bold text-slate-900 m-0">
              Scheduled Yearly Events ({specialDays.length})
            </h3>
          </div>
          {specialDays.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No yearly events scheduled yet. Click &ldquo;Auto-Seed {currentYear} Events&rdquo; or create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200/80">
                  <tr>
                    <th className="py-2.5 px-4">Event</th>
                    <th className="py-2.5 px-4">Window</th>
                    <th className="py-2.5 px-4">Discount</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {specialDays.map((sd) => (
                    <tr key={sd.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {sd.name}
                        </div>
                        {sd.banner !== null && (
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">
                            {sd.banner}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">
                        {sd.startsAt.slice(0, 10)} → {sd.endsAt.slice(0, 10)}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-emerald-600">
                        {sd.discountType === "percentage"
                          ? `${sd.value}% OFF`
                          : formatBdt(sd.value)}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteSpecialDay(sd.id)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-xs font-semibold"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
