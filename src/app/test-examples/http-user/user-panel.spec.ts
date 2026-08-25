import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { UserPanel } from './user-panel';
import { GithubUser, UserService } from './user.service';

describe('UserPanel', () => {
  let fixture: ComponentFixture<UserPanel>;
  let debugElement: DebugElement;
  let componentInstance: UserPanel;

  // The testing backend. It replaces the real HTTP handler so no network call
  // ever leaves the test; instead we assert on and answer requests by hand.
  let httpTesting: HttpTestingController;

  // A canned response reused across the happy-path tests.
  const fakeUser: GithubUser = {
    login: 'angular',
    name: 'Angular',
    public_repos: 42,
  };

  // Re-query on demand: the template adds/removes these nodes with `@if`, so a
  // reference captured once would go stale.
  const usernameInput = (): DebugElement =>
    debugElement.query(By.css('[data-testid="username"]'));
  const searchButton = (): DebugElement =>
    debugElement.query(By.css('[data-testid="search"]'));
  const loadingEl = (): DebugElement =>
    debugElement.query(By.css('[data-testid="loading"]'));
  const userEl = (): DebugElement =>
    debugElement.query(By.css('[data-testid="user"]'));
  const errorEl = (): DebugElement =>
    debugElement.query(By.css('[data-testid="error"]'));

  // Drives the component the way a user would: type a username, then submit.
  const search = async (username: string): Promise<void> => {
    componentInstance.username.set(username);
    // Let change detection run so the button's `disabled` binding updates
    // before we click - a disabled DOM button would swallow the click.
    await fixture.whenStable();
    searchButton().nativeElement.click();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [UserPanel],
      providers: [
        UserService,
        // `provideHttpClient()` wires up a real `HttpClient`, while
        // `provideHttpClientTesting()` swaps its backend for one that captures
        // requests. Order matters: the testing backend must come AFTER
        // `provideHttpClient()` so it overrides the real handler.
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    fixture = TestBed.createComponent(UserPanel);
    debugElement = fixture.debugElement;
    componentInstance = fixture.componentInstance;

    // Grab the controller from the injector to inspect/flush requests.
    httpTesting = TestBed.inject(HttpTestingController);

    await fixture.whenStable();
  });

  afterEach(() => {
    // Fails the test if any request was made but never flushed/answered,
    // catching stray or duplicate calls. Run it in `afterEach` so every test
    // is verified without repeating the assertion.
    httpTesting.verify();
  });

  it('should render', () => {
    expect(componentInstance).toBeTruthy();
  });

  it('should render the input and button', () => {
    expect(usernameInput()).toBeTruthy();
    expect(searchButton()).toBeTruthy();
  });

  it('should start empty, with no request, result or error', () => {
    // No request has been triggered yet, so there is nothing to expect.
    httpTesting.expectNone(`${UserService.BASE_URL}/angular`);

    expect(componentInstance.loading()).toBe(false);
    expect(loadingEl()).toBeNull();
    expect(userEl()).toBeNull();
    expect(errorEl()).toBeNull();
  });

  it('should disable the button while the username is blank', async () => {
    expect(searchButton().nativeElement.disabled).toBe(true);

    componentInstance.username.set('angular');
    await fixture.whenStable();

    expect(searchButton().nativeElement.disabled).toBe(false);
  });

  it('should issue a single GET to the expected URL', async () => {
    await search('angular');

    // `expectOne` asserts that EXACTLY one matching request is pending and
    // returns its `TestRequest` handle. It throws if there are zero or many.
    const req = httpTesting.expectOne(`${UserService.BASE_URL}/angular`);
    expect(req.request.method).toBe('GET');

    // Respond to the request so the stream emits and the test stays clean.
    req.flush(fakeUser);
  });

  it('should show the loading state while the request is pending', async () => {
    await search('angular');

    // We deliberately do NOT flush yet: the request is still open, so the
    // component should be in its loading state.
    expect(componentInstance.loading()).toBe(true);
    expect(loadingEl()).toBeTruthy();
    expect(userEl()).toBeNull();

    // Flush so `afterEach`'s `verify()` is satisfied.
    httpTesting.expectOne(`${UserService.BASE_URL}/angular`).flush(fakeUser);
  });

  it('should render the user once the request succeeds', async () => {
    await search('angular');

    const req = httpTesting.expectOne(`${UserService.BASE_URL}/angular`);
    // `flush` delivers a successful body and completes the Observable.
    req.flush(fakeUser);
    await fixture.whenStable();

    expect(componentInstance.loading()).toBe(false);
    expect(componentInstance.user()).toEqual(fakeUser);
    expect(loadingEl()).toBeNull();
    expect(
      debugElement.query(By.css('[data-testid="user-login"]')).nativeElement
        .textContent,
    ).toContain('angular');
    expect(
      debugElement.query(By.css('[data-testid="user-repos"]')).nativeElement
        .textContent,
    ).toContain('42');
  });

  it('should render "N/A" when the user has no display name', async () => {
    await search('ghost');

    httpTesting
      .expectOne(`${UserService.BASE_URL}/ghost`)
      .flush({ login: 'ghost', name: null, public_repos: 0 } as GithubUser);
    await fixture.whenStable();

    expect(
      debugElement.query(By.css('[data-testid="user-name"]')).nativeElement
        .textContent,
    ).toContain('N/A');
  });

  it('should show a friendly message on a 404', async () => {
    await search('does-not-exist');

    const req = httpTesting.expectOne(`${UserService.BASE_URL}/does-not-exist`);
    // Simulate an error RESPONSE from the server: pass a body plus the status.
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();

    expect(componentInstance.loading()).toBe(false);
    expect(componentInstance.user()).toBeNull();
    expect(errorEl().nativeElement.textContent).toContain(
      'No GitHub user named "does-not-exist".',
    );
  });

  it('should report other server errors generically', async () => {
    await search('angular');

    httpTesting
      .expectOne(`${UserService.BASE_URL}/angular`)
      .flush('Boom', { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    expect(errorEl().nativeElement.textContent).toContain('status 500');
  });

  it('should surface network failures via the error channel', async () => {
    await search('angular');

    const req = httpTesting.expectOne(`${UserService.BASE_URL}/angular`);
    // Unlike `flush`, `error` models a transport-level failure (no HTTP
    // response). The status defaults to 0, matching a real network error.
    req.error(new ProgressEvent('network error'));
    await fixture.whenStable();

    expect(componentInstance.loading()).toBe(false);
    expect(errorEl().nativeElement.textContent).toContain('status 0');
  });

  it('should trim whitespace from the username before requesting', async () => {
    await search('  angular  ');

    // Only the trimmed value should appear in the URL.
    httpTesting.expectOne(`${UserService.BASE_URL}/angular`).flush(fakeUser);
  });

  it('should not fire a request for a blank username', async () => {
    await search('   ');

    // The guard in `search()` short-circuits, so no request is made.
    httpTesting.expectNone(() => true);
    expect(componentInstance.loading()).toBe(false);
  });

  it('should replace a previous result on a new search', async () => {
    await search('angular');
    httpTesting.expectOne(`${UserService.BASE_URL}/angular`).flush(fakeUser);
    await fixture.whenStable();
    expect(componentInstance.user()).toEqual(fakeUser);

    // A second search clears the old user immediately, then resolves anew.
    const second: GithubUser = { login: 'nx', name: 'Nx', public_repos: 7 };
    await search('nx');
    expect(componentInstance.user()).toBeNull();

    httpTesting.expectOne(`${UserService.BASE_URL}/nx`).flush(second);
    await fixture.whenStable();
    expect(componentInstance.user()).toEqual(second);
  });
});
