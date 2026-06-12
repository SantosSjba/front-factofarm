import { Component, inject } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { LocaleService } from '../../../../../core/services/locale.service';
import { DirectoryApiService } from '../../../services/directory-api.service';
import { ComponentCardComponent } from '../../../../../shared/components/common/component-card/component-card.component';
import { IconComponent } from '../../../../../shared/components/ui/icon/icon.component';

@Component({
  selector: 'app-dash-admin',
  imports: [ComponentCardComponent, IconComponent],
  templateUrl: './dash-admin.component.html',
})
export class DashAdminComponent {
  private readonly api = inject(DirectoryApiService);
  protected readonly locale = inject(LocaleService);

  protected readonly statsQuery = injectQuery(() => ({
    queryKey: ['dashboard', 'stats'] as const,
    queryFn: () => firstValueFrom(this.api.getDashboardStats()),
  }));

  protected formatCount(value: number | undefined): string {
    return this.locale.formatNumber(value ?? 0);
  }
}
