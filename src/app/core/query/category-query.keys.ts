export const categoryQueryKeys = {
  all: ['categories'] as const,
  list: (filters?: { search?: string; field?: string }) =>
    [...categoryQueryKeys.all, 'list', filters?.search ?? '', filters?.field ?? 'all'] as const,
};
