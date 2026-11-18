"use client";

/**
 * Guests have no accounts. They type a name once; we keep it plus a random token in localStorage.
 * The token is only used to enforce per-guest upload caps — it isn't a secret or a login.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const KEY = "gb_guest_v1";

type Stored = { token: string; name: string };

type Ctx = {
  ready: boolean;
  token: string;
  name: string;
  setName: (n: string) => void;
  clearName: () => void;
};

const GuestContext = createContext<Ctx | null>(null);

function load(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Stored>;
      if (typeof p.token === "string" && p.token.length >= 32) {
        return { token: p.token, name: typeof p.name === "string" ? p.name : "" };
      }
    }
  } catch {
    /* private mode etc. — fall through to a fresh token */
  }
  return { token: crypto.randomUUID(), name: "" };
}

function save(s: Stored) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function GuestProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Stored>({ token: "", name: "" });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = load();
    save(s);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading localStorage must happen after mount
    setState(s);
    setReady(true);
  }, []);

  const setName = useCallback((name: string) => {
    setState((prev) => {
      const next = { ...prev, name: name.trim().slice(0, 60) };
      save(next);
      return next;
    });
  }, []);

  const clearName = useCallback(() => setName(""), [setName]);

  const value = useMemo(
    () => ({ ready, token: state.token, name: state.name, setName, clearName }),
    [ready, state, setName, clearName],
  );
  return <GuestContext.Provider value={value}>{children}</GuestContext.Provider>;
}

export function useGuest() {
  const ctx = useContext(GuestContext);
  if (!ctx) throw new Error("useGuest must be used inside <GuestProvider>");
  return ctx;
}
