import { Component, inject } from '@angular/core';
import { unitQueryKeys } from '../../../../core/query/unit-query.keys';
import {
  CatalogCrudPageComponent,
  catalogList,
  type CatalogCrudConfig,
} from '../../components/catalog-crud-page/catalog-crud-page.component';
import { DirectoryApiService } from '../../services/directory-api.service';

/** Unidades: catálogo simple sobre la pantalla compartida de catálogos. */
@Component({
  selector: 'app-unidades',
  standalone: true,
  imports: [CatalogCrudPageComponent],
  template: `<app-catalog-crud-page [config]="config" />`,
})
export class UnidadesComponent {
  private readonly api = inject(DirectoryApiService);

  protected readonly config: CatalogCrudConfig = {
    title: 'Unidades',
    singular: 'unidad',
    article: 'la',
    newLabel: 'Nueva unidad',
    helpStorageKey: 'unidades',
    help: [
      'Unidades de medida con su código de SUNAT, compartidas por todas las farmacias.',
      'Se eligen en Productos → «Unidad» y en la pestaña Presentaciones (caja, blíster…).',
      'El código va en los comprobantes electrónicos: usa siempre el del catálogo oficial de SUNAT. No se puede eliminar una unidad que algún producto use.'
    ],
    writePermission: 'units.write',
    global: true,
    fields: [
      { key: 'codigo', label: 'Código', maxLength: 20, helpText: 'Código del catálogo de unidades de SUNAT. Va en los comprobantes electrónicos, así que debe ser el oficial.', placeholder: 'Ej.: NIU, BX, ZZ' },
      { key: 'nombre', label: 'Nombre', maxLength: 120, helpText: 'Cómo la verás al elegirla. Ej.: Unidades, Caja, Servicio.', placeholder: 'Ej.: Caja' }
    ],
    searchPlaceholder: 'Buscar por código o nombre',
    queryKey: unitQueryKeys.all,
    list: catalogList(this.api.listUnitsPaged.bind(this.api)),
    create: (b) => this.api.createUnit({ codigo: b['codigo'], nombre: b['nombre'] }),
    update: (id, b) => this.api.updateUnit(id, { codigo: b['codigo'], nombre: b['nombre'] }),
    remove: (id) => this.api.deleteUnit(id),
  };
}
