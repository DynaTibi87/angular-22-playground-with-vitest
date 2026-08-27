import {
  BaseHarnessFilters,
  ComponentHarness,
  HarnessPredicate,
  TestElement,
} from '@angular/cdk/testing';

// Filters accepted by `QuantityStepperHarness.with(...)`. A caller can narrow a
// search to a specific stepper by its label - either an exact string or a
// RegExp for partial / case-insensitive matches. Extending `BaseHarnessFilters`
// inherits the CDK's built-in `selector` / `ancestor` options too.
export interface QuantityStepperHarnessFilters extends BaseHarnessFilters {
  label?: string | RegExp;
}

// A component harness is a class that offers a stable, high-level API for
// interacting with a component in a test. It extends `ComponentHarness` and
// declares a `hostSelector` so the CDK can find every instance on the page.
//
// The harness never leaks DOM details to the test. Instead it exposes verbs the
// user would recognise ("increment", "read the value") and hides *how* those map
// to elements and events. This is the whole value proposition: refactor the
// template freely and only this file needs to change.
export class QuantityStepperHarness extends ComponentHarness {
  // The CSS selector that identifies this component's host element. The CDK uses
  // it to locate harness instances via the `HarnessLoader`.
  static readonly hostSelector = 'app-quantity-stepper';

  // A `HarnessPredicate` lets tests find a *particular* stepper among many, e.g.
  // `loader.getHarness(QuantityStepperHarness.with({ label: 'Adults' }))`.
  // Each `addOption` wires a filter key to an async matcher; `stringMatches`
  // supports both exact strings and RegExps out of the box.
  static with(
    options: QuantityStepperHarnessFilters = {},
  ): HarnessPredicate<QuantityStepperHarness> {
    return new HarnessPredicate(QuantityStepperHarness, options).addOption(
      'label',
      options.label,
      (harness, label) =>
        HarnessPredicate.stringMatches(harness.getLabel(), label),
    );
  }

  // `locatorFor` returns an async function that lazily finds a required child
  // element each time it is called, re-querying the live DOM. It throws if the
  // element is missing, so a broken selector fails loudly instead of silently.
  private readonly label = this.locatorFor('[data-testid="label"]');
  private readonly valueEl = this.locatorFor('[data-testid="value"]');
  private readonly decrementButton = this.locatorFor(
    '[data-testid="decrement"]',
  );
  private readonly incrementButton = this.locatorFor(
    '[data-testid="increment"]',
  );

  // Read the stepper's label text.
  async getLabel(): Promise<string> {
    return (await this.label()).text();
  }

  // Read the current value as a number. The harness parses the rendered text so
  // callers assert on data, not on a string.
  async getValue(): Promise<number> {
    const text = await (await this.valueEl()).text();
    return Number(text);
  }

  // Click the increment button `times` times, awaiting each interaction so the
  // component re-renders between clicks. `TestElement.click()` dispatches a real
  // DOM click and the harness environment stabilises change detection for you.
  async increment(times = 1): Promise<void> {
    await this.clickRepeatedly(await this.incrementButton(), times);
  }

  // Click the decrement button `times` times.
  async decrement(times = 1): Promise<void> {
    await this.clickRepeatedly(await this.decrementButton(), times);
  }

  // Whether the increment button is currently disabled (upper bound reached).
  async isIncrementDisabled(): Promise<boolean> {
    return (await this.incrementButton()).getProperty<boolean>('disabled');
  }

  // Whether the decrement button is currently disabled (lower bound reached).
  async isDecrementDisabled(): Promise<boolean> {
    return (await this.decrementButton()).getProperty<boolean>('disabled');
  }

  private async clickRepeatedly(
    button: TestElement,
    times: number,
  ): Promise<void> {
    for (let i = 0; i < times; i++) {
      await button.click();
    }
  }
}
