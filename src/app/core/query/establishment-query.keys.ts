export const establishmentQueryKeys = {
  all: ['establishments'] as const,
  list: () => [...establishmentQueryKeys.all, 'list'] as const,
  series: (establishmentId: string) =>
    [...establishmentQueryKeys.all, 'series', establishmentId] as const,
  documentTypes: () => [...establishmentQueryKeys.all, 'document-types'] as const,
  departments: () => [...establishmentQueryKeys.all, 'departments'] as const,
  provinces: (departmentId: string) =>
    [...establishmentQueryKeys.all, 'provinces', departmentId] as const,
  districts: (provinceId: string) =>
    [...establishmentQueryKeys.all, 'districts', provinceId] as const,
};
