import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { vi } from 'vitest';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, String(value)),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
      key: (index: number) => [...values.keys()][index] ?? null,
      get length() { return values.size; },
    } satisfies Storage);
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    sessionStorage.clear();
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it('login persiste tokens y usuario en sessionStorage', () => {
    service.login('admin@factosysperu.com', 'Admin123!').subscribe();

    const req = http.expectOne(`${environment.apiBaseUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      email: 'admin@factosysperu.com',
      password: 'Admin123!',
    });

    req.flush({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: 'user-1',
        nombre: 'Admin',
        email: 'admin@factosysperu.com',
        role: 'ADMINISTRADOR',
        establecimientoId: 'est-1',
        permissionCodes: ['users.read'],
      },
    });

    expect(service.isAuthenticated()).toBe(true);
    expect(service.getAccessToken()).toBe('access-token');
    expect(service.hasPermission('users.read')).toBe(true);
    expect(service.hasPermission('users.write')).toBe(false);
  });

  it('forgotPassword llama al endpoint público', () => {
    service.forgotPassword('user@test.com').subscribe();

    const req = http.expectOne(`${environment.apiBaseUrl}/auth/forgot-password`);
    expect(req.request.method).toBe('POST');
    req.flush({ ok: true });
  });

  it('hasPermission respeta permissionCodes para vendedor', () => {
    sessionStorage.clear();
    sessionStorage.setItem('ff_access_token', 'token');
    sessionStorage.setItem('ff_refresh_token', 'r');
    sessionStorage.setItem(
      'ff_user',
      JSON.stringify({
        id: 'u2',
        nombre: 'Vendedor',
        email: 'v@test.com',
        role: 'VENDEDOR',
        establecimientoId: 'est-1',
        permissionCodes: ['users.read'],
      }),
    );

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService],
    });
    const fresh = TestBed.inject(AuthService);

    expect(fresh.hasPermission('users.read')).toBe(true);
    expect(fresh.hasPermission('users.write')).toBe(false);
  });
});
