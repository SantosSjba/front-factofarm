export const customerQueryKeys = {
  all: ['customers'] as const,
  list: (filters?: {
    search?: string;
    field?: string;
    customerTypeId?: string;
    zoneId?: string;
    estado?: string;
    page?: number;
    pageSize?: number;
  }) =>
    [
      ...customerQueryKeys.all,
      'list',
      filters?.search ?? '',
      filters?.field ?? 'all',
      filters?.customerTypeId ?? '',
      filters?.zoneId ?? '',
      filters?.estado ?? 'all',
      filters?.page ?? 1,
      filters?.pageSize ?? 10,
    ] as const,
  detail: (id: string) => [...customerQueryKeys.all, 'detail', id] as const,
  zones: () => [...customerQueryKeys.all, 'zones'] as const,
  sellers: () => [...customerQueryKeys.all, 'sellers'] as const,
  documentTypes: () => [...customerQueryKeys.all, 'document-types'] as const,
  nationalities: () => [...customerQueryKeys.all, 'nationalities'] as const,
};
