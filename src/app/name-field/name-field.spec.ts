import { Component, DebugElement, computed, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

// A tiny component with a single text input.
// It is defined here (instead of its own file) because it is really small
// and only exists to exercise input-field behaviour in the tests below.
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
class NameField {
  readonly name = signal('');
  readonly greeting = computed(() => `Hello, ${this.name()}!`);

  onInput(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.name.set((event.target as HTMLInputElement).value);
    }
  }
}

describe('NameField', () => {
  let fixture: ComponentFixture<NameField>;
  let debugElement: DebugElement;
  let componentInstance: NameField;
  let input: DebugElement;
  let preview: DebugElement;

  // Simulates typing into the input without touching `nativeElement`.
  // `triggerEventHandler` invokes the bound `(input)` handler directly,
  // so we hand it a minimal event shaped like the one the DOM would emit.
  const typeInput = async (value: string) => {
    input.triggerEventHandler('input', { target: { value } });
    await fixture.whenStable();
  };

  beforeEach(async () => {
    // Configure Angular's testing environment.
    // Standalone components are imported instead of declared.
    TestBed.configureTestingModule({
      imports: [NameField],
    });

    // Create a fresh component instance.
    // Every test gets its own isolated copy.
    fixture = TestBed.createComponent(NameField);

    // Store the component's root DebugElement.
    // It allows us to query elements from the rendered template.
    debugElement = fixture.debugElement;

    // Query the elements needed for the tests.
    input = debugElement.query(By.css('[data-testid="name-input"]'));
    preview = debugElement.query(By.css('[data-testid="preview"]'));

    // Store the component instance for easy access to its properties.
    componentInstance = fixture.componentInstance;

    // Wait until Angular finishes the initial render.
    await fixture.whenStable();
  });

  it('should render', () => {
    // Verify that Angular successfully created the component.
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render elements', () => {
    // Verify that the elements needed for the tests are present in the template.
    expect(input).toBeTruthy();
    expect(preview).toBeTruthy();
  });

  it('should start with an empty input', () => {
    // Verify the initial state of the signal and the bound input value.
    // `properties['value']` reads the [value] binding without nativeElement.
    expect(componentInstance.name()).toBe('');
    expect(input.properties['value']).toBe('');
  });

  it('should update the signal when the user types', async () => {
    // Simulate the user typing into the input field.
    await typeInput('Ada');

    // Verify the signal captured the typed value.
    expect(componentInstance.name()).toBe('Ada');
  });

  it('should reflect the typed value in the template', async () => {
    // Simulate the user typing into the input field.
    await typeInput('Harry');

    // Verify the preview and the input both show the latest value,
    // reading them through DebugElement.properties (typed, no `any`).
    expect(preview.properties['textContent']).toContain('Hello, Harry!');
    expect(input.properties['value']).toBe('Harry');
  });

  it('should keep the input in sync when the signal changes', async () => {
    // Update the signal directly, as a parent or effect might.
    componentInstance.name.set('Potter');

    // Wait until Angular reflects the new value in the DOM.
    await fixture.whenStable();

    // Verify the input value is bound to the signal.
    expect(input.properties['value']).toBe('Potter');
  });
});
