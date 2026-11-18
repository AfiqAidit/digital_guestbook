"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

/**
 * Optional background music. The audio file is NOT in the repo (it must be licensed: see
 * docs/05-decisions.md D36). Drop a licensed file at public/audio/theme.mp3 and the speaker button
 * appears; with no file the button stays hidden and nothing is downloaded.
 *
 * It starts OFF on purpose: ~150 phones playing music at a venue would be chaos, and browsers block
 * sound before a tap anyway. A guest turns it on with the speaker button; it keeps playing across pages.
 */
export const MUSIC_SRC = "/audio/theme.mp3";

type Ctx = { available: boolean; playing: boolean; toggle: () => void };
const MusicContext = createContext<Ctx>({ available: false, playing: false, toggle: () => {} });

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [available, setAvailable] = useState(false);
  const [playing, setPlaying] = useState(false);

  // Is there a file at all? (Cheap HEAD request; no audio is downloaded.)
  useEffect(() => {
    let off = false;
    fetch(MUSIC_SRC, { method: "HEAD", cache: "no-store" })
      .then((r) => {
        if (!off) setAvailable(r.ok && (r.headers.get("content-type") ?? "").startsWith("audio"));
      })
      .catch(() => {});
    return () => {
      off = true;
      audio.current?.pause();
    };
  }, []);

  const toggle = useCallback(() => {
    if (!audio.current) {
      const a = new Audio(MUSIC_SRC);
      a.loop = true;
      a.volume = 0.35;
      a.preload = "none";
      audio.current = a;
    }
    const a = audio.current;
    if (a.paused) {
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      a.pause();
      setPlaying(false);
    }
  }, []);

  const value = useMemo(() => ({ available, playing, toggle }), [available, playing, toggle]);
  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}

export function useMusic() {
  return useContext(MusicContext);
}
