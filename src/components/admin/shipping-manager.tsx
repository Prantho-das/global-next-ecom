"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import { saveSiteSettingsAction } from "@/modules/settings/actions";
import type {
  ShippingLocationRule,
  ShippingStateRule,
} from "@/modules/settings/queries";
import { saveShippingSettingsAction } from "@/modules/shipping/actions";

export interface ShippingManagerProps {
  section?: "settings" | "countries" | "states" | "areas";
  globalThreshold: number | null;
  initialCountries?: readonly string[];
  initialStates?: readonly ShippingStateRule[];
  initialLocations?: readonly ShippingLocationRule[];
  initialMode?: "simple" | "advanced";
  initialInsideFee?: number;
  initialOutsideFee?: number;
}

const INPUT_CLS =
  "w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition";
const LABEL_CLS = "block text-xs font-semibold text-slate-600 mb-1";

export function ShippingManager({
  section = "settings",
  globalThreshold,
  initialCountries = [],
  initialStates = [],
  initialLocations = [],
  initialMode = "simple",
  initialInsideFee = 60,
  initialOutsideFee = 120,
}: ShippingManagerProps) {
  const router = useRouter();

  const [mode, setMode] = useState<"simple" | "advanced">(initialMode);
  const [insideFee, setInsideFee] = useState(String(initialInsideFee));
  const [outsideFee, setOutsideFee] = useState(String(initialOutsideFee));
  const [thresholdTaka, setThresholdTaka] = useState(
    globalThreshold !== null ? String(Math.round(globalThreshold / 100)) : "",
  );

  const [countries, setCountries] = useState<string[]>(() => {
    const set = new Set<string>(initialCountries);
    for (const s of initialStates) set.add(s.country);
    for (const l of initialLocations) set.add(l.country);
    return Array.from(set);
  });

  const [states, setStates] = useState<ShippingStateRule[]>(() => {
    const map = new Map<string, ShippingStateRule>();
    for (const s of initialStates) {
      map.set(`${s.country}::${s.state}`, s);
    }
    for (const l of initialLocations) {
      const k = `${l.country}::${l.state}`;
      if (!map.has(k)) {
        map.set(k, { id: crypto.randomUUID(), country: l.country, state: l.state });
      }
    }
    return Array.from(map.values());
  });

  const [locations, setLocations] = useState<ShippingLocationRule[]>([
    ...initialLocations,
  ]);

  const [newCountry, setNewCountry] = useState("");
  const [editCountryOld, setEditCountryOld] = useState<string | null>(null);

  const [stateCountry, setStateCountry] = useState(countries[0] ?? "Bangladesh");
  const [newStateName, setNewStateName] = useState("");
  const [editStateId, setEditStateId] = useState<string | null>(null);

  const [areaCountry, setAreaCountry] = useState(countries[0] ?? "Bangladesh");
  const availableStatesForArea = states.filter(
    (s) => s.country === areaCountry,
  );
  const [areaState, setAreaState] = useState(
    availableStatesForArea[0]?.state ?? "",
  );
  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaCost, setNewAreaCost] = useState("60");
  const [editAreaId, setEditAreaId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function syncAllGeo(
    nextCountries: string[],
    nextStates: ShippingStateRule[],
    nextLocations: ShippingLocationRule[],
    successMsg: string,
  ) {
    setSaving(true);
    setMsg(null);
    const res = await saveSiteSettingsAction({
      group: "checkout",
      entries: {
        shippingCountries: nextCountries,
        shippingStates: nextStates,
        shippingLocations: nextLocations,
      },
    });
    setSaving(false);
    if (!res.ok) {
      setMsg({ ok: false, text: res.message });
      return;
    }
    setCountries(nextCountries);
    setStates(nextStates);
    setLocations(nextLocations);
    setMsg({ ok: true, text: successMsg });
    router.refresh();
  }

  async function handleSaveBasicSettings(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const inside = Math.max(0, Number.parseFloat(insideFee || "0") || 0);
    const outside = Math.max(0, Number.parseFloat(outsideFee || "0") || 0);
    const poisha =
      thresholdTaka.trim() === ""
        ? null
        : Math.round(Number.parseFloat(thresholdTaka) * 100);

    const [sRes, tRes] = await Promise.all([
      saveSiteSettingsAction({
        group: "checkout",
        entries: {
          shippingMode: mode,
          insideDhakaFee: inside,
          outsideDhakaFee: outside,
        },
      }),
      saveShippingSettingsAction({
        freeShippingGlobalThreshold: poisha,
      }),
    ]);

    setSaving(false);
    if (!sRes.ok || !tRes.ok) {
      setMsg({
        ok: false,
        text: !sRes.ok ? sRes.message : !tRes.ok ? tRes.message : "Failed",
      });
      return;
    }
    setMsg({ ok: true, text: "Shipping settings saved." });
    router.refresh();
  }

  async function handleSaveCountry(e: FormEvent) {
    e.preventDefault();
    const name = newCountry.trim();
    if (!name) return;

    if (editCountryOld !== null) {
      const nextCountries = countries.map((c) =>
        c === editCountryOld ? name : c,
      );
      const nextStates = states.map((s) =>
        s.country === editCountryOld ? { ...s, country: name } : s,
      );
      const nextLocs = locations.map((l) =>
        l.country === editCountryOld ? { ...l, country: name } : l,
      );
      await syncAllGeo(
        Array.from(new Set(nextCountries)),
        nextStates,
        nextLocs,
        `Updated country "${name}".`,
      );
      setEditCountryOld(null);
    } else {
      if (countries.some((c) => c.toLowerCase() === name.toLowerCase())) {
        setMsg({ ok: false, text: "Country already exists." });
        return;
      }
      await syncAllGeo(
        [...countries, name],
        states,
        locations,
        `Added country "${name}".`,
      );
    }
    setNewCountry("");
  }

  async function handleSaveState(e: FormEvent) {
    e.preventDefault();
    const sName = newStateName.trim();
    if (!stateCountry || !sName) return;

    if (editStateId !== null) {
      const old = states.find((s) => s.id === editStateId);
      const nextStates = states.map((s) =>
        s.id === editStateId ? { ...s, country: stateCountry, state: sName } : s,
      );
      const nextLocs =
        old !== undefined
          ? locations.map((l) =>
              l.country === old.country && l.state === old.state
                ? { ...l, country: stateCountry, state: sName }
                : l,
            )
          : locations;
      await syncAllGeo(
        countries,
        nextStates,
        nextLocs,
        `Updated state "${sName}".`,
      );
      setEditStateId(null);
    } else {
      if (
        states.some(
          (s) =>
            s.country === stateCountry &&
            s.state.toLowerCase() === sName.toLowerCase(),
        )
      ) {
        setMsg({ ok: false, text: "State already exists in this country." });
        return;
      }
      await syncAllGeo(
        countries,
        [
          ...states,
          { id: crypto.randomUUID(), country: stateCountry, state: sName },
        ],
        locations,
        `Added state "${sName}" under ${stateCountry}.`,
      );
    }
    setNewStateName("");
  }

  async function handleSaveArea(e: FormEvent) {
    e.preventDefault();
    const aName = newAreaName.trim();
    const cost = Math.max(0, Number.parseFloat(newAreaCost || "0") || 0);
    if (!areaCountry || !areaState || !aName) return;

    if (editAreaId !== null) {
      const nextLocs = locations.map((l) =>
        l.id === editAreaId
          ? { ...l, country: areaCountry, state: areaState, area: aName, cost }
          : l,
      );
      await syncAllGeo(
        countries,
        states,
        nextLocs,
        `Updated "${aName}" (৳${cost}).`,
      );
      setEditAreaId(null);
    } else {
      const nextLocs = [
        ...locations,
        {
          id: crypto.randomUUID(),
          country: areaCountry,
          state: areaState,
          area: aName,
          cost,
        },
      ];
      await syncAllGeo(
        countries,
        states,
        nextLocs,
        `Added "${aName}" (৳${cost}).`,
      );
    }
    setNewAreaName("");
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

      {section === "settings" && (
      <form
        onSubmit={handleSaveBasicSettings}
        className="bg-white border border-slate-200/80 rounded p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
      >
        <div>
          <label className={LABEL_CLS}>Checkout Shipping Mode</label>
          <select
            className={INPUT_CLS}
            value={mode}
            onChange={(e) =>
              setMode(e.target.value as "simple" | "advanced")
            }
          >
            <option value="simple">Simple (Inside / Outside Dhaka)</option>
            <option value="advanced">Advanced (Country / State / Area)</option>
          </select>
        </div>
        <div>
          <label className={LABEL_CLS}>Inside Dhaka (৳)</label>
          <input
            type="number"
            min={0}
            className={INPUT_CLS}
            value={insideFee}
            onChange={(e) => setInsideFee(e.target.value)}
          />
        </div>
        <div>
          <label className={LABEL_CLS}>Outside Dhaka (৳)</label>
          <input
            type="number"
            min={0}
            className={INPUT_CLS}
            value={outsideFee}
            onChange={(e) => setOutsideFee(e.target.value)}
          />
        </div>
        <div>
          <label className={LABEL_CLS}>Free Shipping Above (৳)</label>
          <input
            type="number"
            min={0}
            placeholder="Optional (e.g. 2000)"
            className={INPUT_CLS}
            value={thresholdTaka}
            onChange={(e) => setThresholdTaka(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded h-[34px]"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </form>
      )}

      {section !== "settings" && (
      <div className="bg-white border border-slate-200/80 rounded shadow-sm overflow-hidden">
        {section === "countries" && (
          <div>
            <form
              onSubmit={handleSaveCountry}
              className="p-4 bg-slate-50/70 border-b border-slate-200/80 flex flex-wrap gap-2.5 items-end"
            >
              <div className="flex-1 min-w-[200px]">
                <label className={LABEL_CLS}>Country Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bangladesh"
                  className={INPUT_CLS}
                  value={newCountry}
                  onChange={(e) => setNewCountry(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded h-[34px]"
              >
                {editCountryOld !== null ? "Update Country" : "+ Add Country"}
              </button>
              {editCountryOld !== null && (
                <button
                  type="button"
                  onClick={() => {
                    setEditCountryOld(null);
                    setNewCountry("");
                  }}
                  className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-semibold rounded h-[34px]"
                >
                  Cancel
                </button>
              )}
            </form>
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="py-2.5 px-4">Country</th>
                  <th className="py-2.5 px-4">States</th>
                  <th className="py-2.5 px-4">Areas</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {countries.map((c) => (
                  <tr key={c} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {c}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {states.filter((s) => s.country === c).length}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {locations.filter((l) => l.country === c).length}
                    </td>
                    <td className="py-2.5 px-4 text-right space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditCountryOld(c);
                          setNewCountry(c);
                        }}
                        className="text-indigo-600 hover:underline font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void syncAllGeo(
                            countries.filter((item) => item !== c),
                            states.filter((s) => s.country !== c),
                            locations.filter((l) => l.country !== c),
                            `Deleted country "${c}".`,
                          )
                        }
                        className="text-rose-600 hover:underline font-semibold"
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

        {section === "states" && (
          <div>
            <form
              onSubmit={handleSaveState}
              className="p-4 bg-slate-50/70 border-b border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end"
            >
              <div>
                <label className={LABEL_CLS}>Country</label>
                <select
                  className={INPUT_CLS}
                  value={stateCountry}
                  onChange={(e) => setStateCountry(e.target.value)}
                >
                  {countries.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>State / Division Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dhaka"
                  className={INPUT_CLS}
                  value={newStateName}
                  onChange={(e) => setNewStateName(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded h-[34px]"
                >
                  {editStateId !== null ? "Update State" : "+ Add State"}
                </button>
                {editStateId !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditStateId(null);
                      setNewStateName("");
                    }}
                    className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-semibold rounded h-[34px]"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="py-2.5 px-4">Country</th>
                  <th className="py-2.5 px-4">State / Division</th>
                  <th className="py-2.5 px-4">Areas</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {states.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 text-slate-600">{s.country}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {s.state}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {
                        locations.filter(
                          (l) => l.country === s.country && l.state === s.state,
                        ).length
                      }
                    </td>
                    <td className="py-2.5 px-4 text-right space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditStateId(s.id);
                          setStateCountry(s.country);
                          setNewStateName(s.state);
                        }}
                        className="text-indigo-600 hover:underline font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void syncAllGeo(
                            countries,
                            states.filter((item) => item.id !== s.id),
                            locations.filter(
                              (l) =>
                                !(
                                  l.country === s.country &&
                                  l.state === s.state
                                ),
                            ),
                            `Deleted state "${s.state}".`,
                          )
                        }
                        className="text-rose-600 hover:underline font-semibold"
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

        {section === "areas" && (
          <div>
            <form
              onSubmit={handleSaveArea}
              className="p-4 bg-slate-50/70 border-b border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 items-end"
            >
              <div>
                <label className={LABEL_CLS}>Country</label>
                <select
                  className={INPUT_CLS}
                  value={areaCountry}
                  onChange={(e) => {
                    const nextC = e.target.value;
                    setAreaCountry(nextC);
                    const nextS =
                      states.find((s) => s.country === nextC)?.state ?? "";
                    setAreaState(nextS);
                  }}
                >
                  {countries.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>State / Division</label>
                <select
                  className={INPUT_CLS}
                  value={areaState}
                  onChange={(e) => setAreaState(e.target.value)}
                >
                  {availableStatesForArea.length === 0 ? (
                    <option value="">Add state first</option>
                  ) : (
                    availableStatesForArea.map((s) => (
                      <option key={s.id} value={s.state}>
                        {s.state}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Area / District</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mirpur"
                  className={INPUT_CLS}
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Shipping Cost (৳)</label>
                <input
                  type="number"
                  min={0}
                  required
                  className={INPUT_CLS}
                  value={newAreaCost}
                  onChange={(e) => setNewAreaCost(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving || availableStatesForArea.length === 0}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded h-[34px] flex-1"
                >
                  {editAreaId !== null ? "Update Area" : "+ Add Area"}
                </button>
                {editAreaId !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditAreaId(null);
                      setNewAreaName("");
                    }}
                    className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-semibold rounded h-[34px]"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="py-2.5 px-4">Country</th>
                  <th className="py-2.5 px-4">State / Division</th>
                  <th className="py-2.5 px-4">Area / District</th>
                  <th className="py-2.5 px-4 text-right">Cost</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {locations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 text-slate-600">{loc.country}</td>
                    <td className="py-2.5 px-4 text-slate-700">{loc.state}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {loc.area}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-emerald-600">
                      ৳{loc.cost}
                    </td>
                    <td className="py-2.5 px-4 text-right space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditAreaId(loc.id);
                          setAreaCountry(loc.country);
                          setAreaState(loc.state);
                          setNewAreaName(loc.area);
                          setNewAreaCost(String(loc.cost));
                        }}
                        className="text-indigo-600 hover:underline font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void syncAllGeo(
                            countries,
                            states,
                            locations.filter((l) => l.id !== loc.id),
                            `Deleted "${loc.area}".`,
                          )
                        }
                        className="text-rose-600 hover:underline font-semibold"
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
      )}
    </div>
  );
}
