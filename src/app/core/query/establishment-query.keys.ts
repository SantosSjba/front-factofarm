export const establishmentQueryKeys = {
  all: ['establishments'] as const,
  list: () => [...establishmentQueryKeys.all, 'list'] as const,
  series: (establishmentId: string) =>
    [...establishmentQueryKeys.all, 'series', establishmentId] as const,
  documentTypes: () => [...establishmentQueryKeys.all, 'document-types'] as const,
};
