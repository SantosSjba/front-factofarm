import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { httpErrorMessage } from '../../core/http/http-error-message';
import { AuthService } from '../../core/services/auth.service';
import { isValidEmail } from '../../core/utils/form-validators';
import { PublicContactService } from '../../core/services/public-contact.service';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { FormFieldComponent } from '../../shared/components/form/form-field/form-field.component';
import { FormRowComponent } from '../../shared/components/form/form-row/form-row.component';
import { FormStackComponent } from '../../shared/components/form/form-stack/form-stack.component';
import { InputFieldComponent } from '../../shared/components/form/input/input-field.component';
import { TextAreaComponent } from '../../shared/components/form/input/text-area.component';
import { IconComponent } from '../../shared/components/ui/icon/icon.component';
import { ThemeToggleButtonComponent } from '../../shared/components/common/theme-toggle/theme-toggle-button.component';
import {
  LANDING_BUSINESS_HOURS,
  LANDING_FAQS,
  LANDING_NAV,
  LANDING_PILLARS,
  LANDING_PLANS,
  LANDING_PROOF,
  LANDING_STEPS,
  type LandingPlan,
} from './landing.content';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    RouterLink,
    ButtonComponent,
    FormFieldComponent,
    FormRowComponent,
    FormStackComponent,
    InputFieldComponent,
    TextAreaComponent,
    IconComponent,
    ThemeToggleButtonComponent,
  ],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
})
export class LandingComponent {
  private readonly contactApi = inject(PublicContactService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /**
   * La portada se prerenderiza sin sesión. Lo que depende de la sesión espera a que la página ya
   * esté hidratada en el navegador: así el primer render coincide con el HTML y no hay desajustes.
   */
  private readonly hydrated = signal(false);
  protected readonly isAuthenticated = computed(() => this.hydrated() && this.auth.isAuthenticated());
  protected readonly contactWhatsApp = environment.contactWhatsApp;
  protected readonly contactEmail = environment.contactEmail;
  protected readonly company = environment.company;
  protected readonly currentYear = new Date().getFullYear();

  protected readonly nav = LANDING_NAV;
  protected readonly proof = LANDING_PROOF;
  protected readonly pillars = LANDING_PILLARS;
  protected readonly steps = LANDING_STEPS;
  protected readonly plans = LANDING_PLANS;
  protected readonly faqs = LANDING_FAQS;
  protected readonly businessHours = LANDING_BUSINESS_HOURS;

  protected readonly mobileNavOpen = signal(false);

  protected readonly nombre = signal('');
  protected readonly farmacia = signal('');
  protected readonly telefono = signal('');
  protected readonly email = signal('');
  protected readonly mensaje = signal('');
  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal('');

  constructor() {
    afterNextRender(() => this.hydrated.set(true));
  }

  protected readonly whatsAppHref = computed(() => {
    const phone = this.contactWhatsApp.replace(/\D/g, '');
    if (!phone) return '';
    const text = encodeURIComponent(
      `Hola, me interesa habilitar FactoFarm para mi farmacia/botica.\n\nNombre: ${this.nombre().trim() || '—'}\nEstablecimiento: ${this.farmacia().trim() || '—'}\nTeléfono: ${this.telefono().trim() || '—'}\nCorreo: ${this.email().trim() || '—'}`,
    );
    return `https://wa.me/${phone}?text=${text}`;
  });

  /**
   * Los enlaces de sección son `<a href="#id">` (funcionan sin JavaScript y en la página
   * prerenderizada). Con JavaScript se desplaza sin pasar por el router, que de otro modo trataría
   * el `#id` como una navegación.
   */
  protected goToSection(event: Event, id: string): void {
    event.preventDefault();
    this.mobileNavOpen.set(false);
    const target = document.getElementById(id);
    if (!target) return;
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(history.state, '', `#${id}`);
  }

  protected goToDashboard(): void {
    void this.router.navigateByUrl(this.auth.defaultHomePath());
  }

  protected toggleMobileNav(): void {
    this.mobileNavOpen.update((open) => !open);
  }

  protected requestPlan(event: Event, plan: LandingPlan): void {
    this.mensaje.set(`Me interesa el plan ${plan.name}. Quisiera recibir una cotización detallada.`);
    this.goToSection(event, 'contacto');
  }

  protected async onSubmitContact(event: Event): Promise<void> {
    event.preventDefault();
    this.formError.set('');

    const payload = {
      nombre: this.nombre().trim(),
      farmacia: this.farmacia().trim(),
      telefono: this.telefono().trim(),
      email: this.email().trim(),
      mensaje: this.mensaje().trim() || undefined,
    };

    if (!payload.nombre || !payload.farmacia || !payload.telefono || !payload.email) {
      this.formError.set('Completa nombre, farmacia, teléfono y correo.');
      return;
    }
    if (!isValidEmail(payload.email)) {
      this.formError.set('El correo electrónico no es válido.');
      return;
    }

    this.submitting.set(true);
    try {
      await firstValueFrom(this.contactApi.submit(payload));
      this.submitted.set(true);
    } catch (err) {
      this.formError.set(
        httpErrorMessage(err, 'No pudimos enviar tu solicitud. Intenta de nuevo o contáctanos por WhatsApp.'),
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
