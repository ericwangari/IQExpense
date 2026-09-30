"use client";

import { useEffect } from "react";

const VERSION_STORAGE_KEY = "expenseiq-build-version";
let hasReloadedForUpdate = false;

async function readLiveVersion() {
  const response = await fetch(`/api/version?ts=${Date.now()}`, {
    cache: "no-store",
    headers: { "cache-control": "no-cache" },
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { version?: string };
  return body.version || null;
}

async function activateWaitingWorker(registration: ServiceWorkerRegistration) {
  if (registration.waiting) {
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }
}

export function PwaInstaller() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    let timer: number | undefined;
    let disposed = false;

    const reloadForUpdate = () => {
      if (hasReloadedForUpdate) return;
      hasReloadedForUpdate = true;
      window.location.reload();
    };

    const checkForAppUpdate = async (registration?: ServiceWorkerRegistration) => {
      try {
        const liveVersion = await readLiveVersion();
        if (!liveVersion || disposed) return;

        const storedVersion = window.localStorage.getItem(VERSION_STORAGE_KEY);
        if (!storedVersion) {
          window.localStorage.setItem(VERSION_STORAGE_KEY, liveVersion);
          return;
        }

        if (storedVersion !== liveVersion) {
          window.localStorage.setItem(VERSION_STORAGE_KEY, liveVersion);
          if (registration) {
            await registration.update();
            await activateWaitingWorker(registration);
          }
          reloadForUpdate();
        }
      } catch {
        // Keep the installed app usable if the version check fails offline.
      }
    };

    const register = async () => {
      const registration = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
      await registration.update();
      await activateWaitingWorker(registration);
      await checkForAppUpdate(registration);

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            worker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });

      timer = window.setInterval(() => {
        void checkForAppUpdate(registration);
      }, 60_000);

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") void checkForAppUpdate(registration);
      });

      window.addEventListener("focus", () => {
        void checkForAppUpdate(registration);
      });
    };

    navigator.serviceWorker.addEventListener("controllerchange", reloadForUpdate);
    window.addEventListener("load", () => {
      register().catch(() => undefined);
    });

    return () => {
      disposed = true;
      if (timer) window.clearInterval(timer);
      navigator.serviceWorker.removeEventListener("controllerchange", reloadForUpdate);
    };
  }, []);

  return null;
}

