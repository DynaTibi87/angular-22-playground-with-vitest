import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GithubUser, UserService } from './user.service';

@Component({
  selector: 'app-user-panel',
  imports: [FormsModule],
  template: `
    <label class="user-panel__label">
      GitHub username
      <input
        type="text"
        data-testid="username"
        [(ngModel)]="username"
        (keyup.enter)="search()"
        placeholder="e.g. angular"
      />
    </label>

    <button
      type="button"
      data-testid="search"
      [disabled]="loading() || !username().trim()"
      (click)="search()"
    >
      Look up
    </button>

    @if (loading()) {
      <p data-testid="loading">Loading…</p>
    }

    @if (user(); as u) {
      <dl data-testid="user">
        <dt>Login</dt>
        <dd data-testid="user-login">{{ u.login }}</dd>
        <dt>Name</dt>
        <dd data-testid="user-name">{{ u.name ?? 'N/A' }}</dd>
        <dt>Public repos</dt>
        <dd data-testid="user-repos">{{ u.public_repos }}</dd>
      </dl>
    }

    @if (error(); as message) {
      <p data-testid="error" role="alert">{{ message }}</p>
    }
  `,
})
export class UserPanel {
  private readonly userService = inject(UserService);

  readonly username = signal('');
  readonly loading = signal(false);
  readonly user = signal<GithubUser | null>(null);
  readonly error = signal('');

  search(): void {
    const username = this.username().trim();
    if (!username || this.loading()) {
      return;
    }

    this.loading.set(true);
    this.user.set(null);
    this.error.set('');

    this.userService.fetchUser(username).subscribe({
      next: (user) => {
        this.user.set(user);
        this.loading.set(false);
      },
      error: (response: HttpErrorResponse) => {
        this.error.set(
          response.status === 404
            ? `No GitHub user named "${username}".`
            : `Request failed (status ${response.status}).`,
        );
        this.loading.set(false);
      },
    });
  }
}
