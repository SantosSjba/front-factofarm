import { HttpClient } from '@angular/common/http';
import { inject, provideAppInitializer } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../environments/environment';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEsPe from '@angular/common/locales/es-PE';
import {
  ApplicationConfig,
  ErrorHandler,
  LOCALE_ID,
  DEFAULT_CURRENCY_CODE,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { QueryClient, provideTanStackQuery } from '@tanstack/angular-query-experimental';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { apiErrorInterceptor } from './core/interceptors/api-error.interceptor';
import { GlobalErrorHandler } from './core/handlers/global-error.handler';

registerLocaleData(localeEsPe);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideAppInitializer(async () => {
      try {
        const info = await firstValueFrom(inject(HttpClient).get<Record<string, string>>(`${environment.apiBaseUrl}/public/settings`).pipe(timeout(5000)));
        if (info['CONTACT_EMAIL'] !== undefined) environment.contactEmail = info['CONTACT_EMAIL'];
        if (info['CONTACT_WHATSAPP'] !== undefined) environment.contactWhatsApp = info['CONTACT_WHATSAPP'];
        if (info['SITE_URL']) environment.siteUrl = info['SITE_URL'];
        environment.company = { legalName: info['COMPANY_LEGAL_NAME'] || environment.company.legalName,
          ruc: info['COMPANY_RUC'] || environment.company.ruc, address: info['COMPANY_ADDRESS'] || environment.company.address };
      } catch { /* Permite cargar la aplicación si la API no está disponible. */ }
    }),
    { provide: LOCALE_ID, useValue: 'es-PE' },
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'PEN' },
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withInterceptors([authInterceptor, apiErrorInterceptor])),
    provideTanStackQuery(queryClient),
    provideRouter(routes),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
};
