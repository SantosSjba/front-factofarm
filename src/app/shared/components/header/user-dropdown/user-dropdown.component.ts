import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DropdownComponent } from '../../ui/dropdown/dropdown.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DropdownItemTwoComponent } from '../../ui/dropdown/dropdown-item/dropdown-item.component-two';
import { AuthService } from '../../../../core/services/auth.service';
import { TourService } from '../../../../core/tour/tour.service';
import type { TourId } from '../../../../core/tour/tour.definitions';
import { IconComponent } from '../../ui/icon/icon.component';

@Component({
  selector: 'app-user-dropdown',
  templateUrl: './user-dropdown.component.html',
  imports: [CommonModule, RouterModule, DropdownComponent, DropdownItemTwoComponent, IconComponent],
})
export class UserDropdownComponent {
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  private readonly tour = inject(TourService);

  isOpen = false;

  protected readonly isSupport = computed(() => this.auth.isSupportSession());

  /** Recorridos guiados que aplican al usuario (bienvenida, módulos o consola). */
  protected readonly tours = computed(() => (this.auth.user() ? this.tour.available() : []));

  /** Nombre limpio (sin sufijo “(soporte)”) para no saturar el header. */
  protected readonly displayName = computed(() => {
    const raw = this.auth.user()?.nombre ?? 'Usuario';
    return raw.replace(/\s*\(soporte\)\s*$/i, '').trim() || 'Usuario';
  });

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  closeDropdown() {
    this.isOpen = false;
  }

  startTour(id: TourId) {
    this.closeDropdown();
    // Deja que el dropdown se cierre antes de medir los elementos a resaltar.
    setTimeout(() => this.tour.start(id), 150);
  }

  logout(event: Event) {
    event.preventDefault();
    this.auth.logout();
    void this.router.navigateByUrl('/auth/signin');
  }
}