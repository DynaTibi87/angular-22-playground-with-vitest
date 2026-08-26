import { Component, inject } from '@angular/core';
import { CartService, Product } from './cart.service';

@Component({
  selector: 'app-cart-panel',
  template: `
    <h3>Shopping cart</h3>

    <ul data-testid="catalog" class="cart-panel__catalog">
      @for (product of catalog; track product.id) {
        <li>
          <button type="button" (click)="cart.add(product)">
            Add {{ product.name }} (\${{ product.price }})
          </button>
        </li>
      }
    </ul>

    @if (cart.itemCount() > 0) {
      <ul data-testid="lines">
        @for (line of cart.lines(); track line.id) {
          <li>
            {{ line.name }} × {{ line.quantity }}
            <button type="button" (click)="cart.remove(line.id)">Remove</button>
          </li>
        }
      </ul>

      <p data-testid="subtotal">Subtotal: \${{ cart.subtotal() }}</p>
      <p data-testid="discount">Discount: \${{ cart.discount() }}</p>
      <p data-testid="total"><strong>Total: \${{ cart.total() }}</strong></p>

      <button type="button" data-testid="clear" (click)="cart.clear()">
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
  protected readonly cart = inject(CartService);

  protected readonly catalog: readonly Product[] = [
    { id: 'kbd', name: 'Keyboard', price: 45 },
    { id: 'mon', name: 'Monitor', price: 70 },
    { id: 'mse', name: 'Mouse', price: 25 },
  ];
}


