import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { TableDropdownComponent } from '../../../../shared/components/common/table-dropdown/table-dropdown.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { StatusBadgeComponent, type StatusTone } from '../../../../shared/components/ui/badge/status-badge.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { ColorLegendComponent, type LegendItem } from '../../../../shared/components/ui/color-legend/color-legend.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { MenuItemComponent } from '../../../../shared/components/ui/menu-item/menu-item.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { TabStripComponent, type TabStripItem } from '../../../../shared/components/ui/tab-strip/tab-strip.component';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { QuickCreateComponent } from '../../components/quick-create/quick-create.component';
import type { WarehouseZoneDto } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

type Tab = 'temperaturas' | 'zonas';
type ZoneType = WarehouseZoneDto['tipo'];

/** Rango de referencia para medicamentos refrigerados (solo para resaltar lecturas). */
const RANGE = { min: 2, max: 8 };

const ZONE_TYPES: Record<ZoneType, { label: string; tone: StatusTone }> = {
  REFRIGERADO: { label: 'Refrigerada', tone: 'info' },
  NORMAL: { label: 'Normal', tone: 'neutral' },
  CONTROLADO: { label: 'Controlada', tone: 'purple' },
};

@Component({
  selector: 'app-cadena-frio',
  standalone: true,
  imports: [
    CommonModule,
    AppDatePipe,
    QueryPageStatePipe,
    BreadcrumbInlineComponent,
    ButtonComponent,
    ColorLegendComponent,
    ComponentCardComponent,
    FormSelectComponent,
    HasPermissionDirective,
    HelpPanelComponent,
    InputFieldComponent,
    MenuItemComponent,
    ModalComponent,
    PageToolbarComponent,
    QuickCreateComponent,
    StatusBadgeComponent,
    TabStripComponent,
    TableDropdownComponent,
  ],
  templateUrl: './cadena-frio.component.html',
})
export class CadenaFrioComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Inventario' }, { label: 'Cadena de frío' }];
  protected readonly range = RANGE;
  protected readonly tabs: TabStripItem[] = [
    { id: 'temperaturas', label: 'Temperaturas' },
    { id: 'zonas', label: 'Zonas del almacén' },
  ];
  protected readonly tab = signal<Tab>('temperaturas');
  protected readonly legend: LegendItem[] = [{ label: `Fuera de ${RANGE.min} a ${RANGE.max} °C`, tone: 'error' }];
  protected readonly zoneTypeOptions = (Object.keys(ZONE_TYPES) as ZoneType[]).map((value) => ({
    value,
    label: value === 'REFRIGERADO' ? 'Refrigerada (cadena de frío)' : ZONE_TYPES[value].label,
  }));

  // ---------- Almacén y zonas ----------
  protected readonly warehouseId = signal('');
  protected readonly zoneId = signal('');

  protected readonly warehousesQuery = injectQuery(() => ({
    queryKey: ['inventory', 'warehouses'] as const,
    queryFn: () => firstValueFrom(this.api.listInventoryMovementWarehouses()),
  }));
  protected readonly warehouseOptions = computed(() =>
    (this.warehousesQuery.data() ?? []).map((w) => ({ value: w.id, label: `${w.nombre} · ${w.establishment.nombre}` })),
  );
  protected readonly zonesQuery = injectQuery(() => ({
    queryKey: ['inventory', 'zones', this.warehouseId()] as const,
    enabled: !!this.warehouseId(),
    queryFn: () => firstValueFrom(this.api.listWarehouseZones(this.warehouseId())),
  }));
  protected readonly zones = computed(() => this.zonesQuery.data() ?? []);
  protected readonly coldZones = computed(() => this.zones().filter((z) => z.tipo === 'REFRIGERADO' && z.activo));
  protected readonly coldZoneOptions = computed(() => this.coldZones().map((z) => ({ value: z.id, label: z.nombre })));

  // ---------- Temperaturas ----------
  protected readonly logsQuery = injectQuery(() => ({
    queryKey: ['cold-chain', 'logs', this.zoneId()] as const,
    enabled: !!this.zoneId(),
    queryFn: () => firstValueFrom(this.api.listColdChainTemperatureLogs(this.zoneId())),
  }));
  protected readonly logs = computed(() => this.logsQuery.data() ?? []);
  protected readonly lastLog = computed(() => this.logs()[0] ?? null);
  protected readonly outOfRangeCount = computed(() => this.logs().filter((l) => this.isOut(l.temperaturaCelsius)).length);

  protected readonly logOpen = signal(false);
  protected readonly logZoneId = signal('');
  protected readonly temperatura = signal<number | null>(null);
  protected readonly observacion = signal('');
  protected readonly logErrors = signal<{ zone?: string; temp?: string }>({});

  protected readonly logMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.createColdChainTemperatureLog({
          warehouseZoneId: this.logZoneId(),
          temperaturaCelsius: this.temperatura()!,
          observacion: this.observacion().trim() || undefined,
        }),
      ),
    onSuccess: () => {
      const t = this.temperatura()!;
      if (this.isOut(t)) this.notify.warning(`Temperatura registrada fuera del rango de ${RANGE.min} a ${RANGE.max} °C: revisa la refrigeradora y anota la acción tomada.`);
      else this.notify.success('Temperatura registrada');
      this.logOpen.set(false);
      this.zoneId.set(this.logZoneId());
      void this.queryClient.invalidateQueries({ queryKey: ['cold-chain'] });
      void this.queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo registrar la temperatura')),
  }));

  // ---------- Zonas ----------
  protected readonly zoneForm = signal<{ id: string | null; nombre: string; tipo: ZoneType } | null>(null);
  protected readonly zoneFormError = signal('');
  protected readonly zoneToDelete = signal<WarehouseZoneDto | null>(null);

  protected readonly saveZoneMutation = injectMutation(() => ({
    mutationFn: (f: { id: string | null; nombre: string; tipo: ZoneType }) =>
      f.id
        ? firstValueFrom(this.api.updateWarehouseZone(f.id, { nombre: f.nombre, tipo: f.tipo }))
        : firstValueFrom(this.api.createWarehouseZone({ warehouseId: this.warehouseId(), nombre: f.nombre, tipo: f.tipo })),
    onSuccess: (_res, f) => {
      this.notify.success(f.id ? 'Zona actualizada' : 'Zona creada');
      this.zoneForm.set(null);
      void this.queryClient.invalidateQueries({ queryKey: ['inventory', 'zones'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo guardar la zona')),
  }));

  protected readonly toggleZoneMutation = injectMutation(() => ({
    mutationFn: (z: WarehouseZoneDto) => firstValueFrom(this.api.updateWarehouseZone(z.id, { activo: !z.activo })),
    onSuccess: (_res, z) => {
      this.notify.success(z.activo ? 'Zona desactivada' : 'Zona activada');
      void this.queryClient.invalidateQueries({ queryKey: ['inventory', 'zones'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo cambiar la zona')),
  }));

  protected readonly deleteZoneMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.deleteWarehouseZone(id)),
    onSuccess: () => {
      this.notify.success('Zona eliminada');
      this.zoneToDelete.set(null);
      void this.queryClient.invalidateQueries({ queryKey: ['inventory', 'zones'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo eliminar la zona')),
  }));

  constructor() {
    // Con un solo almacén no hay nada que elegir; con una sola zona refrigerada, tampoco.
    effect(() => {
      const all = this.warehousesQuery.data() ?? [];
      if (all.length === 1 && !untracked(this.warehouseId)) this.warehouseId.set(all[0].id);
    });
    effect(() => {
      const cold = this.coldZones();
      if (!untracked(this.zoneId) && cold.length === 1) this.zoneId.set(cold[0].id);
    });
  }

  protected setWarehouse(id: string) {
    this.warehouseId.set(id);
    this.zoneId.set('');
  }

  protected isOut(value: string | number): boolean {
    const t = Number(value);
    return Number.isFinite(t) && (t < RANGE.min || t > RANGE.max);
  }

  protected zoneTypeLabel(t: ZoneType) {
    return ZONE_TYPES[t].label;
  }

  protected zoneTypeTone(t: ZoneType): StatusTone {
    return ZONE_TYPES[t].tone;
  }

  // ---------- Registrar temperatura ----------
  protected openLog() {
    this.logZoneId.set(this.zoneId() || (this.coldZones().length === 1 ? this.coldZones()[0].id : ''));
    this.temperatura.set(null);
    this.observacion.set('');
    this.logErrors.set({});
    this.logOpen.set(true);
  }

  protected submitLog() {
    const errors: { zone?: string; temp?: string } = {};
    if (!this.logZoneId()) errors.zone = 'Elige la zona refrigerada.';
    const t = this.temperatura();
    if (t == null || !Number.isFinite(t)) errors.temp = 'Escribe la temperatura que marca el termómetro.';
    else if (t < -50 || t > 60) errors.temp = 'Revisa el valor: parece un error de digitación.';
    this.logErrors.set(errors);
    if (Object.keys(errors).length) return;
    this.logMutation.mutate();
  }

  // ---------- Zonas ----------
  protected openZoneForm(zone?: WarehouseZoneDto) {
    this.zoneFormError.set('');
    this.zoneForm.set(zone ? { id: zone.id, nombre: zone.nombre, tipo: zone.tipo } : { id: null, nombre: '', tipo: 'REFRIGERADO' });
  }

  protected patchZoneForm(patch: Partial<{ nombre: string; tipo: ZoneType }>) {
    this.zoneForm.update((f) => (f ? { ...f, ...patch } : f));
    this.zoneFormError.set('');
  }

  protected submitZone() {
    const f = this.zoneForm();
    if (!f) return;
    const nombre = f.nombre.trim();
    if (!nombre) {
      this.zoneFormError.set('Escribe el nombre de la zona.');
      return;
    }
    this.saveZoneMutation.mutate({ ...f, nombre });
  }
}
