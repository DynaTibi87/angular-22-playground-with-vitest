import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-greeting',
  template: `
    <h1 data-testid="greeting">Hello, {{ name() }}!</h1>

    <button type="button" data-testid="greet" (click)="greet()">
      Say hello
    </button>
  `,
})
export class Greeting {
  /**
   * Signal input. The parent binds a value with `[name]="..."`.
   * It is required, so Angular enforces the binding at compile time.
   * Reading the value is done by calling the signal: `name()`.
   */
  readonly name = input.required<string>();

  /**
   * Component output. Replaces the classic `@Output() EventEmitter`.
   * Consumers subscribe with `(greeted)="..."` and receive the emitted payload.
   */
  readonly greeted = output<string>();

  /**
   * Emits the current greeting message through the `greeted` output.
   */
  greet(): void {
    this.greeted.emit(`Hello, ${this.name()}!`);
  }
}

