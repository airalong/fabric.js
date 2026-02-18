import { describe, test, expect, afterEach } from 'vitest';
import { FabricObject, Rect } from 'fabric';
import { ensureDataSerialization } from './ensureDataSerialization';

describe('ensureDataSerialization', () => {
  afterEach(() => {
    // Clean up: remove 'data' from customProperties
    const idx = FabricObject.customProperties.indexOf('data');
    if (idx > -1) {
      FabricObject.customProperties.splice(idx, 1);
    }
  });

  test('adds data to FabricObject.customProperties', () => {
    expect(FabricObject.customProperties).not.toContain('data');
    ensureDataSerialization();
    expect(FabricObject.customProperties).toContain('data');
  });

  test('calling multiple times does not duplicate the entry', () => {
    ensureDataSerialization();
    ensureDataSerialization();
    const count = FabricObject.customProperties.filter(
      (p) => p === 'data',
    ).length;
    expect(count).toBe(1);
  });

  test('data property serializes via toObject after registration', () => {
    ensureDataSerialization();
    const rect = new Rect({
      width: 50,
      height: 50,
      data: { zone: 'map-text', type: 'title' },
    });
    const serialized = rect.toObject();
    expect(serialized.data).toEqual({ zone: 'map-text', type: 'title' });
  });

  test('data property survives toObject/fromObject round-trip', async () => {
    ensureDataSerialization();
    const rect = new Rect({
      width: 100,
      height: 50,
      data: { zone: 'map-text', type: 'subtitle' },
    });

    const serialized = rect.toObject();
    const restored = await Rect.fromObject(serialized);

    expect((restored as any).data).toEqual({
      zone: 'map-text',
      type: 'subtitle',
    });
  });

  test('objects without data serialize without data key', () => {
    ensureDataSerialization();
    const rect = new Rect({ width: 50, height: 50 });
    const serialized = rect.toObject();
    expect(serialized.data).toBeUndefined();
  });
});
