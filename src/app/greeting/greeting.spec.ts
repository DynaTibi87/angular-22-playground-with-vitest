import {
  DebugElement,
  inputBinding,
  outputBinding,
  signal,
} from '@angular/core';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { Greeting } from './greeting';

describe('Greeting', () => {
  let fixture: ComponentFixture<Greeting>;
  let debugElement: DebugElement;
  let greeting: DebugElement;
  let greetButton: DebugElement;

  // Drives the `name` signal input through `inputBinding`.
  // Updating this signal is the test-side equivalent of a parent
  // changing the value bound with `[name]="..."`.
  let name: ReturnType<typeof signal<string>>;

  // Collects every value emitted by the `greeted` output through
  // `outputBinding`. Using an array (instead of a spy) lets us assert
  // both the payloads and how many times the output fired.
  let emittedGreetings: string[];

  beforeEach(async () => {
    // Configure Angular's testing environment.
    // Standalone components are imported instead of declared.
    TestBed.configureTestingModule({
      imports: [Greeting],
    });

    // Fresh state for every test.
    name = signal('Sample Name');
    emittedGreetings = [];

    // Create the component with real template-style bindings:
    // - `inputBinding` feeds the signal input (like `[name]="name()"`).
    // - `outputBinding` listens to the output (like `(greeted)="..."`).
    fixture = TestBed.createComponent(Greeting, {
      bindings: [
        inputBinding('name', name),
        outputBinding<string>('greeted', (value) =>
          emittedGreetings.push(value),
        ),
      ],
    });

    // Store the component's root DebugElement.
    // It allows us to query elements from the rendered template.
    debugElement = fixture.debugElement;

    // Query the elements needed for the tests.
    greeting = debugElement.query(By.css('[data-testid="greeting"]'));
    greetButton = debugElement.query(By.css('[data-testid="greet"]'));

    // Wait until Angular finishes the initial render.
    await fixture.whenStable();
  });

  it('should render', () => {
    // Verify that Angular successfully created the component.
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render elements', () => {
    // Verify that the elements needed for the tests are present in the template.
    expect(greeting).toBeTruthy();
    expect(greetButton).toBeTruthy();
  });

  it('should render the greeting from the input', () => {
    // Verify that the bound input value is interpolated into the template.
    expect(greeting.properties['innerHTML']).toBe('Hello, Sample Name!');
  });

  it('should update the greeting when the input changes', async () => {
    // Update the bound signal and wait for the re-render.
    name.set('John Dough');
    await fixture.whenStable();

    // Verify the template reflects the new input value.
    expect(greeting.properties['innerHTML']).toContain('Hello, John Dough!');
  });

  it('should emit the greeted output when the button is clicked', () => {
    // Nothing has been emitted yet.
    expect(emittedGreetings).toEqual([]);

    // Trigger the button's bound `(click)` handler directly through the
    // DebugElement, instead of dispatching a DOM event on nativeElement.
    greetButton.triggerEventHandler('click');

    // The output fired once, carrying the current greeting message.
    expect(emittedGreetings).toEqual(['Hello, Sample Name!']);
  });

  it('should emit using the latest input value', async () => {
    // Update the bound signal first and let Angular re-render.
    name.set('Pineapple');
    await fixture.whenStable();

    // Trigger the handler twice to show the array captures every emission in order.
    greetButton.triggerEventHandler('click');
    greetButton.triggerEventHandler('click');

    // Both emissions use the latest input value.
    expect(emittedGreetings).toEqual([
      'Hello, Pineapple!',
      'Hello, Pineapple!',
    ]);
  });
});
