import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { getFabricDocument } from 'fabric';
import type { FabricObject, StaticCanvas } from 'fabric';
import { LayeredExport } from './index';

/**
 * In jsdom, HTMLCanvasElement.getContext returns null because there is no
 * real canvas implementation. We mock it globally so compose() works.
 */

function createMockCtx() {
  return {
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(4),
    })),
    save: vi.fn(),
    restore: vi.fn(),
    clearRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

let mockCtx: CanvasRenderingContext2D;
let origGetContext: typeof HTMLCanvasElement.prototype.getContext;

/**
 * Create a mock StaticCanvas with a working toCanvasElement method.
 */
function createMockStaticCanvas(): StaticCanvas {
  // Create a fake canvas element to return from toCanvasElement
  const el = getFabricDocument().createElement('canvas');
  el.width = 200;
  el.height = 100;
  return {
    toCanvasElement: vi.fn(() => el),
  } as unknown as StaticCanvas;
}

describe('LayeredExport', () => {
  let exporter: LayeredExport;

  beforeEach(() => {
    mockCtx = createMockCtx();
    origGetContext = HTMLCanvasElement.prototype.getContext;

    // Patch getContext on the prototype so all canvas elements get our mock
    HTMLCanvasElement.prototype.getContext = vi.fn(function (
      this: HTMLCanvasElement,
      _contextId: string,
    ) {
      if (_contextId === '2d') {
        return mockCtx;
      }
      return null;
    }) as typeof HTMLCanvasElement.prototype.getContext;

    exporter = new LayeredExport({ width: 200, height: 100, multiplier: 1 });
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = origGetContext;
  });

  test('compose creates output canvas with correct dimensions', () => {
    const result = exporter.compose();
    expect(result.width).toBe(200);
    expect(result.height).toBe(100);
  });

  test('compose applies multiplier to output dimensions', () => {
    const scaled = new LayeredExport({
      width: 200,
      height: 100,
      multiplier: 2,
    });
    const result = scaled.compose();
    expect(result.width).toBe(400);
    expect(result.height).toBe(200);
  });

  test('addCanvasLayer renders fabric objects onto output', () => {
    const mockCanvas = createMockStaticCanvas();
    exporter.addCanvasLayer(mockCanvas);
    exporter.compose();

    // Verify toCanvasElement was called with multiplier and empty options
    expect(mockCanvas.toCanvasElement).toHaveBeenCalledWith(1, {});

    // Verify drawImage was called on the output context
    expect(mockCtx.drawImage).toHaveBeenCalled();
  });

  test('addCanvasLayer with filter includes only matching objects', () => {
    const mockCanvas = createMockStaticCanvas();
    const filterFn = (obj: FabricObject) => obj.data?.include === true;

    exporter.addCanvasLayer(mockCanvas, { filter: filterFn });
    exporter.compose();

    expect(mockCanvas.toCanvasElement).toHaveBeenCalledWith(1, {
      filter: filterFn,
    });
  });

  test('addCanvasLayer with rect passes crop options', () => {
    const mockCanvas = createMockStaticCanvas();
    const rect = { left: 10, top: 20, width: 50, height: 60 };

    exporter.addCanvasLayer(mockCanvas, { rect });
    exporter.compose();

    expect(mockCanvas.toCanvasElement).toHaveBeenCalledWith(1, {
      left: 10,
      top: 20,
      width: 50,
      height: 60,
    });
  });

  test('multiple canvas layers composite in order', () => {
    const mockCanvas1 = createMockStaticCanvas();
    const mockCanvas2 = createMockStaticCanvas();

    exporter.addCanvasLayer(mockCanvas1).addCanvasLayer(mockCanvas2);
    exporter.compose();

    expect(mockCanvas1.toCanvasElement).toHaveBeenCalled();
    expect(mockCanvas2.toCanvasElement).toHaveBeenCalled();

    // Verify ordering via invocation order
    const spy1 = mockCanvas1.toCanvasElement as ReturnType<typeof vi.fn>;
    const spy2 = mockCanvas2.toCanvasElement as ReturnType<typeof vi.fn>;
    expect(spy1.mock.invocationCallOrder[0]).toBeLessThan(
      spy2.mock.invocationCallOrder[0],
    );
  });

  test('empty layers produce transparent output', () => {
    exporter.compose();

    // drawImage should not have been called since there are no layers
    expect(mockCtx.drawImage).not.toHaveBeenCalled();
  });

  test('toDataURL returns a data URL string', () => {
    // Mock toDataURL on the canvas that compose() creates
    const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = vi.fn(
      () => 'data:image/png;base64,fakedata',
    );

    const dataUrl = exporter.toDataURL();
    expect(dataUrl).toMatch(/^data:image\/png/);

    HTMLCanvasElement.prototype.toDataURL = origToDataURL;
  });

  test('toBlob returns a promise that resolves to a Blob', async () => {
    const origToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = vi.fn(function (
      callback: BlobCallback,
    ) {
      callback(new Blob(['fake'], { type: 'image/png' }));
    });

    const blob = await exporter.toBlob();
    expect(blob).toBeInstanceOf(Blob);

    HTMLCanvasElement.prototype.toBlob = origToBlob;
  });

  test('clearLayers removes all layers', () => {
    const mockCanvas = createMockStaticCanvas();
    exporter.addCanvasLayer(mockCanvas);
    exporter.clearLayers();
    exporter.compose();

    // After clearing, the canvas layer should not be rendered
    expect(mockCanvas.toCanvasElement).not.toHaveBeenCalled();
  });

  test('addCanvasLayer returns this for chaining', () => {
    const mockCanvas = createMockStaticCanvas();
    const result = exporter.addCanvasLayer(mockCanvas);
    expect(result).toBe(exporter);
  });

  test('addHTMLLayer returns this for chaining', () => {
    const htmlCanvas = getFabricDocument().createElement('canvas');
    const result = exporter.addHTMLLayer(htmlCanvas);
    expect(result).toBe(exporter);
  });

  test('dispose clears layers', () => {
    const mockCanvas = createMockStaticCanvas();
    exporter.addCanvasLayer(mockCanvas);
    exporter.dispose();
    exporter.compose();

    // After dispose, the canvas layer should not be rendered
    expect(mockCanvas.toCanvasElement).not.toHaveBeenCalled();
  });

  test('addHTMLLayer draws with drawImage', () => {
    const htmlCanvas = getFabricDocument().createElement('canvas');
    htmlCanvas.width = 200;
    htmlCanvas.height = 100;

    exporter.addHTMLLayer(htmlCanvas);
    exporter.compose();

    expect(mockCtx.drawImage).toHaveBeenCalledWith(htmlCanvas, 0, 0);
  });

  test('addHTMLLayer with rect and destRect uses source and dest coordinates', () => {
    const htmlCanvas = getFabricDocument().createElement('canvas');
    htmlCanvas.width = 200;
    htmlCanvas.height = 100;

    const rect = { left: 10, top: 20, width: 50, height: 60 };
    const destRect = { left: 0, top: 0, width: 100, height: 120 };

    exporter.addHTMLLayer(htmlCanvas, { rect, destRect });
    exporter.compose();

    expect(mockCtx.drawImage).toHaveBeenCalledWith(
      htmlCanvas,
      10,
      20,
      50,
      60,
      0,
      0,
      100,
      120,
    );
  });
});
