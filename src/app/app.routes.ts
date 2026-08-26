import { Route } from '@angular/router';
import { TestGuide } from './test-guide/test-guide';
import { QuoteService } from './test-examples/async-quote/quote.service';
import { MessageService } from './test-examples/service-injection/message.service';
import { UserService } from './test-examples/http-user/user.service';
import { CartService } from './test-examples/cart/cart.service';
import { DiscountService } from './test-examples/cart/discount.service';

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
  { path: '', redirectTo: 'test-guide', pathMatch: 'full' },
];
