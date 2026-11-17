/**
 * Contenido de la portada pública. Una sola fuente para la página y para los datos estructurados
 * (FAQPage en seo.config.ts): si cambia una pregunta, cambia en ambos lados.
 */

export interface LandingNavItem {
  id: string;
  label: string;
}

export interface LandingPillar {
  id: string;
  icon: string;
  title: string;
  lead: string;
  items: Array<{ title: string; text: string }>;
}

export interface LandingStep {
  title: string;
  text: string;
}

export interface LandingPlan {
  id: string;
  name: string;
  forWho: string;
  highlighted?: boolean;
  features: string[];
}

export interface LandingFaq {
  question: string;
  answer: string;
}

export const LANDING_NAV: LandingNavItem[] = [
  { id: 'producto', label: 'Producto' },
  { id: 'como-funciona', label: 'Cómo funciona' },
  { id: 'planes', label: 'Planes' },
  { id: 'preguntas', label: 'Preguntas' },
  { id: 'contacto', label: 'Contacto' },
];

/** Lo que el dueño de la botica quiere saber en 5 segundos (debajo de los botones del inicio). */
export const LANDING_PROOF: string[] = [
  'Facturación electrónica SUNAT',
  'Lotes y vencimientos',
  'Varias sedes y almacenes',
  'En la nube, sin instalar nada',
];

/** Beneficios, módulos y cumplimiento agrupados en tres ideas, sin repetirse. */
export const LANDING_PILLARS: LandingPillar[] = [
  {
    id: 'vender',
    icon: 'mdi:point-of-sale',
    title: 'Vender',
    lead: 'Un mostrador rápido, aunque la cola llegue a la puerta.',
    items: [
      { title: 'Punto de venta', text: 'Búsqueda por código de barras, genéricos sustitutos y pago con varios medios.' },
      { title: 'Boletas y facturas', text: 'Comprobantes electrónicos emitidos desde la misma venta.' },
      { title: 'Promociones y packs', text: 'Campañas, combos y reglas comerciales que se aplican solas.' },
      { title: 'Pedidos y delivery', text: 'Cotizaciones, órdenes de pedido y seguimiento de entregas.' },
    ],
  },
  {
    id: 'controlar',
    icon: 'mdi:package-variant-closed-check',
    title: 'Controlar',
    lead: 'Saber qué tienes, dónde está y qué se vence.',
    items: [
      { title: 'Inventario por lotes', text: 'Stock por almacén, salida FEFO, traslados, conteos y kardex.' },
      { title: 'Compras', text: 'Órdenes de compra, recepción de mercadería y sugerido de reposición.' },
      { title: 'Caja y finanzas', text: 'Aperturas, arqueos, ingresos, egresos y cuentas por cobrar y pagar.' },
      { title: 'Equipo con permisos', text: 'Cajero, almacenero, administrador: cada uno ve solo lo suyo.' },
    ],
  },
  {
    id: 'cumplir',
    icon: 'mdi:shield-check-outline',
    title: 'Cumplir',
    lead: 'La normativa resuelta en el mismo flujo de trabajo.',
    items: [
      { title: 'SUNAT', text: 'Boletas, facturas, notas de crédito y guías con tu proveedor OSE/PSE.' },
      { title: 'Vencimientos', text: 'Bloqueo de venta de lotes vencidos y alertas antes de que pase.' },
      { title: 'Control farmacéutico', text: 'Recetas, principios activos, controlados y cadena de frío.' },
      { title: 'Datos protegidos', text: 'Libros PLE, roles de acceso y política de datos personales (LPDP).' },
    ],
  },
];

export const LANDING_STEPS: LandingStep[] = [
  { title: 'Nos cuentas de tu botica', text: 'Por el formulario o por WhatsApp: cuántas sedes, usuarios y qué necesitas.' },
  { title: 'Configuramos tu cuenta', text: 'Establecimiento, almacenes, series, usuarios y permisos según tu operación.' },
  { title: 'Arrancas con nosotros', text: 'Cargamos productos e inventario contigo y te acompañamos en las primeras ventas.' },
  { title: 'Soporte continuo', text: 'Seguimos a tu lado para resolver dudas y ajustar el sistema a tu forma de trabajar.' },
];

export const LANDING_PLANS: LandingPlan[] = [
  {
    id: 'botica',
    name: 'Botica',
    forWho: 'Un local que quiere ordenar ventas e inventario.',
    features: ['1 establecimiento', 'Hasta 3 usuarios', 'Punto de venta', 'Inventario y productos', 'Clientes y ventas', 'Soporte por correo'],
  },
  {
    id: 'farmacia',
    name: 'Farmacia Pro',
    forWho: 'Operación completa con cumplimiento normativo.',
    highlighted: true,
    features: [
      'Todo lo de Botica',
      'Hasta 10 usuarios',
      'Facturación electrónica SUNAT',
      'Lotes, vencimientos y kardex',
      'Compras y proveedores',
      'Reportes y finanzas',
      'Capacitación inicial',
    ],
  },
  {
    id: 'cadena',
    name: 'Cadena',
    forWho: 'Grupos con varias sucursales.',
    features: [
      'Varios establecimientos',
      'Usuarios según tu operación',
      'Todos los módulos',
      'Consolidado entre sedes',
      'Implementación dedicada',
      'Soporte prioritario',
    ],
  },
];

export const LANDING_FAQS: LandingFaq[] = [
  {
    question: '¿Cuánto cuesta?',
    answer:
      'Te enviamos una cotización según el tamaño de tu botica, los módulos, la cantidad de usuarios y la implementación. Déjanos tus datos en el formulario o escríbenos por WhatsApp.',
  },
  {
    question: '¿Tengo que instalar algo en cada computadora?',
    answer: 'No. FactoFarm funciona en el navegador. Solo necesitas internet y tu usuario y contraseña.',
  },
  {
    question: '¿Sirve para varias sucursales?',
    answer: 'Sí. Manejas varios establecimientos y almacenes, con stock, precios y reportes por sede o consolidados.',
  },
  {
    question: '¿Incluye facturación electrónica SUNAT?',
    answer:
      'Sí, al configurar tu proveedor OSE/PSE (por ejemplo Factiliza o Nubefact) con credenciales de producción. Mientras se activa, puedes vender con nota de venta.',
  },
  {
    question: '¿Cómo obtengo una cuenta?',
    answer: 'El acceso es por invitación. Completa el formulario y nuestro equipo te contacta para habilitar tu botica o farmacia.',
  },
  {
    question: '¿Me enseñan a usarlo?',
    answer: 'Sí. Incluimos acompañamiento inicial para que tu equipo aprenda el punto de venta, el inventario y los módulos que vayas a usar.',
  },
];

/** Horario y respuesta: se muestran una sola vez, junto al formulario. */
export const LANDING_BUSINESS_HOURS = 'Lun–Vie 9:00–18:00 · Sáb 9:00–14:00';
