import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { injectMutation, injectQuery, injectQueryClient } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { PaginationComponent } from '../../../../shared/components/common/pagination/pagination.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import type { BreadcrumbSegment } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { DirectoryApiService } from '../../services/directory-api.service';
import type { BillingProviderType, ElectronicDocumentDetailDto, SunatDocumentStatus } from '../../models/directory.models';

@Component({
  selector: 'app-comprobante-electronico',
  standalone: true,
  imports: [
    QueryPageStatePipe,
    CommonModule,
    RouterLink,
    CurrencyPipe,
    DatePipe,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    PaginationComponent,
    ButtonComponent,
    FormSelectComponent,
    InputFieldComponent,
    ModalComponent,
  ],
  templateUrl: './comprobante-electronico.component.html',
})
export class ComprobanteElectronicoComponent {
  private readonly api = inject(DirectoryApiService);
  private readonly notify = inject(NotifyService);
  private readonly queryClient = injectQueryClient();

  protected readonly breadcrumb: BreadcrumbSegment[] = [
    { label: 'Ventas' },
    { label: 'Comprobante electrónico' },
  ];

  protected readonly page = signal(1);
  protected readonly estado = signal('');
  protected readonly configOpen = signal(false);
  protected readonly detailId = signal<string | null>(null);
  protected readonly voidReason = signal('');

  protected readonly provider = signal<BillingProviderType>('MOCK');
  protected readonly modoSandbox = signal(true);
  protected readonly rucEmisor = signal('');
  protected readonly razonSocial = signal('');
  protected readonly apiUrl = signal('');
  protected readonly apiToken = signal('');
  protected readonly autoEmit = signal(true);
  protected readonly consultaApiUrl = signal('');
  protected readonly emitNotaVenta = signal(false);
  protected readonly applyDetraccion = signal(false);
  protected readonly autoEmitGuia = signal(true);
  protected readonly specialOpen = signal(false);
  protected readonly specialType = signal<'RETENCION' | 'PERCEPCION' | 'LIQUIDACION_COMPRA' | 'GUIA_REMISION_TRANSPORTISTA'>('RETENCION');
  protected readonly specialCustomer = signal('');
  protected readonly specialDocType = signal('6');
  protected readonly specialDocNumber = signal('');
  protected readonly specialDesc = signal('');
  protected readonly specialAmount = signal('100');

  protected readonly providerOptions = [
    { value: 'MOCK', label: 'Sin facturación electrónica (solo notas de venta)' },
    { value: 'FACTILIZA', label: 'Factiliza' },
    { value: 'NUBEFACT', label: 'Nubefact' },
    { value: 'APISPERU', label: 'APIsPERU' },
  ];

  /** Credenciales salen del panel del proveedor; aquí solo se pegan. */
  protected readonly providerSetupHint = computed(() => {
    switch (this.provider()) {
      case 'FACTILIZA':
        return 'Antes: token en app.factiliza.com. Aquí: URL + Bearer. FactoFarm emite por usted.';
      case 'NUBEFACT':
        return 'Antes: RUTA + TOKEN en Nubefact → Configuración → API. Aquí: péguelos; FactoFarm emite a esa ruta.';
      case 'APISPERU':
        return 'Antes: empresa + token permanente en panel APIsPERU (cert + SOL). Aquí: URL + Bearer.';
      default:
        return 'Sin OSE: solo notas de venta. Si ya configuró un proveedor en su panel, elíjalo e ingrese URL/token.';
    }
  });

  protected readonly specialTypeOptions = [
    { value: 'RETENCION', label: 'Retención electrónica' },
    { value: 'PERCEPCION', label: 'Percepción electrónica' },
    { value: 'LIQUIDACION_COMPRA', label: 'Liquidación de compra' },
    { value: 'GUIA_REMISION_TRANSPORTISTA', label: 'Guía transportista' },
  ];

  protected readonly estadoOptions = [
    { value: '', label: 'Todos los estados SUNAT' },
    { value: 'PENDIENTE', label: 'Pendiente' },
    { value: 'ENVIANDO', label: 'Enviando' },
    { value: 'ACEPTADO', label: 'Aceptado' },
    { value: 'OBSERVADO', label: 'Observado' },
    { value: 'RECHAZADO', label: 'Rechazado' },
    { value: 'CONTINGENCIA', label: 'Contingencia' },
    { value: 'ANULADO', label: 'Anulado' },
  ];

  protected readonly listQuery = injectQuery(() => ({
    queryKey: ['billing', 'documents', this.page(), this.estado()] as const,
    queryFn: () =>
      firstValueFrom(
        this.api.listElectronicDocuments({
          page: this.page(),
          pageSize: 15,
          sunatStatus: (this.estado() || undefined) as SunatDocumentStatus | undefined,
        }),
      ),
    refetchInterval: 10_000,
  }));

  protected readonly configQuery = injectQuery(() => ({
    queryKey: ['billing', 'config'] as const,
    queryFn: () => firstValueFrom(this.api.getBillingConfig()),
  }));

  protected readonly detailQuery = injectQuery(() => ({
    queryKey: ['billing', 'document', this.detailId()] as const,
    queryFn: () => firstValueFrom(this.api.getElectronicDocument(this.detailId()!)),
    enabled: !!this.detailId(),
  }));

  protected readonly billingCapabilities = computed(() => this.configQuery.data()?.capabilities);

  protected readonly filteredSpecialTypeOptions = computed(() => {
    const caps = this.billingCapabilities();
    if (!caps) return this.specialTypeOptions;
    const blocked = new Set(caps.unsupportedSpecialDocuments.map((row) => row.documentType));
    return this.specialTypeOptions.map((opt) => ({
      ...opt,
      disabled: blocked.has(opt.value),
      label: blocked.has(opt.value) ? `${opt.label} (no disponible)` : opt.label,
    }));
  });

  protected specialDocumentBlockedReason(type: string): string | null {
    const caps = this.billingCapabilities();
    return caps?.unsupportedSpecialDocuments.find((row) => row.documentType === type)?.reason ?? null;
  }

  protected canEmitSpecialDocuments(): boolean {
    const caps = this.billingCapabilities();
    if (!caps) return true;
    return caps.supportedSpecialDocuments.length > 0;
  }

  protected openSpecialModal() {
    const caps = this.billingCapabilities();
    const firstAllowed = this.specialTypeOptions.find(
      (opt) => !caps?.unsupportedSpecialDocuments.some((row) => row.documentType === opt.value),
    );
    if (!firstAllowed) {
      this.notify.warning(
        caps?.notes.join(' ') ?? 'Los comprobantes especiales no están disponibles con el OSE configurado.',
      );
      return;
    }
    this.specialType.set(
      firstAllowed.value as 'RETENCION' | 'PERCEPCION' | 'LIQUIDACION_COMPRA' | 'GUIA_REMISION_TRANSPORTISTA',
    );
    this.specialOpen.set(true);
  }

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
    this.configOpen.set(true);
  }

  protected openDetail(id: string) {
    this.detailId.set(id);
  }

  protected closeDetail() {
    this.detailId.set(null);
    this.voidReason.set('');
  }

  protected statusClass(status: SunatDocumentStatus): string {
    if (status === 'ACEPTADO') return 'bg-emerald-100 text-emerald-800';
    if (status === 'RECHAZADO') return 'bg-red-100 text-red-800';
    if (status === 'PENDIENTE' || status === 'ENVIANDO') return 'bg-amber-100 text-amber-800';
    if (status === 'CONTINGENCIA') return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
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
      this.notify.success('Configuración OSE guardada');
      this.configOpen.set(false);
      void this.queryClient.invalidateQueries({ queryKey: ['billing', 'config'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo guardar')),
  }));

  protected retryMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.retryElectronicDocument(id)),
    onSuccess: () => {
      this.notify.success('Reenvío programado');
      void this.queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'Error al reenviar')),
  }));

  protected voidMutation = injectMutation(() => ({
    mutationFn: () =>
      firstValueFrom(this.api.voidElectronicDocument(this.detailId()!, this.voidReason().trim())),
    onSuccess: () => {
      this.notify.success('Comunicación de baja enviada');
      this.voidReason.set('');
      void this.queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo anular el comprobante')),
  }));

  protected refreshStatusMutation = injectMutation(() => ({
    mutationFn: (id: string) => firstValueFrom(this.api.refreshElectronicDocumentStatus(id)),
    onSuccess: () => {
      this.notify.success('Estado SUNAT actualizado');
      void this.queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo consultar el estado')),
  }));

  protected emitSpecialMutation = injectMutation(() => ({
    mutationFn: () => {
      const amount = Number(this.specialAmount());
      const igv = Math.round(amount * 0.18 * 100) / 100;
      const subtotal = Math.round((amount - igv) * 100) / 100;
      return firstValueFrom(
        this.api.emitSpecialElectronicDocument({
          documentType: this.specialType(),
          customerNombre: this.specialCustomer().trim(),
          customerDocType: this.specialDocType().trim(),
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
      this.notify.success('Comprobante especial programado');
      this.specialOpen.set(false);
      void this.queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (err) => this.notify.error(httpErrorMessage(err, 'No se pudo emitir')),
  }));

  protected canVoid(doc: ElectronicDocumentDetailDto): boolean {
    const caps = this.billingCapabilities();
    if (caps && !caps.supportsVoidDocument) return false;
    return (
      doc.documentType !== 'NOTA_CREDITO' &&
      doc.documentType !== 'RESUMEN_BOLETAS' &&
      (doc.sunatStatus === 'ACEPTADO' ||
        doc.sunatStatus === 'OBSERVADO' ||
        doc.sunatStatus === 'CONTINGENCIA')
    );
  }

  protected download(doc: ElectronicDocumentDetailDto, type: 'pdf' | 'xml' | 'cdr') {
    const id =
      type === 'pdf' ? doc.pdfArchivoId : type === 'xml' ? doc.xmlArchivoId : doc.cdrArchivoId;
    if (!id) {
      this.notify.warning('Archivo no disponible');
      return;
    }
    window.open(this.api.fileDownloadUrl(id), '_blank');
  }
}
