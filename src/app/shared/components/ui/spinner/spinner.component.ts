import { Component, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * Spinner reutilizable (Iconify mdi:loading + animate-spin).
 * Preferir [loading] en app-button para acciones; este componente para listas/overlays.
 */
@Component({
  selector: 'app-spinner',
  standalone: true,
  imports: [IconComponent],
  template: `
    <span
      class="inline-flex items-center justify-center"
      role="status"
      [attr.aria-label]="label()"
    >
      <app-icon name="mdi:loading" [iconClass]="iconClass" />
      <span class="sr-only">{{ label() }}</span>
    </span>
  `,
})
export class SpinnerComponent {
  /** xs=14px, sm=16px, md=20px, lg=28px, xl=36px */
  readonly size = input<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('sm');
  readonly className = input('');
  readonly label = input('Cargando');

  get iconClass(): string {
    const sizeMap: Record<string, string> = {
      xs: 'size-3.5',
      sm: 'size-4',
      md: 'size-5',
      lg: 'size-7',
      xl: 'size-9',
    };
    return `animate-spin ${sizeMap[this.size()] ?? 'size-4'} ${this.className()}`.trim();
  }
}
