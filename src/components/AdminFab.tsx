"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, SlidersHorizontal } from "lucide-react";
import { NAV_PATHS } from "@/components/BottomNav";
import { Sheet } from "@/components/Sheet";
import { Switch } from "@/components/Switch";
import { useStaff } from "@/lib/staff";
import { useSettings } from "@/lib/settings";
import type { AdminSettings } from "@/lib/types";

/**
 * The floating "team tools" button. Only exists for logged-in staff.
 * Admin mode OFF = the app looks exactly like the guest view (the button stays, but quiet).
 */
export function AdminFab() {
  const { session, adminMode, setAdminMode, menuOpen, setMenuOpen, logout } = useStaff();
  const { refresh: refreshPublic } = useSettings();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<AdminSettings | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/settings", { cache: "no-store" });
    if (res.ok) setAdmin((await res.json()) as AdminSettings);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch when the menu opens
    if (menuOpen && session) void load();
  }, [menuOpen, session, load]);

  async function toggleUploads(next: boolean) {
    setBusy(true);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadsOpen: next }),
    });
    if (res.ok) {
      const data = (await res.json()) as { settings: AdminSettings };
      setAdmin(data.settings);
      void refreshPublic();
    }
    setBusy(false);
  }

  if (!session) return null;
  const isSuper = session.role === "super_admin";

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
        <div
          className={`mx-auto flex max-w-[480px] justify-end px-4 ${
            // lift above the floating bottom bar where there is one
            NAV_PATHS.includes(pathname)
              ? "pb-[calc(max(0.75rem,env(safe-area-inset-bottom))+5.75rem)]"
              : "pb-[max(1rem,env(safe-area-inset-bottom))]"
          }`}
        >
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Team tools"
            className={`pointer-events-auto grid size-12 place-items-center rounded-full shadow-lg transition ${
              adminMode
                ? "bg-wine text-paper shadow-wine/30"
                : "bg-paper text-wine ring-2 ring-wine/60 shadow-ink/10"
            } active:scale-95`}
          >
            <SlidersHorizontal size={21} />
          </button>
        </div>
      </div>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Team tools">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-[0.92rem]">
          <span className="rounded-full bg-forest px-3 py-1 text-[0.78rem] font-semibold tracking-wider text-paper uppercase">
            {isSuper ? "Super admin" : "Host"}
          </span>
          {session.remark && <span className="text-ink-soft">{session.remark}</span>}
        </div>

        <div className="divide-y divide-forest/10">
          <div className="pb-2">
            <Switch
              checked={adminMode}
              onChange={setAdminMode}
              label="Admin mode"
              hint="Show hide & delete controls. Turn off to see what guests see."
            />
          </div>

          {isSuper && (
            <div className="py-2">
              <Switch
                checked={admin?.uploadsOpen ?? true}
                onChange={toggleUploads}
                disabled={!admin || busy}
                label="Photo uploads"
                hint="Switch off to close uploads. Guests can still view and leave wishes."
                onLabel="Open"
                offLabel="Closed"
              />
            </div>
          )}

          {admin && (
            <dl className="grid grid-cols-3 gap-2 py-4 text-center">
              {[
                ["Photos", admin.counts.photos],
                ["Wishes", admin.counts.wishes],
                ["Hidden", admin.counts.hiddenPhotos + admin.counts.hiddenWishes],
              ].map(([label, n]) => (
                <div key={label as string} className="rounded-xl bg-paper-deep/70 py-2.5">
                  <dd className="font-display text-2xl font-semibold text-forest">{n}</dd>
                  <dt className="text-[0.72rem] font-semibold tracking-widest text-ink-soft uppercase">
                    {label}
                  </dt>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div className="mt-2 grid gap-3">
          <Link
            href="/admin"
            onClick={() => setMenuOpen(false)}
            className="btn btn-primary w-full"
            aria-current={pathname === "/admin" ? "page" : undefined}
          >
            Open admin page
          </Link>
          <button type="button" onClick={logout} className="btn btn-quiet w-full">
            <LogOut size={18} /> Log out
          </button>
        </div>
      </Sheet>
    </>
  );
}
