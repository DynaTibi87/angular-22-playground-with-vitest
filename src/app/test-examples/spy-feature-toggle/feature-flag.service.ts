import { Service } from '@angular/core';

// Who the flag is being evaluated for. Rollout decisions depend on this.
export interface EvaluationContext {
  userId: string;
  segment: 'free' | 'pro' | 'enterprise';
}

// The full, explainable result of an evaluation - not just a boolean. Tests
// stub this so they never depend on the hashing/bucketing internals.
export interface FlagDecision {
  flag: string;
  enabled: boolean;
  reason: 'segment-allow' | 'rollout-in' | 'rollout-out' | 'manual-toggle';
  bucket: number;
}

@Service()
export class FeatureFlagService {
  // Percentage of the "free" segment that gets the feature via gradual rollout.
  static readonly ROLLOUT_PERCENTAGE = 50;

  // Segments that always receive the feature regardless of rollout.
  private readonly allowedSegments = new Set<EvaluationContext['segment']>([
    'pro',
    'enterprise',
  ]);

  // Asynchronously decides whether a flag is on for a given user. The result is
  // driven by a simulated remote-config fetch plus deterministic bucketing, so
  // its output is non-trivial and awkward to reproduce in a test by hand - the
  // exact reason spying/stubbing pays off.
  async evaluateFlag(
    flag: string,
    context: EvaluationContext,
  ): Promise<FlagDecision> {
    await this.fetchRemoteConfig(flag);

    if (this.allowedSegments.has(context.segment)) {
      return { flag, enabled: true, reason: 'segment-allow', bucket: 0 };
    }

    const bucket = this.bucketFor(`${flag}:${context.userId}`);
    const enabled = bucket < FeatureFlagService.ROLLOUT_PERCENTAGE;

    return {
      flag,
      enabled,
      reason: enabled ? 'rollout-in' : 'rollout-out',
      bucket,
    };
  }

  // Fire-and-forget telemetry side effect. Tests spy on this to assert the
  // component reports exposures without actually emitting anything.
  recordExposure(decision: FlagDecision, context: EvaluationContext): void {
    console.log(
      `[exposure] ${context.userId} (${context.segment}) ${decision.flag} -> ` +
        `${decision.enabled} [${decision.reason}, bucket ${decision.bucket}]`,
    );
  }

  // Simulated network round-trip to a remote config service.
  private async fetchRemoteConfig(flag: string): Promise<void> {
    await Promise.resolve(flag);
  }

  // Stable, uniformly distributed 0-99 bucket derived from a string key.
  private bucketFor(key: string): number {
    let hash = 0;

    for (let i = 0; i < key.length; i++) {
      hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    }

    return hash % 100;
  }
}
