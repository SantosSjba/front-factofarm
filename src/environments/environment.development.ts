import { envOverrides } from './env.overrides';

export const environment = {
  production: envOverrides.production,
  /** Origen de la API Nest (`main.ts` usa prefijo global `api`). */
  apiBaseUrl: envOverrides.apiBaseUrl,
  contactWhatsApp: envOverrides.contactWhatsApp || '',
  contactEmail: envOverrides.contactEmail || '',
  company: envOverrides.company ?? {
    legalName: 'FactoFarm S.A.C.',
    ruc: '20XXXXXXXXX',
    address: 'Lima, Perú',
  },
  siteUrl: envOverrides.siteUrl || 'http://localhost:4200',
};
