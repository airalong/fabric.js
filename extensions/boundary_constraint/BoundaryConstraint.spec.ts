import { describe, test, expect, beforeEach, vi } from 'vitest';
import { Observable } from 'fabric';
import type { Canvas, FabricObject } from 'fabric';
import { BoundaryConstraint } from './index';
import type { ZoneRect } from './typedefs';

/**
 * Create a minimal mock canvas that supports on/off/fire for events.
 * We extend Observable to get the event system without needing a real DOM canvas.
 */
class MockCanvas extends Observable<any> {}

function createMockCanvas(): Canvas {
  return new MockCanvas() as unknown as Canvas;
}

/**
 * Create a Rect with a known bounding rect by stubbing getBoundingRect.
 * This avoids needing a real canvas context for coordinate calculations.
 */
function createRect(options: {
  left: number;
  top: number;
  width: number;
  height: number;
  data?: Record<string, unknown>;
  scaleX?: number;
  scaleY?: number;
}): FabricObject {
  const { left, top, width, height, data, scaleX = 1, scaleY = 1 } = options;
  const rect = {
    left,
    top,
    width,
    height,
    scaleX,
    scaleY,
    data,
    setCoords: vi.fn(),
    set(props: Record<string, unknown>) {
      Object.assign(this, props);
    },
    getBoundingRect() {
      return {
        left: this.left,
        top: this.top,
        width: this.width * this.scaleX,
        height: this.height * this.scaleY,
      };
    },
  };
  return rect as unknown as FabricObject;
}

function fireMoving(canvas: Canvas, target: FabricObject) {
  (canvas as unknown as MockCanvas).fire('object:moving', {
    target,
    transform: {} as any,
    e: {} as any,
    pointer: {} as any,
    scenePoint: {} as any,
    viewportPoint: {} as any,
  });
}

function fireScaling(canvas: Canvas, target: FabricObject) {
  (canvas as unknown as MockCanvas).fire('object:scaling', {
    target,
    transform: {} as any,
    e: {} as any,
    pointer: {} as any,
    scenePoint: {} as any,
    viewportPoint: {} as any,
  });
}

describe('BoundaryConstraint', () => {
  let canvas: Canvas;
  const zone: ZoneRect = { left: 100, top: 100, width: 400, height: 300 };

  beforeEach(() => {
    canvas = createMockCanvas();
  });

  describe('Movement constraint', () => {
    test('clamps object moving past left edge of zone', () => {
      const bc = new BoundaryConstraint(canvas, { zones: { main: zone } });
      const rect = createRect({
        left: 50,
        top: 200,
        width: 50,
        height: 50,
        data: { zone: 'main' },
      });

      fireMoving(canvas, rect);

      expect(rect.left).toBe(100);
      bc.dispose();
    });

    test('clamps object moving past right edge of zone', () => {
      const bc = new BoundaryConstraint(canvas, { zones: { main: zone } });
      const rect = createRect({
        left: 600,
        top: 200,
        width: 50,
        height: 50,
        data: { zone: 'main' },
      });

      fireMoving(canvas, rect);

      // zone right edge = 100 + 400 = 500, rect width = 50
      // so rect.left should be clamped to 450
      expect(rect.left).toBe(450);
      bc.dispose();
    });

    test('clamps object moving past top edge of zone', () => {
      const bc = new BoundaryConstraint(canvas, { zones: { main: zone } });
      const rect = createRect({
        left: 200,
        top: 10,
        width: 50,
        height: 50,
        data: { zone: 'main' },
      });

      fireMoving(canvas, rect);

      expect(rect.top).toBe(100);
      bc.dispose();
    });

    test('clamps object moving past bottom edge of zone', () => {
      const bc = new BoundaryConstraint(canvas, { zones: { main: zone } });
      const rect = createRect({
        left: 200,
        top: 500,
        width: 50,
        height: 50,
        data: { zone: 'main' },
      });

      fireMoving(canvas, rect);

      // zone bottom edge = 100 + 300 = 400, rect height = 50
      // so rect.top should be clamped to 350
      expect(rect.top).toBe(350);
      bc.dispose();
    });

    test('does not constrain objects without a data.zone', () => {
      const bc = new BoundaryConstraint(canvas, { zones: { main: zone } });
      const rect = createRect({
        left: 50,
        top: 50,
        width: 50,
        height: 50,
      });

      fireMoving(canvas, rect);

      expect(rect.left).toBe(50);
      expect(rect.top).toBe(50);
      bc.dispose();
    });

    test('does not constrain objects with unknown zone name', () => {
      const bc = new BoundaryConstraint(canvas, { zones: { main: zone } });
      const rect = createRect({
        left: 50,
        top: 50,
        width: 50,
        height: 50,
        data: { zone: 'nonexistent' },
      });

      fireMoving(canvas, rect);

      expect(rect.left).toBe(50);
      expect(rect.top).toBe(50);
      bc.dispose();
    });

    test('allows movement within zone bounds', () => {
      const bc = new BoundaryConstraint(canvas, { zones: { main: zone } });
      const rect = createRect({
        left: 200,
        top: 200,
        width: 50,
        height: 50,
        data: { zone: 'main' },
      });

      fireMoving(canvas, rect);

      expect(rect.left).toBe(200);
      expect(rect.top).toBe(200);
      bc.dispose();
    });

    test('supports multiple zones independently', () => {
      const zoneA: ZoneRect = { left: 0, top: 0, width: 200, height: 200 };
      const zoneB: ZoneRect = { left: 300, top: 300, width: 200, height: 200 };
      const bc = new BoundaryConstraint(canvas, {
        zones: { a: zoneA, b: zoneB },
      });

      const rectA = createRect({
        left: -50,
        top: 50,
        width: 30,
        height: 30,
        data: { zone: 'a' },
      });
      const rectB = createRect({
        left: 600,
        top: 350,
        width: 30,
        height: 30,
        data: { zone: 'b' },
      });

      fireMoving(canvas, rectA);
      fireMoving(canvas, rectB);

      // rectA clamped to zoneA left edge
      expect(rectA.left).toBe(0);

      // rectB clamped to zoneB right edge: 300 + 200 - 30 = 470
      expect(rectB.left).toBe(470);

      bc.dispose();
    });
  });

  describe('updateZone', () => {
    test('updates zone rect and constraint uses new bounds', () => {
      const bc = new BoundaryConstraint(canvas, { zones: { main: zone } });
      const rect = createRect({
        left: 50,
        top: 200,
        width: 50,
        height: 50,
        data: { zone: 'main' },
      });

      // Before update, object at left=50 gets clamped to 100
      fireMoving(canvas, rect);
      expect(rect.left).toBe(100);

      // Update zone to start at left=0
      bc.updateZone('main', { left: 0, top: 0, width: 500, height: 500 });

      // Now set object at left=50, which should be within bounds
      rect.left = 50;
      rect.top = 200;
      fireMoving(canvas, rect);
      expect(rect.left).toBe(50);

      bc.dispose();
    });
  });

  describe('dispose', () => {
    test('removes event listeners and stops constraining', () => {
      const bc = new BoundaryConstraint(canvas, { zones: { main: zone } });
      const rect = createRect({
        left: 50,
        top: 200,
        width: 50,
        height: 50,
        data: { zone: 'main' },
      });

      bc.dispose();

      // After dispose, moving should not be constrained
      fireMoving(canvas, rect);
      expect(rect.left).toBe(50);
    });
  });

  describe('Scaling constraint', () => {
    test('clamps scale when object exceeds zone dimensions', () => {
      const smallZone: ZoneRect = {
        left: 100,
        top: 100,
        width: 100,
        height: 100,
      };
      const bc = new BoundaryConstraint(canvas, {
        zones: { main: smallZone },
      });
      // 50 * 5 = 250 which exceeds zone width of 100
      const rect = createRect({
        left: 100,
        top: 100,
        width: 50,
        height: 50,
        scaleX: 5,
        scaleY: 5,
        data: { zone: 'main' },
      });

      fireScaling(canvas, rect);

      // After clamping, visual size should fit within zone
      const visualWidth = rect.width * (rect.scaleX ?? 1);
      const visualHeight = rect.height * (rect.scaleY ?? 1);
      expect(visualWidth).toBeLessThanOrEqual(smallZone.width + 0.01);
      expect(visualHeight).toBeLessThanOrEqual(smallZone.height + 0.01);

      bc.dispose();
    });

    test('does not constrain scaling when constrainScaling is false', () => {
      const smallZone: ZoneRect = {
        left: 100,
        top: 100,
        width: 100,
        height: 100,
      };
      const bc = new BoundaryConstraint(canvas, {
        zones: { main: smallZone },
        constrainScaling: false,
      });
      const rect = createRect({
        left: 100,
        top: 100,
        width: 50,
        height: 50,
        scaleX: 5,
        scaleY: 5,
        data: { zone: 'main' },
      });

      fireScaling(canvas, rect);

      // Scale should remain unchanged since no listener was registered
      expect(rect.scaleX).toBe(5);
      expect(rect.scaleY).toBe(5);

      bc.dispose();
    });
  });
});
