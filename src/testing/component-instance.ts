import { DebugElement, Type } from '@angular/core';

// Type-safe accessor for a queried child's component instance.
// `DebugElement.componentInstance` is typed `any`, so both an `as` cast and a
// plain typed assignment leak unsafety under strict-type-checked lint rules.
// Reading it as `unknown` and narrowing with `instanceof` gives a genuinely
// typed result with no cast at all.
export function componentInstanceOf<T>(
  debugElement: DebugElement,
  type: Type<T>,
): T {
  const instance: unknown = debugElement.componentInstance;

  if (!(instance instanceof type)) {
    throw new Error(`Expected a ${type.name} instance`);
  }

  return instance;
}
