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
    subItems: [{ name: 'Dashboard Admin', path: '/dashboard' }],
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
      { name: 'Conjuntos/Packs/Promociones', path: '/conjuntos-packs-promociones' },
      { name: 'Servicios', path: '/servicios' },
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
      { name: 'Series', path: '/series' },
      { name: 'Zonas', path: '/zonas' },
      { name: 'Importar Precios', path: '/importar-precios' },
    ],
  },
  {
    icon: 'lucide:truck-delivery',
    name: 'Compras',
    subItems: [{ name: 'Proveedores', path: '/proveedores', permissionCode: 'nav.proveedores' }],
  },
  {
    icon: 'lucide:shopping-cart',
    name: 'POS',
    subItems: [
      { name: 'Punto de Venta', path: '/punto-venta' },
      { name: 'Caja Chica POS', path: '/caja-chica-pos' },
    ],
  },
  {
    icon: 'lucide:receipt-text',
    name: 'Ventas',
    subItems: [
      { name: 'Comprobante electronico', path: '/comprobante-electronico' },
      { name: 'Notas de venta', path: '/notas-venta' },
      {
        name: 'Resumenes - Anulaciones',
        subItems: [
          { name: 'Resumenes', path: '/resumenes' },
          { name: 'Anulaciones', path: '/anulaciones' },
        ],
      },
      { name: 'Cotizaciones', path: '/cotizaciones' },
    ],
  },
  {
    icon: 'lucide:boxes',
    name: 'Inventario',
    subItems: [
      { name: 'Movimientos', path: '/inventario-movimientos' },
      { name: 'Traslados', path: '/traslados' },
      { name: 'Devolucion-retiro', path: '/devolucion-retiro' },
      { name: 'Reporte Kardex', path: '/reporte-kardex' },
      { name: 'Reporte Inventario', path: '/reporte-inventario' },
      { name: 'Kardex valorizado', path: '/kardex-valorizado' },
      { name: 'Lotes', path: '/lotes' },
    ],
  },
  {
    icon: 'lucide:file-check-2',
    name: 'Comprobantes Avanzados',
    subItems: [
      { name: 'Retenciones', path: '/retenciones' },
      { name: 'Percepciones', path: '/percepciones' },
      { name: 'Ordenes de pedido', path: '/ordenes-pedido' },
    ],
  },
  {
    icon: 'lucide:truck',
    name: 'Guias de remision',
    subItems: [
      { name: 'G.R. Remitente', path: '/gr-remitente' },
      { name: 'G.R. Transportista', path: '/gr-transportista' },
      { name: 'Transportistas', path: '/transportistas' },
      { name: 'Conductores', path: '/conductores' },
      { name: 'Vehiculos', path: '/vehiculos' },
      { name: 'Direcciones de partida', path: '/direcciones-partida' },
    ],
  },
  {
    icon: 'lucide:chart-no-axes-column',
    name: 'Reportes',
    path: '/reportes',
  },
  {
    icon: 'lucide:calculator',
    name: 'Contabilidad',
    subItems: [
      { name: 'Exportar Reporte', path: '/contabilidad-exportar-reporte' },
      { name: 'Resumen de venta', path: '/contabilidad-resumen-venta' },
      { name: 'Exportar formatos sistema contable', path: '/contabilidad-exportar-formatos' },
      { name: 'Reporte resumido de ventas', path: '/contabilidad-reporte-resumido' },
      { name: 'Libro Mayor', path: '/libro-mayor' },
      {
        name: 'SIRE',
        subItems: [
          { name: 'Ventas', path: '/sire-ventas' },
          { name: 'Compras', path: '/sire-compras' },
        ],
      },
    ],
  },
  {
    icon: 'lucide:wallet',
    name: 'Finanzas',
    subItems: [
      { name: 'Movimientos', path: '/finanzas-movimientos' },
      { name: 'Transacciones', path: '/transacciones' },
      { name: 'Ingresos', path: '/finanzas-ingresos' },
      { name: 'Cuentas por cobrar', path: '/cuentas-cobrar' },
      { name: 'Cuentas por pagar', path: '/cuentas-pagar' },
      { name: 'Pagos', path: '/pagos' },
      { name: 'Balance', path: '/balance' },
      { name: 'Ingresos y Egresos M. pago', path: '/ingresos-egresos-medio-pago' },
    ],
  },
  {
    icon: 'lucide:pill',
    name: 'Farmacos',
    subItems: [
      { name: 'Reporte Digemid', path: '/reporte-digemid' },
      { name: 'Medicos', path: '/medicos' },
      { name: 'CIE 10', path: '/cie-10' },
      { name: 'Reporte de psicotropicos y estupefacientes', path: '/reporte-psicotropicos-estupefacientes' },
      { name: 'Recepcion de productos farmaceuticos', path: '/recepcion-productos-farmaceuticos' },
    ],
  },
];
