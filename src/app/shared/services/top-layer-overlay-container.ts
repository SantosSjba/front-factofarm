import { OverlayContainer } from '@angular/cdk/overlay';
import { Injectable, inject } from '@angular/core';
import { TopLayerService } from './top-layer.service';

/**
 * Contenedor de overlays del CDK (listas de `app-select`, popovers de spartan…) que sigue al
 * modal abierto: así sus paneles quedan dentro del `<dialog>` y no inertes detrás de él.
 */
@Injectable({ providedIn: 'root' })
export class TopLayerOverlayContainer extends OverlayContainer {
  private readonly topLayer = inject(TopLayerService);

  protected override _createContainer(): void {
    super._createContainer();
    if (this._containerElement) this.topLayer.register(this._containerElement);
  }
}
