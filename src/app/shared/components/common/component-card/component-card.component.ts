
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PageStateComponent } from '../page-state/page-state.component';

@Component({
  selector: 'app-component-card',
  imports: [CommonModule, PageStateComponent],
  templateUrl: './component-card.component.html',
  styles: ``,
})
export class ComponentCardComponent {
  @Input() title!: string;
  @Input() desc: string = '';
  @Input() className: string = '';
  /** Clases extra en el cuerdo bajo el título (p. ej. `p-0` para tablas a ancho completo). */
  @Input() bodyClass = '';

  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() empty = false;
  @Input() loadingLabel = 'Cargando…';
  @Input() errorTitle = 'No se pudo cargar la información';
  @Input() emptyTitle = 'Sin resultados';
  @Input() emptyHint = '';
  @Input() showRetry = true;
  @Output() retry = new EventEmitter<void>();
}
