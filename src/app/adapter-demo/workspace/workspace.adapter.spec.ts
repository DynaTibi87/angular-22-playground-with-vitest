// Property-based tests for the workspace backend → UI adapter.
//
// Adapters are pure transformations, so they're an ideal fast-check target:
// generate a *range* of possible backend payloads — the documented values plus
// hostile drift (unknown codes, empty names, null booleans, out-of-range
// numbers, unparseable dates) — and assert the mapping rules never break.
//
// `test.prop([...arbitraries])('name', (values) => { ... })` runs the body ~100
// times with generated inputs and shrinks any failure to a minimal counter-
// example. `test` comes from @fast-check/vitest; `describe`/`expect`/`it` from
// Vitest's globals.
import { fc, test } from '@fast-check/vitest';
import { describe, expect, it } from 'vitest';
import {
  AccountStatus,
  BackendWorkspace,
  ROLE_MAPPING,
  STATUS_MAPPING,
  UserRole,
  adaptWorkspace,
  formatTrialLabel,
  normalizeSeats,
} from './workspace.adapter';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const KNOWN_ROLES: UserRole[] = ['ADMIN', 'MANAGER', 'EMPLOYEE'];
const KNOWN_STATUSES: AccountStatus[] = [
  'ACTIVE',
  'PAST_DUE',
  'LOCKED',
  'ARCHIVED',
];

// A role/status is either one of the documented values or a random string
// (simulating API drift). `fc.oneof` mixes both pools.
const anyRole = fc.oneof(fc.constantFrom(...KNOWN_ROLES), fc.string());
const anyStatus = fc.oneof(fc.constantFrom(...KNOWN_STATUSES), fc.string());

// A trial date is a valid ISO string, null, or unparseable garbage.
const anyTrial = fc.oneof(
  fc.date({ noInvalidDate: true }).map((d) => d.toISOString()),
  fc.constant(null),
  fc.constant('not-a-date'),
);

// A fully randomized backend payload — the "range of possible responses".
const anyBackend: fc.Arbitrary<BackendWorkspace> = fc.record({
  workspace_id: fc.uuid(),
  display_name: fc.string(),
  user_role: anyRole,
  account_status: anyStatus,
  // Include zero, negatives, fractions and non-finite values on purpose.
  seat_count: fc.oneof(
    fc.integer({ min: -10, max: 500 }),
    fc.double(),
    fc.constantFrom(Number.POSITIVE_INFINITY, Number.NaN),
  ),
  is_verified: fc.oneof(fc.boolean(), fc.constant(null)),
  trial_ends_at: anyTrial,
});

// ---------------------------------------------------------------------------
// Invariants: the adapter must ALWAYS produce a safe, display-ready model
// ---------------------------------------------------------------------------

describe('adaptWorkspace — structural invariants', () => {
  test.prop([anyBackend])(
    'never throws and always returns a fully-populated UI model',
    (backend) => {
      const ui = adaptWorkspace(backend);

      // Every string field is present and non-empty.
      expect(ui.title.length).toBeGreaterThan(0);
      expect(ui.roleLabel.length).toBeGreaterThan(0);
      expect(ui.statusLabel.length).toBeGreaterThan(0);
      expect(ui.bannerMessage.length).toBeGreaterThan(0);
      expect(ui.trialLabel.length).toBeGreaterThan(0);

      // Booleans are real booleans (never null/undefined).
      expect(typeof ui.canEditSettings).toBe('boolean');
      expect(typeof ui.verified).toBe('boolean');

      // The theme color is one of the four allowed values.
      expect(['success', 'warning', 'danger', 'neutral']).toContain(
        ui.themeColor,
      );
    },
  );

  test.prop([anyBackend])(
    'seats are always a non-negative integer',
    (backend) => {
      const { seats } = adaptWorkspace(backend);
      expect(Number.isInteger(seats)).toBe(true);
      expect(seats).toBeGreaterThanOrEqual(0);
    },
  );

  test.prop([anyBackend])(
    'null verification always coerces to false',
    (backend) => {
      const ui = adaptWorkspace({ ...backend, is_verified: null });
      expect(ui.verified).toBe(false);
    },
  );
});

// ---------------------------------------------------------------------------
// Mapping: known values map to their exact UI counterparts
// ---------------------------------------------------------------------------

describe('adaptWorkspace — known-value mapping', () => {
  const knownBackend: fc.Arbitrary<BackendWorkspace> = fc.record({
    workspace_id: fc.uuid(),
    display_name: fc
      .string({ minLength: 1 })
      .filter((s) => s.trim().length > 0),
    user_role: fc.constantFrom(...KNOWN_ROLES),
    account_status: fc.constantFrom(...KNOWN_STATUSES),
    seat_count: fc.integer({ min: 0, max: 500 }),
    is_verified: fc.boolean(),
    trial_ends_at: fc.constant(null),
  });

  test.prop([knownBackend])(
    'maps documented status codes to the source-of-truth label and color',
    (backend) => {
      const ui = adaptWorkspace(backend);
      const expected = STATUS_MAPPING[backend.account_status as AccountStatus];
      expect(ui.statusLabel).toBe(expected.label);
      expect(ui.themeColor).toBe(expected.color);
    },
  );

  test.prop([knownBackend])(
    'maps documented roles to their friendly label',
    (backend) => {
      const ui = adaptWorkspace(backend);
      expect(ui.roleLabel).toBe(ROLE_MAPPING[backend.user_role as UserRole]);
    },
  );
});

// ---------------------------------------------------------------------------
// Fallbacks: unknown values degrade gracefully instead of crashing
// ---------------------------------------------------------------------------

describe('adaptWorkspace — graceful fallbacks', () => {
  // Strings that are none of the documented status codes.
  const unknownStatus = fc
    .string()
    .filter((s) => !(KNOWN_STATUSES as string[]).includes(s));

  test.prop([anyBackend, unknownStatus])(
    'unknown statuses fall back to a neutral "Unknown status"',
    (backend, status) => {
      const ui = adaptWorkspace({ ...backend, account_status: status });
      expect(ui.statusLabel).toBe('Unknown status');
      expect(ui.themeColor).toBe('neutral');
      expect(ui.canEditSettings).toBe(false);
    },
  );

  test.prop([anyBackend])(
    'blank display names fall back to "Untitled workspace"',
    (backend) => {
      const ui = adaptWorkspace({ ...backend, display_name: '   ' });
      expect(ui.title).toBe('Untitled workspace');
    },
  );
});

// ---------------------------------------------------------------------------
// Business rules: the multi-property conditional logic (status × role)
// ---------------------------------------------------------------------------

describe('adaptWorkspace — banner business rules', () => {
  test.prop([anyRole])(
    'a LOCKED account blocks editing for every role',
    (role) => {
      const ui = adaptWorkspace(
        base({ account_status: 'LOCKED', user_role: role }),
      );
      expect(ui.canEditSettings).toBe(false);
      expect(ui.bannerMessage).toBe('Account locked. Contact support.');
    },
  );

  test.prop([fc.constantFrom(...KNOWN_ROLES)])(
    'a PAST_DUE account differentiates the billing banner for admins',
    (role) => {
      const ui = adaptWorkspace(
        base({ account_status: 'PAST_DUE', user_role: role }),
      );
      expect(ui.canEditSettings).toBe(false);
      if (role === 'ADMIN') {
        expect(ui.bannerMessage).toContain('update your billing information');
      } else {
        expect(ui.bannerMessage).toContain('Access limited');
      }
    },
  );

  test.prop([fc.constantFrom(...KNOWN_ROLES)])(
    'an ACTIVE account lets only admins and managers edit',
    (role) => {
      const ui = adaptWorkspace(
        base({ account_status: 'ACTIVE', user_role: role }),
      );
      const elevated = role === 'ADMIN' || role === 'MANAGER';
      expect(ui.canEditSettings).toBe(elevated);
    },
  );
});

// ---------------------------------------------------------------------------
// Helper-level properties
// ---------------------------------------------------------------------------

describe('normalizeSeats', () => {
  test.prop([fc.integer({ min: 0, max: 1000 })])(
    'is the identity on non-negative integers',
    (n) => {
      expect(normalizeSeats(n)).toBe(n);
    },
  );

  test.prop([fc.double()])(
    'never returns a negative or fractional value',
    (n) => {
      const seats = normalizeSeats(n);
      expect(seats).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(seats)).toBe(true);
    },
  );
});

describe('formatTrialLabel', () => {
  // Bound the domain to realistic calendar years: ISO strings for years beyond
  // 9999 gain a `+0YYYYY` prefix, which is out of scope for this label.
  const realisticDate = fc.date({
    min: new Date('2000-01-01T00:00:00.000Z'),
    max: new Date('2099-12-31T23:59:59.999Z'),
    noInvalidDate: true,
  });

  test.prop([realisticDate])(
    'renders a "Trial ends YYYY-MM-DD" label for valid dates',
    (date) => {
      expect(formatTrialLabel(date.toISOString())).toMatch(
        /^Trial ends \d{4}-\d{2}-\d{2}$/,
      );
    },
  );

  it('falls back for null and unparseable input', () => {
    expect(formatTrialLabel(null)).toBe('No active trial');
    expect(formatTrialLabel('not-a-date')).toBe('No active trial');
  });
});

// A small factory that fills in sensible defaults so each business-rule test
// only has to state the fields it cares about.
function base(overrides: Partial<BackendWorkspace>): BackendWorkspace {
  return {
    workspace_id: 'ws-0001',
    display_name: 'Acme Corp',
    user_role: 'EMPLOYEE',
    account_status: 'ACTIVE',
    seat_count: 5,
    is_verified: true,
    trial_ends_at: null,
    ...overrides,
  };
}
