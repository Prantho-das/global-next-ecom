"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import { formatBdt } from "@/lib/money";
import {
  addShippingRateAction,
  addShippingZoneAreaAction,
  saveShippingSettingsAction,
  testShippingAddressAction,
  upsertShippingZoneAction,
} from "@/modules/shipping/actions";
import type {
  ShippingMatchResult,
  ShippingRateRecord,
  ShippingZoneAreaRecord,
  ShippingZoneRecord,
} from "@/modules/shipping/service";

export interface ShippingManagerProps {
  zones: readonly ShippingZoneRecord[];
  areas: readonly (ShippingZoneAreaRecord & { id: string })[];
  rates: readonly ShippingRateRecord[];
  globalThreshold: number | null;
}

export function ShippingManager({
  zones,
  areas,
  rates,
  globalThreshold,
}: ShippingManagerProps) {
  const router = useRouter();
  const [zoneName, setZoneName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState(zones[0]?.id ?? "");
  const [division, setDivision] = useState("Dhaka");
  const [district, setDistrict] = useState("Dhaka");
  const [thana, setThana] = useState("");
  const [rateName, setRateName] = useState("Standard");
  const [ratePrice, setRatePrice] = useState("6000");
  const [thresholdInput, setThresholdInput] = useState(
    globalThreshold !== null ? String(globalThreshold) : "",
  );
  const [testDiv, setTestDiv] = useState("Dhaka");
  const [testDist, setTestDist] = useState("Dhaka");
  const [testThana, setTestThana] = useState("Dhanmondi");
  const [testResult, setTestResult] = useState<ShippingMatchResult | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function handleCreateZone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const res = await upsertShippingZoneAction({
      name: zoneName,
      type: "flat",
      isDefault,
    });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setZoneName("");
    router.refresh();
  }

  async function handleAddArea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const res = await addShippingZoneAreaAction({
      zoneId: selectedZoneId,
      division,
      district,
      thana: thana.trim() || null,
    });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setThana("");
    router.refresh();
  }

  async function handleAddRate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const res = await addShippingRateAction({
      zoneId: selectedZoneId,
      name: rateName,
      price: Number.parseInt(ratePrice || "0", 10),
    });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    router.refresh();
  }

  async function handleSaveThreshold(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const res = await saveShippingSettingsAction({
      freeShippingGlobalThreshold: thresholdInput.trim()
        ? Number.parseInt(thresholdInput, 10)
        : null,
      defaultWeightG: 500,
    });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    router.refresh();
  }

  async function handleTestAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const res = await testShippingAddressAction({
      division: testDiv,
      district: testDist,
      thana: testThana,
      totalWeightG: 500,
      cartSubtotal: 100000,
    });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setTestResult(res.data);
  }

  return (
    <div>
      {error !== null && (
        <div role="alert" className="card-panel red lighten-5 red-text">
          {error}
        </div>
      )}

      <div className="row">
        <div className="col s12 m6">
          <div className="card white">
            <div className="card-content">
              <span className="card-title">Create Shipping Zone</span>
              <form onSubmit={handleCreateZone}>
                <input
                  type="text"
                  required
                  placeholder="Zone name (e.g. Dhaka Metro)"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                />
                <label>
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                  />
                  <span>Default catch-all zone</span>
                </label>
                <div style={{ marginTop: "12px" }}>
                  <button type="submit" className="btn">
                    Add Zone
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="card white">
            <div className="card-content">
              <span className="card-title">Global Free Shipping Threshold</span>
              <form onSubmit={handleSaveThreshold}>
                <input
                  type="number"
                  placeholder="Poisha (leave blank to disable)"
                  value={thresholdInput}
                  onChange={(e) => setThresholdInput(e.target.value)}
                />
                <button type="submit" className="btn">
                  Save Settings
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col s12 m6">
          <div className="card white">
            <div className="card-content">
              <span className="card-title">Zone Areas &amp; Rates</span>
              <label htmlFor="ship-zone-sel">Select Zone</label>
              <select
                id="ship-zone-sel"
                className="browser-default"
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value)}
              >
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} {z.isDefault ? "(Default)" : ""}
                  </option>
                ))}
              </select>

              <form onSubmit={handleAddArea} style={{ marginTop: "12px" }}>
                <strong>Add Area</strong>
                <input
                  type="text"
                  placeholder="Division"
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="District"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Thana (optional)"
                  value={thana}
                  onChange={(e) => setThana(e.target.value)}
                />
                <button type="submit" className="btn-small">
                  Add Area
                </button>
              </form>

              <form onSubmit={handleAddRate} style={{ marginTop: "16px" }}>
                <strong>Add Rate</strong>
                <input
                  type="text"
                  placeholder="Rate name (Standard/Express)"
                  value={rateName}
                  onChange={(e) => setRateName(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Price (poisha)"
                  value={ratePrice}
                  onChange={(e) => setRatePrice(e.target.value)}
                />
                <button type="submit" className="btn-small">
                  Add Rate
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="card white">
        <div className="card-content">
          <span className="card-title">Test Address Matcher</span>
          <form onSubmit={handleTestAddress} className="row">
            <div className="col s3">
              <input
                type="text"
                value={testDiv}
                onChange={(e) => setTestDiv(e.target.value)}
                placeholder="Division"
              />
            </div>
            <div className="col s3">
              <input
                type="text"
                value={testDist}
                onChange={(e) => setTestDist(e.target.value)}
                placeholder="District"
              />
            </div>
            <div className="col s3">
              <input
                type="text"
                value={testThana}
                onChange={(e) => setTestThana(e.target.value)}
                placeholder="Thana"
              />
            </div>
            <div className="col s3">
              <button type="submit" className="btn">
                Test Match
              </button>
            </div>
          </form>
          {testResult !== null && (
            <div>
              <p>
                Matched Zone:{" "}
                <strong>{testResult.zone?.name ?? "None"}</strong>
              </p>
              <ul>
                {testResult.options.map((o) => (
                  <li key={o.rateId}>
                    {o.name}: {formatBdt(o.price)} ({o.estimatedDaysMin}-
                    {o.estimatedDaysMax} days)
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="grey-text">
            Configured: {zones.length} zones, {areas.length} areas,{" "}
            {rates.length} rates
          </p>
        </div>
      </div>
    </div>
  );
}
