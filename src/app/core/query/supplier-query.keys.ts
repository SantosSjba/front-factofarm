export const supplierQueryKeys = {
  all: ['suppliers'] as const,
  list: (filters?: { search?: string; field?: string; estado?: string; page?: number }) =>
    [
      ...supplierQueryKeys.all,
      'list',
      filters?.search ?? '',
      filters?.field ?? 'all',
      filters?.estado ?? 'todos',
      filters?.page ?? 1,
    ] as const,
  detail: (id: string) => [...supplierQueryKeys.all, 'detail', id] as const,
  products: (supplierId: string) => [...supplierQueryKeys.all, 'products', supplierId] as const,
  purchaseHistory: (supplierId: string) =>
    [...supplierQueryKeys.all, 'purchase-history', supplierId] as const,
};
