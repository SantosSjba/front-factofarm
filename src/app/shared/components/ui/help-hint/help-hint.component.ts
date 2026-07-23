import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { TooltipDirective } from '../../../directives/tooltip.directive';

/** Icono de interrogación con tooltip de ayuda contextual. */
@Component({
  selector: 'app-help-hint',
  standalone: true,
  imports: [CommonModule, IconComponent, TooltipDirective],
  templateUrl: './help-hint.component.html',
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
      vertical-align: middle;
      line-height: 1;
    }
  `,
})
export class HelpHintComponent {
  @Input({ required: true }) text!: string;
  @Input() iconName = 'mdi:help-circle-outline';
  @Input() iconSize: string | number = 18;
}
