import { Service } from '@angular/core';

export type Variant = 'control' | 'treatment';

@Service()
export class FeatureFlagService {
  async assignVariant(): Promise<Variant> {
    await Promise.resolve();
    return Math.random() < 0.5 ? 'control' : 'treatment';
  }

  recordExposure(experiment: string, detail: string): void {
    console.log(`[exposure] ${experiment} -> ${detail}`);
  }
}
