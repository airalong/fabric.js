import { FabricObject } from 'fabric';

/**
 * Ensures the `data` property is included in FabricObject serialization.
 * Safe to call multiple times — checks the array before adding.
 */
export function ensureDataSerialization() {
  if (!FabricObject.customProperties.includes('data')) {
    FabricObject.customProperties.push('data');
  }
}
