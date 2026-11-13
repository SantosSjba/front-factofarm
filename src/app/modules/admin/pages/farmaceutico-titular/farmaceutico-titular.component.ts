import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { AuthService } from '../../../../core/services/auth.service';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import { PageStateComponent } from '../../../../shared/components/common/page-state/page-state.component';
import type { SummaryChip } from '../../../../shared/components/ui/summary-chips/summary-chips.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { TableDropdownComponent } from '../../../../shared/components/common/table-dropdown/table-dropdown.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { CheckboxComponent } from '../../../../shared/components/form/input/checkbox.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { StatusBadgeComponent, type StatusTone } from '../../../../shared/components/ui/badge/status-badge.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import type { LegendTone } from '../../../../shared/components/ui/color-legend/color-legend.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { MenuItemComponent } from '../../../../shared/components/ui/menu-item/menu-item.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import type { PharmacistLicenseDto } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

const PHARMACIST_ROLES = new Set(['FARMACEUTICO_TITULAR', 'FARMACEUTICO', 'GERENTE_SUCURSAL', 'ADMINISTRADOR', 'ADMIN_CADENA']);

type VigenciaKey = 'vigente' | 'por_vencer' | 'vencida' | 'sin_fecha' | 'inactiva';
type Vigencia = { key: VigenciaKey; label: string; tone: StatusTone; row: LegendTone | null };

/** Estados de vigencia en el orden del resumen y del select. */
const VIGENCIAS: { key: VigenciaKey; label: string; tone: StatusTone; tooltip: string }[] = [
  { key: 'vigente', label: 'Vigentes', tone: 'success', tooltip: 'Activas y con la habilitación al día.' },
  { key: 'por_vencer', label: 'Por vencer', tone: 'warning', tooltip: 'Vencen en los próximos 60 días: renuévalas a tiempo.' },
  { key: 'vencida', label: 'Vencidas', tone: 'error', tooltip: 'Ya vencieron: no pueden autorizar medicamentos controlados.' },
  { key: 'sin_fecha', label: 'Sin fecha', tone: 'neutral', tooltip: 'Activas pero sin fecha de vencimiento registrada.' },
  { key: 'inactiva', label: 'Inactivas', tone: 'neutral', tooltip: 'Desactivadas: se conservan pero no se usan.' },
];
type LicenseForm = { id: string | null; colegiaturaCqp: string; fullName: string; vigenciaHasta: string; userId: string; activo: boolean };

/** Colegiaturas (CQP) de los químicos farmacéuticos: titulares de local y autorizadores de controlados. */
@Component({
  selector: 'app-farmaceutico-titular',
  standalone: true,
  imports: [
    RouterLink,
    AppDatePipe,
    QueryPageStatePipe,
    BreadcrumbInlineComponent,
    ButtonComponent,
    CheckboxComponent,
    FormSelectComponent,
    HelpPanelComponent,
    InputFieldComponent,
    ListFiltersComponent,
    PageStateComponent,
    MenuItemComponent,
    ModalComponent,
    PageToolbarComponent,
    StatusBadgeComponent,
    TableDropdownComponent,
  ],
  templateUrl: './farmaceutico-titular.component.html',
})
export class FarmaceuticoTitularComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Usuarios y establecimientos' }, { label: 'Farmacéutico titular' }];
  protected readonly canWrite = ['compliance.write', 'nav.farmaceutico_titular'].some((p) => this.auth.hasPermission(p));

  protected readonly listQuery = injectQuery(() => ({
    queryKey: ['compliance', 'pharmacist-licenses'] as const,
    queryFn: () => firstValueFrom(this.api.listPharmacistLicenses(true)),
  }));
  private readonly all = computed(() => this.listQuery.data() ?? []);

  // ---------- Filtros y resumen ----------
  protected readonly search = signal('');
  protected readonly vigenciaFilter = signal<'' | VigenciaKey>('');
  /** Solo quienes son titulares de algún local (desde el chip). */
  protected readonly titularOnly = signal(false);
  protected readonly vigenciaOptions = [{ value: '', label: 'Toda vigencia' }, ...VIGENCIAS.map((v) => ({ value: v.key, label: v.label }))];

  protected readonly licenses = computed(() => {
    const q = this.search().trim().toLowerCase();
    const v = this.vigenciaFilter();
    const tit = this.titularOnly();
    return this.all().filter(
      (l) =>
        (!v || this.vigencia(l).key === v) &&
        (!tit || (l.titularEstablishments ?? []).length > 0) &&
        (!q || `${l.fullName} ${l.colegiaturaCqp} ${l.user?.nombre ?? ''}`.toLowerCase().includes(q)),
    );
  });
  protected readonly hasFilters = computed(() => !!(this.search().trim() || this.vigenciaFilter() || this.titularOnly()));

  protected readonly summaryChips = computed<SummaryChip[]>(() => {
    if (!this.listQuery.data()) return [];
    const all = this.all();
    const v = this.vigenciaFilter();
    return [
      { id: 'all', label: 'Total', count: all.length, icon: 'lucide:id-card', group: 'General', active: !v && !this.titularOnly(), tooltip: 'Todas las colegiaturas. Clic para quitar los filtros de vigencia y titular.' },
      {
        id: 'titular',
        label: 'Titulares de local',
        count: all.filter((l) => (l.titularEstablishments ?? []).length).length,
        icon: 'lucide:store',
        group: 'General',
        active: this.titularOnly(),
        tooltip: 'Farmacéuticos asignados como titular de algún local (se elige en Establecimientos).',
      },
      ...VIGENCIAS.map((x) => ({
        id: 'vig:' + x.key,
        label: x.label,
        count: all.filter((l) => this.vigencia(l).key === x.key).length,
        tone: x.tone,
        group: 'Vigencia',
        active: v === x.key,
        tooltip: `${x.tooltip} Clic para ver solo estas.`,
      })),
    ];
  });

  protected onSummaryChip(chip: SummaryChip) {
    if (chip.id === 'all') {
      this.vigenciaFilter.set('');
      this.titularOnly.set(false);
    } else if (chip.id === 'titular') {
      this.titularOnly.set(!this.titularOnly());
    } else if (chip.id.startsWith('vig:')) {
      const k = chip.id.slice(4) as VigenciaKey;
      this.vigenciaFilter.set(this.vigenciaFilter() === k ? '' : k);
    }
  }

  protected clearFilters() {
    this.search.set('');
    this.vigenciaFilter.set('');
    this.titularOnly.set(false);
  }

  protected vigencia(l: PharmacistLicenseDto): Vigencia {
    if (!l.activo) return { key: 'inactiva', label: 'Inactiva', tone: 'neutral', row: 'muted' };
    if (!l.vigenciaHasta) return { key: 'sin_fecha', label: 'Sin fecha', tone: 'neutral', row: null };
    const days = (new Date(l.vigenciaHasta).getTime() - Date.now()) / 86_400_000;
    if (days < 0) return { key: 'vencida', label: 'Vencida', tone: 'error', row: 'error-light' };
    if (days <= 60) return { key: 'por_vencer', label: `Vence en ${Math.ceil(days)} días`, tone: 'warning', row: 'warning' };
    return { key: 'vigente', label: 'Vigente', tone: 'success', row: null };
  }

  // ---------- Usuarios vinculables ----------
  protected readonly usersQuery = injectQuery(() => ({
    queryKey: ['compliance', 'pharmacist-users'] as const,
    enabled: !!this.form(),
    queryFn: () => firstValueFrom(this.api.listUsers({ pageSize: 100 })),
  }));
  protected readonly userOptions = computed(() => {
    const taken = new Set(this.all().filter((l) => l.userId && l.id !== this.form()?.id).map((l) => l.userId));
    return [
      { value: '', label: 'Sin usuario' },
      ...(this.usersQuery.data()?.items ?? [])
        .filter((u) => PHARMACIST_ROLES.has(u.role) && !taken.has(u.id))
        .map((u) => ({ value: u.id, label: u.nombre })),
    ];
  });

  // ---------- Crear / editar ----------
  protected readonly form = signal<LicenseForm | null>(null);
  protected readonly errors = signal<{ cqp?: string; name?: string }>({});
  protected openCreate() {
    this.errors.set({});
    this.form.set({ id: null, colegiaturaCqp: '', fullName: '', vigenciaHasta: '', userId: '', activo: true });
  }
  protected openEdit(l: PharmacistLicenseDto) {
    this.errors.set({});
    this.form.set({
      id: l.id,
      colegiaturaCqp: l.colegiaturaCqp,
      fullName: l.fullName,
      vigenciaHasta: l.vigenciaHasta ? l.vigenciaHasta.slice(0, 10) : '',
      userId: l.userId ?? '',
      activo: l.activo,
    });
  }
  protected patch(p: Partial<LicenseForm>) {
    this.form.update((f) => (f ? { ...f, ...p } : f));
    this.errors.set({});
  }
  protected submit() {
    const f = this.form();
    if (!f) return;
    const e: { cqp?: string; name?: string } = {};
    if (!/^[0-9A-Za-z-]{3,20}$/.test(f.colegiaturaCqp.trim())) e.cqp = 'Escribe el número de colegiatura (de 3 a 20 caracteres, sin espacios).';
    if (!f.fullName.trim()) e.name = 'Escribe el nombre completo.';
    this.errors.set(e);
    if (Object.keys(e).length) return;
    this.saveMutation.mutate(f);
  }
  protected readonly saveMutation = injectMutation(() => ({
    mutationFn: (f: LicenseForm) =>
      f.id
        ? firstValueFrom(
            this.api.updatePharmacistLicense(f.id, {
              colegiaturaCqp: f.colegiaturaCqp.trim(),
              fullName: f.fullName.trim(),
              vigenciaHasta: f.vigenciaHasta || null,
              userId: f.userId || null,
              activo: f.activo,
            }),
          )
        : firstValueFrom(
            this.api.createPharmacistLicense({
              colegiaturaCqp: f.colegiaturaCqp.trim(),
              fullName: f.fullName.trim(),
              vigenciaHasta: f.vigenciaHasta || undefined,
              userId: f.userId || undefined,
            }),
          ),
    onSuccess: (_r, f) => {
      this.notify.success(f.id ? 'Colegiatura actualizada' : 'Colegiatura registrada');
      this.form.set(null);
      void this.queryClient.invalidateQueries({ queryKey: ['compliance', 'pharmacist-licenses'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo guardar la colegiatura')),
  }));

  // ---------- Activar / eliminar ----------
  protected readonly toggleMutation = injectMutation(() => ({
    mutationFn: (l: PharmacistLicenseDto) => firstValueFrom(this.api.updatePharmacistLicense(l.id, { activo: !l.activo })),
    onSuccess: (_r, l) => {
      this.notify.success(l.activo ? 'Colegiatura desactivada' : 'Colegiatura activada');
      void this.queryClient.invalidateQueries({ queryKey: ['compliance', 'pharmacist-licenses'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo cambiar el estado')),
  }));
  protected readonly toDelete = signal<PharmacistLicenseDto | null>(null);
  protected readonly deleteMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.removePharmacistLicense(id)),
    onSuccess: () => {
      this.notify.success('Colegiatura eliminada');
      this.toDelete.set(null);
      void this.queryClient.invalidateQueries({ queryKey: ['compliance', 'pharmacist-licenses'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo eliminar la colegiatura')),
  }));
}
