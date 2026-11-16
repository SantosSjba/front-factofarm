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

import { QuickCreateComponent } from '../../components/quick-create/quick-create.component';
import { SUNAT_DOC_TYPE_OPTIONS } from '../../utils/sunat-doc-types';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { FormSectionComponent } from '../../../../shared/components/form/form-section/form-section.component';
import { AlertComponent } from '../../../../shared/components/ui/alert/alert.component';
@Component({
  selector: 'app-gr-transportista',
  standalone: true,
  imports: [
    QuickCreateComponent,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    FormSelectComponent,
    InputFieldComponent,
    ButtonComponent,
    HelpPanelComponent,
    FormSectionComponent,
    AlertComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Guías de remisión' }, { label: 'G.R. Transportista' }]" />

    <app-page-toolbar [excel]="false">
      <h1 data-toolbar-title class="text-lg font-semibold text-gray-800 dark:text-white/90">Guía de remisión transportista</h1>
    </app-page-toolbar>

    <app-help-panel title="¿Para qué sirve esta pantalla?" storageKey="gr-transportista">
      <ol class="list-decimal space-y-1 ps-5 text-sm text-gray-500 dark:text-gray-400">
        <li>Emite la guía que acompaña la mercadería cuando la lleva una empresa de transporte.</li>
        <li>Elige el transportista, el conductor, el vehículo y el punto de partida; si falta alguno, créalo con el botón de al lado.</li>
      </ol>
    </app-help-panel>

    @if (specialDocumentBlockedMessage(); as blocked) {
      <app-alert class="mb-4 block" variant="warning" title="Tu proveedor de facturación no emite esta guía" [message]="blocked" />
    }

    <app-component-card compact icon="mdi:truck-delivery-outline" title="Emitir guía transportista">
      <div class="space-y-5">
        <app-form-section compact title="Transporte" [cols]="2">
          <div class="flex items-end gap-2">
            <app-form-select compact class="min-w-0 flex-1" label="Transportista" helpText="Empresa que traslada la mercadería." [options]="carrierOptions()" [value]="carrierId()" (valueChange)="onCarrierChange('' + $event)" />
            <app-quick-create compact entity="carrier" [iconOnly]="true" (created)="onCarrierChange('' + $event.id)" />
          </div>
          <div class="flex items-end gap-2">
            <app-form-select compact class="min-w-0 flex-1" label="Conductor" helpText="Quién maneja." [options]="driverOptions()" [value]="driverId()" (valueChange)="driverId.set('' + $event)" />
            <app-quick-create compact entity="driver" [context]="{ carrierId: carrierId() }" [iconOnly]="true" (created)="driverId.set('' + $event.id)" />
          </div>
          <div class="flex items-end gap-2">
            <app-form-select compact class="min-w-0 flex-1" label="Vehículo" helpText="Placa del vehículo." [options]="vehicleOptions()" [value]="vehicleId()" (valueChange)="vehicleId.set('' + $event)" />
            <app-quick-create compact entity="vehicle" [context]="{ carrierId: carrierId() }" [iconOnly]="true" (created)="vehicleId.set('' + $event.id)" />
          </div>
          <div class="flex items-end gap-2">
            <app-form-select compact class="min-w-0 flex-1" label="Dirección de partida" helpText="Desde dónde sale la mercadería." [options]="departureOptions()" [value]="departureId()" (valueChange)="departureId.set('' + $event)" />
            <app-quick-create compact entity="departure" [iconOnly]="true" (created)="departureId.set('' + $event.id)" />
          </div>
        </app-form-section>

        <app-form-section compact title="Destinatario" description="Se completa solo; revísalo antes de emitir." [cols]="2">
          <app-form-select compact label="Tipo de documento" [required]="true" [showPlaceholder]="false" [options]="docTypeOptions" [value]="docType()" (valueChange)="docType.set($event)" />
          <app-input-field compact label="Número de documento" [isRequired]="true" inputMode="numeric" [maxLength]="20" [value]="docNumber()" (valueChange)="docNumber.set('' + $event)" />
          <app-input-field compact class="sm:col-span-2" [label]="docType() === '6' ? 'Razón social' : 'Nombre completo'" [isRequired]="true" [maxLength]="200" [value]="customer()" (valueChange)="customer.set('' + $event)" />
        </app-form-section>

        <app-form-section compact title="Traslado" [cols]="2">
          <app-input-field compact label="Motivo del traslado" placeholder="Ej.: venta, traslado entre almacenes" [maxLength]="500" [value]="description()" (valueChange)="description.set('' + $event)" />
          <app-input-field compact label="Valor referencial (S/, con IGV)" [isRequired]="true" type="number" min="0.01" step="any" placeholder="0.00" [value]="amount()" (valueChange)="amount.set('' + $event)" />
          @if (previewDescription()) {
            <p class="text-theme-xs text-gray-500 sm:col-span-2 dark:text-gray-400">Así se verá en el comprobante: <strong>{{ previewDescription() }}</strong></p>
          }
        </app-form-section>

        <div class="flex justify-end border-t border-gray-100 pt-3 dark:border-gray-800">
          <app-button size="sm" startIconName="mdi:truck-delivery-outline" [disabled]="emitMutation.isPending() || !canEmitSpecialDocument()" [loading]="emitMutation.isPending()" (btnClick)="emitMutation.mutate()">Emitir guía transportista</app-button>
        </div>
      </div>
    </app-component-card>
  `,
})
export class GrTransportistaComponent {
  protected readonly docTypeOptions = SUNAT_DOC_TYPE_OPTIONS;

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
    queryFn: () => firstValueFrom(this.api.listShippingCarriers({ pageSize: 100 })),
  }));

  protected readonly driversQuery = injectQuery(() => ({
    queryKey: ['shipping', 'drivers', 'gr-transportista', this.carrierId()] as const,
    queryFn: () =>
      firstValueFrom(
        this.api.listShippingDrivers({
          carrierId: this.carrierId() || undefined,
          pageSize: 100,
        }),
      ),
  }));

  protected readonly vehiclesQuery = injectQuery(() => ({
    queryKey: ['shipping', 'vehicles', 'gr-transportista', this.carrierId()] as const,
    queryFn: () =>
      firstValueFrom(
        this.api.listShippingVehicles({
          carrierId: this.carrierId() || undefined,
          pageSize: 100,
        }),
      ),
  }));

  protected readonly departuresQuery = injectQuery(() => ({
    queryKey: ['shipping', 'departure-addresses', 'gr-transportista'] as const,
    queryFn: () => firstValueFrom(this.api.listDepartureAddresses({ pageSize: 100 })),
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
      if (!Number.isFinite(total) || total <= 0) {
        throw new Error('El valor referencial debe ser un número mayor a 0.');
      }
      if (!this.customer().trim() || !this.docType().trim() || !this.docNumber().trim()) {
        throw new Error('Seleccione un transportista o complete razón social, tipo y número de documento.');
      }
      // El valor ingresado incluye IGV: subtotal = total / 1.18 (igual que POS y comprobantes especiales).
      const subtotal = Math.round((total / 1.18) * 100) / 100;
      const igv = Math.round((total - subtotal) * 100) / 100;
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
