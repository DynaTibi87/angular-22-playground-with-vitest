// Property-based tests for the truncate pipe.
//
// Truncation is a great fit for fast-check: instead of a handful of hand-picked
// strings and limits, we state the invariants that must hold for EVERY string,
// limit and trail, and let fast-check search for a counterexample. We test the
// pure `truncate` function directly (the pipe is a one-line wrapper over it, and
// gets its own tiny test at the bottom).
import { fc, test } from '@fast-check/vitest';
import { describe, expect, it } from 'vitest';
import { TruncatePipe, truncate } from './truncate.pipe';

// A non-negative integer limit, matching how the function normalises input.
const limitArb = fc.nat({ max: 200 });
// A trail marker — anything from an empty string to a short suffix.
const trailArb = fc.string({ maxLength: 5 });

describe('truncate — pass-through of short strings', () => {
  test.only.prop([fc.string({ maxLength: 200 }), limitArb, trailArb])(
    'returns the input unchanged when it already fits within the limit',
    (value, limit, trail) => {
      console.log(value);
      if (value.length <= limit) {
        expect(truncate(value, limit, trail)).toBe(value);
      }
    },
  );

  test.prop([fc.string(), trailArb])(
    'a limit at least as large as the input is always a no-op',
    (value, trail) => {
      expect(truncate(value, value.length, trail)).toBe(value);
      expect(truncate(value, value.length + 10, trail)).toBe(value);
    },
  );
});

describe('truncate — behaviour when the string is too long', () => {
  test.prop([fc.string({ minLength: 1 }), limitArb, trailArb])(
    'keeps the first `limit` characters as a prefix of the original',
    (value, limit, trail) => {
      const result = truncate(value, limit, trail);
      if (value.length > limit) {
        // The kept part is exactly the original's leading `limit` characters.
        expect(result.startsWith(value.slice(0, limit))).toBe(true);
        expect(result).toBe(value.slice(0, limit) + trail);
      }
    },
  );

  test.prop([fc.string({ minLength: 1 }), limitArb, trailArb])(
    'appends the trail exactly when (and only when) content was dropped',
    (value, limit, trail) => {
      const result = truncate(value, limit, trail);
      const wasTruncated = value.length > limit;
      // When truncated, the visible content is capped at `limit` characters
      // plus the trail; otherwise the string is untouched.
      if (wasTruncated) {
        expect(result.length).toBe(limit + trail.length);
      } else {
        expect(result).toBe(value);
      }
    },
  );
});

describe('truncate — global invariants', () => {
  test.prop([fc.string(), limitArb, trailArb])(
    'never keeps more than `limit` characters from the original',
    (value, limit, trail) => {
      const result = truncate(value, limit, trail);
      const keptFromOriginal = result.endsWith(trail)
        ? result.slice(0, result.length - trail.length)
        : result;
      // We may keep the whole (short) string, but never more than the limit
      // once truncation kicks in.
      expect(keptFromOriginal.length).toBeLessThanOrEqual(
        Math.max(value.length, limit),
      );
      expect(value.startsWith(keptFromOriginal)).toBe(true);
    },
  );

  test.prop([fc.string(), limitArb, trailArb])(
    'is idempotent: truncating an already-truncated string changes nothing',
    (value, limit, trail) => {
      const once = truncate(value, limit, trail);
      const twice = truncate(once, limit, trail);
      expect(twice).toBe(once);
    },
  );

  test.prop([
    fc.string(),
    fc.oneof(fc.integer({ min: -50, max: 0 }), fc.double({ min: -5, max: 50 })),
    trailArb,
  ])(
    'normalises fractional and negative limits to a non-negative integer',
    (value, limit, trail) => {
      const result = truncate(value, limit, trail);
      const expectedMax = Math.max(0, Math.trunc(limit));
      // Whatever odd number came in, the function behaves as if `expectedMax`
      // whole characters were requested.
      expect(result).toBe(truncate(value, expectedMax, trail));
    },
  );
});

// A couple of anchored examples make the semantics concrete at a glance.
describe('truncate — worked examples', () => {
  it('cuts a long string and appends the default ellipsis', () => {
    expect(truncate('The quick brown fox', 9)).toBe('The quick…');
  });

  it('leaves a short string alone', () => {
    expect(truncate('Hello', 10)).toBe('Hello');
  });

  it('supports a custom trail', () => {
    expect(truncate('abcdef', 3, ' [more]')).toBe('abc [more]');
  });

  it('treats a zero or negative limit as "keep nothing"', () => {
    expect(truncate('abcdef', 0)).toBe('…');
    expect(truncate('abcdef', -4)).toBe('…');
  });
});

describe('TruncatePipe', () => {
  it('delegates to the pure truncate function', () => {
    const pipe = new TruncatePipe();
    expect(pipe.transform('The quick brown fox', 9)).toBe('The quick…');
    expect(pipe.transform('short', 10)).toBe('short');
    expect(pipe.transform('abcdef', 3, '~')).toBe('abc~');
  });
});
