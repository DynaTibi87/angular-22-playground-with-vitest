import { Component, computed, inject, signal } from '@angular/core';
import {
  EvaluationContext,
  FeatureFlagService,
  FlagDecision,
} from './feature-flag.service';

@Component({
  selector: 'app-feature-toggle-panel',
  template: `
    <h1>Feature toggle</h1>

    <p data-testid="user">
      User: {{ context().userId }} ({{ context().segment }})
    </p>

    <p data-testid="status">
      Beta feature: {{ betaEnabled() ? 'enabled' : 'disabled' }}
    </p>

    @if (evaluating()) {
      <p data-testid="evaluating">Evaluating rollout…</p>
    }

    @if (decision(); as d) {
      <p data-testid="decision">
        Decision: {{ d.enabled ? 'in' : 'out' }} · reason: {{ d.reason }} ·
        bucket: {{ d.bucket }}
      </p>
    }

    @if (error()) {
      <p data-testid="error">{{ error() }}</p>
    }

    <p data-testid="toggles">Toggle count: {{ toggleCount() }}</p>

    <button
      type="button"
      data-testid="evaluate"
      [disabled]="evaluating()"
      (click)="evaluateRollout()"
    >
      Evaluate rollout
    </button>

    <button type="button" data-testid="toggle" (click)="toggleBeta()">
      Toggle beta feature
    </button>

    <p data-testid="methods">Service methods used: {{ serviceMethods() }}</p>
  `,
})
export class FeatureTogglePanel {
  static readonly BETA_FEATURE = 'beta-dashboard';

  private readonly flags = inject(FeatureFlagService);

  // The user the flag is evaluated for. Changing the segment changes the
  // rollout outcome, which is why tests prefer to stub the evaluation.
  readonly context = signal<EvaluationContext>({
    userId: 'user-42',
    segment: 'free',
  });

  readonly betaEnabled = signal(false);
  readonly decision = signal<FlagDecision | null>(null);
  readonly evaluating = signal(false);
  readonly error = signal('');
  readonly toggleCount = signal(0);

  // Names of the service methods exercised by the interactions, surfaced in
  // the template so the page shows which collaborators are involved.
  readonly serviceMethods = computed(() =>
    [this.flags.evaluateFlag.name, this.flags.recordExposure.name].join(', '),
  );

  // Async orchestration: fetch a rollout decision, reflect it in the UI, and
  // report the exposure. Multiple collaborators + async + error handling make
  // this a meaningful spying target.
  async evaluateRollout(): Promise<void> {
    this.evaluating.set(true);
    this.error.set('');

    try {
      const decision = await this.flags.evaluateFlag(
        FeatureTogglePanel.BETA_FEATURE,
        this.context(),
      );

      this.decision.set(decision);
      this.betaEnabled.set(decision.enabled);
      this.flags.recordExposure(decision, this.context());
    } catch {
      this.error.set('Could not evaluate feature flag');
    } finally {
      this.evaluating.set(false);
    }
  }

  toggleBeta(): void {
    const next = !this.betaEnabled();
    this.betaEnabled.set(next);
    this.toggleCount.update((count) => count + 1);

    // A manual override still records an exposure through the service.
    const decision: FlagDecision = {
      flag: FeatureTogglePanel.BETA_FEATURE,
      enabled: next,
      reason: 'manual-toggle',
      bucket: -1,
    };

    this.decision.set(decision);
    this.flags.recordExposure(decision, this.context());
  }
}
