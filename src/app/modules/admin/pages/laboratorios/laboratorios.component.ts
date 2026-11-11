import { Component, inject } from '@angular/core';
import { laboratoryQueryKeys } from '../../../../core/query/laboratory-query.keys';
import {
  CatalogCrudPageComponent,
  catalogList,
  type CatalogCrudConfig,
} from '../../components/catalog-crud-page/catalog-crud-page.component';
import { DirectoryApiService } from '../../services/directory-api.service';

/** Laboratorios: catálogo simple sobre la pantalla compartida de catálogos. */
@Component({
  selector: 'app-laboratorios',
  standalone: true,
  imports: [CatalogCrudPageComponent],
  template: `<app-catalog-crud-page [config]="config" />`,
})
export class LaboratoriosComponent {
  private readonly api = inject(DirectoryApiService);

  protected readonly config: CatalogCrudConfig = {
    title: 'Laboratorios',
    singular: 'laboratorio',
    article: 'el',
    newLabel: 'Nuevo laboratorio',
    helpStorageKey: 'laboratorios',
    help: [
      'Lista de referencia de laboratorios fabricantes, compartida por todas las farmacias.',
      'En Productos, la marca o laboratorio se elige de «Marcas»; usa esta lista para escribir los nombres siempre igual.',
      'No se puede eliminar un laboratorio cuyo nombre figure en algún producto o servicio.'
    ],
    writePermission: 'laboratories.write',
    global: true,
    fields: [
      { key: 'nombre', label: 'Nombre', maxLength: 200, helpText: 'Nombre del laboratorio fabricante, escrito como figura en el empaque.', placeholder: 'Ej.: Laboratorios Portugal' }
    ],
    queryKey: laboratoryQueryKeys.all,
    list: catalogList(this.api.listLaboratoriesPaged.bind(this.api)),
    create: (b) => this.api.createLaboratory({ nombre: b['nombre'] }),
    update: (id, b) => this.api.updateLaboratory(id, { nombre: b['nombre'] }),
    remove: (id) => this.api.deleteLaboratory(id),
  };
}
