import type { Alignment, Side } from 'driver.js';

/** Identificadores de los recorridos guiados disponibles. */
export type TourId = 'bienvenida' | 'modulos' | 'plataforma' | 'vender' | 'caja';

/**
 * Texto que solo tiene sentido con teclado físico (atajos, Esc, flechas).
 * En pantallas táctiles el servicio lo quita del paso.
 */
const kbd = (html: string) => `<span class="ff-kbd-only">${html}</span>`;

/** Para quién aplica un recorrido o paso. */
export type TourAudience = 'tenant' | 'platform' | 'all';

/**
 * Zona del layout que debe estar visible antes de resaltar el paso.
 * - `sidebar`: abre el menú lateral (en móvil) o lo expande (en escritorio).
 * - `header`: cierra el menú lateral móvil para no tapar la cabecera.
 */
export type TourArea = 'sidebar' | 'header';

/** Título especial: se reemplaza por la etiqueta visible del elemento (`data-tour-label`). */
export const MENU_LABEL = '{menu}';

/** Acción extra que se muestra como botón en el popover (p. ej. "Ir a configuración"). */
export type TourStepAction =
  | { label: string; kind: 'route'; route: string }
  | { label: string; kind: 'tour'; tourId: TourId };

export type TourStepDef = {
  /** Selector CSS. Sin selector, el paso se muestra centrado como modal. */
  element?: string;
  /** Admite `{nombre}` y {@link MENU_LABEL}. */
  title: string;
  /** Admite HTML simple (estático). `{nombre}` se reemplaza por el nombre del usuario. */
  description: string;
  side?: Side;
  align?: Alignment;
  area?: TourArea;
  /** El paso solo se muestra si el usuario tiene al menos uno de estos permisos. */
  permissions?: string[];
  audience?: TourAudience;
  action?: TourStepAction;
};

export type TourDef = {
  id: TourId;
  /** Título que se muestra en el menú "Tutoriales". */
  title: string;
  /** Resumen corto para el menú "Tutoriales". */
  summary: string;
  audience: TourAudience;
  /**
   * Se lanza solo la primera vez: al entrar al sistema o, si tiene `route`,
   * la primera vez que el usuario abre esa pantalla.
   */
  autoStart: boolean;
  /** Recorrido de una pantalla: al iniciarlo desde "Tutoriales" se navega primero a ella. */
  route?: string;
  /** Solo se ofrece a usuarios con al menos uno de estos permisos. */
  permissions?: string[];
  steps: TourStepDef[];
};

/** Grupos del menú lateral (clave = `NavItem.key`), en el orden del sidebar. */
const MODULES: { key: string; description: string }[] = [
  {
    key: 'dashboard',
    description:
      'Tu <b>panel de control</b>: ventas del día, KPIs, alertas de stock bajo y productos por vencer, y el resumen por sucursal.',
  },
  {
    key: 'usuarios',
    description:
      'Administra <b>usuarios y permisos</b>, el personal, la auditoría de acciones, solicitudes LPDP/ARCO, el farmacéutico titular y los datos de tu farmacia y sucursales.',
  },
  {
    key: 'clientes',
    description:
      'Registro de <b>clientes</b> (DNI/RUC) y sus tipos, para emitir comprobantes, aplicar precios especiales y llevar historial de compras.',
  },
  {
    key: 'productos',
    description:
      'Tu <b>catálogo</b>: productos, precios regulados DIGEMID, packs y promociones, servicios, categorías, marcas, laboratorios, principios activos, series e importación masiva de precios.',
  },
  {
    key: 'compras',
    description:
      'Gestiona <b>proveedores</b>, órdenes de compra, la recepción de mercadería (con lotes y vencimientos), el sugerido de compras y el comparativo de precios.',
  },
  {
    key: 'ventas',
    description:
      'El día a día: <b>Punto de venta</b>, caja chica (apertura, movimientos y cierre), comprobantes electrónicos SUNAT, notas de venta, anulaciones, cotizaciones, cupones y convenios.',
  },
  {
    key: 'inventario',
    description:
      'Control de <b>stock</b>: movimientos, traslados entre sucursales, devoluciones, kardex (físico y valorizado), lotes, salidas por lote y cadena de frío.',
  },
  {
    key: 'comprobantes-avanzados',
    description: 'Emisión de <b>retenciones</b>, <b>percepciones</b> y órdenes de pedido.',
  },
  {
    key: 'guias-remision',
    description:
      'Guías de remisión <b>remitente y transportista</b>, con su maestro de transportistas, conductores, vehículos y direcciones de partida.',
  },
  { key: 'reportes', description: 'Centro de <b>reportes</b> operativos y de gestión, exportables a Excel/PDF.' },
  {
    key: 'contabilidad',
    description:
      'Exportaciones para tu <b>contador</b>: resumen de ventas, formatos para sistemas contables, libro mayor y <b>SIRE</b> (ventas y compras).',
  },
  {
    key: 'finanzas',
    description:
      'Movimientos financieros, ingresos, <b>cuentas por cobrar y por pagar</b>, pagos, balance, conciliación bancaria y reporte por medio de pago.',
  },
  {
    key: 'farmacos',
    description:
      'Cumplimiento sanitario: reporte <b>DIGEMID</b>, recetas, médicos, CIE-10, psicotrópicos y estupefacientes, recepción de productos farmacéuticos y dispensación hospitalaria.',
  },
];

const PLATFORM_MODULE = {
  key: 'plataforma',
  description:
    'Consola <b>FactoFarm SaaS</b>: dashboard global, configuración, clientes (farmacias), leads, libro de reclamaciones y catálogos maestros compartidos.',
};

/**
 * Paso para un grupo del menú lateral. El título se toma de la etiqueta visible
 * del grupo (`data-tour-label`), que puede venir personalizada desde la API.
 */
function moduleStep(mod: { key: string; description: string }): TourStepDef {
  return {
    element: `[data-tour-nav="${mod.key}"]`,
    title: MENU_LABEL,
    description: mod.description,
    side: 'right',
    align: 'start',
    area: 'sidebar',
  };
}

const BIENVENIDA: TourDef = {
  id: 'bienvenida',
  title: 'Tutorial de bienvenida',
  summary: 'Conoce la pantalla principal: menú, búsqueda, accesos y tu cuenta.',
  audience: 'all',
  autoStart: true,
  steps: [
    {
      title: '¡Hola, {nombre}! 👋',
      description:
        `Te damos la bienvenida a <b>FactoFarm</b>, el sistema para gestionar tu farmacia: ventas, caja, inventario, comprobantes electrónicos y más.<br><br>En menos de un minuto te mostramos cómo moverte. Puedes salir cuando quieras con la <b>✕</b>${kbd(' o <kbd>Esc</kbd>, y avanzar con las flechas <kbd>←</kbd> <kbd>→</kbd> del teclado')}.`,
    },
    {
      element: '#app-sidebar',
      title: 'Menú principal',
      description:
        'Aquí están todos los <b>módulos</b> del sistema agrupados por área. Solo verás las opciones para las que tienes permiso; si te falta alguna, pídesela al administrador.',
      side: 'right',
      align: 'start',
      area: 'sidebar',
    },
    {
      element: '[data-tour="sidebar-toggle"]',
      title: 'Mostrar u ocultar el menú',
      description:
        'Contrae el menú para ganar espacio de trabajo (quedan solo los íconos) o ábrelo en celulares y tablets.',
      side: 'bottom',
      align: 'start',
      area: 'header',
    },
    {
      element: '[data-tour="search"]',
      title: 'Buscador de opciones',
      description:
        `¿No recuerdas dónde está algo? Escribe aquí, por ejemplo <i>"kardex"</i> o <i>"caja"</i>, y salta directo a la pantalla.${kbd(' Atajo: <kbd>⌘K</kbd> / <kbd>Ctrl K</kbd>.')}`,
      side: 'bottom',
      align: 'start',
      area: 'header',
    },
    {
      element: '[data-tour="quick-links"]',
      title: 'Accesos directos',
      description:
        'Las pantallas más usadas a un clic: Punto de venta, Caja, Productos, Clientes, Recepción y Panel.',
      side: 'bottom',
      align: 'start',
      area: 'header',
      audience: 'tenant',
    },
    {
      element: '[data-tour="tenant"]',
      title: 'Tu farmacia',
      description: 'Indica la empresa en la que estás trabajando. Todo lo que registres se guarda en ella.',
      side: 'bottom',
      align: 'end',
      area: 'header',
      audience: 'tenant',
    },
    {
      element: '[data-tour="theme"]',
      title: 'Modo claro / oscuro',
      description: 'Cambia el tema de la pantalla según tu preferencia o la iluminación del local.',
      side: 'bottom',
      align: 'end',
      area: 'header',
    },
    {
      element: '[data-tour="notifications"]',
      title: 'Notificaciones',
      description:
        'Avisos que necesitan atención: caja sin cerrar, lotes vencidos o por vencer, productos agotados, comprobantes rechazados y más. El número indica cuántos son nuevos; toca un aviso para ir a resolverlo.',
      side: 'bottom',
      align: 'end',
      area: 'header',
    },
    {
      element: '[data-tour="user-menu"]',
      title: 'Tu cuenta',
      description:
        'Edita tu perfil y contraseña, cierra sesión y, en <b>Tutoriales</b>, vuelve a ver esta guía o el recorrido por módulos cuando quieras.',
      side: 'bottom',
      align: 'end',
      area: 'header',
    },
    {
      element: '#main-content',
      title: 'Área de trabajo',
      description:
        'Aquí se abre cada pantalla que elijas. Los listados tienen filtros, búsqueda y exportación; los formularios validan los datos antes de guardar.',
      side: 'top',
      align: 'center',
      area: 'header',
    },
    {
      title: 'Primer paso: configura tu farmacia',
      description:
        'Antes de vender, completa la <b>configuración inicial</b>: establecimiento y RUC, series SUNAT, facturación electrónica (opcional), tu primer producto y la apertura de caja.<br><br>Puedes repetir este tutorial desde <b>tu cuenta › Tutoriales</b>.',
      permissions: ['nav.establecimientos'],
      audience: 'tenant',
      action: { label: 'Ir a configuración inicial', kind: 'route', route: '/onboarding' },
    },
    {
      title: 'Tu primera venta',
      description:
        'Si atiendes en mostrador, empieza por aquí: te mostramos en el <b>Punto de venta</b> cómo buscar un producto, armar el carrito y cobrar.',
      permissions: ['nav.punto_venta'],
      audience: 'tenant',
      action: { label: 'Cómo hacer una venta', kind: 'tour', tourId: 'vender' },
    },
    {
      title: '¡Listo para empezar! 🎉',
      description:
        'Ya conoces lo básico. Si quieres, te mostramos para qué sirve cada módulo del menú.<br><br>Puedes repetir este tutorial desde <b>tu cuenta › Tutoriales</b>.',
      action: { label: 'Recorrido por módulos', kind: 'tour', tourId: 'modulos' },
    },
  ],
};

const MODULOS: TourDef = {
  id: 'modulos',
  title: 'Recorrido por módulos',
  summary: 'Para qué sirve cada sección del menú lateral.',
  audience: 'tenant',
  autoStart: false,
  steps: [
    {
      title: 'Módulos del sistema',
      description:
        'Repasemos cada sección del menú. Solo aparecen las que tu rol tiene habilitadas; haz clic en cualquiera para desplegar sus opciones.',
    },
    ...MODULES.map(moduleStep),
    {
      title: '¡Eso es todo!',
      description:
        'Ya sabes dónde encontrar cada cosa. Recuerda que el <b>buscador</b> de la parte superior te lleva a cualquier opción escribiendo su nombre.',
    },
  ],
};

const PLATAFORMA: TourDef = {
  id: 'plataforma',
  title: 'Consola de plataforma',
  summary: 'Gestión de clientes SaaS, leads, reclamaciones y catálogos maestros.',
  audience: 'platform',
  autoStart: true,
  steps: [
    {
      title: 'Consola FactoFarm, {nombre}',
      description:
        'Estás en la <b>consola de plataforma</b>: desde aquí administras las farmacias clientes, no la operación de una farmacia en particular.',
    },
    moduleStep(PLATFORM_MODULE),
    {
      element: '[data-tour="search"]',
      title: 'Buscador de opciones',
      description: `Salta a cualquier pantalla de la consola escribiendo su nombre.${kbd(' Atajo: <kbd>⌘K</kbd> / <kbd>Ctrl K</kbd>.')}`,
      side: 'bottom',
      align: 'start',
      area: 'header',
    },
    {
      element: '[data-tour="notifications"]',
      title: 'Notificaciones',
      description: 'Nuevos leads, reclamaciones y alertas de los clientes SaaS.',
      side: 'bottom',
      align: 'end',
      area: 'header',
    },
    {
      element: '[data-tour="user-menu"]',
      title: 'Tu cuenta',
      description: 'Perfil, cierre de sesión y <b>Tutoriales</b> para repetir esta guía.',
      side: 'bottom',
      align: 'end',
      area: 'header',
    },
    {
      title: 'Soporte a clientes',
      description:
        'Desde <b>Clientes SaaS</b> puedes entrar a una farmacia en <b>sesión de soporte</b>. Verás una franja superior para salir de ella cuando termines.',
    },
  ],
};

const VENDER: TourDef = {
  id: 'vender',
  title: 'Cómo hacer una venta',
  summary: 'Buscar productos, armar el carrito, elegir cliente y cobrar en el Punto de venta.',
  audience: 'tenant',
  autoStart: true,
  route: '/punto-venta',
  permissions: ['nav.punto_venta'],
  steps: [
    {
      title: 'Punto de venta',
      description:
        'Una venta tiene <b>4 pasos</b>: tener la caja abierta, buscar los productos, revisar el carrito y cobrar. Te los mostramos en orden.',
    },
    {
      element: '[data-tour="pos-cash"]',
      title: '1. Caja abierta',
      description:
        'Para vender necesitas una <b>caja abierta</b>. Si ves <i>"Sin caja"</i>, pulsa <b>Abrir caja</b> e indica el efectivo inicial de la gaveta. Al terminar el turno, ciérrala desde aquí con su arqueo.',
      side: 'bottom',
      align: 'start',
      area: 'header',
    },
    {
      element: '[data-tour="pos-search"]',
      title: '2. Busca el producto',
      description: `Escribe el nombre, el código o escanea el código de barras. Toca un producto para agregarlo al carrito; si maneja lotes, se descuenta del que vence primero.${kbd(' Atajo: <kbd>F1</kbd> para ir al buscador.')}`,
      side: 'bottom',
      align: 'start',
    },
    {
      element: '[data-tour="pos-tabs"]',
      title: '3. Revisa el carrito',
      description:
        'En el celular, el catálogo y el carrito están en pestañas. Abre <b>Carrito</b> para cambiar cantidades o quitar productos.',
      side: 'bottom',
      align: 'center',
    },
    {
      element: '[data-tour="pos-cart"]',
      title: '3. Revisa el carrito',
      description: `Aquí ves lo que vas a cobrar: cambia cantidades o quita productos.${kbd(' Atajo: <kbd>F4</kbd> vacía el carrito.')}`,
      side: 'left',
      align: 'start',
    },
    {
      element: '[data-tour="pos-customer"]',
      title: 'Cliente (opcional)',
      description:
        'Para una venta rápida déjalo vacío. Busca o registra al cliente por DNI/RUC cuando pida <b>boleta con nombre o factura</b>, o para acumular puntos.',
      side: 'bottom',
      align: 'start',
    },
    {
      element: '[data-tour="pos-pay"]',
      title: '4. Cobra',
      description: `Revisa el total y pulsa <b>Cobrar</b>. Puedes combinar medios de pago (efectivo, Yape, tarjeta…); con efectivo el sistema calcula el vuelto. Al terminar puedes reimprimir el ticket o descargar el PDF.${kbd(' Atajo: <kbd>F2</kbd>.')}`,
      side: 'left',
      align: 'end',
    },
    {
      title: '¿Te equivocaste en una venta?',
      description:
        'Búscala en <b>Ventas › Notas de venta</b> (o Comprobantes) y pide su <b>anulación</b>: el stock vuelve al inventario y el efectivo sale de la caja.<br><br>Repite esta guía cuando quieras desde <b>tu cuenta › Tutoriales</b>.',
    },
  ],
};

const CAJA: TourDef = {
  id: 'caja',
  title: 'Abrir y cerrar caja',
  summary: 'Apertura, ingresos y egresos de efectivo y cierre con arqueo.',
  audience: 'tenant',
  autoStart: true,
  route: '/caja-chica-pos',
  permissions: ['nav.caja_chica_pos'],
  steps: [
    {
      title: 'Caja chica',
      description:
        'La caja registra el <b>efectivo de tu turno</b>: lo que había al abrir, lo que entra por ventas y lo que sale. Al cerrar comparas lo esperado con lo que cuentas.',
    },
    {
      element: '[data-tour="cash-open"]',
      title: 'Abre tu caja',
      description:
        'Elige la caja e indica el <b>monto inicial</b> (el sencillo que dejas en la gaveta). Sin caja abierta no se puede vender.',
      side: 'bottom',
      align: 'start',
    },
    {
      element: '[data-tour="cash-session"]',
      title: 'Saldo de la caja',
      description: 'Efectivo que debería haber ahora en la gaveta: apertura + ventas en efectivo + ingresos − egresos.',
      side: 'bottom',
      align: 'start',
    },
    {
      element: '[data-tour="cash-movement"]',
      title: 'Entradas y salidas de efectivo',
      description:
        'Registra aquí lo que <b>no es una venta</b>: sencillo que agregas (ingreso) o pagos como movilidad o un proveedor (egreso). Escribe siempre el motivo.',
      side: 'bottom',
      align: 'start',
    },
    {
      element: '[data-tour="cash-close"]',
      title: 'Cierra con arqueo',
      description:
        'Al terminar el turno <b>cuenta el efectivo</b> y regístralo. El sistema muestra la diferencia con lo esperado y puedes imprimir el arqueo. Cierra la caja el mismo día.',
      side: 'top',
      align: 'start',
    },
  ],
};

export const TOURS: readonly TourDef[] = [BIENVENIDA, MODULOS, PLATAFORMA, VENDER, CAJA];

export function findTour(id: TourId): TourDef | undefined {
  return TOURS.find((t) => t.id === id);
}
