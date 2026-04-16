import { Routes } from '@angular/router';
import { EcommerceComponent } from './pages/dashboard/ecommerce/ecommerce.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { FormElementsComponent } from './pages/forms/form-elements/form-elements.component';
import { BasicTablesComponent } from './pages/tables/basic-tables/basic-tables.component';
import { BlankComponent } from './pages/blank/blank.component';
import { NotFoundComponent } from './pages/other-page/not-found/not-found.component';
import { AppLayoutComponent } from './shared/layout/app-layout/app-layout.component';
import { InvoicesComponent } from './pages/invoices/invoices.component';
import { LineChartComponent } from './pages/charts/line-chart/line-chart.component';
import { BarChartComponent } from './pages/charts/bar-chart/bar-chart.component';
import { AlertsComponent } from './pages/ui-elements/alerts/alerts.component';
import { AvatarElementComponent } from './pages/ui-elements/avatar-element/avatar-element.component';
import { BadgesComponent } from './pages/ui-elements/badges/badges.component';
import { ButtonsComponent } from './pages/ui-elements/buttons/buttons.component';
import { ImagesComponent } from './pages/ui-elements/images/images.component';
import { VideosComponent } from './pages/ui-elements/videos/videos.component';
import { SignInComponent } from './pages/auth-pages/sign-in/sign-in.component';
import { SignUpComponent } from './pages/auth-pages/sign-up/sign-up.component';
import { CalenderComponent } from './pages/calender/calender.component';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        component: EcommerceComponent,
        pathMatch: 'full',
        title: 'FactoFarm | Panel',
      },
      {
        path: 'calendar',
        component: CalenderComponent,
        title: 'FactoFarm | Calendario',
      },
      {
        path: 'profile',
        component: ProfileComponent,
        title: 'FactoFarm | Perfil',
      },
      {
        path: 'form-elements',
        component: FormElementsComponent,
        title: 'FactoFarm | Formularios',
      },
      {
        path: 'basic-tables',
        component: BasicTablesComponent,
        title: 'FactoFarm | Tablas',
      },
      {
        path: 'blank',
        component: BlankComponent,
        title: 'FactoFarm',
      },
      {
        path: 'invoice',
        component: InvoicesComponent,
        title: 'FactoFarm | Facturas',
      },
      {
        path: 'line-chart',
        component: LineChartComponent,
        title: 'FactoFarm | Gráfico líneas',
      },
      {
        path: 'bar-chart',
        component: BarChartComponent,
        title: 'FactoFarm | Gráfico barras',
      },
      {
        path: 'alerts',
        component: AlertsComponent,
        title: 'FactoFarm | Alertas',
      },
      {
        path: 'avatars',
        component: AvatarElementComponent,
        title: 'FactoFarm | Avatares',
      },
      {
        path: 'badge',
        component: BadgesComponent,
        title: 'FactoFarm | Badges',
      },
      {
        path: 'buttons',
        component: ButtonsComponent,
        title: 'FactoFarm | Botones',
      },
      {
        path: 'images',
        component: ImagesComponent,
        title: 'FactoFarm | Imágenes',
      },
      {
        path: 'videos',
        component: VideosComponent,
        title: 'FactoFarm | Videos',
      },
    ],
  },
  {
    path: 'signin',
    component: SignInComponent,
    canActivate: [guestGuard],
    title: 'FactoFarm | Iniciar sesión',
  },
  {
    path: 'signup',
    component: SignUpComponent,
    canActivate: [guestGuard],
    title: 'FactoFarm | Registro',
  },
  {
    path: '**',
    component: NotFoundComponent,
    title: 'FactoFarm | No encontrado',
  },
];
