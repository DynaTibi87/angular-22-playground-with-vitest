import { Component } from '@angular/core';
import { CatalogPanel } from './catalog/catalog-panel';
import { TruncatePanel } from './truncate/truncate-panel';
import { WalletPanel } from './wallet/wallet-panel';

// The page behind the /fast-check route. It frames the live Wallet widget with
// a short explanation of the property-based invariants that the specs prove.
@Component({
  selector: 'app-fast-check-demo',
  imports: [WalletPanel, CatalogPanel, TruncatePanel],
  templateUrl: './fast-check-demo.html',
  styleUrl: './fast-check-demo.scss',
})
export class FastCheckDemo {
  // The invariants shown on the page, mirroring what the specs assert.
  protected readonly invariants = [
    'The balance is never negative, no matter the sequence of actions.',
    'The balance always equals the folded transaction history.',
    'Depositing then withdrawing the same amount is a no-op on the balance.',
    'Deposits are commutative: order never changes the final balance.',
    'Reset always returns the wallet to its initial, empty state.',
    'formatCents always renders exactly two decimal places.',
    'truncate leaves short strings untouched and only shortens long ones.',
    'truncate is idempotent: truncating twice equals truncating once.',
  ];
}

