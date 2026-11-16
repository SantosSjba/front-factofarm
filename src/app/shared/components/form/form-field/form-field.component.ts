import { CommonModule } from '@angular/common';
import { AfterContentChecked, Component, ElementRef, Input, booleanAttribute, inject } from '@angular/core';
import { LabelComponent } from '../label/label.component';

/**
 * Agrupa label + control con espaciado estándar FactoFarm.
 * Sin `for`, enlaza el label al primer control proyectado (input, select, textarea o el botón de
 * un select propio): así el label se lee al enfocar el campo y un clic en él lo enfoca.
 */
@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule, LabelComponent, ],
  template: `
    <div class="flex flex-col" [class.gap-1.5]="!compact" [class.gap-1]="compact" [ngClass]="className">
      @if (label) {
        <app-label [for]="for" [required]="required" [helpText]="helpText" [compact]="compact" [className]="compact ? 'mb-0' : ''">{{ label }}</app-label>
      }
      <ng-content />
    </div>
  `,
})
export class FormFieldComponent implements AfterContentChecked {
  private readonly host = inject(ElementRef<HTMLElement>);
  private static nextId = 0;
  private readonly labelId = `ff-field-label-${++FormFieldComponent.nextId}`;

  @Input() label = '';
  @Input() for = '';
  @Input() className = '';
  /** Texto de ayuda en tooltip junto al label. */
  @Input() helpText = '';
  /** Marca el campo como obligatorio (asterisco en el label). */
  @Input({ transform: booleanAttribute }) required = false;
  /** Etiqueta de 12px y menos espacio hasta el campo (pon `compact` también en el campo). */
  @Input({ transform: booleanAttribute }) compact = false;

  /** Barato (un querySelector) y cubre controles que aparecen después con @if. */
  ngAfterContentChecked(): void {
    if (!this.label || this.for) return;
    const root = this.host.nativeElement as HTMLElement;
    const labelEl = root.querySelector<HTMLLabelElement>(':scope > div > app-label label');
    if (!labelEl) return;
    const control = root.querySelector<HTMLElement>(
      'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), select, textarea, [role="combobox"]',
    );
    if (!control) return;
    if (control.getAttribute('aria-label') || control.getAttribute('aria-labelledby')) return;
    const labelable = control.matches('input, select, textarea, button');
    if (labelable) {
      if ((control as HTMLInputElement).labels?.length) return;
      if (!control.id) return; // los campos compartidos generan su propio id
      labelEl.htmlFor = control.id;
    } else {
      labelEl.id ||= this.labelId;
      control.setAttribute('aria-labelledby', labelEl.id);
    }
  }
}
