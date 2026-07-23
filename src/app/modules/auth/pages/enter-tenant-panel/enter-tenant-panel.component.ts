import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { NotifyService } from '../../../../core/services/notify.service';
import { httpErrorMessage } from '../../../../core/http/http-error-message';

@Component({
  selector: 'app-enter-tenant-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div class="max-w-md text-center">
        <p class="text-theme-sm text-gray-600 dark:text-gray-300">{{ message }}</p>
      </div>
    </div>
  `,
})
export class EnterTenantPanelComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotifyService);

  protected message = 'Abriendo panel del cliente…';

  ngOnInit(): void {
    const code = this.route.snapshot.queryParamMap.get('code')?.trim();
    if (!code) {
      this.message = 'Falta el código de acceso.';
      this.notify.error(this.message);
      void this.router.navigateByUrl('/auth/signin');
      return;
    }

    this.auth.clearSession();

    this.auth.exchangePanelHandoff(code).subscribe({
      next: () => {
        this.notify.success('Sesión de soporte iniciada');
        void this.router.navigateByUrl('/dashboard');
      },
      error: (err: unknown) => {
        this.message = httpErrorMessage(err, 'No se pudo abrir el panel del cliente');
        this.notify.error(this.message);
        void this.router.navigateByUrl('/auth/signin');
      },
    });
  }
}
