import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { DirectoryApiService } from '../../modules/admin/services/directory-api.service';

@Component({
  selector: 'app-legal-page',
  standalone: true,
  template: `
    <div class="mx-auto max-w-4xl px-6 py-10">
      @if (docQuery.isPending()) {
        <p class="text-sm text-gray-500">Cargando documento…</p>
      } @else if (docQuery.isError()) {
        <p class="text-sm text-red-600">No se pudo cargar el documento legal.</p>
      } @else {
        <h1 class="mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
          {{ docQuery.data()?.title }}
        </h1>
        <pre class="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">{{ docQuery.data()?.content }}</pre>
      }
    </div>
  `,
})
export class LegalPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(DirectoryApiService);

  protected readonly docQuery = injectQuery(() => ({
    queryKey: ['legal', this.route.snapshot.data['docType']] as const,
    queryFn: () =>
      firstValueFrom(
        this.route.snapshot.data['docType'] === 'terms'
          ? this.api.getLegalTerms()
          : this.api.getLegalPrivacy(),
      ),
  }));
}
