import { HttpClient } from '@angular/common/http';
import { Service, Signal, computed, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { DiscountService } from './discount.service';

export type Product = {
  id: string;
  name: string;
  price: number;
};

export type CartLine = Product & { quantity: number };

// A plain state-holding service: no component, no template. It owns the cart
// state, derives totals with computed signals, and delegates the discount rule
// to an injected collaborator. This is the kind of class the spec exercises in
// isolation - see cart.service.spec.ts.
@Service()
export class CartService {
  // Where the catalog is fetched from. Exposed so the spec can match the URL.
  static readonly CATALOG_URL = 'https://shop.example.com/api/products';

  // Collaborator that decides the discount. Injecting it (rather than baking
  // the rule in here) is what lets tests replace it with a controlled fake.
  readonly #discounts = inject(DiscountService);
  readonly #http = inject(HttpClient);

  // The single source of truth. Kept private so callers can only mutate it
  // through the intent-revealing methods below.
  readonly #lines = signal<CartLine[]>([]);
  readonly lines: Signal<readonly CartLine[]> = this.#lines.asReadonly();

  // Total number of individual units across every line.
  readonly itemCount = computed(() =>
    this.#lines().reduce((sum, line) => sum + line.quantity, 0),
  );

  // Price before any discount is applied.
  readonly subtotal = computed(() =>
    this.#lines().reduce((sum, line) => sum + line.price * line.quantity, 0),
  );

  // Discount amount, delegated to the injected collaborator.
  readonly discount = computed(() =>
    this.#discounts.discountFor(this.subtotal()),
  );

  // What the customer actually pays.
  readonly total = computed(() => this.subtotal() - this.discount());

  // Adds a product, merging quantities when the line already exists.
  add(product: Product, quantity = 1): void {
    if (quantity <= 0) {
      throw new Error('Quantity must be a positive number.');
    }

    this.#lines.update((lines) => {
      const existing = lines.find((line) => line.id === product.id);

      if (existing) {
        return lines.map((line) =>
          line.id === product.id
            ? { ...line, quantity: line.quantity + quantity }
            : line,
        );
      }

      return [...lines, { ...product, quantity }];
    });
  }

  // Drops a line entirely, regardless of its quantity.
  remove(productId: string): void {
    this.#lines.update((lines) =>
      lines.filter((line) => line.id !== productId),
    );
  }

  // Empties the cart.
  clear(): void {
    this.#lines.set([]);
  }

  // An async method backed by HttpClient. It gives the spec a chance to test a
  // service's HTTP call DIRECTLY with HttpTestingController - no component in
  // the middle.
  loadCatalog(): Observable<Product[]> {
    return this.#http.get<Product[]>(CartService.CATALOG_URL);
  }
}
