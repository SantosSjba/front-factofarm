import { envOverrides } from './env.overrides';

/** Producción: `NG_APP_*` en CI/CD o proxy inverso `/api/v1`. */
export const environment = {
  production: envOverrides.production ?? true,
  apiBaseUrl: envOverrides.apiBaseUrl || '/api/v1',
  contactWhatsApp: envOverrides.contactWhatsApp || '',
  contactEmail: envOverrides.contactEmail || '',
  company: envOverrides.company ?? {
    legalName: 'FactoFarm S.A.C.',
    ruc: '20XXXXXXXXX',
    address: 'Lima, Perú',
  },
  siteUrl: envOverrides.siteUrl || 'https://factofarm.com',
};
