import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FeatureTogglePanel } from './feature-toggle-panel';
import {
  EvaluationContext,
  FeatureFlagService,
  FlagDecision,
} from './feature-flag.service';

describe('FeatureTogglePanel', () => {
  let fixture: ComponentFixture<FeatureTogglePanel>;
  let debugElement: DebugElement;
  let componentInstance: FeatureTogglePanel;
  let flags: FeatureFlagService;
  let evaluateButton: DebugElement;
  let toggleButton: DebugElement;
  let status: DebugElement;
  let methods: DebugElement;

  // The context the component evaluates against by default. Mirrored here so
  // assertions can check the exact arguments the service received.
  const defaultContext: EvaluationContext = {
    userId: 'user-42',
    segment: 'free',
  };

  // Re-query nodes rendered conditionally with `@if`.
  const decisionEl = (): DebugElement =>
    debugElement.query(By.css('[data-testid="decision"]'));
  const errorEl = (): DebugElement =>
    debugElement.query(By.css('[data-testid="error"]'));

  // A canned decision used by the stubbing tests, so they never depend on the
  // service's real hashing/bucketing logic.
  const stubbedDecision: FlagDecision = {
    flag: FeatureTogglePanel.BETA_FEATURE,
    enabled: true,
    reason: 'rollout-in',
    bucket: 7,
  };

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
    flags = TestBed.inject(FeatureFlagService);

    evaluateButton = debugElement.query(By.css('[data-testid="evaluate"]'));
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
    expect(evaluateButton).toBeTruthy();
    expect(toggleButton).toBeTruthy();
    expect(status).toBeTruthy();
    expect(methods).toBeTruthy();
  });

  it('should list the service methods used in the interactions', () => {
    // The template surfaces the names of the collaborators the component drives.
    expect(methods.nativeElement.textContent).toContain('evaluateFlag');
    expect(methods.nativeElement.textContent).toContain('recordExposure');
  });

  describe('stubbing a complex async result (evaluateFlag)', () => {
    it('should reflect a stubbed rollout decision without running the real logic', async () => {
      // The real `evaluateFlag` awaits a config fetch and hashes the user into
      // a rollout bucket - non-deterministic to assert by hand. `mockResolvedValue`
      // replaces that entire async computation with a decision we control, so
      // the test stays focused on how the component reacts to a decision.
      const evaluateSpy = vi
        .spyOn(flags, 'evaluateFlag')
        .mockResolvedValue(stubbedDecision);

      evaluateButton.nativeElement.click();
      await fixture.whenStable();

      // The spy was asked to evaluate the right flag for the right context...
      expect(evaluateSpy).toHaveBeenCalledWith(
        FeatureTogglePanel.BETA_FEATURE,
        defaultContext,
      );
      // ...and the stubbed decision drove both the signal and the template.
      expect(componentInstance.betaEnabled()).toBe(true);
      expect(componentInstance.decision()).toEqual(stubbedDecision);
      expect(decisionEl().nativeElement.textContent).toContain('rollout-in');
      expect(decisionEl().nativeElement.textContent).toContain('bucket: 7');
    });

    it('should honor a disabled decision from the stub', async () => {
      vi.spyOn(flags, 'evaluateFlag').mockResolvedValue({
        ...stubbedDecision,
        enabled: false,
        reason: 'rollout-out',
        bucket: 88,
      });

      evaluateButton.nativeElement.click();
      await fixture.whenStable();

      expect(componentInstance.betaEnabled()).toBe(false);
      expect(status.nativeElement.textContent).toContain('disabled');
      expect(decisionEl().nativeElement.textContent).toContain('rollout-out');
    });

    it('should return successive decisions with mockResolvedValueOnce', async () => {
      // Queue distinct results for consecutive calls - handy for exercising a
      // gradual rollout flipping a user in, then out, on re-evaluation.
      vi.spyOn(flags, 'evaluateFlag')
        .mockResolvedValueOnce({ ...stubbedDecision, enabled: true })
        .mockResolvedValueOnce({
          ...stubbedDecision,
          enabled: false,
          reason: 'rollout-out',
        });

      evaluateButton.nativeElement.click();
      await fixture.whenStable();
      expect(componentInstance.betaEnabled()).toBe(true);

      evaluateButton.nativeElement.click();
      await fixture.whenStable();
      expect(componentInstance.betaEnabled()).toBe(false);
    });
  });

  describe('verifying orchestration and side effects', () => {
    it('should record an exposure for the decision it resolved', async () => {
      // Stub the async decision and spy on the telemetry side effect. This is
      // where spying earns its keep: we assert the component wired the resolved
      // decision straight into `recordExposure` without emitting anything real.
      vi.spyOn(flags, 'evaluateFlag').mockResolvedValue(stubbedDecision);
      const exposureSpy = vi
        .spyOn(flags, 'recordExposure')
        .mockImplementation(() => undefined);

      evaluateButton.nativeElement.click();
      await fixture.whenStable();

      expect(exposureSpy).toHaveBeenCalledTimes(1);
      expect(exposureSpy).toHaveBeenCalledWith(stubbedDecision, defaultContext);
    });

    it('should evaluate the flag before recording the exposure', async () => {
      // Spies record a global `invocationCallOrder`, letting us assert the two
      // collaborators ran in the correct sequence, not just that both ran.
      const evaluateSpy = vi
        .spyOn(flags, 'evaluateFlag')
        .mockResolvedValue(stubbedDecision);
      const exposureSpy = vi
        .spyOn(flags, 'recordExposure')
        .mockImplementation(() => undefined);

      evaluateButton.nativeElement.click();
      await fixture.whenStable();

      const evaluatedAt = evaluateSpy.mock.invocationCallOrder[0];
      const recordedAt = exposureSpy.mock.invocationCallOrder[0];
      expect(evaluatedAt).toBeLessThan(recordedAt);
    });

    it('should surface an error and skip telemetry when evaluation fails', async () => {
      // `mockRejectedValue` simulates the remote-config call failing. We then
      // assert the component handled it AND that no exposure was recorded - a
      // negative assertion that only a spy can express.
      vi.spyOn(flags, 'evaluateFlag').mockRejectedValue(
        new Error('config unavailable'),
      );
      const exposureSpy = vi.spyOn(flags, 'recordExposure');

      evaluateButton.nativeElement.click();
      await fixture.whenStable();

      expect(errorEl()).toBeTruthy();
      expect(errorEl().nativeElement.textContent).toContain(
        'Could not evaluate feature flag',
      );
      expect(componentInstance.betaEnabled()).toBe(false);
      expect(exposureSpy).not.toHaveBeenCalled();
    });
  });

  describe('spying while calling through to the real implementation', () => {
    it('should always enable the feature for privileged segments', async () => {
      // No stubbed return value here: the spy calls the REAL async method. We
      // pick a segment that the real logic always allows, so the outcome is
      // deterministic while we still capture what the method actually resolved.
      componentInstance.context.set({ userId: 'user-42', segment: 'pro' });
      const evaluateSpy = vi.spyOn(flags, 'evaluateFlag');

      evaluateButton.nativeElement.click();
      await fixture.whenStable();

      expect(evaluateSpy).toHaveBeenCalledOnce();
      // `mock.results` holds the (async) return value - await it to inspect the
      // real decision the pass-through spy produced.
      const realDecision = await evaluateSpy.mock.results[0].value;
      expect(realDecision.reason).toBe('segment-allow');
      expect(componentInstance.betaEnabled()).toBe(true);
    });
  });

  describe('verifying an interaction on manual toggle (recordExposure)', () => {
    it('should record a manual-toggle exposure when the toggle button is clicked', () => {
      // Suppress the real side effect while still tracking calls.
      const exposureSpy = vi
        .spyOn(flags, 'recordExposure')
        .mockImplementation(() => undefined);

      toggleButton.nativeElement.click();

      expect(componentInstance.betaEnabled()).toBe(true);
      expect(exposureSpy).toHaveBeenCalledTimes(1);
      // `expect.objectContaining` asserts just the fields we care about.
      expect(exposureSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          flag: FeatureTogglePanel.BETA_FEATURE,
          enabled: true,
          reason: 'manual-toggle',
        }),
        defaultContext,
      );
    });

    it('should flip the flag and keep recording on each toggle', async () => {
      const exposureSpy = vi
        .spyOn(flags, 'recordExposure')
        .mockImplementation(() => undefined);

      toggleButton.nativeElement.click();
      await fixture.whenStable();
      expect(componentInstance.betaEnabled()).toBe(true);

      toggleButton.nativeElement.click();
      await fixture.whenStable();
      expect(componentInstance.betaEnabled()).toBe(false);

      expect(exposureSpy).toHaveBeenCalledTimes(2);
      // The most recent recorded decision should reflect the disabled state.
      expect(exposureSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ enabled: false, reason: 'manual-toggle' }),
        defaultContext,
      );
      expect(componentInstance.toggleCount()).toBe(2);
    });
  });
});

