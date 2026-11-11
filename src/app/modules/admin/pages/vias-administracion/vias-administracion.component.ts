import { Component, inject } from '@angular/core';
import { administrationRouteQueryKeys } from '../../../../core/query/administration-route-query.keys';
import {
  CatalogCrudPageComponent,
  catalogList,
  type CatalogCrudConfig,
} from '../../components/catalog-crud-page/catalog-crud-page.component';
import { DirectoryApiService } from '../../services/directory-api.service';

/** Vías de administración: catálogo simple sobre la pantalla compartida de catálogos. */
@Component({
  selector: 'app-vias-administracion',
  standalone: true,
  imports: [CatalogCrudPageComponent],
  template: `<app-catalog-crud-page [config]="config" />`,
})
export class ViasAdministracionComponent {
  private readonly api = inject(DirectoryApiService);

  protected readonly config: CatalogCrudConfig = {
    title: 'Vías de administración',
    singular: 'vía de administración',
    article: 'la',
    newLabel: 'Nueva vía de administración',
    helpStorageKey: 'vias-administracion',
    help: [
      'Lista de referencia de vías de administración (oral, tópica, intramuscular…), compartida por todas las farmacias.',
      'Por ahora ninguna pantalla la pide al registrar productos: queda lista para usarla más adelante.',
      'No se puede eliminar una vía que algún producto use.'
    ],
    writePermission: 'admin-routes.write',
    global: true,
    fields: [
      { key: 'nombre', label: 'Nombre', maxLength: 120, helpText: 'Por dónde se aplica el medicamento.', placeholder: 'Ej.: Oral, Intramuscular' }
    ],
    queryKey: administrationRouteQueryKeys.all,
    list: catalogList(this.api.listAdministrationRoutesPaged.bind(this.api)),
    create: (b) => this.api.createAdministrationRoute({ nombre: b['nombre'] }),
    update: (id, b) => this.api.updateAdministrationRoute(id, { nombre: b['nombre'] }),
    remove: (id) => this.api.deleteAdministrationRoute(id),
  };
}
