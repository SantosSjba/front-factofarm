import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { AppLayoutComponent } from '../../shared/layout/app-layout/app-layout.component';

/**
 * Panel administrativo (layout + rutas protegidas).
 */
export const adminRoutes: Routes = [
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dash-admin/dash-admin.component').then(
            (m) => m.DashAdminComponent,
          ),
        title: 'FactoFarm | Dashboard',
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./pages/usuarios/usuarios.component').then(
            (m) => m.UsuariosComponent,
          ),
        title: 'FactoFarm | Usuarios',
      },
      {
        path: 'establecimientos',
        loadComponent: () =>
          import('./pages/establecimientos/establecimientos.component').then(
            (m) => m.EstablecimientosComponent,
          ),
        title: 'FactoFarm | Establecimientos',
      },
      {
        path: 'clientes',
        loadComponent: () =>
          import('./pages/clientes/clientes.component').then(
            (m) => m.ClientesComponent,
          ),
        title: 'FactoFarm | Clientes',
      },
      {
        path: 'tipo-clientes',
        loadComponent: () =>
          import('./pages/tipo-clientes/tipo-clientes.component').then(
            (m) => m.TipoClientesComponent,
          ),
        title: 'FactoFarm | Tipos de Clientes',
      },
    ],
  },
];
