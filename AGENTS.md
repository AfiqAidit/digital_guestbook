# AGENTS.md — Start here

This is the entry point for any AI model or developer working on this repo. Read this file first, then the docs it points to.

## What this project is

A **digital wedding guestbook / shared photo wall** for a Malaysian wedding (~250 invited guests, ~150 expected to actually upload).

Guests scan a QR code at the venue, open a website in their phone browser (no app, no account), upload photos, leave a written wish, and browse a shared gallery. The couple and trusted helpers can moderate and download everything.

**The couple and event (use these exactly, ALL CAPS when displayed)**
- MUHAMMAD AFIQ AIDIT BIN MOHD ARIFF
- PUTRI SOEFIA BINTI ABD AZIS *(spelling confirmed by the user: PUTRI)*
- Date: **15 August 2027** (15/08/2027)
- Venue: **TAMARIND SQUARE**
- Hall: **THE GLASS GALORE EVENT SPACE**

**Hard constraints**
- **Mobile phone only.** Every guest and host uses a phone. Design, build and test for 375–430 px width first; desktop only needs to not break. There is **no TV/projector**, so there is no live wall.
- Must run on **free tiers** (see `docs/02-architecture.md` for limits and math).
- Must be dead simple for older guests (grandparents / "aunty test").
- Must **not look like generic AI-generated UI** (see `docs/03-design.md` — this is a first-class requirement, not polish).
- Theme: **burgundy `#800020` on blush paper**, with a real blossom photo as the backdrop (decisions D34, D40). Restrained, not overwhelming.
- Languages: **English + Bahasa Melayu**.
- **No guest passcode.** The gallery is open to anyone with the link/QR (protected by hybrid moderation instead).
- **Staff access = hidden 5-tap + passcode, no accounts.** Tapping the logo 5 times opens a "staff access" popup (passcode + remark). Validated **server-side** against env-var passcodes; no email/password, no Supabase Auth. See `docs/02-architecture.md` → "Staff access".

## Doc map

| File | Read it when |
|---|---|
| `docs/01-product.md` | You need requirements, roles, user journeys, feature scope |
| `docs/02-architecture.md` | You are touching stack, DB schema, storage, auth, security, free-tier limits |
| `docs/03-design.md` | You are touching any UI, copy, fonts, colours, motion |
| `docs/04-roadmap.md` | You need to know what to build next and what "done" means |
| `docs/05-decisions.md` | You want to know why something is the way it is, or what is still open |

## Status

**Local MVP is built and working** (guest flow, staff access, moderation, Salam Kaut section, EN/BM). **Design base is glassmorphism level A** over a blush-washed blossom photo backdrop (burgundy theme, D34, D40) (see `docs/03-design.md` and decision D28); the home screen has the couple illustration, a Latest moments strip led by Add yours (no stats, no bottom nav); the welcome screen shows an optional couple photo (super admin uploads it); guests can add a **Look + Frame** (incl. torn-paper caption) before posting. It runs on a **local file store** (`.data/`) with no accounts. **Not yet done:** Supabase driver, deployment, ZIP export, disposable-camera mode, keep-alive cron. See the checklist at the top of `docs/04-roadmap.md`. **Update it whenever you finish a task.** Add new decisions to `docs/05-decisions.md`.

## Running locally

```bash
npm install
cp .env.example .env.local     # then fill in the 3 values (a dev .env.local already exists on the author's machine)
npm run dev                    # http://localhost:3000 (or the next free port)
npm run lint && npx tsc --noEmit && npm run build   # all three must pass before you call a task done
```

Open it at a phone width (browser devtools, 390 px). Photos/wishes/settings are stored in `.data/` (git-ignored). Delete that folder to reset. Staff access: tap the **A&P monogram 5 times** on the **welcome screen only**. On Home, one tap on it goes straight back to the welcome screen.

## IMPORTANT: this is a very new Next.js

The installed Next.js (see `package.json`, 16.x) is newer than most models' training data. **Before writing Next-specific code, read the bundled docs in `node_modules/next/dist/docs/`** (e.g. `01-app/01-getting-started/15-route-handlers.md`). Don't assume older APIs. Things already verified here: `cookies()`/`headers()` are async; route `params` is a `Promise`; the scaffold's `cacheComponents` was switched off to keep things simple.

## Where things live

| Path | What |
|---|---|
| `src/lib/event.ts` | The couple/venue/date constants (ALL CAPS) |
| `src/lib/i18n/dictionary.ts` | **All guest-facing copy**, EN + BM (type-checked to have identical keys) |
| `src/lib/server/store.ts` | **The only data layer.** Local JSON+files today; replace this file to move to Supabase |
| `src/lib/server/admin-session.ts` | Passcode check + signed cookie + `requireRole()` |
| `src/lib/image.ts` | Client-side compress + thumbnail |
| `src/lib/photo-style.ts` | Canvas Looks (per-pixel) + Frames (print / torn paper / arch) baked in before upload |
| `src/components/BottomNav.tsx`, `PhotoStyleSheet.tsx` | Floating glass nav; the Look/Frame editor sheet |
| `src/app/api/**` | Route handlers (public: photos, wishes, settings, files; staff: `admin/*`) |
| `src/components/Monogram.tsx` | The A&P logo. On the welcome screen it is **the hidden 5-tap staff trigger**; on Home it is a plain "back to welcome" button |
| `src/app/globals.css` | Design tokens (`@theme`), backdrop (`.app-backdrop`), paper grain, `.glass` / `.glass-strong`, `.btn` / `.field` / `.print` classes |
| `src/lib/music.tsx`, `src/components/SoundButton.tsx` | Optional music (file at `public/audio/theme.mp3`, not in the repo, off by default) and its speaker button |
| `public/bg/*.webp`, `Petals.tsx`, `Couple.tsx` | Backdrop photos (blossom is in use; bricks and daisies are spares), drifting petals (Home only), and the drawn couple (SVG/CSS) |

## Working rules for agents

1. **Do not over-build.** One wedding, one event. No multi-tenancy, no billing, no marketing site.
2. **Mobile only.** Design and test at 375px width (also 390 and 430). Hosts also use phones. Desktop just must not break.
3. **Never require a guest login.** Guests are identified by a name they type and an anonymous token in `localStorage`.
3b. **Never trust the client for admin.** Passcode checks, role checks and all privileged writes happen in server route handlers. The 5-tap trigger is only a hidden door, not security.
4. **Respect free-tier limits.** Compress images client-side, generate thumbnails, never ship originals to the gallery grid.
5. **Anti-slop checklist** in `docs/03-design.md` must pass before any UI task is considered done.
6. **No secrets in the repo.** Use `.env.local` (git-ignored); keep `.env.example` up to date.
7. **Keep docs in sync.** If you change behaviour, update the relevant doc in the same change.
8. Prefer small, reviewable commits. Do not commit unless the user asks.

## Quick facts

- Language: **TypeScript**
- Framework: **Next.js (App Router)** + **Tailwind CSS**
- Backend: **Supabase** (Postgres, Storage, Realtime). Staff auth is our own signed-cookie session, not Supabase Auth
- Hosting: **Vercel** (free), on a `*.vercel.app` URL for now; custom domain later. Note: `afiqdev.vercel.app` belongs to the user's other project, so this app gets its own Vercel project/URL
- Audience language: **English + Bahasa Melayu** (bilingual UI with a language toggle; copy tone in `docs/03-design.md`)
- Currency/region: Malaysia (MYR, DuitNow, Salam Kaut)

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
