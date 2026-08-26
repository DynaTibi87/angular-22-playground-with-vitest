import { Component, DebugElement, input, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { inputBinding } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileCard, Profile } from './profile-card';
import { UserBadge } from './user-badge';
import { ActivityFeed } from './activity-feed';
import { ActivityService } from './activity.service';

// A stand-in for the heavy <app-activity-feed> child. It reuses the SAME
// selector and declares the SAME inputs, so the parent template binds to it
// without changes - but it does no real work (no service, no async load).
// Stubbing an "unneeded" child keeps the parent test fast and focused.
@Component({
  selector: 'app-activity-feed',
  template: `<div data-testid="activity-feed-stub">ActivityFeed stub</div>`,
})
class ActivityFeedStub {
  // Must mirror the real component's input so `[owner]="..."` still resolves.
  readonly owner = input.required<string>();
}

describe('ProfileCard (nested components)', () => {
  let fixture: ComponentFixture<ProfileCard>;
  let debugElement: DebugElement;

  // Drives the parent's required `profile` input, mirroring `[profile]="..."`.
  let profile: ReturnType<typeof signal<Profile>>;

  beforeEach(async () => {
    profile = signal<Profile>({ name: 'Ada Lovelace', role: 'Engineer' });

    TestBed.configureTestingModule({
      imports: [ProfileCard],
    });

    // Swap the real ActivityFeed for the stub. `overrideComponent` rewrites the
    // parent's standalone `imports`, so its template now matches the stub by
    // selector instead of the real, service-backed child.
    TestBed.overrideComponent(ProfileCard, {
      remove: { imports: [ActivityFeed] },
      add: { imports: [ActivityFeedStub] },
    });

    fixture = TestBed.createComponent(ProfileCard, {
      bindings: [inputBinding('profile', profile)],
    });
    debugElement = fixture.debugElement;

    await fixture.whenStable();
  });

  describe('rendering parent and child components', () => {
    it('should render', () => {
      expect(fixture.componentInstance).toBeTruthy();
    });

    it('should render the parent with both nested children', () => {
      // The real child stays; the heavy child is replaced by its stub.
      expect(debugElement.query(By.directive(UserBadge))).toBeTruthy();
      expect(debugElement.query(By.directive(ActivityFeedStub))).toBeTruthy();
    });
  });

  describe('testing the real nested child (UserBadge)', () => {
    it('should pass the parent inputs down to the child instance', () => {
      // Grab the child's DebugElement by its component type, then read the
      // child component instance to assert the inputs it actually received.
      const badge = debugElement.query(By.directive(UserBadge));
      const badgeInstance = badge.componentInstance as UserBadge;

      expect(badgeInstance.name()).toBe('Ada Lovelace');
      expect(badgeInstance.role()).toBe('Engineer');
    });

    it('should render the values the child projected into the DOM', () => {
      const name = debugElement.query(By.css('[data-testid="badge-name"]'));
      const role = debugElement.query(By.css('[data-testid="badge-role"]'));

      expect(name.nativeElement.textContent).toContain('Ada Lovelace');
      expect(role.nativeElement.textContent).toContain('Engineer');
    });

    it('should update the child when the parent input changes', async () => {
      // Change the parent's input and let change detection flow into the child.
      profile.set({ name: 'Grace Hopper', role: 'Admiral' });
      await fixture.whenStable();

      const badge = debugElement.query(By.directive(UserBadge));
      const badgeInstance = badge.componentInstance as UserBadge;

      expect(badgeInstance.name()).toBe('Grace Hopper');
      expect(
        debugElement.query(By.css('[data-testid="badge-name"]')).nativeElement
          .textContent,
      ).toContain('Grace Hopper');
    });
  });

  describe('stubbing the unneeded child (ActivityFeed)', () => {
    it('should render the stub instead of the real component', () => {
      // The stub renders...
      expect(
        debugElement.query(By.css('[data-testid="activity-feed-stub"]')),
      ).toBeTruthy();
      // ...and the real component's markup is nowhere in the DOM.
      expect(
        debugElement.query(By.css('[data-testid="feed-loading"]')),
      ).toBeNull();
    });

    it('should still bind the parent input onto the stub', () => {
      // The stub declares the same `owner` input, so the parent binding works.
      const stub = debugElement.query(By.directive(ActivityFeedStub));
      const stubInstance = stub.componentInstance as ActivityFeedStub;

      expect(stubInstance.owner()).toBe('Ada Lovelace');
    });

    it('should never touch the expensive service the real child depends on', () => {
      // Because the real ActivityFeed is not in the tree, its ActivityService
      // collaborator is never resolved or called - the whole point of stubbing.
      const service = TestBed.inject(ActivityService);
      const loadSpy = vi.spyOn(service, 'loadRecentActivity');

      expect(loadSpy).not.toHaveBeenCalled();
    });
  });
});
