import type { ServiceListFiltersRequest } from '../../modules/admin/models/directory.models';

const serviceRoot = ['services'] as const;

export const serviceQueryKeys = {
  all: serviceRoot,
  list: (filters: ServiceListFiltersRequest) =>
    [
      ...serviceRoot,
      'list',
      filters.search ?? '',
      filters.field ?? 'nombre',
      filters.page ?? 1,
      filters.pageSize ?? 10,
    ] as const,
  catalogs: [...serviceRoot, 'catalogs'] as const,
};
