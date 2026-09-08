import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it } from 'vitest';
import { AdapterDemo } from './adapter-demo';
import {
  BackendWorkspace,
  adaptWorkspace,
} from './workspace/workspace.adapter';
import { BackendOrder } from './order/order.adapter';

// Component tests for the AdapterDemo page. Following the repo convention, the
// component is exercised with EXAMPLE-based tests: it only renders and
// dispatches, so property-based coverage belongs to the adapter's own spec.
// Here we drive the component's `backend` signal directly to assert the two
// cards render the raw payload and the adapted UI model correctly.
describe('AdapterDemo', () => {
  let fixture: ComponentFixture<AdapterDemo>;
  let debugElement: DebugElement;

  const query = (testId: string): DebugElement =>
    debugElement.query(By.css(`[data-testid="${testId}"]`));

  const text = (testId: string): string =>
    query(testId).nativeElement.textContent.trim();

  // Sets the component's backend signal to a specific payload and settles.
  async function setBackend(payload: BackendWorkspace): Promise<void> {
    // The signal is a protected field; index access keeps the test decoupled
    // from public API while still driving the real rendering path.
    fixture.componentInstance['backend'].set(payload);
    await fixture.whenStable();
  }

  async function setOrder(payload: BackendOrder): Promise<void> {
    fixture.componentInstance['order'].set(payload);
    await fixture.whenStable();
  }

  const activeAdminPayload: BackendWorkspace = {
    workspace_id: 'ws-0001',
    display_name: 'Acme Corp',
    user_role: 'ADMIN',
    account_status: 'ACTIVE',
    seat_count: 12,
    is_verified: true,
    trial_ends_at: null,
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [AdapterDemo] });
    fixture = TestBed.createComponent(AdapterDemo);
    debugElement = fixture.debugElement;
    await fixture.whenStable();
  });

  it('renders both cards with a scenario on first paint', () => {
    expect(query('backend')).toBeTruthy();
    expect(query('ui')).toBeTruthy();
    // The seeded scenario always has a workspace id in the raw payload.
    expect(text('backend')).toContain('workspace_id');
  });

  it('renders the adapted UI values for an active admin workspace', async () => {
    await setBackend(activeAdminPayload);

    expect(text('status')).toContain('Active');
    expect(text('role')).toContain('Administrator');
    expect(text('can-edit')).toContain('Yes');
    expect(text('seats')).toContain('12');
    expect(text('verified')).toContain('Yes');
    expect(text('banner')).toContain('Welcome back to your dashboard');
  });

  it('shows the locked banner and blocks editing for a locked account', async () => {
    await setBackend({ ...activeAdminPayload, account_status: 'LOCKED' });

    expect(text('status')).toContain('Locked');
    expect(text('can-edit')).toContain('No');
    expect(text('banner')).toContain('Account locked');
  });

  it('applies graceful fallbacks for malformed backend data', async () => {
    await setBackend({
      workspace_id: 'ws-9999',
      display_name: '   ',
      user_role: 'CONTRACTOR', // unknown role
      account_status: 'SUSPENDED', // unknown status
      seat_count: -4,
      is_verified: null,
      trial_ends_at: 'not-a-date',
    });

    expect(text('status')).toContain('Unknown status');
    expect(text('role')).toContain('Unknown role');
    expect(text('seats')).toContain('0');
    expect(text('verified')).toContain('No');
    expect(text('trial')).toContain('No active trial');
  });

  it('the Generate button always produces an adaptable scenario', async () => {
    // Clicking many times must never break the render (the adapter is total).
    for (let i = 0; i < 25; i++) {
      query('generate').nativeElement.click();
      await fixture.whenStable();
      // Whatever was generated, it must still map to a valid, non-empty status.
      expect(text('status').length).toBeGreaterThan(0);
    }
  });

  it('keeps the two cards in sync (raw payload adapts to the shown UI)', async () => {
    await setBackend(activeAdminPayload);
    // The rendered UI must equal the adapter's output for the same payload.
    const expected = adaptWorkspace(activeAdminPayload);
    expect(text('status')).toContain(expected.statusLabel);
    expect(text('role')).toContain(expected.roleLabel);
  });

  it('renders the nested order summary with folded money totals', async () => {
    await setOrder({
      order_id: 'ord-0001',
      customer: {
        full_name: 'Ada Lovelace',
        email: 'ada@example.com',
        loyalty_tier: 'GOLD',
      },
      line_items: [
        {
          sku: 'SKU-001',
          name: 'Keyboard',
          quantity: 2,
          unit_price_cents: 5000,
          discount_pct: 10,
        },
        {
          sku: 'SKU-002',
          name: 'Mouse',
          quantity: 1,
          unit_price_cents: 2000,
          discount_pct: null,
        },
      ],
      currency: 'USD',
      placed_at: null,
      status: 'PAID',
    });

    expect(text('order-status')).toContain('Paid');
    expect(text('order-loyalty')).toContain('Gold member');
    expect(text('order-count')).toContain('3'); // 2 + 1
    // Subtotal 2×$50 + 1×$20 = $120.00; discount 10% of $100 = $10.00.
    expect(text('order-subtotal')).toContain('$120.00');
    expect(text('order-discount')).toContain('$10.00');
    expect(text('order-total')).toContain('$110.00');
    expect(query('order-lines')).toBeTruthy();
  });

  it('shows the empty-order state and applies order fallbacks', async () => {
    await setOrder({
      order_id: 'ord-0002',
      customer: { full_name: '   ', email: null, loyalty_tier: 'PLATINUM' },
      line_items: [],
      currency: 'JPY', // unknown → generic symbol
      placed_at: 'not-a-date',
      status: 'REFUNDED', // unknown
    });

    expect(query('order-empty')).toBeTruthy();
    expect(query('order-lines')).toBeFalsy();
    expect(text('order-status')).toContain('Unknown');
    expect(text('order-loyalty')).toContain('Standard');
    expect(text('order-email')).toContain('No email on file');
    expect(text('order-total')).toContain('¤0.00');
  });
});
