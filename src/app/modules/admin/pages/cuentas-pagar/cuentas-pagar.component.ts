import { Component } from '@angular/core';
import { DebtAccountsPageComponent } from '../../components/debt-accounts/debt-accounts-page.component';

/** Cuentas por pagar: usa la pantalla compartida con cuentas por cobrar. */
@Component({
  selector: 'app-cuentas-pagar',
  standalone: true,
  imports: [DebtAccountsPageComponent],
  template: '<app-debt-accounts-page kind="pagar" />',
})
export class CuentasPagarComponent {}
