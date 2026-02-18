import { getFabricDocument } from 'fabric';
import type { FabricObject, StaticCanvas } from 'fabric';
import type {
  CanvasLayerOptions,
  HTMLLayerOptions,
  Layer,
  LayeredExportConfig,
} from './typedefs';

export type { CanvasLayerOptions, HTMLLayerOptions, LayeredExportConfig };
export type { CropRect, Layer } from './typedefs';

export class LayeredExport {
  readonly width: number;
  readonly height: number;
  readonly multiplier: number;
  private layers: Layer[] = [];

  constructor({ width, height, multiplier = 1 }: LayeredExportConfig) {
    this.width = width;
    this.height = height;
    this.multiplier = multiplier;
  }

  addCanvasLayer(source: StaticCanvas, options: CanvasLayerOptions = {}): this {
    this.layers.push({ type: 'canvas', source, options });
    return this;
  }

  addHTMLLayer(
    source: HTMLCanvasElement,
    options: HTMLLayerOptions = {},
  ): this {
    this.layers.push({ type: 'html', source, options });
    return this;
  }

  clearLayers(): void {
    this.layers = [];
  }

  compose(): HTMLCanvasElement {
    const outputWidth = this.width * this.multiplier;
    const outputHeight = this.height * this.multiplier;

    const canvas = getFabricDocument().createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext('2d')!;

    for (const layer of this.layers) {
      if (layer.type === 'canvas') {
        this._drawCanvasLayer(ctx, layer.source, layer.options);
      } else {
        this._drawHTMLLayer(ctx, layer.source, layer.options);
      }
    }

    return canvas;
  }

  private _drawCanvasLayer(
    ctx: CanvasRenderingContext2D,
    source: StaticCanvas,
    options: CanvasLayerOptions,
  ): void {
    const toCanvasOptions: {
      filter?: (obj: FabricObject) => boolean;
      left?: number;
      top?: number;
      width?: number;
      height?: number;
    } = {};

    if (options.filter) {
      toCanvasOptions.filter = options.filter;
    }

    if (options.rect) {
      toCanvasOptions.left = options.rect.left;
      toCanvasOptions.top = options.rect.top;
      toCanvasOptions.width = options.rect.width;
      toCanvasOptions.height = options.rect.height;
    }

    const rendered = source.toCanvasElement(this.multiplier, toCanvasOptions);
    ctx.drawImage(rendered, 0, 0);
  }

  private _drawHTMLLayer(
    ctx: CanvasRenderingContext2D,
    source: HTMLCanvasElement,
    options: HTMLLayerOptions,
  ): void {
    const { rect, destRect } = options;

    if (rect && destRect) {
      ctx.drawImage(
        source,
        rect.left,
        rect.top,
        rect.width,
        rect.height,
        destRect.left * this.multiplier,
        destRect.top * this.multiplier,
        destRect.width * this.multiplier,
        destRect.height * this.multiplier,
      );
    } else if (rect) {
      ctx.drawImage(
        source,
        rect.left,
        rect.top,
        rect.width,
        rect.height,
        0,
        0,
        rect.width * this.multiplier,
        rect.height * this.multiplier,
      );
    } else if (destRect) {
      ctx.drawImage(
        source,
        destRect.left * this.multiplier,
        destRect.top * this.multiplier,
        destRect.width * this.multiplier,
        destRect.height * this.multiplier,
      );
    } else {
      ctx.drawImage(source, 0, 0);
    }
  }

  toDataURL(format: string = 'png', quality: number = 1): string {
    const canvas = this.compose();
    return canvas.toDataURL(`image/${format}`, quality);
  }

  toBlob(format: string = 'png', quality: number = 1): Promise<Blob | null> {
    const canvas = this.compose();
    return new Promise((resolve) => {
      canvas.toBlob(resolve, `image/${format}`, quality);
    });
  }

  dispose(): void {
    this.clearLayers();
  }
}
