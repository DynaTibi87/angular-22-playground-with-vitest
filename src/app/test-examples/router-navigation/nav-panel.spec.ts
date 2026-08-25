import { Location } from '@angular/common';
import { DebugElement } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { NavPanel } from './nav-panel';

describe('NavPanel (routing)', () => {
  let harness: RouterTestingHarness;
  let location: Location;

  // Re-query DOM nodes on demand: the rendered content changes after every
  // navigation, so grabbing fresh references avoids stale elements.
  const linkTo = (view: string): DebugElement =>
    harness.fixture.debugElement.query(By.css(`[data-testid="link-${view}"]`));

  const activeText = (): string =>
    harness.fixture.debugElement
      .query(By.css('[data-testid="active"]'))
      .nativeElement.textContent.trim();

  const viewText = (): string =>
    harness.fixture.debugElement
      .query(By.css('[data-testid="view"]'))
      .nativeElement.textContent.trim();

  beforeEach(async () => {
    // `provideRouter` sets up a real (but in-memory) router for the test. The
    // component under test is wired to a route so navigation actually renders
    // it through a router outlet, just like in the running app.
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'panel', component: NavPanel }])],
    });

    location = TestBed.inject(Location);

    // RouterTestingHarness owns the root outlet and drives navigation for us.
    harness = await RouterTestingHarness.create();
  });

  it('should render the component when its route is activated', async () => {
    // `navigateByUrl` returns the activated component, typed via the token.
    const component = await harness.navigateByUrl('/panel', NavPanel);

    expect(component).toBeInstanceOf(NavPanel);
    expect(location.path()).toBe('/panel');
  });

  it('should fall back to the default view when no query param is present', async () => {
    await harness.navigateByUrl('/panel', NavPanel);

    expect(activeText()).toContain(NavPanel.DEFAULT_VIEW);
    expect(viewText()).toContain('Overview of the workspace.');
  });

  it('should read the active view from the URL query params', async () => {
    // The component derives its state from the route, so seeding the URL is
    // enough to drive what it renders - no user interaction required.
    await harness.navigateByUrl('/panel?view=details', NavPanel);

    expect(activeText()).toContain('details');
    expect(viewText()).toContain('Detailed metrics and history.');
  });

  it('should render routerLink hrefs that carry the query params', async () => {
    await harness.navigateByUrl('/panel', NavPanel);

    // RouterLink turns the binding into a concrete href we can assert on.
    expect(linkTo('details').nativeElement.getAttribute('href')).toBe(
      '/panel?view=details',
    );
    expect(linkTo('settings').nativeElement.getAttribute('href')).toBe(
      '/panel?view=settings',
    );
  });

  it('should navigate and re-render when a routerLink is clicked', async () => {
    await harness.navigateByUrl('/panel', NavPanel);

    // Clicking the anchor triggers RouterLink, which performs a real
    // navigation and prevents the default browser page load.
    linkTo('details').nativeElement.click();
    await harness.fixture.whenStable();

    expect(location.path()).toBe('/panel?view=details');
    expect(activeText()).toContain('details');
    expect(viewText()).toContain('Detailed metrics and history.');
  });

  it('should navigate programmatically through the Router', async () => {
    const component = await harness.navigateByUrl('/panel', NavPanel);

    // Exercise the imperative `router.navigate([...])` path from the button.
    component.goToSettings();
    await harness.fixture.whenStable();

    expect(location.path()).toBe('/panel?view=settings');
    expect(activeText()).toContain('settings');
    expect(viewText()).toContain('Adjust your preferences.');
  });

  it('should mark only the active link', async () => {
    await harness.navigateByUrl('/panel?view=settings', NavPanel);

    expect(linkTo('settings').nativeElement.classList).toContain('active');
    expect(linkTo('overview').nativeElement.classList).not.toContain('active');
  });
});
