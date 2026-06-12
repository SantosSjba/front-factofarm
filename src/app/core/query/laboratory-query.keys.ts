export const laboratoryQueryKeys = {
  all: ['laboratories'] as const,
  list: (filters?: { search?: string; field?: string; page?: number }) =>
    [
      ...laboratoryQueryKeys.all,
      'list',
      filters?.search ?? '',
      filters?.field ?? 'all',
      filters?.page ?? 1,
    ] as const,
};
