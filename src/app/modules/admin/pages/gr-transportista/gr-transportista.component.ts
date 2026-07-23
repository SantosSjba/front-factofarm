import { Component, computed, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { LabelComponent } from '../../../../shared/components/form/label/label.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import type {
  DepartureAddressDto,
  PaginatedResponseDto,
  ShippingCarrierDto,
  ShippingDriverDto,
  ShippingVehicleDto,
} from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

function paginatedItems<T>(data: PaginatedResponseDto<T> | T[] | undefined): T[] {
  if (!data) return [];
  return Array.isArray(data) ? data : data.items;
}

@Component({
  selector: 'app-gr-transportista',
  standalone: true,
  imports: [
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    FormSelectComponent,
    InputFieldComponent,
    LabelComponent,
    ButtonComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Guías' }, { label: 'GR transportista' }]" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-title-sm font-semibold">Guía de remisión transportista</h1>
    </app-page-toolbar>
    <app-component-card className="mt-4" title="Emitir guía transportista">
      <p class="mb-4 text-sm text-gray-500">
        Seleccione transportista, conductor y vehículo desde los maestros. Los datos del destinatario se completan automáticamente.
      </p>
      <div class="grid max-w-xl gap-4">
        <div>
          <app-label>Transportista</app-label>
          <app-form-select
            [options]="carrierOptions()"
            [value]="carrierId()"
            (valueChange)="onCarrierChange('' + $event)"
          />
        </div>
        <div>
          <app-label>Conductor</app-label>
          <app-form-select
            [options]="driverOptions()"
            [value]="driverId()"
            (valueChange)="driverId.set('' + $event)"
          />
        </div>
        <div>
          <app-label>Vehículo</app-label>
          <app-form-select
            [options]="vehicleOptions()"
            [value]="vehicleId()"
            (valueChange)="vehicleId.set('' + $event)"
          />
        </div>
        <div>
          <app-label>Dirección de partida</app-label>
          <app-form-select
            [options]="departureOptions()"
            [value]="departureId()"
            (valueChange)="departureId.set('' + $event)"
          />
        </div>
        <div class="border-t border-gray-100 pt-4 dark:border-gray-800">
          <p class="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">Destinatario (autocompletado)</p>
          <app-input-field [value]="customer()" (valueChange)="customer.set('' + $event)" placeholder="Razón social" />
          <div class="mt-3 grid grid-cols-2 gap-2">
            <app-input-field [value]="docType()" (valueChange)="docType.set('' + $event)" placeholder="Tipo doc (6=RUC)" />
            <app-input-field [value]="docNumber()" (valueChange)="docNumber.set('' + $event)" placeholder="Número documento" />
          </div>
        </div>
        <app-input-field [value]="description()" (valueChange)="description.set('' + $event)" placeholder="Concepto / motivo del traslado" />
        <app-input-field [value]="amount()" (valueChange)="amount.set('' + $event)" placeholder="Valor referencial (inc. IGV)" />
        @if (previewDescription()) {
          <p class="text-xs text-gray-500"><strong>Descripción en comprobante:</strong> {{ previewDescription() }}</p>
        }
        @if (specialDocumentBlockedMessage(); as blocked) {
          <p class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            {{ blocked }}
          </p>
        }
        <app-button
          variant="primary"
          [disabled]="emitMutation.isPending() || !canEmitSpecialDocument()" [loading]="emitMutation.isPending()"
          (btnClick)="emitMutation.mutate()"
        >
          Emitir guía transportista
        </app-button>
      </div>
    </app-component-card>
  `,
})
export class GrTransportistaComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly carrierId = signal('');
  protected readonly driverId = signal('');
  protected readonly vehicleId = signal('');
  protected readonly departureId = signal('');
  protected readonly customer = signal('');
  protected readonly docType = signal('6');
  protected readonly docNumber = signal('');
  protected readonly description = signal('');
  protected readonly amount = signal('');

  protected readonly billingConfigQuery = injectQuery(() => ({
    queryKey: ['billing', 'config'] as const,
    queryFn: () => firstValueFrom(this.api.getBillingConfig()),
  }));

  protected readonly billingCapabilities = computed(() => this.billingConfigQuery.data()?.capabilities);

  protected canEmitSpecialDocument(): boolean {
    const caps = this.billingCapabilities();
    if (!caps) return true;
    return !caps.unsupportedSpecialDocuments.some((row) => row.documentType === 'GUIA_REMISION_TRANSPORTISTA');
  }

  protected specialDocumentBlockedMessage(): string | null {
    const caps = this.billingCapabilities();
    return (
      caps?.unsupportedSpecialDocuments.find((row) => row.documentType === 'GUIA_REMISION_TRANSPORTISTA')?.reason ??
      null
    );
  }

  protected readonly carriersQuery = injectQuery(() => ({
    queryKey: ['shipping', 'carriers', 'gr-transportista'] as const,
    queryFn: () => firstValueFrom(this.api.listShippingCarriers({ pageSize: 200 })),
  }));

  protected readonly driversQuery = injectQuery(() => ({
    queryKey: ['shipping', 'drivers', 'gr-transportista', this.carrierId()] as const,
    queryFn: () =>
      firstValueFrom(
        this.api.listShippingDrivers({
          carrierId: this.carrierId() || undefined,
          pageSize: 200,
        }),
      ),
  }));

  protected readonly vehiclesQuery = injectQuery(() => ({
    queryKey: ['shipping', 'vehicles', 'gr-transportista', this.carrierId()] as const,
    queryFn: () =>
      firstValueFrom(
        this.api.listShippingVehicles({
          carrierId: this.carrierId() || undefined,
          pageSize: 200,
        }),
      ),
  }));

  protected readonly departuresQuery = injectQuery(() => ({
    queryKey: ['shipping', 'departure-addresses', 'gr-transportista'] as const,
    queryFn: () => firstValueFrom(this.api.listDepartureAddresses({ pageSize: 200 })),
  }));

  protected readonly carriers = computed(() =>
    paginatedItems(this.carriersQuery.data() as PaginatedResponseDto<ShippingCarrierDto> | ShippingCarrierDto[] | undefined),
  );
  protected readonly drivers = computed(() =>
    paginatedItems(this.driversQuery.data() as PaginatedResponseDto<ShippingDriverDto> | ShippingDriverDto[] | undefined),
  );
  protected readonly vehicles = computed(() =>
    paginatedItems(this.vehiclesQuery.data() as PaginatedResponseDto<ShippingVehicleDto> | ShippingVehicleDto[] | undefined),
  );
  protected readonly departures = computed(() =>
    paginatedItems(this.departuresQuery.data() as PaginatedResponseDto<DepartureAddressDto> | DepartureAddressDto[] | undefined),
  );

  protected readonly carrierOptions = computed(() => [
    { value: '', label: 'Seleccionar transportista' },
    ...this.carriers().map((c) => ({ value: c.id, label: `${c.ruc} · ${c.razonSocial}` })),
  ]);

  protected readonly driverOptions = computed(() => [
    { value: '', label: 'Seleccionar conductor' },
    ...this.drivers().map((d) => ({
      value: d.id,
      label: `${d.nombres} ${d.apellidos}${d.licencia ? ` · Lic. ${d.licencia}` : ''}`,
    })),
  ]);

  protected readonly vehicleOptions = computed(() => [
    { value: '', label: 'Seleccionar vehículo' },
    ...this.vehicles().map((v) => ({
      value: v.id,
      label: `${v.placa}${v.marca ? ` · ${v.marca}` : ''}${v.modelo ? ` ${v.modelo}` : ''}`,
    })),
  ]);

  protected readonly departureOptions = computed(() => [
    { value: '', label: 'Seleccionar dirección de partida' },
    ...this.departures().map((d) => ({ value: d.id, label: `${d.codigo} · ${d.nombre}` })),
  ]);

  protected readonly previewDescription = computed(() => this.buildLineDescription());

  protected onCarrierChange(id: string) {
    this.carrierId.set(id);
    this.driverId.set('');
    this.vehicleId.set('');

    const carrier = this.carriers().find((c) => c.id === id);
    if (carrier) {
      this.customer.set(carrier.razonSocial);
      this.docType.set('6');
      this.docNumber.set(carrier.ruc);
      return;
    }

    this.customer.set('');
    this.docNumber.set('');
  }

  protected buildLineDescription(): string {
    const parts: string[] = [];
    const base = this.description().trim();
    if (base) parts.push(base);

    const driver = this.drivers().find((d) => d.id === this.driverId());
    if (driver) {
      parts.push(
        `Conductor: ${driver.nombres} ${driver.apellidos}${driver.licencia ? ` · Lic. ${driver.licencia}` : ''}`,
      );
    }

    const vehicle = this.vehicles().find((v) => v.id === this.vehicleId());
    if (vehicle) {
      parts.push(`Vehículo: ${vehicle.placa}${vehicle.marca ? ` · ${vehicle.marca}` : ''}`);
    }

    const departure = this.departures().find((d) => d.id === this.departureId());
    if (departure) {
      parts.push(`Partida: ${departure.nombre} · ${departure.direccion}`);
    }

    return parts.join(' | ');
  }

  protected readonly emitMutation = injectMutation(() => ({
    mutationFn: () => {
      const total = Number(this.amount());
      if (!Number.isFinite(total) || total <= 0) throw new Error('Monto inválido');
      if (!this.customer().trim() || !this.docNumber().trim()) {
        throw new Error('Seleccione un transportista o complete el destinatario');
      }
      const igv = Math.round(total * 0.18 * 100) / 100;
      const subtotal = Math.round((total - igv) * 100) / 100;
      const lineDesc = this.buildLineDescription() || 'Traslado de mercadería';
      return firstValueFrom(
        this.api.emitSpecialElectronicDocument({
          documentType: 'GUIA_REMISION_TRANSPORTISTA',
          customerNombre: this.customer().trim(),
          customerDocType: this.docType().trim(),
          customerDocNumber: this.docNumber().trim(),
          subtotal: subtotal.toFixed(2),
          igvTotal: igv.toFixed(2),
          total: total.toFixed(2),
          lines: [
            {
              descripcion: lineDesc,
              cantidad: '1',
              precioUnitario: total.toFixed(2),
              subtotalLinea: subtotal.toFixed(2),
              igvLinea: igv.toFixed(2),
              totalLinea: total.toFixed(2),
            },
          ],
        }),
      );
    },
    onSuccess: () => {
      this.notify.success('Guía transportista programada');
      void this.queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo emitir la guía')),
  }));
}
