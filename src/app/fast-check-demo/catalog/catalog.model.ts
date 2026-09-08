// The domain model for the recursive "catalog" example.
//
// A catalog is a TREE: a category contains items, and each item is either a
// product (a leaf) or another category (a branch). This self-referential shape
// is what makes it a showcase for RECURSIVE data generation with fast-check's
// `fc.letrec` — see catalog.arbitrary.ts.
//
// Everything is plain, serializable data (prices in whole cents, no floats) so
// the pure recursive functions in catalog.logic.ts stay easy to property-test.

// A leaf: a single product with a price in whole cents.
export interface Product {
  readonly type: 'product';
  readonly title: string;
  readonly priceCents: number; // positive integer
}

// A branch: a named category holding zero or more child nodes.
export interface Category {
  readonly type: 'category';
  readonly name: string;
  readonly items: readonly CatalogNode[];
}

// A node is either a leaf or a branch — a classic discriminated union, and the
// recursive type at the heart of the example.
export type CatalogNode = Product | Category;
