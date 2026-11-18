"use client";

/**
 * Client side of staff access. This only remembers *who the server says we are*.
 * Nothing here grants power: every /api/admin/* route re-checks the signed cookie.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Role, StaffSession } from "@/lib/types";

const MODE_KEY = "gb_admin_mode";

type Ctx = {
  session: StaffSession | null;
  checked: boolean;
  /** UI-only switch: show hide/delete controls. OFF = look exactly like a guest. */
  adminMode: boolean;
  setAdminMode: (on: boolean) => void;
  sheetOpen: boolean; // the hidden passcode popup
  openSheet: () => void;
  closeSheet: () => void;
  menuOpen: boolean; // the floating-button menu
  setMenuOpen: (o: boolean) => void;
  /** Resolves to the role on success, null on a wrong passcode or error. */
  login: (passcode: string) => Promise<Role | null>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const StaffContext = createContext<Ctx | null>(null);

export function StaffProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<StaffSession | null>(null);
  const [checked, setChecked] = useState(false);
  const [adminMode, setAdminModeState] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/me", { cache: "no-store" });
      const data = (await res.json()) as { session: StaffSession | null };
      setSession(data.session);
    } catch {
      setSession(null);
    } finally {
      setChecked(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial session probe on mount
    void refresh();
    try {
      setAdminModeState(localStorage.getItem(MODE_KEY) !== "off");
    } catch {
      /* ignore */
    }
  }, [refresh]);

  const setAdminMode = useCallback((on: boolean) => {
    setAdminModeState(on);
    try {
      localStorage.setItem(MODE_KEY, on ? "on" : "off");
    } catch {
      /* ignore */
    }
  }, []);

  const login = useCallback(
    async (passcode: string): Promise<Role | null> => {
      try {
        const res = await fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ passcode }),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { role: Role };
        await refresh();
        setAdminMode(true);
        return data.role;
      } catch {
        return null;
      }
    },
    [refresh, setAdminMode],
  );

  const logout = useCallback(async () => {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => undefined);
    setSession(null);
    setMenuOpen(false);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      session,
      checked,
      adminMode,
      setAdminMode,
      sheetOpen,
      openSheet: () => setSheetOpen(true),
      closeSheet: () => setSheetOpen(false),
      menuOpen,
      setMenuOpen,
      login,
      logout,
      refresh,
    }),
    [session, checked, adminMode, setAdminMode, sheetOpen, menuOpen, login, logout, refresh],
  );
  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>;
}

export function useStaff() {
  const ctx = useContext(StaffContext);
  if (!ctx) throw new Error("useStaff must be used inside <StaffProvider>");
  return ctx;
}

/** True only when a staff member is logged in AND admin mode is switched on. */
export function useIsAdminUi() {
  const { session, adminMode } = useStaff();
  return !!session && adminMode;
}
