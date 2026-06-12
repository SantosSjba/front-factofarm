export const unitQueryKeys = {
  all: ['units'] as const,
  list: (filters?: { search?: string; field?: string; page?: number }) =>
    [
      ...unitQueryKeys.all,
      'list',
      filters?.search ?? '',
      filters?.field ?? 'all',
      filters?.page ?? 1,
    ] as const,
};
