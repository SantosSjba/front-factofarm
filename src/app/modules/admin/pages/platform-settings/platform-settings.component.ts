import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../../environments/environment';

type Setting = {
  key: string;
  label: string;
  secret: boolean;
  value: string;
  configured?: boolean;
  source: string;
};
@Component({
  standalone: true,
  imports: [FormsModule],
  template: ` <div class="p-6 max-w-4xl mx-auto">
    <h1 class="text-2xl font-semibold mb-3">Configuración de plataforma</h1>
    <p class="mb-6">
      Correo, recuperación de contraseña, sesiones y datos públicos. Los cambios se aplican a las
      próximas solicitudes.
    </p>
    @if (message()) {
      <p role="status" class="mb-4">{{ message() }}</p>
    }
    @if (loading()) {
      <p>Cargando configuración…</p>
    }
    <form (ngSubmit)="save()" class="space-y-4">
      @for (item of settings(); track item.key) {
        <div>
          <label [for]="item.key" class="block font-medium mb-1">{{ item.label }}</label>
          @if (item.key.endsWith('_ENABLED')) {
            <select
              [id]="item.key"
              [name]="item.key"
              [(ngModel)]="item.value"
              [disabled]="saving()"
              class="w-full border rounded-lg p-3 dark:bg-gray-900"
            >
              <option value="false">Deshabilitado</option>
              <option value="true">Habilitado</option>
            </select>
          } @else {
            <input
              [id]="item.key"
              [name]="item.key"
              [type]="item.secret ? 'password' : inputType(item.key)"
              [(ngModel)]="item.value"
              [autocomplete]="item.secret ? 'new-password' : 'off'"
              [placeholder]="
                item.secret && item.configured ? 'Configurada: dejar vacío para conservar' : ''
              "
              class="w-full border rounded-lg p-3 dark:bg-gray-900"
              [disabled]="saving()"
            />
          }
          <small>{{
            item.source === 'panel' ? 'Guardado en plataforma' : 'Valor inicial del entorno'
          }}</small>
        </div>
      }
      <button
        type="submit"
        [disabled]="loading() || saving() || !settings().length"
        class="rounded-lg px-5 py-3 bg-blue-600 text-white disabled:opacity-50"
      >
        {{ saving() ? 'Guardando…' : 'Guardar configuración' }}
      </button>
    </form>
  </div>`,
})
export class PlatformSettingsComponent {
  private readonly http = inject(HttpClient);
  protected readonly settings = signal<Setting[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly message = signal('');
  private original = new Map<string, string>();
  constructor() {
    void this.load();
  }
  protected inputType(key: string) {
    return key.endsWith('_EMAIL')
      ? 'email'
      : [
            'SMTP_PORT',
            'PASSWORD_RESET_EXPIRES_MINUTES',
            'JWT_REFRESH_EXPIRES_DAYS',
            'THROTTLE_TTL_MS',
            'THROTTLE_LIMIT',
            'THROTTLE_LOGIN_LIMIT',
            'DATA_RETENTION_AUDIT_DAYS',
            'DATA_RETENTION_ARCHIVE_DAYS',
            'DATA_RETENTION_BATCH_SIZE',
          ].includes(key)
        ? 'number'
        : ['SITE_URL', 'PASSWORD_RESET_BASE_URL'].includes(key)
          ? 'url'
          : 'text';
  }
  private setRows(rows: Setting[]) {
    this.settings.set(rows);
    this.original = new Map(rows.map((row) => [row.key, row.value]));
  }
  private async load() {
    try {
      this.setRows(
        await firstValueFrom(
          this.http.get<Setting[]>(`${environment.apiBaseUrl}/platform/settings`),
        ),
      );
    } catch {
      this.message.set('No se pudo cargar la configuración.');
    } finally {
      this.loading.set(false);
    }
  }
  protected async save() {
    const changed = Object.fromEntries(
      this.settings()
        .filter((row) => row.value !== this.original.get(row.key))
        .map((row) => [row.key, row.value]),
    );
    if (!Object.keys(changed).length) {
      this.message.set('No hay cambios pendientes.');
      return;
    }
    this.saving.set(true);
    this.message.set('');
    try {
      this.setRows(
        await firstValueFrom(
          this.http.patch<Setting[]>(`${environment.apiBaseUrl}/platform/settings`, changed),
        ),
      );
      this.message.set('Configuración guardada.');
    } catch (error: any) {
      const details = error?.error?.details;
      this.message.set(
        Array.isArray(details)
          ? details.map((d: any) => `${d.field}: ${d.message}`).join(' · ')
          : error?.error?.message || 'No se pudo guardar la configuración.',
      );
    } finally {
      this.saving.set(false);
    }
  }
}
