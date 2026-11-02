import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/services/auth.service';
import { DropdownComponent } from '../../ui/dropdown/dropdown.component';
import { IconComponent } from '../../ui/icon/icon.component';

export type HeaderAlert = {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  icon: string;
  title: string;
  detail: string;
  count: number;
  route: string;
  queryParams?: Record<string, string>;
};

const SEVERITY_CLASSES: Record<HeaderAlert['severity'], string> = {
  critical: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400',
  warning: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400',
  info: 'bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/15 dark:text-blue-light-400',
};
const SEVERITY_LABEL: Record<HeaderAlert['severity'], string> = {
  critical: 'Urgente',
  warning: 'Atención',
  info: 'Aviso',
};
const SEEN_PREFIX = 'ff.alerts.seen.v1';

/**
 * Campana de notificaciones: alertas operativas reales (`GET /dashboard/alerts`) filtradas por
 * los permisos del usuario. El indicador cuenta las alertas nuevas o que crecieron desde que
 * el usuario abrió la campana por última vez.
 */
@Component({
  selector: 'app-notification-dropdown',
  templateUrl: './notification-dropdown.component.html',
  imports: [CommonModule, RouterModule, DropdownComponent, IconComponent],
})
export class NotificationDropdownComponent {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  protected isOpen = false;
  protected readonly severityClass = SEVERITY_CLASSES;
  protected readonly severityLabel = SEVERITY_LABEL;

  protected readonly query = injectQuery(() => ({
    queryKey: ['header', 'alerts', this.auth.user()?.id ?? 'anon'] as const,
    queryFn: () =>
      firstValueFrom(this.http.get<{ alerts: HeaderAlert[]; generatedAt: string }>(`${environment.apiBaseUrl}/dashboard/alerts`)),
    enabled: !!this.auth.user(),
    refetchInterval: 2 * 60_000,
    refetchOnWindowFocus: true,
    staleTime: 60_000,
  }));

  protected readonly alerts = computed(() => this.query.data()?.alerts ?? []);
  private readonly seen = signal<Record<string, number>>(this.readSeen());

  /** Alertas nuevas o con más casos que la última vez que se abrió la campana. */
  protected readonly unseenCount = computed(() => {
    const seen = this.seen();
    return this.alerts().filter((a) => (seen[a.id] ?? 0) < a.count).length;
  });
  protected readonly hasCritical = computed(() => this.alerts().some((a) => a.severity === 'critical'));

  protected isUnseen(alert: HeaderAlert): boolean {
    return (this.seen()[alert.id] ?? 0) < alert.count;
  }

  protected toggleDropdown() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      void this.query.refetch();
    } else {
      this.markSeen();
    }
  }

  protected closeDropdown() {
    if (this.isOpen) this.markSeen();
    this.isOpen = false;
  }

  private markSeen() {
    const next = Object.fromEntries(this.alerts().map((a) => [a.id, a.count]));
    this.seen.set(next);
    const key = this.storageKey();
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* almacenamiento no disponible */
    }
  }

  private readSeen(): Record<string, number> {
    const key = this.storageKey();
    if (!key) return {};
    try {
      return JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, number>;
    } catch {
      return {};
    }
  }

  private storageKey(): string | null {
    const id = this.auth.user()?.id;
    return id ? `${SEEN_PREFIX}.${id}` : null;
  }
}
