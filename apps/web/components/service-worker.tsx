"use client";

import { useEffect } from "react";

/**
 * Registers public/sw.js in production builds. In development it removes
 * any worker left from a production run, so dev chunks are never served stale.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline support is a bonus; the app works without it.
      });
    } else {
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => registrations.forEach((registration) => void registration.unregister()));
    }
  }, []);

  return null;
}
