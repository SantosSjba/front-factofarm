import { Component, inject } from '@angular/core';
import { ThemeService } from '../../../services/theme.service';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../ui/icon/icon.component';

@Component({
  selector: 'app-theme-toggle-button',
  standalone: true,
  templateUrl: './theme-toggle-button.component.html',
  imports: [CommonModule, IconComponent],
})
export class ThemeToggleButtonComponent {
  private themeService = inject(ThemeService);

  theme$;

  constructor() {
    this.theme$ = this.themeService.theme$;
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}
