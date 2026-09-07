import { Component, inject } from '@angular/core';
import { CartService, Product } from './cart.service';

@Component({
  selector: 'app-cart-panel',
  template: `
    <h3>Shopping cart</h3>

    <ul data-testid="catalog" class="cart-panel__catalog">
      @for (product of catalog; track product.id) {
        <li style="margin-block-end: 8px">
          <button type="button" (click)="cartService.add(product)">
            Add {{ product.name }} (\${{ product.price }})
          </button>
        </li>
      }
    </ul>

    @if (cartService.itemCount() > 0) {
      <ul data-testid="lines">
        @for (line of cartService.lines(); track line.id) {
          <li>
            {{ line.name }} × {{ line.quantity }}
            <button type="button" (click)="cartService.remove(line.id)">
              Remove
            </button>
          </li>
        }
      </ul>

      <p data-testid="subtotal">Subtotal: \${{ cartService.subtotal() }}</p>
      <p data-testid="discount">Discount: \${{ cartService.discount() }}</p>
      <p data-testid="total">
        <strong>Total: \${{ cartService.total() }}</strong>
      </p>

      <button type="button" data-testid="clear" (click)="cartService.clear()">
        Clear cart
      </button>
    } @else {
      <p data-testid="empty">Your cart is empty.</p>
    }
  `,
})
export class CartPanel {
  // The service under test drives the whole widget. The spec exercises this
  // same service directly, without touching this component.
  protected readonly cartService = inject(CartService);

  protected readonly catalog: readonly Product[] = [
    { id: 'kbd', name: 'Keyboard', price: 45 },
    { id: 'mon', name: 'Monitor', price: 70 },
    { id: 'mse', name: 'Mouse', price: 25 },
  ];
}
