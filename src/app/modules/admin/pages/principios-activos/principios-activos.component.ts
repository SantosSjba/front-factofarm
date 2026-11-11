import { Component, inject } from '@angular/core';
import { activePrincipleQueryKeys } from '../../../../core/query/active-principle-query.keys';
import {
  CatalogCrudPageComponent,
  catalogList,
  type CatalogCrudConfig,
} from '../../components/catalog-crud-page/catalog-crud-page.component';
import { DirectoryApiService } from '../../services/directory-api.service';

/** Principios activos: catálogo simple sobre la pantalla compartida de catálogos. */
@Component({
  selector: 'app-principios-activos',
  standalone: true,
  imports: [CatalogCrudPageComponent],
  template: `<app-catalog-crud-page [config]="config" />`,
})
export class PrincipiosActivosComponent {
  private readonly api = inject(DirectoryApiService);

  protected readonly config: CatalogCrudConfig = {
    title: 'Principios activos',
    singular: 'principio activo',
    article: 'el',
    newLabel: 'Nuevo principio activo',
    helpStorageKey: 'principios-activos',
    help: [
      'Lista de referencia de principios activos, compartida por todas las farmacias.',
      'En Productos → Farmacia el principio activo se escribe; usa estos nombres para escribirlo siempre igual.',
      'No se puede eliminar un principio activo que figure en algún producto o servicio.'
    ],
    writePermission: 'active-principles.write',
    global: true,
    fields: [
      { key: 'nombre', label: 'Nombre', maxLength: 200, helpText: 'Sustancia que produce el efecto del medicamento.', placeholder: 'Ej.: Paracetamol' }
    ],
    queryKey: activePrincipleQueryKeys.all,
    list: catalogList(this.api.listActivePrinciplesPaged.bind(this.api)),
    create: (b) => this.api.createActivePrinciple({ nombre: b['nombre'] }),
    update: (id, b) => this.api.updateActivePrinciple(id, { nombre: b['nombre'] }),
    remove: (id) => this.api.deleteActivePrinciple(id),
  };
}
