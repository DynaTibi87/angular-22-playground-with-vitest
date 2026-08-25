import { Component, inject, signal } from '@angular/core';
import { FeatureFlagService, Variant } from './feature-flag.service';

@Component({
  selector: 'app-feature-toggle-panel',
  template: `
    <h3>Feature toggle</h3>

    <p data-testid="status">
      Beta feature: {{ enabled() ? 'enabled' : 'disabled' }}
    </p>

    @if (loading()) {
      <p data-testid="loading">Assigning variant…</p>
    }

    @if (variant(); as v) {
      <p data-testid="variant">Assigned variant: {{ v }}</p>
    }

    @if (error()) {
      <p data-testid="error">{{ error() }}</p>
    }

    <p data-testid="toggles">Toggle count: {{ toggleCount() }}</p>

    <button
      type="button"
      data-testid="join"
      [disabled]="loading()"
      (click)="joinExperiment()"
    >
      {{ joined() ? 'Leave experiment' : 'Join experiment' }}
    </button>

    <button type="button" data-testid="toggle" (click)="toggle()">
      Toggle beta feature
    </button>

    <p data-testid="methods">Service methods used: {{ serviceMethods }}</p>
  `,
})
export class FeatureTogglePanel {
  static readonly EXPERIMENT = 'beta-dashboard';

  private readonly flags = inject(FeatureFlagService);

  readonly enabled = signal(false);
  readonly variant = signal<Variant | null>(null);
  readonly joined = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly toggleCount = signal(0);

  readonly serviceMethods = [
    this.flags.assignVariant.name,
    this.flags.recordExposure.name,
  ].join(', ');

  async joinExperiment(): Promise<void> {
    if (this.joined()) {
      this.joined.set(false);
      this.variant.set(null);
      this.flags.recordExposure(FeatureTogglePanel.EXPERIMENT, 'left');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    try {
      const variant = await this.flags.assignVariant();
      this.variant.set(variant);
      this.joined.set(true);
      this.flags.recordExposure(FeatureTogglePanel.EXPERIMENT, variant);
    } catch {
      this.error.set('Could not assign a variant');
    } finally {
      this.loading.set(false);
    }
  }

  toggle(): void {
    const next = !this.enabled();
    this.enabled.set(next);
    this.toggleCount.update((count) => count + 1);

    this.flags.recordExposure(
      FeatureTogglePanel.EXPERIMENT,
      next ? 'enabled' : 'disabled',
    );
  }
}
