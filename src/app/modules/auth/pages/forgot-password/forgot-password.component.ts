import { Component, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthPageLayoutComponent } from '../../../../shared/layout/auth-page-layout/auth-page-layout.component';
import { LabelComponent } from '../../../../shared/components/form/label/label.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { AuthService } from '../../../../core/services/auth.service';
import { httpErrorMessage } from '../../../../core/http/http-error-message';
import { NotifyService } from '../../../../core/services/notify.service';

@Component({
  selector: 'app-forgot-password',
  imports: [
    AuthPageLayoutComponent,
    LabelComponent,
    InputFieldComponent,
    ButtonComponent,
    RouterModule,
  ],
  templateUrl: './forgot-password.component.html',
})
export class ForgotPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotifyService);
  private readonly router = inject(Router);

  protected readonly email = signal('');
  protected readonly isLoading = signal(false);
  protected readonly sent = signal(false);
  protected readonly submitError = signal<string | null>(null);

  protected submit() {
    const value = this.email().trim();
    if (!value || this.isLoading()) return;

    this.submitError.set(null);
    this.isLoading.set(true);
    this.auth.forgotPassword(value).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.sent.set(true);
        this.notify.success('Si el correo existe, recibirás instrucciones para restablecer tu contraseña.');
      },
      error: (err) => {
        this.isLoading.set(false);
        const message = httpErrorMessage(err, 'No se pudo procesar la solicitud. Intente más tarde.');
        this.submitError.set(message);
        this.notify.error(message);
      },
    });
  }

  protected backToLogin() {
    void this.router.navigateByUrl('/auth/signin');
  }
}
