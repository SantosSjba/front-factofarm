import { Injectable, inject } from '@angular/core';
import { LocaleService } from '../../../../core/services/locale.service';
import type { CashRegisterHardwareDto, SaleDetailDto } from '../../models/directory.models';

export type PosPrintConfig = Pick<
  CashRegisterHardwareDto,
  'printerPaperWidth' | 'printerAutoPrint' | 'openCashDrawerOnPrint' | 'escposPrinterName'
>;

@Injectable({ providedIn: 'root' })
export class PosPrintService {
  private readonly locale = inject(LocaleService);

  printTicket(sale: SaleDetailDto, config?: Partial<PosPrintConfig>) {
    const widthMm = config?.printerPaperWidth === 'MM_58' ? 58 : 80;
    const maxWidthPx = widthMm === 58 ? 220 : 300;
    const fontSize = widthMm === 58 ? 11 : 12;

    const lines = sale.items
      .map(
        (i) =>
          `<tr><td>${this.escape(i.producto)}</td><td align="right">${i.cantidad}</td><td align="right">${i.totalLinea}</td></tr>`,
      )
      .join('');

    const paymentRows = sale.payments
      .map(
        (p) =>
          `<div>${this.escape(p.metodo)}: S/ ${p.monto}${p.referencia ? ` · ${this.escape(p.referencia)}` : ''}</div>`,
      )
      .join('');

    const lotInfo = sale.items
      .flatMap((i) => i.lotes.map((l) => `${this.escape(i.producto)}: ${l.codigoLote} × ${l.cantidad}`))
      .join('<br/>');

    const drawerPulse = config?.openCashDrawerOnPrint
      ? '<span style="font-size:0;line-height:0;color:transparent">\\x1B\\x70\\x00\\x19\\xFA</span>'
      : '';

    const html = `<!DOCTYPE html><html><head><title>Ticket ${sale.serie}-${sale.numero}</title>
      <style>body{font-family:monospace;font-size:${fontSize}px;max-width:${maxWidthPx}px;margin:0 auto;padding:8px}
      table{width:100%;border-collapse:collapse}td{padding:2px 0}.totals{margin-top:8px;border-top:1px dashed #000;padding-top:4px}
      .payments{margin-top:6px;font-size:${fontSize - 1}px}</style></head>
      <body onload="window.print();window.close()">
      ${drawerPulse}
      <h3 style="text-align:center;margin:0">FactoFarm</h3>
      <p style="text-align:center;margin:4px 0">${this.escape(sale.documentType)} ${sale.serie ?? ''}-${sale.numero ?? ''}</p>
      <p style="font-size:10px">${this.locale.formatDate(sale.createdAt, { dateStyle: 'short', timeStyle: 'short' })}</p>
      ${sale.customer ? `<p>Cliente: ${this.escape(sale.customer.nombre)}</p>` : ''}
      <table>${lines}</table>
      <div class="totals">
        <div>Subtotal: S/ ${sale.subtotal}</div>
        <div>IGV: S/ ${sale.igvTotal}</div>
        <div><strong>Total: S/ ${sale.total}</strong></div>
      </div>
      ${paymentRows ? `<div class="payments">${paymentRows}</div>` : ''}
      ${lotInfo ? `<p style="font-size:10px;margin-top:8px">Lotes:<br/>${lotInfo}</p>` : ''}
      <p style="text-align:center;margin-top:12px;font-size:10px">Gracias por su compra</p>
      </body></html>`;

    const w = window.open('', '_blank', `width=${maxWidthPx + 40},height=600`);
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  }

  shouldAutoPrint(config?: Partial<PosPrintConfig>): boolean {
    return config?.printerAutoPrint ?? true;
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
