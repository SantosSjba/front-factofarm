import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { DashAdminComponent } from './dash-admin/dash-admin.component';
import { DashManagerComponent } from './dash-manager/dash-manager.component';
import { DashPharmacistComponent } from './dash-pharmacist/dash-pharmacist.component';
import { DashCashierComponent } from './dash-cashier/dash-cashier.component';

@Component({
  selector: 'app-dashboard-shell',
  standalone: true,
  imports: [
    CommonModule,
    DashAdminComponent,
    DashManagerComponent,
    DashPharmacistComponent,
    DashCashierComponent,
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
      @default {
        <app-dash-admin />
      }
    }
  `,
})
export class DashboardShellComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    if (this.auth.isPlatformAdmin()) {
      void this.router.navigateByUrl('/platform/clientes');
    }
  }

  protected dashboardKind(): 'admin' | 'manager' | 'pharmacist' | 'cashier' {
    const role = this.auth.user()?.role ?? '';
    if (role === 'CAJERO' || role === 'VENDEDOR') return 'cashier';
    if (
      role === 'FARMACEUTICO' ||
      role === 'FARMACEUTICO_TITULAR' ||
      role === 'TECNICO_FARMACEUTICO'
    ) {
      return 'pharmacist';
    }
    if (role === 'GERENTE_SUCURSAL') return 'manager';
    return 'admin';
  }
}
