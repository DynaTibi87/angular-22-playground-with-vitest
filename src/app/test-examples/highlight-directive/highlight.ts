import { Directive, ElementRef, effect, inject, input } from '@angular/core';

@Directive({
  selector: '[appHighlight]',
})
export class Highlight {
  readonly appHighlight = input('');
  readonly defaultColor = input('yellow');
  readonly #elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    effect(() => {
      this.#elementRef.nativeElement.style.backgroundColor =
        this.appHighlight() || this.defaultColor();
    });
  }
}
