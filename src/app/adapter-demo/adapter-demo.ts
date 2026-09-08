import { Component, computed, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import {
  BackendWorkspace,
  adaptWorkspace,
} from './workspace/workspace.adapter';
import { generateBackendScenario } from './workspace/workspace.scenarios';
import { BackendOrder, adaptOrder } from './order/order.adapter';
import { generateOrderScenario } from './order/order.scenarios';

// The page behind the /adapter route. It demonstrates a more complex fast-check
// use case: a backend → UI adapter. Two cards sit side by side — the raw
// backend payload on the left, the adapted UI model on the right — and the
// "Generate" button draws a fresh scenario from a range of possible backend
// responses so you can watch the adapter's mapping (and fallbacks) in action.
//
// The component itself holds no business logic: it only renders and dispatches.
// The adapter's rules are proven exhaustively by the fast-check spec.
@Component({
  selector: 'app-adapter-demo',
  imports: [JsonPipe],
  templateUrl: './adapter-demo.html',
  styleUrl: './adapter-demo.scss',
})
export class AdapterDemo {
  // The current raw backend payload. Seeded with one scenario so the cards are
  // never empty on first paint.
  protected readonly backend = signal<BackendWorkspace>(
    generateBackendScenario(),
  );

  // The adapted UI model, recomputed whenever the backend payload changes.
  protected readonly ui = computed(() => adaptWorkspace(this.backend()));

  // A second, nested payload: an e-commerce order with a customer and a list of
  // line items. Its adapted model folds the items into money totals.
  protected readonly order = signal<BackendOrder>(generateOrderScenario());
  protected readonly orderUi = computed(() => adaptOrder(this.order()));

  // Draws a new scenario from the range of possible backend responses.
  protected generate(): void {
    this.backend.set(generateBackendScenario());
    this.order.set(generateOrderScenario());
  }
}
