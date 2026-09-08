// NgRx actions for the Wallet feature.
//
// `createActionGroup` gives every action a readable, namespaced type string
// (e.g. "[Wallet] Deposit") and a strongly-typed creator. The component
// dispatches these; the reducer reacts to them.
import { createActionGroup, emptyProps, props } from '@ngrx/store';

export const WalletActions = createActionGroup({
  source: 'Wallet',
  events: {
    // Try to add `amount` cents to the balance.
    Deposit: props<{ amount: number }>(),
    // Try to remove `amount` cents from the balance.
    Withdraw: props<{ amount: number }>(),
    // Wipe the wallet back to its initial, empty state.
    Reset: emptyProps(),
    // Dismiss the current error message without changing the balance.
    ClearError: emptyProps(),
  },
});
