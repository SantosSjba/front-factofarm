import { passwordPolicyError } from '../../../../core/utils/password-policy';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { httpErrorMessage } from '../../../../core/http/http-error-message';

@Component({
  standalone: true,
  imports: [FormsModule],
  template: ` <div class="p-6 max-w-2xl mx-auto space-y-6">
    <h1 class="text-2xl font-semibold">Mi perfil</h1>
    @if (message()) {
      <p role="status">{{ message() }}</p>
    }
    @if (loading()) {
      <p>Cargando perfil…</p>
    }
    <form (ngSubmit)="saveProfile()" class="space-y-4">
      <label class="block"
        >Nombre
        <input
          name="nombre"
          [(ngModel)]="nombre"
          required
          minlength="2"
          maxlength="200"
          class="block w-full border rounded-lg p-3 dark:bg-gray-900"
        />
      </label>
      <label class="block"
        >Correo
        <input
          name="email"
          type="email"
          [(ngModel)]="email"
          required
          maxlength="254"
          class="block w-full border rounded-lg p-3 dark:bg-gray-900"
        />
      </label>
      <p>Rol: {{ auth.user()?.role }}</p>
      <button
        [disabled]="loading() || busy() || !!auth.user()?.supportSession"
        class="bg-blue-600 text-white rounded-lg px-5 py-3 disabled:opacity-50"
      >
        Guardar perfil
      </button>
    </form>
    @if (auth.user()?.supportSession) {
      <p>La sesión de soporte no permite cambiar datos del operador.</p>
    } @else {
      <form (ngSubmit)="changePassword()" class="space-y-4">
        <h2 class="text-xl font-semibold">Cambiar contraseña</h2>
        <label class="block"
          >Contraseña actual
          <input
            name="currentPassword"
            type="password"
            [(ngModel)]="currentPassword"
            required
            autocomplete="current-password"
            class="block w-full border rounded-lg p-3 dark:bg-gray-900"
          />
        </label>
        <label class="block"
          >Nueva contraseña
          <input
            name="newPassword"
            type="password"
            [(ngModel)]="newPassword"
            required
            minlength="8"
            maxlength="128"
            autocomplete="new-password"
            class="block w-full border rounded-lg p-3 dark:bg-gray-900"
          />
        </label>
        <p>Incluye mayúscula, minúscula, número y carácter especial.</p>
        <label class="block"
          >Confirmar contraseña
          <input
            name="confirmPassword"
            type="password"
            [(ngModel)]="confirmPassword"
            required
            autocomplete="new-password"
            class="block w-full border rounded-lg p-3 dark:bg-gray-900"
          />
        </label>
        <button
          [disabled]="loading() || busy()"
          class="bg-blue-600 text-white rounded-lg px-5 py-3 disabled:opacity-50"
        >
          Cambiar contraseña
        </button>
      </form>
    }
  </div>`,
})
export class ProfileComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly message = signal('');
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
      this.message.set(httpErrorMessage(error, 'No se pudo cargar el perfil.'));
    } finally {
      this.loading.set(false);
    }
  }
  protected async saveProfile() {
    if (this.busy() || this.auth.user()?.supportSession) return;
    if (this.nombre.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) {
      this.message.set('Ingresa un nombre y correo válidos.');
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
      this.message.set('Perfil actualizado.');
    } catch (error) {
      this.message.set(httpErrorMessage(error, 'No se pudo actualizar el perfil.'));
    } finally {
      this.busy.set(false);
    }
  }
  protected async changePassword() {
    if (this.busy() || this.auth.user()?.supportSession) return;
    const password = this.newPassword;
    const policyError = passwordPolicyError(password);
    if (policyError) { this.message.set(policyError); return; }
    if (password !== this.confirmPassword) {
      this.message.set('Las contraseñas no coinciden.');
      return;
    }
    this.busy.set(true);
    try {
      await firstValueFrom(this.auth.changePassword(this.currentPassword, password));
      this.auth.clearSession();
      await this.router.navigateByUrl('/auth/signin');
    } catch (error) {
      this.message.set(httpErrorMessage(error, 'No se pudo cambiar la contraseña.'));
    } finally {
      this.busy.set(false);
    }
  }
}
