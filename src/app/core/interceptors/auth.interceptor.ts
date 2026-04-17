import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

/** Adjunta `Authorization: Bearer` a las peticiones hacia `apiBaseUrl`. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const base = environment.apiBaseUrl;
  if (!base || !req.url.startsWith(base)) {
    return next(req);
  }
  const token = auth.getAccessToken();
  if (!token) {
    return next(req);
  }
  return next(
    req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }),
  );
};
