"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

/**
 * Optional background music. The audio file must be licensed (see docs/05-decisions.md D36); with no
 * file at public/audio/theme.mp3 the speaker button stays hidden and nothing is downloaded.
 *
 * It tries to start by itself. Browsers usually block sound before the guest has touched the page,
 * so if that happens it starts on the very first tap anywhere (e.g. "Continue"). The speaker button
 * mutes it; once a guest mutes it, it stays muted until they turn it back on.
 */
export const MUSIC_SRC = "/audio/theme.mp3";
const MUTED_KEY = "gb_music_muted";

type Ctx = { available: boolean; playing: boolean; toggle: () => void };
const MusicContext = createContext<Ctx>({ available: false, playing: false, toggle: () => {} });

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const muted = useRef(false);
  const [available, setAvailable] = useState(false);
  const [playing, setPlaying] = useState(false);

  const play = useCallback(() => {
    const a = audio.current;
    if (!a) return Promise.reject(new Error("no audio"));
    return a.play().then(() => setPlaying(true));
  }, []);

  useEffect(() => {
    let off = false;
    const cleanups: (() => void)[] = [];
    try {
      muted.current = localStorage.getItem(MUTED_KEY) === "1";
    } catch {
      /* ignore */
    }

    // Is there a file at all? (Cheap HEAD request; no audio is downloaded.)
    fetch(MUSIC_SRC, { method: "HEAD", cache: "no-store" })
      .then((r) => {
        if (off || !r.ok || !(r.headers.get("content-type") ?? "").startsWith("audio")) return;
        const a = new Audio(MUSIC_SRC);
        a.loop = true;
        a.volume = 0.35;
        audio.current = a;
        setAvailable(true);
        if (muted.current) return;

        // 1) try right away  2) if blocked, start on the first tap/key
        play().catch(() => {
          const start = () => {
            if (!muted.current) play().catch(() => {});
          };
          for (const ev of ["pointerdown", "keydown", "touchend"] as const) {
            window.addEventListener(ev, start, { once: true, passive: true });
            cleanups.push(() => window.removeEventListener(ev, start));
          }
        });
      })
      .catch(() => {});

    return () => {
      off = true;
      cleanups.forEach((fn) => fn());
      audio.current?.pause();
    };
  }, [play]);

  const toggle = useCallback(() => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) {
      muted.current = false;
      play().catch(() => setPlaying(false));
    } else {
      muted.current = true;
      a.pause();
      setPlaying(false);
    }
    try {
      localStorage.setItem(MUTED_KEY, muted.current ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [play]);

  const value = useMemo(() => ({ available, playing, toggle }), [available, playing, toggle]);
  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}

export function useMusic() {
  return useContext(MusicContext);
}
