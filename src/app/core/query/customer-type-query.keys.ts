export const customerTypeQueryKeys = {
  all: ['customer-types'] as const,
  list: (filters?: { search?: string; field?: string; page?: number }) =>
    [
      ...customerTypeQueryKeys.all,
      'list',
      filters?.search ?? '',
      filters?.field ?? 'all',
      filters?.page ?? 1,
    ] as const,
};
