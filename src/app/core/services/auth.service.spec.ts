import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
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
  });

  it('login persiste tokens y usuario en sessionStorage', () => {
    service.login('admin@factofarm.local', 'Admin123!').subscribe();

    const req = http.expectOne(`${environment.apiBaseUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      email: 'admin@factofarm.local',
      password: 'Admin123!',
    });

    req.flush({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: 'user-1',
        nombre: 'Admin',
        email: 'admin@factofarm.local',
        role: 'ADMINISTRADOR',
        establecimientoId: 'est-1',
        permissionCodes: ['users.read'],
      },
    });

    expect(service.isAuthenticated()).toBe(true);
    expect(service.getAccessToken()).toBe('access-token');
    expect(service.hasPermission('users.write')).toBe(true);
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
