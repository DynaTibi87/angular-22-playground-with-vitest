// Property-based tests for the recursive catalog logic.
//
// These are a great illustration of why property-based testing and recursive
// generators go hand in hand: `catalogArbitrary` produces trees of every shape,
// depth and size, and we assert structural invariants that must hold for ALL of
// them. Writing enough hand-picked trees to cover this space would be hopeless.
import { fc, test } from '@fast-check/vitest';
import { describe, expect, it } from 'vitest';
import { CatalogNode, Category } from './catalog.model';
import { catalogArbitrary, catalogNodeArbitrary } from './catalog.arbitrary';
import {
  countCategories,
  countNodes,
  countProducts,
  flattenProducts,
  maxDepth,
  totalValueCents,
} from './catalog.logic';

// A pure test helper: wrap any node in a fresh single-child category. Used for a
// metamorphic property (a known input change → a known output change).
function wrapInCategory(node: CatalogNode): Category {
  return { type: 'category', name: 'Wrapper', items: [node] };
}

describe('recursive generator', () => {
  test.prop([catalogNodeArbitrary])(
    'always produces a well-formed catalog node',
    (node) => {
      expect(node.type === 'product' || node.type === 'category').toBe(true);
      // The depth cap in the arbitrary keeps every tree finite and shallow.
      // (fast-check's `maxDepth` bounds the recursion, so depth stays small; we
      // assert a generous ceiling rather than an exact off-by-one bound.)
      const depth = maxDepth(node);
      expect(Number.isInteger(depth)).toBe(true);
      expect(depth).toBeGreaterThanOrEqual(1);
      expect(depth).toBeLessThanOrEqual(8);
    },
  );

  test.prop([catalogArbitrary])('roots the tree at a category', (root) => {
    expect(root.type).toBe('category');
  });
});

describe('flattenProducts', () => {
  test.prop([catalogNodeArbitrary])(
    'yields exactly countProducts items',
    (node) => {
      expect(flattenProducts(node)).toHaveLength(countProducts(node));
    },
  );

  test.prop([catalogNodeArbitrary])('yields only product leaves', (node) => {
    for (const product of flattenProducts(node)) {
      expect(product.type).toBe('product');
    }
  });
});

describe('counting invariants', () => {
  test.prop([catalogNodeArbitrary])(
    'nodes split exactly into products and categories',
    (node) => {
      expect(countNodes(node)).toBe(
        countProducts(node) + countCategories(node),
      );
    },
  );

  test.prop([catalogNodeArbitrary])(
    'a node always contains at least itself',
    (node) => {
      expect(countNodes(node)).toBeGreaterThanOrEqual(1);
    },
  );
});

describe('totalValueCents', () => {
  test.prop([catalogNodeArbitrary])(
    'equals the sum of the flattened product prices',
    (node) => {
      const summed = flattenProducts(node).reduce(
        (sum, product) => sum + product.priceCents,
        0,
      );
      expect(totalValueCents(node)).toBe(summed);
    },
  );

  test.prop([catalogNodeArbitrary])(
    'is zero exactly when there are no products',
    (node) => {
      if (countProducts(node) === 0) {
        expect(totalValueCents(node)).toBe(0);
      } else {
        // Every price is >= 1 cent, so any product means a positive total.
        expect(totalValueCents(node)).toBeGreaterThan(0);
      }
    },
  );
});

describe('metamorphic: wrapping a node in a category', () => {
  test.prop([catalogNodeArbitrary])(
    'preserves products and value, and deepens the tree by one',
    (node) => {
      const wrapped = wrapInCategory(node);

      // Product-facing measures are unchanged...
      expect(countProducts(wrapped)).toBe(countProducts(node));
      expect(totalValueCents(wrapped)).toBe(totalValueCents(node));
      expect(flattenProducts(wrapped)).toEqual(flattenProducts(node));

      // ...while the wrapper adds one category and one level of depth.
      expect(countCategories(wrapped)).toBe(countCategories(node) + 1);
      expect(maxDepth(wrapped)).toBe(maxDepth(node) + 1);
    },
  );
});

// A few anchored examples make the recursive semantics concrete at a glance.
describe('example trees', () => {
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

  it('counts products, categories and nodes', () => {
    expect(countProducts(tree)).toBe(2);
    expect(countCategories(tree)).toBe(3); // Root + Books + Empty
    expect(countNodes(tree)).toBe(5);
  });

  it('sums value and measures depth', () => {
    expect(totalValueCents(tree)).toBe(7500);
    expect(maxDepth(tree)).toBe(3); // Root → Books → TDD
  });

  it('flattens products depth-first, left to right', () => {
    expect(flattenProducts(tree).map((p) => p.title)).toEqual([
      'Keyboard',
      'TDD',
    ]);
  });
});

// You can also just *look* at what the generator emits — handy while designing a
// recursive arbitrary. `fc.sample` returns N generated values (it does not, and
// cannot, enumerate the whole space).
describe('inspecting the generator with fc.sample', () => {
  it('draws a handful of finite sample trees', () => {
    const samples = fc.sample(catalogArbitrary, 5);
    expect(samples).toHaveLength(5);
    for (const sample of samples) {
      expect(sample.type).toBe('category');
      expect(maxDepth(sample)).toBeLessThanOrEqual(8);
    }
  });
});
