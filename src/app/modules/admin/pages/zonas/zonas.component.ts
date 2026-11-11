import { Component, inject } from '@angular/core';
import { zoneQueryKeys } from '../../../../core/query/zone-query.keys';
import {
  CatalogCrudPageComponent,
  catalogListFromArray,
  type CatalogCrudConfig,
} from '../../components/catalog-crud-page/catalog-crud-page.component';
import { DirectoryApiService } from '../../services/directory-api.service';

/** Zonas de clientes: catálogo simple sobre la pantalla compartida de catálogos. */
@Component({
  selector: 'app-zonas',
  standalone: true,
  imports: [CatalogCrudPageComponent],
  template: `<app-catalog-crud-page [config]="config" />`,
})
export class ZonasComponent {
  private readonly api = inject(DirectoryApiService);

  protected readonly config: CatalogCrudConfig = {
    title: 'Zonas',
    singular: 'zona',
    article: 'la',
    newLabel: 'Nueva zona',
    helpStorageKey: 'zonas',
    help: [
      'Las zonas agrupan a tus clientes por sector o distrito, por ejemplo para organizar el reparto o la cobranza.',
      'La zona de cada cliente se elige en Clientes, y ahí también puedes filtrar el listado por zona.',
      'Esta lista es solo de tu farmacia. No se puede eliminar una zona que tenga clientes.',
    ],
    writePermission: 'nav.zonas',
    showCreatedAt: false,
    fields: [
      { key: 'nombre', label: 'Nombre', maxLength: 120, helpText: 'Nombre de la zona o sector. Se guarda en mayúsculas.', placeholder: 'Ej.: Cercado, Zona norte' },
    ],
    queryKey: zoneQueryKeys.all,
    list: catalogListFromArray(() => this.api.listCustomerZones(), ['nombre']),
    create: (b) => this.api.createCustomerZone(b['nombre']),
    update: (id, b) => this.api.updateCustomerZone(id, b['nombre']),
    remove: (id) => this.api.deleteCustomerZone(id),
  };
}
