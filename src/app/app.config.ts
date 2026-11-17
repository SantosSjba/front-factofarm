import { HttpClient } from '@angular/common/http';
import { PLATFORM_ID, inject, provideAppInitializer } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../environments/environment';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { isPlatformServer, registerLocaleData } from '@angular/common';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import localeEsPe from '@angular/common/locales/es-PE';
import {
  ApplicationConfig,
  ErrorHandler,
  LOCALE_ID,
  DEFAULT_CURRENCY_CODE,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withNavigationErrorHandler, withViewTransitions } from '@angular/router';
import { OverlayContainer } from '@angular/cdk/overlay';
import { QueryClient, provideTanStackQuery } from '@tanstack/angular-query-experimental';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { apiErrorInterceptor } from './core/interceptors/api-error.interceptor';
import { GlobalErrorHandler } from './core/handlers/global-error.handler';
import { isStaleChunkError, reloadOnce } from './core/handlers/stale-chunk';
import { TopLayerOverlayContainer } from './shared/services/top-layer-overlay-container';

registerLocaleData(localeEsPe);


/** Pantalla que no se pudo descargar (versión anterior en memoria): carga completa a esa dirección. */
function reloadOnStaleChunk(error: unknown, url: string): void {
  if (isStaleChunkError(error)) reloadOnce(url);
}

/** Tras navegar, si el foco se perdió (quedó en el body), lo lleva al título de la nueva pantalla. */
function focusPageHeadingIfLost(): void {
  const active = document.activeElement as HTMLElement | null;
  // Perdido: en el body, fuera del DOM o en algo que ya no se ve (enlace del menú lateral cerrado).
  const visible = active?.checkVisibility?.({ visibilityProperty: true }) ?? true;
  if (active && active !== document.body && active.isConnected && visible) return;
  const heading = document.querySelector<HTMLElement>('main h1, h1');
  if (!heading) return;
  if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
  heading.focus({ preventScroll: true });
}

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
      // Al prerenderizar (build) no se llama a la API: se usan los valores embebidos en el build.
      if (isPlatformServer(inject(PLATFORM_ID))) return;
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
    // Reutiliza el HTML prerenderizado de las páginas públicas en vez de volver a dibujarlo.
    provideClientHydration(withEventReplay()),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withInterceptors([authInterceptor, apiErrorInterceptor])),
    provideTanStackQuery(queryClient),
    provideRouter(
      routes,
      // Fundido corto entre pantallas (View Transitions, Baseline). Con "reducir movimiento" no hay
      // animación (styles.css). Si el foco quedó en algo que ya no existe, pasa al título de la página.
      // Pantalla que no carga porque hubo un deploy (el index.html viejo pide archivos que ya no
      // existen): recarga una vez para traer la versión nueva, en lugar de mostrar un error.
      withNavigationErrorHandler(({ error, url }) => reloadOnStaleChunk(error, url)),
      withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated: ({ transition }) => {
          transition.finished.then(focusPageHeadingIfLost, () => undefined);
        },
      }),
    ),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    // Las listas desplegables del CDK siguen al <dialog> abierto (si no, quedan inertes detrás).
    { provide: OverlayContainer, useExisting: TopLayerOverlayContainer },
  ],
};
