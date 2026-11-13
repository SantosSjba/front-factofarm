import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { DashAdminComponent } from './dash-admin/dash-admin.component';
import { DashManagerComponent } from './dash-manager/dash-manager.component';
import { DashPharmacistComponent } from './dash-pharmacist/dash-pharmacist.component';
import { DashCashierComponent } from './dash-cashier/dash-cashier.component';
import { DashWarehouseComponent } from './dash-warehouse/dash-warehouse.component';
import { DashAccountantComponent } from './dash-accountant/dash-accountant.component';

/** Permisos «Panel general: …» (ver api: common/permissions/dashboard-sections.ts). */
const DASHBOARD_SECTION_CODES = [
  'nav.dashboard_ventas',
  'nav.dashboard_margenes',
  'nav.dashboard_caja',
  'nav.dashboard_inventario',
  'nav.dashboard_cuentas',
];

@Component({
  selector: 'app-dashboard-shell',
  standalone: true,
  imports: [
    CommonModule,
    DashAdminComponent,
    DashManagerComponent,
    DashPharmacistComponent,
    DashCashierComponent,
    DashWarehouseComponent,
    DashAccountantComponent,
  ],
  template: `
    @switch (dashboardKind()) {
      @case ('cashier') {
        <app-dash-cashier />
      }
      @case ('pharmacist') {
        <app-dash-pharmacist />
      }
      @case ('manager') {
        <app-dash-manager />
      }
      @case ('warehouse') {
        <app-dash-warehouse />
      }
      @case ('accountant') {
        <app-dash-accountant />
      }
      @default {
        <app-dash-admin />
      }
    }
  `,
})
export class DashboardShellComponent {
  private readonly auth = inject(AuthService);

  protected dashboardKind():
    | 'admin'
    | 'manager'
    | 'pharmacist'
    | 'cashier'
    | 'warehouse'
    | 'accountant' {
    const role = this.auth.user()?.role ?? '';
    if (role === 'ADMINISTRADOR' || role === 'ADMIN_CADENA') return 'admin';
    // Con alguna sección del panel general, ve ese panel (solo con lo permitido) en vez del de su rol.
    if (DASHBOARD_SECTION_CODES.some((code) => this.auth.hasPermission(code))) return 'admin';
    if (role === 'CAJERO' || role === 'VENDEDOR') return 'cashier';
    if (
      role === 'FARMACEUTICO' ||
      role === 'FARMACEUTICO_TITULAR' ||
      role === 'TECNICO_FARMACEUTICO'
    ) {
      return 'pharmacist';
    }
    if (role === 'GERENTE_SUCURSAL') return 'manager';
    if (role === 'ALMACENERO') return 'warehouse';
    if (role === 'CONTADOR') return 'accountant';
    return 'admin';
  }
}
