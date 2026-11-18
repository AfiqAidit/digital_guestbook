"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function PageHeader({
  title,
  backHref = "/home",
  right,
  backLabel,
}: {
  title: string;
  backHref?: string;
  right?: React.ReactNode;
  backLabel?: string;
}) {
  const { t } = useI18n();
  return (
    <header className="glass-strong sticky top-0 z-30 flex items-center gap-1 rounded-b-[1.5rem] border-t-0 px-2 pt-safe pb-2">
      <Link
        href={backHref}
        aria-label={backLabel ?? t("common.back")}
        className="grid size-12 shrink-0 place-items-center rounded-full text-forest active:bg-forest/10"
      >
        <ChevronLeft size={26} />
      </Link>
      <h1 className="min-w-0 flex-1 truncate font-display text-[1.65rem] leading-none font-semibold text-forest">
        {title}
      </h1>
      {right}
    </header>
  );
}
