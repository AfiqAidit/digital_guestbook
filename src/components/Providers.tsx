"use client";

import { I18nProvider } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n/dictionary";
import type { PublicSettings } from "@/lib/types";
import { GuestProvider } from "@/lib/guest";
import { StaffProvider } from "@/lib/staff";
import { SettingsProvider } from "@/lib/settings";
import { MusicProvider } from "@/lib/music";
import { StaffSheet } from "@/components/StaffSheet";
import { AdminFab } from "@/components/AdminFab";

export function Providers({
  initialLang,
  initialSettings,
  children,
}: {
  initialLang: Lang;
  initialSettings: PublicSettings | null;
  children: React.ReactNode;
}) {
  return (
    <I18nProvider initialLang={initialLang}>
      <GuestProvider>
        <StaffProvider>
          <SettingsProvider initial={initialSettings}>
            <MusicProvider>
              {children}
              <StaffSheet />
              <AdminFab />
            </MusicProvider>
          </SettingsProvider>
        </StaffProvider>
      </GuestProvider>
    </I18nProvider>
  );
}
