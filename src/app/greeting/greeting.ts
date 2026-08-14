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
  readonly name = input.required<string>();

  readonly greeted = output<string>();

  greet(): void {
    this.greeted.emit(`Hello, ${this.name()}!`);
  }
}
