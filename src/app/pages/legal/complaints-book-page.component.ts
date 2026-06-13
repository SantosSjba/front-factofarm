import { Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PublicLegalService } from '../../core/services/public-legal.service';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { FormFieldComponent } from '../../shared/components/form/form-field/form-field.component';
import { FormRowComponent } from '../../shared/components/form/form-row/form-row.component';
import { FormSelectComponent } from '../../shared/components/form/form-select/form-select.component';
import { FormStackComponent } from '../../shared/components/form/form-stack/form-stack.component';
import { InputFieldComponent } from '../../shared/components/form/input/input-field.component';
import { TextAreaComponent } from '../../shared/components/form/input/text-area.component';
import { IconComponent } from '../../shared/components/ui/icon/icon.component';
import { PublicLegalLayoutComponent } from '../../shared/layout/public-legal-layout/public-legal-layout.component';

@Component({
  selector: 'app-complaints-book-page',
  standalone: true,
  imports: [
    PublicLegalLayoutComponent,
    ButtonComponent,
    FormFieldComponent,
    FormRowComponent,
    FormSelectComponent,
    FormStackComponent,
    InputFieldComponent,
    TextAreaComponent,
    IconComponent,
  ],
  templateUrl: './complaints-book-page.component.html',
})
export class ComplaintsBookPageComponent {
  private readonly api = inject(PublicLegalService);

  protected readonly provider = environment.company;
  protected readonly responseDeadlineDays = 15;
  protected readonly legalFramework = 'Ley N° 29571 — Código de Protección y Defensa del Consumidor';

  protected readonly tipoOptions = [
    { value: 'RECLAMO', label: 'Reclamo (producto o servicio)' },
    { value: 'QUEJA', label: 'Queja (atención recibida)' },
  ];

  protected readonly tipo = signal<'RECLAMO' | 'QUEJA'>('RECLAMO');
  protected readonly nombresApellidos = signal('');
  protected readonly domicilio = signal('');
  protected readonly documentoIdentidad = signal('');
  protected readonly telefono = signal('');
  protected readonly email = signal('');
  protected readonly bienContratado = signal('');
  protected readonly montoReclamado = signal('');
  protected readonly detalle = signal('');
  protected readonly pedido = signal('');
  protected readonly submitting = signal(false);
  protected readonly formError = signal('');
  protected readonly numeroRegistro = signal('');

  protected onTipoChange(value: string): void {
    this.tipo.set(value === 'QUEJA' ? 'QUEJA' : 'RECLAMO');
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.formError.set('');

    const payload = {
      tipo: this.tipo(),
      nombresApellidos: this.nombresApellidos().trim(),
      domicilio: this.domicilio().trim(),
      documentoIdentidad: this.documentoIdentidad().trim(),
      telefono: this.telefono().trim(),
      email: this.email().trim() || undefined,
      bienContratado: this.bienContratado().trim(),
      montoReclamado: this.montoReclamado().trim() || undefined,
      detalle: this.detalle().trim(),
      pedido: this.pedido().trim(),
    };

    if (
      !payload.nombresApellidos ||
      !payload.domicilio ||
      !payload.documentoIdentidad ||
      !payload.telefono ||
      !payload.bienContratado ||
      !payload.detalle ||
      !payload.pedido
    ) {
      this.formError.set('Completa todos los campos obligatorios marcados.');
      return;
    }

    this.submitting.set(true);
    try {
      const res = await firstValueFrom(this.api.submitComplaint(payload));
      this.numeroRegistro.set(res.numeroRegistro);
    } catch {
      this.formError.set('No se pudo registrar su reclamo. Intente nuevamente en unos minutos.');
    } finally {
      this.submitting.set(false);
    }
  }
}
