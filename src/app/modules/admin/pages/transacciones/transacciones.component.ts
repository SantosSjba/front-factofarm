import { Component } from '@angular/core';
import { BankMovementsPageComponent } from '../../components/bank-movements/bank-movements-page.component';

/** Usa la pantalla compartida de cuentas y movimientos bancarios. */
@Component({
  selector: 'app-transacciones',
  standalone: true,
  imports: [BankMovementsPageComponent],
  template: '<app-bank-movements-page mode="transacciones" />',
})
export class TransaccionesComponent {}
