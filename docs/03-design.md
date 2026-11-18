# 03 — Design

**Goal:** it should feel like a hand-made keepsake for *this* wedding, not a SaaS template. If it could be any couple's site by swapping names, it's not done.

## Mobile-only

Phones are the only target. Design at **375 px** first, verify at 390 and 430.
- Primary actions sit in the **thumb zone** (bottom third), as a sticky bottom bar where it makes sense. Respect safe areas (`env(safe-area-inset-bottom)`).
- Tap targets ≥ 48 px, spacing ≥ 8 px between them.
- Single column everywhere. No hover-only affordances, no desktop nav bars, no sidebars.
- Welcome screen: the name field should be visible without scrolling on a ~390×664 viewport (the arch scales with `dvh`).
- Use `100dvh`; avoid layouts that break when the mobile browser toolbar collapses.
- Body text ≥ 17 px; inputs ≥ 16 px (prevents iOS zoom-on-focus).
- Works one-handed and when the guest is holding a drink.
- Must still render acceptably if opened on a desktop (centre a max-width ~480 px column), but never design for it.

## Theme: Forest green + burgundy (restrained)

Base is warm paper. **Forest green** is the main brand colour (type, primary buttons). **Burgundy `#800020`** (the user's chosen colour) is the signature accent, used sparingly for the date, small ornaments, wish highlights, the thank-you moment, and destructive confirmations. Together they read as "forest and wine" — rich, not loud. Avoid neon/minty greens and "wellness app" vibes.

### Colour tokens

| Token | Hex | Use |
|---|---|---|
| `paper` | `#F3EEE3` | Page background (warm off-white, never pure white) |
| `paper-deep` | `#E9E2D3` | Cards, dividers |
| `ink` | `#1E2A22` | Body text (green-black, not pure black) |
| `forest` | `#2C4636` | Primary buttons, headings, key surfaces |
| `moss` | `#5F7550` | Secondary accents, icons |
| `sage` | `#A8B79B` | Subtle fills, borders, disabled (not for body text) |
| `wine` | `#800020` | **Accent (user-specified).** Date, ornaments, highlights, errors/delete |

Rules:
- Proportion guide: ~70 % paper, ~20 % forest, ≤ 10 % wine. Wine never covers large areas.
- Max **one** strong green surface per screen.
- Text contrast ≥ WCAG AA. `wine` and `forest` on `paper` pass; do not use `sage` or `moss` for small body text.
- Errors use `wine` **plus** an icon and text (never colour alone).
- Dark mode: **not needed.**
- The disposable-camera date stamp keeps a classic film **orange** only inside the filtered photo; it is not part of the UI palette.

## Typography

- **Display (serif):** *Fraunces* or *Cormorant Garamond* — names, headings, big numerals. Use italic sparingly for flourishes. Must look good in ALL CAPS with letter-spacing (the couple's names are long).
- **Body (sans):** *DM Sans* or *Instrument Sans*. Avoid defaulting to Inter/system for the whole UI.
- **Accent (handwritten):** a single script font (e.g., *Caveat* or *Homemade Apple*) for tiny touches only (e.g., "Terima kasih"), never for paragraphs.
- Base size 17–18 px on mobile. Line-height 1.5. Headings tight.
- Load fonts via `next/font` with `display: swap`.

## Glassmorphism, used with discipline (decision D28)

The base look is **frosted glass over a painted forest backdrop**. Inspiration: Malaysian wedding-gallery apps (soft watercolour scenery, frosted cream cards, floating pill nav). We borrow the *ideas* only; nothing copied from those products or couples.

- **Backdrop:** `public/art/forest-backdrop.jpg` (watercolour ferns/eucalyptus in forest + sage with a few burgundy berries; centre left blank for content). One fixed layer (`.app-backdrop`) washed with 30 % paper. Replace the file to change the look; keep it ≤ ~400 KB. Glass is meaningless without a backdrop, so do not remove it.
- **Glass utilities** (in `globals.css`): `.glass` (cards, ~66 % cream, blur 16 px) and `.glass-strong` (nav bar, header, sheets, ~82 % cream, blur 18 px). Both have an opaque fallback for browsers without `backdrop-filter` and for `prefers-reduced-transparency`.
- **Where glass IS used (level "A"):** bottom nav bar, sticky page header, bottom sheets, welcome card, home hero card + action cards, language toggle, wish compose card, upload picker cards and sticky action bar.
- **Where it is NOT used:** gallery tiles, wish notes, the photo viewer, admin sections. Those stay opaque "paper prints". Reasons: blur over scrolling photos is slow on mid-range Android and in WhatsApp/Instagram in-app browsers, and it hurts legibility for older guests.
- **Rule of thumb:** at most ~5 glass surfaces on screen at once. Never nest glass in glass. Text on glass must still pass AA (the glass alpha is tuned for that; don't lower it).
- **Never** use glass on a flat colour background (that is the generic "AI slop" look). If the backdrop image fails to load, the paper colour shows and glass degrades to cream cards.

## Layout and components

- **Mobile first** at 375 px; thumb-reachable primary action at the bottom.
- **One primary action per screen.** Large tap targets (min 48 px). Old-person-proof.
- **Gallery:** masonry/column layout that respects original aspect ratios; slight gutter variation is OK. Tap → full-screen viewer with swipe and close. Show uploader's name small, in the serif italic.
- **Floating bottom bar** (`BottomNav`): Gallery | big forest `+` (Share a moment; becomes Home when uploads are closed) | Wishes. Shown on Home, Gallery and Wishes. The staff button lifts above it on those pages.
- **Stats strip** on Home: photos / guests / wishes (guests = distinct anonymous tokens that shared something visible).
- **Cards** look like paper prints: subtle warm shadow, slight border, optional tiny rotation (≤ 1.5°) on a few items — don't overdo it.
- **Buttons:** solid `forest` with `paper` text, generous padding, soft radius (10–14 px). No gradient buttons.
- **Icons:** a single consistent line set (e.g., Lucide) at consistent stroke width.
- **Texture:** optional very subtle paper grain via CSS/noise PNG at ≤ 4 % opacity. A hand-drawn botanical motif (fern/leaf line art, SVG) used sparingly as dividers or corners. Draw or source properly; do not scatter emoji leaves.

## Motion

- Small, purposeful: fade/slide-up on page enter (150–250 ms), upload progress, thumbnail fade-in once loaded, heart/"thank you" settle animation.
- Respect `prefers-reduced-motion`.
- Photo viewer: swipe with momentum; close with a downward drag. Keep animations GPU-friendly (transform/opacity) for mid-range Android phones.

## Copy and tone

- Warm, concrete, a bit playful. Written like the couple talks.
- **Bilingual: English + Bahasa Melayu**, with a visible EN | BM toggle on the welcome screen and in the header. Provide full translations for every string (no half-translated screens). Default to the browser language; remember the choice. Keep BM natural and warm (not stiff, not machine-literal). Examples (placeholders — refine with the couple):

| Key | English | Bahasa Melayu |
|---|---|---|
| Welcome line | "Join us in remembering the day." | "Sertai kami mengabadikan hari bahagia ini." |
| Upload CTA | "Share a moment" | "Kongsi satu detik" |
| Wish CTA | "Leave a wish" | "Tinggalkan ucapan" |
| Gallery CTA | "See the gallery" | "Lihat galeri" |
| Success | "Terima kasih! Your photo is in the gallery." | "Terima kasih! Gambar anda sudah ada dalam galeri." |
| Empty gallery | "No photos yet — be the first." | "Belum ada gambar — jadilah yang pertama." |
| Error | "Signal's wobbly. We'll keep trying — keep this page open." | "Talian tak stabil. Kami cuba lagi — jangan tutup halaman ini." |

- Couple names, venue and hall are shown in **ALL CAPS** exactly as provided (see `AGENTS.md`). Long names: check wrapping at 375 px, set with generous letter-spacing and a serif display face; split onto separate lines with a small "&" in `wine` between them.
- Date format: "15 AUGUST 2027" / "15 OGOS 2027".
- Use the **real** names, date, venue everywhere. Do not ship lorem ipsum or "Capture every moment".
- Salam Kaut copy must be tactful and optional, never pushy: "If you'd like to give a little something, here's our DuitNow QR. No pressure at all."

## Anti-slop checklist (must pass)

- [ ] No purple/blue gradient hero, no floating blobs. Glass only over the painted backdrop and only on the surfaces listed above (see D28)
- [ ] No stock phrases ("Capture every moment", "Seamless", "Elevate")
- [ ] No emoji used as icons or decoration
- [ ] Not a uniform grid of identical rounded cards with the same shadow
- [ ] Real couple names/date/venue present on first screen
- [ ] Uses the typography pairing above (not default system/Inter everywhere)
- [ ] Green used with restraint; paper background dominant
- [ ] One clear primary action per screen
- [ ] Empty, loading, and error states are designed (not default spinners/blank)
- [ ] Looks good and is thumb-friendly on 375, 390 and 430 px phones (and does not break on desktop)
- [ ] Both English and Bahasa Melayu are complete; long ALL-CAPS names don't overflow
- [ ] Burgundy `#800020` used only as an accent (≤ 10 %)
- [ ] Text contrast passes AA
- [ ] Works with large system font sizes (accessibility)
- [ ] Reduced-motion respected

## Screens to design (in order)

1. Welcome (couple, date, venue, language toggle, name entry)
2. Home (3 actions)
3. Upload (select → preview → progress → thank you)
4. Gallery + full-screen viewer
5. Wishes (list + compose)
6. Salam Kaut card
7. Staff access sheet + floating admin button + admin panel (phone layout; functional, still on-brand). The floating button must be small, clearly "staff", and never cover the upload/gallery primary actions. Admin mode OFF must look identical to the guest view. The staff sheet uses neutral wording ("Staff access"), nothing cute or that advertises itself to guests
8. Printable QR table card (A5) in forest + wine — nice-to-have, export as PDF/PNG

## Assets still needed from the couple

- Invitation design or any ornament/illustration style to echo (optional; wine `#800020` already provided)
- A portrait **couple photo** for the welcome arch (optional; super admin uploads it at /admin → Welcome photo, no code change)
- DuitNow QR image and recipient name (for Salam Kaut)
- Hashtag, if any
- A **logo/monogram** for the welcome and home screens (it doubles as the hidden 5-tap staff trigger). If none exists, we design a simple monogram from the couple's initials (A & P) in the serif face
