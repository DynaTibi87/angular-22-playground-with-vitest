import { Component, DebugElement, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { Highlight } from './highlight';

// An attribute directive has no template of its own, so it cannot be created
// with `TestBed.createComponent` directly. Instead we host it on a small test
// component that exercises every way the directive is used in real templates:
// - a static color attribute            -> `appHighlight="skyblue"`
// - a bound color that can change        -> `[appHighlight]="boundColor()"`
// - an attribute with no value (default) -> `appHighlight`
// - a bound custom default color         -> `[defaultColor]="..."`
// - a bare element with no directive     -> used as a "control" in assertions
@Component({
  imports: [Highlight],
  template: `
    <h2 appHighlight="skyblue" data-testid="static">Static</h2>
    <h2 [appHighlight]="boundColor()" data-testid="bound">Bound</h2>
    <h2 appHighlight data-testid="default">Default</h2>
    <h2 appHighlight [defaultColor]="'lightgray'" data-testid="custom-default">
      Custom default
    </h2>
    <h2 data-testid="plain">Plain</h2>
  `,
})
class TestHost {
  // Drives the `[appHighlight]` binding, mirroring a parent that changes the
  // color at runtime. Tests update this signal to prove the directive reacts.
  readonly boundColor = signal('cyan');
}

describe('Highlight (attribute directive)', () => {
  let fixture: ComponentFixture<TestHost>;
  let debugElement: DebugElement;
  let host: TestHost;

  // Every element that carries the directive, found by the directive type
  // rather than by CSS - the recommended way to locate directive hosts.
  let highlighted: DebugElement[];

  // Named handles for the individual host elements used across tests.
  let staticEl: DebugElement;
  let boundEl: DebugElement;
  let defaultEl: DebugElement;
  let customDefaultEl: DebugElement;
  let plainEl: DebugElement;

  beforeEach(async () => {
    // Configure Angular's testing environment.
    // The directive is imported by the standalone test host, so nothing else
    // needs to be declared here.
    TestBed.configureTestingModule({
      imports: [TestHost],
    });

    // Create a fresh host instance for every test.
    fixture = TestBed.createComponent(TestHost);
    debugElement = fixture.debugElement;
    host = fixture.componentInstance;

    // `By.directive` returns the DebugElement of every element the directive
    // is attached to - the bare <h2> is intentionally excluded.
    highlighted = debugElement.queryAll(By.directive(Highlight));

    // Query the individual elements by their test ids.
    staticEl = debugElement.query(By.css('[data-testid="static"]'));
    boundEl = debugElement.query(By.css('[data-testid="bound"]'));
    defaultEl = debugElement.query(By.css('[data-testid="default"]'));
    customDefaultEl = debugElement.query(
      By.css('[data-testid="custom-default"]'),
    );
    plainEl = debugElement.query(By.css('[data-testid="plain"]'));

    // Wait until Angular finishes the initial render (runs the effects).
    await fixture.whenStable();
  });

  describe('locating directive hosts', () => {
    it('should render', () => {
      // Verify that Angular successfully created the host component.
      expect(host).toBeTruthy();
    });

    it('should find every element that carries the directive', () => {
      // Four <h2> elements use the directive; the plain <h2> does not.
      expect(highlighted).toHaveLength(4);
    });

    it('should not attach the directive to the bare element', () => {
      // The plain element exists in the DOM...
      expect(plainEl).toBeTruthy();
      // ...but it is not part of the directive matches.
      expect(highlighted).not.toContain(plainEl);
      // ...and it was left with no inline background color.
      expect(plainEl.nativeElement.style.backgroundColor).toBe('');
    });
  });

  describe('applying colors', () => {
    it('should apply a static color from the attribute', () => {
      // `appHighlight="skyblue"` is a plain attribute string, applied verbatim.
      expect(staticEl.nativeElement.style.backgroundColor).toBe('skyblue');
    });

    it('should apply the initial bound color', () => {
      // `[appHighlight]="boundColor()"` starts as 'cyan'.
      expect(boundEl.nativeElement.style.backgroundColor).toBe('cyan');
    });

    it('should fall back to the built-in default color', () => {
      // `appHighlight` with no value is an empty string, so the directive uses
      // its own default of 'yellow'.
      expect(defaultEl.nativeElement.style.backgroundColor).toBe('yellow');
    });

    it('should fall back to a bound custom default color', () => {
      // The empty `appHighlight` still triggers the default path, but here the
      // default is overridden through the `defaultColor` input.
      expect(customDefaultEl.nativeElement.style.backgroundColor).toBe(
        'lightgray',
      );
    });
  });

  describe('reacting to input changes', () => {
    it('should repaint when the bound color changes', async () => {
      // Change the parent-driven color and let the directive's effect re-run.
      host.boundColor.set('magenta');
      await fixture.whenStable();

      expect(boundEl.nativeElement.style.backgroundColor).toBe('magenta');
    });

    it('should fall back to the default when the bound color is cleared', async () => {
      // An empty color hands control back to the default color.
      host.boundColor.set('');
      await fixture.whenStable();

      expect(boundEl.nativeElement.style.backgroundColor).toBe('yellow');
    });
  });

  describe('reading the directive instance', () => {
    it('should expose the directive instance through the element injector', () => {
      // `injector.get` resolves the directive attached to the element, letting
      // us assert its inputs directly instead of only inspecting the DOM.
      const directive = boundEl.injector.get(Highlight);

      expect(directive).toBeInstanceOf(Highlight);
      expect(directive.appHighlight()).toBe('cyan');
      expect(directive.defaultColor()).toBe('yellow');
    });

    it('should report the overridden default on the custom-default host', () => {
      const directive = customDefaultEl.injector.get(Highlight);

      expect(directive.appHighlight()).toBe('');
      expect(directive.defaultColor()).toBe('lightgray');
    });
  });
});

