"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useMusic } from "@/lib/music";

/** Round speaker button: music on/off. Renders nothing until a music file exists. */
export function SoundButton() {
  const { t } = useI18n();
  const { available, playing, toggle } = useMusic();
  if (!available) return null;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={playing}
      aria-label={playing ? t("sound.off") : t("sound.on")}
      className="glass-strong grid size-11 shrink-0 place-items-center rounded-full text-forest transition-transform active:scale-95"
    >
      {playing ? <Volume2 size={20} /> : <VolumeX size={20} />}
    </button>
  );
}
