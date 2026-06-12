export const brandQueryKeys = {
  all: ['brands'] as const,
  list: (filters?: { search?: string; field?: string; page?: number }) =>
    [
      ...brandQueryKeys.all,
      'list',
      filters?.search ?? '',
      filters?.field ?? 'all',
      filters?.page ?? 1,
    ] as const,
};
