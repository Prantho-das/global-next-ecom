"use client";

import { useEffect } from "react";

import { trackStoreEvent } from "@/lib/tracking";

export interface TrackingPixelsProps {
  metaPixelId?: string;
  ga4MeasurementId?: string;
}

export function TrackingPixels({
  metaPixelId,
  ga4MeasurementId,
}: TrackingPixelsProps) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const utmKeys = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
    ];
    const utm: Record<string, string> = {};
    for (const key of utmKeys) {
      const val = params.get(key);
      if (val !== null) {
        utm[key] = val;
      }
    }
    if (Object.keys(utm).length > 0) {
      if (localStorage.getItem("utm_first_touch") === null) {
        localStorage.setItem("utm_first_touch", JSON.stringify(utm));
      }
      localStorage.setItem("utm_last_touch", JSON.stringify(utm));
    }

    if (metaPixelId !== undefined && metaPixelId.trim() !== "") {
      const w = window as unknown as {
        __metaPixelLoaded?: boolean;
        fbq?: ((...args: unknown[]) => void) & {
          queue?: unknown[];
          loaded?: boolean;
          version?: string;
          push?: (...args: unknown[]) => void;
        };
      };
      if (!w.__metaPixelLoaded) {
        w.__metaPixelLoaded = true;
        if (typeof w.fbq !== "function") {
          const fbqFn = (...args: unknown[]) => {
            fbqFn.queue?.push(args);
          };
          fbqFn.queue = [] as unknown[];
          fbqFn.loaded = true;
          fbqFn.version = "2.0";
          fbqFn.push = fbqFn;
          w.fbq = fbqFn;
        }
        w.fbq("init", metaPixelId.trim());
        const script = document.createElement("script");
        script.async = true;
        script.src = "https://connect.facebook.net/en_US/fbevents.js";
        document.head.appendChild(script);
      }
    }

    if (ga4MeasurementId !== undefined && ga4MeasurementId.trim() !== "") {
      const w = window as unknown as {
        __ga4Loaded?: boolean;
        dataLayer?: unknown[];
        gtag?: (...args: unknown[]) => void;
      };
      if (!w.__ga4Loaded) {
        w.__ga4Loaded = true;
        w.dataLayer = w.dataLayer ?? [];
        w.gtag = (...args: unknown[]) => {
          w.dataLayer?.push(args);
        };
        w.gtag("js", new Date());
        w.gtag("config", ga4MeasurementId.trim());
        const script = document.createElement("script");
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4MeasurementId.trim())}`;
        document.head.appendChild(script);
      }
    }

    if (
      (metaPixelId !== undefined && metaPixelId.trim() !== "") ||
      (ga4MeasurementId !== undefined && ga4MeasurementId.trim() !== "")
    ) {
      trackStoreEvent("PageView");
    }
  }, [metaPixelId, ga4MeasurementId]);

  return null;
}
