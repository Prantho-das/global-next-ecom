"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import { upsertCourierProviderAction } from "@/modules/courier/actions";
import { updateFraudRuleAction } from "@/modules/fraud/actions";
import { upsertPaymentProviderAction } from "@/modules/payment/actions";
import { saveSiteSettingsAction } from "@/modules/settings/actions";
import type { SiteSettingsConfig } from "@/modules/settings/queries";

export interface SettingsManagerProps {
  initialSettings: SiteSettingsConfig;
  paymentProviders: ReadonlyArray<{
    code: string;
    name: string;
    isActive: boolean;
    sandboxMode: boolean;
  }>;
  courierProviders: ReadonlyArray<{
    code: string;
    status: string;
  }>;
  fraudRules: ReadonlyArray<{
    key: string;
    weight: number;
    enabled: boolean;
  }>;
}

type SettingsTab =
  | "general"
  | "storefront"
  | "seo"
  | "tracking"
  | "checkout"
  | "payments"
  | "courier"
  | "notifications"
  | "fraud";

const TABS: ReadonlyArray<{ id: SettingsTab; label: string; icon: string }> = [
  { id: "general", label: "General", icon: "ti-building-store" },
  { id: "storefront", label: "Storefront", icon: "ti-layout-dashboard" },
  { id: "seo", label: "SEO & Meta", icon: "ti-world" },
  { id: "tracking", label: "Pixels & Analytics", icon: "ti-chart-dots" },
  { id: "checkout", label: "Checkout & Tax", icon: "ti-shopping-cart" },
  { id: "payments", label: "Payment Gateways", icon: "ti-credit-card" },
  { id: "courier", label: "Courier APIs", icon: "ti-truck-delivery" },
  { id: "notifications", label: "SMTP & SMS", icon: "ti-mail" },
  { id: "fraud", label: "Fraud & Security", icon: "ti-shield-lock" },
];

const INPUT_CLS =
  "w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition";
const LABEL_CLS = "block text-xs font-semibold text-slate-600 mb-1";

export function SettingsManager({
  initialSettings,
  paymentProviders,
  courierProviders,
  fraudRules,
}: SettingsManagerProps) {
  const router = useRouter();
  const logoFileRef = useRef<HTMLInputElement | null>(null);
  const [tab, setTab] = useState<SettingsTab>("general");
  const [cfg, setCfg] = useState<SiteSettingsConfig>(initialSettings);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleStoreLogoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file === undefined) return;
    setUploadingLogo(true);
    setStatusMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = (await res.json()) as { url?: string; error?: string };
    setUploadingLogo(false);
    if (!res.ok || data.url === undefined) {
      setStatusMsg({ ok: false, text: data.error ?? "Failed to upload logo" });
      return;
    }
    setCfg((prev) => ({ ...prev, logoUrl: data.url ?? "" }));
  }
  const [statusMsg, setStatusMsg] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const [payCode, setPayCode] = useState<"cod" | "sslcommerz" | "bkash" | "nagad">("sslcommerz");
  const [payName, setPayName] = useState("SSLCommerz");
  const [payStoreId, setPayStoreId] = useState("");
  const [payStorePass, setPayStorePass] = useState("");
  const [payActive, setPayActive] = useState(true);
  const [paySandbox, setPaySandbox] = useState(true);

  const [courCode, setCourCode] = useState<"steadfast" | "pathao" | "redx">("steadfast");
  const [courApiKey, setCourApiKey] = useState("");
  const [courSecret, setCourSecret] = useState("");
  const [courStatus, setCourStatus] = useState<"active" | "inactive">("active");

  const [ruleKey, setRuleKey] = useState(fraudRules[0]?.key ?? "high_cod_amount");
  const [ruleWeight, setRuleWeight] = useState(
    String(fraudRules[0]?.weight ?? 30),
  );
  const [ruleEnabled, setRuleEnabled] = useState(
    fraudRules[0]?.enabled ?? true,
  );

  async function saveGroup(
    group:
      | "general"
      | "storefront"
      | "seo"
      | "tracking"
      | "checkout"
      | "notifications"
      | "fraud",
    entries: Record<string, unknown>,
  ) {
    setSaving(true);
    setStatusMsg(null);
    const res = await saveSiteSettingsAction({ group, entries });
    setSaving(false);
    if (!res.ok) {
      setStatusMsg({ ok: false, text: res.message });
      return;
    }
    setStatusMsg({ ok: true, text: `Saved ${group} settings successfully.` });
    router.refresh();
  }

  async function handleSavePayment(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    const res = await upsertPaymentProviderAction({
      code: payCode,
      name: payName,
      config: {
        storeId: payStoreId,
        storePassword: payStorePass,
      },
      isActive: payActive,
      sandboxMode: paySandbox,
      position: 0,
    });
    setSaving(false);
    if (!res.ok) {
      setStatusMsg({ ok: false, text: res.message });
      return;
    }
    setStatusMsg({ ok: true, text: `Payment gateway ${payCode} updated.` });
    router.refresh();
  }

  async function handleSaveCourier(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    const res = await upsertCourierProviderAction({
      code: courCode,
      config: {
        apiKey: courApiKey,
        secretKey: courSecret,
      },
      status: courStatus,
    });
    setSaving(false);
    if (!res.ok) {
      setStatusMsg({ ok: false, text: res.message });
      return;
    }
    setStatusMsg({ ok: true, text: `Courier ${courCode} updated.` });
    router.refresh();
  }

  async function handleSaveFraudRule(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    const res = await updateFraudRuleAction({
      key: ruleKey,
      weight: Number.parseInt(ruleWeight || "0", 10),
      enabled: ruleEnabled,
    });
    setSaving(false);
    if (!res.ok) {
      setStatusMsg({ ok: false, text: res.message });
      return;
    }
    setStatusMsg({ ok: true, text: `Fraud rule ${ruleKey} updated.` });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200/80 rounded shadow-sm overflow-hidden">
        <div className="px-4 flex items-center gap-6 border-b border-slate-200/80 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setStatusMsg(null);
              }}
              className={`py-3 border-b-2 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition ${
                tab === t.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <i className={`ti ${t.icon} text-base`} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4">
          {statusMsg !== null && (
            <div
              role="status"
              className={`mb-4 p-3 rounded text-xs font-medium border ${
                statusMsg.ok
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-rose-50 border-rose-200 text-rose-700"
              }`}
            >
              {statusMsg.text}
            </div>
          )}

          {tab === "general" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void saveGroup("general", {
                  siteName: cfg.siteName,
                  tagline: cfg.tagline,
                  supportEmail: cfg.supportEmail,
                  supportPhone: cfg.supportPhone,
                  whatsappNumber: cfg.whatsappNumber,
                  storeAddress: cfg.storeAddress,
                  currency: cfg.currency,
                  timezone: cfg.timezone,
                  announcementBar: cfg.announcementBar,
                  maintenanceMode: cfg.maintenanceMode,
                  logoUrl: cfg.logoUrl,
                  faviconUrl: cfg.faviconUrl,
                  primaryColor: cfg.primaryColor,
                });
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLS}>Store Name</label>
                  <input
                    type="text"
                    className={INPUT_CLS}
                    value={cfg.siteName}
                    onChange={(e) => setCfg({ ...cfg, siteName: e.target.value })}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Tagline</label>
                  <input
                    type="text"
                    className={INPUT_CLS}
                    value={cfg.tagline}
                    onChange={(e) => setCfg({ ...cfg, tagline: e.target.value })}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Support Email</label>
                  <input
                    type="email"
                    className={INPUT_CLS}
                    value={cfg.supportEmail}
                    onChange={(e) =>
                      setCfg({ ...cfg, supportEmail: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Support Phone</label>
                  <input
                    type="text"
                    className={INPUT_CLS}
                    value={cfg.supportPhone}
                    onChange={(e) =>
                      setCfg({ ...cfg, supportPhone: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>WhatsApp Number</label>
                  <input
                    type="text"
                    className={INPUT_CLS}
                    value={cfg.whatsappNumber}
                    onChange={(e) =>
                      setCfg({ ...cfg, whatsappNumber: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Store Address</label>
                  <input
                    type="text"
                    className={INPUT_CLS}
                    value={cfg.storeAddress}
                    onChange={(e) =>
                      setCfg({ ...cfg, storeAddress: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Store Logo (Upload or URL)</label>
                  <input
                    ref={logoFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    className="hidden"
                    onChange={handleStoreLogoUpload}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => logoFileRef.current?.click()}
                      disabled={uploadingLogo}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-xs font-semibold text-slate-700 whitespace-nowrap"
                    >
                      {uploadingLogo ? "Uploading..." : "Upload Logo"}
                    </button>
                    <input
                      type="text"
                      className={INPUT_CLS}
                      value={cfg.logoUrl}
                      onChange={(e) => setCfg({ ...cfg, logoUrl: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className={LABEL_CLS}>Favicon URL</label>
                  <input
                    type="text"
                    className={INPUT_CLS}
                    value={cfg.faviconUrl}
                    onChange={(e) =>
                      setCfg({ ...cfg, faviconUrl: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Brand Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={cfg.primaryColor}
                      onChange={(e) =>
                        setCfg({ ...cfg, primaryColor: e.target.value })
                      }
                      className="h-8 w-10 rounded border border-slate-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      className={INPUT_CLS}
                      value={cfg.primaryColor}
                      onChange={(e) =>
                        setCfg({ ...cfg, primaryColor: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className={LABEL_CLS}>Currency</label>
                  <select
                    className={INPUT_CLS}
                    value={cfg.currency}
                    onChange={(e) => setCfg({ ...cfg, currency: e.target.value })}
                  >
                    <option value="BDT">BDT (৳)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS}>Timezone</label>
                  <input
                    type="text"
                    className={INPUT_CLS}
                    value={cfg.timezone}
                    onChange={(e) => setCfg({ ...cfg, timezone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className={LABEL_CLS}>Top Announcement Bar Text</label>
                <input
                  type="text"
                  placeholder="Free delivery on orders above ৳2,000!"
                  className={INPUT_CLS}
                  value={cfg.announcementBar}
                  onChange={(e) =>
                    setCfg({ ...cfg, announcementBar: e.target.value })
                  }
                />
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-semibold text-rose-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cfg.maintenanceMode}
                  onChange={(e) =>
                    setCfg({ ...cfg, maintenanceMode: e.target.checked })
                  }
                />
                <span>Enable Maintenance Mode (Pause storefront)</span>
              </label>

              <div>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded shadow-sm"
                >
                  {saving ? "Saving..." : "Save General Settings"}
                </button>
              </div>
            </form>
          )}

          {tab === "seo" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void saveGroup("seo", {
                  metaTitle: cfg.metaTitle,
                  metaDescription: cfg.metaDescription,
                  ogImage: cfg.ogImage,
                  robotsIndex: cfg.robotsIndex,
                });
              }}
              className="space-y-4 max-w-2xl"
            >
              <div>
                <label className={LABEL_CLS}>Default Meta Title</label>
                <input
                  type="text"
                  className={INPUT_CLS}
                  value={cfg.metaTitle}
                  onChange={(e) => setCfg({ ...cfg, metaTitle: e.target.value })}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Default Meta Description</label>
                <textarea
                  rows={3}
                  className={INPUT_CLS}
                  value={cfg.metaDescription}
                  onChange={(e) =>
                    setCfg({ ...cfg, metaDescription: e.target.value })
                  }
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Default OG Share Image URL</label>
                <input
                  type="text"
                  className={INPUT_CLS}
                  value={cfg.ogImage}
                  onChange={(e) => setCfg({ ...cfg, ogImage: e.target.value })}
                />
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cfg.robotsIndex}
                  onChange={(e) =>
                    setCfg({ ...cfg, robotsIndex: e.target.checked })
                  }
                />
                <span>Allow search engines to index storefront</span>
              </label>
              <div>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded shadow-sm"
                >
                  {saving ? "Saving..." : "Save SEO Settings"}
                </button>
              </div>
            </form>
          )}

          {tab === "tracking" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void saveGroup("tracking", {
                  metaPixelId: cfg.metaPixelId,
                  metaCapiEnabled: cfg.metaCapiEnabled,
                  metaCapiAccessToken: cfg.metaCapiAccessToken,
                  metaCapiTestEventCode: cfg.metaCapiTestEventCode,
                  ga4MeasurementId: cfg.ga4MeasurementId,
                  ga4ApiSecret: cfg.ga4ApiSecret,
                  gtmContainerId: cfg.gtmContainerId,
                  tiktokPixelId: cfg.tiktokPixelId,
                  tiktokAccessToken: cfg.tiktokAccessToken,
                });
              }}
              className="space-y-4 max-w-2xl"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLS}>Meta (Facebook) Pixel ID</label>
                  <input
                    type="text"
                    placeholder="123456789012345"
                    className={INPUT_CLS}
                    value={cfg.metaPixelId}
                    onChange={(e) =>
                      setCfg({ ...cfg, metaPixelId: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>GA4 Measurement ID</label>
                  <input
                    type="text"
                    placeholder="G-XXXXXXXXXX"
                    className={INPUT_CLS}
                    value={cfg.ga4MeasurementId}
                    onChange={(e) =>
                      setCfg({ ...cfg, ga4MeasurementId: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Google Tag Manager ID</label>
                  <input
                    type="text"
                    placeholder="GTM-XXXXXXX"
                    className={INPUT_CLS}
                    value={cfg.gtmContainerId}
                    onChange={(e) =>
                      setCfg({ ...cfg, gtmContainerId: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>TikTok Pixel ID</label>
                  <input
                    type="text"
                    className={INPUT_CLS}
                    value={cfg.tiktokPixelId}
                    onChange={(e) =>
                      setCfg({ ...cfg, tiktokPixelId: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                      Server-Side Conversion API (CAPI)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Browser Pixel + Server CAPI deduplication via event_id.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={cfg.metaCapiEnabled}
                      onChange={(e) =>
                        setCfg({ ...cfg, metaCapiEnabled: e.target.checked })
                      }
                    />
                    Enable Meta CAPI
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={LABEL_CLS}>
                      Meta CAPI Access Token
                    </label>
                    <input
                      type="password"
                      placeholder="EAA..."
                      className={INPUT_CLS}
                      value={cfg.metaCapiAccessToken}
                      onChange={(e) =>
                        setCfg({ ...cfg, metaCapiAccessToken: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>
                      Meta Test Event Code (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="TEST12345"
                      className={INPUT_CLS}
                      value={cfg.metaCapiTestEventCode}
                      onChange={(e) =>
                        setCfg({
                          ...cfg,
                          metaCapiTestEventCode: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>
                      GA4 Measurement Protocol API Secret
                    </label>
                    <input
                      type="password"
                      className={INPUT_CLS}
                      value={cfg.ga4ApiSecret}
                      onChange={(e) =>
                        setCfg({ ...cfg, ga4ApiSecret: e.target.value })
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={LABEL_CLS}>
                      TikTok Events API Access Token
                    </label>
                    <input
                      type="password"
                      className={INPUT_CLS}
                      value={cfg.tiktokAccessToken}
                      onChange={(e) =>
                        setCfg({ ...cfg, tiktokAccessToken: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded shadow-sm"
                >
                  {saving ? "Saving..." : "Save Tracking Settings"}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setStatusMsg(null);
                    const res = await fetch("/api/tracking/capi", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ eventName: "PageView" }),
                    });
                    const data = (await res.json()) as {
                      sent?: string[];
                      errors?: string[];
                    };
                    if (data.errors && data.errors.length > 0) {
                      setStatusMsg({
                        ok: false,
                        text: `CAPI Error: ${data.errors.join(", ")}`,
                      });
                    } else if (data.sent && data.sent.length > 0) {
                      setStatusMsg({
                        ok: true,
                        text: `CAPI Test Sent: ${data.sent.join(", ")}`,
                      });
                    } else {
                      setStatusMsg({
                        ok: false,
                        text: "No active CAPI provider configured or saved yet.",
                      });
                    }
                  }}
                  className="px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Test CAPI Event
                </button>
              </div>
            </form>
          )}

          {tab === "checkout" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void saveGroup("checkout", {
                  guestCheckoutEnabled: cfg.guestCheckoutEnabled,
                  requirePhoneOtp: cfg.requirePhoneOtp,
                  autoConfirmOrders: cfg.autoConfirmOrders,
                  orderPrefix: cfg.orderPrefix,
                  minOrderAmount: cfg.minOrderAmount,
                  maxCodAmount: cfg.maxCodAmount,
                  taxRatePct: cfg.taxRatePct,
                  shippingMode: cfg.shippingMode,
                  insideDhakaFee: cfg.insideDhakaFee,
                  outsideDhakaFee: cfg.outsideDhakaFee,
                  defaultCountry: cfg.defaultCountry,
                });
              }}
              className="space-y-4 max-w-2xl"
            >
              <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-700">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cfg.guestCheckoutEnabled}
                    onChange={(e) =>
                      setCfg({ ...cfg, guestCheckoutEnabled: e.target.checked })
                    }
                  />
                  <span>Allow Guest Checkout</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cfg.requirePhoneOtp}
                    onChange={(e) =>
                      setCfg({ ...cfg, requirePhoneOtp: e.target.checked })
                    }
                  />
                  <span>Require Phone OTP at Checkout</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cfg.autoConfirmOrders}
                    onChange={(e) =>
                      setCfg({ ...cfg, autoConfirmOrders: e.target.checked })
                    }
                  />
                  <span>Auto-Confirm Paid Orders</span>
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLS}>Order Number Prefix</label>
                  <input
                    type="text"
                    className={INPUT_CLS}
                    value={cfg.orderPrefix}
                    onChange={(e) =>
                      setCfg({ ...cfg, orderPrefix: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>VAT / Tax Rate (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className={INPUT_CLS}
                    value={cfg.taxRatePct}
                    onChange={(e) =>
                      setCfg({
                        ...cfg,
                        taxRatePct: Number.parseFloat(e.target.value || "0"),
                      })
                    }
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Minimum Order Amount (৳)</label>
                  <input
                    type="number"
                    min={0}
                    className={INPUT_CLS}
                    value={cfg.minOrderAmount}
                    onChange={(e) =>
                      setCfg({
                        ...cfg,
                        minOrderAmount: Number.parseInt(
                          e.target.value || "0",
                          10,
                        ),
                      })
                    }
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Maximum COD Limit (৳)</label>
                  <input
                    type="number"
                    min={0}
                    className={INPUT_CLS}
                    value={cfg.maxCodAmount}
                    onChange={(e) =>
                      setCfg({
                        ...cfg,
                        maxCodAmount: Number.parseInt(
                          e.target.value || "0",
                          10,
                        ),
                      })
                    }
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Checkout Shipping Mode</label>
                  <select
                    className={INPUT_CLS}
                    value={cfg.shippingMode}
                    onChange={(e) =>
                      setCfg({
                        ...cfg,
                        shippingMode: e.target.value as "simple" | "advanced",
                      })
                    }
                  >
                    <option value="simple">Simple (Inside / Outside Dhaka)</option>
                    <option value="advanced">Advanced (Country / State / Area)</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS}>Default Country</label>
                  <input
                    type="text"
                    className={INPUT_CLS}
                    value={cfg.defaultCountry}
                    onChange={(e) =>
                      setCfg({ ...cfg, defaultCountry: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Inside Dhaka Fee (৳)</label>
                  <input
                    type="number"
                    min={0}
                    className={INPUT_CLS}
                    value={cfg.insideDhakaFee}
                    onChange={(e) =>
                      setCfg({
                        ...cfg,
                        insideDhakaFee: Number.parseInt(
                          e.target.value || "0",
                          10,
                        ),
                      })
                    }
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Outside Dhaka Fee (৳)</label>
                  <input
                    type="number"
                    min={0}
                    className={INPUT_CLS}
                    value={cfg.outsideDhakaFee}
                    onChange={(e) =>
                      setCfg({
                        ...cfg,
                        outsideDhakaFee: Number.parseInt(
                          e.target.value || "0",
                          10,
                        ),
                      })
                    }
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded shadow-sm"
              >
                {saving ? "Saving..." : "Save Checkout Settings"}
              </button>
            </form>
          )}

          {tab === "payments" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <form
                onSubmit={handleSavePayment}
                className="lg:col-span-6 space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL_CLS}>Gateway</label>
                    <select
                      className={INPUT_CLS}
                      value={payCode}
                      onChange={(e) =>
                        setPayCode(
                          e.target.value as
                            | "cod"
                            | "sslcommerz"
                            | "bkash"
                            | "nagad",
                        )
                      }
                    >
                      <option value="cod">Cash on Delivery (COD)</option>
                      <option value="sslcommerz">SSLCommerz</option>
                      <option value="bkash">bKash</option>
                      <option value="nagad">Nagad</option>
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Display Name</label>
                    <input
                      type="text"
                      required
                      className={INPUT_CLS}
                      value={payName}
                      onChange={(e) => setPayName(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className={LABEL_CLS}>Store ID / App Key</label>
                  <input
                    type="text"
                    className={INPUT_CLS}
                    value={payStoreId}
                    onChange={(e) => setPayStoreId(e.target.value)}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>
                    Store Password / App Secret (Encrypted)
                  </label>
                  <input
                    type="password"
                    className={INPUT_CLS}
                    value={payStorePass}
                    onChange={(e) => setPayStorePass(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-4 text-xs font-medium text-slate-700">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={payActive}
                      onChange={(e) => setPayActive(e.target.checked)}
                    />
                    <span>Active</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={paySandbox}
                      onChange={(e) => setPaySandbox(e.target.checked)}
                    />
                    <span>Sandbox Mode</span>
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded shadow-sm"
                >
                  {saving ? "Saving..." : "Save Payment Gateway"}
                </button>
              </form>

              <div className="lg:col-span-6 border border-slate-200 rounded p-3 bg-slate-50 space-y-2">
                <div className="text-xs font-bold uppercase text-slate-500">
                  Configured Gateways ({paymentProviders.length})
                </div>
                {paymentProviders.length === 0 ? (
                  <p className="text-xs text-slate-400">None configured yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-200 text-xs m-0 p-0 list-none">
                    {paymentProviders.map((p) => (
                      <li
                        key={p.code}
                        className="py-2 flex items-center justify-between"
                      >
                        <span className="font-semibold text-slate-800">
                          {p.name} ({p.code})
                        </span>
                        <span className="text-slate-500">
                          {p.isActive ? "Active" : "Inactive"} •{" "}
                          {p.sandboxMode ? "Sandbox" : "Live"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {tab === "courier" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <form
                onSubmit={handleSaveCourier}
                className="lg:col-span-6 space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL_CLS}>Courier Partner</label>
                    <select
                      className={INPUT_CLS}
                      value={courCode}
                      onChange={(e) =>
                        setCourCode(
                          e.target.value as "steadfast" | "pathao" | "redx",
                        )
                      }
                    >
                      <option value="steadfast">Steadfast</option>
                      <option value="pathao">Pathao</option>
                      <option value="redx">RedX</option>
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Status</label>
                    <select
                      className={INPUT_CLS}
                      value={courStatus}
                      onChange={(e) =>
                        setCourStatus(e.target.value as "active" | "inactive")
                      }
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={LABEL_CLS}>API Key / Client ID</label>
                  <input
                    type="text"
                    required
                    className={INPUT_CLS}
                    value={courApiKey}
                    onChange={(e) => setCourApiKey(e.target.value)}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>Secret Key (Encrypted)</label>
                  <input
                    type="password"
                    required
                    className={INPUT_CLS}
                    value={courSecret}
                    onChange={(e) => setCourSecret(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded shadow-sm"
                >
                  {saving ? "Saving..." : "Save Courier Credentials"}
                </button>
              </form>

              <div className="lg:col-span-6 border border-slate-200 rounded p-3 bg-slate-50 space-y-2">
                <div className="text-xs font-bold uppercase text-slate-500">
                  Configured Couriers ({courierProviders.length})
                </div>
                {courierProviders.length === 0 ? (
                  <p className="text-xs text-slate-400">None configured yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-200 text-xs m-0 p-0 list-none">
                    {courierProviders.map((c) => (
                      <li
                        key={c.code}
                        className="py-2 flex items-center justify-between"
                      >
                        <span className="font-semibold text-slate-800 uppercase">
                          {c.code}
                        </span>
                        <span className="text-slate-500">{c.status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {tab === "notifications" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void saveGroup("notifications", {
                  smtpHost: cfg.smtpHost,
                  smtpPort: cfg.smtpPort,
                  smtpUser: cfg.smtpUser,
                  smtpFrom: cfg.smtpFrom,
                  smsProvider: cfg.smsProvider,
                  smsSenderId: cfg.smsSenderId,
                });
              }}
              className="space-y-4 max-w-2xl"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLS}>SMTP Host</label>
                  <input
                    type="text"
                    placeholder="smtp.resend.com"
                    className={INPUT_CLS}
                    value={cfg.smtpHost}
                    onChange={(e) => setCfg({ ...cfg, smtpHost: e.target.value })}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>SMTP Port</label>
                  <input
                    type="number"
                    className={INPUT_CLS}
                    value={cfg.smtpPort}
                    onChange={(e) =>
                      setCfg({
                        ...cfg,
                        smtpPort: Number.parseInt(e.target.value || "587", 10),
                      })
                    }
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>SMTP User</label>
                  <input
                    type="text"
                    className={INPUT_CLS}
                    value={cfg.smtpUser}
                    onChange={(e) => setCfg({ ...cfg, smtpUser: e.target.value })}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>From Email</label>
                  <input
                    type="email"
                    className={INPUT_CLS}
                    value={cfg.smtpFrom}
                    onChange={(e) => setCfg({ ...cfg, smtpFrom: e.target.value })}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>BD SMS Provider</label>
                  <select
                    className={INPUT_CLS}
                    value={cfg.smsProvider}
                    onChange={(e) =>
                      setCfg({ ...cfg, smsProvider: e.target.value })
                    }
                  >
                    <option value="sslwireless">SSL Wireless</option>
                    <option value="bulksmsbd">BulkSMSBD</option>
                    <option value="elitbuzz">Elitbuzz</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS}>SMS Sender ID</label>
                  <input
                    type="text"
                    className={INPUT_CLS}
                    value={cfg.smsSenderId}
                    onChange={(e) =>
                      setCfg({ ...cfg, smsSenderId: e.target.value })
                    }
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded shadow-sm"
              >
                {saving ? "Saving..." : "Save Notification Settings"}
              </button>
            </form>
          )}

          {tab === "fraud" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveGroup("fraud", {
                    fraudAutoHoldScore: cfg.fraudAutoHoldScore,
                  });
                }}
                className="lg:col-span-5 space-y-3"
              >
                <div>
                  <label className={LABEL_CLS}>
                    Auto-Hold Risk Score Threshold (0-100)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className={INPUT_CLS}
                    value={cfg.fraudAutoHoldScore}
                    onChange={(e) =>
                      setCfg({
                        ...cfg,
                        fraudAutoHoldScore: Number.parseInt(
                          e.target.value || "70",
                          10,
                        ),
                      })
                    }
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded shadow-sm"
                >
                  Save Threshold
                </button>
              </form>

              <form
                onSubmit={handleSaveFraudRule}
                className="lg:col-span-7 space-y-3 border border-slate-200 rounded p-3 bg-slate-50"
              >
                <div className="text-xs font-bold uppercase text-slate-500">
                  Update Fraud Rule Weight
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    placeholder="Rule key"
                    className={INPUT_CLS}
                    value={ruleKey}
                    onChange={(e) => setRuleKey(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Weight"
                    className={INPUT_CLS}
                    value={ruleWeight}
                    onChange={(e) => setRuleWeight(e.target.value)}
                  />
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={ruleEnabled}
                      onChange={(e) => setRuleEnabled(e.target.checked)}
                    />
                    <span>Enabled</span>
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded"
                >
                  Save Rule
                </button>
              </form>
            </div>
          )}

          {tab === "storefront" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void saveGroup("storefront", {
                  heroSlides: cfg.heroSlides,
                  heroSideTop: cfg.heroSideTop,
                  heroSideBottom: cfg.heroSideBottom,
                  storeVideos: cfg.storeVideos,
                  trustSection: cfg.trustSection,
                  campaignBento: cfg.campaignBento,
                });
              }}
              className="space-y-6"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase text-slate-500">
                    Hero Banner Slides
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCfg((prev) => ({
                        ...prev,
                        heroSlides: [
                          ...prev.heroSlides,
                          {
                            id: `slide-${Date.now()}`,
                            img: "/banners/organic-food-1.jpg",
                            alt: "New Banner",
                            link: "/products",
                          },
                        ],
                      }))
                    }
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded"
                  >
                    + Add Slide
                  </button>
                </div>
                <div className="space-y-2">
                  {cfg.heroSlides.map((slide, idx) => (
                    <div
                      key={slide.id}
                      className="grid grid-cols-1 md:grid-cols-12 gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded items-center"
                    >
                      <input
                        type="text"
                        placeholder="Image URL"
                        className={`${INPUT_CLS} md:col-span-4`}
                        value={slide.img}
                        onChange={(e) => {
                          const next = [...cfg.heroSlides];
                          next[idx] = { ...slide, img: e.target.value };
                          setCfg({ ...cfg, heroSlides: next });
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Alt text"
                        className={`${INPUT_CLS} md:col-span-4`}
                        value={slide.alt}
                        onChange={(e) => {
                          const next = [...cfg.heroSlides];
                          next[idx] = { ...slide, alt: e.target.value };
                          setCfg({ ...cfg, heroSlides: next });
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Link (/products)"
                        className={`${INPUT_CLS} md:col-span-3`}
                        value={slide.link}
                        onChange={(e) => {
                          const next = [...cfg.heroSlides];
                          next[idx] = { ...slide, link: e.target.value };
                          setCfg({ ...cfg, heroSlides: next });
                        }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setCfg({
                            ...cfg,
                            heroSlides: cfg.heroSlides.filter((_, i) => i !== idx),
                          })
                        }
                        className="px-2 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded md:col-span-1"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
                  <div className="text-xs font-bold uppercase text-slate-500">
                    Hero Side Banner (Top)
                  </div>
                  <input
                    type="text"
                    placeholder="Image URL"
                    className={INPUT_CLS}
                    value={cfg.heroSideTop.img}
                    onChange={(e) =>
                      setCfg({
                        ...cfg,
                        heroSideTop: { ...cfg.heroSideTop, img: e.target.value },
                      })
                    }
                  />
                  <input
                    type="text"
                    placeholder="Alt text"
                    className={INPUT_CLS}
                    value={cfg.heroSideTop.alt}
                    onChange={(e) =>
                      setCfg({
                        ...cfg,
                        heroSideTop: { ...cfg.heroSideTop, alt: e.target.value },
                      })
                    }
                  />
                  <input
                    type="text"
                    placeholder="Link"
                    className={INPUT_CLS}
                    value={cfg.heroSideTop.link}
                    onChange={(e) =>
                      setCfg({
                        ...cfg,
                        heroSideTop: { ...cfg.heroSideTop, link: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
                  <div className="text-xs font-bold uppercase text-slate-500">
                    Hero Side Banner (Bottom)
                  </div>
                  <input
                    type="text"
                    placeholder="Image URL"
                    className={INPUT_CLS}
                    value={cfg.heroSideBottom.img}
                    onChange={(e) =>
                      setCfg({
                        ...cfg,
                        heroSideBottom: { ...cfg.heroSideBottom, img: e.target.value },
                      })
                    }
                  />
                  <input
                    type="text"
                    placeholder="Alt text"
                    className={INPUT_CLS}
                    value={cfg.heroSideBottom.alt}
                    onChange={(e) =>
                      setCfg({
                        ...cfg,
                        heroSideBottom: { ...cfg.heroSideBottom, alt: e.target.value },
                      })
                    }
                  />
                  <input
                    type="text"
                    placeholder="Link"
                    className={INPUT_CLS}
                    value={cfg.heroSideBottom.link}
                    onChange={(e) =>
                      setCfg({
                        ...cfg,
                        heroSideBottom: { ...cfg.heroSideBottom, link: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase text-slate-500">
                    Video Gallery
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCfg((prev) => ({
                        ...prev,
                        storeVideos: [
                          ...prev.storeVideos,
                          {
                            id: `vid-${Date.now()}`,
                            title: "New Video",
                            category: "Video",
                            date: "",
                            duration: "03:00",
                            thumbnail: "/videos/video-1.jpg",
                            youtubeId: "6P5pSpUps6A",
                          },
                        ],
                      }))
                    }
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded"
                  >
                    + Add Video
                  </button>
                </div>
                <div className="space-y-2">
                  {cfg.storeVideos.map((vid, idx) => (
                    <div
                      key={vid.id}
                      className="grid grid-cols-1 md:grid-cols-12 gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded items-center"
                    >
                      <input
                        type="text"
                        placeholder="Title"
                        className={`${INPUT_CLS} md:col-span-4`}
                        value={vid.title}
                        onChange={(e) => {
                          const next = [...cfg.storeVideos];
                          next[idx] = { ...vid, title: e.target.value };
                          setCfg({ ...cfg, storeVideos: next });
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Thumbnail URL"
                        className={`${INPUT_CLS} md:col-span-4`}
                        value={vid.thumbnail}
                        onChange={(e) => {
                          const next = [...cfg.storeVideos];
                          next[idx] = { ...vid, thumbnail: e.target.value };
                          setCfg({ ...cfg, storeVideos: next });
                        }}
                      />
                      <input
                        type="text"
                        placeholder="YouTube ID"
                        className={`${INPUT_CLS} md:col-span-3`}
                        value={vid.youtubeId}
                        onChange={(e) => {
                          const next = [...cfg.storeVideos];
                          next[idx] = { ...vid, youtubeId: e.target.value };
                          setCfg({ ...cfg, storeVideos: next });
                        }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setCfg({
                            ...cfg,
                            storeVideos: cfg.storeVideos.filter((_, i) => i !== idx),
                          })
                        }
                        className="px-2 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded md:col-span-1"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-3">
                <div className="text-xs font-bold uppercase text-slate-500">
                  Trust Showcase & Campaign Bento
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL_CLS}>Trust Section Title</label>
                    <input
                      type="text"
                      className={INPUT_CLS}
                      value={cfg.trustSection.title}
                      onChange={(e) =>
                        setCfg({
                          ...cfg,
                          trustSection: { ...cfg.trustSection, title: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Trust Center Image URL</label>
                    <input
                      type="text"
                      className={INPUT_CLS}
                      value={cfg.trustSection.image}
                      onChange={(e) =>
                        setCfg({
                          ...cfg,
                          trustSection: { ...cfg.trustSection, image: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Campaign Main Title</label>
                    <input
                      type="text"
                      className={INPUT_CLS}
                      value={cfg.campaignBento.mainTitle}
                      onChange={(e) =>
                        setCfg({
                          ...cfg,
                          campaignBento: {
                            ...cfg.campaignBento,
                            mainTitle: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Campaign Main Image URL</label>
                    <input
                      type="text"
                      className={INPUT_CLS}
                      value={cfg.campaignBento.mainImg}
                      onChange={(e) =>
                        setCfg({
                          ...cfg,
                          campaignBento: {
                            ...cfg.campaignBento,
                            mainImg: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded shadow-sm"
              >
                {saving ? "Saving..." : "Save Storefront Settings"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
