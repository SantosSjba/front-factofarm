import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { AppLayoutComponent } from '../../shared/layout/app-layout/app-layout.component';

/**
 * Panel administrativo (layout + rutas protegidas).
 * Cada hijo puede seguir evolucionando a sub-módulos con más `loadChildren` si crece el dominio.
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
        loadComponent: () =>
          import('./pages/dashboard/ecommerce/ecommerce.component').then(
            (m) => m.EcommerceComponent,
          ),
        title: 'FactoFarm | Panel',
      },
      {
        path: 'calendar',
        loadComponent: () =>
          import('./pages/calender/calender.component').then(
            (m) => m.CalenderComponent,
          ),
        title: 'FactoFarm | Calendario',
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/profile/profile.component').then(
            (m) => m.ProfileComponent,
          ),
        title: 'FactoFarm | Perfil',
      },
      {
        path: 'form-elements',
        loadComponent: () =>
          import('./pages/forms/form-elements/form-elements.component').then(
            (m) => m.FormElementsComponent,
          ),
        title: 'FactoFarm | Formularios',
      },
      {
        path: 'basic-tables',
        loadComponent: () =>
          import('./pages/tables/basic-tables/basic-tables.component').then(
            (m) => m.BasicTablesComponent,
          ),
        title: 'FactoFarm | Tablas',
      },
      {
        path: 'blank',
        loadComponent: () =>
          import('./pages/blank/blank.component').then((m) => m.BlankComponent),
        title: 'FactoFarm',
      },
      {
        path: 'invoice',
        loadComponent: () =>
          import('./pages/invoices/invoices.component').then(
            (m) => m.InvoicesComponent,
          ),
        title: 'FactoFarm | Facturas',
      },
      {
        path: 'line-chart',
        loadComponent: () =>
          import('./pages/charts/line-chart/line-chart.component').then(
            (m) => m.LineChartComponent,
          ),
        title: 'FactoFarm | Gráfico líneas',
      },
      {
        path: 'bar-chart',
        loadComponent: () =>
          import('./pages/charts/bar-chart/bar-chart.component').then(
            (m) => m.BarChartComponent,
          ),
        title: 'FactoFarm | Gráfico barras',
      },
      {
        path: 'alerts',
        loadComponent: () =>
          import('./pages/ui-elements/alerts/alerts.component').then(
            (m) => m.AlertsComponent,
          ),
        title: 'FactoFarm | Alertas',
      },
      {
        path: 'avatars',
        loadComponent: () =>
          import('./pages/ui-elements/avatar-element/avatar-element.component').then(
            (m) => m.AvatarElementComponent,
          ),
        title: 'FactoFarm | Avatares',
      },
      {
        path: 'badge',
        loadComponent: () =>
          import('./pages/ui-elements/badges/badges.component').then(
            (m) => m.BadgesComponent,
          ),
        title: 'FactoFarm | Badges',
      },
      {
        path: 'buttons',
        loadComponent: () =>
          import('./pages/ui-elements/buttons/buttons.component').then(
            (m) => m.ButtonsComponent,
          ),
        title: 'FactoFarm | Botones',
      },
      {
        path: 'images',
        loadComponent: () =>
          import('./pages/ui-elements/images/images.component').then(
            (m) => m.ImagesComponent,
          ),
        title: 'FactoFarm | Imágenes',
      },
      {
        path: 'videos',
        loadComponent: () =>
          import('./pages/ui-elements/videos/videos.component').then(
            (m) => m.VideosComponent,
          ),
        title: 'FactoFarm | Videos',
      },
    ],
  },
];
