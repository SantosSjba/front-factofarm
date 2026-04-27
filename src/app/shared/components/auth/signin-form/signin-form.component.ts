import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
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
  styles: ``,
})
export class SigninFormComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotifyService);

  showPassword = false;
  isChecked = false;
  isLoading = false;

  email = '';
  password = '';

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onSignIn() {
    if (this.isLoading) {
      return;
    }
    if (!this.email?.trim() || !this.password?.trim()) {
      this.notify.warning('Ingresa correo y contraseña.');
      return;
    }
    this.isLoading = true;
    this.auth.login(this.email.trim(), this.password).subscribe({
      next: () => {
        this.isLoading = false;
        this.notify.success('Sesión iniciada');
        void this.router.navigateByUrl('/');
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        this.notify.error(this.apiMessage(err));
      },
    });
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
    return 'No se pudo iniciar sesión.';
  }
}
