import { Component, computed, input, model } from '@angular/core';

@Component({
  selector: 'app-quantity-stepper',
  template: `
    <div class="stepper">
      <span class="stepper__label" data-testid="label">{{ label() }}</span>

      <button
        type="button"
        data-testid="decrement"
        aria-label="Decrement"
        [disabled]="!canDecrement()"
        (click)="decrement()"
      >
        −
      </button>

      <span class="stepper__value" data-testid="value">{{ value() }}</span>

      <button
        type="button"
        data-testid="increment"
        aria-label="Increment"
        [disabled]="!canIncrement()"
        (click)="increment()"
      >
        +
      </button>
    </div>
  `,
  styleUrl: './quantity-stepper.scss',
})
export class QuantityStepper {
  readonly label = input('');
  readonly min = input(0);
  readonly max = input(Number.POSITIVE_INFINITY);
  readonly step = input(1);
  readonly value = model(0);

  readonly canDecrement = computed(
    () => this.value() - this.step() >= this.min(),
  );
  readonly canIncrement = computed(
    () => this.value() + this.step() <= this.max(),
  );

  increment(): void {
    if (this.canIncrement()) {
      this.value.update((current) => current + this.step());
    }
  }

  decrement(): void {
    if (this.canDecrement()) {
      this.value.update((current) => current - this.step());
    }
  }
}
