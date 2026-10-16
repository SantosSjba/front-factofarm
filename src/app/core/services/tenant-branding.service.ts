import { Injectable, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { AuthService } from './auth.service';
import { FilesApiService } from './files-api.service';

const DEFAULT_NAV_LOGO = '/images/logo/logo-nav.png';
const DEFAULT_ICON_LOGO = '/images/logo/logo-icon.svg';

/** Branding del panel según el logo del establecimiento del cliente SaaS. */
@Injectable({ providedIn: 'root' })
export class TenantBrandingService {
  private readonly auth = inject(AuthService);
  private readonly files = inject(FilesApiService);

  /** URL absoluta del logo del cliente, o null si usa FactoFarm. */
  readonly tenantLogoUrl = computed(() => {
    const path = this.auth.user()?.logoUrl;
    if (!path) return null;
    return this.files.absoluteFileUrl(path);
  });

  /** `GET /files/:id` exige Bearer: el logo se descarga y se sirve como `blob:`. */
  private readonly tenantLogoSrc = toSignal(
    toObservable(this.tenantLogoUrl).pipe(switchMap((url) => this.files.displayUrl(url))),
    { initialValue: null },
  );

  /** Logo ancho (sidebar expandido / header móvil). */
  readonly navLogoSrc = computed(() => this.tenantLogoSrc() ?? DEFAULT_NAV_LOGO);

  /** Logo compacto (sidebar colapsado). */
  readonly iconLogoSrc = computed(() => this.tenantLogoSrc() ?? DEFAULT_ICON_LOGO);

  readonly brandAlt = computed(
    () => this.auth.user()?.tenantNombre?.trim() || 'FactoFarm',
  );

  readonly usesTenantLogo = computed(() => !!this.tenantLogoSrc());
}
