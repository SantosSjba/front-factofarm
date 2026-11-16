import type { InventoryMovementListFiltersRequest } from '../../modules/admin/models/directory.models';

export const inventoryMovementQueryKeys = {
  all: ['inventory-movements'] as const,
  list: (filters: InventoryMovementListFiltersRequest) =>
    [
      'inventory-movements',
      'list',
      filters.search?.trim() ?? '',
      filters.field ?? 'producto',
      // Todo filtro que cambia el resultado va en la clave; si falta, la lista no se vuelve a pedir.
      filters.categoryId ?? '',
      filters.warehouseId ?? '',
      filters.stockLevel ?? '',
      filters.page ?? 1,
      filters.pageSize ?? 10,
    ] as const,
};
