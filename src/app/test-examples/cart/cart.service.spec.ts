import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CartService, Product } from './cart.service';
import { DiscountService } from './discount.service';

// A couple of catalog products reused across the tests.
const keyboard: Product = { id: 'kbd', name: 'Keyboard', price: 45 };
const monitor: Product = { id: 'mon', name: 'Monitor', price: 70 };

describe('CartService', () => {
  // ---------------------------------------------------------------------------
  // 1) Testing a service in ISOLATION.
  //
  // A service is just a class. There is no component, fixture or template here:
  // we ask the TestBed's injector for an instance and call its methods directly.
  // Using `TestBed.inject()` (instead of `new CartService()`) matters because
  // the service relies on `inject()` internally, which only works inside an
  // Angular injection context that the TestBed sets up for us.
  // ---------------------------------------------------------------------------
  describe('with the real DiscountService', () => {
    let service: CartService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        // The `@Service()` decorator auto-provides CartService and
        // DiscountService, so neither needs to be listed here. We only wire up
        // HttpClient because CartService injects it, even though these tests
        // never hit the network.
        providers: [provideHttpClient(), provideHttpClientTesting()],
      });

      service = TestBed.inject(CartService);
    });

    it('should be created', () => {
      expect(service).toBeInstanceOf(CartService);
    });

    it('should start empty', () => {
      expect(service.lines()).toEqual([]);
      expect(service.itemCount()).toBe(0);
      expect(service.subtotal()).toBe(0);
      expect(service.total()).toBe(0);
    });

    it('should add a new product as its own line', () => {
      service.add(keyboard);

      expect(service.lines()).toEqual([{ ...keyboard, quantity: 1 }]);
      expect(service.itemCount()).toBe(1);
    });

    it('should merge quantities when the same product is added again', () => {
      service.add(keyboard);
      service.add(keyboard, 2);

      // One line, three units - not two separate keyboard lines.
      expect(service.lines()).toEqual([{ ...keyboard, quantity: 3 }]);
      expect(service.itemCount()).toBe(3);
    });

    it('should keep distinct products on separate lines', () => {
      service.add(keyboard);
      service.add(monitor);

      expect(service.lines()).toHaveLength(2);
      expect(service.itemCount()).toBe(2);
    });

    it('should derive the subtotal from price times quantity', () => {
      service.add(keyboard, 2); // 45 * 2 = 90
      service.add(monitor); //     70 * 1 = 70

      expect(service.subtotal()).toBe(160);
    });

    it('should remove a line by product id', () => {
      service.add(keyboard);
      service.add(monitor);

      service.remove(keyboard.id);

      expect(service.lines()).toEqual([{ ...monitor, quantity: 1 }]);
    });

    it('should empty the cart on clear()', () => {
      service.add(keyboard);
      service.add(monitor);

      service.clear();

      expect(service.lines()).toEqual([]);
      expect(service.itemCount()).toBe(0);
    });

    it('should reject a non-positive quantity', () => {
      expect(() => service.add(keyboard, 0)).toThrow(
        'Quantity must be a positive number.',
      );
      // The failed call must not have mutated any state.
      expect(service.lines()).toEqual([]);
    });

    it('should apply the real discount once the threshold is reached', () => {
      // Below the threshold (100): no discount, so total equals subtotal.
      service.add(keyboard); // subtotal 45
      expect(service.discount()).toBe(0);
      expect(service.total()).toBe(45);

      // Cross the 100 threshold: 45 + (70 * 2) = 185, minus 10% = 166.5.
      service.add(monitor, 2);
      expect(service.subtotal()).toBe(185);
      expect(service.discount()).toBeCloseTo(18.5);
      expect(service.total()).toBeCloseTo(166.5);
    });
  });

  // ---------------------------------------------------------------------------
  // 2) Replacing a COLLABORATOR with a fake.
  //
  // CartService delegates the discount rule to DiscountService. To test the
  // cart's own behaviour without coupling it to the real discount maths, we
  // override the DiscountService token with a controlled fake. Now we can prove
  // two things independently: that the cart calls the collaborator with the
  // right argument, and that it uses whatever the collaborator returns.
  // ---------------------------------------------------------------------------
  describe('with a fake DiscountService', () => {
    let service: CartService;
    // A hand-rolled fake whose behaviour each test can program.
    const fakeDiscount = { discountFor: vi.fn<(subtotal: number) => number>() };

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          // `useValue` swaps the real collaborator for our fake. The cart never
          // knows the difference - it just resolves the DiscountService token.
          { provide: DiscountService, useValue: fakeDiscount },
          provideHttpClient(),
          provideHttpClientTesting(),
        ],
      });

      service = TestBed.inject(CartService);
    });

    afterEach(() => {
      vi.resetAllMocks();
    });

    it('should ask the collaborator for a discount on the current subtotal', () => {
      fakeDiscount.discountFor.mockReturnValue(0);

      service.add(keyboard, 2); // subtotal 90
      // Reading `total` triggers the `discount` computed, which calls the fake.
      void service.total();

      expect(fakeDiscount.discountFor).toHaveBeenCalledWith(90);
    });

    it('should subtract whatever discount the collaborator returns', () => {
      // Force a fixed discount regardless of the real rules.
      fakeDiscount.discountFor.mockReturnValue(15);

      service.add(keyboard, 2); // subtotal 90

      expect(service.discount()).toBe(15);
      expect(service.total()).toBe(75); // 90 - 15
    });
  });

  // ---------------------------------------------------------------------------
  // 3) Testing a service's HTTP call DIRECTLY.
  //
  // No component is required to test an HTTP-backed service. We subscribe to the
  // returned Observable ourselves and answer the request with
  // HttpTestingController, exactly like the component-level HTTP example does -
  // just one layer closer to the source.
  // ---------------------------------------------------------------------------
  describe('loadCatalog() over HTTP', () => {
    let service: CartService;
    let httpTesting: HttpTestingController;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting()],
      });

      service = TestBed.inject(CartService);
      httpTesting = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
      // Fails the test if a request was made but never flushed.
      httpTesting.verify();
    });

    it('should issue a single GET to the catalog URL', () => {
      // Subscribing is what actually fires the request.
      service.loadCatalog().subscribe();

      const req = httpTesting.expectOne(CartService.CATALOG_URL);
      expect(req.request.method).toBe('GET');

      req.flush([]);
    });

    it('should emit the products returned by the server', () => {
      const catalog: Product[] = [keyboard, monitor];
      let received: Product[] | undefined;

      service.loadCatalog().subscribe((products) => (received = products));

      httpTesting.expectOne(CartService.CATALOG_URL).flush(catalog);

      expect(received).toEqual(catalog);
    });

    it('should surface a server error through the error channel', () => {
      let status: number | undefined;

      service.loadCatalog().subscribe({
        error: (error) => (status = error.status),
      });

      httpTesting
        .expectOne(CartService.CATALOG_URL)
        .flush('Boom', { status: 500, statusText: 'Server Error' });

      expect(status).toBe(500);
    });
  });
});
