# Test Examples Review

A review of the specs under `src/app/test-examples/`, measured against the
official [Angular testing guide](https://angular.dev/guide/testing) and the
[Vitest guide](https://vitest.dev/guide/).

- **Scope:** 12 example folders (10 component/directive/pipe specs + 2
  service-focused specs).
- **Stack:** Angular 22 (zoneless, standalone, signals) + Vitest via
  `@analogjs/vitest-angular`, jsdom environment.
- **Overall verdict:** 🟢 Strong. The suite is modern, idiomatic, and covers the
  main categories the Angular guide calls out (components, inputs/outputs,
  directives, pipes, services, HTTP, router, DI, spies, async). The notes below
  are mostly refinements, not defects.

---

## Scoring at a glance

| Example | Category | Alignment | Notes |
| --- | --- | --- | --- |
| `counter` | Component + signal state | 🟢 Excellent | Textbook fixture/DebugElement usage. |
| `name-field` | Two-way DOM sync | 🟢 Excellent | Good use of `properties[...]` over `nativeElement` casts. |
| `greeting` | Input/Output | 🟢 Excellent | Modern `inputBinding`/`outputBinding` harness. |
| `highlight-directive` | Attribute directive | 🟢 Excellent | Test host + `By.directive`, exactly per guide. |
| `title-case-pipe` | Pipe | 🟢 Excellent | Pure `new Pipe()` unit tests, no TestBed. |
| `service-injection` | DI resolution | 🟢 Very good | Thorough injector coverage; slightly over-asserts identity. |
| `cart` | Service in isolation + HTTP | 🟢 Excellent | Isolation, fake collaborator, and HTTP layers well separated. |
| `http-user` | Component + HttpTestingController | 🟢 Excellent | Full happy/error/edge coverage, `verify()` in `afterEach`. |
| `async-quote` | Fake timers + RxJS | 🟢 Very good | Excellent comments; one commented-out line to remove. |
| `spy-feature-toggle` | Spies / mocks | 🟢 Excellent | Best-in-class demonstration of `vi.spyOn` patterns. |
| `router-navigation` | Router | 🟢 Excellent | Uses `RouterTestingHarness`, the recommended tool. |
| `nested-components` | Parent/child + stubbing | 🟢 Very good | Good stub pattern; one weak assertion (see below). |

---

## What the suite does well

These practices line up directly with the Angular and Vitest guides and are
worth keeping as the house style:

1. **Zoneless-correct async handling.** Every spec awaits `fixture.whenStable()`
   after an interaction instead of calling `detectChanges()` manually. This
   matches the modern zoneless guidance and avoids the classic "forgot to run
   change detection" flake.
2. **Stable selectors.** Elements are queried via `data-testid` attributes and
   `By.css`/`By.directive`, not by tag names or CSS classes tied to styling.
   This is exactly what the Angular guide recommends for resilient tests.
3. **Behaviour over implementation.** Assertions check rendered output and public
   signals rather than private internals. Test names read as specifications
   ("should merge quantities when the same product is added again").
4. **Right tool per artifact type.** Pipes use plain instantiation; directives
   use a test host; services use `TestBed.inject`; HTTP uses
   `HttpTestingController`; routing uses `RouterTestingHarness`. This mirrors the
   guide's per-category recommendations.
5. **Clean Vitest hygiene.** Fake timers and spies are consistently restored
   (`vi.useRealTimers()`, `vi.restoreAllMocks()`, `vi.resetAllMocks()`) in
   `afterEach`, and `httpTesting.verify()` guards against un-flushed requests.
6. **Modern binding APIs.** `inputBinding`/`outputBinding` and
   `TestBed.createComponent(Cmp, { bindings })` are used instead of wrapper host
   components where possible — the current recommended approach.

---

## Per-example notes

### `counter` — component with signal state 🟢
Clean baseline example. Groups tests into `rendering` / `interactions` describe
blocks, waits for `whenStable()`, asserts both the signal and the DOM.
- **Suggestion (minor):** `it('should render elements')` asserts query results
  are truthy in `beforeEach`-populated variables; this mostly duplicates what
  every later test implicitly relies on. Fine as documentation, but it is a
  "test the setup" test.

### `name-field` — two-way DOM sync 🟢
Nicely demonstrates reading `DebugElement.properties['value']` /
`['textContent']` to stay type-safe instead of casting `nativeElement`.
- **Suggestion (minor):** The `typeInput` helper silently no-ops if the element
  is not an `HTMLInputElement`. If the selector ever breaks, the test could pass
  vacuously. Consider throwing when the guard fails.

### `greeting` — input/output 🟢
Great modern example of `inputBinding` (signal-driven input) and
`outputBinding` (collecting emissions into an array so you can assert count and
payloads). Covers required-input rendering, reactive updates, and emission
ordering.
- No changes needed.

### `highlight-directive` — attribute directive 🟢
Follows the guide's "host the directive on a test component" pattern precisely,
covers static/bound/default/custom-default/plain cases, and even reads the
directive instance via the element injector. Excellent.
- No changes needed.

### `title-case-pipe` — pipe 🟢
Exactly matches the guide's advice that a pipe is "just a class" — no TestBed,
fast unit tests, good edge cases (empty string, hyphenation, whitespace
preservation, idempotency).
- No changes needed.

### `service-injection` — DI resolution 🟢
Thoroughly demonstrates resolving a `providedIn: 'root'` service through both
`TestBed.inject` and `debugElement.injector`, and proves instance identity.
- **Suggestion (minor):** The identity chain assertions
  (`service === componentInstance.messageService === TestBed.inject(...)`) are
  educational but couple the test to the DI mechanism. In a normal app spec
  you'd usually assert one of these, not all three. Acceptable here because the
  example's *topic* is injection.
- **Note:** `messageService` is exposed as a public field purely so the test can
  read it. That's a small production-code concession for testability; worth a
  comment noting it's for demonstration.

### `cart` — service in isolation + fake collaborator + HTTP 🟢
Strongest service example. Three clearly separated describe blocks:
real collaborator, faked collaborator (`useValue` + `vi.fn`), and direct HTTP
via `HttpTestingController`. Uses `toBeCloseTo` for float math and verifies no
state mutation on the throw path.
- **Suggestion (minor):** In "should ask the collaborator for a discount",
  `void service.total();` triggers the computed for its side effect. A short
  comment already explains this, but asserting on the returned value too would
  make the intent even clearer.

### `http-user` — component + HttpTestingController 🟢
Excellent, comprehensive HTTP component test: happy path, 404, 500, network
error (`req.error`), whitespace trimming, blank-guard (`expectNone`), and
result replacement. `verify()` runs in `afterEach`. The `search()` helper models
real user flow and correctly waits before clicking a possibly-disabled button.
- No changes needed.

### `async-quote` — fake timers + RxJS 🟢
The comments here are genuinely excellent — especially the explanation of why
only `setInterval`/`clearInterval` are faked (so the zoneless render scheduler's
`setTimeout` keeps working). Uses `advanceTimersByTimeAsync` and
`runAllTimersAsync` appropriately, and makes `Math.random` deterministic.
- **Cleanup:** Remove the commented-out `// await fixture.whenStable();` on
  line 84 — dead code.
- **Suggestion (minor):** The last test asserts both the exact expected sentence
  and `FUNNY_SENTENCES.toContain(...)`; the second assertion is redundant given
  the first, though it documents intent.

### `spy-feature-toggle` — spies / mocks 🟢
Best-in-class Vitest spy tour: `mockResolvedValue`, `mockResolvedValueOnce`
sequencing, `mockRejectedValue`, `mockImplementation`, call-order via
`invocationCallOrder`, pass-through spying combined with a `Math.random` spy,
and negative assertions (`not.toHaveBeenCalled`). `restoreAllMocks` in
`afterEach`.
- No changes needed. This file is a good reference for the rest of the team.

### `router-navigation` — router 🟢
Uses `RouterTestingHarness` (the current recommended router-testing tool) with
`provideRouter`, drives state from the URL, asserts `Location.path()`, real
`routerLink` hrefs, click navigation, programmatic navigation, and active-link
class. Very complete.
- No changes needed.

### `nested-components` — parent/child + stubbing 🟢
Good demonstration of `TestBed.overrideComponent` to swap a heavy child for a
stub that mirrors the child's inputs, plus a type-safe `componentInstanceOf`
helper to read child instances without `any`.
- **Weak assertion (fix recommended):** In "should never touch the expensive
  service", the spy is created *after* the component is already rendered:
  ```ts
  const service = TestBed.inject(ActivityService);
  const loadSpy = vi.spyOn(service, 'loadRecentActivity');
  expect(loadSpy).not.toHaveBeenCalled();
  ```
  Because the stub replaces the real child, `loadRecentActivity` was never a
  candidate to be called — and the spy is attached too late to observe any call
  that *had* happened. The assertion therefore can't fail. To make it meaningful,
  spy on the prototype **before** `createComponent` runs (e.g. in `beforeEach`
  via `vi.spyOn(ActivityService.prototype, 'loadRecentActivity')`), then assert
  it was never called.

---

## Cross-cutting recommendations

1. **Trim dead/redundant code.** Remove the commented `whenStable()` in
   `async-quote` and consider dropping the few duplicate "belt-and-suspenders"
   assertions noted above.
2. **Guard test helpers against silent no-ops.** Helpers like `typeInput` that
   branch on `instanceof` should throw (or `expect(...).toBeInstanceOf`) when the
   element isn't found, so a broken selector fails loudly instead of passing
   vacuously.
3. **Spy before the subject is created when asserting "never called".** See the
   `nested-components` note — the general rule is that a negative interaction
   assertion is only valid if the spy exists before the code path could run.
4. **Consider a shared setup helper.** Several specs repeat the same
   `fixture / debugElement / componentInstance / whenStable()` boilerplate in
   `beforeEach`. A tiny factory (like the existing `component-instance.ts`
   helper) could reduce duplication without hiding intent — optional, since the
   explicitness is arguably good for examples.
5. **Naming consistency.** Test descriptions are consistently in the
   "should …" behavioural style — keep enforcing this via review.

---

## Guide alignment checklist

| Guidance | Source | Status |
| --- | --- | --- |
| Import standalone components, don't declare them | Angular | ✅ everywhere |
| Query by stable hooks (`data-testid`), not styling | Angular | ✅ everywhere |
| Prefer `whenStable()` / async over manual `detectChanges` (zoneless) | Angular | ✅ everywhere |
| Test pipes/services as plain classes when possible | Angular | ✅ `title-case-pipe`, isolated `cart` |
| Use `HttpTestingController` + `verify()` for HTTP | Angular | ✅ `http-user`, `cart` |
| Use `RouterTestingHarness` for routing | Angular | ✅ `router-navigation` |
| Stub heavy children; override standalone imports | Angular | ✅ `nested-components` |
| Isolate/restore spies and fake timers per test | Vitest | ✅ `afterEach` restores throughout |
| Control async with fake timers / `*Async` variants | Vitest | ✅ `async-quote`, spies |
| Mock/stub with `vi.fn` / `vi.spyOn`, assert calls | Vitest | ✅ `spy-feature-toggle`, `cart` |
| Restore global mocks (`Math.random`) after use | Vitest | ✅ `restoreAllMocks` |

