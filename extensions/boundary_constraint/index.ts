import type {
  BasicTransformEvent,
  Canvas,
  FabricObject,
  TPointerEvent,
} from 'fabric';
import type { BoundaryConstraintConfig, ZoneRect } from './typedefs';
import { ensureDataSerialization } from '../zone_util/ensureDataSerialization';

type TransformEvent = BasicTransformEvent<TPointerEvent> & {
  target: FabricObject;
};

export class BoundaryConstraint {
  canvas: Canvas;
  zones: Record<string, ZoneRect>;
  constrainScaling: boolean;

  constructor(canvas: Canvas, options: Partial<BoundaryConstraintConfig> = {}) {
    ensureDataSerialization();
    this.canvas = canvas;
    this.zones = options.zones ?? {};
    this.constrainScaling = options.constrainScaling ?? true;

    this.onMoving = this.onMoving.bind(this);
    this.onScaling = this.onScaling.bind(this);

    this.initBehavior();
  }

  initBehavior() {
    this.canvas.on('object:moving', this.onMoving);
    if (this.constrainScaling) {
      this.canvas.on('object:scaling', this.onScaling);
    }
  }

  getZoneForObject(target: FabricObject): ZoneRect | undefined {
    const zoneName = (target.data as { zone?: string } | undefined)?.zone;
    if (!zoneName) return undefined;
    return this.zones[zoneName];
  }

  onMoving(e: TransformEvent) {
    const target = e.target;
    const zone = this.getZoneForObject(target);
    if (!zone) return;

    target.setCoords();
    const bound = target.getBoundingRect();

    let left = target.left;
    let top = target.top;

    // Clamp horizontal
    if (bound.left < zone.left) {
      left += zone.left - bound.left;
    } else if (bound.left + bound.width > zone.left + zone.width) {
      left += zone.left + zone.width - (bound.left + bound.width);
    }

    // Clamp vertical
    if (bound.top < zone.top) {
      top += zone.top - bound.top;
    } else if (bound.top + bound.height > zone.top + zone.height) {
      top += zone.top + zone.height - (bound.top + bound.height);
    }

    target.set({ left, top });
    target.setCoords();
  }

  onScaling(e: TransformEvent) {
    const target = e.target;
    const zone = this.getZoneForObject(target);
    if (!zone) return;

    target.setCoords();
    const bound = target.getBoundingRect();

    // Find the most restrictive ratio to fit within zone
    let ratio = 1;
    if (bound.width > zone.width) {
      ratio = Math.min(ratio, zone.width / bound.width);
    }
    if (bound.height > zone.height) {
      ratio = Math.min(ratio, zone.height / bound.height);
    }

    if (ratio < 1) {
      target.scaleX = (target.scaleX ?? 1) * ratio;
      target.scaleY = (target.scaleY ?? 1) * ratio;
      target.setCoords();
    }

    // After clamping scale, fix position
    this.onMoving(e);
  }

  updateZone(name: string, rect: ZoneRect) {
    this.zones[name] = rect;
  }

  dispose() {
    this.canvas.off('object:moving', this.onMoving);
    if (this.constrainScaling) {
      this.canvas.off('object:scaling', this.onScaling);
    }
  }
}
