# Digital Guestbook

A shared photo wall and guestbook for our wedding. Guests scan a QR code, upload photos, leave a wish, and browse everyone's moments — no app, no account.

**Status:** local MVP built and working (no accounts needed). Not deployed yet. See [`docs/04-roadmap.md`](docs/04-roadmap.md).

## Run it

```bash
npm install
cp .env.example .env.local   # fill in SUPER_ADMIN_PASSCODE, HOST_PASSCODE, ADMIN_SESSION_SECRET
npm run dev
```

Open it at phone width (browser devtools, ~390 px), or on your phone over the same wifi with `npm run dev -- -H 0.0.0.0`.
Staff access: tap the **A & P monogram 5 times** on the welcome or home screen.

## For AI models / contributors

Start with [`AGENTS.md`](AGENTS.md). It links to everything else:

- [`docs/01-product.md`](docs/01-product.md) — requirements, roles, journeys
- [`docs/02-architecture.md`](docs/02-architecture.md) — stack, schema, limits
- [`docs/03-design.md`](docs/03-design.md) — forest theme, typography, anti-slop checklist
- [`docs/04-roadmap.md`](docs/04-roadmap.md) — phases and progress
- [`docs/05-decisions.md`](docs/05-decisions.md) — decisions and open questions

## Stack

Next.js (TypeScript, App Router) · Tailwind · Supabase (Postgres, Storage, Realtime) · hidden passcode staff access (no accounts) · Vercel
