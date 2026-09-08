// Property-based tests for the nested order adapter.
//
// Nested structures (a customer object + an array of line items) and computed
// money totals are exactly where property-based testing shines: fast-check
// generates orders of every length with hostile quantities, prices and
// discounts, and we assert the folding rules — totals never go negative, the
// total always equals subtotal − discounts, and the output is always safe to
// render — hold for all of them.
import { fc, test } from '@fast-check/vitest';
import { describe, expect, it } from 'vitest';
import {
  BackendOrder,
  CurrencyCode,
  LOYALTY_MAPPING,
  LoyaltyTier,
  OrderStatus,
  STATUS_MAPPING,
  adaptOrder,
  formatMoney,
  normalizeDiscountPct,
  normalizeQuantity,
  toNonNegativeInt,
} from './order.adapter';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const KNOWN_STATUSES: OrderStatus[] = [
  'PENDING',
  'PAID',
  'SHIPPED',
  'CANCELLED',
];
const KNOWN_TIERS: LoyaltyTier[] = ['BRONZE', 'SILVER', 'GOLD'];
const KNOWN_CURRENCIES: CurrencyCode[] = ['USD', 'EUR', 'GBP'];

// A hostile line item: quantities, prices and discounts include zero, negative,
// fractional, null and non-finite values.
const anyLineItem = fc.record({
  sku: fc.string(),
  name: fc.string(),
  quantity: fc.oneof(
    fc.integer({ min: -5, max: 20 }),
    fc.double(),
    fc.constant(Number.POSITIVE_INFINITY),
  ),
  unit_price_cents: fc.oneof(
    fc.integer({ min: -1000, max: 500_000 }),
    fc.constant(Number.NaN),
  ),
  discount_pct: fc.oneof(fc.integer({ min: -50, max: 150 }), fc.constant(null)),
});

const anyOrder: fc.Arbitrary<BackendOrder> = fc.record({
  order_id: fc.uuid(),
  customer: fc.record({
    full_name: fc.string(),
    email: fc.oneof(fc.emailAddress(), fc.constant(null)),
    loyalty_tier: fc.oneof(fc.constantFrom(...KNOWN_TIERS), fc.string()),
  }),
  line_items: fc.array(anyLineItem, { maxLength: 8 }),
  currency: fc.oneof(fc.constantFrom(...KNOWN_CURRENCIES), fc.string()),
  placed_at: fc.oneof(
    fc
      .date({
        min: new Date('2000-01-01T00:00:00.000Z'),
        max: new Date('2099-12-31T23:59:59.999Z'),
        noInvalidDate: true,
      })
      .map((d) => d.toISOString()),
    fc.constant(null),
    fc.constant('not-a-date'),
  ),
  status: fc.oneof(fc.constantFrom(...KNOWN_STATUSES), fc.string()),
});

// A currency symbol always precedes the digits in the money format.
const moneyPattern = /^-?[^\d.-]+\d+\.\d{2}$/;

// ---------------------------------------------------------------------------
// Structural invariants
// ---------------------------------------------------------------------------

describe('adaptOrder — structural invariants', () => {
  test.prop([anyOrder])(
    'never throws and always returns a fully-populated, safe UI model',
    (order) => {
      const ui = adaptOrder(order);

      expect(ui.customerName.length).toBeGreaterThan(0);
      expect(ui.customerEmail.length).toBeGreaterThan(0);
      expect(ui.loyaltyLabel.length).toBeGreaterThan(0);
      expect(ui.statusLabel.length).toBeGreaterThan(0);
      expect(ui.placedLabel.length).toBeGreaterThan(0);

      expect(['success', 'warning', 'danger', 'neutral']).toContain(
        ui.statusColor,
      );
      expect(ui.isEmpty).toBe(order.line_items.length === 0);
      // One UI line per backend line, in order.
      expect(ui.items).toHaveLength(order.line_items.length);
    },
  );

  test.prop([anyOrder])('all money labels are well-formed', (order) => {
    const ui = adaptOrder(order);
    expect(ui.subtotalLabel).toMatch(moneyPattern);
    expect(ui.discountLabel).toMatch(moneyPattern);
    expect(ui.totalLabel).toMatch(moneyPattern);
    for (const line of ui.items) {
      expect(line.lineTotalLabel).toMatch(moneyPattern);
      // Per-line quantity is always a non-negative integer.
      expect(Number.isInteger(line.quantity)).toBe(true);
      expect(line.quantity).toBeGreaterThanOrEqual(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Money-folding rules — the heart of a nested adapter
// ---------------------------------------------------------------------------

// Re-parses a money label like "$12.34" / "-€1.00" back into signed cents so we
// can assert arithmetic relationships between the totals.
function parseMoney(label: string): number {
  const negative = label.startsWith('-');
  const digits = label.replace(/^-/, '').replace(/[^\d.]/g, '');
  const [major, minor] = digits.split('.');
  const cents = Number(major) * 100 + Number(minor);
  return negative ? -cents : cents;
}

describe('adaptOrder — money folding', () => {
  test.prop([anyOrder])(
    'the item count equals the summed quantities',
    (order) => {
      const expected = order.line_items.reduce(
        (sum, item) => sum + normalizeQuantity(item.quantity),
        0,
      );
      expect(adaptOrder(order).itemCount).toBe(expected);
    },
  );

  test.prop([anyOrder])(
    'total always equals subtotal minus discount',
    (order) => {
      const ui = adaptOrder(order);
      expect(parseMoney(ui.totalLabel)).toBe(
        parseMoney(ui.subtotalLabel) - parseMoney(ui.discountLabel),
      );
    },
  );

  test.prop([anyOrder])(
    'subtotal, discount and total are never negative',
    (order) => {
      const ui = adaptOrder(order);
      expect(parseMoney(ui.subtotalLabel)).toBeGreaterThanOrEqual(0);
      expect(parseMoney(ui.discountLabel)).toBeGreaterThanOrEqual(0);
      expect(parseMoney(ui.totalLabel)).toBeGreaterThanOrEqual(0);
    },
  );

  test.prop([anyOrder])('the discount never exceeds the subtotal', (order) => {
    const ui = adaptOrder(order);
    expect(parseMoney(ui.discountLabel)).toBeLessThanOrEqual(
      parseMoney(ui.subtotalLabel),
    );
  });
});

// ---------------------------------------------------------------------------
// Mapping & fallbacks
// ---------------------------------------------------------------------------

describe('adaptOrder — mapping and fallbacks', () => {
  test.prop([anyOrder, fc.constantFrom(...KNOWN_STATUSES)])(
    'known statuses map to the source-of-truth label and color',
    (order, status) => {
      const ui = adaptOrder({ ...order, status });
      expect(ui.statusLabel).toBe(STATUS_MAPPING[status].label);
      expect(ui.statusColor).toBe(STATUS_MAPPING[status].color);
    },
  );

  test.prop([anyOrder, fc.constantFrom(...KNOWN_TIERS)])(
    'known loyalty tiers map to their friendly label',
    (order, tier) => {
      const ui = adaptOrder({
        ...order,
        customer: { ...order.customer, loyalty_tier: tier },
      });
      expect(ui.loyaltyLabel).toBe(LOYALTY_MAPPING[tier]);
    },
  );

  const unknownCurrency = fc
    .string()
    .filter((s) => !(KNOWN_CURRENCIES as string[]).includes(s));

  test.prop([anyOrder, unknownCurrency])(
    'unknown currencies fall back to the generic ¤ symbol',
    (order, currency) => {
      expect(adaptOrder({ ...order, currency }).currencySymbol).toBe('¤');
    },
  );

  it('applies fallbacks for a blank, empty order', () => {
    const ui = adaptOrder({
      order_id: 'ord-0001',
      customer: { full_name: '   ', email: null, loyalty_tier: 'PLATINUM' },
      line_items: [],
      currency: 'JPY',
      placed_at: 'not-a-date',
      status: 'REFUNDED',
    });

    expect(ui.customerName).toBe('Guest customer');
    expect(ui.customerEmail).toBe('No email on file');
    expect(ui.loyaltyLabel).toBe('Standard');
    expect(ui.statusLabel).toBe('Unknown');
    expect(ui.placedLabel).toBe('Not placed yet');
    expect(ui.isEmpty).toBe(true);
    expect(ui.totalLabel).toBe('¤0.00');
  });
});

// ---------------------------------------------------------------------------
// Helper-level properties
// ---------------------------------------------------------------------------

describe('order helpers', () => {
  test.prop([fc.integer({ min: -100, max: 200 })])(
    'normalizeDiscountPct clamps into [0, 100]',
    (pct) => {
      const clamped = normalizeDiscountPct(pct);
      expect(clamped).toBeGreaterThanOrEqual(0);
      expect(clamped).toBeLessThanOrEqual(100);
    },
  );

  it('normalizeDiscountPct maps null to 0', () => {
    expect(normalizeDiscountPct(null)).toBe(0);
  });

  test.prop([fc.integer()])(
    'formatMoney always renders two decimals',
    (cents) => {
      expect(formatMoney(cents, '$')).toMatch(/^-?\$\d+\.\d{2}$/);
    },
  );

  test.prop([fc.double()])(
    'toNonNegativeInt yields a non-negative integer',
    (n) => {
      const result = toNonNegativeInt(n);
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(0);
    },
  );
});
