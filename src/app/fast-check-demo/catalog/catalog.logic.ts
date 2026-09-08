// Pure, recursive domain logic over a catalog tree.
//
// Each function walks the tree by recursing into category children and bottoming
// out at product leaves. Because they are total and deterministic, they pair
// perfectly with a recursive fast-check generator: we can state tree-wide
// invariants (e.g. "flattening yields exactly countProducts items") and let
// fast-check throw trees of every shape and depth at them.

import { CatalogNode, Product } from './catalog.model';

// Collects every product leaf, left to right (depth-first).
export function flattenProducts(node: CatalogNode): Product[] {
  if (node.type === 'product') {
    return [node];
  }
  return node.items.flatMap(flattenProducts);
}

// Counts product leaves in the tree.
export function countProducts(node: CatalogNode): number {
  if (node.type === 'product') {
    return 1;
  }
  return node.items.reduce((sum, child) => sum + countProducts(child), 0);
}

// Counts category (branch) nodes in the tree, including the root if it's one.
export function countCategories(node: CatalogNode): number {
  if (node.type === 'product') {
    return 0;
  }
  return node.items.reduce((sum, child) => sum + countCategories(child), 1);
}

// Counts all nodes (products + categories).
export function countNodes(node: CatalogNode): number {
  if (node.type === 'product') {
    return 1;
  }
  return node.items.reduce((sum, child) => sum + countNodes(child), 1);
}

// Sums the price of every product in the tree, in whole cents.
export function totalValueCents(node: CatalogNode): number {
  if (node.type === 'product') {
    return node.priceCents;
  }
  return node.items.reduce((sum, child) => sum + totalValueCents(child), 0);
}

// The depth of the tree: a product is depth 1, a category is one deeper than its
// deepest child (an empty category is depth 1).
export function maxDepth(node: CatalogNode): number {
  if (node.type === 'product') {
    return 1;
  }
  return (
    node.items.reduce(
      (deepest, child) => Math.max(deepest, maxDepth(child)),
      0,
    ) + 1
  );
}
