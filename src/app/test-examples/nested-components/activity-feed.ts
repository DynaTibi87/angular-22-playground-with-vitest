import { Component, OnInit, inject, input, signal } from '@angular/core';
import { ActivityService } from './activity.service';

@Component({
  selector: 'app-activity-feed',
  template: `
    <div data-testid="activity-feed">
      <p class="tag">Component: <code>ActivityFeed</code></p>

      @if (loading()) {
        <p data-testid="feed-loading">Loading activity…</p>
      } @else {
        <ul data-testid="feed-items">
          @for (item of items(); track item) {
            <li>{{ item }}</li>
          }
        </ul>
      }
    </div>
  `,
})
export class ActivityFeed implements OnInit {
  readonly owner = input.required<string>();

  private readonly activityService = inject(ActivityService);

  readonly items = signal<string[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.activityService.loadRecentActivity(this.owner()).then((items) => {
      this.items.set(items);
      this.loading.set(false);
    });
  }
}
