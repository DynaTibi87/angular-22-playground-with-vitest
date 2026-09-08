// Runtime generator for order "scenarios" — the nested counterpart to
// workspace.scenarios. It draws a whole order (customer + a random-length list
// of line items) from a range of possible backend responses, mixing documented
// values with realistic drift so the two order cards keep surfacing new shapes.

import { BackendLineItem, BackendOrder } from './order.adapter';

const NAMES = ['Ada Lovelace', 'Grace Hopper', 'Alan Turing', '   ', ''];
const EMAILS: (string | null)[] = [
  'ada@example.com',
  'grace@example.com',
  null,
];
const TIERS = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', ''];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', ''];
const STATUSES = ['PENDING', 'PAID', 'SHIPPED', 'CANCELLED', 'REFUNDED', ''];
const PRODUCTS = [
  'Mechanical keyboard',
  'USB-C hub',
  'Noise-cancelling headphones',
  '27" monitor',
  'Laptop stand',
  '   ', // whitespace → adapter falls back to "Unnamed item"
];
const QUANTITIES = [1, 2, 3, 5, 0, -1, 2.5];
const PRICES = [1999, 4999, 12999, 34999, 0, -500];
const DISCOUNTS: (number | null)[] = [0, 10, 25, 50, null, 150];
const PLACED: (string | null)[] = [
  new Date('2026-08-01').toISOString(),
  new Date('2026-08-20').toISOString(),
  null,
  'not-a-date',
];

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

let counter = 0;

function generateLineItem(index: number): BackendLineItem {
  return {
    sku: `SKU-${(index + 1).toString().padStart(3, '0')}`,
    name: pick(PRODUCTS),
    quantity: pick(QUANTITIES),
    unit_price_cents: pick(PRICES),
    discount_pct: pick(DISCOUNTS),
  };
}

// Draws one order. The line-item count varies from 0 to 4 so the card also
// exercises the empty-order path.
export function generateOrderScenario(): BackendOrder {
  counter += 1;
  const lineCount = Math.floor(Math.random() * 5); // 0..4
  return {
    order_id: `ord-${counter.toString().padStart(4, '0')}`,
    customer: {
      full_name: pick(NAMES),
      email: pick(EMAILS),
      loyalty_tier: pick(TIERS),
    },
    line_items: Array.from({ length: lineCount }, (_, i) =>
      generateLineItem(i),
    ),
    currency: pick(CURRENCIES),
    placed_at: pick(PLACED),
    status: pick(STATUSES),
  };
}
