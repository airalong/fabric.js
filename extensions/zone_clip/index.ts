import { Rect } from 'fabric';
import type { Canvas, FabricObject } from 'fabric';
import type { ClipZoneRect, ZoneClipConfig } from './typedefs';

const ZONE_CLIP_KEY = '__zoneClipPath';

export class ZoneClip {
  canvas: Canvas;
  zones: Record<string, ClipZoneRect>;

  private onObjectAdded: (e: { target: FabricObject }) => void;

  constructor(canvas: Canvas, options: Partial<ZoneClipConfig> = {}) {
    this.canvas = canvas;
    this.zones = options.zones ?? {};

    this.onObjectAdded = this._onObjectAdded.bind(this);

    this.initBehavior();
  }

  initBehavior() {
    this.canvas.on('object:added', this.onObjectAdded);

    // Apply clips to existing objects
    for (const obj of this.canvas.getObjects()) {
      this.applyClip(obj);
    }
  }

  private getZoneForObject(
    target: FabricObject,
  ): { name: string; zone: ClipZoneRect } | undefined {
    const zoneName = (target.data as { zone?: string } | undefined)?.zone;
    if (!zoneName) return undefined;
    const zone = this.zones[zoneName];
    if (!zone) return undefined;
    return { name: zoneName, zone };
  }

  private applyClip(target: FabricObject) {
    const result = this.getZoneForObject(target);
    if (!result || !result.zone.clip) return;

    const { zone } = result;
    const clipRect = new Rect({
      left: zone.left,
      top: zone.top,
      width: zone.width,
      height: zone.height,
      absolutePositioned: true,
    });

    target.clipPath = clipRect;
    (target as any)[ZONE_CLIP_KEY] = true;
  }

  private _onObjectAdded(e: { target: FabricObject }) {
    this.applyClip(e.target);
  }

  updateZone(name: string, rect: ClipZoneRect) {
    this.zones[name] = rect;

    // Re-apply clips to all objects in this zone
    for (const obj of this.canvas.getObjects()) {
      const result = this.getZoneForObject(obj);
      if (result && result.name === name) {
        this.removeClip(obj);
        this.applyClip(obj);
      }
    }

    this.canvas.requestRenderAll();
  }

  removeClip(target: FabricObject) {
    if ((target as any)[ZONE_CLIP_KEY]) {
      target.clipPath = undefined;
      delete (target as any)[ZONE_CLIP_KEY];
    }
  }

  dispose() {
    this.canvas.off('object:added', this.onObjectAdded);

    // Remove all clipPaths we added
    for (const obj of this.canvas.getObjects()) {
      this.removeClip(obj);
    }

    this.canvas.requestRenderAll();
  }
}
