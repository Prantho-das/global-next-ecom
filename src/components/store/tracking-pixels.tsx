"use client";

import { useEffect } from "react";

export function TrackingPixels() {
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
  }, []);

  return null;
}
