import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthPageLayoutComponent } from '../../../../shared/layout/auth-page-layout/auth-page-layout.component';
import { LabelComponent } from '../../../../shared/components/form/label/label.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { AuthService } from '../../../../core/services/auth.service';
import { NotifyService } from '../../../../core/services/notify.service';

@Component({
  selector: 'app-reset-password',
  imports: [
    AuthPageLayoutComponent,
    LabelComponent,
    InputFieldComponent,
    ButtonComponent,
    RouterModule,
  ],
  templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotifyService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly password = signal('');
  protected readonly password2 = signal('');
  protected readonly isLoading = signal(false);
  protected readonly token = signal('');

  ngOnInit() {
    const t = this.route.snapshot.queryParamMap.get('token')?.trim() ?? '';
    this.token.set(t);
    if (!t) {
      this.notify.warning('Enlace inválido. Solicita uno nuevo.');
    }
  }

  protected submit() {
    const t = this.token().trim();
    const p1 = this.password();
    const p2 = this.password2();
    if (!t || this.isLoading()) return;

    if (p1.length < 8) {
      this.notify.warning('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (p1 !== p2) {
      this.notify.warning('Las contraseñas no coinciden.');
      return;
    }

    this.isLoading.set(true);
    this.auth.resetPassword(t, p1).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.notify.success('Contraseña actualizada. Ya puedes iniciar sesión.');
        void this.router.navigateByUrl('/auth/signin');
      },
      error: () => {
        this.isLoading.set(false);
        this.notify.error('Enlace inválido o expirado. Solicita uno nuevo.');
      },
    });
  }
}
