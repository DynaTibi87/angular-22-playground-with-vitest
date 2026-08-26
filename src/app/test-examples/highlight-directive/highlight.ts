import { Directive, input } from '@angular/core';

@Directive({
  selector: '[appHighlight]',
  host: {
    '[style.background-color]': 'appHighlight() || defaultColor()',
  },
})
export class Highlight {
  readonly appHighlight = input('');
  readonly defaultColor = input('yellow');
}
