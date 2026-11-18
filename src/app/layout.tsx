import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Caveat, Cormorant_Garamond, Instrument_Sans } from "next/font/google";
import { Florals } from "@/components/Florals";
import { Providers } from "@/components/Providers";
import type { Lang } from "@/lib/i18n/dictionary";
import { EVENT } from "@/lib/event";
import { getPublicSettings } from "@/lib/server/store";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});
const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});
const script = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Afiq & Putri · 15.08.2027",
  description: `${EVENT.venue}, ${EVENT.hall}. Share your photos and wishes with the couple.`,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#800020",
};

async function pickLang(): Promise<Lang> {
  // English unless the guest chose Bahasa Melayu before (we do not guess from the browser language).
  const saved = (await cookies()).get("gb_lang")?.value;
  return saved === "ms" ? "ms" : "en";
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await pickLang();
  const initialSettings = await getPublicSettings().catch(() => null);
  return (
    <html lang={lang} className={`${display.variable} ${sans.variable} ${script.variable}`}>
      <body>
        <Providers initialLang={lang} initialSettings={initialSettings}>
          <div className="app-shell">
            <div className="app-backdrop" aria-hidden>
              <Florals />
            </div>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
