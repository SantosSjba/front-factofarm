import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { AuthUser, LoginResponse } from '../models/auth-session';

const TOKEN_KEY = 'ff_access_token';
const REFRESH_KEY = 'ff_refresh_token';
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

  getRefreshToken(): string | null {
    return sessionStorage.getItem(REFRESH_KEY);
  }

  hasPermission(code: string): boolean {
    const user = this.userSignal();
    if (!user) return false;
    if (
      user.role === 'ADMINISTRADOR' ||
      user.role === 'SUPER_ADMIN' ||
      user.role === 'ADMIN_CADENA'
    ) {
      return true;
    }
    return user.permissionCodes.includes(code);
  }

  login(email: string, password: string): Observable<void> {
    const url = `${environment.apiBaseUrl}/auth/login`;
    return this.http.post<LoginResponse>(url, { email, password }).pipe(
      tap((res) => this.persistSession(res)),
      map(() => undefined),
    );
  }

  refreshSession(): Observable<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return new Observable((sub) => {
        sub.next(false);
        sub.complete();
      });
    }
    const url = `${environment.apiBaseUrl}/auth/refresh`;
    return this.http.post<LoginResponse>(url, { refreshToken }).pipe(
      tap((res) => this.persistSession(res)),
      map(() => true),
    );
  }

  logout(): void {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      const url = `${environment.apiBaseUrl}/auth/logout`;
      this.http.post(url, { refreshToken }).subscribe({ error: () => undefined });
    }
    this.clearSession();
  }

  clearSession(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(USER_KEY);
    this.userSignal.set(null);
  }

  forgotPassword(email: string): Observable<void> {
    const url = `${environment.apiBaseUrl}/auth/forgot-password`;
    return this.http.post<{ ok: true }>(url, { email }).pipe(map(() => undefined));
  }

  resetPassword(token: string, newPassword: string): Observable<void> {
    const url = `${environment.apiBaseUrl}/auth/reset-password`;
    return this.http.post<{ ok: true }>(url, { token, newPassword }).pipe(map(() => undefined));
  }

  loadMe(): Observable<AuthUser> {
    const url = `${environment.apiBaseUrl}/auth/me`;
    return this.http.get<AuthUser>(url).pipe(
      tap((user) => {
        sessionStorage.setItem(USER_KEY, JSON.stringify(user));
        this.userSignal.set(user);
      }),
    );
  }

  private persistSession(res: LoginResponse): void {
    sessionStorage.setItem(TOKEN_KEY, res.accessToken);
    sessionStorage.setItem(REFRESH_KEY, res.refreshToken);
    sessionStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this.userSignal.set(res.user);
  }

  private readUserFromStorage(): AuthUser | null {
    const raw = sessionStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as AuthUser;
      if (!parsed.permissionCodes) {
        parsed.permissionCodes = [];
      }
      return parsed;
    } catch {
      sessionStorage.removeItem(USER_KEY);
      return null;
    }
  }
}
