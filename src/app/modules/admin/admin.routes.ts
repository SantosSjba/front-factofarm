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
        redirectTo: 'usuarios',
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
    ],
  },
];
