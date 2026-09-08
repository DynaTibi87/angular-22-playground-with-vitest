// Runtime generator for demo "scenarios".
//
// This mirrors, in plain app code, what fast-check does in the spec: it draws a
// backend payload from a *range* of possible responses — the documented happy
// paths plus the messy edge cases (unknown codes, empty names, null booleans,
// out-of-range numbers, unparseable dates). The "Generate" button calls this to
// keep surfacing new combinations for the two cards to render.
//
// It lives outside the adapter (which stays pure) and outside the spec (which
// uses fast-check) so the component has something deterministic to depend on.

import { BackendWorkspace } from './workspace.adapter';

// The pools we sample from. Each mixes valid values with realistic "drift" so
// the UI card demonstrates the adapter's fallbacks as well as its happy path.
const ROLES = ['ADMIN', 'MANAGER', 'EMPLOYEE', 'CONTRACTOR', ''];
const STATUSES = ['ACTIVE', 'PAST_DUE', 'LOCKED', 'ARCHIVED', 'SUSPENDED', ''];
const NAMES = [
  'Acme Corp',
  'Globex',
  'Initech',
  '   ', // whitespace-only → adapter falls back to "Untitled workspace"
  '',
];
const SEAT_COUNTS = [1, 5, 25, 0, -3, 4.5, Number.POSITIVE_INFINITY];
const VERIFIED: (boolean | null)[] = [true, false, null];
const TRIALS: (string | null)[] = [
  new Date('2026-09-30').toISOString(),
  new Date('2026-12-01').toISOString(),
  null,
  'not-a-date', // unparseable → adapter falls back to "No active trial"
];

// Picks a uniformly random element from a non-empty array.
function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

let counter = 0;

// Draws one backend payload from the pools above. Ids are derived from a
// counter so successive scenarios are visibly distinct in the UI.
export function generateBackendScenario(): BackendWorkspace {
  counter += 1;
  return {
    workspace_id: `ws-${counter.toString().padStart(4, '0')}`,
    display_name: pick(NAMES),
    user_role: pick(ROLES),
    account_status: pick(STATUSES),
    seat_count: pick(SEAT_COUNTS),
    is_verified: pick(VERIFIED),
    trial_ends_at: pick(TRIALS),
  };
}
