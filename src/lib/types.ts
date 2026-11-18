export type Status = "pending" | "approved" | "hidden";
export type ModerationMode = "instant" | "review";
export type PhotoSource = "library" | "camera";
export type Role = "host" | "super_admin";

export type Photo = {
  id: string;
  guestName: string;
  caption: string;
  width: number;
  height: number;
  source: PhotoSource;
  status: Status;
  createdAt: string;
  src: string;
  thumb: string;
};

export type Wish = {
  id: string;
  guestName: string;
  message: string;
  status: Status;
  createdAt: string;
};

export type SalamKaut = {
  enabled: boolean;
  recipient: string;
  note: string;
  /** null until the couple supplies the DuitNow QR image */
  qrSrc: string | null;
};

export type PublicSettings = {
  uploadsOpen: boolean;
  moderationMode: ModerationMode;
  salamKaut: SalamKaut;
  /** The couple's welcome photo, or null until a super admin uploads one */
  heroSrc: string | null;
  counts: { photos: number; wishes: number; guests: number };
};

export type AdminSettings = PublicSettings & {
  uploadsCloseAt: string | null;
  maxLibraryPerGuest: number;
  maxCameraPerGuest: number;
  counts: {
    photos: number;
    wishes: number;
    guests: number;
    hiddenPhotos: number;
    pendingPhotos: number;
    hiddenWishes: number;
    pendingWishes: number;
  };
};

export type StaffSession = { role: Role; remark: string };
