import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DropdownComponent } from '../../ui/dropdown/dropdown.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DropdownItemTwoComponent } from '../../ui/dropdown/dropdown-item/dropdown-item.component-two';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-user-dropdown',
  templateUrl: './user-dropdown.component.html',
  imports: [CommonModule, RouterModule, DropdownComponent, DropdownItemTwoComponent],
})
export class UserDropdownComponent {
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  isOpen = false;

  protected readonly isSupport = computed(() => this.auth.isSupportSession());

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

  logout(event: Event) {
    event.preventDefault();
    this.auth.logout();
    void this.router.navigateByUrl('/auth/signin');
  }
}