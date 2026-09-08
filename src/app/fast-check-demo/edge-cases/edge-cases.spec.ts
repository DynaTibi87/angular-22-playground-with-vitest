// Property-based tests that deliberately EXPOSE the edge-case bugs in
// edge-cases.ts. Each property states something that *should* be true for all
// inputs; fast-check then searches for a counterexample and shrinks it to the
// smallest failing case (e.g. the empty array, size 0, "").
//
// Run these and read the failures — the shrunk counterexample fast-check prints
// is exactly the edge case the implementation forgot. Apply the FIX documented
// next to each function in edge-cases.ts and the matching property goes green.
//
// NOTE: these tests are expected to FAIL as written. That is the whole point of
// this file. Wrap the bad assertions in `expect(...).toThrow()` or fix the
// implementation to make them pass.
import { fc, test } from '@fast-check/vitest';
import { describe, expect } from 'vitest';
import {
  average,
  capitalize,
  clamp,
  median,
  percentageOf,
  slugify,
} from './edge-cases';
import { VerbosityLevel } from 'fast-check';

describe('average', () => {
  // Passes for non-empty arrays...
  test.prop([fc.array(fc.integer(), { minLength: 1 })], {
    verbose: VerbosityLevel.VeryVerbose,
  })('sits between the min and max of the values', (values) => {
    const result = average(values);
    expect(result).toBeGreaterThanOrEqual(Math.min(...values));
    expect(result).toBeLessThanOrEqual(Math.max(...values));
  });

  // ...but this catches the empty-array / NaN bug. fast-check shrinks straight
  // to [].
  test.prop([fc.array(fc.integer())], { verbose: VerbosityLevel.VeryVerbose })(
    'always returns a finite number',
    (values) => {
      expect(Number.isFinite(average(values))).toBe(true);
    },
  );
});

describe('clamp', () => {
  // Catches the swapped-bounds bug: with min > max the result escapes the
  // range. fast-check finds something like value=0, a=1, b=0.
  test.prop([fc.integer(), fc.integer(), fc.integer()])(
    'result is always within [min(a,b), max(a,b)]',
    (value, a, b) => {
      const result = clamp(value, a, b);
      expect(result).toBeGreaterThanOrEqual(Math.min(a, b));
      expect(result).toBeLessThanOrEqual(Math.max(a, b));
    },
  );
});

describe('slugify', () => {
  const asciiText = fc.stringMatching(/^[ -~]*$/);

  // Catches leading/trailing hyphens and doubled hyphens produced by runs of
  // non-alphanumeric characters. Shrinks to something like " " or "!".
  test.prop([asciiText])('never starts or ends with a hyphen', (input) => {
    const slug = slugify(input);
    if (slug.length > 0) {
      expect(slug.startsWith('-')).toBe(false);
      expect(slug.endsWith('-')).toBe(false);
    }
  });

  test.prop([asciiText])('never contains a doubled hyphen', (input) => {
    expect(slugify(input)).not.toContain('--');
  });
});

describe('median', () => {
  // Catches the empty-array (undefined) bug: the median must be a real number
  // between the smallest and largest value. fast-check shrinks to [].
  test.prop([fc.array(fc.integer())])('lies within [min, max]', (values) => {
    const result = median(values);
    if (values.length === 0) {
      // A well-behaved median cannot be undefined/NaN for "no data".
      expect(Number.isFinite(result)).toBe(true);
      return;
    }
    expect(result).toBeGreaterThanOrEqual(Math.min(...values));
    expect(result).toBeLessThanOrEqual(Math.max(...values));
  });

  // Catches the even-length bug: half the values must be <= the median and half
  // >= it. Picking a single middle element skews this for even-length inputs.
  test.prop([fc.array(fc.integer(), { minLength: 1 })])(
    'splits the data evenly around itself',
    (values) => {
      const result = median(values);
      const below = values.filter((v) => v < result).length;
      const above = values.filter((v) => v > result).length;
      // For a true median these counts differ by at most one.
      expect(Math.abs(below - above)).toBeLessThanOrEqual(1);
    },
  );
});

describe('percentageOf', () => {
  // Catches division-by-zero: percentageOf(part, 0) yields NaN/Infinity.
  test.prop([
    fc.integer({ min: 0, max: 1000 }),
    fc.integer({ min: 0, max: 1000 }),
  ])('always returns a finite percentage', (part, total) => {
    expect(Number.isFinite(percentageOf(part, total))).toBe(true);
  });
});

describe('capitalize', () => {
  // Catches the empty-string TypeError. fast-check shrinks straight to "".
  test.prop([fc.string()])('has the same length as its input', (input) => {
    expect(capitalize(input)).toHaveLength(input.length);
  });
});
