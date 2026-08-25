import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

// The set of "views" this panel can show. Each one maps to a `?view=` query
// param, so switching views is a real router navigation - not just local state.
export type View = 'overview' | 'details' | 'settings';

@Component({
  selector: 'app-nav-panel',
  imports: [RouterLink],
  template: `
    <h3>Router navigation</h3>

    <nav data-testid="nav">
      @for (view of views; track view) {
        <a
          [attr.data-testid]="'link-' + view"
          [routerLink]="[]"
          [queryParams]="{ view }"
          [class.active]="activeView() === view"
        >
          {{ view }}
        </a>
      }
    </nav>

    <button type="button" data-testid="go-settings" (click)="goToSettings()">
      Go to settings (programmatic)
    </button>

    <p data-testid="active">Active view: {{ activeView() }}</p>

    <section data-testid="view">
      @switch (activeView()) {
        @case ('overview') {
          <p>Overview of the workspace.</p>
        }
        @case ('details') {
          <p>Detailed metrics and history.</p>
        }
        @case ('settings') {
          <p>Adjust your preferences.</p>
        }
      }
    </section>
  `,
})
export class NavPanel {
  static readonly VIEWS: readonly View[] = ['overview', 'details', 'settings'];
  static readonly DEFAULT_VIEW: View = 'overview';

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly views = NavPanel.VIEWS;

  private readonly viewParam = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('view'))),
    { initialValue: null },
  );

  readonly activeView = computed<View>(() => {
    const value = this.viewParam();
    return NavPanel.VIEWS.includes(value as View)
      ? (value as View)
      : NavPanel.DEFAULT_VIEW;
  });

  goToSettings(): void {
    // Same-path navigation that only updates the query params.
    this.router.navigate([], { queryParams: { view: 'settings' } });
  }
}
