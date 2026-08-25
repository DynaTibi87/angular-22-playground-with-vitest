import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FeatureTogglePanel } from './feature-toggle-panel';
import { FeatureFlagService } from './feature-flag.service';

describe('FeatureTogglePanel', () => {
  let fixture: ComponentFixture<FeatureTogglePanel>;
  let debugElement: DebugElement;
  let componentInstance: FeatureTogglePanel;
  let featureFlagService: FeatureFlagService;
  let joinButton: DebugElement;
  let toggleButton: DebugElement;
  let status: DebugElement;
  let methods: DebugElement;

  // The experiment the component always joins. Mirrored here so assertions can
  // check the exact argument the service received.
  const experiment = FeatureTogglePanel.EXPERIMENT;

  // Re-query nodes rendered conditionally with `@if`.
  const variantEl = (): DebugElement =>
    debugElement.query(By.css('[data-testid="variant"]'));
  const errorEl = (): DebugElement =>
    debugElement.query(By.css('[data-testid="error"]'));

  beforeEach(async () => {
    // `FeatureFlagService` is `providedIn: 'root'`, so the TestBed supplies the
    // real instance automatically. We spy on that real instance rather than
    // swapping in a fake - a spy wraps the existing method, so we keep the
    // real object while gaining call tracking and (optionally) stubbing.
    TestBed.configureTestingModule({
      imports: [FeatureTogglePanel],
    });

    fixture = TestBed.createComponent(FeatureTogglePanel);
    debugElement = fixture.debugElement;
    componentInstance = fixture.componentInstance;

    // Resolve the exact same instance the component injected, so any spy we
    // attach here is the one the component actually calls.
    featureFlagService = TestBed.inject(FeatureFlagService);

    joinButton = debugElement.query(By.css('[data-testid="join"]'));
    toggleButton = debugElement.query(By.css('[data-testid="toggle"]'));
    status = debugElement.query(By.css('[data-testid="status"]'));
    methods = debugElement.query(By.css('[data-testid="methods"]'));

    await fixture.whenStable();
  });

  afterEach(() => {
    // Restore every spied method back to its original implementation so spies
    // never leak across tests. Pairs with `vi.spyOn` below.
    vi.restoreAllMocks();
  });

  it('should render', () => {
    expect(componentInstance).toBeTruthy();
  });

  it('should render its elements', () => {
    expect(joinButton).toBeTruthy();
    expect(toggleButton).toBeTruthy();
    expect(status).toBeTruthy();
    expect(methods).toBeTruthy();
  });

  it('should list the service methods used in the interactions', () => {
    // The template surfaces the names of the collaborators the component drives.
    expect(methods.nativeElement.textContent).toContain('assignVariant');
    expect(methods.nativeElement.textContent).toContain('recordExposure');
  });

  describe('stubbing an async result (assignVariant)', () => {
    it('should reflect a stubbed "treatment" assignment', async () => {
      // `assignVariant` is async and simulates a remote call. `mockResolvedValue`
      // replaces that whole round-trip with a value we control, so the test is
      // deterministic and never touches the network.
      const assignSpy = vi
        .spyOn(featureFlagService, 'assignVariant')
        .mockResolvedValue('treatment');

      joinButton.nativeElement.click();
      await fixture.whenStable();

      // The async assignment was requested exactly once...
      expect(assignSpy).toHaveBeenCalledOnce();
      // ...and the stubbed variant drove both the signal and the template.
      expect(componentInstance.variant()).toBe('treatment');
      expect(variantEl().nativeElement.textContent).toContain('treatment');
    });

    it('should reflect a stubbed "control" assignment', async () => {
      vi.spyOn(featureFlagService, 'assignVariant').mockResolvedValue(
        'control',
      );

      joinButton.nativeElement.click();
      await fixture.whenStable();

      expect(componentInstance.variant()).toBe('control');
      expect(variantEl().nativeElement.textContent).toContain('control');
    });

    it('should return successive variants across re-joins with mockResolvedValueOnce', async () => {
      // Queue distinct results for consecutive calls - handy for exercising a
      // re-assignment flipping a user between variants after leaving and
      // re-joining. Only the join clicks trigger an assignment.
      vi.spyOn(featureFlagService, 'assignVariant')
        .mockResolvedValueOnce('treatment')
        .mockResolvedValueOnce('control');

      // Join -> first queued variant.
      joinButton.nativeElement.click();
      await fixture.whenStable();
      expect(componentInstance.variant()).toBe('treatment');

      // Leave -> participation cleared, no assignment consumed.
      joinButton.nativeElement.click();
      await fixture.whenStable();
      expect(componentInstance.variant()).toBeNull();

      // Re-join -> second queued variant.
      joinButton.nativeElement.click();
      await fixture.whenStable();
      expect(componentInstance.variant()).toBe('control');
    });

    it('should toggle participation and record join then leave exposures', async () => {
      vi.spyOn(featureFlagService, 'assignVariant').mockResolvedValue(
        'treatment',
      );
      const exposureSpy = vi
        .spyOn(featureFlagService, 'recordExposure')
        .mockImplementation(() => undefined);

      // Join: assigns a variant and records the variant exposure.
      joinButton.nativeElement.click();
      await fixture.whenStable();
      expect(componentInstance.joined()).toBe(true);
      expect(componentInstance.variant()).toBe('treatment');

      // Leave: clears the variant and records a 'left' exposure - no new
      // assignment happens on the leave path.
      joinButton.nativeElement.click();
      await fixture.whenStable();
      expect(componentInstance.joined()).toBe(false);
      expect(componentInstance.variant()).toBeNull();

      expect(exposureSpy.mock.calls).toEqual([
        [experiment, 'treatment'],
        [experiment, 'left'],
      ]);
    });
  });

  describe('verifying orchestration and side effects', () => {
    it('should record an exposure for the variant it resolved', async () => {
      // Stub the async result and spy on the telemetry side effect. This is
      // where spying earns its keep: we assert the component forwarded the
      // resolved variant into `recordExposure` without emitting anything real.
      vi.spyOn(featureFlagService, 'assignVariant').mockResolvedValue(
        'treatment',
      );
      const exposureSpy = vi
        .spyOn(featureFlagService, 'recordExposure')
        .mockImplementation(() => undefined);

      joinButton.nativeElement.click();
      await fixture.whenStable();

      expect(exposureSpy).toHaveBeenCalledTimes(1);
      expect(exposureSpy).toHaveBeenCalledWith(experiment, 'treatment');
    });

    it('should assign the variant before recording the exposure', async () => {
      // Spies record a global `invocationCallOrder`, letting us assert the two
      // collaborators ran in the correct sequence, not just that both ran.
      const assignSpy = vi
        .spyOn(featureFlagService, 'assignVariant')
        .mockResolvedValue('treatment');
      const exposureSpy = vi
        .spyOn(featureFlagService, 'recordExposure')
        .mockImplementation(() => undefined);

      joinButton.nativeElement.click();
      await fixture.whenStable();

      const assignedAt = assignSpy.mock.invocationCallOrder[0];
      const recordedAt = exposureSpy.mock.invocationCallOrder[0];
      expect(assignedAt).toBeLessThan(recordedAt);
    });

    it('should surface an error and skip telemetry when assignment fails', async () => {
      // `mockRejectedValue` simulates the remote call failing. We then assert
      // the component handled it AND that no exposure was recorded - a negative
      // assertion that only a spy can express.
      vi.spyOn(featureFlagService, 'assignVariant').mockRejectedValue(
        new Error('assignment service unavailable'),
      );
      const exposureSpy = vi.spyOn(featureFlagService, 'recordExposure');

      joinButton.nativeElement.click();
      await fixture.whenStable();

      expect(errorEl()).toBeTruthy();
      expect(errorEl().nativeElement.textContent).toContain(
        'Could not assign a variant',
      );
      expect(componentInstance.variant()).toBeNull();
      expect(exposureSpy).not.toHaveBeenCalled();
    });
  });

  describe('spying while calling through to the real implementation', () => {
    it('should resolve "treatment" when the real randomness lands high', async () => {
      // No stub on `assignVariant`: the spy calls the REAL async method, which
      // is random. Spying on `Math.random` makes that randomness deterministic,
      // so the pass-through result is stable and assertable.
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      const assignSpy = vi.spyOn(featureFlagService, 'assignVariant');

      joinButton.nativeElement.click();
      await fixture.whenStable();

      expect(assignSpy).toHaveBeenCalledOnce();
      // `mock.results` holds the (async) return value - await it to inspect the
      // real variant the pass-through spy produced.
      const realVariant = await assignSpy.mock.results[0].value;
      expect(realVariant).toBe('treatment');
      expect(componentInstance.variant()).toBe('treatment');
    });

    it('should resolve "control" when the real randomness lands low', async () => {
      // Flipping the stubbed random value exercises the other branch, proving
      // both variants are reachable (the earlier bug always picked treatment).
      vi.spyOn(Math, 'random').mockReturnValue(0.1);

      joinButton.nativeElement.click();
      await fixture.whenStable();

      expect(componentInstance.variant()).toBe('control');
    });
  });

  describe('verifying an interaction on manual toggle (recordExposure)', () => {
    it('should record an exposure when the toggle button is clicked', () => {
      // Suppress the real side effect while still tracking calls.
      const exposureSpy = vi
        .spyOn(featureFlagService, 'recordExposure')
        .mockImplementation(() => undefined);

      toggleButton.nativeElement.click();

      expect(componentInstance.enabled()).toBe(true);
      expect(exposureSpy).toHaveBeenCalledTimes(1);
      expect(exposureSpy).toHaveBeenCalledWith(experiment, 'enabled');
    });

    it('should flip the flag and keep recording on each toggle', async () => {
      const exposureSpy = vi
        .spyOn(featureFlagService, 'recordExposure')
        .mockImplementation(() => undefined);

      toggleButton.nativeElement.click();
      await fixture.whenStable();
      expect(componentInstance.enabled()).toBe(true);

      toggleButton.nativeElement.click();
      await fixture.whenStable();
      expect(componentInstance.enabled()).toBe(false);

      expect(exposureSpy).toHaveBeenCalledTimes(2);
      // `mock.calls` is the array of argument-lists, one entry per call.
      expect(exposureSpy.mock.calls[0]).toEqual([experiment, 'enabled']);
      // The most recent call should carry the latest toggled value.
      expect(exposureSpy).toHaveBeenLastCalledWith(experiment, 'disabled');
      expect(componentInstance.toggleCount()).toBe(2);
    });
  });
});
