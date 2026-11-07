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
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }
  `,
})
export class IconComponent {
  @Input({ required: true }) name!: string;
  @Input() width: string | number = '1em';
  @Input() height: string | number = '1em';
  @Input() iconClass = '';

  /** Con `size-*` o `w-*` en `iconClass` el SVG llena esa caja; a 1em quedaría más chico y corrido. */
  private get fillsBox(): boolean {
    return /(^|\s)(size|w)-/.test(this.iconClass);
  }

  protected get svgWidth(): string | number {
    return this.width === '1em' && this.fillsBox ? '100%' : this.width;
  }

  protected get svgHeight(): string | number {
    return this.height === '1em' && this.fillsBox ? '100%' : this.height;
  }
}
