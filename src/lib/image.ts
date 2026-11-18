"use client";

/**
 * Client-side image prep. Free-tier storage is ~1GB, so every photo is shrunk BEFORE upload:
 *  - display: longest edge 2000px, JPEG, ~<=1MB
 *  - thumb:   longest edge 480px,  JPEG, ~<=60KB (what the gallery grid loads)
 * Output is always JPEG (canvas WebP encoding isn't supported on all iPhones). Re-encoding also
 * bakes in EXIF rotation and drops GPS/location metadata.
 */
import imageCompression from "browser-image-compression";
import { isDefaultStyle, renderStyledBlob, type PhotoStyle } from "@/lib/photo-style";

export type PreparedImage = {
  display: Blob;
  thumb: Blob;
  width: number;
  height: number;
};

function dimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable image"));
    };
    img.src = url;
  });
}

export const MAX_INPUT_BYTES = 30 * 1024 * 1024;

export async function prepareImage(file: File, style?: PhotoStyle): Promise<PreparedImage> {
  let display: File = await imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 2000,
    initialQuality: 0.82,
    fileType: "image/jpeg",
    useWebWorker: false, // worker mode fetches code from a public CDN; avoid that dependency on venue wifi
    preserveExif: false,
  });
  if (style && !isDefaultStyle(style)) {
    // Look + frame are baked into the JPEG, so what the guest previewed is what everyone sees.
    const styled = await renderStyledBlob(display, style);
    display = new File([styled], "photo.jpg", { type: "image/jpeg" });
  }
  const thumb = await imageCompression(display, {
    maxSizeMB: 0.06,
    maxWidthOrHeight: 480,
    initialQuality: 0.7,
    fileType: "image/jpeg",
    useWebWorker: false, // worker mode fetches code from a public CDN; avoid that dependency on venue wifi
    preserveExif: false,
  });
  const { width, height } = await dimensions(display);
  return { display, thumb, width, height };
}

export const isImageFile = (f: File) =>
  f.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name);
