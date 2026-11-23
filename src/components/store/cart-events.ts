"use client";

export function openCartDrawer() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("toggle-store-cart", { detail: { open: true } }));
  }
}

export function closeCartDrawer() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("toggle-store-cart", { detail: { open: false } }));
  }
}
