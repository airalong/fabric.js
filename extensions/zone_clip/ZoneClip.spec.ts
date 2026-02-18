import { describe, test, expect, beforeEach } from 'vitest';
import { Observable, Rect } from 'fabric';
import type { Canvas, FabricObject } from 'fabric';
import { ZoneClip } from './index';
import type { ClipZoneRect } from './typedefs';

class MockCanvas extends Observable<any> {
  private _objects: FabricObject[] = [];

  getObjects() {
    return this._objects;
  }

  requestRenderAll() {
    // no-op
  }

  addObject(obj: FabricObject) {
    this._objects.push(obj);
  }
}

function createMockCanvas(): MockCanvas {
  return new MockCanvas();
}

function createMockObject(
  options: {
    data?: Record<string, unknown>;
  } = {},
): FabricObject {
  const obj: any = {
    data: options.data,
    clipPath: undefined,
  };
  return obj as FabricObject;
}

describe('ZoneClip', () => {
  let mockCanvas: MockCanvas;
  const zone: ClipZoneRect = {
    left: 100,
    top: 100,
    width: 400,
    height: 300,
    clip: true,
  };

  beforeEach(() => {
    mockCanvas = createMockCanvas();
  });

  test('applies clipPath to object added with a clipping zone', () => {
    const zc = new ZoneClip(mockCanvas as unknown as Canvas, {
      zones: { main: zone },
    });
    const obj = createMockObject({ data: { zone: 'main' } });

    mockCanvas.fire('object:added', { target: obj });

    expect(obj.clipPath).toBeDefined();
    expect(obj.clipPath).toBeInstanceOf(Rect);
    expect((obj.clipPath as any).left).toBe(100);
    expect((obj.clipPath as any).top).toBe(100);
    expect((obj.clipPath as any).width).toBe(400);
    expect((obj.clipPath as any).height).toBe(300);
    expect((obj.clipPath as any).absolutePositioned).toBe(true);
    expect((obj as any).__zoneClipPath).toBe(true);

    zc.dispose();
  });

  test('does not apply clipPath when zone has clip: false', () => {
    const noClipZone: ClipZoneRect = {
      left: 0,
      top: 0,
      width: 200,
      height: 200,
      clip: false,
    };
    const zc = new ZoneClip(mockCanvas as unknown as Canvas, {
      zones: { main: noClipZone },
    });
    const obj = createMockObject({ data: { zone: 'main' } });

    mockCanvas.fire('object:added', { target: obj });

    expect(obj.clipPath).toBeUndefined();

    zc.dispose();
  });

  test('does not apply clipPath to objects without a zone', () => {
    const zc = new ZoneClip(mockCanvas as unknown as Canvas, {
      zones: { main: zone },
    });
    const obj = createMockObject();

    mockCanvas.fire('object:added', { target: obj });

    expect(obj.clipPath).toBeUndefined();

    zc.dispose();
  });

  test('does not apply clipPath to objects with unknown zone', () => {
    const zc = new ZoneClip(mockCanvas as unknown as Canvas, {
      zones: { main: zone },
    });
    const obj = createMockObject({ data: { zone: 'nonexistent' } });

    mockCanvas.fire('object:added', { target: obj });

    expect(obj.clipPath).toBeUndefined();

    zc.dispose();
  });

  test('updateZone changes clipPath geometry for objects in that zone', () => {
    const zc = new ZoneClip(mockCanvas as unknown as Canvas, {
      zones: { main: zone },
    });
    const obj = createMockObject({ data: { zone: 'main' } });
    mockCanvas.addObject(obj);
    mockCanvas.fire('object:added', { target: obj });

    expect((obj.clipPath as any).left).toBe(100);
    expect((obj.clipPath as any).width).toBe(400);

    zc.updateZone('main', {
      left: 50,
      top: 50,
      width: 600,
      height: 500,
      clip: true,
    });

    expect(obj.clipPath).toBeDefined();
    expect((obj.clipPath as any).left).toBe(50);
    expect((obj.clipPath as any).top).toBe(50);
    expect((obj.clipPath as any).width).toBe(600);
    expect((obj.clipPath as any).height).toBe(500);

    zc.dispose();
  });

  test('dispose removes clipPaths and event listeners', () => {
    const zc = new ZoneClip(mockCanvas as unknown as Canvas, {
      zones: { main: zone },
    });
    const obj = createMockObject({ data: { zone: 'main' } });
    mockCanvas.addObject(obj);
    mockCanvas.fire('object:added', { target: obj });

    expect(obj.clipPath).toBeDefined();

    zc.dispose();

    expect(obj.clipPath).toBeUndefined();
    expect((obj as any).__zoneClipPath).toBeUndefined();

    // After dispose, new objects should not get clipPath
    const obj2 = createMockObject({ data: { zone: 'main' } });
    mockCanvas.fire('object:added', { target: obj2 });
    expect(obj2.clipPath).toBeUndefined();
  });

  test('applies clipPath to objects already on canvas when ZoneClip is created', () => {
    const obj = createMockObject({ data: { zone: 'main' } });
    mockCanvas.addObject(obj);

    const zc = new ZoneClip(mockCanvas as unknown as Canvas, {
      zones: { main: zone },
    });

    expect(obj.clipPath).toBeDefined();
    expect(obj.clipPath).toBeInstanceOf(Rect);
    expect((obj.clipPath as any).left).toBe(100);
    expect((obj.clipPath as any).width).toBe(400);

    zc.dispose();
  });
});
