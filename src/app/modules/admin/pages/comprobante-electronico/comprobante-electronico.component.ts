import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { AuthService } from '../../../../core/services/auth.service';
import { NotifyService } from '../../../../core/services/notify.service';
import { isOptionalUrl } from '../../../../core/utils/form-validators';
import { isValidRuc } from '../../../../core/utils/peru-documents';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ListFiltersComponent } from '../../../../shared/components/common/list-filters/list-filters.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { TableDropdownComponent } from '../../../../shared/components/common/table-dropdown/table-dropdown.component';
import { FormSectionComponent } from '../../../../shared/components/form/form-section/form-section.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { CheckboxComponent } from '../../../../shared/components/form/input/checkbox.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { StatusBadgeComponent } from '../../../../shared/components/ui/badge/status-badge.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { ColorLegendComponent, type LegendTone } from '../../../../shared/components/ui/color-legend/color-legend.component';
import { HelpPanelComponent } from '../../../../shared/components/ui/help-panel/help-panel.component';
import { MenuItemComponent } from '../../../../shared/components/ui/menu-item/menu-item.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { TextAreaComponent } from '../../../../shared/components/form/input/text-area.component';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { SaleVoidModalComponent, type SaleVoidTarget } from '../../components/sale-void-modal/sale-void-modal.component';
import type {
  BillingProviderType,
  ElectronicDocumentDetailDto,
  ElectronicDocumentListItemDto,
  SunatDocumentStatus,
} from '../../models/directory.models';
import { DirectoryApiService } from '../../services/directory-api.service';
import {
  documentNumber,
  documentTypeLabel,
  SUNAT_STATUS_OPTIONS,
  sunatStatusHint,
  sunatStatusLabel,
  sunatStatusTone,
} from '../../utils/sale-labels';

type SpecialType = 'RETENCION' | 'PERCEPCION' | 'LIQUIDACION_COMPRA' | 'GUIA_REMISION_TRANSPORTISTA';

const PAGE_SIZE = 15;
const VOIDABLE = new Set<SunatDocumentStatus>(['ACEPTADO', 'OBSERVADO', 'CONTINGENCIA']);
const IN_FLIGHT = new Set<SunatDocumentStatus>(['PENDIENTE', 'ENVIANDO']);

@Component({
  selector: 'app-comprobante-electronico',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    RouterLink,
    AppDatePipe,
    QueryPageStatePipe,
    BreadcrumbInlineComponent,
    ButtonComponent,
    CheckboxComponent,
    ColorLegendComponent,
    ComponentCardComponent,
    FormSectionComponent,
    FormSelectComponent,
    HasPermissionDirective,
    HelpPanelComponent,
    InputFieldComponent,
    ListFiltersComponent,
    MenuItemComponent,
    ModalComponent,
    PageToolbarComponent,
    PaginationComponent,
    SaleVoidModalComponent,
    StatusBadgeComponent,
    TableDropdownComponent,
    TextAreaComponent,
  ],
  templateUrl: './comprobante-electronico.component.html',
})
export class ComprobanteElectronicoComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [{ label: 'Ventas' }, { label: 'Comprobantes electrónicos' }];
  protected readonly pageSize = PAGE_SIZE;
  protected readonly typeLabel = documentTypeLabel;
  protected readonly number = documentNumber;
  protected readonly sunatLabel = sunatStatusLabel;
  protected readonly sunatTone = sunatStatusTone;
  protected readonly sunatHint = sunatStatusHint;
  protected readonly legend = [
    { label: 'Rechazado: reenvíalo', tone: 'warning' as LegendTone },
    { label: 'Anulado', tone: 'error-light' as LegendTone },
  ];

  // ---------- Filtros ----------
  protected readonly page = signal(1);
  protected readonly search = signal('');
  protected readonly estado = signal('');
  protected readonly tipo = signal('');
  protected readonly dateFrom = signal('');
  protected readonly dateTo = signal('');

  protected readonly estadoOptions = [{ value: '', label: 'Todos los estados' }, ...SUNAT_STATUS_OPTIONS];
  protected readonly tipoOptions = [
    { value: '', label: 'Todos los tipos' },
    ...['BOLETA', 'FACTURA', 'NOTA_CREDITO', 'NOTA_DEBITO', 'RESUMEN_BOLETAS', 'GUIA_REMISION_REMITENTE', 'GUIA_REMISION_TRANSPORTISTA', 'RETENCION', 'PERCEPCION', 'LIQUIDACION_COMPRA'].map(
      (value) => ({ value, label: documentTypeLabel(value) }),
    ),
  ];
  protected readonly activeFilterCount = computed(
    () => [this.estado(), this.tipo(), this.dateFrom(), this.dateTo()].filter(Boolean).length,
  );

  protected readonly listQuery = injectQuery(() => ({
    queryKey: ['billing', 'documents', this.page(), this.search(), this.estado(), this.tipo(), this.dateFrom(), this.dateTo()] as const,
    queryFn: () =>
      firstValueFrom(
        this.api.listElectronicDocuments({
          page: this.page(),
          pageSize: PAGE_SIZE,
          search: this.search(),
          sunatStatus: (this.estado() || undefined) as SunatDocumentStatus | undefined,
          documentType: this.tipo() || undefined,
          from: this.dateFrom() || undefined,
          to: this.dateTo() || undefined,
        }),
      ),
    // Mientras haya comprobantes en cola, el estado SUNAT cambia solo.
    refetchInterval: (q: { state: { data?: { items: ElectronicDocumentListItemDto[] } } }) =>
      q.state.data?.items.some((r) => IN_FLIGHT.has(r.sunatStatus)) ? 10_000 : false,
  }));
  protected readonly rows = computed(() => this.listQuery.data()?.items ?? []);
  protected readonly total = computed(() => this.listQuery.data()?.total ?? 0);

  protected setSearch(v: string) {
    this.search.set(v);
    this.page.set(1);
  }
  protected setFilter(which: 'estado' | 'tipo' | 'dateFrom' | 'dateTo', v: string | number) {
    this[which].set(String(v ?? ''));
    this.page.set(1);
  }
  protected clearFilters() {
    this.search.set('');
    this.estado.set('');
    this.tipo.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.page.set(1);
  }

  protected rowTone(row: ElectronicDocumentListItemDto): LegendTone | null {
    if (row.sunatStatus === 'RECHAZADO') return 'warning';
    if (row.sunatStatus === 'ANULADO') return 'error-light';
    return null;
  }

  // ---------- Configuración ----------
  protected readonly configQuery = injectQuery(() => ({
    queryKey: ['billing', 'config'] as const,
    queryFn: () => firstValueFrom(this.api.getBillingConfig()),
  }));
  protected readonly capabilities = computed(() => this.configQuery.data()?.capabilities);
  protected readonly noProvider = computed(() => (this.configQuery.data()?.provider ?? 'MOCK') === 'MOCK');

  protected readonly configOpen = signal(false);
  protected readonly provider = signal<BillingProviderType>('MOCK');
  protected readonly modoSandbox = signal(true);
  protected readonly rucEmisor = signal('');
  protected readonly razonSocial = signal('');
  protected readonly apiUrl = signal('');
  protected readonly apiToken = signal('');
  protected readonly consultaApiUrl = signal('');
  protected readonly autoEmit = signal(true);
  protected readonly emitNotaVenta = signal(false);
  protected readonly applyDetraccion = signal(false);
  protected readonly autoEmitGuia = signal(true);
  protected readonly configErrors = signal<{ ruc?: string; url?: string; consulta?: string }>({});

  protected readonly providerOptions = [
    { value: 'MOCK', label: 'Sin facturación electrónica (solo notas de venta)' },
    { value: 'FACTILIZA', label: 'Factiliza' },
    { value: 'NUBEFACT', label: 'Nubefact' },
    { value: 'APISPERU', label: 'APIsPERU' },
  ];

  /** Las credenciales salen del panel del proveedor; aquí solo se pegan. */
  protected readonly providerSetupHint = computed(() => {
    switch (this.provider()) {
      case 'FACTILIZA':
        return 'Primero crea el token en app.factiliza.com. Aquí pega la URL y el token (Bearer).';
      case 'NUBEFACT':
        return 'En Nubefact → Configuración → API copia la RUTA y el TOKEN, y pégalos aquí.';
      case 'APISPERU':
        return 'En el panel de APIsPERU registra la empresa (certificado y clave SOL) y genera un token permanente. Aquí pega la URL y el token.';
      default:
        return 'Sin proveedor solo se emiten notas de venta. Para boletas y facturas elige tu proveedor (OSE).';
    }
  });

  protected openConfig() {
    const cfg = this.configQuery.data();
    if (cfg) {
      this.provider.set(cfg.provider ?? 'MOCK');
      this.modoSandbox.set(cfg.modoSandbox ?? true);
      this.rucEmisor.set(cfg.rucEmisor ?? '');
      this.razonSocial.set(cfg.razonSocialEmisor ?? '');
      this.apiUrl.set(cfg.apiUrl ?? '');
      this.consultaApiUrl.set(cfg.consultaApiUrl ?? '');
      this.autoEmit.set(cfg.autoEmitOnSale);
      this.emitNotaVenta.set(cfg.emitNotaVenta ?? false);
      this.applyDetraccion.set(cfg.applyDetraccion ?? false);
      this.autoEmitGuia.set(cfg.autoEmitGuiaOnTransfer ?? true);
    }
    this.apiToken.set('');
    this.configErrors.set({});
    this.configOpen.set(true);
  }

  protected readonly saveConfigMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(
        this.api.upsertBillingConfig({
          provider: this.provider(),
          rucEmisor: this.rucEmisor().trim() || undefined,
          razonSocialEmisor: this.razonSocial().trim() || undefined,
          apiUrl: this.apiUrl().trim() || undefined,
          consultaApiUrl: this.consultaApiUrl().trim() || undefined,
          apiToken: this.apiToken().trim() || undefined,
          autoEmitOnSale: this.autoEmit(),
          emitNotaVenta: this.emitNotaVenta(),
          applyDetraccion: this.applyDetraccion(),
          autoEmitGuiaOnTransfer: this.autoEmitGuia(),
          modoSandbox: this.modoSandbox(),
        }),
      ),
    onSuccess: () => {
      this.notify.success('Configuración de facturación guardada');
      this.configOpen.set(false);
      void this.queryClient.invalidateQueries({ queryKey: ['billing', 'config'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo guardar la configuración')),
  }));

  protected submitConfig() {
    const errors: { ruc?: string; url?: string; consulta?: string } = {};
    const ruc = this.rucEmisor().trim();
    if (ruc && !isValidRuc(ruc)) errors.ruc = 'RUC no válido: son 11 dígitos con dígito verificador de SUNAT.';
    if (!isOptionalUrl(this.apiUrl())) errors.url = 'La dirección no es válida. Debe empezar con https://';
    if (!isOptionalUrl(this.consultaApiUrl())) errors.consulta = 'La dirección no es válida. Debe empezar con https://';
    this.configErrors.set(errors);
    if (Object.keys(errors).length) return;
    this.saveConfigMutation.mutate();
  }

  // ---------- Detalle ----------
  protected readonly detailId = signal<string | null>(null);
  protected readonly detailQuery = injectQuery(() => ({
    queryKey: ['billing', 'document', this.detailId()] as const,
    queryFn: () => firstValueFrom(this.api.getElectronicDocument(this.detailId()!)),
    enabled: !!this.detailId(),
  }));

  constructor() {
    const id = this.route.snapshot.queryParamMap.get('id');
    if (id) this.detailId.set(id);
  }

  protected readonly retryMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.retryElectronicDocument(id)),
    onSuccess: () => {
      this.notify.success('Reenvío programado: el estado se actualizará en unos segundos.');
      void this.queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo reenviar el comprobante')),
  }));

  protected readonly refreshMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.refreshElectronicDocumentStatus(id)),
    onSuccess: (res) => {
      this.notify.success(`Estado SUNAT: ${sunatStatusLabel(res.sunatStatus)}`);
      void this.queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo consultar el estado en SUNAT')),
  }));

  protected download(doc: ElectronicDocumentDetailDto, type: 'pdf' | 'xml' | 'cdr') {
    const id = type === 'pdf' ? doc.pdfArchivoId : type === 'xml' ? doc.xmlArchivoId : doc.cdrArchivoId;
    if (!id) {
      this.notify.warning(`El ${type.toUpperCase()} todavía no está disponible.`);
      return;
    }
    window.open(this.api.fileDownloadUrl(id), '_blank');
  }

  // ---------- Anular ----------
  /** La API exige `billing.void` o el ítem Anulaciones. */
  private readonly canVoidPermission =
    this.auth.hasPermission('billing.void') || this.auth.hasPermission('nav.anulaciones');

  protected canVoid(doc: { documentType: string; sunatStatus: SunatDocumentStatus }): boolean {
    if (!this.canVoidPermission) return false;
    if (doc.documentType === 'RESUMEN_BOLETAS' || doc.documentType === 'COMUNICACION_BAJA') return false;
    return VOIDABLE.has(doc.sunatStatus);
  }

  /** Comprobante de una venta: se anula la venta (stock, caja y baja SUNAT juntos). */
  protected readonly voidSale = signal<SaleVoidTarget | null>(null);
  /** Comprobante sin venta (especiales, notas): solo comunicación de baja. */
  protected readonly bajaDoc = signal<ElectronicDocumentListItemDto | null>(null);
  protected readonly bajaReason = signal('');
  protected readonly bajaError = signal('');

  protected startVoid(doc: ElectronicDocumentListItemDto) {
    if (doc.saleId && (doc.documentType === 'BOLETA' || doc.documentType === 'FACTURA')) {
      this.voidSale.set({
        id: doc.saleId,
        documentType: doc.documentType,
        serie: doc.serie,
        numero: doc.numero,
        total: doc.total,
        customer: doc.customerNombre ? { nombre: doc.customerNombre } : null,
        sunatStatus: doc.sunatStatus,
      });
      return;
    }
    if (this.capabilities() && !this.capabilities()!.supportsVoidDocument) {
      this.notify.warning('Tu proveedor de facturación no permite comunicar bajas desde FactoFarm. Hazlo en su panel.');
      return;
    }
    this.bajaReason.set('');
    this.bajaError.set('');
    this.bajaDoc.set(doc);
  }

  protected readonly bajaMutation = injectMutation(() => ({
    mutationFn: (args: { id: string; reason: string }) => firstValueFrom(this.api.voidElectronicDocument(args.id, args.reason)),
    onSuccess: () => {
      this.notify.success('Comunicación de baja enviada a SUNAT');
      this.bajaDoc.set(null);
      void this.queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo comunicar la baja')),
  }));

  protected submitBaja() {
    const doc = this.bajaDoc();
    const reason = this.bajaReason().trim();
    if (!doc) return;
    if (reason.length < 5) {
      this.bajaError.set('Explica el motivo de la baja (mínimo 5 caracteres).');
      return;
    }
    this.bajaMutation.mutate({ id: doc.id, reason });
  }

  // ---------- Comprobante especial ----------
  protected readonly specialOpen = signal(false);
  protected readonly specialType = signal<SpecialType>('RETENCION');
  protected readonly specialCustomer = signal('');
  protected readonly specialDocType = signal('6');
  protected readonly specialDocNumber = signal('');
  protected readonly specialDesc = signal('');
  protected readonly specialAmount = signal<number | null>(null);
  protected readonly specialErrors = signal<{ customer?: string; doc?: string; amount?: string }>({});

  protected readonly specialTypeOptions = computed(() => {
    const blocked = new Set(this.capabilities()?.unsupportedSpecialDocuments.map((r) => r.documentType) ?? []);
    return (['RETENCION', 'PERCEPCION', 'LIQUIDACION_COMPRA', 'GUIA_REMISION_TRANSPORTISTA'] as SpecialType[]).map((value) => ({
      value,
      label: documentTypeLabel(value) + (blocked.has(value) ? ' (no disponible con tu proveedor)' : ''),
    }));
  });
  protected readonly docTypeOptions = [
    { value: '6', label: 'RUC' },
    { value: '1', label: 'DNI' },
    { value: '4', label: 'Carné de extranjería' },
    { value: '7', label: 'Pasaporte' },
  ];
  protected readonly specialBlockedReason = computed(
    () => this.capabilities()?.unsupportedSpecialDocuments.find((r) => r.documentType === this.specialType())?.reason ?? null,
  );
  /** Monto con IGV incluido (misma extracción que el POS). */
  protected readonly specialBreakdown = computed(() => {
    const amount = Number(this.specialAmount() ?? 0);
    const subtotal = Math.round((amount / 1.18) * 100) / 100;
    return { amount, subtotal, igv: Math.round((amount - subtotal) * 100) / 100 };
  });

  protected openSpecial() {
    const caps = this.capabilities();
    const allowed = this.specialTypeOptions().find(
      (o) => !caps?.unsupportedSpecialDocuments.some((r) => r.documentType === o.value),
    );
    if (!allowed) {
      this.notify.warning(caps?.notes.join(' ') || 'Tu proveedor de facturación no permite emitir comprobantes especiales.');
      return;
    }
    this.specialType.set(allowed.value);
    this.specialCustomer.set('');
    this.specialDocType.set('6');
    this.specialDocNumber.set('');
    this.specialDesc.set('');
    this.specialAmount.set(null);
    this.specialErrors.set({});
    this.specialOpen.set(true);
  }

  protected submitSpecial() {
    const errors: { customer?: string; doc?: string; amount?: string } = {};
    if (!this.specialCustomer().trim()) errors.customer = 'Escribe el nombre o razón social.';
    const docNumber = this.specialDocNumber().trim();
    if (!docNumber) errors.doc = 'Escribe el número de documento.';
    else if (this.specialDocType() === '6' && !isValidRuc(docNumber)) errors.doc = 'RUC no válido: son 11 dígitos.';
    else if (this.specialDocType() === '1' && !/^\d{8}$/.test(docNumber)) errors.doc = 'El DNI tiene 8 dígitos.';
    if (!(this.specialBreakdown().amount > 0)) errors.amount = 'El monto debe ser mayor a 0.';
    this.specialErrors.set(errors);
    if (Object.keys(errors).length) return;
    this.emitSpecialMutation.mutate();
  }

  protected readonly emitSpecialMutation = injectMutation(() => ({
    mutationFn: () => {
      const { amount, subtotal, igv } = this.specialBreakdown();
      return firstValueFrom(
        this.api.emitSpecialElectronicDocument({
          documentType: this.specialType(),
          customerNombre: this.specialCustomer().trim(),
          customerDocType: this.specialDocType(),
          customerDocNumber: this.specialDocNumber().trim(),
          subtotal: subtotal.toFixed(2),
          igvTotal: igv.toFixed(2),
          total: amount.toFixed(2),
          lines: [
            {
              descripcion: this.specialDesc().trim() || 'Servicio / concepto',
              cantidad: '1',
              precioUnitario: amount.toFixed(2),
              subtotalLinea: subtotal.toFixed(2),
              igvLinea: igv.toFixed(2),
              totalLinea: amount.toFixed(2),
            },
          ],
        }),
      );
    },
    onSuccess: () => {
      this.notify.success('Comprobante en cola para enviarse a SUNAT');
      this.specialOpen.set(false);
      void this.queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo emitir el comprobante')),
  }));
}
