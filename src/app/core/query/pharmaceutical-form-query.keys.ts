export const pharmaceuticalFormQueryKeys = {
  all: ['pharmaceutical-forms'] as const,
  list: (filters?: { search?: string; field?: string; page?: number }) =>
    [
      ...pharmaceuticalFormQueryKeys.all,
      'list',
      filters?.search ?? '',
      filters?.field ?? 'all',
      filters?.page ?? 1,
    ] as const,
};
