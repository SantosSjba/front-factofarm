import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ButtonComponent } from '../../ui/button/button.component';

const STORAGE_KEY = 'factofarm.onboarding.dismissed';

@Component({
  selector: 'app-onboarding-banner',
  standalone: true,
  imports: [ButtonComponent, RouterLink],
  template: `
    @if (visible()) {
      <div
        class="mb-3 flex flex-col gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2.5 dark:border-brand-500/30 dark:bg-brand-500/10 lg:flex-row lg:items-center lg:justify-between"
        role="region"
        aria-label="Guía de primera configuración"
      >
        <div class="min-w-0">
          <h2 class="text-sm font-semibold text-brand-800 dark:text-brand-200">Primera configuración</h2>
          <ol class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-theme-xs text-brand-800 dark:text-brand-200">
            <li><a routerLink="/establecimientos" class="underline">1. Establecimiento</a></li>
            <li><a routerLink="/series" class="underline">2. Series</a></li>
            <li><a routerLink="/productos" class="underline">3. Productos</a></li>
            <li><a routerLink="/caja-chica-pos" class="underline">4. Abrir caja</a></li>
          </ol>
        </div>
        <div class="flex shrink-0 flex-wrap gap-2">
          <a routerLink="/onboarding">
            <app-button startIconName="mdi:help-circle-outline" size="sm" variant="primary">Asistente</app-button>
          </a>
          <app-button startIconName="mdi:check" size="sm" variant="outline" (btnClick)="dismiss()">Ocultar</app-button>
        </div>
      </div>
    }
  `,
})
export class OnboardingBannerComponent {
  private readonly auth = inject(AuthService);

  /** Solo para quien configura la empresa: los pasos (local, series…) piden ese acceso. */
  protected readonly visible = signal(
    !this.auth.isPlatformAdmin() &&
      this.auth.hasPermission('nav.establecimientos') &&
      localStorage.getItem(STORAGE_KEY) !== '1',
  );

  protected dismiss(): void {
    localStorage.setItem(STORAGE_KEY, '1');
    this.visible.set(false);
  }
}
