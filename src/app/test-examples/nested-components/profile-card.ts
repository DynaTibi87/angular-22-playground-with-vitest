import { Component, input } from '@angular/core';
import { UserBadge } from './user-badge';
import { ActivityFeed } from './activity-feed';

export type Profile = {
  name: string;
  role: string;
};

@Component({
  selector: 'app-profile-card',
  imports: [UserBadge, ActivityFeed],
  template: `
    <section data-testid="profile-card">
      <p class="tag">Component: <code>ProfileCard</code></p>

      <app-user-badge [name]="profile().name" [role]="profile().role" />

      <app-activity-feed [owner]="profile().name" />
    </section>
  `,
})
export class ProfileCard {
  readonly profile = input.required<Profile>();
}
