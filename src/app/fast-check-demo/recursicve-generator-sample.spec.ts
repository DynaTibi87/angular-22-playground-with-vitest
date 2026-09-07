import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { catalogArbitrary } from './catalog/catalog.arbitrary';
import { maxDepth } from './catalog/catalog.logic';

describe('recursive generator sample', () => {
  it('samples and validates a handful of finite trees', () => {
    const samples = fc.sample(catalogArbitrary, 5);

    // Uncomment to eyeball the shapes in the test output:
    // console.log(JSON.stringify(samples, null, 2));

    expect(samples).toHaveLength(5);
    for (const sample of samples) {
      expect(sample.type).toBe('category');
      expect(maxDepth(sample)).toBeLessThanOrEqual(8);
    }
  });
});
