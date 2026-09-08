import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it } from 'vitest';
import { TruncatePanel } from './truncate-panel';
import { truncate } from './truncate.pipe';

// Component tests for the Truncate widget. They drive the real inputs and assert
// the rendered output matches the pure `truncate` function — the same function
// the property-based specs verify — so the UI and the logic can't drift apart.
describe('TruncatePanel', () => {
  let fixture: ComponentFixture<TruncatePanel>;
  let debugElement: DebugElement;

  const query = (testId: string): DebugElement =>
    debugElement.query(By.css(`[data-testid="${testId}"]`));

  const text = (testId: string): string =>
    query(testId).nativeElement.textContent.trim();

  const setInput = async (
    testId: string,
    value: string,
  ): Promise<void> => {
    const el = query(testId).nativeElement as
      | HTMLInputElement
      | HTMLTextAreaElement;
    el.value = value;
    el.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [TruncatePanel] });
    fixture = TestBed.createComponent(TruncatePanel);
    debugElement = fixture.debugElement;
    await fixture.whenStable();
  });

  it('renders the seeded text truncated to the default limit', () => {
    const seed = 'The quick brown fox jumps over the lazy dog.';
    expect(text('result')).toBe(truncate(seed, 20));
    expect(text('meta')).toContain('Truncated');
  });

  it('shows the text in full once the limit exceeds its length', async () => {
    await setInput('text', 'Short');
    await setInput('limit', '20');
    expect(text('result')).toBe('Short');
    expect(text('meta')).toContain('Fits within the limit');
  });

  it('re-truncates live as the limit changes', async () => {
    await setInput('text', 'abcdefghij');
    await setInput('limit', '4');
    expect(text('result')).toBe('abcd…');
    expect(text('limit-value')).toBe('4');
  });

  it('honours a custom trail marker', async () => {
    await setInput('text', 'abcdefghij');
    await setInput('limit', '3');
    await setInput('trail', ' [more]');
    expect(text('result')).toBe('abc [more]');
  });
});

