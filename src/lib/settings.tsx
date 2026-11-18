"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { PublicSettings } from "@/lib/types";

type Ctx = {
  settings: PublicSettings | null;
  refresh: () => Promise<void>;
};

const SettingsContext = createContext<Ctx | null>(null);

/** Public settings (uploads open?, Salam Kaut, counts). Re-checked every 20s while the page is visible. */
export function SettingsProvider({
  initial,
  children,
}: {
  /** Fetched on the server so the first paint already knows the hero photo, counts and switches. */
  initial: PublicSettings | null;
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<PublicSettings | null>(initial);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      if (res.ok) setSettings((await res.json()) as PublicSettings);
    } catch {
      /* keep the last known settings on a flaky connection */
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    void refresh();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 20_000);
    return () => clearInterval(id);
  }, [refresh]);

  const value = useMemo(() => ({ settings, refresh }), [settings, refresh]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside <SettingsProvider>");
  return ctx;
}
