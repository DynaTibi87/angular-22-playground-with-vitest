import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it } from 'vitest';
import { CatalogNodeView, CatalogPanel } from './catalog-panel';
import { Category } from './catalog.model';
import {
  countCategories,
  countNodes,
  countProducts,
  maxDepth,
  totalValueCents,
} from './catalog.logic';

// Component tests for the Catalog widget. The CatalogPanel draws a random tree
// from the recursive arbitrary on its own, so most tests drive the recursive
// CatalogNodeView directly with a fixed tree — that keeps assertions
// deterministic while still exercising the self-referential rendering.
describe('CatalogNodeView', () => {
  let fixture: ComponentFixture<CatalogNodeView>;
  let debugElement: DebugElement;

  // A concrete tree: two products, three categories (root + Books + Empty).
  const tree: Category = {
    type: 'category',
    name: 'Root',
    items: [
      { type: 'product', title: 'Keyboard', priceCents: 5000 },
      {
        type: 'category',
        name: 'Books',
        items: [{ type: 'product', title: 'TDD', priceCents: 2500 }],
      },
      { type: 'category', name: 'Empty', items: [] },
    ],
  };

  const queryAll = (testId: string): DebugElement[] =>
    debugElement.queryAll(By.css(`[data-testid="${testId}"]`));

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [CatalogNodeView] });
    fixture = TestBed.createComponent(CatalogNodeView);
    fixture.componentRef.setInput('node', tree);
    debugElement = fixture.debugElement;
    await fixture.whenStable();
  });

  it('renders one product element per product leaf', () => {
    expect(queryAll('product')).toHaveLength(countProducts(tree));
  });

  it('renders one category element per category node', () => {
    expect(queryAll('category')).toHaveLength(countCategories(tree));
  });

  it('shows product titles and formatted prices', () => {
    const text = debugElement.nativeElement.textContent as string;
    expect(text).toContain('Keyboard');
    expect(text).toContain('$50.00');
    expect(text).toContain('TDD');
    expect(text).toContain('$25.00');
  });

  it('marks an empty category', () => {
    expect(queryAll('empty-category')).toHaveLength(1);
  });
});

describe('CatalogPanel', () => {
  let fixture: ComponentFixture<CatalogPanel>;
  let debugElement: DebugElement;

  const query = (testId: string): DebugElement =>
    debugElement.query(By.css(`[data-testid="${testId}"]`));

  const text = (testId: string): string =>
    query(testId).nativeElement.textContent.trim();

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [CatalogPanel] });
    fixture = TestBed.createComponent(CatalogPanel);
    debugElement = fixture.debugElement;
    await fixture.whenStable();
  });

  it('renders a tree and its derived stats', () => {
    expect(query('tree')).toBeTruthy();
    // Root is always a category, so at least one node and one category exist.
    expect(Number(text('stat-nodes'))).toBeGreaterThanOrEqual(1);
    expect(Number(text('stat-categories'))).toBeGreaterThanOrEqual(1);
  });

  it('keeps the stats consistent with the pure logic (nodes = products + categories)', () => {
    const products = Number(text('stat-products'));
    const categories = Number(text('stat-categories'));
    const nodes = Number(text('stat-nodes'));
    expect(nodes).toBe(products + categories);
  });

  it('generates a new tree on demand', async () => {
    query('generate').nativeElement.click();
    await fixture.whenStable();
    // Still well-formed after regenerating.
    expect(Number(text('stat-nodes'))).toBeGreaterThanOrEqual(1);
    expect(Number(text('stat-depth'))).toBeGreaterThanOrEqual(1);
  });
});

// Sanity check that the widget's stats match the logic used elsewhere, using a
// concrete tree to pin exact numbers.
describe('stat formulas', () => {
  const tree: Category = {
    type: 'category',
    name: 'Root',
    items: [
      { type: 'product', title: 'Keyboard', priceCents: 5000 },
      {
        type: 'category',
        name: 'Books',
        items: [{ type: 'product', title: 'TDD', priceCents: 2500 }],
      },
    ],
  };

  it('matches the pure recursive functions', () => {
    expect(countProducts(tree)).toBe(2);
    expect(countCategories(tree)).toBe(2);
    expect(countNodes(tree)).toBe(4);
    expect(maxDepth(tree)).toBe(3);
    expect(totalValueCents(tree)).toBe(7500);
  });
});

