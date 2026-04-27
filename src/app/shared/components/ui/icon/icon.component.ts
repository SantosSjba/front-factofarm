import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, Component, Input } from '@angular/core';

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './icon.component.html',
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      vertical-align: middle;
      line-height: 1;
      flex-shrink: 0;
    }

    iconify-icon {
      display: block;
      line-height: 1;
      vertical-align: middle;
    }
  `,
})
export class IconComponent {
  @Input({ required: true }) name!: string;
  @Input() width: string | number = '1em';
  @Input() height: string | number = '1em';
  @Input() iconClass = '';
}
