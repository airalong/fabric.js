export type ClipZoneRect = {
  left: number;
  top: number;
  width: number;
  height: number;
  /** Whether to apply visual clipping for this zone (default: true) */
  clip: boolean;
};

export type ZoneClipConfig = {
  zones: Record<string, ClipZoneRect>;
};
