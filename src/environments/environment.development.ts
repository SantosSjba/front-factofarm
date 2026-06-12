import { envOverrides } from './env.overrides';

export const environment = {
  production: envOverrides.production,
  /** Origen de la API Nest (`main.ts` usa prefijo global `api`). */
  apiBaseUrl: envOverrides.apiBaseUrl,
};
