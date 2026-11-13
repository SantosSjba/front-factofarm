import type { ProductListFiltersRequest } from '../../modules/admin/models/directory.models';

const productRoot = ['products'] as const;

export const productQueryKeys = {
  all: productRoot,
  list: (filters: ProductListFiltersRequest) =>
    [
      ...productRoot,
      'list',
      filters.search ?? '',
      filters.field ?? 'nombre',
      filters.categoryId ?? '',
      filters.brandId ?? '',
      filters.habilitado ?? 'all',
      filters.generico ?? 'all',
      filters.necesitaRecetaMedica ?? 'all',
      filters.stockLevel ?? 'all',
      filters.page ?? 1,
      filters.pageSize ?? 10,
    ] as const,
  catalogs: [...productRoot, 'catalogs'] as const,
};
