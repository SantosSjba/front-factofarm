export const supplierQueryKeys = {
  all: ['suppliers'] as const,
  list: (filters?: { search?: string; field?: string; page?: number }) =>
    [
      ...supplierQueryKeys.all,
      'list',
      filters?.search ?? '',
      filters?.field ?? 'all',
      filters?.page ?? 1,
    ] as const,
  detail: (id: string) => [...supplierQueryKeys.all, 'detail', id] as const,
  products: (supplierId: string) => [...supplierQueryKeys.all, 'products', supplierId] as const,
  purchaseHistory: (supplierId: string) =>
    [...supplierQueryKeys.all, 'purchase-history', supplierId] as const,
};
