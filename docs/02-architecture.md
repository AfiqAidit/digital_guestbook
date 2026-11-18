# 02 — Architecture

## Stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript | Safer for multiple contributors/models |
| Framework | Next.js (App Router) | SSR for fast first paint on weak wifi, route handlers for secure server logic |
| Styling | Tailwind CSS | Fast; tokens defined in `docs/03-design.md` |
| DB | Supabase Postgres | Free tier, RLS, Realtime |
| File storage | Supabase Storage (public bucket for approved images) | Same project, simple |
| Staff auth | Own passcode check + signed httpOnly cookie (`jose` JWT) — **no Supabase Auth, no accounts** | Guests never log in; staff use a hidden 5-tap popup. See "Staff access" below |
| Realtime | Supabase Realtime on `photos` and `wishes` | Live-updating gallery on phones |
| i18n | Simple dictionary (`en`, `ms`) via `next-intl` or a tiny custom helper | English + Bahasa Melayu toggle; English by default, the guest's choice remembered in a cookie |
| Hosting | Vercel (Hobby, free) | Zero-config Next.js |
| Image processing | Client-side: `browser-image-compression`, `heic2any` (or `heic-to`) | Keeps server free and storage small |
| QR generation | `qrcode` npm package | For the printable table card (and an in-app "share this site" QR) |
| ZIP export | Server route streaming with `archiver` (or client-side `fflate`) | Couple's download |

## Free-tier limits (verified Nov 2026 — recheck before launch)

Source: https://supabase.com/pricing

- File storage: **1 GB**
- Egress: **5 GB / month**
- Database: **500 MB**
- Max upload file: **50 MB**
- Realtime: 200 peak connections, 2M messages
- **Projects pause after 1 week of inactivity**
- Image Transformations: **not available on Free** → we generate thumbnails ourselves

### Storage budget

- ~150 active uploaders × ~6 photos ≈ 900 photos
- Display image ~700 KB + thumb ~40 KB ≈ 740 KB each → **~670 MB**. Fits, with limited headroom.
- Therefore: **per-guest caps are mandatory**, display image max **2000 px long edge, JPEG/WebP q≈0.8**.
- Egress: gallery grid loads thumbnails only (~40 KB). Full image loads only in the viewer; cache aggressively (`Cache-Control: public, max-age=31536000, immutable` on UUID filenames). With ~250 guests browsing, thumbnails keep us well under 5 GB.

### Escape hatch

If we exceed 1 GB or want video: move image blobs to **Cloudflare R2** (≈10 GB free, no egress fees — verify current terms). Keep DB in Supabase. Isolate storage behind `lib/storage.ts` so the swap is a one-file change.

### Keep-alive

Free Supabase projects pause after a week idle. Prevent it with a scheduled ping:

- Add a `vercel.json` cron entry that calls `GET /api/health` **once a day** (Vercel Hobby crons are limited to daily, which is plenty — verify current limits when implementing).
- `/api/health` checks `Authorization: Bearer $CRON_SECRET`, runs a trivial query (`select 1` / read the `settings` row) and returns `{ ok: true }`.
- Fallback if Vercel Cron is unavailable: a GitHub Actions scheduled workflow doing the same `curl`.
- **Requires setup first:** a Supabase project and a deployed Vercel project must exist (see `docs/04-roadmap.md` → "Accounts to set up"). Turn it on at deploy time and leave it running until after the wedding exports are done.

## Current implementation vs target

- **Built:** everything below except Supabase. Data goes through `src/lib/server/store.ts`, which today is a **local JSON + files store in `.data/`** (git-ignored, dev only; Vercel's filesystem is read-only/ephemeral, so **this driver cannot be deployed**). Production needs the Supabase implementation of the same functions.
- `layout.tsx` fetches public settings on the server and passes them to `SettingsProvider` as initial state (no flash on first paint). Public settings now include `heroSrc` and `counts.guests` (distinct anonymous guest tokens with at least one visible photo or wish).
- `POST/DELETE /api/admin/hero-photo` (super admin): the browser shrinks the photo to ~1100 px first; the server sniffs magic bytes (JPEG/PNG/WebP), caps at 4 MB, stores `hero-<timestamp>.<ext>` served via `/api/files/`.
- Photo **Look + Frame** is applied client-side on a canvas (`lib/photo-style.ts`) *before* upload, so the server only ever receives a normal JPEG.
- Realtime is **polling** (gallery every 10 s, settings every 20 s) rather than Supabase Realtime.
- In-memory rate limiting (`lib/server/rate-limit.ts`): per-instance, a speed bump rather than a vault.

## Directory layout (target)

```
/
  AGENTS.md
  docs/
  src/
    app/
      page.tsx                 # welcome + name (no passcode)
      home/page.tsx            # 3 actions
      upload/page.tsx
      gallery/page.tsx
      wishes/page.tsx
      admin/                   # never linked; also reachable via the floating admin button
        page.tsx               # panel: counts, admin-mode switch, uploads ON/OFF (super admin)
        photos/page.tsx
        wishes/page.tsx
        export/page.tsx
        settings/page.tsx      # super admin: moderation, limits, Salam Kaut
      api/
        admin/login/route.ts   # verifies passcode, rate-limits, sets session cookie, writes audit log
        admin/logout/route.ts
        admin/*/route.ts       # every privileged action; each calls requireRole() first
        photos/route.ts        # GET list, POST multipart upload (validates + stores)
        settings/route.ts      # public settings (uploads open?, Salam Kaut, counts)
        files/[name]/route.ts  # serves stored images (local driver only)
        wishes/route.ts
        health/route.ts
        export/zip/route.ts
    components/
    lib/
      supabase/ (browser.ts, server.ts, admin.ts)
      storage.ts               # abstraction over Supabase Storage / R2
      image.ts                 # compress, thumbnail, HEIC, EXIF orientation
      guest.ts                 # token + name in localStorage
      admin-session.ts         # sign/verify cookie, requireRole('host' | 'super_admin')
      settings.ts
  supabase/
    migrations/
  .env.example
```

## Data model

Single wedding. No `event_id`.

```sql
-- settings: exactly one row (id = 1)
create table settings (
  id int primary key default 1 check (id = 1),
  couple_names text not null,                -- seed: 'MUHAMMAD AFIQ AIDIT BIN MOHD ARIFF' / 'PUTRI SOEFIA BINTI ABD AZIS' (store as two fields if easier)
  wedding_date date,                         -- seed: 2027-08-15
  venue text,                                -- seed: 'TAMARIND SQUARE'
  hall text,                                 -- seed: 'THE GLASS GALORE EVENT SPACE'
  uploads_open boolean not null default true,   -- the manual ON/OFF switch (super admin button) — primary control
  uploads_close_at timestamptz,                 -- optional auto-close; null = stay open until manually switched off
  moderation_mode text not null default 'instant' check (moderation_mode in ('instant','review')),
  max_library_per_guest int not null default 20,
  max_camera_per_guest int not null default 20,
  salam_kaut_enabled boolean not null default false,
  salam_kaut_recipient text,                 -- seed: 'PUTRI SOEFIA BINTI ABD AZIS'
  salam_kaut_note text,
  salam_kaut_qr_path text,                   -- null until the user supplies the QR image
  hero_photo_path text                       -- couple's welcome photo (super admin uploads; null = monogram arch)
);

-- audit trail for staff logins/actions (no user accounts exist)
create table admin_log (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('host','super_admin')),
  remark text,                               -- the "remark" typed in the staff popup
  action text not null,                      -- 'login', 'uploads_off', 'hide_photo', ...
  ip_hash text,                              -- hashed, never raw IP
  created_at timestamptz not null default now()
);

create table photos (
  id uuid primary key default gen_random_uuid(),
  guest_token uuid not null,
  guest_name text not null,
  caption text,
  storage_path text not null,                -- display image
  thumb_path text not null,
  width int not null,
  height int not null,
  source text not null check (source in ('library','camera')),
  status text not null default 'approved' check (status in ('pending','approved','hidden')),
  created_at timestamptz not null default now()
);
create index on photos (status, created_at desc);
create index on photos (guest_token);

create table wishes (
  id uuid primary key default gen_random_uuid(),
  guest_token uuid not null,
  guest_name text not null,
  message text not null check (char_length(message) <= 500),
  status text not null default 'approved' check (status in ('pending','approved','hidden')),
  created_at timestamptz not null default now()
);
```

Default `status` is set by the server according to `settings.moderation_mode` (`instant` → `approved`, `review` → `pending`). Hosts can set `hidden`.

## Upload flow (secure)

Guests are anonymous, so direct client writes to Storage/DB are **not** allowed. All writes go through server route handlers using the service role key.

**As built (simplified from the original signed-URL plan):** because the client compresses first, each photo is only ~1 MB, well under Vercel's 4.5 MB request-body limit, so the browser sends **one multipart `POST /api/photos` per photo** and the server does everything. No signed URLs, no extra round trip.

1. Client compresses the image to a ~1 MB / 2000 px JPEG and makes a ~480 px thumbnail (`lib/image.ts`; EXIF rotation baked in, GPS stripped; JPEG output because iPhones can't encode WebP in canvas; web-worker mode is **off** because it pulls code from a public CDN).
2. Client `POST /api/photos` (multipart: `guestToken`, `guestName`, `caption`, `source`, `width`, `height`, `display`, `thumb`) via `XMLHttpRequest` so it can show real upload progress. Up to 2 photos in flight; automatic retry with backoff (1.5 s, 4 s, 9 s) on network errors / 5xx / 429 slow-down.
3. Server validates: uploads open (manual switch + optional close time), IP rate limit, UUID guest token, name/caption length, dimensions, file size caps (display ≤ 3 MB, thumb ≤ 300 KB), **JPEG magic bytes** (not just the declared MIME), and per-guest cap per source. Status = `approved` (instant) or `pending` (review).
4. Server stores the files + row via `lib/server/store.ts`.
5. Other open galleries pick it up on their next 10 s refresh. (Supabase Realtime can replace the polling later; polling is fine at this scale.)

When moving to Supabase: re-implement `store.ts` only (Postgres rows + Storage objects). The route handlers and the client don't change.

## Auth and RLS

- RLS enabled on all tables.
- **Public (anon) read** of `photos` and `wishes` where `status = 'approved'`, and of `settings` via a **view** exposing only public columns (no admin-only fields).
- **No anon writes.** Writes only via server routes (service role).
- Because there are no Supabase Auth users, **all privileged reads/writes (hidden items, hide/delete, settings, export, audit log) go through `/api/admin/*` routes** that verify the session cookie, then use the service-role client. The service-role key never reaches the browser.
- `host` can: read all photos/wishes, set `status`, delete, export. `super_admin` can additionally: update `settings`, toggle uploads, upload the Salam Kaut QR, wipe data.
- Storage: public-read bucket `gallery` (UUID filenames are unguessable). Salam Kaut QR in a separate bucket. Writes only via server.
- **No guest passcode**: anyone with the link can view and upload. Mitigations are listed under "Abuse and safety".

## Staff access (hidden 5-tap + passcode)

**Do we need a DB account to validate? No.** A server-checked passcode is enough for one wedding. The popup does not need email/password.

Flow:
1. Client: 5 taps on the logo within ~3 s opens the "Staff access" sheet (one field: passcode; the optional `remark` column stays in the schema but the UI no longer sends one).
2. Client `POST /api/admin/login { passcode }`.
3. Server (never client):
   - Rate limit: max **5 failed attempts / 15 min per IP**, plus a global slow-down after 20 failures. Responds with the same neutral error for wrong passcode vs locked out vs unknown.
   - Compare against `HOST_PASSCODE` / `SUPER_ADMIN_PASSCODE` from env vars using a **constant-time** comparison (`crypto.timingSafeEqual` on hashes). Check super admin first.
   - On match: issue a JWT `{ role, remark, iat, exp: 12h }` signed with `ADMIN_SESSION_SECRET`, set as cookie: `httpOnly; Secure; SameSite=Lax; Path=/`. Insert an `admin_log` row.
4. Every `/api/admin/*` route calls `requireRole('host')` or `requireRole('super_admin')`, which verifies the cookie signature, expiry and role.
5. Client shows the floating admin button when `GET /api/admin/me` says the cookie is valid. The "Admin mode ON/OFF" switch is only UI state (show/hide controls); it grants nothing.

Security notes (be honest with the user):
- The 5-tap is **obscurity, not security**. Real protection = long passcode + rate limit + server verification + short sessions.
- **Use a passphrase of ≥ 10 characters**, not a 4–6 digit PIN (easy to brute-force). Two different passcodes: one for hosts, one for super admin.
- Passcodes live only in Vercel env vars / `.env.local`. Never in the repo or client bundle. Never log them.
- Revoke access by changing the env var and `ADMIN_SESSION_SECRET` (logs everyone out) and redeploying.
- Trade-off vs email/password accounts: no per-person revoke and no "forgot password", but far less setup and nothing to forget on the wedding day. Fine for this scale; can be upgraded later.

## Abuse and safety

- No guest passcode (user's choice), so lean on: hybrid moderation, hide/delete, per-guest caps, the optional auto-close time, and the super-admin **Uploads ON/OFF** switch. Don't link the site publicly; keep it `noindex` (`robots` meta + `X-Robots-Tag`) so it isn't search-indexed.
- Rate limiting per IP + guest token (in-memory per instance is fine at this scale; or Upstash free).
- Server-side validation of MIME type, size, and dimensions.
- Strip EXIF location data client-side (compression does this; verify). Orientation must be baked in before stripping.
- Hide/delete in the admin UI; super-admin "Uploads ON/OFF" kill-switch.
- Staff login attempts are rate-limited and written to `admin_log` (hashed IP only).

## Environment variables (`.env.example`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server only, never exposed
HOST_PASSCODE=                    # staff passphrase for hosts (>= 10 chars)
SUPER_ADMIN_PASSCODE=             # different, stronger passphrase for the super admin
ADMIN_SESSION_SECRET=             # random 32+ chars; signs the staff cookie
CRON_SECRET=                      # Vercel Cron sends this as a Bearer token to /api/health
NEXT_PUBLIC_SITE_URL=             # e.g. https://<project>.vercel.app for now
```

## Performance targets

- Welcome screen interactive < 2 s on 4G.
- Gallery uses thumbnails with explicit width/height (no layout shift), `loading="lazy"`, blur-up placeholders optional.
- Compress before upload so the venue wifi isn't the bottleneck; upload sequentially-concurrent (2–3 at a time) with retry.
- Allow uploads **after** the event for guests with weak venue signal.

## Testing notes

- **Phones only.** Use device emulation at 375/390/430 px, and test on a real iPhone (Safari, HEIC, in-app browsers like WhatsApp/Instagram) and a mid-range Android (Chrome).
- Respect safe areas (`env(safe-area-inset-*)`), use `100dvh` not `100vh`, set `viewport-fit=cover`, and avoid hover-only interactions.
- Test throttled network ("Slow 3G") for uploads and resumption.
- Test with 100+ photos in the gallery for scroll performance.
