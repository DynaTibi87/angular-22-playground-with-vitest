import { Component, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { WalletActions } from './wallet.actions';
import { walletFeature } from './wallet.reducer';

// The UI over the Wallet feature. It holds no business logic of its own: it
// reads derived state from the store as signals and dispatches actions. All the
// interesting rules live in the pure logic and the reducer, which is where the
// property-based tests focus.
@Component({
  selector: 'app-wallet-panel',
  template: `
    <h3>Wallet</h3>

    <p data-testid="balance" class="wallet__balance">
      Balance: <strong>{{ formattedBalance() }}</strong>
    </p>

    <label class="wallet__amount">
      Amount (cents)
      <input
        type="number"
        min="1"
        step="1"
        data-testid="amount"
        [value]="amount()"
        (input)="onAmountInput($event)"
      />
    </label>

    <div class="wallet__actions">
      <button type="button" data-testid="deposit" (click)="deposit()">
        Deposit
      </button>
      <button type="button" data-testid="withdraw" (click)="withdraw()">
        Withdraw
      </button>
      <button type="button" data-testid="reset" (click)="reset()">Reset</button>
    </div>

    @if (error(); as message) {
      <p data-testid="error" class="wallet__error" role="alert">
        {{ message }}
        <button type="button" data-testid="dismiss" (click)="dismiss()">
          Dismiss
        </button>
      </p>
    }

    <p data-testid="counts" class="wallet__counts">
      {{ depositCount() }} deposit(s) · {{ withdrawalCount() }} withdrawal(s)
    </p>

    @if (transactions().length > 0) {
      <ul data-testid="history" class="wallet__history">
        @for (tx of transactions(); track tx.id) {
          <li>{{ tx.kind }} · {{ tx.amount }}¢</li>
        }
      </ul>
    } @else {
      <p data-testid="empty">No transactions yet.</p>
    }
  `,
  styleUrl: './wallet-panel.scss',
})
export class WalletPanel {
  private readonly store = inject(Store);

  // Store state, read as signals so the template stays zoneless-friendly.
  protected readonly formattedBalance = this.store.selectSignal(
    walletFeature.selectFormattedBalance,
  );
  protected readonly transactions = this.store.selectSignal(
    walletFeature.selectTransactions,
  );
  protected readonly error = this.store.selectSignal(walletFeature.selectError);
  protected readonly depositCount = this.store.selectSignal(
    walletFeature.selectDepositCount,
  );
  protected readonly withdrawalCount = this.store.selectSignal(
    walletFeature.selectWithdrawalCount,
  );

  // Local UI state: the amount currently typed into the input.
  protected readonly amount = signal(500);

  protected onAmountInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.amount.set(Number.isNaN(value) ? 0 : value);
  }

  protected deposit(): void {
    this.store.dispatch(WalletActions.deposit({ amount: this.amount() }));
  }

  protected withdraw(): void {
    this.store.dispatch(WalletActions.withdraw({ amount: this.amount() }));
  }

  protected reset(): void {
    this.store.dispatch(WalletActions.reset());
  }

  protected dismiss(): void {
    this.store.dispatch(WalletActions.clearError());
  }
}

