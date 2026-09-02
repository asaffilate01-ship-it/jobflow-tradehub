import { lazy, type ComponentType } from "react";

const RELOAD_KEY = "craftvaro:chunk-reloaded-at";

/**
 * Wraps React.lazy so a failed dynamic import (usually a stale chunk hash after
 * a new deploy) retries once, then forces a single full reload instead of
 * leaving the user on a blank screen.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      // one silent retry (transient network / cold cache)
      try {
        return await factory();
      } catch {
        const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
        if (Date.now() - last > 10_000) {
          sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
          window.location.reload();
          // never resolves; the reload takes over
          return await new Promise<{ default: T }>(() => {});
        }
        throw error;
      }
    }
  });
}
