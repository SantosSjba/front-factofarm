import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { DirectoryApiService } from '../../services/directory-api.service';

type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  route: string;
  done: boolean;
};

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [
    RouterLink,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    ButtonComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="breadcrumb" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-title-sm font-semibold">Configuración inicial</h1>
    </app-page-toolbar>

    <app-component-card className="mt-4" title="Asistente de primera configuración">
      <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Complete estos pasos para operar el POS con validez fiscal y control de inventario.
      </p>
      <ol class="space-y-4">
        @for (step of steps(); track step.id; let i = $index) {
          <li
            class="flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
            [class.border-emerald-200]="step.done"
            [class.bg-emerald-50]="step.done"
            [class.dark:border-emerald-900/40]="step.done"
            [class.dark:bg-emerald-950/20]="step.done"
            [class.border-gray-200]="!step.done"
            [class.dark:border-gray-800]="!step.done"
          >
            <div>
              <p class="text-sm font-semibold text-gray-800 dark:text-white/90">
                {{ i + 1 }}. {{ step.title }}
                @if (step.done) {
                  <span class="ml-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">✓ Listo</span>
                }
              </p>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">{{ step.description }}</p>
            </div>
            <a [routerLink]="step.route">
              <app-button size="sm" [variant]="step.done ? 'outline' : 'primary'">
                {{ step.done ? 'Revisar' : 'Configurar' }}
              </app-button>
            </a>
          </li>
        }
      </ol>
      @if (allDone()) {
        <p class="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
          Configuración básica completa. Puede iniciar ventas en el punto de venta.
        </p>
      }
    </app-component-card>
  `,
})
export class OnboardingComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly auth = inject(AuthService);

  protected readonly breadcrumb: BreadcrumbSegment[] = [
    { label: 'Dashboard' },
    { label: 'Configuración inicial' },
  ];

  protected readonly establishmentsQuery = injectQuery(() => ({
    queryKey: ['onboarding', 'establishments'] as const,
    queryFn: () => firstValueFrom(this.api.listEstablishmentsPaged({ page: 1, pageSize: 5 })),
    enabled: !this.auth.isPlatformAdmin(),
  }));

  protected readonly establishmentId = computed(() => this.establishmentsQuery.data()?.items?.[0]?.id ?? '');

  protected readonly seriesQuery = injectQuery(() => ({
    queryKey: ['onboarding', 'series', this.establishmentId()] as const,
    queryFn: () => firstValueFrom(this.api.listEstablishmentSeries(this.establishmentId())),
    enabled: !!this.establishmentId(),
  }));

  protected readonly productsQuery = injectQuery(() => ({
    queryKey: ['onboarding', 'products'] as const,
    queryFn: () => firstValueFrom(this.api.listProducts({ page: 1, pageSize: 1 })),
    enabled: !this.auth.isPlatformAdmin(),
  }));

  protected readonly billingConfigQuery = injectQuery(() => ({
    queryKey: ['billing', 'config', 'onboarding'] as const,
    queryFn: () => firstValueFrom(this.api.getBillingConfig()),
    enabled: !this.auth.isPlatformAdmin(),
  }));

  protected readonly cashSessionQuery = injectQuery(() => ({
    queryKey: ['cash', 'active-session', 'onboarding'] as const,
    queryFn: () => firstValueFrom(this.api.getActiveCashSession()),
    enabled: !this.auth.isPlatformAdmin(),
  }));

  protected readonly steps = computed((): OnboardingStep[] => {
    const establishment = this.establishmentsQuery.data()?.items?.[0];
    const billing = this.billingConfigQuery.data();
    const hasProducts = (this.productsQuery.data()?.total ?? 0) > 0;
    const hasCash = !!this.cashSessionQuery.data();
    const series = this.seriesQuery.data() ?? [];

    const establishmentDone = !!establishment?.nombre?.trim() && !!establishment?.codigo?.trim();
    const seriesDone = series.length > 0;
    const oseDone =
      billing?.provider === 'FACTILIZA' || billing?.provider === 'NUBEFACT'
        ? !!billing?.rucEmisor?.trim()
        : billing?.provider === 'MOCK';

    return [
      {
        id: 'establishment',
        title: 'Establecimiento y RUC',
        description: 'Verifique logo, razón social, RUC, ubigeo y datos DIGEMID del local.',
        route: '/mi-farmacia',
        done: establishmentDone,
      },
      {
        id: 'series',
        title: 'Series SUNAT',
        description: 'Configure series de boleta, factura, notas y guías.',
        route: '/series',
        done: seriesDone,
      },
      {
        id: 'ose',
        title: 'Facturación electrónica (OSE)',
        description: 'Conecte Factiliza o Nubefact con certificado y token de producción.',
        route: '/comprobante-electronico',
        done: !!oseDone,
      },
      {
        id: 'products',
        title: 'Primer producto en catálogo',
        description: 'Cargue al menos un producto con precio, IGV y stock.',
        route: '/productos',
        done: hasProducts,
      },
      {
        id: 'cash',
        title: 'Apertura de caja',
        description: 'Abra sesión de caja antes de vender en mostrador.',
        route: '/caja-chica-pos',
        done: hasCash,
      },
    ];
  });

  protected readonly allDone = computed(() => this.steps().every((step) => step.done));
}
