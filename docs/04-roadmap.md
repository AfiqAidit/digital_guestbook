# 04 — Roadmap and status

> Update the checkboxes as work completes. Keep this the single source of truth for progress.

## Status

- [x] Research competitors and free-tier limits
- [x] Product decisions captured (`docs/05-decisions.md`)
- [x] Context docs written
- [x] Couple details, colour, languages, hosting confirmed by user
- [x] Project scaffolded (Next.js 16, TypeScript, Tailwind 4)
- [x] **Local MVP complete** (runs on a local file store; no accounts needed)
- [x] **Glass redesign** (backdrop, glass surfaces, bottom nav, stats strip, welcome couple-photo arch, Look + Frame editor with torn-paper caption)
- [ ] Supabase driver + deployed to Vercel
- [ ] QR printed
- [ ] Wedding day (15 Aug 2027)
- [ ] Post-wedding export done

## What was verified (Nov 2026)

Driven end-to-end in a headless browser at iPhone size, plus `curl` against the API:
- Welcome → name → home → upload (real in-browser compression, progress, thank-you) → gallery → viewer → wishes
- Staff: 4 taps do **not** open the popup, 5 do; wrong passcode shows a friendly error; correct passcode shows the floating button + team menu; host cannot change settings or upload the QR; guests cannot hide or delete; `?all=1` without the cookie does **not** leak hidden photos; after 5 wrong tries even the correct passcode is refused (lockout); uploads OFF returns 403 to guests; fake JPEGs (PNG renamed) are rejected; path traversal on `/api/files/` returns 404
- `npx tsc --noEmit`, `npm run lint`, `npm run build` all pass
- **Not yet tested on a real phone** (iOS Safari file picker/camera, WhatsApp/Instagram in-app browsers, HEIC from the library, weak network)

## Glass redesign: verified (Nov 2026)

Headless Chromium at 390×664 and 390×844, EN and BM: welcome (with and without couple photo), home, upload + style sheet (all looks/frames), gallery with framed photos, viewer, wishes, staff button lifts above the nav, team menu, admin "Welcome photo" section. Hero endpoint: staff-only (anon → 401), fake image → 400. **Not yet checked on a real phone:** `backdrop-filter` smoothness on mid-range Android, iOS Safari canvas memory with 12 MP photos + frames, WhatsApp/Instagram in-app browsers.

## Accounts to set up (user does these, only when ready to deploy)

The app works locally without any of these. They are only needed to put it online.

- [ ] **GitHub repo** for this project (so Vercel can deploy it)
- [ ] **Supabase** free account → new project (Postgres + Storage). User creates it, then puts the URL and keys into `.env.local` / Vercel env vars (do **not** paste secret keys into chat)
- [ ] **Vercel**: new project from the GitHub repo (separate from `afiqdev`), add env vars (Supabase keys, `HOST_PASSCODE`, `SUPER_ADMIN_PASSCODE`, `ADMIN_SESSION_SECRET`, `CRON_SECRET`)
- [ ] Choose real staff passphrases (the dev ones in `.env.local` are placeholders; **change before going live**)
- [ ] Email is only needed to sign up to Supabase/GitHub/Vercel. The app itself has **no email logins**

## Phase 0 — Setup

- [x] `create-next-app` (TypeScript, App Router, Tailwind, ESLint, `src/` dir)
- [x] `.gitignore` (ignores `.env*` except `.env.example`, and `.data/`), `.env.example`
- [x] Design tokens in Tailwind `@theme` (see `docs/03-design.md`), fonts via `next/font` (Cormorant Garamond, Instrument Sans, Caveat)
- [x] `noindex` (robots meta + `X-Robots-Tag` header)
- [x] EN/BM i18n (cookie-backed, server-rendered in the right language)
- [ ] Create Supabase project; write `supabase/migrations/` from the schema in `02-architecture.md`
- [ ] Create `gallery` and `salam-kaut` buckets
- [ ] Connect repo to a **new** Vercel project; use the generated `*.vercel.app` URL; add env vars

## Phase 1 — MVP (guest path)

- [x] Welcome screen: couple's details (ALL CAPS), arch design, EN/BM toggle, name entry, returning-guest state
- [x] `lib/guest.tsx` (anonymous token + name in localStorage)
- [x] `lib/image.ts` (compress to ~1 MB / 2000 px, 480 px thumbnail, EXIF rotation baked in, GPS stripped)
- [x] `/api/photos` with caps, JPEG magic-byte check, rate limiting, closed-uploads handling
- [x] Upload UI: multi-select, camera, preview, per-photo progress, auto-retry, resumable "try again", success state, closed state, limit message
- [x] Gallery: masonry of thumbnails, infinite scroll, full-screen swipe viewer, 10 s refresh
- [x] Wishes: list + compose + limit
- [ ] Real-phone testing (iOS Safari, Android Chrome, WhatsApp/IG in-app browsers)
- [ ] HEIC check: iOS Safari normally converts HEIC to JPEG in the file picker; verify on a device, add a fallback only if needed
- [ ] Back-button closes the photo viewer on Android (deliberately skipped: history tricks were risky with React strict mode; revisit)
- [ ] Switch polling to Supabase Realtime (optional; polling is fine at this scale)

## Phase 2 — Staff tools

- [x] Hidden 5-tap monogram trigger + friendly bilingual "For the wedding team" sheet (passcode with show/hide eye, optional remark)
- [x] `/api/admin/login` (constant-time compare, 5-strikes/15 min lockout, signed 12 h cookie, `admin_log`), `/logout`, `/me`, `requireRole()`
- [x] Floating admin button + team menu: **Admin mode ON/OFF**, **Uploads ON/OFF** (super admin), counts, open admin page, log out
- [x] Hide / restore / delete on photos (tile button + viewer) and wishes, with server-side role checks
- [x] `/admin` page (English only): overview, uploads switch + optional auto-close time, moderation mode, per-guest limits, Salam Kaut, "needs a look" list
- [ ] ZIP export of photos + CSV of wishes (**must exist before the wedding**)
- [ ] Host-level "approve" flow UI for `review` mode (data model supports it; pending items appear dimmed in gallery with a restore button; a dedicated "approve all" button would be nice)

## Phase 3 — Wedding-day features

- [x] **Salam Kaut section**: card, recipient `PUTRI SOEFIA BINTI ABD AZIS`, optional note, QR upload/replace/remove (super admin), hidden from guests until a QR exists **and** the switch is on, admin preview
- [ ] User supplies the DuitNow QR image, then upload it in `/admin`
- [ ] Printable QR table card (A5 PDF/PNG) in forest + wine theme
- [ ] Keep-alive: `vercel.json` daily cron → `/api/health` (needs Supabase + Vercel; enable at deploy and keep running until after exports)

## Phase 4 — Delight

- [ ] Disposable-camera mode (20 shots, film filter, date stamp, counter). `maxCameraPerGuest` and the `source = 'camera'` plumbing already exist
- [ ] Polish pass against the anti-slop checklist on a real device
- [ ] Reduced-motion and accessibility audit (reduced-motion CSS is in; screen-reader pass not done)
- [ ] Viewer: swipe-down to close; pinch-zoom

## Phase 5 — Launch checklist

- [ ] Real couple's copy (EN + BM) reviewed by the couple (the BM strings are drafts)
- [x] Spelling confirmed: "PUTRI SOEFIA"
- [ ] Salam Kaut QR image uploaded; card enabled and checked on a phone
- [ ] Vercel URL decided (custom domain later, optional — QR must be regenerated if URL changes, so decide **before printing**)
- [ ] QR code tested on iPhone + Android + in-app browsers (WhatsApp, IG)
- [ ] Load test: ~30 parallel uploads of 1 MB
- [ ] Storage usage check (< 60 % of 1 GB before the event)
- [ ] **Change the staff passphrases** from the dev placeholders; host passphrase given to the couple/helper; super-admin passphrase kept by the user; both tested on real phones; lockout tested
- [ ] Uploads ON/OFF switch tested (guests see a friendly closed state)
- [ ] Keep-alive cron confirmed running; Supabase project awake the day before
- [ ] Backup export dry run
- [ ] Plan for post-event: switch Uploads OFF (manually, or auto-close time), ZIP export, then optionally wipe

## Cut list (if time is short)

Drop in this order: disposable camera → printable card → BM polish beyond core strings → Salam Kaut. **Never cut:** upload reliability, mobile gallery, host hide/delete, ZIP export.

**Wedding date: 15 Aug 2027.** Plenty of time; aim to have Phase 1–3 done and tested ≥ 1 month before, so the QR can be printed with a stable URL.

## Suggested next steps (in order)

1. User reviews the local app on their own phone (same wifi: `npm run dev -- -H 0.0.0.0`, open `http://<laptop-ip>:3000`) and gives design feedback.
2. Build ZIP/CSV export and the `/api/health` route.
3. Supabase project → implement the Supabase version of `store.ts` + migrations → deploy to Vercel.
4. Real-phone and in-app-browser testing; fix what breaks.
5. Disposable-camera mode and the printable QR card.
6. Couple reviews the BM/EN copy; swap the staff passphrases.
