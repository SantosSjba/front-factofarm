import { Component } from '@angular/core';
import { DebtAccountsPageComponent } from '../../components/debt-accounts/debt-accounts-page.component';

/** Cuentas por cobrar: usa la pantalla compartida con cuentas por pagar. */
@Component({
  selector: 'app-cuentas-cobrar',
  standalone: true,
  imports: [DebtAccountsPageComponent],
  template: '<app-debt-accounts-page kind="cobrar" />',
})
export class CuentasCobrarComponent {}
