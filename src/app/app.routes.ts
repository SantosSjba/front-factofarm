import { Routes } from '@angular/router';
import { NotFoundComponent } from './pages/other-page/not-found/not-found.component';

/**
 * Entradas de primer nivel: landing pública, panel admin (lazy), autenticación (lazy), redirecciones y fallback.
 */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/landing/landing.component').then((m) => m.LandingComponent),
    title: 'FactoFarm | Software para farmacias y boticas',
  },
  {
    // Pública: ventana secundaria del POS (sessionStorage no se comparte entre ventanas).
    path: 'pos-pantalla-cliente',
    loadComponent: () =>
      import('./modules/admin/pages/pos-pantalla-cliente/pos-pantalla-cliente.component').then(
        (m) => m.PosPantallaClienteComponent,
      ),
    title: 'FactoFarm | Pantalla cliente',
  },
  {
    path: '',
    loadChildren: () =>
      import('./modules/admin/admin.routes').then((m) => m.adminRoutes),
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('./modules/auth/auth.routes').then((m) => m.authRoutes),
  },
  {
    path: 'legal',
    children: [
      {
        path: 'privacidad',
        loadComponent: () =>
          import('./pages/legal/privacy-policy-page.component').then((m) => m.PrivacyPolicyPageComponent),
        title: 'FactoFarm | Política de privacidad',
      },
      {
        path: 'terminos',
        loadComponent: () =>
          import('./pages/legal/terms-of-use-page.component').then((m) => m.TermsOfUsePageComponent),
        title: 'FactoFarm | Términos de uso',
      },
      {
        path: 'libro-reclamaciones',
        loadComponent: () =>
          import('./pages/legal/complaints-book-page.component').then(
            (m) => m.ComplaintsBookPageComponent,
          ),
        title: 'FactoFarm | Libro de reclamaciones',
      },
    ],
  },
  {
    path: 'signin',
    redirectTo: 'auth/signin',
    pathMatch: 'full',
  },
  {
    path: 'signup',
    redirectTo: 'auth/signin',
    pathMatch: 'full',
  },
  {
    path: '**',
    component: NotFoundComponent,
    title: 'FactoFarm | No encontrado',
  },
];
