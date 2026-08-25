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
    <h1>Router navigation</h1>

    <!--
      Declarative navigation. Binding routerLink to an empty array keeps the
      current path and only swaps the query params, so this widget never leaves
      the page it is embedded in. RouterLink also renders a real href we can
      assert on.
    -->
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

    <!-- Imperative navigation through the injected Router. -->
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
  // Exposed as statics so tests can assert against the same source of truth.
  static readonly VIEWS: readonly View[] = ['overview', 'details', 'settings'];
  static readonly DEFAULT_VIEW: View = 'overview';

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly views = NavPanel.VIEWS;

  // Reactively read the `view` query param from the activated route. Turning
  // the observable into a signal lets the template (and `activeView`) update
  // automatically after every navigation.
  private readonly viewParam = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('view'))),
    { initialValue: null },
  );

  // Falls back to the default when the URL has no (or an unknown) view param.
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


