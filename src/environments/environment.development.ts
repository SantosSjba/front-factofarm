import { envOverrides } from './env.overrides';

export const environment = {
  production: envOverrides.production,
  /** Origen de la API Nest (`main.ts` usa prefijo global `api`). */
  apiBaseUrl: envOverrides.apiBaseUrl,
  contactWhatsApp: envOverrides.contactWhatsApp || '',
  contactEmail: envOverrides.contactEmail || '',
  company: envOverrides.company ?? {
    legalName: 'FACTOSYS PERU S.A.C.',
    ruc: '20614608952',
    address: 'Trujillo, La Libertad, Perú. Atendemos todo el Perú (24 departamentos y Callao).',
  },
  siteUrl: envOverrides.siteUrl || 'http://localhost:4200',
};
