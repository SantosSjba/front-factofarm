import { passwordPolicyError } from '../../../../core/utils/password-policy';
import { Component, ElementRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { ImageSquarePickerComponent } from '../../../../shared/components/form/image-square-picker/image-square-picker.component';
import { avatarColorClass, nameInitials } from '../../../../shared/components/ui/avatar/avatar-text.component';
import { TabStripComponent, type TabStripItem } from '../../../../shared/components/ui/tab-strip/tab-strip.component';
import { AlertComponent } from '../../../../shared/components/ui/alert/alert.component';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

@Component({
  standalone: true,
  imports: [
    FormsModule,
    InputFieldComponent,
    ButtonComponent,
    BreadcrumbInlineComponent,
    PageToolbarComponent,
    ComponentCardComponent,
    ImageSquarePickerComponent,
    TabStripComponent,
    AlertComponent,
  ],
  template: `
    <app-breadcrumb-inline [segments]="[{ label: 'Cuenta' }, { label: tab() === 'seguridad' ? 'Seguridad' : 'Mi perfil' }]" />
    <app-page-toolbar [excel]="false">
      <h1 data-toolbar-title class="text-lg font-semibold text-gray-800 dark:text-white/90">Mi cuenta</h1>
    </app-page-toolbar>

    <app-tab-strip class="mb-4 block" [tabs]="tabs" [activeId]="tab()" (tabChange)="setTab($event)" />

    <div class="max-w-3xl">
      @if (tab() === 'perfil') {
        <app-component-card compact icon="mdi:account-circle-outline" title="Foto de perfil" desc="Se muestra en la cabecera y en las listas de usuarios. Sin foto, verás tus iniciales.">
          <app-image-square-picker
            [previewUrl]="auth.user()?.fotoUrl ?? null"
            [placeholder]="initials()"
            [emptyClass]="auth.user()?.fotoUrl ? 'bg-gray-100 dark:bg-white/10' : avatarColor() + ' text-xl'"
            rounded="rounded-full"
            sizeClass="h-16 w-16"
            accept="image/png,image/jpeg,image/webp,image/gif"
            ariaLabel="Cambiar foto de perfil"
            (fileSelected)="onPhoto($event)"
          >
            <p class="text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ auth.user()?.nombre }}</p>
            <p class="mt-0.5 text-theme-xs">PNG, JPG o WEBP de hasta 5 MB. Toca el círculo para elegir una imagen.</p>
            @if (!auth.user()?.supportSession) {
              <div class="mt-2 flex flex-wrap gap-2">
                <app-button size="sm" variant="outline" startIconName="mdi:camera-outline" [loading]="photoBusy()" [disabled]="photoBusy()" (btnClick)="pickPhoto()">
                  {{ auth.user()?.fotoUrl ? 'Cambiar foto' : 'Subir foto' }}
                </app-button>
                @if (auth.user()?.fotoUrl) {
                  <app-button size="sm" variant="link-danger" [disabled]="photoBusy()" (btnClick)="removePhoto()">Quitar foto</app-button>
                }
              </div>
            }
          </app-image-square-picker>
        </app-component-card>

        <app-component-card compact icon="mdi:card-account-details-outline" title="Datos personales" [loading]="loading()" [error]="loadError()" (retry)="reload()">
          <form (ngSubmit)="saveProfile()">
            <div class="grid gap-3 sm:grid-cols-2">
              <app-input-field compact id="profile-nombre" name="nombre" label="Nombre" [isRequired]="true" [maxLength]="200" [value]="nombre" (valueChange)="nombre = '' + $event" />
              <app-input-field compact id="profile-email" name="email" type="email" label="Correo" [isRequired]="true" helpText="Con este correo inicias sesión y recuperas tu contraseña." [maxLength]="254" [value]="email" (valueChange)="email = '' + $event" />
            </div>
            <p class="mt-3 text-theme-sm text-gray-600 dark:text-gray-400">Rol: <span class="font-medium text-gray-800 dark:text-white/90">{{ roleLabel() }}</span></p>
            @if (auth.user()?.supportSession) {
              <p class="mt-2 text-theme-sm text-warning-700 dark:text-warning-400">La sesión de soporte no permite cambiar datos del operador.</p>
            }
            <div class="mt-4 flex justify-end border-t border-gray-100 pt-3 dark:border-gray-800">
              <app-button size="sm" startIconName="mdi:content-save-outline" type="submit" [disabled]="busy() || !!auth.user()?.supportSession" [loading]="busy()">Guardar perfil</app-button>
            </div>
          </form>
        </app-component-card>
      } @else {
        @if (auth.user()?.supportSession) {
          <app-alert variant="info" title="No disponible en soporte" message="La sesión de soporte no permite cambiar la contraseña del operador." />
        } @else {
          <app-component-card compact icon="mdi:lock-reset" title="Cambiar contraseña" desc="Al cambiarla se cerrará tu sesión y entrarás con la nueva.">
            <form (ngSubmit)="changePassword()">
              <div class="grid gap-3 sm:grid-cols-2">
                <app-input-field compact class="sm:col-span-2 sm:max-w-sm" id="profile-current-password" name="currentPassword" type="password" label="Contraseña actual" [isRequired]="true" autocomplete="current-password" [value]="currentPassword" (valueChange)="currentPassword = '' + $event" />
                <app-input-field compact id="profile-new-password" name="newPassword" type="password" label="Nueva contraseña" [isRequired]="true" [maxLength]="128" autocomplete="new-password" helpText="Incluye mayúscula, minúscula, número y un carácter especial." [value]="newPassword" (valueChange)="newPassword = '' + $event" />
                <app-input-field compact id="profile-confirm-password" name="confirmPassword" type="password" label="Confirmar contraseña" [isRequired]="true" [maxLength]="128" autocomplete="new-password" [value]="confirmPassword" (valueChange)="confirmPassword = '' + $event" />
              </div>
              <div class="mt-4 flex justify-end border-t border-gray-100 pt-3 dark:border-gray-800">
                <app-button size="sm" startIconName="mdi:lock-reset" type="submit" [disabled]="loading() || busy()" [loading]="busy()">Cambiar contraseña</app-button>
              </div>
            </form>
          </app-component-card>
        }
      }
    </div>`,
})
export class ProfileComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Pestaña según «?seccion=seguridad» (lo usa «Seguridad y contraseña» del menú de usuario). */
  protected readonly tabs: TabStripItem[] = [
    { id: 'perfil', label: 'Perfil' },
    { id: 'seguridad', label: 'Seguridad' },
  ];
  protected readonly tab = signal<'perfil' | 'seguridad'>('perfil');

  protected setTab(id: string) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { seccion: id === 'seguridad' ? 'seguridad' : null },
      replaceUrl: true,
    });
  }
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
  protected readonly photoBusy = signal(false);
  protected readonly initials = computed(() => nameInitials(this.auth.user()?.nombre));
  protected readonly avatarColor = computed(() => avatarColorClass(this.auth.user()?.nombre));
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  /** Abre el selector de archivo del recuadro de la foto. */
  protected pickPhoto() {
    this.host.nativeElement.querySelector<HTMLInputElement>('app-image-square-picker input[type=file]')?.click();
  }

  protected async onPhoto(file: File) {
    if (this.photoBusy() || this.auth.user()?.supportSession) return;
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) {
      this.feedback('La foto debe ser una imagen PNG, JPG, WEBP o GIF.', 'warning');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      this.feedback('La foto supera los 5 MB. Elige una imagen más liviana.', 'warning');
      return;
    }
    this.photoBusy.set(true);
    try {
      await firstValueFrom(this.auth.uploadProfilePhoto(file));
      this.feedback('Foto de perfil actualizada.', 'success');
    } catch (error) {
      this.feedback(httpErrorMessage(error, 'No se pudo subir la foto.'), 'error');
    } finally {
      this.photoBusy.set(false);
    }
  }

  protected async removePhoto() {
    if (this.photoBusy()) return;
    this.photoBusy.set(true);
    try {
      await firstValueFrom(this.auth.removeProfilePhoto());
      this.feedback('Foto quitada. Ahora se muestran tus iniciales.', 'success');
    } catch (error) {
      this.feedback(httpErrorMessage(error, 'No se pudo quitar la foto.'), 'error');
    } finally {
      this.photoBusy.set(false);
    }
  }

  protected nombre = '';
  protected email = '';
  protected currentPassword = '';
  protected newPassword = '';
  protected confirmPassword = '';
  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.tab.set(params.get('seccion') === 'seguridad' ? 'seguridad' : 'perfil');
    });
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
