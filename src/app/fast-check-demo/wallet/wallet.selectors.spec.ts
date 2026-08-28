// Tests for the Wallet feature's selectors.
//
// Selectors are pure projections of state, so they mix well with property-based
// testing too. We check them two ways: through `.projector(...)` (the cheap,
// input-to-output path) and against a full root-state object (the way NgRx
// actually calls them).
import { fc, test } from '@fast-check/vitest';
import { describe, expect, it } from 'vitest';
import { walletFeature } from './wallet.reducer';
import { computeBalance, formatCents, MAX_AMOUNT } from './wallet.logic';
import { Transaction, WalletState } from './wallet.model';

// Wraps a wallet slice in the shape NgRx passes to feature selectors.
function rootState(wallet: WalletState): Record<string, WalletState> {
  return { [walletFeature.name]: wallet };
}

const transaction: fc.Arbitrary<Transaction> = fc.record({
  id: fc.string(),
  kind: fc.constantFrom('deposit', 'withdrawal'),
  amount: fc.integer({ min: 1, max: MAX_AMOUNT }),
});

// A generator for a whole, internally-consistent wallet slice.
const walletState: fc.Arbitrary<WalletState> = fc.array(transaction).map((txs) => ({
  transactions: txs,
  balance: computeBalance(txs),
  error: null,
}));

describe('wallet selectors', () => {
  it('exposes the auto-generated slice selectors', () => {
    const state = rootState({
      balance: 750,
      transactions: [{ id: 'deposit-1', kind: 'deposit', amount: 750 }],
      error: null,
    });

    expect(walletFeature.selectBalance(state)).toBe(750);
    expect(walletFeature.selectError(state)).toBeNull();
    expect(walletFeature.selectTransactions(state)).toHaveLength(1);
  });

  test.prop([fc.integer()])(
    'selectFormattedBalance formats whatever the balance is',
    (cents) => {
      expect(walletFeature.selectFormattedBalance.projector(cents)).toBe(
        formatCents(cents),
      );
    },
  );

  test.prop([walletState])(
    'deposit and withdrawal counts add up to the history length',
    (wallet) => {
      const state = rootState(wallet);
      const deposits = walletFeature.selectDepositCount(state);
      const withdrawals = walletFeature.selectWithdrawalCount(state);

      expect(deposits + withdrawals).toBe(wallet.transactions.length);
    },
  );

  test.prop([walletState])(
    'selectDerivedBalance recomputes the balance from history',
    (wallet) => {
      expect(walletFeature.selectDerivedBalance(rootState(wallet))).toBe(
        computeBalance(wallet.transactions),
      );
    },
  );

  it('counts deposits and withdrawals from a mixed history', () => {
    const state = rootState({
      balance: 300,
      transactions: [
        { id: 'deposit-1', kind: 'deposit', amount: 500 },
        { id: 'withdrawal-2', kind: 'withdrawal', amount: 200 },
        { id: 'deposit-3', kind: 'deposit', amount: 0 },
      ],
      error: null,
    });

    expect(walletFeature.selectDepositCount(state)).toBe(2);
    expect(walletFeature.selectWithdrawalCount(state)).toBe(1);
  });
});

