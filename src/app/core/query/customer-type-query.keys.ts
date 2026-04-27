export const customerTypeQueryKeys = {
  all: ['customer-types'] as const,
  list: (filters?: { search?: string; field?: string }) =>
    [...customerTypeQueryKeys.all, 'list', filters?.search ?? '', filters?.field ?? 'all'] as const,
};
