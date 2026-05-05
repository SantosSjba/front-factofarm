export const zoneQueryKeys = {
  all: ['zones'] as const,
  list: (search: string, field: 'all' | 'nombre') =>
    ['zones', 'list', search.trim(), field] as const,
};
