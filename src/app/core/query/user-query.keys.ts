/** Claves de caché para usuarios (TanStack Query). */
export const userQueryKeys = {
  all: ['users'] as const,
  list: (filters?: { search?: string; role?: string; page?: number }) =>
    [
      ...userQueryKeys.all,
      'list',
      filters?.search ?? '',
      filters?.role ?? 'all',
      filters?.page ?? 1,
    ] as const,
};
