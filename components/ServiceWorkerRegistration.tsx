"use client";

import { useEffect, useState } from "react";

export default function ServiceWorkerRegistration() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const onControllerChange = () => {
      window.location.reload();
    };

    const onRegistration = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
        setUpdateAvailable(true);
      }

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
            setUpdateAvailable(true);
          }
        });
      });
    };

    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then(onRegistration)
        .catch((error) => {
          console.log("Service Worker registration failed:", error);
        });
    });

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  const refreshPage = () => {
    if (!waitingWorker) {
      window.location.reload();
      return;
    }

    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  };

  return updateAvailable ? (
    <div style={{
      position: "fixed",
      bottom: 16,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 9999,
      background: "rgba(0,0,0,0.85)",
      color: "white",
      padding: "10px 14px",
      borderRadius: 8,
      fontSize: 14,
      display: "flex",
      alignItems: "center",
      gap: 12,
      boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
    }}>
      <span>A new version is available.</span>
      <button
        onClick={refreshPage}
        style={{
          border: "none",
          borderRadius: 6,
          padding: "6px 12px",
          background: "#22c55e",
          color: "#111827",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Refresh
      </button>
    </div>
  ) : null;
}

