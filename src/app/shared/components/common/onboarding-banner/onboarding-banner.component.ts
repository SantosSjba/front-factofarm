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
        class="mb-6 rounded-xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-500/30 dark:bg-brand-500/10"
        role="region"
        aria-label="Guía de primera configuración"
      >
        <h2 class="text-base font-semibold text-brand-800 dark:text-brand-200">
          Primera configuración FactoFarm
        </h2>
        <p class="mt-1 text-sm text-brand-700 dark:text-brand-300">
          Complete estos pasos para operar el POS: establecimiento → series SUNAT → OSE → productos → caja.
          <a routerLink="/onboarding" class="ml-1 font-medium underline">Ver asistente completo</a>
        </p>
        <ol class="mt-3 list-decimal space-y-1 pl-5 text-sm text-brand-800 dark:text-brand-200">
          <li><a routerLink="/establecimientos" class="underline">Verificar establecimiento</a></li>
          <li><a routerLink="/series" class="underline">Configurar series de comprobantes</a></li>
          <li><a routerLink="/productos" class="underline">Cargar catálogo de productos</a></li>
          <li><a routerLink="/caja-chica-pos" class="underline">Abrir caja e iniciar ventas</a></li>
        </ol>
        <div class="mt-4 flex flex-wrap gap-2">
          <a routerLink="/onboarding">
            <app-button size="sm" variant="primary">Abrir asistente</app-button>
          </a>
          <app-button size="sm" variant="outline" (btnClick)="dismiss()">Entendido, ocultar guía</app-button>
        </div>
      </div>
    }
  `,
})
export class OnboardingBannerComponent {
  private readonly auth = inject(AuthService);

  protected readonly visible = signal(
    !this.auth.isPlatformAdmin() && localStorage.getItem(STORAGE_KEY) !== '1',
  );

  protected dismiss(): void {
    localStorage.setItem(STORAGE_KEY, '1');
    this.visible.set(false);
  }
}
