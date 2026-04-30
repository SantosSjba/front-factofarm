import type { CompoundProductListFiltersRequest } from '../../modules/admin/models/directory.models';

const compoundRoot = ['compound-products'] as const;

export const compoundProductQueryKeys = {
  all: compoundRoot,
  list: (filters: CompoundProductListFiltersRequest) =>
    [
      ...compoundRoot,
      'list',
      filters.search ?? '',
      filters.field ?? 'nombre',
      filters.page ?? 1,
      filters.pageSize ?? 10,
    ] as const,
  catalogs: [...compoundRoot, 'catalogs'] as const,
};
