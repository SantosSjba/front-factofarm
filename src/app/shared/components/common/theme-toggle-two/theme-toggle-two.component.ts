import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../services/theme.service';
import { IconComponent } from '../../ui/icon/icon.component';

@Component({
  selector: 'app-theme-toggle-two',
  imports: [CommonModule, IconComponent],
  templateUrl: './theme-toggle-two.component.html',
  styles: ``,
})
export class ThemeToggleTwoComponent {
  private readonly themeService = inject(ThemeService);

  readonly theme$;

  constructor() {
    this.theme$ = this.themeService.theme$;
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}
