import { Component, OnInit, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { SidebarService } from '../../services/sidebar.service';
import { CommonModule } from '@angular/common';
import { AppSidebarComponent } from '../app-sidebar/app-sidebar.component';
import { BackdropComponent } from '../backdrop/backdrop.component';
import { RouterModule } from '@angular/router';
import { AppHeaderComponent } from '../app-header/app-header.component';
import { AuthService } from '../../../core/services/auth.service';
import { NotifyService } from '../../../core/services/notify.service';
import { TourService } from '../../../core/tour/tour.service';

@Component({
  selector: 'app-layout',
  imports: [CommonModule, RouterModule, AppHeaderComponent, AppSidebarComponent, BackdropComponent],
  templateUrl: './app-layout.component.html',
})
export class AppLayoutComponent implements OnInit {
  sidebarService = inject(SidebarService);

  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotifyService);
  private readonly router = inject(Router);
  private readonly tour = inject(TourService);

  readonly isExpanded$;
  readonly isHovered$;
  readonly isMobileOpen$;

  constructor() {
    this.isExpanded$ = this.sidebarService.isExpanded$;
    this.isHovered$ = this.sidebarService.isHovered$;
    this.isMobileOpen$ = this.sidebarService.isMobileOpen$;
  }

  ngOnInit(): void {
    // Sincroniza logoUrl y permisos del cliente (sesión en storage puede estar desactualizada).
    if (this.auth.isAuthenticated()) {
      this.auth.loadMe().subscribe({
        // Tutorial de bienvenida la primera vez (con permisos ya actualizados).
        next: () => this.tour.maybeAutoStart(),
        error: (err: unknown) => {
          const status = err instanceof HttpErrorResponse ? err.status : 0;
          if (status === 401) {
            this.notify.warning('Sesión expirada. Vuelve a iniciar sesión.');
            this.auth.logout();
            void this.router.navigateByUrl('/auth/signin');
            return;
          }
          this.notify.warning(
            'No se pudo actualizar tu sesión. Algunas opciones pueden estar desactualizadas.',
          );
        },
      });
    }
  }

  get contentClasses() {
    return [
      'flex-1',
      'transition-all',
      'duration-300',
      'ease-in-out',
      this.isExpanded$ || this.isHovered$ ? 'xl:ml-[290px]' : 'xl:ml-[90px]',
      this.isMobileOpen$ ? 'ml-0' : '',
    ];
  }
}
