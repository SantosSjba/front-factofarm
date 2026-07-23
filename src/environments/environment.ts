import { envOverrides } from './env.overrides';

/** Producción: `NG_APP_*` en CI/CD o proxy inverso `/api/v1`. */
export const environment = {
  production: envOverrides.production ?? true,
  apiBaseUrl: envOverrides.apiBaseUrl || '/api/v1',
  contactWhatsApp: envOverrides.contactWhatsApp || '',
  contactEmail: envOverrides.contactEmail || '',
  company: envOverrides.company ?? {
    legalName: 'FACTOSYS PERU S.A.C.',
    ruc: '20614608952',
    address: 'Trujillo, La Libertad, Perú. Atendemos todo el Perú (24 departamentos y Callao).',
  },
  siteUrl: envOverrides.siteUrl || 'https://factofarm.factosysperu.com',
};
