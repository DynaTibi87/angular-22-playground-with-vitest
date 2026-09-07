import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should render a link to the test guide', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    // Query by a stable data-testid hook rather than a styling class.
    const link = fixture.debugElement.query(
      By.css('[data-testid="nav-test-guide"]'),
    );
    expect(link.nativeElement.textContent).toContain('Test Guide');
    expect(link.attributes['href']).toContain('/test-guide');
  });
});
