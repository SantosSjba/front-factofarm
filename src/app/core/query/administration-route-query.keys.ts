export const administrationRouteQueryKeys = {
  all: ['administration-routes'] as const,
  list: (filters?: { search?: string; field?: string; page?: number }) =>
    [
      ...administrationRouteQueryKeys.all,
      'list',
      filters?.search ?? '',
      filters?.field ?? 'all',
      filters?.page ?? 1,
    ] as const,
};
