# Adapter Testing Findings — what fast-check surfaced

A record of the real bugs and edge cases that property-based tests caught while
building the `/adapter` route (`src/app/adapter-demo/`). It complements the
[property-based testing guide](./property-based-testing-guide.md): where that
document explains _how_ to write properties, this one shows _what they found_.

- **Scope:** two pure backend → UI adapters and their specs
  - `workspace/` — a flat workspace payload with multi-property (status × role) logic
  - `order/` — a nested order payload (customer object + array of line items) with computed money totals
- **Stack:** Angular 22 (zoneless, signals) + Vitest + `@fast-check/vitest`.
- **Headline:** every finding below was found automatically by fast-check on the
  _first_ run, and none of them would have been caught by the hand-picked
  example tests we wrote alongside.

---

## Why adapters are a property-testing sweet spot

An adapter is a **total, deterministic function** `backend → ui`. That purity is
exactly what property-based testing thrives on: we state an invariant once
("the total can never be negative") and let fast-check throw hundreds of
realistic _and_ hostile payloads at it, shrinking any failure to a minimal
counterexample with a replayable `seed`.

---

## Findings

### 1. Prototype keys leaked through dictionary lookups 🐞

**Where:** `workspace.adapter.ts`, status/role mapping.

**Symptom:** the structural-invariant and fallback properties failed with
`expected undefined to be 'Unknown status'`.

**Cause:** the lookup used a bare index into a plain object:

```ts
const status = STATUS_MAPPING[backend.account_status as AccountStatus];
```

When fast-check generated the string `"toString"` (or `"constructor"`, etc.) as
an unknown status, `STATUS_MAPPING["toString"]` resolved to the **inherited**
`Object.prototype.toString` function — a truthy value whose `.label` is
`undefined`. The "unknown → graceful fallback" guarantee silently broke.

**Fix:** an own-property-safe lookup:

```ts
function lookup<T>(table: Record<string, T>, key: string): T | undefined {
  return Object.prototype.hasOwnProperty.call(table, key)
    ? table[key]
    : undefined;
}
```

> Note: `Object.hasOwn` reads better but requires the `es2022` lib; this project
> targets an earlier lib, so `Object.prototype.hasOwnProperty.call` is used.

**Takeaway:** any time you index a dictionary with backend-controlled strings,
guard against inherited keys. Fuzzing strings finds this instantly; curated
examples never do.

---

### 2. Extreme calendar years broke the date label 🐞

**Where:** `workspace.adapter.ts` → `formatTrialLabel` (and the equivalent order
`placed_at` formatting).

**Symptom:** `expected 'Trial ends +010000-01' to match /^Trial ends \d{4}-\d{2}-\d{2}$/`.

**Cause:** for years beyond 9999, `Date.prototype.toISOString()` emits an
**expanded-year** format with a sign and six digits (`+010000-01-01T…`), so
`slice(0, 10)` produced `+010000-01` instead of `YYYY-MM-DD`.

**Fix:** this is out of the realistic domain, so we **bounded the arbitrary**
rather than complicating the adapter:

```ts
const realisticDate = fc.date({
  min: new Date('2000-01-01T00:00:00.000Z'),
  max: new Date('2099-12-31T23:59:59.999Z'),
  noInvalidDate: true,
});
```

**Takeaway:** not every counterexample is a code bug — some tell you to
**constrain the domain**. Bounding inputs to what the system actually accepts
keeps properties meaningful and fast.

---

### 3. Unbounded quantities destroyed money precision 🐞 (the big one)

**Where:** `order.adapter.ts`, money folding across line items.

**Symptom:** `the discount never exceeds the subtotal` failed after 83 runs with
`expected 1.0000000000000003e+21 to be less than or equal to 221`.

**Cause:** fast-check generated a line item with `quantity ≈ 1.5e20`. Multiplied
by a unit price, the gross exceeded `Number.MAX_SAFE_INTEGER` (~9e15), so
integer-cents arithmetic stopped being exact. The subtotal, discount and
re-parsed money totals drifted apart, violating `total = subtotal − discount`.

**Fix:** clamp the domain to realistic maxima so every total stays inside the
safe-integer range:

```ts
export const MAX_QUANTITY = 100_000;
export const MAX_UNIT_PRICE_CENTS = 100_000_000; // $1,000,000.00

export function normalizeQuantity(q: number): number {
  return toNonNegativeInt(q, MAX_QUANTITY);
}
```

With `100_000 × 100_000_000 = 1e13` per line and ≤ 8 lines (`8e13`), all sums
stay well under `9e15` and the money invariants hold exactly.

**Takeaway:** money math in floating-point JS is only exact within the
safe-integer window. Property tests make the boundary _loud_; without them this
would surface as a rare, near-unreproducible production discrepancy. This is the
same lesson the Wallet feature encodes by working in whole cents.

---

## Properties that held (and why they're worth keeping)

Beyond the bugs, these invariants passed across thousands of generated inputs and
now guard against regressions:

- **Totality** — `adaptWorkspace` / `adaptOrder` never throw and always return a
  fully-populated, non-null, display-ready model.
- **Mapping fidelity** — every documented status/role/tier/currency maps to its
  exact source-of-truth label and colour.
- **Graceful fallbacks** — unknown codes degrade to neutral "Unknown …" states;
  blank names become "Untitled workspace" / "Guest customer"; null booleans
  coerce to `false`.
- **Money folding** — `total = subtotal − discount`, all totals `≥ 0`, discount
  `≤ subtotal`, `itemCount` equals the summed (clamped) quantities.
- **Structure preservation** — one UI line per backend line, in order.

---

## Practical lessons

1. **Fuzz backend-controlled strings.** Unknown enum values, prototype keys and
   empty strings are where adapters quietly break. `fc.string()` mixed with
   `fc.constantFrom(...knownValues)` covers both the happy path and the drift.
2. **A failing property means one of two things:** a real code bug (fix the
   code — findings #1, #3) or an unrealistic input (constrain the arbitrary —
   finding #2). Both outcomes are valuable.
3. **Keep money in integer cents and bound the domain.** Floating-point plus
   unbounded inputs is a precision trap; property tests expose it immediately.
4. **Split the layers.** Pure adapters get exhaustive property coverage; the
   component keeps a handful of example-based tests that prove the wiring. This
   mirrors the repo's Wallet feature and the property-based testing guide.

---

## Reproducing a finding

Each failure printed a `seed`/`path`. Replay the exact counterexample by passing
them to the property:

```ts
test.prop([anyOrder], { seed: 1945583110, endOnFailure: true })(
  'the discount never exceeds the subtotal',
  (order) => {
    /* ... */
  },
);
```

Run the suite with:

```bash
npm test   # nx test → vitest run
```
