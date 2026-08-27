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
  styles: [
    `
      :host {
        display: grid;
        grid-column: 1 / -1;
        grid-template-columns: subgrid;
        align-items: center;
      }

      /* Dissolve the wrapper so its four children become the subgrid items. */
      .stepper {
        display: contents;
      }

      .stepper__label {
        font-size: 0.9rem;
        color: #3e4c59;
      }

      .stepper__value {
        min-width: 2ch;
        text-align: center;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }

      .stepper button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        inline-size: 1.75rem;
        block-size: 1.75rem;
        padding: 0;
        border: 1px solid #cbd2d9;
        border-radius: 6px;
        background: #f5f7fa;
        color: #1f2933;
        font-size: 1rem;
        line-height: 1;
        cursor: pointer;
      }

      .stepper button:hover:not(:disabled) {
        background: #e4e7eb;
      }

      .stepper button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `,
  ],
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
