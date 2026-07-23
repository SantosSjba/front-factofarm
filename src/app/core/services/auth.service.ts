import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { AuthUser, LoginResponse } from '../models/auth-session';
import { LocaleService } from './locale.service';

const TOKEN_KEY = 'ff_access_token';
const REFRESH_KEY = 'ff_refresh_token';
const USER_KEY = 'ff_user';
const REMEMBER_KEY = 'ff_remember';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly locale = inject(LocaleService);

  private readonly userSignal = signal<AuthUser | null>(this.readUserFromStorage());

  constructor() {
    this.locale.setTimeZone(this.userSignal()?.timeZone);
  }

  readonly user = computed(() => this.userSignal());

  isAuthenticated(): boolean {
    return !!this.getAccessToken() && !!this.userSignal();
  }

  getAccessToken(): string | null {
    return this.readStorage(TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return this.readStorage(REFRESH_KEY);
  }

  isSupportSession(): boolean {
    return !!this.userSignal()?.supportSession;
  }

  /** Operador FactoSys en consola de plataforma (no en sesión de soporte). */
  isPlatformAdmin(): boolean {
    const user = this.userSignal();
    return user?.role === 'SUPER_ADMIN' && !user.supportSession;
  }

  hasPermission(code: string): boolean {
    const user = this.userSignal();
    if (!user) return false;
    if (this.isSupportSession()) {
      return user.permissionCodes.includes(code);
    }
    if (user.role === 'SUPER_ADMIN') {
      return (
        code.startsWith('nav.platform') ||
        code.startsWith('tenants.') ||
        code.startsWith('complaints.')
      );
    }
    return user.permissionCodes.includes(code);
  }

  /** Ruta de inicio según rol (evita mandar SUPER_ADMIN al dashboard tenant). */
  defaultHomePath(): string {
    if (this.isPlatformAdmin()) return '/platform/dashboard';
    const role = this.userSignal()?.role;
    if (role === 'CAJERO' || role === 'VENDEDOR') return '/punto-venta';
    return '/dashboard';
  }

  persistSession(res: LoginResponse, remember = this.isRememberEnabled()): void {
    const store = remember ? localStorage : sessionStorage;
    const other = remember ? sessionStorage : localStorage;
    for (const key of [TOKEN_KEY, REFRESH_KEY, USER_KEY, REMEMBER_KEY]) {
      other.removeItem(key);
    }
    store.setItem(TOKEN_KEY, res.accessToken);
    store.setItem(REFRESH_KEY, res.refreshToken);
    store.setItem(USER_KEY, JSON.stringify(res.user));
    store.setItem(REMEMBER_KEY, remember ? '1' : '0');
    this.userSignal.set(res.user);
    this.locale.setTimeZone(res.user.timeZone);
  }

  login(email: string, password: string, remember = false): Observable<void> {
    const url = `${environment.apiBaseUrl}/auth/login`;
    return this.http.post<LoginResponse>(url, { email, password }).pipe(
      tap((res) => this.persistSession(res, remember)),
      map(() => undefined),
    );
  }

  exchangePanelHandoff(code: string): Observable<void> {
    const url = `${environment.apiBaseUrl}/auth/exchange-panel-handoff`;
    return this.http.post<LoginResponse>(url, { code }).pipe(
      tap((res) => this.persistSession(res, false)),
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
      tap((res) => this.persistSession(res, this.isRememberEnabled())),
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
    for (const store of [sessionStorage, localStorage]) {
      store.removeItem(TOKEN_KEY);
      store.removeItem(REFRESH_KEY);
      store.removeItem(USER_KEY);
      store.removeItem(REMEMBER_KEY);
    }
    this.userSignal.set(null);
    this.locale.resetTimeZone();
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
        const store = this.isRememberEnabled() ? localStorage : sessionStorage;
        store.setItem(USER_KEY, JSON.stringify(user));
        this.userSignal.set(user);
        this.locale.setTimeZone(user.timeZone);
      }),
    );
  }

  private isRememberEnabled(): boolean {
    return (
      localStorage.getItem(REMEMBER_KEY) === '1' || sessionStorage.getItem(REMEMBER_KEY) === '1'
    );
  }

  private readStorage(key: string): string | null {
    return sessionStorage.getItem(key) ?? localStorage.getItem(key);
  }

  private readUserFromStorage(): AuthUser | null {
    const raw = this.readStorage(USER_KEY);
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
      localStorage.removeItem(USER_KEY);
      return null;
    }
  }
}
