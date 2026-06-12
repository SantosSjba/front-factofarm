import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { LabelComponent } from '../../../../shared/components/form/label/label.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { DirectoryApiService } from '../../services/directory-api.service';

@Component({
  selector: 'app-cadena-frio',
  standalone: true,
  imports: [
    QueryPageStatePipe,
    CommonModule,
    DatePipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    ButtonComponent,
    FormSelectComponent,
    InputFieldComponent,
    LabelComponent,
  ],
  templateUrl: './cadena-frio.component.html',
})
export class CadenaFrioComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [
    { label: 'Inventario' },
    { label: 'Cadena de frío' },
  ];

  protected readonly warehouseId = signal('');
  protected readonly zoneId = signal('');
  protected readonly temperatura = signal(4);
  protected readonly observacion = signal('');

  protected readonly warehousesQuery = injectQuery(() => ({
    queryKey: ['inventory', 'warehouses'] as const,
    queryFn: () => firstValueFrom(this.api.listInventoryMovementWarehouses()),
  }));

  protected readonly zonesQuery = injectQuery(() => ({
    queryKey: ['inventory', 'zones', this.warehouseId()] as const,
    enabled: !!this.warehouseId(),
    queryFn: () => firstValueFrom(this.api.listWarehouseZones(this.warehouseId())),
  }));

  protected readonly logsQuery = injectQuery(() => ({
    queryKey: ['cold-chain', 'logs', this.zoneId()] as const,
    enabled: !!this.zoneId(),
    queryFn: () => firstValueFrom(this.api.listColdChainTemperatureLogs(this.zoneId())),
  }));

  protected readonly warehouseOptions = computed(() => [
    { value: '', label: 'Seleccionar almacén' },
    ...(this.warehousesQuery.data() ?? []).map((w) => ({
      value: w.id,
      label: `${w.nombre} · ${w.establishment.nombre}`,
    })),
  ]);

  protected readonly coldZones = computed(() =>
    (this.zonesQuery.data() ?? []).filter((z) => z.tipo === 'REFRIGERADO' && z.activo),
  );

  protected readonly zoneOptions = computed(() => [
    { value: '', label: 'Seleccionar zona refrigerada' },
    ...this.coldZones().map((z) => ({ value: z.id, label: z.nombre })),
  ]);

  protected readonly registerMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.createColdChainTemperatureLog({
          warehouseZoneId: this.zoneId(),
          temperaturaCelsius: this.temperatura(),
          observacion: this.observacion().trim() || undefined,
        }),
      ),
    onSuccess: () => {
      this.notify.success('Temperatura registrada');
      this.observacion.set('');
      void this.queryClient.invalidateQueries({ queryKey: ['cold-chain'] });
      void this.queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar')),
  }));
}
