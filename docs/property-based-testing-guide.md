# Property-Based Testing with fast-check — Educational Guide

A focused companion to the
[Angular + Vitest Testing guide](./angular-vitest-testing-guide.md). Where that
document covers *example-based* testing, this one introduces **property-based
testing** with [fast-check](https://fast-check.dev) and walks through the live
**Wallet** feature that ships under `src/app/fast-check-demo/`.

Sources this guide builds on:

- fast-check + Vitest tutorial:
  <https://fast-check.dev/docs/tutorials/setting-up-your-test-environment/property-based-testing-with-vitest/>
- Angular testing guide: <https://angular.dev/guide/testing>
- Vitest guide: <https://vitest.dev/guide/>

> **Audience:** developers who already write example-based specs and want to add
> property-based tests where they pay off.
> **Goal:** understand *what* a property is, *when* to reach for one, and *how*
> to test pure logic, an NgRx reducer, selectors, and a component together.

---

## 1. Example-based vs. property-based testing

An **example-based** test pins one input to one expected output:

```ts
it('formats 1234 cents as $12.34', () => {
  expect(formatCents(1234)).toBe('$12.34');
});
```

That's precise and readable, but it only proves the one case you thought of.
Bugs love the cases you *didn't* think of (0, negatives, huge numbers, `NaN`).

A **property-based** test states a rule that must hold for *all* inputs, and lets
fast-check generate hundreds of them to try to break it:

```ts
import { fc, test } from '@fast-check/vitest';

test.prop([fc.integer()])('always renders exactly two decimals', (cents) => {
  expect(formatCents(cents)).toMatch(/^-?\$\d+\.\d{2}$/);
});
```

If any generated value fails, fast-check **shrinks** it to the smallest
counterexample (e.g. it reports `-1` instead of some random `-83719`) and prints
a `seed`/`path` you can use to replay the exact failure.

| | Example-based | Property-based |
| --- | --- | --- |
| Inputs | Hand-picked | Generated (100 runs by default) |
| Finds unknown edge cases | Rarely | Often |
| Best for | Specific behaviours, error messages, UI wiring | Pure functions, invariants, round-trips |
| Failure output | Your assertion | A **shrunk**, minimal counterexample + replay seed |

The two are complementary. This repo uses **both**: properties for the rules,
examples for the exact behaviours and messages.

---

## 2. Setup in this repo

Nothing extra to configure — the packages are already installed and Vitest is
already wired up (see the [main testing guide](./angular-vitest-testing-guide.md)).

- `fast-check` — the core generators (`fc`) and runner.
- `@fast-check/vitest` — a thin bridge that adds `.prop` to Vitest's `test`/`it`.

Import the enhanced `test` (or `it`) and `fc` from the bridge; keep
`describe`/`expect` from Vitest's globals:

```ts
import { fc, test } from '@fast-check/vitest';
import { describe, expect, it } from 'vitest';
```

---

## 3. Anatomy of a property

```ts
test.prop([fc.integer({ min: 1, max: 1000 }), fc.integer({ min: 1, max: 1000 })])(
  'addition is commutative',   // 1. a descriptive name
  (a, b) => {                  // 2. args match the arbitraries, in order
    expect(a + b).toBe(b + a); // 3. an assertion (or return a boolean)
  },
);
```

1. **Arbitraries** — `fc.integer(...)` etc. describe *how to generate* inputs.
   You pass them as an array (positional args) or as a record (named args).
2. **The predicate** — runs once per generated sample. Throw/`expect`-fail to
   signal a violation, or return `false`.
3. fast-check runs it ~100 times, and on failure **shrinks** to a minimal case.

### Choosing arbitraries

| Need | Arbitrary |
| --- | --- |
| Any integer | `fc.integer()` |
| Bounded integer | `fc.integer({ min, max })` |
| Non-negative integer | `fc.nat()` |
| Floating point | `fc.float()`, `fc.double()` |
| Text | `fc.string()` |
| One of a set | `fc.constantFrom('a', 'b')` |
| Object shape | `fc.record({ id: fc.string(), amount: fc.nat() })` |
| List | `fc.array(itemArb, { maxLength })` |
| Either/or | `fc.oneof(arbA, arbB)` |
| Derive/transform | `arb.map(fn)`, `arb.filter(pred)` |

> **Tip:** bound your domain (`{ min, max, maxLength }`) to keep generated data
> realistic and tests fast. In the Wallet feature, amounts are whole **cents**
> in `[1, MAX_AMOUNT]`, which sidesteps floating-point rounding entirely.

---

## 4. Good properties to look for

Reaching for the right *kind* of property is most of the skill. Common patterns:

- **Round-trip / inverse** — `decode(encode(x)) === x`.
  Wallet: *deposit then withdraw the same amount is a no-op.*
- **Invariant** — something that is always true after any operation.
  Wallet: *the balance is never negative* and *always equals the folded history.*
- **Commutativity / order-independence** — `f(a, b) === f(b, a)`.
  Wallet: *deposits commute — order doesn't change the final balance.*
- **Idempotence** — `f(f(x)) === f(x)`.
  Wallet: *reset from anywhere yields the initial state.*
- **Oracle / model** — compare against a simpler reference implementation.
  Wallet: *the reducer's balance matches `computeBalance(transactions)`.*
- **Metamorphic** — a known change to the input causes a known change to the
  output (e.g. reversing a list doesn't change its sum).

---

## 5. The Wallet feature — a guided tour

The `/fast-check` route hosts a small NgRx-backed **Wallet**. It's deliberately
layered so each layer can be tested with the technique that suits it best.

```
src/app/fast-check-demo/
├── fast-check-demo.ts            # page component behind the /fast-check route
├── fast-check-demo.spec.ts       # page smoke test (example-based)
└── wallet/
    ├── wallet.model.ts           # plain data types + initial state
    ├── wallet.logic.ts           # pure domain functions  ← property sweet spot
    ├── wallet.logic.spec.ts      # property + example tests
    ├── wallet.actions.ts         # NgRx actions (createActionGroup)
    ├── wallet.reducer.ts         # createFeature: reducer + selectors  ← pure
    ├── wallet.reducer.spec.ts    # property (random action sequences) + examples
    ├── wallet.selectors.spec.ts  # selector properties + examples
    ├── wallet-panel.ts           # component: reads store signals, dispatches
    └── wallet-panel.spec.ts      # Angular component test with the real store
```

**Why NgRx here?** A reducer is a **pure** `(state, action) => state` function,
and selectors are **pure** projections of state. Purity is exactly what
property-based testing thrives on, so the store layer is a natural showcase.

### 5.1 Pure logic (`wallet.logic.ts`)

Total, deterministic functions — the easiest and highest-value target.

```ts
// The headline round-trip: money in, same money out, back to start.
test.prop([balance, validAmount])(
  'deposit then withdraw of the same amount is a no-op',
  (b, a) => {
    const afterDeposit = applyDeposit(b, a);
    const { ok, balance: after } = applyWithdrawal(afterDeposit, a);
    expect(ok).toBe(true);
    expect(after).toBe(b);
  },
);
```

Other properties in the spec: `isValidAmount` accepts only positive whole cents,
`computeBalance` equals deposits − withdrawals (and is order-independent),
`applyWithdrawal` never yields a negative balance, and `formatCents` always
matches `/^-?\$\d+\.\d{2}$/` and round-trips back to the original cents.

### 5.2 The reducer (`wallet.reducer.ts`) — model-based testing

Because the reducer is pure, we generate a **random sequence of actions**, fold
them through the reducer, and assert the invariants survive:

```ts
const anyAction = fc.oneof(
  validAmount.map((amount) => WalletActions.deposit({ amount })),
  validAmount.map((amount) => WalletActions.withdraw({ amount })),
  fc.constant(WalletActions.reset()),
  fc.constant(WalletActions.clearError()),
);

test.prop([fc.array(anyAction, { maxLength: 40 })])(
  'keeps balance equal to the folded transaction history',
  (actions) => {
    const state = actions.reduce(walletReducer, initialWalletState);
    expect(state.balance).toBe(computeBalance(state.transactions));
  },
);
```

This single property replaces dozens of handwritten scenarios. The spec also
proves the balance stays non-negative, that history is append-only, and that
`reset` is idempotent — plus example tests for each action's exact behaviour and
error message.

> **Keeping the reducer pure:** transaction ids are derived deterministically
> (`deposit-1`, `withdrawal-2`, …) instead of `Date.now()`/`Math.random()`.
> Purity is what makes the folded-sequence property reproducible.

### 5.3 Selectors (`wallet.selectors.spec.ts`)

Selectors are pure too. Test them cheaply through `.projector(...)`, or against a
full root-state object the way NgRx calls them:

```ts
test.prop([walletState])(
  'deposit and withdrawal counts add up to the history length',
  (wallet) => {
    const state = { wallet };
    expect(
      walletFeature.selectDepositCount(state) +
        walletFeature.selectWithdrawalCount(state),
    ).toBe(wallet.transactions.length);
  },
);
```

### 5.4 The component (`wallet-panel.spec.ts`) — stay example-based

The component only reads store signals and dispatches actions, so property-based
testing adds little here. We use the **real** store (`provideStore()` +
`provideState(walletFeature)`) and a handful of example interactions, mirroring
the [component-testing patterns](./angular-vitest-testing-guide.md) used
elsewhere in the repo:

```ts
TestBed.configureTestingModule({
  imports: [WalletPanel],
  providers: [provideStore(), provideState(walletFeature)],
});
// deposit 1234¢ → balance reads "$12.34"; overdraw → an error appears; reset → empty
```

---

## 6. When to use which

| Layer | Nature | Reach for |
| --- | --- | --- |
| Pure domain logic | Total, deterministic | **Properties** (round-trips, invariants) + a few examples |
| NgRx reducer | Pure `(state, action) => state` | **Properties** over random action sequences + example per action |
| NgRx selectors | Pure projections | **Properties** (`.projector`) + examples |
| Component | Reads state, dispatches | **Example-based** with the real store |

Rule of thumb: **the more a unit looks like a pure function, the more a property
earns its keep.** Push logic into pure functions and reducers, and the valuable
property tests follow naturally.

---

## 7. Reproducing and debugging failures

When a property fails, fast-check prints the shrunk counterexample plus a `seed`
and `path`. Replay that exact case by passing them to the property:

```ts
test.prop([fc.integer()], { seed: 42, path: '2:1', endOnFailure: true })(
  'repro',
  (n) => {
    /* ... */
  },
);
```

Other handy knobs (second argument to `.prop`): `numRuns` (samples per run) and
`verbose` (log every generated value). See the fast-check runner docs for the
full list.

---

## 8. Cheat sheet

```ts
import { fc, test } from '@fast-check/vitest';
import { describe, expect } from 'vitest';

// Positional arbitraries → positional args
test.prop([fc.nat(), fc.nat()])('commutative', (a, b) => {
  expect(a + b).toBe(b + a);
});

// Named arbitraries → a single record arg
test.prop({ a: fc.nat(), b: fc.nat() })('named', ({ a, b }) => {
  expect(a + b).toBe(b + a);
});

// Compose & constrain
const validAmount = fc.integer({ min: 1, max: 1_000 });
const tx = fc.record({ kind: fc.constantFrom('deposit', 'withdrawal'), amount: validAmount });
const history = fc.array(tx, { maxLength: 20 });
```

Run everything with:

```bash
npm test            # nx test → vitest run
```

