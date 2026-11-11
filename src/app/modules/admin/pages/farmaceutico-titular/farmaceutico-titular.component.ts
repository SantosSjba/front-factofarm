import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { AuthService } from '../../../../core/services/auth.service';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { KpiTileComponent } from '../../../../shared/components/common/dashboard/kpi-tile.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { TableDropdownComponent } from '../../../../shared/components/common/table-dropdown/table-dropdown.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { CheckboxComponent } from '../../../../shared/components/form/input/checkbox.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { StatusBadgeComponent, type StatusTone } from '../../../../shared/components/ui/badge/status-badge.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { ColorLegendComponent, type LegendItem, type LegendTone } from '../../../../shared/components/ui/color-legend/color-legend.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { MenuItemComponent } from '../../../../shared/components/ui/menu-item/menu-item.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import type { PharmacistLicenseDto } from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';

const PHARMACIST_ROLES = new Set(['FARMACEUTICO_TITULAR', 'FARMACEUTICO', 'GERENTE_SUCURSAL', 'ADMINISTRADOR', 'ADMIN_CADENA']);

type Vigencia = { label: string; tone: StatusTone; row: LegendTone | null };
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
    ColorLegendComponent,
    ComponentCardComponent,
    FormSelectComponent,
    HelpPanelComponent,
    InputFieldComponent,
    KpiTileComponent,
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
  protected readonly legend: LegendItem[] = [
    { label: 'Colegiatura vencida', tone: 'error-light' },
    { label: 'Vence en 60 días', tone: 'warning' },
  ];

  protected readonly listQuery = injectQuery(() => ({
    queryKey: ['compliance', 'pharmacist-licenses'] as const,
    queryFn: () => firstValueFrom(this.api.listPharmacistLicenses(true)),
  }));
  protected readonly licenses = computed(() => this.listQuery.data() ?? []);
  protected readonly kpis = computed(() => {
    const l = this.licenses().filter((x) => x.activo);
    return {
      activas: `${l.length}`,
      titulares: `${l.filter((x) => (x.titularEstablishments ?? []).length).length}`,
      porVencer: l.filter((x) => this.vigencia(x).tone === 'warning').length,
      vencidas: l.filter((x) => this.vigencia(x).tone === 'error').length,
    };
  });

  protected vigencia(l: PharmacistLicenseDto): Vigencia {
    if (!l.activo) return { label: 'Inactiva', tone: 'neutral', row: 'muted' };
    if (!l.vigenciaHasta) return { label: 'Sin fecha', tone: 'neutral', row: null };
    const days = (new Date(l.vigenciaHasta).getTime() - Date.now()) / 86_400_000;
    if (days < 0) return { label: 'Vencida', tone: 'error', row: 'error-light' };
    if (days <= 60) return { label: `Vence en ${Math.ceil(days)} días`, tone: 'warning', row: 'warning' };
    return { label: 'Vigente', tone: 'success', row: null };
  }

  // ---------- Usuarios vinculables ----------
  protected readonly usersQuery = injectQuery(() => ({
    queryKey: ['compliance', 'pharmacist-users'] as const,
    enabled: !!this.form(),
    queryFn: () => firstValueFrom(this.api.listUsers({ pageSize: 100 })),
  }));
  protected readonly userOptions = computed(() => {
    const taken = new Set(this.licenses().filter((l) => l.userId && l.id !== this.form()?.id).map((l) => l.userId));
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
