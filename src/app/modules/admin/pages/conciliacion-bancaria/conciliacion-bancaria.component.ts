import { Component } from '@angular/core';
import { BankMovementsPageComponent } from '../../components/bank-movements/bank-movements-page.component';

/** Usa la pantalla compartida de cuentas y movimientos bancarios. */
@Component({
  selector: 'app-conciliacion-bancaria',
  standalone: true,
  imports: [BankMovementsPageComponent],
  template: '<app-bank-movements-page mode="conciliacion" />',
})
export class ConciliacionBancariaComponent {}
