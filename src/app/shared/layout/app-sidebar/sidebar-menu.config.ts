export type NavSubItem = {
  name: string;
  path?: string;
  permissionCode?: string;
  pro?: boolean;
  new?: boolean;
  subItems?: NavSubItem[];
};

export type NavItem = {
  name: string;
  icon: string;
  path?: string;
  permissionCode?: string;
  new?: boolean;
  subItems?: NavSubItem[];
};

export const MAIN_NAV_ITEMS: NavItem[] = [
  {
    icon: 'lucide:layout-dashboard',
    name: 'Dashboard',
    subItems: [
      { name: 'Dashboard Admin', path: '/dashboard', permissionCode: 'nav.dashboard_admin' },
    ],
  },
  {
    icon: 'lucide:users',
    name: 'Usuarios/Establecimientos',
    subItems: [
      { name: 'Usuarios', path: '/usuarios', permissionCode: 'nav.usuarios' },
      { name: 'Establecimientos', path: '/establecimientos', permissionCode: 'nav.establecimientos' },
    ],
  },
  {
    icon: 'lucide:users-round',
    name: 'Clientes',
    subItems: [
      { name: 'Clientes', path: '/clientes', permissionCode: 'nav.clientes_list' },
      { name: 'Tipos de Clientes', path: '/tipo-clientes', permissionCode: 'nav.tipo_clientes' },
    ],
  },
  {
    icon: 'lucide:package-search',
    name: 'Productos/Servicios',
    subItems: [
      { name: 'Productos', path: '/productos', permissionCode: 'nav.productos' },
      {
        name: 'Conjuntos/Packs/Promociones',
        path: '/conjuntos-packs-promociones',
        permissionCode: 'nav.conjuntos_packs',
      },
      { name: 'Servicios', path: '/servicios', permissionCode: 'nav.servicios' },
      { name: 'Categorias', path: '/categorias', permissionCode: 'nav.categorias' },
      { name: 'Marcas', path: '/marcas', permissionCode: 'nav.marcas' },
      { name: 'Laboratorios', path: '/laboratorios', permissionCode: 'nav.laboratorios' },
      { name: 'Unidades', path: '/unidades', permissionCode: 'nav.unidades' },
      {
        name: 'Formas farmacéuticas',
        path: '/formas-farmaceuticas',
        permissionCode: 'nav.formas_farmaceuticas',
      },
      {
        name: 'Principios activos',
        path: '/principios-activos',
        permissionCode: 'nav.principios_activos',
      },
      {
        name: 'Vías de administración',
        path: '/vias-administracion',
        permissionCode: 'nav.vias_administracion',
      },
      { name: 'Series', path: '/series', permissionCode: 'nav.series' },
      { name: 'Zonas', path: '/zonas', permissionCode: 'nav.zonas' },
      { name: 'Importar Precios', path: '/importar-precios', permissionCode: 'nav.importar_precios' },
    ],
  },
  {
    icon: 'lucide:truck-delivery',
    name: 'Compras',
    subItems: [
      { name: 'Proveedores', path: '/proveedores', permissionCode: 'nav.proveedores' },
      { name: 'Órdenes de compra', path: '/ordenes-compra', permissionCode: 'nav.ordenes_compra' },
      { name: 'Recepción mercadería', path: '/recepcion-mercaderia', permissionCode: 'nav.recepcion_mercaderia' },
      { name: 'Sugerido de compras', path: '/reporte-compras-sugerido', permissionCode: 'nav.reporte_compras_sugerido' },
      { name: 'Comparativo precios', path: '/comparativo-precios', permissionCode: 'nav.comparativo_precios' },
    ],
  },
  {
    icon: 'lucide:shopping-cart',
    name: 'POS',
    subItems: [
      { name: 'Punto de Venta', path: '/punto-venta', permissionCode: 'nav.punto_venta' },
      { name: 'Caja Chica POS', path: '/caja-chica-pos', permissionCode: 'nav.caja_chica_pos' },
    ],
  },
  {
    icon: 'lucide:receipt-text',
    name: 'Ventas',
    subItems: [
      {
        name: 'Comprobante electronico',
        path: '/comprobante-electronico',
        permissionCode: 'nav.comprobante_electronico',
      },
      { name: 'Notas de venta', path: '/notas-venta', permissionCode: 'nav.notas_venta' },
      {
        name: 'Resumenes - Anulaciones',
        subItems: [
          { name: 'Resumenes', path: '/resumenes', permissionCode: 'nav.resumenes' },
          { name: 'Anulaciones', path: '/anulaciones', permissionCode: 'nav.anulaciones' },
        ],
      },
      { name: 'Cotizaciones', path: '/cotizaciones', permissionCode: 'nav.cotizaciones' },
    ],
  },
  {
    icon: 'lucide:boxes',
    name: 'Inventario',
    subItems: [
      {
        name: 'Movimientos',
        path: '/inventario-movimientos',
        permissionCode: 'nav.inventario_movimientos',
      },
      { name: 'Traslados', path: '/traslados', permissionCode: 'nav.traslados' },
      {
        name: 'Devolucion-retiro',
        path: '/devolucion-retiro',
        permissionCode: 'nav.devolucion_retiro',
      },
      { name: 'Reporte Kardex', path: '/reporte-kardex', permissionCode: 'nav.reporte_kardex' },
      {
        name: 'Reporte Inventario',
        path: '/reporte-inventario',
        permissionCode: 'nav.reporte_inventario',
      },
      {
        name: 'Kardex valorizado',
        path: '/kardex-valorizado',
        permissionCode: 'nav.kardex_valorizado',
      },
      { name: 'Lotes', path: '/lotes', permissionCode: 'nav.lotes' },
      {
        name: 'Salida venta (lotes)',
        path: '/salida-venta-lotes',
        permissionCode: 'nav.salida_venta_lotes',
      },
      { name: 'Cadena de frío', path: '/cadena-frio', permissionCode: 'nav.cadena_frio' },
    ],
  },
  {
    icon: 'lucide:file-check-2',
    name: 'Comprobantes Avanzados',
    subItems: [
      { name: 'Retenciones', path: '/retenciones', permissionCode: 'nav.retenciones' },
      { name: 'Percepciones', path: '/percepciones', permissionCode: 'nav.percepciones' },
      { name: 'Ordenes de pedido', path: '/ordenes-pedido', permissionCode: 'nav.ordenes_pedido' },
    ],
  },
  {
    icon: 'lucide:truck',
    name: 'Guias de remision',
    subItems: [
      { name: 'G.R. Remitente', path: '/gr-remitente', permissionCode: 'nav.gr_remitente' },
      {
        name: 'G.R. Transportista',
        path: '/gr-transportista',
        permissionCode: 'nav.gr_transportista',
      },
      { name: 'Transportistas', path: '/transportistas', permissionCode: 'nav.transportistas' },
      { name: 'Conductores', path: '/conductores', permissionCode: 'nav.conductores' },
      { name: 'Vehiculos', path: '/vehiculos', permissionCode: 'nav.vehiculos' },
      {
        name: 'Direcciones de partida',
        path: '/direcciones-partida',
        permissionCode: 'nav.direcciones_partida',
      },
    ],
  },
  {
    icon: 'lucide:chart-no-axes-column',
    name: 'Reportes',
    subItems: [{ name: 'Reportes', path: '/reportes', permissionCode: 'nav.reportes_panel' }],
  },
  {
    icon: 'lucide:calculator',
    name: 'Contabilidad',
    subItems: [
      {
        name: 'Exportar Reporte',
        path: '/contabilidad-exportar-reporte',
        permissionCode: 'nav.contabilidad_exportar_reporte',
      },
      {
        name: 'Resumen de venta',
        path: '/contabilidad-resumen-venta',
        permissionCode: 'nav.contabilidad_resumen_venta',
      },
      {
        name: 'Exportar formatos sistema contable',
        path: '/contabilidad-exportar-formatos',
        permissionCode: 'nav.contabilidad_exportar_formatos',
      },
      {
        name: 'Reporte resumido de ventas',
        path: '/contabilidad-reporte-resumido',
        permissionCode: 'nav.contabilidad_reporte_resumido',
      },
      { name: 'Libro Mayor', path: '/libro-mayor', permissionCode: 'nav.libro_mayor' },
      {
        name: 'SIRE',
        subItems: [
          { name: 'Ventas', path: '/sire-ventas', permissionCode: 'nav.sire_ventas' },
          { name: 'Compras', path: '/sire-compras', permissionCode: 'nav.sire_compras' },
        ],
      },
    ],
  },
  {
    icon: 'lucide:wallet',
    name: 'Finanzas',
    subItems: [
      {
        name: 'Movimientos',
        path: '/finanzas-movimientos',
        permissionCode: 'nav.finanzas_movimientos',
      },
      { name: 'Transacciones', path: '/transacciones', permissionCode: 'nav.transacciones' },
      { name: 'Ingresos', path: '/finanzas-ingresos', permissionCode: 'nav.finanzas_ingresos' },
      { name: 'Cuentas por cobrar', path: '/cuentas-cobrar', permissionCode: 'nav.cuentas_cobrar' },
      { name: 'Cuentas por pagar', path: '/cuentas-pagar', permissionCode: 'nav.cuentas_pagar' },
      { name: 'Pagos', path: '/pagos', permissionCode: 'nav.pagos' },
      { name: 'Balance', path: '/balance', permissionCode: 'nav.balance' },
      {
        name: 'Ingresos y Egresos M. pago',
        path: '/ingresos-egresos-medio-pago',
        permissionCode: 'nav.ingresos_egresos_medio_pago',
      },
    ],
  },
  {
    icon: 'lucide:pill',
    name: 'Farmacos',
    subItems: [
      { name: 'Reporte Digemid', path: '/reporte-digemid', permissionCode: 'nav.reporte_digemid' },
      { name: 'Recetas', path: '/recetas', permissionCode: 'nav.recetas' },
      { name: 'Medicos', path: '/medicos', permissionCode: 'nav.medicos' },
      { name: 'CIE 10', path: '/cie-10', permissionCode: 'nav.cie_10' },
      {
        name: 'Reporte de psicotropicos y estupefacientes',
        path: '/reporte-psicotropicos-estupefacientes',
        permissionCode: 'nav.reporte_psicotropicos',
      },
      {
        name: 'Recepcion de productos farmaceuticos',
        path: '/recepcion-productos-farmaceuticos',
        permissionCode: 'nav.recepcion_productos_farmaceuticos',
      },
    ],
  },
];
