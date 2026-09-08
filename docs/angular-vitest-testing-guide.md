# Angular + Vitest Testing — Educational Overview

A practical, example-driven guide to testing an **Angular 22** (zoneless,
standalone, signals) application with **Vitest**. It distills the official
[Angular testing guide](https://angular.dev/guide/testing) and the
[Vitest guide](https://vitest.dev/guide/) into the concrete patterns used by the
specs under `src/app/test-examples/`.

> **Audience:** developers writing or reviewing tests in this repo.
> **Goal:** understand _why_ each tool exists and _when_ to reach for it.

> **See also:** [Property-Based Testing with fast-check](./property-based-testing-guide.md)
> — a companion guide covering the `/fast-check` NgRx Wallet feature and when to
> prefer generated inputs over hand-picked examples.

---

## 1. The stack at a glance

| Layer          | Choice                     | Why it matters for tests                                                                                                        |
| -------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Framework      | Angular 22, **zoneless**   | No `zone.js`; change detection is signal-driven. You `await fixture.whenStable()` instead of calling `detectChanges()` by hand. |
| Components     | **Standalone**             | You **import** components in `TestBed`, never `declare` them.                                                                   |
| State          | **Signals**                | Assert on `signal()` values directly and read rendered DOM.                                                                     |
| Test runner    | **Vitest**                 | Fast, Jest-compatible API (`describe/it/expect`), `vi` for mocks/timers, native ESM + TS.                                       |
| Angular bridge | `@analogjs/vitest-angular` | Compiles Angular for Vite/Vitest and registers the zoneless `TestBed`.                                                          |
| DOM            | **jsdom**                  | A simulated browser DOM in Node — no real browser needed for unit/component tests.                                              |
| E2E            | **Playwright** (`e2e/`)    | Real-browser end-to-end tests, separate from Vitest.                                                                            |

### How it's wired together

`vitest.config.mts` registers the Angular Vite plugin and points Vitest at the
setup file:

```ts
// vitest.config.mts
export default defineConfig({
  plugins: [angular()],
  test: {
    globals: true, // describe/it/expect available without imports
    environment: 'jsdom', // a DOM in Node
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    server: { deps: { inline: [/@angular/, /fesm2022/] } },
  },
});
```

`src/test-setup.ts` boots the Angular testing environment in **zoneless** mode —
this is what makes `TestBed` match the running app:

```ts
import '@angular/compiler'; // JIT compile at test time
import '@analogjs/vitest-angular/setup-snapshots'; // fixture snapshot serializers
import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';
setupTestBed(); // zoneless TestBed
```

Run the suite with:

```bash
npm test            # nx test  → vitest run
```

---

## 2. Vitest fundamentals

Vitest's API mirrors Jest, so most testing knowledge transfers directly.

### Structure & lifecycle

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('feature', () => {
  beforeEach(() => {
    /* fresh setup per test */
  });
  afterEach(() => {
    /* cleanup: restore spies/timers */
  });

  it('should do something', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- **`describe`** groups related tests. Nest it to separate "rendering" from
  "interactions" (see `counter.spec.ts`).
- **`it`** (alias `test`) is a single test. Name it as a specification:
  _"should merge quantities when the same product is added again"_.
- **`beforeEach`** runs before every test — the place to build a fresh fixture so
  tests never share state.
- **`afterEach`** is where you **undo global changes**: `vi.useRealTimers()`,
  `vi.restoreAllMocks()`, `httpTesting.verify()`.

### Assertions (`expect`)

Common matchers used throughout the suite:

| Matcher                                                                   | Use                                               |
| ------------------------------------------------------------------------- | ------------------------------------------------- |
| `toBe`                                                                    | Strict `===` (primitives, identity)               |
| `toEqual`                                                                 | Deep structural equality (objects, arrays)        |
| `toBeTruthy` / `toBeNull`                                                 | Presence / absence (e.g. queried DOM nodes)       |
| `toContain`                                                               | Substring in text, or item in array               |
| `toBeInstanceOf`                                                          | Type checks (e.g. an activated route component)   |
| `toBeCloseTo`                                                             | Float math (money totals) — avoids rounding flake |
| `toHaveBeenCalledWith` / `toHaveBeenCalledTimes` / `not.toHaveBeenCalled` | Spy assertions                                    |

### Mocks, spies & stubs with `vi`

- **`vi.fn()`** — a standalone mock function. Use it as a fake collaborator
  (`{ provide: X, useValue: { method: vi.fn() } }`).
- **`vi.spyOn(obj, 'method')`** — wraps a real method so you can observe calls
  _and_ optionally replace behaviour. By default it **calls through**.
- Behaviour controls: `.mockReturnValue`, `.mockResolvedValue`,
  `.mockResolvedValueOnce` (queue per-call results), `.mockRejectedValue`
  (simulate failure), `.mockImplementation` (custom body).
- Inspection: `spy.mock.calls` (arg lists), `spy.mock.results` (return values),
  `spy.mock.invocationCallOrder` (global ordering to assert sequence).

> **Golden rule:** always restore. Call `vi.restoreAllMocks()` in `afterEach` so
> a spy never leaks into the next test. Spy **before** the code under test runs
> if you want a `not.toHaveBeenCalled()` assertion to be meaningful.

### Controlling time — fake timers

```ts
// Fake ONLY interval APIs so the zoneless render scheduler's setTimeout stays real.
vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
// ...
await vi.advanceTimersByTimeAsync(1000); // move the clock and flush microtasks
await vi.runAllTimersAsync(); // drain every pending timer
// ...
vi.useRealTimers(); // in afterEach
```

The `*Async` variants also flush the promise microtasks a stream queues along
the way — essential for RxJS operators like `delay` (see `async-quote`).

---

## 3. Angular testing fundamentals

### `TestBed` — the component test harness

`TestBed` builds a miniature Angular environment (an injector + module context)
for the thing under test:

```ts
TestBed.configureTestingModule({
  imports: [Counter], // standalone components are IMPORTED
  providers: [
    /* services, provideHttpClient(), provideRouter(), ... */
  ],
});

const fixture = TestBed.createComponent(Counter);
```

### The fixture, DebugElement & component instance

```ts
const fixture = TestBed.createComponent(Counter);
const debugElement = fixture.debugElement; // query the template
const componentInstance = fixture.componentInstance; // the class instance
await fixture.whenStable(); // wait for the render
```

- **`fixture`** wraps the created component and its host element.
- **`fixture.componentInstance`** is the class — assert on its signals/methods.
- **`fixture.debugElement`** is the query root. Prefer it over `nativeElement`
  because it's framework-aware and type-safe.

### Querying the DOM — stable selectors

Always query by a stable hook, never by tag or styling class:

```ts
import { By } from '@angular/platform-browser';

const count = debugElement.query(By.css('[data-testid="count"]'));
count.nativeElement.textContent; // read rendered text
count.properties['value']; // type-safe property read (vs. casting nativeElement)
count.triggerEventHandler('click'); // fire a bound handler directly
```

For elements added/removed by `@if`, **re-query on demand** (wrap the query in a
small arrow function) so you never hold a stale reference:

```ts
const errorEl = () => debugElement.query(By.css('[data-testid="error"]'));
```

### Zoneless change detection — the #1 thing to internalize

There is no `zone.js`. After any interaction that changes state, **await the
render** before asserting on the DOM:

```ts
incrementButton.nativeElement.click();
await fixture.whenStable(); // NOT fixture.detectChanges()
expect(componentInstance.count()).toBe(1);
expect(count.nativeElement.textContent).toContain('Count: 1');
```

Forgetting `await fixture.whenStable()` is the classic zoneless flake — the
signal updates but the DOM you assert on hasn't re-rendered yet.

### When you _still_ need `fixture.detectChanges()` in zoneless

Zoneless changes **what triggers** change detection automatically — it does not
remove change detection. `await fixture.whenStable()` is the right **default**,
but `detectChanges()` is still the correct tool in a handful of cases:

| Situation                                          | Prefer                         | Why                                                                                                                   |
| -------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| After a signal write or user interaction           | `await fixture.whenStable()`   | The signal marks the component dirty and the scheduler auto-runs CD; awaiting lets it complete.                       |
| Initial render in an **async** test                | `await fixture.whenStable()`   | `createComponent` schedules the first CD; awaiting flushes it.                                                        |
| Initial render in a **strictly synchronous** test  | `fixture.detectChanges()`      | `createComponent` does **not** render on its own; this forces the first pass without `await`.                         |
| Mutating a **non-signal** field directly           | `fixture.detectChanges()`      | Plain property writes don't notify the scheduler, so nothing is scheduled.                                            |
| Precise pre-async / lifecycle-timing assertions    | `fixture.detectChanges()`      | Synchronous and deterministic; runs `ngOnInit`/`ngDoCheck` at a known point instead of after microtasks/timers drain. |
| Running CD **without** re-checking lifecycle hooks | `fixture.detectChanges(false)` | No `whenStable()` equivalent for skipping the checkNoChanges/lifecycle pass.                                          |

The key mental model: zoneless auto-CD is driven by **signals**, bound events,
and `markForCheck`. If a test reaches in and mutates a plain field, force CD
yourself:

```ts
component.title = 'changed'; // plain property — no signal, nothing scheduled
fixture.detectChanges(); // required to re-render

component.title.set('changed'); // a signal write instead…
await fixture.whenStable(); // …schedules CD, so await it
```

> **Rule of thumb:** default to `await fixture.whenStable()`. Reach for
> `detectChanges()` only when you need synchronous control, are mutating
> non-signal state, or are asserting on exact lifecycle/pre-async timing.

---

## 4. Recipes by artifact type

The right tool depends on _what_ you're testing. This repo has a worked example
for each category under `src/app/test-examples/`.

### 4.1 Component with signal state — `counter`

The baseline pattern: configure `TestBed`, create the fixture, query by
`data-testid`, click, `await whenStable()`, then assert **both** the signal and
the rendered DOM. Group tests into `rendering` / `interactions` describes.

### 4.2 Inputs & outputs — `greeting`

Drive inputs and listen to outputs with the modern binding harness instead of a
wrapper host component:

```ts
const name = signal('Sample Name');
const emittedGreetings: string[] = [];

fixture = TestBed.createComponent(Greeting, {
  bindings: [
    inputBinding('name', name), // like [name]="name()"
    outputBinding<string>('greeted', (v) => emittedGreetings.push(v)), // like (greeted)="..."
  ],
});

name.set('John Dough'); // change the input like a parent would
await fixture.whenStable();
```

Collecting emissions into an **array** (rather than a spy) lets you assert both
the payloads _and_ the count/order.

### 4.3 Attribute directive — `highlight-directive`

Host the directive on a small **test component**, then find it with
`By.directive(...)`. Cover static, bound, default, and custom-default cases, and
read the directive instance via the element injector.

### 4.4 Pipe — `title-case-pipe`

A pipe is _just a class_ with a `transform` method. **No `TestBed`, no fixture,
no DOM** — instantiate with `new` and call it like a function. These are the
fastest tests you can write:

```ts
const pipe = new TitleCasePipe();
expect(pipe.transform('angular')).toBe('Angular');
```

### 4.5 Service in isolation — `cart` / `cart.service.spec.ts`

Test a service by injecting it from `TestBed`, and swap collaborators as needed:

```ts
// Real collaborator
TestBed.configureTestingModule({ providers: [CartService, DiscountService] });
const service = TestBed.inject(CartService);

// Faked collaborator
TestBed.configureTestingModule({
  providers: [
    CartService,
    {
      provide: DiscountService,
      useValue: { discountFor: vi.fn().mockReturnValue(0.1) },
    },
  ],
});
```

Use `toBeCloseTo` for money math and verify no state mutation on error paths.

### 4.6 Dependency injection — `service-injection`

Demonstrates resolving a `providedIn: 'root'` service through both
`TestBed.inject(...)` and `debugElement.injector.get(...)`, and proving the
component and the test share the **same instance**. In real specs, assert one of
these — not the whole identity chain.

### 4.7 HTTP — `http-user` (component) & `cart` (service)

Never hit the network. Provide the real `HttpClient` then override its backend
with the testing one — **order matters**:

```ts
providers: [
  provideHttpClient(),
  provideHttpClientTesting(), // MUST come after — it overrides the real handler
];
const httpTesting = TestBed.inject(HttpTestingController);
```

Drive and answer requests by hand:

```ts
const req = httpTesting.expectOne(`${UserService.BASE_URL}/angular`);
expect(req.request.method).toBe('GET');
req.flush(fakeUser); // success response
// req.flush('Not Found', { status: 404, statusText: 'Not Found' }); // error response
// req.error(new ProgressEvent('network error'));       // transport failure (status 0)

httpTesting.expectNone(() => true); // assert nothing was sent
```

Run `httpTesting.verify()` in `afterEach` — it fails the test if any request was
made but never flushed, catching stray or duplicate calls.

### 4.8 Async & RxJS — `async-quote`

Combine Vitest fake timers with a simulated network delay. Fake **only**
`setInterval`/`clearInterval` (RxJS's `asyncScheduler` uses them) and leave
`setTimeout` real so the zoneless render scheduler keeps working. Make
randomness deterministic with `vi.spyOn(Math, 'random').mockReturnValue(0)`.

### 4.9 Spies & mocks — `spy-feature-toggle`

The reference tour of `vi.spyOn`: stub async results (`mockResolvedValue`),
sequence per-call results (`mockResolvedValueOnce`), simulate failure
(`mockRejectedValue`), assert call **order** via `invocationCallOrder`, spy
while calling through to the real implementation, and express negative
assertions (`not.toHaveBeenCalled`). Always `vi.restoreAllMocks()` in
`afterEach`.

### 4.10 Router — `router-navigation`

Use `RouterTestingHarness` with `provideRouter` — the recommended router-testing
tool. Drive state from the URL and assert on `Location.path()`:

```ts
TestBed.configureTestingModule({
  providers: [provideRouter([{ path: 'panel', component: NavPanel }])],
});
const harness = await RouterTestingHarness.create();

const component = await harness.navigateByUrl('/panel?view=details', NavPanel);
expect(location.path()).toBe('/panel?view=details');
```

Covers real `routerLink` hrefs, click navigation, programmatic `router.navigate`,
and active-link classes.

### 4.11 Nested components & stubbing — `nested-components`

Swap a heavy child for a lightweight stub that mirrors its inputs with
`TestBed.overrideComponent(...)`, and read a child's instance type-safely with
the `componentInstanceOf` helper (`src/testing/component-instance.ts`) instead of
casting `any`.

> **Gotcha:** a `not.toHaveBeenCalled()` assertion is only valid if the spy
> exists **before** the code path could run. To assert a child's service was
> never touched, spy on the prototype in `beforeEach`
> (`vi.spyOn(ActivityService.prototype, 'loadRecentActivity')`) _before_
> `createComponent`.

### 4.12 Component harness — `component-harness`

Wrap a component's DOM in a reusable **CDK `ComponentHarness`** so tests speak
the component's language (`increment()`, `getValue()`) instead of poking at
`data-testid`s. Author a harness by extending `ComponentHarness`, declaring a
`hostSelector`, and using `locatorFor(...)` for child elements:

```ts
export class QuantityStepperHarness extends ComponentHarness {
  static hostSelector = 'app-quantity-stepper';

  // Find a specific instance among many, by label (string or RegExp).
  static with(options: QuantityStepperHarnessFilters = {}) {
    return new HarnessPredicate(QuantityStepperHarness, options).addOption(
      'label',
      options.label,
      (h, label) => HarnessPredicate.stringMatches(h.getLabel(), label),
    );
  }

  private readonly value = this.locatorFor('[data-testid="value"]');
  async getValue() {
    return Number(await (await this.value()).text());
  }
}
```

Drive it from a spec through `TestbedHarnessEnvironment`, which bridges the
harness API to the fixture and **stabilises change detection for you** — so
there is no manual `whenStable()` between interactions:

```ts
const loader = TestbedHarnessEnvironment.loader(fixture);

const stepper = await loader.getHarness(
  QuantityStepperHarness.with({ label: 'Adults' }),
);
await stepper.increment(2);
expect(await stepper.getValue()).toBe(3);

await loader.getAllHarnesses(QuantityStepperHarness); // every instance
await loader.getHarnessOrNull(QuantityStepperHarness.with({ label: 'Pets' })); // null
```

Requires `@angular/cdk`. The payoff: the same harness works in Vitest **and**
Playwright/Protractor, and template refactors touch one file, not every spec.

---

## 5. House style / best practices

These are the conventions the suite follows — keep enforcing them in review.

1. **Import standalone components; never `declare`.**
2. **Query by `data-testid`** via `By.css` / `By.directive`, never by tag or CSS
   styling classes.
3. **Await `fixture.whenStable()`** after interactions as the default — reach
   for `detectChanges()` only for the specific exceptions in §3 (synchronous
   control, non-signal mutations, lifecycle-timing).
4. **Assert behaviour, not internals** — check rendered output and public
   signals; name tests as `should …` specifications.
5. **Pick the right tool per artifact:** plain `new` for pipes, test host for
   directives, `TestBed.inject` for services, `HttpTestingController` for HTTP,
   `RouterTestingHarness` for routing.
6. **Restore global state in `afterEach`:** `vi.useRealTimers()`,
   `vi.restoreAllMocks()`, `httpTesting.verify()`.
7. **Re-query conditionally rendered nodes** (`@if`) through helper functions.
8. **Fresh fixture per test** in `beforeEach` — no shared mutable state.
9. **Make randomness/time deterministic** with spies and fake timers.
10. **Guard test helpers** against silent no-ops — throw on a broken selector so
    a test fails loudly rather than passing vacuously.

---

## 6. Quick reference — imports cheat sheet

```ts
// Vitest
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Angular component testing
import { TestBed, ComponentFixture } from '@angular/core/testing';
import {
  DebugElement,
  inputBinding,
  outputBinding,
  signal,
} from '@angular/core';
import { By } from '@angular/platform-browser';

// HTTP
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

// Router
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

// Component harnesses (Angular CDK)
import {
  ComponentHarness,
  HarnessPredicate,
  HarnessLoader,
} from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
```

| I want to…                              | Reach for                                        | Example                     |
| --------------------------------------- | ------------------------------------------------ | --------------------------- |
| Test rendered state after a click       | `whenStable()` + `By.css`                        | `counter`                   |
| Feed an input / capture an output       | `inputBinding` / `outputBinding`                 | `greeting`                  |
| Test an attribute directive             | test host + `By.directive`                       | `highlight-directive`       |
| Test a pipe                             | `new Pipe()`                                     | `title-case-pipe`           |
| Test a service                          | `TestBed.inject`                                 | `cart`, `service-injection` |
| Fake HTTP                               | `HttpTestingController` + `verify()`             | `http-user`, `cart`         |
| Control time / RxJS delays              | `vi.useFakeTimers` + `*Async`                    | `async-quote`               |
| Stub/observe collaborators              | `vi.spyOn` / `vi.fn`                             | `spy-feature-toggle`        |
| Test navigation                         | `RouterTestingHarness`                           | `router-navigation`         |
| Stub a heavy child                      | `TestBed.overrideComponent`                      | `nested-components`         |
| Wrap a component in a reusable test API | `ComponentHarness` + `TestbedHarnessEnvironment` | `component-harness`         |

---

## 7. Further reading

- Angular testing guide — https://angular.dev/guide/testing
- Vitest guide — https://vitest.dev/guide/
- `docs/test-examples-review.md` — a critical review of each spec in this repo.
