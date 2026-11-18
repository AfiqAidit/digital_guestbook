"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookHeart, GalleryVerticalEnd, House, Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";

/** Pages that show the bottom bar. Home has none (its cards already are the menu). The staff button lifts above it on these. */
export const NAV_PATHS = ["/gallery", "/wishes"];

/**
 * Floating glass bar: Gallery | big + | Wishes. The + is the one thing most guests came to do,
 * so it sits in the middle, in the thumb zone. When uploads are closed it becomes "Home".
 */
export function BottomNav() {
  const { t } = useI18n();
  const { settings } = useSettings();
  const pathname = usePathname();
  const uploadsOpen = settings ? settings.uploadsOpen : true;

  const item = (href: string, label: string, Icon: typeof House) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-14 min-w-[6.5rem] flex-col items-center justify-center gap-0.5 justify-self-center rounded-full px-4 text-[0.78rem] font-semibold tracking-[0.1em] uppercase transition-colors ${
          active ? "bg-forest text-paper" : "text-forest active:bg-forest/10"
        }`}
      >
        <Icon size={21} strokeWidth={active ? 2.2 : 1.9} />
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
      <div className="mx-auto max-w-[480px] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <nav
          aria-label="Main"
          className="glass-strong pointer-events-auto relative grid grid-cols-[1fr_5.25rem_1fr] items-center rounded-[2rem] p-1.5"
        >
          {item("/gallery", t("gallery.title"), GalleryVerticalEnd)}

          <span aria-hidden className="block" />
          <Link
            href={uploadsOpen ? "/upload" : "/home"}
            aria-label={uploadsOpen ? t("upload.title") : t("nav.home")}
            className="absolute top-0 left-1/2 grid size-16 -translate-x-1/2 -translate-y-[38%] place-items-center rounded-full bg-forest text-paper shadow-[0_12px_26px_-8px_rgb(94_0_24/0.55)] ring-[5px] ring-[#fbf4f1] transition-transform active:scale-95 active:bg-forest-deep"
          >
            {uploadsOpen ? <Plus size={32} strokeWidth={2.2} /> : <House size={28} />}
          </Link>

          {item("/wishes", t("wishes.title"), BookHeart)}
        </nav>
      </div>
    </div>
  );
}
