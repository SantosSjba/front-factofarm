import { Component } from '@angular/core';
import { TaxWithholdingPageComponent } from '../../components/tax-withholding-page/tax-withholding-page.component';

/** Retenciones SUNAT (y detracciones): la pantalla vive en el componente compartido. */
@Component({
  selector: 'app-retenciones',
  standalone: true,
  imports: [TaxWithholdingPageComponent],
  template: `<app-tax-withholding-page kind="RETENCION" />`,
})
export class RetencionesComponent {}
