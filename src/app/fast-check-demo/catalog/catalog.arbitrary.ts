// A RECURSIVE fast-check generator for catalog trees.
//
// The star here is `fc.letrec`, which lets arbitraries reference one another by
// name through the `tie` helper — exactly what a self-referential tree needs. A
// `category` generates an array of child `catalogNode`s, and a `catalogNode` is
// itself a weighted choice between a `product` leaf and a `category` branch.
//
// Left unbounded, that mutual recursion could generate enormous (or infinite)
// trees. `fc.oneof`'s `maxDepth` + `depthIdentifier` options cap the recursion:
// once the depth budget is spent, fast-check stops picking the branching
// `category` case and settles on `product` leaves, guaranteeing finite trees.

import fc from 'fast-check';
import { CatalogNode, Category, Product } from './catalog.model';

const catalog = fc.letrec<{
  product: Product;
  category: Category;
  catalogNode: CatalogNode;
}>((tie) => ({
  // A leaf: a titled product priced in whole cents (positive, bounded so tree
  // totals stay well inside Number.MAX_SAFE_INTEGER).
  product: fc.record({
    type: fc.constant('product' as const),
    title: fc.string({ minLength: 1, maxLength: 12 }),
    priceCents: fc.integer({ min: 1, max: 1_000_000 }),
  }),

  // A branch: a named category whose children are themselves catalog nodes —
  // the recursive reference, expressed via `tie('catalogNode')`.
  category: fc.record({
    type: fc.constant('category' as const),
    name: fc.constantFrom('Electronics', 'Home', 'Books', 'Outdoors', 'Toys'),
    items: fc.array(tie('catalogNode'), { maxLength: 4 }),
  }),

  // A node is a product 3× as often as a category, and `maxDepth` bounds how
  // deep the mutual recursion is allowed to go.
  catalogNode: fc.oneof(
    { maxDepth: 4, depthIdentifier: 'catalog' },
    { arbitrary: tie('product'), weight: 3 },
    { arbitrary: tie('category'), weight: 1 },
  ),
}));

// The public arbitraries. `catalogArbitrary` always roots the tree at a category
// (a realistic catalog), while `catalogNodeArbitrary` may be a bare product too.
export const catalogNodeArbitrary = catalog.catalogNode;
export const catalogArbitrary = catalog.category;

