import { Component, input } from '@angular/core';

@Component({
  selector: 'app-user-badge',
  template: `
    <div data-testid="user-badge">
      <p class="tag">Component: <code>UserBadge</code></p>

      <p data-testid="badge-name">{{ name() }}</p>
      <p data-testid="badge-role">{{ role() }}</p>
    </div>
  `,
})
export class UserBadge {
  readonly name = input.required<string>();
  readonly role = input.required<string>();
}
