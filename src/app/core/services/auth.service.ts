import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'ff_auth';

/**
 * Autenticación lógica (sin API). Cualquier email y contraseña no vacíos permiten el acceso.
 * El estado se guarda en sessionStorage para refrescar la pestaña.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly loggedInSignal = signal(this.readFromStorage());

  isAuthenticated(): boolean {
    return this.loggedInSignal();
  }

  login(email: string, password: string): boolean {
    if (!email?.trim() || !password?.trim()) {
      return false;
    }
    sessionStorage.setItem(STORAGE_KEY, '1');
    this.loggedInSignal.set(true);
    return true;
  }

  logout(): void {
    sessionStorage.removeItem(STORAGE_KEY);
    this.loggedInSignal.set(false);
  }

  private readFromStorage(): boolean {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  }
}
