import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuotePanel } from './quote-panel';
import { FUNNY_SENTENCES, QuoteService } from './quote.service';

describe('QuotePanel', () => {
  let fixture: ComponentFixture<QuotePanel>;
  let debugElement: DebugElement;
  let componentInstance: QuotePanel;
  let loadButton: DebugElement;

  // Reads the currently rendered element, re-querying every time because the
  // template adds/removes these nodes with `@if`.
  const loadingEl = (): DebugElement =>
    debugElement.query(By.css('[data-testid="loading"]'));
  const quoteEl = (): DebugElement =>
    debugElement.query(By.css('[data-testid="quote"]'));

  beforeEach(async () => {
    // Fake ONLY the interval APIs. RxJS's `asyncScheduler` (used by `delay`)
    // schedules through `setInterval`, so this lets us control the simulated
    // HTTP delay deterministically.
    //
    // Crucially, we leave `setTimeout`/`requestAnimationFrame` real: Angular's
    // zoneless change-detection scheduler relies on them to flush renders. If
    // we faked those too, `fixture.whenStable()` would wait forever for a
    // render timer that never fires.
    vi.useFakeTimers();

    TestBed.configureTestingModule({
      imports: [QuotePanel],
    });

    fixture = TestBed.createComponent(QuotePanel);
    fixture.autoDetectChanges();
    debugElement = fixture.debugElement;
    componentInstance = fixture.componentInstance;

    loadButton = debugElement.query(By.css('[data-testid="load"]'));
  });

  afterEach(() => {
    // Restore real timers so other test files are unaffected.
    vi.useRealTimers();
    // Reset every spy (e.g. the `Math.random` spies) back to its original.
    vi.restoreAllMocks();
  });

  it('should render', () => {
    expect(componentInstance).toBeTruthy();
  });

  it('should render the trigger button', () => {
    expect(loadButton).toBeTruthy();
  });

  it('should start empty, without loading or a quote', () => {
    expect(componentInstance.loading()).toBe(false);
    expect(componentInstance.quote()).toBe('');
    expect(loadingEl()).toBeNull();
    expect(quoteEl()).toBeNull();
  });

  it('should show the loading state while the request is pending', async () => {
    // loadButton.nativeElement.click();
    loadButton.triggerEventHandler('click');
    // await fixture.whenStable();
    // fixture.detectChanges();
    // The stream has not emitted yet - the timer is still pending.
    vi.advanceTimersByTime(QuoteService.DELAY_MS - 1);
    expect(componentInstance.loading()).toBe(true);
    expect(componentInstance.quote()).toBe('');
    expect(loadingEl()).toBeTruthy();
    expect(quoteEl()).toBeNull();
  });

  it('should not resolve before the delay elapses', async () => {
    loadButton.nativeElement.click();

    // Advance almost to the delay, but not quite. The async variant also
    // flushes any microtasks the stream queues along the way.
    await vi.advanceTimersByTimeAsync(QuoteService.DELAY_MS - 1);

    // Still loading: one millisecond short of the scheduled emission.
    expect(componentInstance.loading()).toBe(true);
    expect(componentInstance.quote()).toBe('');
  });

  it('should render a quote once the delay elapses', async () => {
    // Make the "random" choice deterministic for a stable assertion.
    vi.spyOn(Math, 'random').mockReturnValue(0);

    loadButton.nativeElement.click();

    // Push the clock past the simulated network delay so the stream emits,
    // then wait for the resulting render to settle.
    // await vi.advanceTimersByTimeAsync(QuoteService.DELAY_MS);
    await vi.runAllTimersAsync();
    // await fixture.whenStable();
    // fixture.detectChanges();
    expect(componentInstance.loading()).toBe(false);
    expect(componentInstance.quote()).toBe(FUNNY_SENTENCES[0]);
    expect(loadingEl()).toBeNull();
    expect(quoteEl().properties['innerHTML']).toContain(FUNNY_SENTENCES[0]);
  });

  it('should always emit a sentence from the pool', async () => {
    // Pick the last sentence deterministically (random just below 1).
    vi.spyOn(Math, 'random').mockReturnValue(0.999);

    loadButton.nativeElement.click();
    // Drains every pending timer at once (vs. advancing a fixed amount).
    await vi.runAllTimersAsync();

    const expected = FUNNY_SENTENCES[FUNNY_SENTENCES.length - 1];
    expect(componentInstance.quote()).toBe(expected);
    expect(FUNNY_SENTENCES).toContain(componentInstance.quote());
  });
});
