import { Component, inject } from '@angular/core';
import { pharmaceuticalFormQueryKeys } from '../../../../core/query/pharmaceutical-form-query.keys';
import {
  CatalogCrudPageComponent,
  catalogList,
  type CatalogCrudConfig,
} from '../../components/catalog-crud-page/catalog-crud-page.component';
import { DirectoryApiService } from '../../services/directory-api.service';

/** Formas farmacéuticas: catálogo simple sobre la pantalla compartida de catálogos. */
@Component({
  selector: 'app-formas-farmaceuticas',
  standalone: true,
  imports: [CatalogCrudPageComponent],
  template: `<app-catalog-crud-page [config]="config" />`,
})
export class FormasFarmaceuticasComponent {
  private readonly api = inject(DirectoryApiService);

  protected readonly config: CatalogCrudConfig = {
    title: 'Formas farmacéuticas',
    singular: 'forma farmacéutica',
    article: 'la',
    newLabel: 'Nueva forma farmacéutica',
    helpStorageKey: 'formas-farmaceuticas',
    help: [
      'Lista de referencia de formas farmacéuticas (tableta, jarabe, ampolla…), compartida por todas las farmacias.',
      'En Productos → Farmacia la forma se escribe; usa estos nombres para escribirla siempre igual.',
      'No se puede eliminar una forma que figure en algún producto o servicio.'
    ],
    writePermission: 'pharma-forms.write',
    global: true,
    fields: [
      { key: 'nombre', label: 'Nombre', maxLength: 200, helpText: 'Cómo se presenta el medicamento.', placeholder: 'Ej.: Tableta recubierta, Jarabe' }
    ],
    queryKey: pharmaceuticalFormQueryKeys.all,
    list: catalogList(this.api.listPharmaceuticalFormsPaged.bind(this.api)),
    create: (b) => this.api.createPharmaceuticalForm({ nombre: b['nombre'] }),
    update: (id, b) => this.api.updatePharmaceuticalForm(id, { nombre: b['nombre'] }),
    remove: (id) => this.api.deletePharmaceuticalForm(id),
  };
}
