"use client";

import { useEffect } from "react";

export function Effects({ mode }: { mode: string }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    import("@/lib/artwork").then(({ mountEffects }) => {
      if (!cancelled) cleanup = mountEffects(mode);
    }).catch((error) => console.warn("Decorative artwork is unavailable", error));
    return () => { cancelled = true; cleanup?.(); };
  }, [mode]);
  return null;
}
