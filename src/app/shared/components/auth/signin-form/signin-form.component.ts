import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewInit, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { NotifyService } from '../../../../core/services/notify.service';
import { ButtonComponent } from '../../ui/button/button.component';
import { CheckboxComponent } from '../../form/input/checkbox.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { IconComponent } from '../../ui/icon/icon.component';
import { LabelComponent } from '../../form/label/label.component';

@Component({
  selector: 'app-signin-form',
  imports: [
    LabelComponent,
    CheckboxComponent,
    ButtonComponent,
    InputFieldComponent,
    IconComponent,
    RouterModule,
    FormsModule,
  ],
  templateUrl: './signin-form.component.html',
})
export class SigninFormComponent implements AfterViewInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotifyService);

  showPassword = false;
  isChecked = false;
  isLoading = false;
  loginError: string | null = null;
  fieldErrors: { email?: string; password?: string } = {};

  email = '';
  password = '';

  get canSubmit(): boolean {
    return this.email.trim().length > 0 && this.password.trim().length > 0;
  }

  ngAfterViewInit(): void {
    // Delay so route/layout paint finishes before focusing (guest → signin remount).
    const focusEmail = () => document.getElementById('signin-email')?.focus();
    requestAnimationFrame(() => setTimeout(focusEmail, 100));
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onEmailChange(value: string | number) {
    this.email = String(value ?? '');
    this.clearErrorsOnEdit();
  }

  onPasswordChange(value: string | number) {
    this.password = String(value ?? '');
    this.clearErrorsOnEdit();
  }

  onSignIn() {
    if (this.isLoading) return;

    this.fieldErrors = {};
    this.loginError = null;

    const email = this.email.trim();
    const password = this.password.trim();

    if (!email) {
      this.fieldErrors.email = 'Ingresa tu correo electrónico.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.fieldErrors.email = 'El correo no tiene un formato válido.';
    }
    if (!password) {
      this.fieldErrors.password = 'Ingresa tu contraseña.';
    }

    if (this.fieldErrors.email || this.fieldErrors.password) {
      this.notify.warning('Revisa los campos del formulario.');
      queueMicrotask(() => {
        const id = this.fieldErrors.email ? 'signin-email' : 'signin-password';
        document.getElementById(id)?.focus();
      });
      return;
    }

    this.isLoading = true;
    this.auth.login(email, password, this.isChecked).subscribe({
      next: () => {
        this.isLoading = false;
        this.loginError = null;
        this.notify.success('Sesión iniciada');
        void this.router.navigateByUrl(this.auth.defaultHomePath());
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        this.loginError = this.apiMessage(err);
        this.notify.error(this.loginError);
        queueMicrotask(() => document.getElementById('signin-password')?.focus());
      },
    });
  }

  clearErrorsOnEdit() {
    if (this.loginError) this.loginError = null;
    if (this.fieldErrors.email || this.fieldErrors.password) {
      this.fieldErrors = {};
    }
  }

  private apiMessage(err: HttpErrorResponse): string {
    const body = err.error as { message?: string | string[] } | null;
    if (body && typeof body.message === 'string') {
      return body.message;
    }
    if (body && Array.isArray(body.message)) {
      return body.message.join(' ');
    }
    if (err.status === 0) {
      return 'No hay conexión con el servidor. ¿Está la API en marcha?';
    }
    if (err.status === 401 || err.status === 403) {
      return 'Correo o contraseña incorrectos.';
    }
    return 'No se pudo iniciar sesión. Inténtalo de nuevo.';
  }
}
