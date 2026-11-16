import { Component, inject } from '@angular/core';
import { ThemeService } from '../../../services/theme.service';
import { IconComponent } from '../../ui/icon/icon.component';

@Component({
  selector: 'app-theme-toggle-two',
  imports: [IconComponent],
  templateUrl: './theme-toggle-two.component.html',
  styles: ``,
})
export class ThemeToggleTwoComponent {
  private readonly themeService = inject(ThemeService);
  protected readonly theme = this.themeService.theme;

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}
