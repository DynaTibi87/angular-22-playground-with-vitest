import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';

export type GithubUser = {
  login: string;
  name: string | null;
  public_repos: number;
};

@Service()
export class UserService {
  static readonly BASE_URL = 'https://api.github.com/users';

  readonly #http = inject(HttpClient);

  fetchUser(username: string): Observable<GithubUser> {
    return this.#http.get<GithubUser>(`${UserService.BASE_URL}/${username}`);
  }
}
