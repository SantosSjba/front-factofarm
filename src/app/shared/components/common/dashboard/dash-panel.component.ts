import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HelpHintComponent } from '../../ui/help-hint/help-hint.component';
import { AuthService } from '../../../../core/services/auth.service';
import { canOpenRoute } from '../../../../core/utils/route-access';

/** Panel compacto de dashboard: título corto, ayuda opcional y enlace "Ver más". */
@Component({
  selector: 'app-dash-panel',
  standalone: true,
  imports: [RouterLink, HelpHintComponent],
  template: `
    <section class="flex h-full flex-col rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <header class="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2 dark:border-white/[0.05]">
        <h2 class="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-gray-800 dark:text-white/90">
          <span class="truncate">{{ title() }}</span>
          @if (hint()) {
            <app-help-hint [text]="hint()!" [iconSize]="14" />
          }
        </h2>
        @if (allowedLink()) {
          <a [routerLink]="allowedLink()" class="shrink-0 text-theme-xs font-medium text-brand-600 hover:underline dark:text-brand-400">{{ linkText() }}</a>
        }
      </header>
      <div class="flex-1 p-3">
        <ng-content />
      </div>
    </section>
  `,
  host: { class: 'block' },
})
export class DashPanelComponent {
  readonly title = input.required<string>();
  readonly hint = input<string | null>(null);
  readonly link = input<string | null>(null);
  readonly linkText = input('Ver más');

  private readonly auth = inject(AuthService);
  protected readonly allowedLink = computed(() => {
    const link = this.link();
    return link && canOpenRoute(link, (code) => this.auth.hasPermission(code)) ? link : null;
  });
}
