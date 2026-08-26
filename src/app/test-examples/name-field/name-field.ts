import { Component, computed, signal } from '@angular/core';

// A tiny component with a single text input.
// It keeps a `name` signal in sync with the input and derives a greeting from it.
@Component({
  selector: 'app-name-field',
  template: `
    <label>
      Name
      <input
        type="text"
        data-testid="name-input"
        [value]="name()"
        (input)="onInput($event)"
      />
    </label>
    <p data-testid="preview" [textContent]="greeting()"></p>
  `,
})
export class NameField {
  readonly name = signal('');
  readonly greeting = computed(() => `Hello, ${this.name()}!`);

  onInput(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.name.set(event.target.value);
    }
  }
}
