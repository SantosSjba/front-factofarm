import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { PublicContactService } from '../../core/services/public-contact.service';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { FormFieldComponent } from '../../shared/components/form/form-field/form-field.component';
import { FormRowComponent } from '../../shared/components/form/form-row/form-row.component';
import { FormStackComponent } from '../../shared/components/form/form-stack/form-stack.component';
import { InputFieldComponent } from '../../shared/components/form/input/input-field.component';
import { TextAreaComponent } from '../../shared/components/form/input/text-area.component';
import { GridShapeComponent } from '../../shared/components/common/grid-shape/grid-shape.component';
import { IconComponent } from '../../shared/components/ui/icon/icon.component';
import { ThemeToggleButtonComponent } from '../../shared/components/common/theme-toggle/theme-toggle-button.component';

interface FeatureCard {
  icon: string;
  title: string;
  description: string;
}

interface StepCard {
  number: string;
  title: string;
  description: string;
}

interface StatItem {
  value: string;
  label: string;
}

interface BenefitItem {
  icon: string;
  title: string;
  description: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

interface PricingPlan {
  id: string;
  name: string;
  subtitle: string;
  priceLabel: string;
  priceNote: string;
  highlighted?: boolean;
  features: string[];
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ButtonComponent,
    FormFieldComponent,
    FormRowComponent,
    FormStackComponent,
    InputFieldComponent,
    TextAreaComponent,
    GridShapeComponent,
    IconComponent,
    ThemeToggleButtonComponent,
  ],
  templateUrl: './landing.component.html',
})
export class LandingComponent {
  private readonly contactApi = inject(PublicContactService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly isAuthenticated = this.auth.isAuthenticated.bind(this.auth);
  protected readonly contactWhatsApp = environment.contactWhatsApp;
  protected readonly contactEmail = environment.contactEmail;
  protected readonly siteUrl = environment.siteUrl;
  protected readonly company = environment.company;
  protected readonly businessHours = [
    'Lun–Vie: 9:00 a. m. – 6:00 p. m.',
    'Sáb: 9:00 a. m. – 2:00 p. m.',
  ];
  protected readonly supportNote =
    'Te acompañamos en consultas técnicas y avances de proyecto.';
  protected readonly currentYear = new Date().getFullYear();

  protected readonly mobileNavOpen = signal(false);
  protected readonly openFaqs = signal<Set<number>>(new Set([0]));

  protected readonly nombre = signal('');
  protected readonly farmacia = signal('');
  protected readonly telefono = signal('');
  protected readonly email = signal('');
  protected readonly mensaje = signal('');
  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal('');

  protected readonly navItems = [
    { id: 'beneficios', label: 'Beneficios' },
    { id: 'modulos', label: 'Módulos' },
    { id: 'planes', label: 'Planes' },
    { id: 'como-funciona', label: 'Cómo funciona' },
    { id: 'faq', label: 'Preguntas' },
    { id: 'legal', label: 'Legal' },
    { id: 'contacto', label: 'Contacto' },
  ];

  protected readonly whatsAppHref = computed(() => {
    const phone = this.contactWhatsApp.replace(/\D/g, '');
    if (!phone) return '';
    const text = encodeURIComponent(
      `Hola, me interesa habilitar FactoFarm para mi farmacia/botica.\n\nNombre: ${this.nombre().trim() || '—'}\nEstablecimiento: ${this.farmacia().trim() || '—'}\nTeléfono: ${this.telefono().trim() || '—'}\nCorreo: ${this.email().trim() || '—'}`,
    );
    return `https://wa.me/${phone}?text=${text}`;
  });

  protected readonly stats: StatItem[] = [
    { value: '15+', label: 'Módulos integrados' },
    { value: 'SUNAT', label: 'Facturación electrónica' },
    { value: 'Multi', label: 'Almacenes y sucursales' },
    { value: '24/7', label: 'Acceso en la nube' },
  ];

  protected readonly benefits: BenefitItem[] = [
    {
      icon: 'mdi:flash',
      title: 'Operación ágil en mostrador',
      description: 'POS rápido con búsqueda por código de barras, sustitutos genéricos y cobro con varios medios de pago.',
    },
    {
      icon: 'mdi:shield-check-outline',
      title: 'Control y trazabilidad',
      description: 'Lotes, vencimientos, kardex y alertas para reducir mermas y cumplir auditorías.',
    },
    {
      icon: 'mdi:account-group-outline',
      title: 'Equipos con permisos',
      description: 'Roles por usuario: cajero, bodeguero, administrador. Cada persona ve solo lo que necesita.',
    },
    {
      icon: 'mdi:cloud-outline',
      title: 'Sin instalaciones complejas',
      description: 'Accede desde el navegador. Actualizaciones centralizadas y respaldo en la nube.',
    },
  ];

  protected readonly features: FeatureCard[] = [
    {
      icon: 'mdi:point-of-sale',
      title: 'Punto de venta',
      description: 'Cobra rápido con boletas y facturas, medios de pago mixtos, promociones y control de caja chica.',
    },
    {
      icon: 'mdi:package-variant-closed',
      title: 'Inventario y lotes',
      description: 'Stock por almacén, asignación FEFO, traslados, conteos físicos y reporte kardex.',
    },
    {
      icon: 'mdi:file-document-check-outline',
      title: 'Facturación SUNAT',
      description: 'Boletas, facturas, notas de crédito y guías integradas con proveedores OSE/PSE.',
    },
    {
      icon: 'mdi:cart-arrow-down',
      title: 'Compras',
      description: 'Órdenes de compra, recepción de mercadería, cuentas por pagar y sugerido de reposición.',
    },
    {
      icon: 'mdi:pill',
      title: 'Control farmacéutico',
      description: 'Recetas, principios activos, medicamentos controlados y cadena de frío.',
    },
    {
      icon: 'mdi:chart-line',
      title: 'Reportes y finanzas',
      description: 'Ventas, compras, resúmenes, ingresos/egresos y visibilidad del negocio.',
    },
    {
      icon: 'mdi:truck-delivery-outline',
      title: 'Delivery y pedidos',
      description: 'Órdenes de pedido, cotizaciones y seguimiento de entregas a domicilio.',
    },
    {
      icon: 'mdi:file-chart-outline',
      title: 'Cumplimiento',
      description: 'Libros PLE, retenciones, precios regulados y documentación LPDP.',
    },
    {
      icon: 'mdi:tag-multiple-outline',
      title: 'Promociones',
      description: 'Campañas, packs, conjuntos y reglas comerciales para impulsar ventas.',
    },
  ];

  protected readonly compliance: BenefitItem[] = [
    {
      icon: 'mdi:receipt-text-check-outline',
      title: 'Comprobantes electrónicos',
      description: 'Emisión alineada a requisitos SUNAT para boletas, facturas y documentos relacionados.',
    },
    {
      icon: 'mdi:calendar-clock',
      title: 'Vencimientos bajo control',
      description: 'Bloqueo configurable de lotes vencidos y alertas antes del vencimiento.',
    },
    {
      icon: 'mdi:file-lock-outline',
      title: 'Datos protegidos',
      description: 'Políticas de privacidad, roles de acceso y trazabilidad de operaciones sensibles.',
    },
  ];

  protected readonly steps: StepCard[] = [
    {
      number: '01',
      title: 'Cuéntanos de tu botica',
      description: 'Completa el formulario o escríbenos por WhatsApp con los datos de tu establecimiento.',
    },
    {
      number: '02',
      title: 'Configuramos tu cuenta',
      description: 'Habilitamos establecimiento, almacenes, series, usuarios y permisos según tu operación.',
    },
    {
      number: '03',
      title: 'Capacitación y arranque',
      description: 'Te guiamos en la carga inicial de productos, inventario y primeras ventas en mostrador.',
    },
    {
      number: '04',
      title: 'Soporte continuo',
      description: 'Acompañamiento post-implementación para resolver dudas y optimizar tu flujo de trabajo.',
    },
  ];

  protected readonly faqs: FaqItem[] = [
    {
      question: '¿Cómo conozco el precio?',
      answer:
        'No publicamos tarifas en la web. Completa el formulario o contáctanos y te enviamos una cotización según el tamaño de tu botica, módulos, usuarios e implementación.',
    },
    {
      question: '¿Necesito instalar algo en cada computadora?',
      answer: 'No. FactoFarm funciona en el navegador web. Solo necesitas conexión a internet y acceso con tu usuario y contraseña.',
    },
    {
      question: '¿Puedo usarlo en más de una sucursal?',
      answer: 'Sí. Puedes gestionar varios establecimientos y almacenes con stock, precios y reportes por sede.',
    },
    {
      question: '¿Incluye facturación electrónica SUNAT?',
      answer:
        'Sí, cuando tu establecimiento configura un proveedor OSE/PSE (p. ej. Factiliza o Nubefact) con credenciales de producción. En la puesta en marcha puedes operar con nota de venta mientras se activa la facturación electrónica.',
    },
    {
      question: '¿Cómo obtengo una cuenta?',
      answer: 'El acceso es por invitación. Completa el formulario de contacto y nuestro equipo evaluará tu solicitud para habilitar tu botica o farmacia.',
    },
    {
      question: '¿Ofrecen capacitación?',
      answer: 'Sí. Incluimos acompañamiento inicial para que tu equipo aprenda POS, inventario y los módulos que vayas a utilizar.',
    },
  ];

  protected readonly plans: PricingPlan[] = [
    {
      id: 'botica',
      name: 'Botica',
      subtitle: 'Ideal para una botica o farmacia con un local',
      priceLabel: 'Cotización personalizada',
      priceNote: 'Te enviamos la propuesta comercial',
      features: [
        '1 establecimiento',
        'Hasta 3 usuarios',
        'Punto de venta (POS)',
        'Inventario y productos',
        'Clientes y ventas',
        'Soporte por correo',
      ],
    },
    {
      id: 'farmacia',
      name: 'Farmacia Pro',
      subtitle: 'Operación completa con cumplimiento normativo',
      priceLabel: 'Cotización personalizada',
      priceNote: 'Te enviamos la propuesta comercial',
      highlighted: true,
      features: [
        '1 establecimiento',
        'Hasta 10 usuarios',
        'Todo lo de Botica',
        'Facturación electrónica SUNAT',
        'Lotes, vencimientos y kardex',
        'Compras y proveedores',
        'Reportes y finanzas básicas',
        'Capacitación inicial incluida',
      ],
    },
    {
      id: 'cadena',
      name: 'Cadena',
      subtitle: 'Para grupos con varias sucursales',
      priceLabel: 'Cotización a medida',
      priceNote: 'Según alcance y sucursales',
      features: [
        'Múltiples establecimientos',
        'Usuarios según operación',
        'Todos los módulos FactoFarm',
        'Consolidado multi-sede',
        'Implementación dedicada',
        'Soporte prioritario',
        'Acompañamiento continuo',
      ],
    },
  ];

  protected scrollTo(id: string): void {
    this.mobileNavOpen.set(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected goToDashboard(): void {
    void this.router.navigateByUrl(this.auth.defaultHomePath());
  }

  protected toggleMobileNav(): void {
    this.mobileNavOpen.update((open) => !open);
  }

  protected toggleFaq(index: number): void {
    const next = new Set(this.openFaqs());
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    this.openFaqs.set(next);
  }

  protected isFaqOpen(index: number): boolean {
    return this.openFaqs().has(index);
  }

  protected requestPlan(plan: PricingPlan): void {
    this.mensaje.set(`Me interesa el plan ${plan.name}. Quisiera recibir una cotización detallada.`);
    this.scrollTo('contacto');
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

    this.submitting.set(true);
    try {
      await firstValueFrom(this.contactApi.submit(payload));
      this.submitted.set(true);
    } catch {
      this.formError.set(
        'No pudimos enviar tu solicitud. Intenta de nuevo o contáctanos por WhatsApp.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
