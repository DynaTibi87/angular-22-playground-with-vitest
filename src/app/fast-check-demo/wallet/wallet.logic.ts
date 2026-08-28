// Pure domain logic for the Wallet feature.
//
// None of these functions touch NgRx, Angular, the DOM, the clock, or random
// numbers. They are total, deterministic functions of their inputs - which is
// exactly what makes them the sweet spot for PROPERTY-BASED TESTING. Instead of
// asserting a handful of hand-picked examples, the specs state a *property*
// ("depositing then withdrawing the same amount is a no-op") and let fast-check
// try to break it with hundreds of generated inputs.

import { Transaction } from './wallet.model';

// The largest single amount we accept, in cents ($1,000,000.00). Bounding the
// domain keeps generated test data realistic and avoids integer-overflow noise.
export const MAX_AMOUNT = 100_000_000;

// An amount is valid when it is a positive, whole number of cents within range.
// (No fractional cents, no zero, no negatives, no Infinity/NaN.)
export function isValidAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount > 0 && amount <= MAX_AMOUNT;
}

// Folds a transaction history down to a single balance. Deposits add, and
// withdrawals subtract. This is the "source of truth" the reducer must always
// agree with - a property the reducer spec checks after every action.
export function computeBalance(transactions: readonly Transaction[]): number {
  return transactions.reduce(
    (balance, tx) =>
      tx.kind === 'deposit' ? balance + tx.amount : balance - tx.amount,
    0,
  );
}

// Adds money. Returns the new balance. Assumes the amount is already valid;
// validation lives in isValidAmount so callers can report errors their own way.
export function applyDeposit(balance: number, amount: number): number {
  return balance + amount;
}

// The result of attempting a withdrawal. Modeling "not enough money" as data
// (rather than throwing) keeps the function total and trivially property-testable.
export interface WithdrawalResult {
  readonly ok: boolean;
  readonly balance: number;
}

// Removes money only when the balance can cover it. Overdrafts are refused and
// leave the balance untouched - the invariant that keeps a balance from ever
// going negative.
export function applyWithdrawal(
  balance: number,
  amount: number,
): WithdrawalResult {
  if (amount > balance) {
    return { ok: false, balance };
  }
  return { ok: true, balance: balance - amount };
}

// Formats a cent amount as a human-readable currency string, e.g. 12345 -> "$123.45".
// Always emits exactly two decimal places, matching /^-?\$\d+\.\d{2}$/.
export function formatCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = abs % 100;
  return `${sign}$${dollars}.${remainder.toString().padStart(2, '0')}`;
}

