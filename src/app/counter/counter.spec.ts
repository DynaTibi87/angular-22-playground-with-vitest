import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { Counter } from './counter';

describe('Counter', () => {
  let fixture: ComponentFixture<Counter>;
  let debugElement: DebugElement;
  let componentInstance: Counter;
  let count:DebugElement;
  let incrementButton:DebugElement;
  let decrementButton:DebugElement;

  beforeEach(async () => {
    // Configure Angular's testing environment.
    // Standalone components are imported instead of declared.
    TestBed.configureTestingModule({
      imports: [Counter],
    });

    // Create a fresh component instance.
    // Every test gets its own isolated copy.
    fixture = TestBed.createComponent(Counter);

    // Store the component's root DebugElement.
    // It allows us to query elements from the rendered template.
    debugElement = fixture.debugElement;

    // Query the elements needed for the tests.
    count = debugElement.query(By.css('[data-testid="count"]'));
    incrementButton = debugElement.query(By.css('[data-testid="increment"]'));
    decrementButton = debugElement.query(By.css('[data-testid="decrement"]'));

    // Store the component instance for easy access to its properties and methods.
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
    expect(count).toBeTruthy();
    expect(incrementButton).toBeTruthy()
    expect(decrementButton).toBeTruthy()
  })

  it('should render the initial count', () => {
    // Verify that the signal's initial value is correct and rendered.
    expect(componentInstance.count()).toBe(0)
    expect(count.nativeElement.textContent).toContain('Count: 0');
  });

  it('should increment the count', async () => {
    // Simulate the user clicking the Increment button.
    incrementButton.nativeElement.click();

    // Wait until Angular updates the template.
    await fixture.whenStable();

    // Verify that the updated signal value is updated and rendered.
    expect(componentInstance.count()).toBe(1)
    expect(count.nativeElement.textContent).toContain('Count: 1');
  });

  it('should decrement the count', async () => {
    // Simulate the user clicking the Decrement button.
    decrementButton.nativeElement.click();

    // Wait until Angular updates the template.
    await fixture.whenStable();

    // Verify that the updated signal value is rendered.
    expect(componentInstance.count()).toBe(-1)
    expect(count.nativeElement.textContent).toContain('Count: -1');
  });
});
