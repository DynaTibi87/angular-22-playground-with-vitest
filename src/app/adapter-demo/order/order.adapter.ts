// A second, richer backend → UI adapter: an e-commerce ORDER.
//
// Where the workspace adapter mapped a flat payload, this one flattens a
// *nested* structure — a customer object plus an array of line items — into a
// display-ready summary with computed money totals. Nested data and arrays are
// where adapters (and their property tests) really earn their keep: quantities,
// prices and discounts must fold into a subtotal/total that can never go
// negative or drift, no matter how hostile the payload.

import { ThemeColor } from '../workspace/workspace.adapter';

// ---------------------------------------------------------------------------
// Backend contract (nested, loosely typed, occasionally malformed)
// ---------------------------------------------------------------------------

export type LoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD';
export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'CANCELLED';
export type CurrencyCode = 'USD' | 'EUR' | 'GBP';

export interface BackendCustomer {
  readonly full_name: string;
  readonly email: string | null;
  readonly loyalty_tier: LoyaltyTier | string;
}

export interface BackendLineItem {
  readonly sku: string;
  readonly name: string;
  readonly quantity: number; // may be 0, negative or fractional
  readonly unit_price_cents: number; // may be negative or non-finite
  readonly discount_pct: number | null; // 0..100, or null / out of range
}

export interface BackendOrder {
  readonly order_id: string;
  readonly customer: BackendCustomer;
  readonly line_items: readonly BackendLineItem[];
  readonly currency: CurrencyCode | string;
  readonly placed_at: string | null; // ISO 8601, or null
  readonly status: OrderStatus | string;
}

// ---------------------------------------------------------------------------
// UI model (flat, non-null, display-ready)
// ---------------------------------------------------------------------------

export interface UIOrderLine {
  readonly sku: string;
  readonly name: string;
  readonly quantity: number;
  readonly lineTotalLabel: string;
}

export interface UIOrder {
  readonly id: string;
  readonly customerName: string;
  readonly customerEmail: string;
  readonly loyaltyLabel: string;
  readonly statusLabel: string;
  readonly statusColor: ThemeColor;
  readonly placedLabel: string;
  readonly currencySymbol: string;
  readonly items: readonly UIOrderLine[];
  readonly itemCount: number; // total quantity across all lines
  readonly subtotalLabel: string; // before discounts
  readonly discountLabel: string; // total discount
  readonly totalLabel: string; // subtotal − discounts
  readonly isEmpty: boolean;
}

// ---------------------------------------------------------------------------
// Source-of-truth mappings
// ---------------------------------------------------------------------------

export const STATUS_MAPPING: Record<
  OrderStatus,
  { label: string; color: ThemeColor }
> = {
  PENDING: { label: 'Pending', color: 'warning' },
  PAID: { label: 'Paid', color: 'success' },
  SHIPPED: { label: 'Shipped', color: 'success' },
  CANCELLED: { label: 'Cancelled', color: 'danger' },
};

export const LOYALTY_MAPPING: Record<LoyaltyTier, string> = {
  BRONZE: 'Bronze member',
  SILVER: 'Silver member',
  GOLD: 'Gold member',
};

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
};

// Own-property-safe lookup (see workspace.adapter for the rationale: it keeps
// inherited keys like "toString" from resolving to a prototype member).
function lookup<T>(table: Record<string, T>, key: string): T | undefined {
  return Object.prototype.hasOwnProperty.call(table, key)
    ? table[key]
    : undefined;
}

// ---------------------------------------------------------------------------
// Small, total helpers
// ---------------------------------------------------------------------------

// Domain bounds. Clamping to realistic maxima keeps every money total within
// Number.MAX_SAFE_INTEGER, so integer-cents arithmetic stays exact no matter
// how absurd the backend payload is (fast-check will try 1e20 quantities).
export const MAX_QUANTITY = 100_000;
export const MAX_UNIT_PRICE_CENTS = 100_000_000; // $1,000,000.00

// Clamps any number to a non-negative integer within [0, max] (0 for non-finite).
export function toNonNegativeInt(
  value: number,
  max: number = Number.MAX_SAFE_INTEGER,
): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(max, Math.max(0, Math.floor(value)));
}

// Quantities and prices share the clamp but with domain-specific ceilings.
export function normalizeQuantity(quantity: number): number {
  return toNonNegativeInt(quantity, MAX_QUANTITY);
}

export function normalizeUnitPriceCents(price: number): number {
  return toNonNegativeInt(price, MAX_UNIT_PRICE_CENTS);
}

// Clamps a percentage into [0, 100]; null / non-finite becomes 0.
export function normalizeDiscountPct(pct: number | null): number {
  if (pct === null || !Number.isFinite(pct)) {
    return 0;
  }
  return Math.min(100, Math.max(0, pct));
}

// Formats integer cents with a currency symbol, always to two decimals.
export function formatMoney(cents: number, symbol: string): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const major = Math.floor(abs / 100);
  const minor = abs % 100;
  return `${sign}${symbol}${major}.${minor.toString().padStart(2, '0')}`;
}

function formatPlacedLabel(iso: string | null): string {
  if (!iso) {
    return 'Not placed yet';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'Not placed yet';
  }
  return `Placed ${date.toISOString().slice(0, 10)}`;
}

// The gross (pre-discount) and discount totals for a single line, in cents.
// Kept separate so the adapter's totals fold cleanly and stay property-testable.
function lineTotals(item: BackendLineItem): {
  gross: number;
  discount: number;
} {
  const quantity = normalizeQuantity(item.quantity);
  const unitPrice = normalizeUnitPriceCents(item.unit_price_cents);
  const gross = quantity * unitPrice;
  const discount = Math.round(
    (gross * normalizeDiscountPct(item.discount_pct)) / 100,
  );
  return { gross, discount };
}

// ---------------------------------------------------------------------------
// The adapter
// ---------------------------------------------------------------------------

export function adaptOrder(backend: BackendOrder): UIOrder {
  const status = lookup(STATUS_MAPPING, backend.status);
  const symbol = lookup(CURRENCY_SYMBOLS, backend.currency) ?? '¤';

  // Fold the nested line items into per-line views and running money totals.
  let subtotal = 0;
  let discountTotal = 0;
  let itemCount = 0;

  const items: UIOrderLine[] = backend.line_items.map((item) => {
    const { gross, discount } = lineTotals(item);
    subtotal += gross;
    discountTotal += discount;
    itemCount += normalizeQuantity(item.quantity);

    return {
      sku: item.sku,
      name: item.name.trim() || 'Unnamed item',
      quantity: normalizeQuantity(item.quantity),
      lineTotalLabel: formatMoney(gross - discount, symbol),
    };
  });

  return {
    id: backend.order_id,
    customerName: backend.customer.full_name.trim() || 'Guest customer',
    customerEmail: backend.customer.email?.trim() || 'No email on file',
    loyaltyLabel:
      lookup(LOYALTY_MAPPING, backend.customer.loyalty_tier) ?? 'Standard',
    statusLabel: status ? status.label : 'Unknown',
    statusColor: status ? status.color : 'neutral',
    placedLabel: formatPlacedLabel(backend.placed_at),
    currencySymbol: symbol,
    items,
    itemCount,
    subtotalLabel: formatMoney(subtotal, symbol),
    discountLabel: formatMoney(discountTotal, symbol),
    totalLabel: formatMoney(subtotal - discountTotal, symbol),
    isEmpty: items.length === 0,
  };
}
