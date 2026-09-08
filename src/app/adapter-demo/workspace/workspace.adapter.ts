// A pure backend → UI adapter for an enterprise "workspace" screen.
//
// Adapters are total, deterministic functions that translate one shape (a raw
// backend payload, `snake_case`, nullable, occasionally malformed) into another
// (a clean, non-null UI model). That purity is exactly what makes them a prime
// target for PROPERTY-BASED TESTING: instead of a handful of hand-picked
// payloads we can let fast-check throw thousands of realistic — and hostile —
// inputs at the adapter and assert the rules always hold (see the spec).

// ---------------------------------------------------------------------------
// Backend contract (what the API *claims* to send)
// ---------------------------------------------------------------------------

// The roles and statuses the backend documents. In practice the API can drift
// and send an unknown string, so every field is widened with `| string`.
export type UserRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
export type AccountStatus = 'ACTIVE' | 'PAST_DUE' | 'LOCKED' | 'ARCHIVED';

// The raw payload. Note the loose types: strings can be empty, booleans can be
// null, numbers can be out of range, dates arrive as ISO strings (or null).
export interface BackendWorkspace {
  readonly workspace_id: string;
  readonly display_name: string;
  readonly user_role: UserRole | string;
  readonly account_status: AccountStatus | string;
  readonly seat_count: number;
  readonly is_verified: boolean | null;
  readonly trial_ends_at: string | null; // ISO 8601, or null when no trial
}

// ---------------------------------------------------------------------------
// UI model (what the template can safely render)
// ---------------------------------------------------------------------------

export type ThemeColor = 'success' | 'warning' | 'danger' | 'neutral';

// Everything here is non-null and display-ready. The component never has to
// guard against missing data because the adapter already resolved every case.
export interface UIWorkspace {
  readonly id: string;
  readonly title: string;
  readonly roleLabel: string;
  readonly statusLabel: string;
  readonly themeColor: ThemeColor;
  readonly bannerMessage: string;
  readonly canEditSettings: boolean;
  readonly seats: number;
  readonly verified: boolean;
  readonly trialLabel: string;
}

// ---------------------------------------------------------------------------
// Source-of-truth mappings
// ---------------------------------------------------------------------------

// The exact status → (label, color) dictionary. Tests assert the adapter agrees
// with this table for every known status, and falls back gracefully otherwise.
export const STATUS_MAPPING: Record<
  AccountStatus,
  { label: string; color: ThemeColor }
> = {
  ACTIVE: { label: 'Active', color: 'success' },
  PAST_DUE: { label: 'Past due', color: 'warning' },
  LOCKED: { label: 'Locked', color: 'danger' },
  ARCHIVED: { label: 'Archived', color: 'neutral' },
};

export const ROLE_MAPPING: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
};

// A role may edit settings only when it is elevated *and* the account is healthy.
const EDITING_ROLES: ReadonlySet<string> = new Set<UserRole>([
  'ADMIN',
  'MANAGER',
]);

// Safe dictionary lookup. Checking own-ness (rather than a bare index) keeps
// inherited keys like "toString" or "constructor" from resolving to a truthy
// prototype member — a subtle bug fast-check happily surfaces.
function lookup<T>(table: Record<string, T>, key: string): T | undefined {
  return Object.prototype.hasOwnProperty.call(table, key)
    ? table[key]
    : undefined;
}

// ---------------------------------------------------------------------------
// Small, total helpers
// ---------------------------------------------------------------------------

// Turns an ISO date string into a friendly label, defending against null and
// unparseable input (the backend occasionally sends garbage here).
export function formatTrialLabel(iso: string | null): string {
  if (!iso) {
    return 'No active trial';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'No active trial';
  }
  return `Trial ends ${date.toISOString().slice(0, 10)}`;
}

// Seats can never be negative or fractional in the UI, regardless of what the
// backend sends.
export function normalizeSeats(seatCount: number): number {
  if (!Number.isFinite(seatCount)) {
    return 0;
  }
  return Math.max(0, Math.floor(seatCount));
}

// ---------------------------------------------------------------------------
// The adapter
// ---------------------------------------------------------------------------

// Resolves the action banner from the *combination* of status and role — the
// interesting multi-property conditional logic the property tests pin down.
function resolveBanner(
  status: string,
  role: string,
): { message: string; canEdit: boolean } {
  // Rule 1: a locked account blocks everyone, whatever their role.
  if (status === 'LOCKED') {
    return { message: 'Account locked. Contact support.', canEdit: false };
  }

  // Rule 2: a past-due account restricts editing; admins get a billing nudge.
  if (status === 'PAST_DUE') {
    return {
      message:
        role === 'ADMIN'
          ? 'Please update your billing information immediately.'
          : 'Access limited due to pending payment.',
      canEdit: false,
    };
  }

  // Rule 3: an active account lets elevated roles edit.
  if (status === 'ACTIVE') {
    return EDITING_ROLES.has(role)
      ? { message: 'Welcome back to your dashboard.', canEdit: true }
      : { message: 'Welcome back.', canEdit: false };
  }

  // Rule 4: archived (or any unknown status) is read-only.
  if (status === 'ARCHIVED') {
    return { message: 'This workspace is archived.', canEdit: false };
  }

  // Fallback for unmapped combinations or backend drift.
  return { message: 'System status unknown.', canEdit: false };
}

export function adaptWorkspace(backend: BackendWorkspace): UIWorkspace {
  const status = lookup(STATUS_MAPPING, backend.account_status);
  const roleLabel = lookup(ROLE_MAPPING, backend.user_role);
  const banner = resolveBanner(backend.account_status, backend.user_role);

  return {
    id: backend.workspace_id,
    title: backend.display_name.trim() || 'Untitled workspace',
    roleLabel: roleLabel ?? 'Unknown role',
    statusLabel: status ? status.label : 'Unknown status',
    themeColor: status ? status.color : 'neutral',
    bannerMessage: banner.message,
    canEditSettings: banner.canEdit,
    seats: normalizeSeats(backend.seat_count),
    verified: backend.is_verified ?? false,
    trialLabel: formatTrialLabel(backend.trial_ends_at),
  };
}
