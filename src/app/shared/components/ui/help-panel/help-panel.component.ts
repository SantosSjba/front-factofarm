import { Component, Input, OnInit, signal } from '@angular/core';
import { AlertComponent } from '../alert/alert.component';
import { ButtonComponent } from '../button/button.component';

/**
 * Explicación de una pantalla que se abre y se oculta para no ocupar espacio.
 * Empieza cerrada y recuerda la elección de cada usuario en este navegador.
 */
@Component({
  selector: 'app-help-panel',
  standalone: true,
  imports: [AlertComponent, ButtonComponent],
  host: { class: 'mb-5 block' },
  template: `
    @if (open()) {
      <div class="relative">
        <app-alert variant="info" [title]="title">
          <ng-content />
        </app-alert>
        <app-button
          class="absolute end-2 top-2"
          size="sm"
          variant="ghost"
          [iconOnly]="true"
          startIconName="mdi:close"
          tooltip="Ocultar ayuda"
          [ariaExpanded]="true"
          (btnClick)="toggle()"
        />
      </div>
    } @else {
      <app-button variant="link" startIconName="mdi:help-circle-outline" [ariaExpanded]="false" (btnClick)="toggle()">
        {{ title }}
      </app-button>
    }
  `,
})
export class HelpPanelComponent implements OnInit {
  @Input({ required: true }) title!: string;
  /** Identifica la pantalla para recordar si la ayuda quedó abierta. */
  @Input({ required: true }) storageKey!: string;

  protected readonly open = signal(false);

  private get key(): string {
    return `ff.help-panel.${this.storageKey}`;
  }

  ngOnInit(): void {
    try {
      this.open.set(localStorage.getItem(this.key) === 'open');
    } catch {
      // Sin acceso al almacenamiento: queda cerrada.
    }
  }

  protected toggle(): void {
    this.open.update((value) => !value);
    try {
      localStorage.setItem(this.key, this.open() ? 'open' : 'closed');
    } catch {
      // La elección solo dura hasta recargar.
    }
  }
}
