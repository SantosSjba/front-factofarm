import type { SeriesListFiltersRequest } from '../../modules/admin/models/directory.models';

export const seriesQueryKeys = {
  all: ['series'] as const,
  list: (filters: SeriesListFiltersRequest) =>
    [
      'series',
      'list',
      filters.search?.trim() ?? '',
      filters.field ?? 'serie',
      filters.page ?? 1,
      filters.pageSize ?? 10,
    ] as const,
};
