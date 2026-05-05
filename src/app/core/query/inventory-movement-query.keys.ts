import type { InventoryMovementListFiltersRequest } from '../../modules/admin/models/directory.models';

export const inventoryMovementQueryKeys = {
  all: ['inventory-movements'] as const,
  list: (filters: InventoryMovementListFiltersRequest) =>
    [
      'inventory-movements',
      'list',
      filters.search?.trim() ?? '',
      filters.field ?? 'producto',
      filters.page ?? 1,
      filters.pageSize ?? 10,
    ] as const,
};
