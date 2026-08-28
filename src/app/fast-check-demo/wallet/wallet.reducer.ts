// The Wallet feature: reducer + selectors, bundled with `createFeature`.
//
// A reducer is a PURE function (state, action) => state. That purity is the
// whole reason property-based testing fits so well here: fast-check can throw a
// long, random sequence of actions at it and assert that invariants (balance
// never negative, balance always equals the folded history) hold no matter what.
import { createFeature, createReducer, createSelector, on } from '@ngrx/store';
import { WalletActions } from './wallet.actions';
import {
  Transaction,
  WalletState,
  initialWalletState,
} from './wallet.model';
import {
  applyDeposit,
  applyWithdrawal,
  computeBalance,
  formatCents,
  isValidAmount,
} from './wallet.logic';

// Builds the next sequential, deterministic id. Deterministic ids (rather than
// Date.now()/Math.random()) are what keep the reducer pure and reproducible.
function nextId(state: WalletState, kind: Transaction['kind']): string {
  return `${kind}-${state.transactions.length + 1}`;
}

// Appends a transaction and returns the resulting state. Balance is recomputed
// from the amount so the two can never drift apart.
function record(
  state: WalletState,
  kind: Transaction['kind'],
  amount: number,
  balance: number,
): WalletState {
  const tx: Transaction = { id: nextId(state, kind), kind, amount };
  return {
    balance,
    transactions: [...state.transactions, tx],
    error: null,
  };
}

export const walletReducer = createReducer(
  initialWalletState,

  on(WalletActions.deposit, (state, { amount }): WalletState => {
    // Reject invalid amounts without mutating anything but the error field.
    if (!isValidAmount(amount)) {
      return { ...state, error: 'Enter a positive whole amount of cents.' };
    }
    return record(state, 'deposit', amount, applyDeposit(state.balance, amount));
  }),

  on(WalletActions.withdraw, (state, { amount }): WalletState => {
    if (!isValidAmount(amount)) {
      return { ...state, error: 'Enter a positive whole amount of cents.' };
    }
    const result = applyWithdrawal(state.balance, amount);
    if (!result.ok) {
      // Overdraft refused: the balance is left exactly as it was.
      return { ...state, error: 'Insufficient funds for this withdrawal.' };
    }
    return record(state, 'withdrawal', amount, result.balance);
  }),

  on(WalletActions.reset, (): WalletState => initialWalletState),

  on(WalletActions.clearError, (state): WalletState => ({
    ...state,
    error: null,
  })),
);

// `createFeature` wires the reducer to a named slice and auto-generates a
// selector for every top-level state field (selectBalance, selectTransactions,
// selectError) plus the slice selector (selectWalletState).
export const walletFeature = createFeature({
  name: 'wallet',
  reducer: walletReducer,

  // Derived, memoized selectors composed from the auto-generated ones.
  extraSelectors: ({ selectBalance, selectTransactions }) => ({
    // The balance as a display string, e.g. "$12.34".
    selectFormattedBalance: createSelector(selectBalance, formatCents),

    // How many deposits / withdrawals have happened.
    selectDepositCount: createSelector(
      selectTransactions,
      (txs) => txs.filter((t) => t.kind === 'deposit').length,
    ),
    selectWithdrawalCount: createSelector(
      selectTransactions,
      (txs) => txs.filter((t) => t.kind === 'withdrawal').length,
    ),

    // The balance recomputed straight from history. Handy in the UI as a
    // self-check and mirrors the core reducer invariant.
    selectDerivedBalance: createSelector(selectTransactions, computeBalance),
  }),
});

