/**
 * The one wedding this app is for. Names/venue are ALL CAPS exactly as the couple asked.
 * (See AGENTS.md. Do not turn this into a multi-event config system.)
 */
export const EVENT = {
  groom: "MUHAMMAD AFIQ AIDIT BIN MOHD ARIFF",
  bride: "PUTRI SOEFIA BINTI ABD AZIS",
  initials: ["A", "P"] as const,
  venue: "TAMARIND SQUARE",
  hall: "THE GLASS GALORE EVENT SPACE",
  date: "2027-08-15",
  /** Day/month/year pieces for localised formatting without Intl (stable on every phone). */
  day: 15,
  month: 8,
  year: 2027,
} as const;

export const MONTHS = {
  en: [
    "JANUARY",
    "FEBRUARY",
    "MARCH",
    "APRIL",
    "MAY",
    "JUNE",
    "JULY",
    "AUGUST",
    "SEPTEMBER",
    "OCTOBER",
    "NOVEMBER",
    "DECEMBER",
  ],
  ms: [
    "JANUARI",
    "FEBRUARI",
    "MAC",
    "APRIL",
    "MEI",
    "JUN",
    "JULAI",
    "OGOS",
    "SEPTEMBER",
    "OKTOBER",
    "NOVEMBER",
    "DISEMBER",
  ],
} as const;

export function formatWeddingDate(lang: "en" | "ms") {
  return `${EVENT.day} ${MONTHS[lang][EVENT.month - 1]} ${EVENT.year}`;
}
