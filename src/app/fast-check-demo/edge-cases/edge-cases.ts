// Realistic little utilities that look fine for the "happy path" but quietly
// break on edge / unusual inputs. The companion spec (edge-cases.spec.ts) uses
// fast-check to hunt those inputs down automatically.
//
// Each function keeps its BUG on purpose and describes the FIX in a comment, so
// you can see exactly what fast-check found and how you would repair it.

// --------------------------------------------------------------------------
// 1) average — the classic empty-array / division-by-zero trap.
// --------------------------------------------------------------------------
// Looks correct, and every non-empty example passes. But an empty array makes
// this return NaN (0 / 0), which then poisons any downstream maths.
//
// FIX: guard the empty case, e.g.
//   if (values.length === 0) return 0; // or throw, depending on the contract
export function average(values: number[]): number {
  const sum = values.reduce((total, value) => total + value, 0);
  return sum / values.length;
}

// --------------------------------------------------------------------------
// 2) clamp — breaks when the caller passes min/max in the wrong order.
// --------------------------------------------------------------------------
// With min <= max this is perfect. But clamp(5, 10, 0) returns 10, which is
// ABOVE the intended range — the result is not between min and max at all.
//
// FIX: normalise the bounds first, e.g.
//   const lo = Math.min(min, max);
//   const hi = Math.max(min, max);
//   return Math.min(Math.max(value, lo), hi);
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// --------------------------------------------------------------------------
// 3) slugify — mishandles leading/trailing/duplicate separators.
// --------------------------------------------------------------------------
// Fine for "Hello World" -> "hello-world". But "  Hello   World!  " becomes
// "-hello-world-" with a leading/trailing hyphen and, worse, non-alphanumeric
// runs collapse oddly. A slug should never start or end with a hyphen, nor
// contain doubled hyphens.
//
// FIX: collapse runs and trim the separators, e.g.
//   return input
//     .toLowerCase()
//     .replace(/[^a-z0-9]+/g, '-')
//     .replace(/^-+|-+$/g, '');
export function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]/g, '-');
}

// --------------------------------------------------------------------------
// 4) median — wrong for even-length arrays and undefined for the empty one.
// --------------------------------------------------------------------------
// median([3, 1, 2]) -> 2, which is correct. But two bugs hide here:
//   * even length, e.g. median([1, 2, 3, 4]) returns 3, when the median is the
//     AVERAGE of the two middle values (2.5).
//   * empty input returns `undefined` (typed as number), poisoning callers.
//
// FIX: average the two central elements and guard the empty case, e.g.
//   if (sorted.length === 0) return NaN; // or throw
//   const mid = sorted.length / 2;
//   return sorted.length % 2
//     ? sorted[Math.floor(mid)]
//     : (sorted[mid - 1] + sorted[mid]) / 2;
export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted[mid];
}

// --------------------------------------------------------------------------
// 5) percentageOf — division by zero when the total is 0.
// --------------------------------------------------------------------------
// percentageOf(1, 4) -> 25. But percentageOf(0, 0) -> NaN and
// percentageOf(1, 0) -> Infinity. "0 out of 0" is usually meant to be 0%.
//
// FIX: guard total === 0, e.g.
//   if (total === 0) return 0;
export function percentageOf(part: number, total: number): number {
  return (part / total) * 100;
}

// --------------------------------------------------------------------------
// 6) capitalize — throws on the empty string.
// --------------------------------------------------------------------------
// capitalize("hello") -> "Hello". But capitalize("") reads input[0], which is
// `undefined`, and calling `undefined.toUpperCase()` throws a TypeError. The
// empty string is exactly the kind of input humans forget but fast-check does
// not.
//
// FIX: handle empty explicitly, e.g.
//   if (input.length === 0) return input;
export function capitalize(input: string): string {
  return input[0].toUpperCase() + input.slice(1);
}



