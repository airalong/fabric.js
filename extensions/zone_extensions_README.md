# Zone Extensions for PEP Card Covers

Three composable extensions for the Cover Canvas Unification project. Each can be used independently or together.

## Quick Start

```ts
import { BoundaryConstraint, ZoneClip, LayeredExport } from 'fabric/extensions';
```

---

## BoundaryConstraint

Restricts object movement and scaling to named rectangular zones. Objects opt in by setting `data.zone`.

```ts
const constraint = new BoundaryConstraint(canvas, {
  zones: {
    'map-text': { left: 0, top: 525, width: 500, height: 175 },
  },
  constrainScaling: true, // default: true
});

// Assign a textbox to the zone
textbox.data = { zone: 'map-text' };
canvas.add(textbox);
// textbox cannot be dragged or scaled outside the bottom 175px
```

### API

| Method                                     | Description                                          |
| ------------------------------------------ | ---------------------------------------------------- |
| `new BoundaryConstraint(canvas, options?)` | Creates the constraint and starts listening          |
| `updateZone(name, rect)`                   | Changes a zone's bounds at runtime                   |
| `getZoneForObject(target)`                 | Returns the zone rect for an object (or `undefined`) |
| `dispose()`                                | Removes all event listeners                          |

### How it works

- Listens to `object:moving` and `object:scaling` canvas events
- Reads `target.data.zone` to look up the zone name
- Clamps `left`/`top` so the object's bounding rect stays within the zone
- For scaling, finds the most restrictive ratio to fit both dimensions, applies once
- Objects without `data.zone` (or with an unrecognized zone) are unconstrained

---

## ZoneClip

Applies visual clipping to objects based on their zone. Objects are rendered only within their zone boundary (overflow is hidden).

```ts
const clip = new ZoneClip(canvas, {
  zones: {
    'map-text': { left: 0, top: 525, width: 500, height: 175, clip: true },
  },
});

textbox.data = { zone: 'map-text' };
canvas.add(textbox);
// textbox rendering is visually clipped to the text area
```

### API

| Method                           | Description                                                         |
| -------------------------------- | ------------------------------------------------------------------- |
| `new ZoneClip(canvas, options?)` | Creates the clip manager (also applies to existing objects)         |
| `updateZone(name, rect)`         | Changes a zone's bounds and re-applies clips                        |
| `removeClip(target)`             | Removes the clip from a specific object (only if ZoneClip added it) |
| `dispose()`                      | Removes all managed clipPaths and event listeners                   |

### How it works

- Listens to `object:added` and auto-applies a `clipPath` (`Rect` with `absolutePositioned: true`)
- Only applies when `zone.clip` is `true`
- Tracks which clipPaths it created (via `__zoneClipPath` flag) so `dispose()` only removes its own

### Using with BoundaryConstraint

They're independent. Use both for the full effect:

```ts
// Constraint: prevent dragging outside zone
const constraint = new BoundaryConstraint(canvas, {
  zones: { 'map-text': { left: 0, top: 525, width: 500, height: 175 } },
});

// Clip: hide overflow outside zone
const clip = new ZoneClip(canvas, {
  zones: {
    'map-text': { left: 0, top: 525, width: 500, height: 175, clip: true },
  },
});
```

---

## LayeredExport

Composes fabric canvas layers and HTML canvas elements (like OpenLayers) into a single PNG.

```ts
const exporter = new LayeredExport({ width: 500, height: 700, multiplier: 2 });

// Layer 1: background objects from fabric canvas
exporter.addCanvasLayer(coverFabricRef, {
  filter: (obj) => obj.data?.type === 'background',
});

// Layer 2: OpenLayers map (HTML canvas element)
exporter.addHTMLLayer(mapCanvasElement, {
  rect: { left: 0, top: 0, width: 500, height: 525 },
});

// Layer 3: text objects from fabric canvas
exporter.addCanvasLayer(coverFabricRef, {
  filter: (obj) => obj.data?.type?.startsWith('map-'),
});

// Export
const dataUrl = exporter.toDataURL('png');
const blob = await exporter.toBlob('png');

exporter.dispose();
```

### API

| Method                                              | Description                                              |
| --------------------------------------------------- | -------------------------------------------------------- |
| `new LayeredExport({ width, height, multiplier? })` | Creates the exporter                                     |
| `addCanvasLayer(source, options?)`                  | Adds a fabric `StaticCanvas` layer (returns `this`)      |
| `addHTMLLayer(source, options?)`                    | Adds an `HTMLCanvasElement` layer (returns `this`)       |
| `compose()`                                         | Renders all layers to an offscreen canvas and returns it |
| `toDataURL(format?, quality?)`                      | Compose + return data URL                                |
| `toBlob(format?, quality?)`                         | Compose + return `Promise<Blob>`                         |
| `clearLayers()`                                     | Removes all layers                                       |
| `dispose()`                                         | Clears layers                                            |

### Layer options

**Canvas layers** (`addCanvasLayer`):

- `filter: (obj) => boolean` — include only matching objects
- `rect: { left, top, width, height }` — crop region

**HTML layers** (`addHTMLLayer`):

- `rect` — source crop region on the HTML canvas
- `destRect` — destination position/size on the output canvas

### How it works

- Creates an offscreen canvas at `width * multiplier` x `height * multiplier`
- For canvas layers: calls `source.toCanvasElement(multiplier, { filter })` and draws to output
- For HTML layers: uses `ctx.drawImage()` with source/dest rects
- Layers are composited in add-order (first added = bottom)

---

## PEP Integration Pattern

Here's how these extensions fit into the CardCanvas unification:

```ts
// In useCanvasInitialization.ts — onCanvasReady callback
const canvas = new fabric.Canvas(el, { width: 500, height: 700 });

if (cardType === 'map') {
  // Text objects stay in the bottom 25%
  const constraint = new BoundaryConstraint(canvas, {
    zones: { 'map-text': { left: 0, top: 525, width: 500, height: 175 } },
  });
  const clip = new ZoneClip(canvas, {
    zones: {
      'map-text': { left: 0, top: 525, width: 500, height: 175, clip: true },
    },
  });

  // Store refs for cleanup
  constraintRef.current = constraint;
  clipRef.current = clip;
}

// In initializeMapCover.ts — tag text objects with zone
const textbox = new PepTextbox('Your text', {
  left: 50,
  top: 550,
  data: { zone: 'map-text', type: 'map-title' },
});
canvas.add(textbox);

// In MapTemplate PNG export
const exporter = new LayeredExport({
  width: 500,
  height: 700,
  multiplier: dpiScale,
});
exporter.addCanvasLayer(coverFabricRef, {
  filter: (obj) => obj.data?.type === 'background',
});
exporter.addHTMLLayer(olCanvasEl, {
  rect: { left: 0, top: 0, width: 500, height: 525 },
});
exporter.addCanvasLayer(coverFabricRef, {
  filter: (obj) => String(obj.data?.type).startsWith('map-'),
});
const blob = await exporter.toBlob('png');

// Cleanup on unmount
constraintRef.current?.dispose();
clipRef.current?.dispose();
```

## Tests

```bash
# Run all zone extension tests
npm run test:vitest -- extensions/boundary_constraint extensions/zone_clip extensions/layered_export

# Run individually
npm run test:vitest -- extensions/boundary_constraint/BoundaryConstraint.spec.ts
npm run test:vitest -- extensions/zone_clip/ZoneClip.spec.ts
npm run test:vitest -- extensions/layered_export/LayeredExport.spec.ts
```
