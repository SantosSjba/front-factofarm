import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeToggleButtonComponent } from '../../components/common/theme-toggle/theme-toggle-button.component';

@Component({
  selector: 'app-public-legal-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, ThemeToggleButtonComponent],
  template: `
    <div class="min-h-screen bg-white dark:bg-gray-900">
      <header class="border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
        <div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a routerLink="/" class="logo-dark-glow inline-flex items-center">
            <img
              src="/images/logo/logo-nav.png"
              alt="FactoFarm"
              class="h-9 w-auto max-w-[180px] object-contain"
            />
          </a>
          <div class="flex items-center gap-2">
            <app-theme-toggle-button />
            <a
              routerLink="/"
              class="hidden rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:text-brand-600 sm:inline-flex dark:text-gray-300"
            >
              Volver al inicio
            </a>
          </div>
        </div>
        <nav class="mx-auto flex max-w-5xl flex-wrap gap-1 border-t border-gray-100 px-4 py-2 sm:px-6 dark:border-gray-800">
          <a
            routerLink="/legal/privacidad"
            routerLinkActive="bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
            class="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
          >
            Privacidad
          </a>
          <a
            routerLink="/legal/terminos"
            routerLinkActive="bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
            class="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
          >
            Términos
          </a>
          <a
            routerLink="/legal/libro-reclamaciones"
            routerLinkActive="bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
            class="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
          >
            Libro de reclamaciones
          </a>
        </nav>
      </header>

      <main class="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <ng-content />
      </main>

      <footer class="border-t border-gray-200 bg-gray-50 py-6 dark:border-gray-800 dark:bg-gray-950">
        <div class="mx-auto flex max-w-5xl flex-wrap gap-4 px-4 text-sm text-gray-500 sm:px-6 dark:text-gray-400">
          <a routerLink="/" class="hover:text-brand-500">Inicio</a>
          <a routerLink="/legal/privacidad" class="hover:text-brand-500">Privacidad</a>
          <a routerLink="/legal/terminos" class="hover:text-brand-500">Términos</a>
          <a routerLink="/legal/libro-reclamaciones" class="hover:text-brand-500">Libro de reclamaciones</a>
        </div>
      </footer>
    </div>
  `,
})
export class PublicLegalLayoutComponent {}
