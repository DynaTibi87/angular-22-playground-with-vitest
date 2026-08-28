import { Route } from '@angular/router';
import { provideState, provideStore } from '@ngrx/store';
import { TestGuide } from './test-guide/test-guide';
import { QuoteService } from './test-examples/async-quote/quote.service';
import { MessageService } from './test-examples/service-injection/message.service';
import { UserService } from './test-examples/http-user/user.service';
import { CartService } from './test-examples/cart/cart.service';
import { DiscountService } from './test-examples/cart/discount.service';
import { FastCheckDemo } from './fast-check-demo/fast-check-demo';
import { walletFeature } from './fast-check-demo/wallet/wallet.reducer';
import { AdapterDemo } from './adapter-demo/adapter-demo';

export const appRoutes: Route[] = [
  {
    path: 'test-guide',
    component: TestGuide,
    // These services use @Service() without providedIn: 'root',
    // so they must be provided explicitly for the widgets to resolve them.
    providers: [
      QuoteService,
      MessageService,
      UserService,
      CartService,
      DiscountService,
    ],
  },
  {
    path: 'fast-check',
    component: FastCheckDemo,
    // Register the NgRx store and the Wallet feature slice for this page only.
    // `provideStore()` sets up the root store; `provideState(walletFeature)`
    // registers the "wallet" slice. The component spec wires these up the same way.
    providers: [provideStore(), provideState(walletFeature)],
  },
  {
    path: 'adapter',
    component: AdapterDemo,
    // A pure backend → UI adapter demo. No store needed: the component only
    // renders a generated payload and its adapted UI model side by side.
  },
  { path: '', redirectTo: 'test-guide', pathMatch: 'full' },
];
