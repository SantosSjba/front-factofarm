/** Claves de caché para usuarios (TanStack Query). */
export const userQueryKeys = {
  all: ['users'] as const,
  list: () => [...userQueryKeys.all, 'list'] as const,
};
