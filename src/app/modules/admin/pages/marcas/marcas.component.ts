import { Component, inject } from '@angular/core';
import { brandQueryKeys } from '../../../../core/query/brand-query.keys';
import {
  CatalogCrudPageComponent,
  catalogList,
  type CatalogCrudConfig,
} from '../../components/catalog-crud-page/catalog-crud-page.component';
import { DirectoryApiService } from '../../services/directory-api.service';

/** Marcas: catálogo simple sobre la pantalla compartida de catálogos. */
@Component({
  selector: 'app-marcas',
  standalone: true,
  imports: [CatalogCrudPageComponent],
  template: `<app-catalog-crud-page [config]="config" />`,
})
export class MarcasComponent {
  private readonly api = inject(DirectoryApiService);

  protected readonly config: CatalogCrudConfig = {
    title: 'Marcas',
    singular: 'marca',
    article: 'la',
    newLabel: 'Nueva marca',
    helpStorageKey: 'marcas',
    help: [
      'Aquí registras las marcas o laboratorios fabricantes de lo que vendes.',
      'Se eligen en Productos, Servicios y Packs, en el campo «Marca / Laboratorio», y sirven para filtrar el listado de productos.',
      'Esta lista es solo de tu farmacia. Solo se puede eliminar una marca que ningún producto use.'
    ],
    writePermission: 'brands.write',
    fields: [
      { key: 'nombre', label: 'Nombre', maxLength: 120, helpText: 'Nombre de la marca o del laboratorio que la fabrica. No puede repetirse.', placeholder: 'Ej.: Genfar, Bayer' }
    ],
    queryKey: brandQueryKeys.all,
    list: catalogList(this.api.listBrandsPaged.bind(this.api)),
    create: (b) => this.api.createBrand({ nombre: b['nombre'] }),
    update: (id, b) => this.api.updateBrand(id, { nombre: b['nombre'] }),
    remove: (id) => this.api.deleteBrand(id),
  };
}
