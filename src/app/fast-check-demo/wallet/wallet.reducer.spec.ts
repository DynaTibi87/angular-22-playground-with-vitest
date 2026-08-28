// Tests for the Wallet reducer: pure (state, action) => state.
//
// Because the reducer is pure, we can throw *random sequences of actions* at it
// and assert that invariants survive - the essence of model/property-based
// testing. We combine those properties with a few plain example tests that pin
// down the exact behaviour of each action.
import { fc, test } from '@fast-check/vitest';
import { describe, expect, it } from 'vitest';
import { WalletActions } from './wallet.actions';
import { walletReducer } from './wallet.reducer';
import { computeBalance, MAX_AMOUNT } from './wallet.logic';
import { WalletState, initialWalletState } from './wallet.model';

const validAmount = fc.integer({ min: 1, max: MAX_AMOUNT });

// A generator that produces any one of the feature's actions.
const anyAction = fc.oneof(
  validAmount.map((amount) => WalletActions.deposit({ amount })),
  validAmount.map((amount) => WalletActions.withdraw({ amount })),
  fc.constant(WalletActions.reset()),
  fc.constant(WalletActions.clearError()),
);

// Folds a whole action list through the reducer, starting from empty.
function run(actions: ReturnType<typeof anyAction.generate>['value'][]): WalletState {
  return actions.reduce(walletReducer, initialWalletState);
}

describe('walletReducer', () => {
  // ---- Property-based invariants -------------------------------------------

  test.prop([fc.array(anyAction, { maxLength: 40 })])(
    'keeps the balance non-negative through any action sequence',
    (actions) => {
      let state = initialWalletState;
      for (const action of actions) {
        state = walletReducer(state, action);
        expect(state.balance).toBeGreaterThanOrEqual(0);
      }
    },
  );

  test.prop([fc.array(anyAction, { maxLength: 40 })])(
    'keeps balance equal to the folded transaction history',
    (actions) => {
      const state = run(actions);
      expect(state.balance).toBe(computeBalance(state.transactions));
    },
  );

  test.prop([fc.array(anyAction, { maxLength: 40 })])(
    'only ever appends to the transaction history',
    (actions) => {
      let previous = initialWalletState;
      for (const action of actions) {
        const next = walletReducer(previous, action);
        if (action.type !== WalletActions.reset.type) {
          // History either stays the same or grows by exactly one entry, and
          // the existing entries are never rewritten.
          expect(next.transactions.length).toBeGreaterThanOrEqual(
            previous.transactions.length,
          );
          expect(next.transactions.slice(0, previous.transactions.length)).toEqual(
            previous.transactions,
          );
        }
        previous = next;
      }
    },
  );

  test.prop([fc.array(anyAction, { maxLength: 40 })])(
    'reset always returns the initial state, from anywhere',
    (actions) => {
      const state = run(actions);
      expect(walletReducer(state, WalletActions.reset())).toBe(initialWalletState);
    },
  );

  test.prop([fc.array(anyAction, { maxLength: 40 }), validAmount])(
    'deposit then withdraw of the same amount leaves the balance unchanged',
    (actions, amount) => {
      const before = run(actions);
      const afterDeposit = walletReducer(
        before,
        WalletActions.deposit({ amount }),
      );
      const afterWithdraw = walletReducer(
        afterDeposit,
        WalletActions.withdraw({ amount }),
      );
      expect(afterWithdraw.balance).toBe(before.balance);
    },
  );

  // ---- Example-based behaviour ---------------------------------------------

  it('starts from the empty initial state', () => {
    expect(initialWalletState).toEqual({
      balance: 0,
      transactions: [],
      error: null,
    });
  });

  it('records a deposit and clears any error', () => {
    const state = walletReducer(
      { ...initialWalletState, error: 'old' },
      WalletActions.deposit({ amount: 500 }),
    );

    expect(state.balance).toBe(500);
    expect(state.error).toBeNull();
    expect(state.transactions).toEqual([
      { id: 'deposit-1', kind: 'deposit', amount: 500 },
    ]);
  });

  it('records a withdrawal when funds are sufficient', () => {
    const funded = walletReducer(
      initialWalletState,
      WalletActions.deposit({ amount: 1000 }),
    );
    const state = walletReducer(funded, WalletActions.withdraw({ amount: 400 }));

    expect(state.balance).toBe(600);
    expect(state.transactions[state.transactions.length - 1]).toEqual({
      id: 'withdrawal-2',
      kind: 'withdrawal',
      amount: 400,
    });
  });

  it('refuses an overdraft and leaves the balance untouched', () => {
    const funded = walletReducer(
      initialWalletState,
      WalletActions.deposit({ amount: 300 }),
    );
    const state = walletReducer(funded, WalletActions.withdraw({ amount: 1000 }));

    expect(state.balance).toBe(300);
    expect(state.transactions).toHaveLength(1); // no withdrawal recorded
    expect(state.error).toBe('Insufficient funds for this withdrawal.');
  });

  it('rejects an invalid amount without recording a transaction', () => {
    const state = walletReducer(
      initialWalletState,
      WalletActions.deposit({ amount: 0 }),
    );

    expect(state.balance).toBe(0);
    expect(state.transactions).toEqual([]);
    expect(state.error).toBe('Enter a positive whole amount of cents.');
  });

  it('clears the error without changing the balance', () => {
    const errored: WalletState = {
      balance: 250,
      transactions: [{ id: 'deposit-1', kind: 'deposit', amount: 250 }],
      error: 'Insufficient funds for this withdrawal.',
    };
    const state = walletReducer(errored, WalletActions.clearError());

    expect(state.error).toBeNull();
    expect(state.balance).toBe(250);
    expect(state.transactions).toBe(errored.transactions);
  });
});

