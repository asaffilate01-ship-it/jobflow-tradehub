import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register the service worker only on the real published site. Inside the Lovable
// editor preview (and in dev) a cached app shell can serve stale asset URLs and
// leave a blank screen, so we actively unregister any worker there instead.
const isPreviewHost =
  typeof window !== "undefined" &&
  (window.location.hostname.includes("id-preview") ||
    window.location.hostname.endsWith("lovableproject.com") ||
    window.location.hostname === "localhost" ||
    window.self !== window.top);

if ("serviceWorker" in navigator) {
  if (import.meta.env.PROD && !isPreviewHost) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("Service worker registration failed:", err);
      });
    });
  } else {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
      if (regs.length && "caches" in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      }
    }).catch(() => {});
  }
}

