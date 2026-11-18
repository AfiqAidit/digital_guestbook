"use client";

/**
 * Optional "Look" + "Frame" for a photo, drawn on a canvas BEFORE upload.
 * The styled JPEG is what gets uploaded, so what the guest previews is exactly what everyone sees.
 *
 * Looks are per-pixel maths (not ctx.filter) because Safari/iOS doesn't support canvas filters.
 * Frames are drawn with plain canvas paths, so there are no image assets to download.
 */
import { EVENT } from "@/lib/event";

export type LookId = "original" | "warm" | "soft" | "mono" | "forest";
export type FrameId = "none" | "print" | "torn" | "arch";
export type PhotoStyle = { look: LookId; frame: FrameId };

export const DEFAULT_STYLE: PhotoStyle = { look: "original", frame: "none" };
export const LOOKS: LookId[] = ["original", "warm", "soft", "mono", "forest"];
export const FRAMES: FrameId[] = ["none", "print", "torn", "arch"];

export const isDefaultStyle = (s: PhotoStyle) => s.look === "original" && s.frame === "none";

/** Short names as written on frames. (The full ALL CAPS names live on the welcome screen.) */
const NAMES = "Afiq & Putri";
const DATE = `${String(EVENT.day).padStart(2, "0")}.${String(EVENT.month).padStart(2, "0")}.${EVENT.year}`;

const PAPER = "#f6f1e4";
const FOREST = "#2c4636";
const WINE = "#800020";

/* ------------------------------ looks ------------------------------ */

type LookParams = { tint: [number, number, number]; sat: number; contrast: number; bright: number; lift: number };

const LOOK_PARAMS: Record<Exclude<LookId, "original">, LookParams> = {
  warm: { tint: [1.06, 1.0, 0.9], sat: 1.08, contrast: 1.04, bright: 4, lift: 0 },
  soft: { tint: [1.02, 1.0, 0.98], sat: 0.88, contrast: 0.88, bright: 8, lift: 14 },
  mono: { tint: [1, 1, 1], sat: 0, contrast: 1.12, bright: 0, lift: 6 },
  forest: { tint: [0.95, 1.03, 0.9], sat: 0.92, contrast: 0.95, bright: 2, lift: 12 },
};

function applyLook(ctx: CanvasRenderingContext2D, w: number, h: number, look: LookId) {
  if (look === "original") return;
  const { tint, sat, contrast, bright, lift } = LOOK_PARAMS[look];
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const k = (255 - lift) / 255;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] * tint[0];
    let g = d[i + 1] * tint[1];
    let b = d[i + 2] * tint[2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = lum + (r - lum) * sat;
    g = lum + (g - lum) * sat;
    b = lum + (b - lum) * sat;
    r = (r - 128) * contrast + 128 + bright;
    g = (g - 128) * contrast + 128 + bright;
    b = (b - 128) * contrast + 128 + bright;
    d[i] = Math.max(0, Math.min(255, lift + r * k));
    d[i + 1] = Math.max(0, Math.min(255, lift + g * k));
    d[i + 2] = Math.max(0, Math.min(255, lift + b * k));
  }
  ctx.putImageData(img, 0, 0);
}

/* ------------------------------ fonts ------------------------------ */

let fontsReady: Promise<{ script: string; display: string }> | null = null;

/** next/font hides the real family name behind a CSS variable; read it and make sure it's loaded. */
export function ensureFonts() {
  fontsReady ??= (async () => {
    const root = getComputedStyle(document.documentElement);
    const script = root.getPropertyValue("--font-caveat").trim() || "cursive";
    const display = root.getPropertyValue("--font-cormorant").trim() || "Georgia, serif";
    try {
      await Promise.all([
        document.fonts.load(`40px ${script}`, "Moments from Afiq & Putri 0123456789"),
        document.fonts.load(`italic 600 40px ${display}`, "Afiq & Putri 0123456789"),
      ]);
    } catch {
      /* fall back to the fallback fonts in the stacks above */
    }
    return { script, display };
  })();
  return fontsReady;
}

/* ------------------------------ helpers ------------------------------ */

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("unreadable image"));
    img.src = src;
  });
}

/** Tiny seeded random so a torn edge looks hand-made but is identical on every redraw. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function setup(canvas: HTMLCanvasElement, w: number, h: number) {
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("no canvas");
  ctx.imageSmoothingQuality = "high";
  return ctx;
}

/** The photo, scaled to fit `maxEdge` on its longest side (after any frame padding is added). */
function fitSize(w: number, h: number, maxEdge: number, padX: number, padTop: number, padBottom: number) {
  const totalW = w + padX * 2;
  const totalH = h + padTop + padBottom;
  const scale = Math.min(1, maxEdge / Math.max(totalW, totalH));
  return { scale, w: w * scale };
}

/* ------------------------------ render ------------------------------ */

export type Fonts = { script: string; display: string };

/**
 * Draw `img` with the chosen style into `canvas`.
 * `maxEdge` caps the longest side (use ~2000 for the upload, ~720 for the on-screen preview).
 */
export function renderStyled(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  style: PhotoStyle,
  maxEdge: number,
  fonts: Fonts,
) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;

  // Frame geometry is relative to the photo width so it looks the same at any size.
  let padX = 0;
  let padTop = 0;
  let padBottom = 0;
  if (style.frame === "print") {
    padX = iw * 0.05;
    padTop = iw * 0.05;
    padBottom = iw * 0.2;
  } else if (style.frame === "arch") {
    padX = iw * 0.06;
    padTop = iw * 0.06;
    padBottom = iw * 0.2;
  }

  const { scale, w } = fitSize(iw, ih, maxEdge, padX, padTop, padBottom);
  const pw = w; // photo width in canvas px
  const ph = ih * scale;
  const px = padX * scale;
  const pt = padTop * scale;
  const cw = pw + px * 2;
  const ch = ph + pt + padBottom * scale;
  const ctx = setup(canvas, cw, ch);

  if (style.frame === "print" || style.frame === "arch") {
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, cw, ch);
  }

  /* --- the photo (clipped to an arch for the arch frame) --- */
  ctx.save();
  if (style.frame === "arch") archPath(ctx, px, pt, pw, ph);
  ctx.drawImage(img, px, pt, pw, ph);
  ctx.restore();

  // Looks only touch the photo area, never the paper margin.
  if (style.look !== "original") {
    const data = ctx.getImageData(px, pt, pw, ph);
    const tmp = document.createElement("canvas");
    tmp.width = data.width;
    tmp.height = data.height;
    const tctx = tmp.getContext("2d", { willReadFrequently: true })!;
    tctx.putImageData(data, 0, 0);
    applyLook(tctx, tmp.width, tmp.height, style.look);
    ctx.save();
    if (style.frame === "arch") archPath(ctx, px, pt, pw, ph);
    ctx.drawImage(tmp, px, pt);
    ctx.restore();
  }

  /* --- frame details --- */
  if (style.frame === "print" || style.frame === "arch") {
    // hairline inside the photo edge, like a print
    ctx.strokeStyle = "rgba(33,53,40,0.18)";
    ctx.lineWidth = Math.max(1, cw * 0.002);
    if (style.frame === "print") ctx.strokeRect(px, pt, pw, ph);

    const cx = cw / 2;
    const baseY = pt + ph;
    const room = ch - baseY;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = FOREST;
    ctx.font = `600 ${Math.round(room * 0.4)}px ${fonts.script}`;
    ctx.fillText(NAMES, cx, baseY + room * 0.42);
    ctx.fillStyle = WINE;
    ctx.font = `600 ${Math.round(room * 0.17)}px ${fonts.display}`;
    // letter-spaced date
    drawSpaced(ctx, DATE, cx, baseY + room * 0.78, room * 0.035);
  }

  if (style.frame === "torn") drawTornStrip(ctx, cw, ch, fonts);
}

/** Clip to a doorway: straight sides, half-circle top. */
function archPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const r = Math.min(w / 2, h);
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.arc(x + w / 2, y + r, r, Math.PI, 0);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.clip();
}

function drawSpaced(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, spacing: number) {
  const widths = [...text].map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  let x = cx - total / 2;
  ctx.textAlign = "left";
  [...text].forEach((c, i) => {
    ctx.fillText(c, x, y);
    x += widths[i] + spacing;
  });
  ctx.textAlign = "center";
}

/** A torn strip of paper laid over the bottom of the photo, with the couple's names in script. */
function drawTornStrip(ctx: CanvasRenderingContext2D, cw: number, ch: number, fonts: Fonts) {
  const unit = Math.min(cw, ch * 0.9); // sizing basis that behaves on both portrait and landscape
  const stripH = Math.max(unit * 0.26, ch * 0.12);
  const stripW = cw * 0.88;
  const cx = cw / 2;
  const cy = ch - stripH / 2 - unit * 0.05;
  const rand = rng(20270815);
  const step = Math.max(6, stripW / 56);
  const jag = stripH * 0.05;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((-0.9 * Math.PI) / 180);

  const left = -stripW / 2;
  const right = stripW / 2;
  const top = -stripH / 2;
  const bottom = stripH / 2;

  ctx.beginPath();
  ctx.moveTo(left, top + (rand() - 0.5) * jag * 2);
  for (let x = left + step; x < right; x += step) ctx.lineTo(x, top + (rand() - 0.5) * jag * 2);
  ctx.lineTo(right, top + (rand() - 0.5) * jag * 2);
  ctx.lineTo(right + jag * 0.6, 0);
  ctx.lineTo(right, bottom + (rand() - 0.5) * jag * 2);
  for (let x = right - step; x > left; x -= step) ctx.lineTo(x, bottom + (rand() - 0.5) * jag * 2);
  ctx.lineTo(left, bottom + (rand() - 0.5) * jag * 2);
  ctx.lineTo(left - jag * 0.6, 0);
  ctx.closePath();

  ctx.shadowColor = "rgba(20,30,24,0.35)";
  ctx.shadowBlur = unit * 0.025;
  ctx.shadowOffsetY = unit * 0.008;
  ctx.fillStyle = "#f3ecda";
  ctx.fill();
  ctx.shadowColor = "transparent";

  // paper fibres: a few faint flecks
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgba(120,100,70,${0.025 + rand() * 0.04})`;
    ctx.fillRect(left + rand() * stripW, top + rand() * stripH, 1 + rand() * unit * 0.006, 1 + rand() * unit * 0.003);
  }
  ctx.restore();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#5a4a3a";
  ctx.font = `600 ${Math.round(stripH * 0.26)}px ${fonts.script}`;
  ctx.fillText("Moments from", 0, -stripH * 0.22);
  ctx.fillStyle = FOREST;
  ctx.font = `700 ${Math.round(stripH * 0.4)}px ${fonts.script}`;
  ctx.fillText(NAMES, 0, stripH * 0.14);
  ctx.restore();
}

/** Final upload version: a JPEG blob of the styled photo. */
export async function renderStyledBlob(source: Blob, style: PhotoStyle, maxEdge = 2000): Promise<Blob> {
  const fonts = await ensureFonts();
  const url = URL.createObjectURL(source);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    renderStyled(canvas, img, style, maxEdge, fonts);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.86));
    if (!blob) throw new Error("could not encode");
    // free the big canvas right away (iOS Safari keeps canvas memory alive otherwise)
    canvas.width = canvas.height = 1;
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}
