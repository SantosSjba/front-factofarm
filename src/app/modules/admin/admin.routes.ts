import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { permissionGuard } from '../../core/guards/permission.guard';
import { AppLayoutComponent } from '../../shared/layout/app-layout/app-layout.component';
import { ADMIN_ROUTE_PERMISSIONS as P } from './admin-route-permissions';

const guarded = (permissions: readonly string[]) => ({
  canActivate: [permissionGuard],
  data: { permissions: [...permissions] },
});

/**
 * Panel administrativo (layout + rutas protegidas).
 */
export const adminRoutes: Routes = [
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        ...guarded(P.dashboard),
        loadComponent: () =>
          import('./pages/dashboard/dash-admin/dash-admin.component').then(
            (m) => m.DashAdminComponent,
          ),
        title: 'FactoFarm | Dashboard',
      },
      {
        path: 'usuarios',
        ...guarded(P.usuarios),
        loadComponent: () =>
          import('./pages/usuarios/usuarios.component').then(
            (m) => m.UsuariosComponent,
          ),
        title: 'FactoFarm | Usuarios',
      },
      {
        path: 'establecimientos',
        ...guarded(P.establecimientos),
        loadComponent: () =>
          import('./pages/establecimientos/establecimientos.component').then(
            (m) => m.EstablecimientosComponent,
          ),
        title: 'FactoFarm | Establecimientos',
      },
      {
        path: 'clientes',
        ...guarded(P.clientes),
        loadComponent: () =>
          import('./pages/clientes/clientes.component').then(
            (m) => m.ClientesComponent,
          ),
        title: 'FactoFarm | Clientes',
      },
      {
        path: 'tipo-clientes',
        ...guarded(P.tipoClientes),
        loadComponent: () =>
          import('./pages/tipo-clientes/tipo-clientes.component').then(
            (m) => m.TipoClientesComponent,
          ),
        title: 'FactoFarm | Tipos de Clientes',
      },
      {
        path: 'productos',
        ...guarded(P.productos),
        loadComponent: () =>
          import('./pages/productos/productos.component').then((m) => m.ProductosComponent),
        title: 'FactoFarm | Productos',
      },
      {
        path: 'conjuntos-packs-promociones',
        ...guarded(P.conjuntosPacks),
        loadComponent: () =>
          import('./pages/conjuntos-packs-promociones/conjuntos-packs-promociones.component').then(
            (m) => m.ConjuntosPacksPromocionesComponent,
          ),
        title: 'FactoFarm | Conjuntos/Packs/Promociones',
      },
      {
        path: 'servicios',
        ...guarded(P.servicios),
        loadComponent: () =>
          import('./pages/servicios/servicios.component').then((m) => m.ServiciosComponent),
        title: 'FactoFarm | Servicios',
      },
      {
        path: 'categorias',
        ...guarded(P.categorias),
        loadComponent: () =>
          import('./pages/categorias/categorias.component').then((m) => m.CategoriasComponent),
        title: 'FactoFarm | Categorías',
      },
      {
        path: 'marcas',
        ...guarded(P.marcas),
        loadComponent: () =>
          import('./pages/marcas/marcas.component').then((m) => m.MarcasComponent),
        title: 'FactoFarm | Marcas',
      },
      {
        path: 'laboratorios',
        ...guarded(P.laboratorios),
        loadComponent: () =>
          import('./pages/laboratorios/laboratorios.component').then((m) => m.LaboratoriosComponent),
        title: 'FactoFarm | Laboratorios',
      },
      {
        path: 'unidades',
        ...guarded(P.unidades),
        loadComponent: () =>
          import('./pages/unidades/unidades.component').then((m) => m.UnidadesComponent),
        title: 'FactoFarm | Unidades',
      },
      {
        path: 'formas-farmaceuticas',
        ...guarded(P.formasFarmaceuticas),
        loadComponent: () =>
          import('./pages/formas-farmaceuticas/formas-farmaceuticas.component').then(
            (m) => m.FormasFarmaceuticasComponent,
          ),
        title: 'FactoFarm | Formas farmacéuticas',
      },
      {
        path: 'principios-activos',
        ...guarded(P.principiosActivos),
        loadComponent: () =>
          import('./pages/principios-activos/principios-activos.component').then(
            (m) => m.PrincipiosActivosComponent,
          ),
        title: 'FactoFarm | Principios activos',
      },
      {
        path: 'vias-administracion',
        ...guarded(P.viasAdministracion),
        loadComponent: () =>
          import('./pages/vias-administracion/vias-administracion.component').then(
            (m) => m.ViasAdministracionComponent,
          ),
        title: 'FactoFarm | Vías de administración',
      },
      {
        path: 'proveedores',
        ...guarded(P.proveedores),
        loadComponent: () =>
          import('./pages/proveedores/proveedores.component').then((m) => m.ProveedoresComponent),
        title: 'FactoFarm | Proveedores',
      },
      {
        path: 'ordenes-compra',
        ...guarded(P.ordenesCompra),
        loadComponent: () =>
          import('./pages/ordenes-compra/ordenes-compra.component').then((m) => m.OrdenesCompraComponent),
        title: 'FactoFarm | Órdenes de compra',
      },
      {
        path: 'recepcion-mercaderia',
        ...guarded(P.recepcionMercaderia),
        loadComponent: () =>
          import('./pages/recepcion-mercaderia/recepcion-mercaderia.component').then(
            (m) => m.RecepcionMercaderiaComponent,
          ),
        title: 'FactoFarm | Recepción mercadería',
      },
      {
        path: 'reporte-compras-sugerido',
        ...guarded(P.reporteComprasSugerido),
        loadComponent: () =>
          import('./pages/reporte-compras-sugerido/reporte-compras-sugerido.component').then(
            (m) => m.ReporteComprasSugeridoComponent,
          ),
        title: 'FactoFarm | Sugerido de compras',
      },
      {
        path: 'comparativo-precios',
        ...guarded(P.comparativoPrecios),
        loadComponent: () =>
          import('./pages/comparativo-precios/comparativo-precios.component').then(
            (m) => m.ComparativoPreciosComponent,
          ),
        title: 'FactoFarm | Comparativo precios',
      },
      {
        path: 'series',
        ...guarded(P.series),
        loadComponent: () =>
          import('./pages/series/series.component').then((m) => m.SeriesComponent),
        title: 'FactoFarm | Series',
      },
      {
        path: 'zonas',
        ...guarded(P.zonas),
        loadComponent: () =>
          import('./pages/zonas/zonas.component').then((m) => m.ZonasComponent),
        title: 'FactoFarm | Zonas',
      },
      {
        path: 'importar-precios',
        ...guarded(P.importarPrecios),
        loadComponent: () =>
          import('./pages/importar-precios/importar-precios.component').then(
            (m) => m.ImportarPreciosComponent,
          ),
        title: 'FactoFarm | Importar Precios',
      },
      {
        path: 'punto-venta',
        ...guarded(P.puntoVenta),
        loadComponent: () =>
          import('./pages/punto-venta/punto-venta.component').then((m) => m.PuntoVentaComponent),
        title: 'FactoFarm | Punto de Venta',
      },
      {
        path: 'caja-chica-pos',
        ...guarded(P.cajaChicaPos),
        loadComponent: () =>
          import('./pages/caja-chica-pos/caja-chica-pos.component').then(
            (m) => m.CajaChicaPosComponent,
          ),
        title: 'FactoFarm | Caja Chica POS',
      },
      {
        path: 'comprobante-electronico',
        ...guarded(P.comprobanteElectronico),
        loadComponent: () =>
          import('./pages/comprobante-electronico/comprobante-electronico.component').then(
            (m) => m.ComprobanteElectronicoComponent,
          ),
        title: 'FactoFarm | Comprobante electrónico',
      },
      {
        path: 'notas-venta',
        ...guarded(P.notasVenta),
        loadComponent: () =>
          import('./pages/notas-venta/notas-venta.component').then((m) => m.NotasVentaComponent),
        title: 'FactoFarm | Notas de venta',
      },
      {
        path: 'resumenes',
        ...guarded(P.resumenes),
        loadComponent: () =>
          import('./pages/resumenes/resumenes.component').then((m) => m.ResumenesComponent),
        title: 'FactoFarm | Resúmenes',
      },
      {
        path: 'anulaciones',
        ...guarded(P.anulaciones),
        loadComponent: () =>
          import('./pages/anulaciones/anulaciones.component').then((m) => m.AnulacionesComponent),
        title: 'FactoFarm | Anulaciones',
      },
      {
        path: 'cotizaciones',
        ...guarded(P.cotizaciones),
        loadComponent: () =>
          import('./pages/cotizaciones/cotizaciones.component').then((m) => m.CotizacionesComponent),
        title: 'FactoFarm | Cotizaciones',
      },
      {
        path: 'inventario-movimientos',
        ...guarded(P.inventarioMovimientos),
        loadComponent: () =>
          import('./pages/inventario-movimientos/inventario-movimientos.component').then(
            (m) => m.InventarioMovimientosComponent,
          ),
        title: 'FactoFarm | Movimientos de Inventario',
      },
      {
        path: 'traslados',
        ...guarded(P.traslados),
        loadComponent: () =>
          import('./pages/traslados/traslados.component').then((m) => m.TrasladosComponent),
        title: 'FactoFarm | Traslados',
      },
      {
        path: 'devolucion-retiro',
        ...guarded(P.devolucionRetiro),
        loadComponent: () =>
          import('./pages/devolucion-retiro/devolucion-retiro.component').then(
            (m) => m.DevolucionRetiroComponent,
          ),
        title: 'FactoFarm | Devolución-retiro',
      },
      {
        path: 'reporte-kardex',
        ...guarded(P.reporteKardex),
        loadComponent: () =>
          import('./pages/reporte-kardex/reporte-kardex.component').then(
            (m) => m.ReporteKardexComponent,
          ),
        title: 'FactoFarm | Reporte Kardex',
      },
      {
        path: 'reporte-inventario',
        ...guarded(P.reporteInventario),
        loadComponent: () =>
          import('./pages/reporte-inventario/reporte-inventario.component').then(
            (m) => m.ReporteInventarioComponent,
          ),
        title: 'FactoFarm | Reporte Inventario',
      },
      {
        path: 'kardex-valorizado',
        ...guarded(P.kardexValorizado),
        loadComponent: () =>
          import('./pages/kardex-valorizado/kardex-valorizado.component').then(
            (m) => m.KardexValorizadoComponent,
          ),
        title: 'FactoFarm | Kardex valorizado',
      },
      {
        path: 'lotes',
        ...guarded(P.lotes),
        loadComponent: () => import('./pages/lotes/lotes.component').then((m) => m.LotesComponent),
        title: 'FactoFarm | Lotes',
      },
      {
        path: 'salida-venta-lotes',
        ...guarded(P.salidaVentaLotes),
        loadComponent: () =>
          import('./pages/salida-venta-lotes/salida-venta-lotes.component').then(
            (m) => m.SalidaVentaLotesComponent,
          ),
        title: 'FactoFarm | Salida venta (lotes)',
      },
      {
        path: 'cadena-frio',
        ...guarded(P.cadenaFrio),
        loadComponent: () =>
          import('./pages/cadena-frio/cadena-frio.component').then((m) => m.CadenaFrioComponent),
        title: 'FactoFarm | Cadena de frío',
      },
      {
        path: 'retenciones',
        ...guarded(P.retenciones),
        loadComponent: () =>
          import('./pages/retenciones/retenciones.component').then((m) => m.RetencionesComponent),
        title: 'FactoFarm | Retenciones',
      },
      {
        path: 'percepciones',
        ...guarded(P.percepciones),
        loadComponent: () =>
          import('./pages/percepciones/percepciones.component').then((m) => m.PercepcionesComponent),
        title: 'FactoFarm | Percepciones',
      },
      {
        path: 'ordenes-pedido',
        ...guarded(P.ordenesPedido),
        loadComponent: () =>
          import('./pages/ordenes-pedido/ordenes-pedido.component').then(
            (m) => m.OrdenesPedidoComponent,
          ),
        title: 'FactoFarm | Órdenes de pedido',
      },
      {
        path: 'gr-remitente',
        ...guarded(P.grRemitente),
        loadComponent: () =>
          import('./pages/gr-remitente/gr-remitente.component').then((m) => m.GrRemitenteComponent),
        title: 'FactoFarm | G.R. Remitente',
      },
      {
        path: 'gr-transportista',
        ...guarded(P.grTransportista),
        loadComponent: () =>
          import('./pages/gr-transportista/gr-transportista.component').then(
            (m) => m.GrTransportistaComponent,
          ),
        title: 'FactoFarm | G.R. Transportista',
      },
      {
        path: 'transportistas',
        ...guarded(P.transportistas),
        loadComponent: () =>
          import('./pages/transportistas/transportistas.component').then(
            (m) => m.TransportistasComponent,
          ),
        title: 'FactoFarm | Transportistas',
      },
      {
        path: 'conductores',
        ...guarded(P.conductores),
        loadComponent: () =>
          import('./pages/conductores/conductores.component').then((m) => m.ConductoresComponent),
        title: 'FactoFarm | Conductores',
      },
      {
        path: 'vehiculos',
        ...guarded(P.vehiculos),
        loadComponent: () =>
          import('./pages/vehiculos/vehiculos.component').then((m) => m.VehiculosComponent),
        title: 'FactoFarm | Vehículos',
      },
      {
        path: 'direcciones-partida',
        ...guarded(P.direccionesPartida),
        loadComponent: () =>
          import('./pages/direcciones-partida/direcciones-partida.component').then(
            (m) => m.DireccionesPartidaComponent,
          ),
        title: 'FactoFarm | Direcciones de partida',
      },
      {
        path: 'reportes',
        ...guarded(P.reportes),
        loadComponent: () =>
          import('./pages/reportes/reportes.component').then((m) => m.ReportesComponent),
        title: 'FactoFarm | Reportes',
      },
      {
        path: 'contabilidad-exportar-reporte',
        ...guarded(P.contabilidadExportarReporte),
        loadComponent: () =>
          import('./pages/contabilidad-exportar-reporte/contabilidad-exportar-reporte.component').then(
            (m) => m.ContabilidadExportarReporteComponent,
          ),
        title: 'FactoFarm | Contabilidad - Exportar Reporte',
      },
      {
        path: 'contabilidad-resumen-venta',
        ...guarded(P.contabilidadResumenVenta),
        loadComponent: () =>
          import('./pages/contabilidad-resumen-venta/contabilidad-resumen-venta.component').then(
            (m) => m.ContabilidadResumenVentaComponent,
          ),
        title: 'FactoFarm | Contabilidad - Resumen de venta',
      },
      {
        path: 'contabilidad-exportar-formatos',
        ...guarded(P.contabilidadExportarFormatos),
        loadComponent: () =>
          import('./pages/contabilidad-exportar-formatos/contabilidad-exportar-formatos.component').then(
            (m) => m.ContabilidadExportarFormatosComponent,
          ),
        title: 'FactoFarm | Contabilidad - Exportar formatos',
      },
      {
        path: 'contabilidad-reporte-resumido',
        ...guarded(P.contabilidadReporteResumido),
        loadComponent: () =>
          import('./pages/contabilidad-reporte-resumido/contabilidad-reporte-resumido.component').then(
            (m) => m.ContabilidadReporteResumidoComponent,
          ),
        title: 'FactoFarm | Contabilidad - Reporte resumido',
      },
      {
        path: 'libro-mayor',
        ...guarded(P.libroMayor),
        loadComponent: () =>
          import('./pages/libro-mayor/libro-mayor.component').then((m) => m.LibroMayorComponent),
        title: 'FactoFarm | Libro Mayor',
      },
      {
        path: 'sire-ventas',
        ...guarded(P.sireVentas),
        loadComponent: () =>
          import('./pages/sire-ventas/sire-ventas.component').then((m) => m.SireVentasComponent),
        title: 'FactoFarm | SIRE Ventas',
      },
      {
        path: 'sire-compras',
        ...guarded(P.sireCompras),
        loadComponent: () =>
          import('./pages/sire-compras/sire-compras.component').then((m) => m.SireComprasComponent),
        title: 'FactoFarm | SIRE Compras',
      },
      {
        path: 'finanzas-movimientos',
        ...guarded(P.finanzasMovimientos),
        loadComponent: () =>
          import('./pages/finanzas-movimientos/finanzas-movimientos.component').then(
            (m) => m.FinanzasMovimientosComponent,
          ),
        title: 'FactoFarm | Finanzas - Movimientos',
      },
      {
        path: 'transacciones',
        ...guarded(P.transacciones),
        loadComponent: () =>
          import('./pages/transacciones/transacciones.component').then(
            (m) => m.TransaccionesComponent,
          ),
        title: 'FactoFarm | Transacciones',
      },
      {
        path: 'finanzas-ingresos',
        ...guarded(P.finanzasIngresos),
        loadComponent: () =>
          import('./pages/finanzas-ingresos/finanzas-ingresos.component').then(
            (m) => m.FinanzasIngresosComponent,
          ),
        title: 'FactoFarm | Finanzas - Ingresos',
      },
      {
        path: 'cuentas-cobrar',
        ...guarded(P.cuentasCobrar),
        loadComponent: () =>
          import('./pages/cuentas-cobrar/cuentas-cobrar.component').then(
            (m) => m.CuentasCobrarComponent,
          ),
        title: 'FactoFarm | Cuentas por cobrar',
      },
      {
        path: 'cuentas-pagar',
        ...guarded(P.cuentasPagar),
        loadComponent: () =>
          import('./pages/cuentas-pagar/cuentas-pagar.component').then(
            (m) => m.CuentasPagarComponent,
          ),
        title: 'FactoFarm | Cuentas por pagar',
      },
      {
        path: 'pagos',
        ...guarded(P.pagos),
        loadComponent: () =>
          import('./pages/pagos/pagos.component').then((m) => m.PagosComponent),
        title: 'FactoFarm | Pagos',
      },
      {
        path: 'balance',
        ...guarded(P.balance),
        loadComponent: () =>
          import('./pages/balance/balance.component').then((m) => m.BalanceComponent),
        title: 'FactoFarm | Balance',
      },
      {
        path: 'ingresos-egresos-medio-pago',
        ...guarded(P.ingresosEgresosMedioPago),
        loadComponent: () =>
          import('./pages/ingresos-egresos-medio-pago/ingresos-egresos-medio-pago.component').then(
            (m) => m.IngresosEgresosMedioPagoComponent,
          ),
        title: 'FactoFarm | Ingresos y Egresos M. pago',
      },
      {
        path: 'reporte-digemid',
        ...guarded(P.reporteDigemid),
        loadComponent: () =>
          import('./pages/reporte-digemid/reporte-digemid.component').then(
            (m) => m.ReporteDigemidComponent,
          ),
        title: 'FactoFarm | Reporte Digemid',
      },
      {
        path: 'medicos',
        ...guarded(P.medicos),
        loadComponent: () =>
          import('./pages/medicos/medicos.component').then((m) => m.MedicosComponent),
        title: 'FactoFarm | Médicos',
      },
      {
        path: 'cie-10',
        ...guarded(P.cie10),
        loadComponent: () =>
          import('./pages/cie-10/cie-10.component').then((m) => m.Cie10Component),
        title: 'FactoFarm | CIE 10',
      },
      {
        path: 'reporte-psicotropicos-estupefacientes',
        ...guarded(P.reportePsicotropicos),
        loadComponent: () =>
          import(
            './pages/reporte-psicotropicos-estupefacientes/reporte-psicotropicos-estupefacientes.component'
          ).then((m) => m.ReportePsicotropicosEstupefacientesComponent),
        title: 'FactoFarm | Reporte psicotrópicos y estupefacientes',
      },
      {
        path: 'recepcion-productos-farmaceuticos',
        ...guarded(P.recepcionProductosFarmaceuticos),
        loadComponent: () =>
          import(
            './pages/recepcion-productos-farmaceuticos/recepcion-productos-farmaceuticos.component'
          ).then((m) => m.RecepcionProductosFarmaceuticosComponent),
        title: 'FactoFarm | Recepción productos farmacéuticos',
      },
    ],
  },
];
