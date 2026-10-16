import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { FormSelectComponent } from '../../../../shared/components/form/form-select/form-select.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';

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
  imports: [
    FormsModule,
    FormSelectComponent,
    InputFieldComponent,
    ButtonComponent,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Plataforma' }, { label: 'Configuración' }]" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-title-sm font-semibold text-gray-800 dark:text-white/90">Configuración de plataforma</h1>
    </app-page-toolbar>
    <app-component-card
      className="max-w-4xl"
      title="Parámetros generales"
      desc="Correo, recuperación de contraseña, sesiones y datos públicos. Los cambios se aplican a las próximas solicitudes."
      [loading]="loading()"
      [error]="loadError()"
      (retry)="reload()"
    >
    <form (ngSubmit)="save()" class="space-y-4">
      @for (item of settings(); track item.key) {
        <div>
          @if (item.key.endsWith('_ENABLED')) {
            <app-form-select
              [id]="item.key"
              [label]="item.label"
              [showPlaceholder]="false"
              [options]="enabledOptions"
              [value]="item.value"
              [disabled]="saving()"
              (valueChange)="item.value = $event"
            />
          } @else {
            <app-input-field
              [id]="item.key"
              [name]="item.key"
              [label]="item.label"
              [type]="item.secret ? 'password' : inputType(item.key)"
              [autocomplete]="item.secret ? 'new-password' : 'off'"
              [placeholder]="item.secret && item.configured ? 'Configurada: dejar vacío para conservar' : ''"
              [value]="item.value"
              [disabled]="saving()"
              (valueChange)="item.value = '' + $event"
            />
          }
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{
            item.source === 'panel' ? 'Guardado en plataforma' : 'Valor inicial del entorno'
          }}</p>
        </div>
      }
      <app-button
        type="submit"
        [disabled]="loading() || saving() || !settings().length"
        [loading]="saving()"
      >
        {{ saving() ? 'Guardando…' : 'Guardar configuración' }}
      </app-button>
    </form>
    </app-component-card>`,
})
export class PlatformSettingsComponent {
  private readonly http = inject(HttpClient);
  private readonly notify = inject(NotifyService);
  protected readonly enabledOptions = [
    { value: 'false', label: 'Deshabilitado' },
    { value: 'true', label: 'Habilitado' },
  ];
  protected readonly settings = signal<Setting[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly message = signal('');
  protected readonly loadError = signal<string | null>(null);
  protected reload() {
    this.loadError.set(null);
    this.loading.set(true);
    void this.load();
  }
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
    } catch (error) {
      this.loadError.set(httpErrorMessage(error, 'No se pudo cargar la configuración.'));
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
      this.notify.info('No hay cambios pendientes.');
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
      this.notify.success('Configuración guardada.');
    } catch (error) {
      const details = (error as { error?: { details?: unknown } })?.error?.details;
      const text = Array.isArray(details)
        ? details
            .map((d: { field?: string; message?: string; messages?: string[] }) =>
              d.message ? `${d.field}: ${d.message}` : (d.messages?.[0] ?? ''),
            )
            .filter(Boolean)
            .join(' · ')
        : '';
      const message = text || httpErrorMessage(error, 'No se pudo guardar la configuración.');
      this.message.set(message);
      this.notify.error('No se pudo guardar la configuración', message);
    } finally {
      this.saving.set(false);
    }
  }
}
