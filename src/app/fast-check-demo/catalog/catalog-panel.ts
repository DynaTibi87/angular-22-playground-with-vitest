import { Component, computed, input, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import fc from 'fast-check';
import { catalogArbitrary } from './catalog.arbitrary';
import {
  countCategories,
  countNodes,
  countProducts,
  maxDepth,
  totalValueCents,
} from './catalog.logic';
import { CatalogNode, Category } from './catalog.model';

// Renders a catalog node and recurses into its children. A catalog is a
// self-referential tree, so the view is self-referential too — expressed here
// with a recursive `ng-template` re-entered through `NgTemplateOutlet` for every
// child. This is the UI mirror of the recursive logic in catalog.logic.ts.
@Component({
  selector: 'app-catalog-node',
  imports: [NgTemplateOutlet],
  template: `
    <ng-template #nodeTpl let-node>
      @if (node.type === 'product') {
        <span class="catalog-node catalog-node--product" data-testid="product">
          <span class="catalog-node__label">{{ node.title || '(untitled)' }}</span>
          <span class="catalog-node__price">{{ formatCents(node.priceCents) }}</span>
        </span>
      } @else {
        <details class="catalog-node catalog-node--category" data-testid="category" open>
          <summary class="catalog-node__label">
            {{ node.name }}
            <span class="catalog-node__badge">{{ node.items.length }}</span>
          </summary>
          @if (node.items.length > 0) {
            <ul class="catalog-node__children">
              @for (child of node.items; track $index) {
                <li>
                  <ng-container
                    [ngTemplateOutlet]="nodeTpl"
                    [ngTemplateOutletContext]="{ $implicit: child }"
                  />
                </li>
              }
            </ul>
          } @else {
            <p class="catalog-node__empty" data-testid="empty-category">Empty category</p>
          }
        </details>
      }
    </ng-template>

    <ng-container
      [ngTemplateOutlet]="nodeTpl"
      [ngTemplateOutletContext]="{ $implicit: node() }"
    />
  `,
  styleUrl: './catalog-panel.scss',
})
export class CatalogNodeView {
  readonly node = input.required<CatalogNode>();

  // Renders whole cents as a currency string (2 decimals, no floating point).
  protected formatCents(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

// The Catalog widget: draws a random catalog tree from the recursive fast-check
// arbitrary, renders it, and shows the derived stats computed by the pure
// recursive functions. "Generate" pulls a fresh tree so you can watch the same
// invariants hold across wildly different shapes.
@Component({
  selector: 'app-catalog-panel',
  imports: [CatalogNodeView],
  template: `
    <h3>Catalog</h3>

    <div class="catalog__actions">
      <button type="button" data-testid="generate" (click)="generate()">
        Generate new tree
      </button>
    </div>

    <dl class="catalog__stats" data-testid="stats">
      <div><dt>Products</dt><dd data-testid="stat-products">{{ productCount() }}</dd></div>
      <div><dt>Categories</dt><dd data-testid="stat-categories">{{ categoryCount() }}</dd></div>
      <div><dt>Nodes</dt><dd data-testid="stat-nodes">{{ nodeCount() }}</dd></div>
      <div><dt>Depth</dt><dd data-testid="stat-depth">{{ depth() }}</dd></div>
      <div><dt>Total value</dt><dd data-testid="stat-total">{{ formattedTotal() }}</dd></div>
    </dl>

    <div class="catalog__tree" data-testid="tree">
      <app-catalog-node [node]="tree()" />
    </div>
  `,
  styleUrl: './catalog-panel.scss',
})
export class CatalogPanel {
  // The currently displayed tree. Seeded once so the initial render is stable.
  protected readonly tree = signal<Category>(sampleCatalog());

  // Derived stats: exactly the pure functions the property tests exercise.
  protected readonly productCount = computed(() => countProducts(this.tree()));
  protected readonly categoryCount = computed(() => countCategories(this.tree()));
  protected readonly nodeCount = computed(() => countNodes(this.tree()));
  protected readonly depth = computed(() => maxDepth(this.tree()));
  protected readonly formattedTotal = computed(
    () => `$${(totalValueCents(this.tree()) / 100).toFixed(2)}`,
  );

  protected generate(): void {
    this.tree.set(sampleCatalog());
  }
}

// Draws a single catalog tree from the recursive arbitrary.
function sampleCatalog(): Category {
  return fc.sample(catalogArbitrary, 1)[0];
}



