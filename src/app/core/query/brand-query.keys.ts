export const brandQueryKeys = {
  all: ['brands'] as const,
  list: (filters?: { search?: string; field?: string }) =>
    [...brandQueryKeys.all, 'list', filters?.search ?? '', filters?.field ?? 'all'] as const,
};
