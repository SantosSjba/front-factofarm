import { Component } from '@angular/core';
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
  readonly theme$;

  constructor(private readonly themeService: ThemeService) {
    this.theme$ = this.themeService.theme$;
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}
