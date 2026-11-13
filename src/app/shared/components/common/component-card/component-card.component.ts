
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, booleanAttribute } from '@angular/core';
import { IconComponent } from '../../ui/icon/icon.component';
import { HelpHintComponent } from '../../ui/help-hint/help-hint.component';
import type { SkeletonVariant } from '../../ui/skeleton/skeleton.component';
import { PageStateComponent } from '../page-state/page-state.component';

@Component({
  selector: 'app-component-card',
  imports: [CommonModule, PageStateComponent, HelpHintComponent, IconComponent],
  templateUrl: './component-card.component.html',
  host: {
    class: 'mb-5 block',
  },
  styles: ``,
})
export class ComponentCardComponent {
  /** Vacío = sin encabezado. */
  @Input() title = '';
  @Input() desc: string = '';
  /** Texto de ayuda mostrado en tooltip junto al título. */
  @Input() helpText = '';
  @Input() className: string = '';
  /** Ícono (iconify) junto al título, en un recuadro de color. */
  @Input() icon = '';
  /** Versión compacta: encabezado y cuerpo con menos relleno, título 14px. */
  @Input({ transform: booleanAttribute }) compact = false;
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
  @Input() skeleton: SkeletonVariant | 'spinner' = 'table';
  @Input() skeletonCount = 6;
  @Output() retry = new EventEmitter<void>();
}
