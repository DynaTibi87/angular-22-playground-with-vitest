// Property-based tests for the Wallet's pure domain logic.
//
// The pattern comes from the fast-check + Vitest tutorial:
//   https://fast-check.dev/docs/tutorials/setting-up-your-test-environment/property-based-testing-with-vitest/
//
// `test.prop([...arbitraries])('name', (values) => { ... })` runs the body many
// times (100 by default) with generated inputs and shrinks any failure down to
// a minimal counterexample. We import `test` from @fast-check/vitest so it gains
// the `.prop` helper; `describe`/`expect` come from Vitest's globals.
import { fc, test } from '@fast-check/vitest';
import { describe, expect, it } from 'vitest';
import {
  MAX_AMOUNT,
  applyDeposit,
  applyWithdrawal,
  computeBalance,
  formatCents,
  isValidAmount,
} from './wallet.logic';
import { Transaction } from './wallet.model';

// Reusable arbitraries (generators). Keeping amounts within [1, MAX_AMOUNT]
// mirrors the domain and keeps generated data realistic.
const validAmount = fc.integer({ min: 1, max: MAX_AMOUNT });
const balance = fc.integer({ min: 0, max: MAX_AMOUNT });

// A generator for whole transactions, used to exercise computeBalance.
const transaction: fc.Arbitrary<Transaction> = fc.record({
  id: fc.string(),
  kind: fc.constantFrom('deposit', 'withdrawal'),
  amount: validAmount,
});

describe('isValidAmount', () => {
  test.prop([validAmount])(
    'accepts positive whole cents in range',
    (amount) => {
      expect(isValidAmount(amount)).toBe(true);
    },
  );

  test.prop([fc.integer({ min: -MAX_AMOUNT, max: 0 })])(
    'rejects zero and negatives',
    (amount) => {
      expect(isValidAmount(amount)).toBe(false);
    },
  );

  test.prop([fc.float({ noInteger: true, noNaN: true })])(
    'rejects fractional cents',
    (amount) => {
      expect(isValidAmount(amount)).toBe(false);
    },
  );

  // A couple of anchored examples make the intent obvious at a glance.
  it('rejects NaN, Infinity and over-the-limit amounts', () => {
    expect(isValidAmount(Number.NaN)).toBe(false);
    expect(isValidAmount(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isValidAmount(MAX_AMOUNT + 1)).toBe(false);
  });
});

describe('computeBalance', () => {
  it('is zero for an empty history', () => {
    expect(computeBalance([])).toBe(0);
  });

  test.prop([fc.array(transaction)])(
    'equals deposits minus withdrawals',
    (txs) => {
      const deposits = txs
        .filter((t) => t.kind === 'deposit')
        .reduce((sum, t) => sum + t.amount, 0);
      const withdrawals = txs
        .filter((t) => t.kind === 'withdrawal')
        .reduce((sum, t) => sum + t.amount, 0);

      expect(computeBalance(txs)).toBe(deposits - withdrawals);
    },
  );

  test.prop([fc.array(transaction)])(
    'is order-independent for the final total',
    (txs) => {
      const reversed = [...txs].reverse();
      expect(computeBalance(reversed)).toBe(computeBalance(txs));
    },
  );
});

describe('applyDeposit', () => {
  test.prop([balance, validAmount])(
    'increases the balance by the amount',
    (b, a) => {
      expect(applyDeposit(b, a)).toBe(b + a);
    },
  );

  test.prop([balance, validAmount, validAmount])(
    'is commutative in the order of deposits',
    (b, x, y) => {
      expect(applyDeposit(applyDeposit(b, x), y)).toBe(
        applyDeposit(applyDeposit(b, y), x),
      );
    },
  );
});

describe('applyWithdrawal', () => {
  test.prop([balance, validAmount])(
    'never lets the balance go negative',
    (b, a) => {
      const { balance: after } = applyWithdrawal(b, a);
      expect(after).toBeGreaterThanOrEqual(0);
    },
  );

  test.prop([balance, validAmount])(
    'refuses and preserves the balance when funds are short',
    (b, a) => {
      const result = applyWithdrawal(b, b + a); // always more than the balance
      expect(result.ok).toBe(false);
      expect(result.balance).toBe(b);
    },
  );

  // The headline round-trip property: money in, same money out, back to start.
  test.prop([balance, validAmount])(
    'deposit then withdraw of the same amount is a no-op',
    (b, a) => {
      const afterDeposit = applyDeposit(b, a);
      const { ok, balance: after } = applyWithdrawal(afterDeposit, a);
      expect(ok).toBe(true);
      expect(after).toBe(b);
    },
  );
});

describe('formatCents', () => {
  test.prop([fc.integer()])(
    'always renders exactly two decimal places',
    (cents) => {
      expect(formatCents(cents)).toMatch(/^-?\$\d+\.\d{2}$/);
    },
  );

  test.prop([fc.nat()])(
    'never prefixes a sign for non-negative amounts',
    (cents) => {
      expect(formatCents(cents).startsWith('-')).toBe(false);
    },
  );

  test.prop([fc.nat({ max: MAX_AMOUNT })])(
    'round-trips back to the original cent amount',
    (cents) => {
      const [dollars, remainder] = formatCents(cents)
        .replace('$', '')
        .split('.');
      expect(Number(dollars) * 100 + Number(remainder)).toBe(cents);
    },
  );

  it('formats representative examples', () => {
    expect(formatCents(0)).toBe('$0.00');
    expect(formatCents(5)).toBe('$0.05');
    expect(formatCents(1234)).toBe('$12.34');
    expect(formatCents(-1234)).toBe('-$12.34');
  });
});
