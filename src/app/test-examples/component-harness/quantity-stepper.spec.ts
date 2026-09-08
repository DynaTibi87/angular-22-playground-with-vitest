import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { beforeEach, describe, expect, it } from 'vitest';
import { QuantityStepper } from './quantity-stepper';
import { QuantityStepperHarness } from './quantity-stepper.harness';

// A test host that renders three steppers, so we can demonstrate locating one
// harness, all harnesses, and filtering to a specific instance by label.
@Component({
  imports: [QuantityStepper],
  template: `
    <app-quantity-stepper label="Adults" [value]="1" [min]="1" [max]="4" />
    <app-quantity-stepper label="Children" [value]="0" [min]="0" [max]="3" />
    <app-quantity-stepper label="Rooms" [value]="2" [min]="1" [max]="2" />
  `,
})
class TestHost {}

describe('QuantityStepper (component harness)', () => {
  let fixture: ComponentFixture<TestHost>;
  let loader: HarnessLoader;

  beforeEach(async () => {
    // Configure Angular's testing environment.
    // Standalone components are imported, not declared.
    TestBed.configureTestingModule({
      imports: [TestHost],
    });

    // Create a fresh host for every test.
    fixture = TestBed.createComponent(TestHost);

    // A `HarnessLoader` is the entry point for component harnesses. In a Vitest
    // TestBed spec it comes from `TestbedHarnessEnvironment`, which bridges the
    // harness API to Angular's fixture and drives change detection for us - so
    // there is no manual `whenStable()` in the tests below.
    loader = TestbedHarnessEnvironment.loader(fixture);

    // Wait until Angular finishes the initial render.
    await fixture.whenStable();
  });

  describe('loading harnesses', () => {
    it('should load the first stepper on the page', async () => {
      // `getHarness` returns the FIRST matching harness, or throws if none exist.
      const stepper = await loader.getHarness(QuantityStepperHarness);

      expect(await stepper.getLabel()).toBe('Adults');
    });

    it('should load every stepper on the page', async () => {
      // `getAllHarnesses` returns one harness per matching host element.
      const steppers = await loader.getAllHarnesses(QuantityStepperHarness);

      const labels = await Promise.all(steppers.map((s) => s.getLabel()));
      expect(labels).toEqual(['Adults', 'Children', 'Rooms']);
    });

    it('should return null when an optional harness is not found', async () => {
      // `getHarnessOrNull` is the non-throwing variant - handy for "is it there?"
      const missing = await loader.getHarnessOrNull(
        QuantityStepperHarness.with({ label: 'Pets' }),
      );

      expect(missing).toBeNull();
    });
  });

  describe('filtering with a HarnessPredicate', () => {
    it('should find a stepper by its exact label', async () => {
      const stepper = await loader.getHarness(
        QuantityStepperHarness.with({ label: 'Children' }),
      );

      expect(await stepper.getLabel()).toBe('Children');
      expect(await stepper.getValue()).toBe(0);
    });

    it('should find a stepper by a RegExp label', async () => {
      // `stringMatches` accepts a RegExp, enabling partial / case-insensitive
      // matches without the caller knowing the exact text.
      const stepper = await loader.getHarness(
        QuantityStepperHarness.with({ label: /room/i }),
      );

      expect(await stepper.getLabel()).toBe('Rooms');
    });
  });

  describe('interacting through the harness', () => {
    it('should increment the value', async () => {
      const stepper = await loader.getHarness(
        QuantityStepperHarness.with({ label: 'Adults' }),
      );

      // The harness clicks the real button and stabilises change detection; the
      // test never touches the DOM directly.
      await stepper.increment(2);

      expect(await stepper.getValue()).toBe(3);
    });

    it('should decrement the value', async () => {
      const stepper = await loader.getHarness(
        QuantityStepperHarness.with({ label: 'Rooms' }),
      );

      await stepper.decrement();

      expect(await stepper.getValue()).toBe(1);
    });

    it('should not change the value below the minimum', async () => {
      const stepper = await loader.getHarness(
        QuantityStepperHarness.with({ label: 'Children' }),
      );

      // Children starts at its min of 0, so the decrement button is disabled and
      // clicking it is a no-op.
      expect(await stepper.isDecrementDisabled()).toBe(true);

      await stepper.decrement();

      expect(await stepper.getValue()).toBe(0);
    });

    it('should disable the increment button at the maximum', async () => {
      const stepper = await loader.getHarness(
        QuantityStepperHarness.with({ label: 'Adults' }),
      );

      // Step from 1 up to the max of 4; the increment button then disables and
      // further clicks cannot exceed the bound.
      await stepper.increment(3);

      expect(await stepper.getValue()).toBe(4);
      expect(await stepper.isIncrementDisabled()).toBe(true);

      await stepper.increment();
      expect(await stepper.getValue()).toBe(4);
    });
  });
});
