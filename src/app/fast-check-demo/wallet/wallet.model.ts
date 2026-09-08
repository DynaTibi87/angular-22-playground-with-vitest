// The domain model for the Wallet feature.
//
// Everything here is intentionally plain data. Keeping the shapes small and
// serializable is what makes the pure logic (wallet.logic.ts) and the reducer
// (wallet.reducer.ts) easy to exercise with property-based tests: fast-check
// can generate thousands of these values for free.

// A ledger entry is either money coming in or money going out.
export type TransactionKind = 'deposit' | 'withdrawal';

// A single, immutable ledger entry.
//
// `amount` is stored in whole cents (an integer) so we never deal with binary
// floating-point rounding. This is a deliberate, testable invariant: an amount
// is always a positive integer number of cents.
export interface Transaction {
  readonly id: string;
  readonly kind: TransactionKind;
  readonly amount: number; // positive integer, in cents
}

// The slice of NgRx state owned by this feature.
export interface WalletState {
  // Current balance in cents. Invariant: always >= 0 and always equal to
  // computeBalance(transactions).
  readonly balance: number;
  // The full, ordered history. New entries are appended, never mutated.
  readonly transactions: readonly Transaction[];
  // The last operation's error message, or null when the last op succeeded.
  readonly error: string | null;
}

// The empty wallet every session (and every test) starts from.
export const initialWalletState: WalletState = {
  balance: 0,
  transactions: [],
  error: null,
};
