import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { AuthUser, LoginResponse } from '../models/auth-session';

const TOKEN_KEY = 'ff_access_token';
const USER_KEY = 'ff_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly userSignal = signal<AuthUser | null>(this.readUserFromStorage());

  readonly user = computed(() => this.userSignal());

  isAuthenticated(): boolean {
    return !!this.getAccessToken() && !!this.userSignal();
  }

  getAccessToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  login(email: string, password: string): Observable<void> {
    const url = `${environment.apiBaseUrl}/auth/login`;
    return this.http.post<LoginResponse>(url, { email, password }).pipe(
      tap((res: LoginResponse) => {
        sessionStorage.setItem(TOKEN_KEY, res.accessToken);
        sessionStorage.setItem(USER_KEY, JSON.stringify(res.user));
        this.userSignal.set(res.user);
      }),
      map(() => undefined),
    );
  }

  logout(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    this.userSignal.set(null);
  }

  private readUserFromStorage(): AuthUser | null {
    const raw = sessionStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      sessionStorage.removeItem(USER_KEY);
      return null;
    }
  }
}
