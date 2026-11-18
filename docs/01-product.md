# 01 — Product

## Goal

Every guest at the wedding can scan one QR code, upload photos and a short wish in under a minute, and see everyone else's photos in a shared gallery. After the wedding the couple can download everything.

## The event

| | |
|---|---|
| Couple | MUHAMMAD AFIQ AIDIT BIN MOHD ARIFF & PUTRI SOEFIA BINTI ABD AZIS |
| Date | 15 August 2027 |
| Venue | TAMARIND SQUARE |
| Hall | THE GLASS GALORE EVENT SPACE |
| Names displayed | ALL CAPS |
| Languages | English + Bahasa Melayu (toggle) |
| Devices | **Phones only** (guests and hosts). No TV/projector. |
| Access | No passcode. Open to anyone with the link/QR. |

## Market context (researched Nov 2026)

Malaysian paid competitors already exist; we're building our own free, personalised version. Useful reference points:

| Service | Price | Notable features |
|---|---|---|
| Kenangan (kenanganmajlis.com) | RM35 | **Salam Kaut** with bank QR, guest passcode, IG story frames, e-invite + RSVP (extra) |
| Kenang (kenang.my) | RM99 | **Disposable-camera mode** (20 shots/guest, date stamp), voice notes, written wishes, DuitNow, moderation |
| Indahnya (indahnya.my) | RM59 | Table finder, wishes, live venue screen, print-ready table cards |
| momenspace (momenspace.my) | RM0–99 | Live wall for TV, moderation before publish, original-quality export |
| Gathrly (gathrly.my) | Free for 100 photos | Guestbook, live wall, stats, ZIP export |

Industry best practice (from wedding-photo-sharing guides):
- No app, no account, browser only.
- The upload page must identify the couple immediately so guests trust the QR.
- Clear success confirmation after upload.
- A trusted moderator (not the couple during the reception).
- Optional PIN printed next to the QR.
- Close uploads after an agreed period; keep a backup export.

## Roles

| Role | Auth | Can do |
|---|---|---|
| **Guest** | None. Name typed once + anonymous token in `localStorage` | View gallery, upload photos, write a wish, view own uploads |
| **Host** | **Hidden 5-tap on the logo → staff popup → host passcode.** No account. For the couple and any trusted helper (sibling, friend) | Everything a guest can, plus: hide/unhide/delete photos and wishes, download ZIP |
| **Super admin** | Same hidden popup, using the **super-admin passcode** | Everything a host can, plus: **uploads ON/OFF button**, moderation mode, per-guest limits, optional auto-close time, Salam Kaut QR/settings, wipe data |

Notes:
- "Bride" is not a separate role. The couple are hosts. See `docs/05-decisions.md`.
- Super admin is a higher passcode on the same system, **not** a separate app.
- No email/password accounts. See "Staff access" in `docs/02-architecture.md`.

### Staff access UX

1. The logo/monogram on the welcome and home screens is the hidden door. **5 taps within ~3 seconds** opens a bottom-sheet popup titled neutrally (e.g. "Staff access") — no hint on the guest UI that it exists.
2. Popup fields: **Passcode** and **Remark** (free text: who you are / why, e.g. "Kak Ana – moderator"). The remark is saved in an audit log. *(Assumption: "remarks" meant this. Confirm with the user.)*
3. Wrong passcode: neutral error, lockout after 5 tries (see architecture).
4. Success: the popup closes and a small **floating admin button** appears (host and super admin both).
5. **Admin mode toggle:** tapping the floating button opens the admin panel, which includes an **Admin mode ON/OFF** switch. ON shows Hide/Delete controls on photos and wishes. OFF shows the app exactly as guests see it (useful for checking). Persisted for the session.
6. Super admin additionally sees the **Uploads: ON / OFF** big switch, moderation mode, limits and Salam Kaut settings. Host sees only what their role allows.
7. Logout button in the panel; sessions expire automatically (12 h).

## Moderation mode

**Hybrid** (chosen): photos and wishes publish instantly. Hosts can hide or delete afterwards. A setting `moderation_mode` (`instant` | `review`) lets a super admin flip to review-first if needed (e.g., if abuse appears).

## Guest journey

1. Scans the table QR → opens `https://<domain>/`.
2. **Welcome screen**: couple's names (ALL CAPS), date, venue, a one-line invite ("Share a moment with us" / "Kongsi detik bersama kami"). Language toggle EN / BM. No passcode.
3. Enters **their name** (one field). Stored in `localStorage`.
4. **Home** with 3 actions: *Share photos*, *Leave a wish*, *See the gallery*.
5. **Share photos**: choose from camera roll (multi-select) or take photo. Preview thumbnails, optional caption, Upload.
6. Per-file progress, retry on failure, then a clear **"Thank you!"** confirmation with a link to the gallery.
7. **Gallery**: masonry grid, newest first, infinite scroll. Tap to open full-screen viewer with swipe.
8. **Wishes** page: list of written wishes; form to add one.
9. **Salam Kaut** (if enabled): a gentle, optional card showing the DuitNow QR and recipient name **PUTRI SOEFIA BINTI ABD AZIS**. *Status: section is built first with a placeholder; the user will supply the QR image later and upload it via the super-admin panel. The card stays hidden to guests until a QR exists and it is enabled.*

## Host journey

1. Hidden 5-tap on the logo → passcode + remark → floating admin button (see "Staff access UX"). `/admin` also works if opened directly (shows the same popup when not logged in), but is never linked.
2. **Admin panel** (phone layout, bottom sheet / full-screen page): counts (photos, wishes, guests), **Admin mode ON/OFF**, and (super admin) **Uploads ON/OFF** + moderation mode.
3. **Photos**: grid with Hide / Delete / Restore, filter by status.
4. **Wishes**: list with Hide / Delete.
5. **Export**: "Download all photos (ZIP)", "Download wishes (CSV)".
6. **Salam Kaut** (super admin): upload DuitNow QR image, edit recipient name and optional note, enable/disable the card.

## Live wall — REMOVED

Originally planned for a venue TV/projector. The user confirmed there is no screen (phones only), so **it is out of scope**. The gallery itself updates in realtime on guests' phones instead. Revisit only if the user says a screen becomes available.

## Disposable-camera mode (phase 2)

- In-browser camera (`getUserMedia`), **20 shots per guest** (server-enforced via guest token).
- Film filter + orange date stamp applied on canvas. **Keep the unfiltered original too** if storage allows; otherwise store filtered only and document it.
- Counter UI: "12 shots left".
- Normal library upload remains available (separate limit).

## Limits and guardrails

- Per-guest cap: **20 camera shots + 20 library uploads** (tunable in settings).
- Max file size before compression: 25 MB. After compression target: ~0.6–1 MB.
- Image types: JPEG, PNG, HEIC/HEIF (converted client-side), WebP. **Photos only for MVP. No video.**
- Wishes: max 500 characters.
- Upload window: configurable open/close time; host can close manually.
- Profanity/abuse: hybrid moderation + host hide; rate limit per token and IP. Since there is **no passcode**, these are the main defences, plus the upload close time and the "uploads open" kill-switch.

## Out of scope (for now)

- Live wall / TV slideshow (no screen at the venue)
- Passcode gate (user opted out)
- Desktop-optimised layouts
- Video uploads (free-tier storage cost; revisit if R2 is adopted)
- Voice notes
- RSVP / table finder / e-invites
- Multiple events or multi-tenant
- Payments (Salam Kaut is **display only** — we never process money)
- User accounts for guests
- Native apps

## Success criteria

- A 70-year-old on a phone can scan, upload a photo, and see it in the gallery without help.
- Every screen is comfortable one-handed on a 375 px phone.
- 150 guests uploading around the same time causes no failures on venue wifi (resumable/retry uploads; allowed after the event).
- Couple can download every photo and wish after the wedding.
- The site is free to run and does not pause or hit limits on the wedding day.
