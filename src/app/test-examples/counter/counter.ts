import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-counter',
  template: `
    <h1>Counter</h1>

    <button type="button" data-testid="decrement" (click)="decrement()">
      -
    </button>

    <p data-testid="count">Count: {{ count() }}</p>
    <button type="button" data-testid="increment" (click)="increment()">
      +
    </button>
  `,
})
export class Counter {
  readonly count = signal(0);

  increment(): void {
    this.count.update((value) => value + 1);
  }

  decrement(): void {
    this.count.update((value) => value - 1);
  }
}
