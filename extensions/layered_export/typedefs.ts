import type { FabricObject, StaticCanvas } from 'fabric';

export type CropRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type CanvasLayerOptions = {
  /** Filter which objects to include */
  filter?: (obj: FabricObject) => boolean;
  /** Crop region in canvas coordinates */
  rect?: CropRect;
};

export type HTMLLayerOptions = {
  /** Crop region from the HTML element */
  rect?: CropRect;
  /** Position to draw the layer at on the output canvas */
  destRect?: CropRect;
};

export type Layer =
  | { type: 'canvas'; source: StaticCanvas; options: CanvasLayerOptions }
  | { type: 'html'; source: HTMLCanvasElement; options: HTMLLayerOptions };

export type LayeredExportConfig = {
  width: number;
  height: number;
  /** DPI multiplier (default: 1) */
  multiplier: number;
};
