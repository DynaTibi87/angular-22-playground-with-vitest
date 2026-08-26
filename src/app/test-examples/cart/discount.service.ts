import { Service } from '@angular/core';

// A tiny collaborator that CartService leans on. It lives in its own class on
// purpose: keeping the discount rules separate lets the CartService spec swap
// this real implementation for a predictable fake (see cart.service.spec.ts).
@Service()
export class DiscountService {
  // Orders whose subtotal reaches this amount qualify for a discount.
  static readonly THRESHOLD = 100;

  // The fraction knocked off the subtotal once the threshold is reached.
  static readonly RATE = 0.1;

  // Returns the discount AMOUNT (not the rate) for a given subtotal.
  discountFor(subtotal: number): number {
    return subtotal >= DiscountService.THRESHOLD
      ? subtotal * DiscountService.RATE
      : 0;
  }
}

