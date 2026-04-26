import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { AppLayoutComponent } from '../../shared/layout/app-layout/app-layout.component';

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
        loadComponent: () =>
          import('./pages/dashboard/dash-admin/dash-admin.component').then(
            (m) => m.DashAdminComponent,
          ),
        title: 'FactoFarm | Dashboard',
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./pages/usuarios/usuarios.component').then(
            (m) => m.UsuariosComponent,
          ),
        title: 'FactoFarm | Usuarios',
      },
      {
        path: 'establecimientos',
        loadComponent: () =>
          import('./pages/establecimientos/establecimientos.component').then(
            (m) => m.EstablecimientosComponent,
          ),
        title: 'FactoFarm | Establecimientos',
      },
      {
        path: 'clientes',
        loadComponent: () =>
          import('./pages/clientes/clientes.component').then(
            (m) => m.ClientesComponent,
          ),
        title: 'FactoFarm | Clientes',
      },
      {
        path: 'tipo-clientes',
        loadComponent: () =>
          import('./pages/tipo-clientes/tipo-clientes.component').then(
            (m) => m.TipoClientesComponent,
          ),
        title: 'FactoFarm | Tipos de Clientes',
      },
      {
        path: 'productos',
        loadComponent: () =>
          import('./pages/productos/productos.component').then((m) => m.ProductosComponent),
        title: 'FactoFarm | Productos',
      },
      {
        path: 'conjuntos-packs-promociones',
        loadComponent: () =>
          import('./pages/conjuntos-packs-promociones/conjuntos-packs-promociones.component').then(
            (m) => m.ConjuntosPacksPromocionesComponent,
          ),
        title: 'FactoFarm | Conjuntos/Packs/Promociones',
      },
      {
        path: 'servicios',
        loadComponent: () =>
          import('./pages/servicios/servicios.component').then((m) => m.ServiciosComponent),
        title: 'FactoFarm | Servicios',
      },
      {
        path: 'categorias',
        loadComponent: () =>
          import('./pages/categorias/categorias.component').then((m) => m.CategoriasComponent),
        title: 'FactoFarm | Categorías',
      },
      {
        path: 'marcas',
        loadComponent: () =>
          import('./pages/marcas/marcas.component').then((m) => m.MarcasComponent),
        title: 'FactoFarm | Marcas',
      },
      {
        path: 'series',
        loadComponent: () =>
          import('./pages/series/series.component').then((m) => m.SeriesComponent),
        title: 'FactoFarm | Series',
      },
      {
        path: 'zonas',
        loadComponent: () =>
          import('./pages/zonas/zonas.component').then((m) => m.ZonasComponent),
        title: 'FactoFarm | Zonas',
      },
      {
        path: 'importar-precios',
        loadComponent: () =>
          import('./pages/importar-precios/importar-precios.component').then(
            (m) => m.ImportarPreciosComponent,
          ),
        title: 'FactoFarm | Importar Precios',
      },
      {
        path: 'punto-venta',
        loadComponent: () =>
          import('./pages/punto-venta/punto-venta.component').then((m) => m.PuntoVentaComponent),
        title: 'FactoFarm | Punto de Venta',
      },
      {
        path: 'caja-chica-pos',
        loadComponent: () =>
          import('./pages/caja-chica-pos/caja-chica-pos.component').then(
            (m) => m.CajaChicaPosComponent,
          ),
        title: 'FactoFarm | Caja Chica POS',
      },
      {
        path: 'comprobante-electronico',
        loadComponent: () =>
          import('./pages/comprobante-electronico/comprobante-electronico.component').then(
            (m) => m.ComprobanteElectronicoComponent,
          ),
        title: 'FactoFarm | Comprobante electrónico',
      },
      {
        path: 'notas-venta',
        loadComponent: () =>
          import('./pages/notas-venta/notas-venta.component').then((m) => m.NotasVentaComponent),
        title: 'FactoFarm | Notas de venta',
      },
      {
        path: 'resumenes',
        loadComponent: () =>
          import('./pages/resumenes/resumenes.component').then((m) => m.ResumenesComponent),
        title: 'FactoFarm | Resúmenes',
      },
      {
        path: 'anulaciones',
        loadComponent: () =>
          import('./pages/anulaciones/anulaciones.component').then((m) => m.AnulacionesComponent),
        title: 'FactoFarm | Anulaciones',
      },
      {
        path: 'cotizaciones',
        loadComponent: () =>
          import('./pages/cotizaciones/cotizaciones.component').then((m) => m.CotizacionesComponent),
        title: 'FactoFarm | Cotizaciones',
      },
      {
        path: 'inventario-movimientos',
        loadComponent: () =>
          import('./pages/inventario-movimientos/inventario-movimientos.component').then(
            (m) => m.InventarioMovimientosComponent,
          ),
        title: 'FactoFarm | Movimientos de Inventario',
      },
      {
        path: 'traslados',
        loadComponent: () =>
          import('./pages/traslados/traslados.component').then((m) => m.TrasladosComponent),
        title: 'FactoFarm | Traslados',
      },
      {
        path: 'devolucion-retiro',
        loadComponent: () =>
          import('./pages/devolucion-retiro/devolucion-retiro.component').then(
            (m) => m.DevolucionRetiroComponent,
          ),
        title: 'FactoFarm | Devolución-retiro',
      },
      {
        path: 'reporte-kardex',
        loadComponent: () =>
          import('./pages/reporte-kardex/reporte-kardex.component').then(
            (m) => m.ReporteKardexComponent,
          ),
        title: 'FactoFarm | Reporte Kardex',
      },
      {
        path: 'reporte-inventario',
        loadComponent: () =>
          import('./pages/reporte-inventario/reporte-inventario.component').then(
            (m) => m.ReporteInventarioComponent,
          ),
        title: 'FactoFarm | Reporte Inventario',
      },
      {
        path: 'kardex-valorizado',
        loadComponent: () =>
          import('./pages/kardex-valorizado/kardex-valorizado.component').then(
            (m) => m.KardexValorizadoComponent,
          ),
        title: 'FactoFarm | Kardex valorizado',
      },
      {
        path: 'lotes',
        loadComponent: () => import('./pages/lotes/lotes.component').then((m) => m.LotesComponent),
        title: 'FactoFarm | Lotes',
      },
      {
        path: 'retenciones',
        loadComponent: () =>
          import('./pages/retenciones/retenciones.component').then((m) => m.RetencionesComponent),
        title: 'FactoFarm | Retenciones',
      },
      {
        path: 'percepciones',
        loadComponent: () =>
          import('./pages/percepciones/percepciones.component').then((m) => m.PercepcionesComponent),
        title: 'FactoFarm | Percepciones',
      },
      {
        path: 'ordenes-pedido',
        loadComponent: () =>
          import('./pages/ordenes-pedido/ordenes-pedido.component').then(
            (m) => m.OrdenesPedidoComponent,
          ),
        title: 'FactoFarm | Órdenes de pedido',
      },
      {
        path: 'gr-remitente',
        loadComponent: () =>
          import('./pages/gr-remitente/gr-remitente.component').then((m) => m.GrRemitenteComponent),
        title: 'FactoFarm | G.R. Remitente',
      },
      {
        path: 'gr-transportista',
        loadComponent: () =>
          import('./pages/gr-transportista/gr-transportista.component').then(
            (m) => m.GrTransportistaComponent,
          ),
        title: 'FactoFarm | G.R. Transportista',
      },
      {
        path: 'transportistas',
        loadComponent: () =>
          import('./pages/transportistas/transportistas.component').then(
            (m) => m.TransportistasComponent,
          ),
        title: 'FactoFarm | Transportistas',
      },
      {
        path: 'conductores',
        loadComponent: () =>
          import('./pages/conductores/conductores.component').then((m) => m.ConductoresComponent),
        title: 'FactoFarm | Conductores',
      },
      {
        path: 'vehiculos',
        loadComponent: () =>
          import('./pages/vehiculos/vehiculos.component').then((m) => m.VehiculosComponent),
        title: 'FactoFarm | Vehículos',
      },
      {
        path: 'direcciones-partida',
        loadComponent: () =>
          import('./pages/direcciones-partida/direcciones-partida.component').then(
            (m) => m.DireccionesPartidaComponent,
          ),
        title: 'FactoFarm | Direcciones de partida',
      },
      {
        path: 'reportes',
        loadComponent: () =>
          import('./pages/reportes/reportes.component').then((m) => m.ReportesComponent),
        title: 'FactoFarm | Reportes',
      },
      {
        path: 'contabilidad-exportar-reporte',
        loadComponent: () =>
          import('./pages/contabilidad-exportar-reporte/contabilidad-exportar-reporte.component').then(
            (m) => m.ContabilidadExportarReporteComponent,
          ),
        title: 'FactoFarm | Contabilidad - Exportar Reporte',
      },
      {
        path: 'contabilidad-resumen-venta',
        loadComponent: () =>
          import('./pages/contabilidad-resumen-venta/contabilidad-resumen-venta.component').then(
            (m) => m.ContabilidadResumenVentaComponent,
          ),
        title: 'FactoFarm | Contabilidad - Resumen de venta',
      },
      {
        path: 'contabilidad-exportar-formatos',
        loadComponent: () =>
          import('./pages/contabilidad-exportar-formatos/contabilidad-exportar-formatos.component').then(
            (m) => m.ContabilidadExportarFormatosComponent,
          ),
        title: 'FactoFarm | Contabilidad - Exportar formatos',
      },
      {
        path: 'contabilidad-reporte-resumido',
        loadComponent: () =>
          import('./pages/contabilidad-reporte-resumido/contabilidad-reporte-resumido.component').then(
            (m) => m.ContabilidadReporteResumidoComponent,
          ),
        title: 'FactoFarm | Contabilidad - Reporte resumido',
      },
      {
        path: 'libro-mayor',
        loadComponent: () =>
          import('./pages/libro-mayor/libro-mayor.component').then((m) => m.LibroMayorComponent),
        title: 'FactoFarm | Libro Mayor',
      },
      {
        path: 'sire-ventas',
        loadComponent: () =>
          import('./pages/sire-ventas/sire-ventas.component').then((m) => m.SireVentasComponent),
        title: 'FactoFarm | SIRE Ventas',
      },
      {
        path: 'sire-compras',
        loadComponent: () =>
          import('./pages/sire-compras/sire-compras.component').then((m) => m.SireComprasComponent),
        title: 'FactoFarm | SIRE Compras',
      },
      {
        path: 'finanzas-movimientos',
        loadComponent: () =>
          import('./pages/finanzas-movimientos/finanzas-movimientos.component').then(
            (m) => m.FinanzasMovimientosComponent,
          ),
        title: 'FactoFarm | Finanzas - Movimientos',
      },
      {
        path: 'transacciones',
        loadComponent: () =>
          import('./pages/transacciones/transacciones.component').then(
            (m) => m.TransaccionesComponent,
          ),
        title: 'FactoFarm | Transacciones',
      },
      {
        path: 'finanzas-ingresos',
        loadComponent: () =>
          import('./pages/finanzas-ingresos/finanzas-ingresos.component').then(
            (m) => m.FinanzasIngresosComponent,
          ),
        title: 'FactoFarm | Finanzas - Ingresos',
      },
      {
        path: 'cuentas-cobrar',
        loadComponent: () =>
          import('./pages/cuentas-cobrar/cuentas-cobrar.component').then(
            (m) => m.CuentasCobrarComponent,
          ),
        title: 'FactoFarm | Cuentas por cobrar',
      },
      {
        path: 'cuentas-pagar',
        loadComponent: () =>
          import('./pages/cuentas-pagar/cuentas-pagar.component').then(
            (m) => m.CuentasPagarComponent,
          ),
        title: 'FactoFarm | Cuentas por pagar',
      },
      {
        path: 'pagos',
        loadComponent: () =>
          import('./pages/pagos/pagos.component').then((m) => m.PagosComponent),
        title: 'FactoFarm | Pagos',
      },
      {
        path: 'balance',
        loadComponent: () =>
          import('./pages/balance/balance.component').then((m) => m.BalanceComponent),
        title: 'FactoFarm | Balance',
      },
      {
        path: 'ingresos-egresos-medio-pago',
        loadComponent: () =>
          import('./pages/ingresos-egresos-medio-pago/ingresos-egresos-medio-pago.component').then(
            (m) => m.IngresosEgresosMedioPagoComponent,
          ),
        title: 'FactoFarm | Ingresos y Egresos M. pago',
      },
      {
        path: 'reporte-digemid',
        loadComponent: () =>
          import('./pages/reporte-digemid/reporte-digemid.component').then(
            (m) => m.ReporteDigemidComponent,
          ),
        title: 'FactoFarm | Reporte Digemid',
      },
      {
        path: 'medicos',
        loadComponent: () =>
          import('./pages/medicos/medicos.component').then((m) => m.MedicosComponent),
        title: 'FactoFarm | Médicos',
      },
      {
        path: 'cie-10',
        loadComponent: () =>
          import('./pages/cie-10/cie-10.component').then((m) => m.Cie10Component),
        title: 'FactoFarm | CIE 10',
      },
      {
        path: 'reporte-psicotropicos-estupefacientes',
        loadComponent: () =>
          import(
            './pages/reporte-psicotropicos-estupefacientes/reporte-psicotropicos-estupefacientes.component'
          ).then((m) => m.ReportePsicotropicosEstupefacientesComponent),
        title: 'FactoFarm | Reporte psicotrópicos y estupefacientes',
      },
      {
        path: 'recepcion-productos-farmaceuticos',
        loadComponent: () =>
          import(
            './pages/recepcion-productos-farmaceuticos/recepcion-productos-farmaceuticos.component'
          ).then((m) => m.RecepcionProductosFarmaceuticosComponent),
        title: 'FactoFarm | Recepción productos farmacéuticos',
      },
    ],
  },
];
