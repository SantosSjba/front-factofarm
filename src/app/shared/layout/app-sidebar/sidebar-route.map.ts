/** Mapeo Permission.code → ruta del panel admin. */
export const PERMISSION_ROUTE_MAP: Record<string, { path: string; icon?: string }> = {
  'nav.usuarios': { path: '/usuarios' },
  'nav.establecimientos': { path: '/establecimientos' },
  'nav.clientes_list': { path: '/clientes' },
  'nav.tipo_clientes': { path: '/tipo-clientes' },
  'nav.productos': { path: '/productos' },
  'nav.categorias': { path: '/categorias' },
  'nav.marcas': { path: '/marcas' },
  'nav.laboratorios': { path: '/laboratorios' },
  'nav.unidades': { path: '/unidades' },
  'nav.formas_farmaceuticas': { path: '/formas-farmaceuticas' },
  'nav.principios_activos': { path: '/principios-activos' },
  'nav.vias_administracion': { path: '/vias-administracion' },
  'nav.proveedores': { path: '/proveedores' },
};
