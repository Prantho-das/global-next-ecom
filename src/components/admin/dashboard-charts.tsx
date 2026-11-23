"use client";

import { useState } from "react";

import { formatBdt } from "@/lib/money";

export interface DailyPoint {
  day: string;
  revenue: number;
  ordersCount: number;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface TopProductPoint {
  name: string;
  units: number;
  revenue: number;
}

export interface DashboardChartsProps {
  daily: readonly DailyPoint[];
  statusBreakdown: readonly StatusCount[];
  topProducts: readonly TopProductPoint[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  confirmed: "#4F46E5",
  packed: "#6366F1",
  shipped: "#06B6D4",
  delivered: "#10B981",
  cancelled: "#F43F5E",
};

export function DashboardCharts({
  daily,
  statusBreakdown,
  topProducts,
}: DashboardChartsProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [chartTab, setChartTab] = useState<"revenue" | "orders">("revenue");

  const width = 680;
  const height = 220;
  const padX = 36;
  const padY = 24;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;

  const values = daily.map((d) =>
    chartTab === "revenue" ? d.revenue : d.ordersCount,
  );
  const maxVal = Math.max(1, ...values);

  const coords = daily.map((d, idx) => {
    const x =
      daily.length > 1
        ? padX + (idx / (daily.length - 1)) * plotW
        : padX + plotW / 2;
    const val = chartTab === "revenue" ? d.revenue : d.ordersCount;
    const y = padY + plotH - (val / maxVal) * plotH;
    return { x, y, val, day: d.day, revenue: d.revenue, ordersCount: d.ordersCount };
  });

  const linePath = coords
    .map((c, idx) => `${idx === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");
  const firstCoord = coords[0];
  const lastCoord = coords[coords.length - 1];
  const areaPath =
    firstCoord !== undefined && lastCoord !== undefined
      ? `${linePath} L ${lastCoord.x.toFixed(1)} ${(padY + plotH).toFixed(1)} L ${firstCoord.x.toFixed(1)} ${(padY + plotH).toFixed(1)} Z`
      : "";

  const totalStatusCount = Math.max(
    1,
    statusBreakdown.reduce((s, r) => s + r.count, 0),
  );
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let cumulativePct = 0;
  const donutSegments = statusBreakdown.map((item) => {
    const pct = item.count / totalStatusCount;
    const dash = pct * circumference;
    const offset = -cumulativePct * circumference;
    cumulativePct += pct;
    return {
      ...item,
      pct: Math.round(pct * 100),
      color: STATUS_COLORS[item.status] ?? "#94A3B8",
      dash,
      offset,
    };
  });

  const maxProductRev = Math.max(1, ...topProducts.map((p) => p.revenue));
  const hovered = hoverIdx !== null ? coords[hoverIdx] : undefined;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded shadow-sm p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 m-0">
              {chartTab === "revenue"
                ? "Sales Revenue Trend (14 Days)"
                : "Daily Orders Volume (14 Days)"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 m-0">
              Hover over points to inspect daily metrics
            </p>
          </div>
          <div className="inline-flex rounded border border-slate-200 bg-slate-50 p-0.5 self-start">
            <button
              type="button"
              onClick={() => setChartTab("revenue")}
              className={`px-3 py-1 text-xs font-semibold rounded transition ${
                chartTab === "revenue"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Revenue
            </button>
            <button
              type="button"
              onClick={() => setChartTab("orders")}
              className={`px-3 py-1 text-xs font-semibold rounded transition ${
                chartTab === "orders"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Orders
            </button>
          </div>
        </div>

        {daily.length === 0 ? (
          <div className="h-[220px] flex flex-col items-center justify-center text-slate-400 text-sm">
            <i className="ti ti-chart-area-line text-3xl mb-2 text-slate-300" />
            No sales trend data yet.
          </div>
        ) : (
          <div className="relative">
            {hovered && (
              <div className="mb-2 inline-flex items-center gap-3 px-3 py-1.5 rounded bg-slate-900 text-white text-xs font-medium shadow">
                <span className="text-slate-300">{hovered.day}</span>
                <span className="font-bold text-indigo-300">
                  {formatBdt(hovered.revenue)}
                </span>
                <span className="text-emerald-300">
                  {hovered.ordersCount} orders
                </span>
              </div>
            )}
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto overflow-visible"
              role="img"
              aria-label="Sales trend chart"
            >
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={chartTab === "revenue" ? "#4F46E5" : "#10B981"}
                    stopOpacity="0.28"
                  />
                  <stop
                    offset="100%"
                    stopColor={chartTab === "revenue" ? "#4F46E5" : "#10B981"}
                    stopOpacity="0.01"
                  />
                </linearGradient>
              </defs>

              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = padY + plotH - ratio * plotH;
                return (
                  <line
                    key={ratio}
                    x1={padX}
                    y1={y}
                    x2={width - padX}
                    y2={y}
                    stroke="#E2E8F0"
                    strokeDasharray="3 3"
                  />
                );
              })}

              {chartTab === "revenue" ? (
                <>
                  <path d={areaPath} fill="url(#revGrad)" />
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#4F46E5"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              ) : (
                coords.map((c, idx) => {
                  const barW = Math.min(28, Math.max(8, plotW / Math.max(1, daily.length * 1.8)));
                  const barH = padY + plotH - c.y;
                  return (
                    <rect
                      key={c.day}
                      x={c.x - barW / 2}
                      y={c.y}
                      width={barW}
                      height={Math.max(2, barH)}
                      rx="3"
                      fill={hoverIdx === idx ? "#059669" : "#10B981"}
                      className="transition-colors cursor-pointer"
                      onMouseEnter={() => setHoverIdx(idx)}
                      onMouseLeave={() => setHoverIdx(null)}
                    />
                  );
                })
              )}

              {coords.map((c, idx) => (
                <g key={c.day}>
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={hoverIdx === idx ? 5 : 3.5}
                    fill={chartTab === "revenue" ? "#4F46E5" : "#10B981"}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoverIdx(idx)}
                    onMouseLeave={() => setHoverIdx(null)}
                  />
                  {(idx === 0 ||
                    idx === coords.length - 1 ||
                    idx % Math.max(1, Math.floor(coords.length / 5)) === 0) && (
                    <text
                      x={c.x}
                      y={height - 4}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#64748B"
                    >
                      {c.day.slice(5)}
                    </text>
                  )}
                </g>
              ))}
            </svg>
          </div>
        )}
      </div>

      <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded shadow-sm p-4 flex flex-col justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 m-0">
            Orders by Status
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">
            Distribution across fulfillment stages
          </p>
        </div>

        {statusBreakdown.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">
            No orders yet.
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke="#F1F5F9"
                  strokeWidth="16"
                />
                {donutSegments.map((seg) => (
                  <circle
                    key={seg.status}
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="16"
                    strokeDasharray={`${seg.dash} ${circumference}`}
                    strokeDashoffset={seg.offset}
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-extrabold text-slate-900">
                  {statusBreakdown.reduce((s, r) => s + r.count, 0)}
                </span>
                <span className="text-[10px] font-semibold uppercase text-slate-400">
                  Orders
                </span>
              </div>
            </div>

            <div className="w-full space-y-1.5">
              {donutSegments.map((seg) => (
                <div
                  key={seg.status}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-sm inline-block"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="capitalize font-medium text-slate-700">
                      {seg.status}
                    </span>
                  </div>
                  <span className="font-semibold text-slate-900">
                    {seg.count} ({seg.pct}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-12 bg-white border border-slate-200/80 rounded shadow-sm p-4">
        <h2 className="text-base font-bold text-slate-900 m-0">
          Top Selling Products
        </h2>
        <p className="text-xs text-slate-500 mt-0.5 mb-3">
          Ranked by gross revenue
        </p>
        {topProducts.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-sm">
            No product sales recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {topProducts.map((p) => {
              const pct = Math.max(
                4,
                Math.round((p.revenue / maxProductRev) * 100),
              );
              return (
                <div key={p.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-800 truncate pr-4">
                      {p.name}
                    </span>
                    <span className="text-slate-600 shrink-0">
                      {p.units} units ·{" "}
                      <strong className="text-slate-900">
                        {formatBdt(p.revenue)}
                      </strong>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
