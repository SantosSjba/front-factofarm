import { passwordPolicyError } from '../../../../core/utils/password-policy';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';
import { isValidEmail } from '../../../../core/utils/form-validators';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { BreadcrumbInlineComponent } from '../../../../shared/components/common/breadcrumb-inline/breadcrumb-inline.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { PageToolbarComponent } from '../../../../shared/components/common/page-toolbar/page-toolbar.component';
import { userRoleLabel } from '../../../../core/utils/user-role-label.util';

@Component({
  standalone: true,
  imports: [
    FormsModule,
    InputFieldComponent,
    ButtonComponent,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Cuenta' }, { label: 'Mi perfil' }]" />
    <app-page-toolbar>
      <h1 data-toolbar-title class="text-title-sm font-semibold text-gray-800 dark:text-white/90">Mi perfil</h1>
    </app-page-toolbar>
    <div class="grid max-w-5xl gap-4 lg:grid-cols-2">
      <app-component-card title="Datos personales" [loading]="loading()" [error]="loadError()" (retry)="reload()">
        <form (ngSubmit)="saveProfile()" class="space-y-4">
          <app-input-field id="profile-nombre" name="nombre" label="Nombre" [isRequired]="true" [maxLength]="200" [value]="nombre" (valueChange)="nombre = '' + $event" />
          <app-input-field id="profile-email" name="email" type="email" label="Correo" [isRequired]="true" [maxLength]="254" [value]="email" (valueChange)="email = '' + $event" />
          <p class="text-sm text-gray-600 dark:text-gray-400">Rol: <span class="font-medium text-gray-800 dark:text-white/90">{{ roleLabel() }}</span></p>
          @if (auth.user()?.supportSession) {
            <p class="text-sm text-amber-700 dark:text-amber-400">La sesión de soporte no permite cambiar datos del operador.</p>
          }
          <app-button startIconName="mdi:content-save-outline" type="submit" [disabled]="busy() || !!auth.user()?.supportSession" [loading]="busy()">
            Guardar perfil
          </app-button>
        </form>
      </app-component-card>
      @if (!auth.user()?.supportSession) {
        <app-component-card title="Cambiar contraseña" desc="Al cambiarla se cerrará tu sesión.">
          <form (ngSubmit)="changePassword()" class="space-y-4">
            <app-input-field id="profile-current-password" name="currentPassword" type="password" label="Contraseña actual" [isRequired]="true" autocomplete="current-password" [value]="currentPassword" (valueChange)="currentPassword = '' + $event" />
            <app-input-field id="profile-new-password" name="newPassword" type="password" label="Nueva contraseña" [isRequired]="true" [maxLength]="128" autocomplete="new-password" hint="Incluye mayúscula, minúscula, número y carácter especial." [value]="newPassword" (valueChange)="newPassword = '' + $event" />
            <app-input-field id="profile-confirm-password" name="confirmPassword" type="password" label="Confirmar contraseña" [isRequired]="true" [maxLength]="128" autocomplete="new-password" [value]="confirmPassword" (valueChange)="confirmPassword = '' + $event" />
            <app-button startIconName="mdi:lock-reset" type="submit" [disabled]="loading() || busy()" [loading]="busy()">
              Cambiar contraseña
            </app-button>
          </form>
        </app-component-card>
      }
    </div>`,
})
export class ProfileComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotifyService);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly message = signal('');
  protected readonly loadError = signal<string | null>(null);
  protected roleLabel(): string {
    const role = this.auth.user()?.role;
    return role ? userRoleLabel(role) : '—';
  }
  protected reload() {
    this.loadError.set(null);
    this.loading.set(true);
    void this.load();
  }
  protected nombre = '';
  protected email = '';
  protected currentPassword = '';
  protected newPassword = '';
  protected confirmPassword = '';
  constructor() {
    void this.load();
  }
  private async load() {
    try {
      const user = await firstValueFrom(this.auth.loadProfile());
      this.nombre = user.nombre;
      this.email = user.email;
    } catch (error) {
      this.loadError.set(httpErrorMessage(error, 'No se pudo cargar el perfil.'));
    } finally {
      this.loading.set(false);
    }
  }
  private feedback(text: string, kind: 'success' | 'warning' | 'error') {
    this.message.set(text);
    this.notify[kind](text);
  }

  protected async saveProfile() {
    if (this.busy() || this.auth.user()?.supportSession) return;
    if (this.nombre.trim().length < 2) {
      this.feedback('El nombre debe tener al menos 2 caracteres.', 'warning');
      return;
    }
    if (!isValidEmail(this.email)) {
      this.feedback('Ingresa un correo electrónico válido.', 'warning');
      return;
    }
    this.busy.set(true);
    try {
      await firstValueFrom(
        this.auth.updateProfile({
          nombre: this.nombre.trim(),
          email: this.email.trim().toLowerCase(),
        }),
      );
      this.feedback('Perfil actualizado.', 'success');
    } catch (error) {
      this.feedback(httpErrorMessage(error, 'No se pudo actualizar el perfil.'), 'error');
    } finally {
      this.busy.set(false);
    }
  }
  protected async changePassword() {
    if (this.busy() || this.auth.user()?.supportSession) return;
    const password = this.newPassword;
    if (!this.currentPassword) {
      this.feedback('Ingresa tu contraseña actual.', 'warning');
      return;
    }
    const policyError = passwordPolicyError(password);
    if (policyError) { this.feedback(policyError, 'warning'); return; }
    if (password !== this.confirmPassword) {
      this.feedback('Las contraseñas no coinciden.', 'warning');
      return;
    }
    this.busy.set(true);
    try {
      await firstValueFrom(this.auth.changePassword(this.currentPassword, password));
      this.notify.success('Contraseña actualizada. Inicia sesión con tu nueva contraseña.');
      this.auth.clearSession();
      await this.router.navigateByUrl('/auth/signin');
    } catch (error) {
      this.feedback(httpErrorMessage(error, 'No se pudo cambiar la contraseña.'), 'error');
    } finally {
      this.busy.set(false);
    }
  }
}
