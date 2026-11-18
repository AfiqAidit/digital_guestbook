# 05 — Decisions and open questions

## Decisions (made by the user, Nov 16 2026)

| # | Decision | Rationale |
|---|---|---|
| D1 | Build a custom site instead of buying a Malaysian QR gallery service | Free, fully personalised, owned by the couple |
| D2 | Stack: Next.js + TypeScript + Tailwind, Supabase, Vercel | Free tiers, good DX; see `02-architecture.md` |
| D3 | Roles: **Guest**, **Host** (couple + helpers), **Super admin** (flag on host) | One wedding; separate "bride" role adds complexity with no benefit |
| D4 | Moderation: **hybrid** — publish instantly, hosts can hide/delete afterwards. Setting can flip to review-first | Lively gallery, with a safety net |
| D5 | Features in scope: written wishes, Salam Kaut (DuitNow QR display), disposable-camera mode. *(Live wall originally chosen, then removed — see D14.)* | Chosen by user |
| D6 | Features out of scope for now: video, RSVP/table finder, voice notes | Storage cost / not requested |
| D7 | Scale assumption: ~250 invited, **~150 active uploaders** | User: "not all will scan" |
| D8 | Visual theme: **forest green**, kept restrained (paper base + forest accents) | User's wedding theme; avoid overwhelming green. Refined by D13 |
| D9 | Project must not look like generic AI output | Explicit user requirement; see anti-slop checklist |
| D10 | Photos only, compressed client-side, with generated thumbnails | Free-tier storage (1 GB) and egress (5 GB) |
| D11 | Salam Kaut is display-only; the app never handles money | Simplicity and trust |
| D12 | Couple displayed in ALL CAPS: MUHAMMAD AFIQ AIDIT BIN MOHD ARIFF & PUTRI SOEFIA BINTI ABD AZIS (spelling "PUTRI" confirmed 2026-11-16). Date 15/08/2027. Venue TAMARIND SQUARE, hall THE GLASS GALORE EVENT SPACE | User-provided (2026-11-16) |
| D13 | Colour: user provided **`#800020` (burgundy)**. Used as the signature accent on top of forest-green brand colour (≈ 70 % paper / 20 % forest / ≤ 10 % wine) | User's colour choice; combines with forest theme without overwhelming |
| D14 | **No live wall / TV.** Phones only | User: no screen at venue; mobile is the priority |
| D15 | **Mobile only** design priority (375–430 px); desktop just must not break | User: "this is only for phone" |
| D16 | Languages: **English + Bahasa Melayu**, with a toggle | User |
| D17 | **No guest passcode.** Rely on hybrid moderation, caps, uploads ON/OFF, noindex | User opted out (didn't see the need) |
| D19 | **Staff access = hidden 5-tap on the logo → popup with passcode + remark → server-validated against env-var passcodes → signed httpOnly cookie.** No email/password accounts and no Supabase Auth. Two passcodes: host and super admin | User asked for a simple tap-and-passcode flow; a DB account isn't needed for validation. Trade-offs recorded in `02-architecture.md` → Staff access |
| D20 | Super admin has a dedicated **Uploads ON/OFF** button (manual) as the primary way to open/close uploads; optional auto-close time is secondary. Floating admin button appears when logged in, with an **Admin mode ON/OFF** switch | User: "special button when super admin, can on and off" |
| D21 | Salam Kaut section is built now; QR image supplied later by the user. Recipient: **PUTRI SOEFIA BINTI ABD AZIS** (shown ALL CAPS to match the couple's names). Card hidden from guests until a QR is uploaded and enabled | User |
| D23 | **Build locally first** on a JSON+files store (`.data/`), behind one file (`lib/server/store.ts`), so design and flows could be finished before any Supabase/GitHub/Vercel setup | User: "build the design and overall things first so we have the baseline" |
| D24 | Dev staff passcodes live **only** in the git-ignored `.env.local` (never in docs or code). The super-admin one is the user's own choice; the host one is a placeholder. **Both are weak/guessable and MUST be changed before launch** (the user said they will "make it proper" later). Never write real passcodes into any tracked file | User chose a simple passcode for now; the 5-strike lockout limits the risk |
| D25 | Hidden staff popup copy is deliberately friendly and bilingual so a guest who opens it by accident isn't scared. The "remark" field is an optional free-text note stored in the audit log | User: "just not to scare the guest" |
| D26 | Uploads go through our server as one multipart request per ~1 MB photo (no signed URLs). Image output is JPEG; the compression library's web-worker mode is off (it loads code from a public CDN) | Simpler, and doesn't depend on the venue's internet reaching a CDN |
| D27 | Admin screens (`/admin`, team menu) are English-only; everything guests see is EN + BM | Staff are the couple's own team; saves translation effort |
| D28 | **Glassmorphism base**, level A (subtle): frosted glass on nav bar, header, sheets, hero/stats/action cards over a painted forest watercolour backdrop. Gallery tiles, wish notes, viewer and admin stay opaque | User asked for glass (wanted heavy "B"); A recommended because blur over scrolling photos is slow on mid-range Android/in-app browsers and hurts legibility; user accepted A. Supersedes the old "no glassmorphism" anti-slop line |
| D29 | Backdrop art generated with image generation (`public/art/forest-backdrop.jpg`), replaceable | User chose "generate"; can be swapped for commissioned art later |
| D30 | New scope from the user's reference screenshots: floating bottom nav (Gallery / + / Wishes), stats strip, couple-photo arch hero on welcome (super-admin upload), per-photo **Look + Frame** editor with torn-paper "Moments from" caption | User picked these. **Not** adopted: photobooth strips, voice wishes ("Viewing" live counter also skipped, needs presence tracking) |
| D31 | Looks/frames are baked into the JPEG on the phone (canvas, per-pixel looks because Safari lacks canvas filters). Original is not kept | Keeps free-tier storage flat and what guests preview = what everyone sees. Trade-off: styled photos can't be "un-framed" later |
| D32 | Public settings are fetched on the server in `layout.tsx` and handed to `SettingsProvider` as initial state | No flash of the wrong welcome hero / zero counts on first paint |
| D22 | Keep-alive for the free Supabase project: Vercel daily cron → `/api/health`. Needs the Supabase and Vercel projects to exist first | Prevents the 1-week inactivity pause |
| D18 | Hosting: Vercel, own `*.vercel.app` URL for now; buy a domain later | `afiqdev.vercel.app` is an existing separate project, so this app is a new Vercel project. Regenerate QR if the URL changes, so decide before printing |

## Open questions (ask the user before building the related part)

*Answered (see decisions D12–D18):* names/date/venue, colour, languages, passcode (no), domain (Vercel for now), screen (none).

*Still open:*
1. **"Remarks" in the staff popup**: assumed to mean a free-text "who are you / why" note stored in an audit log. Confirm that's what the user meant.
2. **Invitation style / logo**: is there a logo or monogram? Any ornament/illustration style to echo? (Otherwise we design an A & P monogram.)
3. **Staff passphrases**: user to choose the host and super-admin passphrases (≥ 10 chars) and decide who gets the host one (couple, helper/moderator).
4. **Salam Kaut QR image**: user will supply later (section built first).
5. **Auto-close time**: besides the manual Uploads ON/OFF button, should uploads auto-close after some days? (Suggest 7 days after the wedding, optional.)
6. **After the wedding**: keep the gallery online? For how long? (Free-tier storage is finite.)
7. **Original quality**: are compressed ~2000 px photos acceptable for the couple's keepsake? If they want originals, plan for R2 or Google Drive handoff.
8. **Vercel project name / URL**: choose before printing the QR.
9. **Venue wifi**: is it reliable? (Affects how hard we lean on retry/after-event uploads.)

## Known risks

- **Free-tier ceiling**: 1 GB storage. Mitigate with caps, compression, monitoring; fall back to Cloudflare R2.
- **Supabase pause after 1 week idle**: mitigate with keep-alive cron; verify project is awake the day before.
- **Venue wifi**: mitigate with small files, retry, allow uploads after the event.
- **iOS in-app browsers** (WhatsApp/IG) can be quirky with file pickers/camera: test early.
- **HEIC** conversion in-browser can be slow on old phones: show progress; consider server fallback.
- **Privacy**: photos of children/family; no passcode (user's choice), so hide tools, caps, `noindex` and closing uploads are the safeguards.

## Decision log (append new entries below)

<!-- Format: - YYYY-MM-DD — Decision — Reason — Who -->
- 2026-11-16 — Initial plan and docs created — Capture context for other models — assistant
- 2026-11-16 — D19–D22 recorded (staff passcode access, uploads ON/OFF, Salam Kaut recipient, keep-alive); spelling set to PUTRI — User follow-up answers — assistant
- 2026-11-16 — D12–D18 recorded (couple details, burgundy accent, no wall, mobile-only, EN+BM, no passcode, Vercel) — User answered open questions — assistant
- 2026-11-16 — D28–D32 recorded (glassmorphism level A, generated backdrop, nav/stats/hero/frames scope) — User chose glass + features from reference screenshots — assistant
