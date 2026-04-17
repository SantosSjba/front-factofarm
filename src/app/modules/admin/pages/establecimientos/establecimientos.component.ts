import { Component } from '@angular/core';

@Component({
  selector: 'app-establecimientos',
  standalone: true,
  template: `
    <div class="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <h1 class="text-title-md font-semibold text-gray-800 dark:text-white/90">Establecimientos</h1>
      <p class="mt-2 text-theme-sm text-gray-500 dark:text-gray-400">
        Farmacias y sedes registradas en FactoFarm (en construcción).
      </p>
    </div>
  `,
})
export class EstablecimientosComponent {}
