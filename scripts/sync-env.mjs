/**
 * Lee `.env` del frontend y genera `src/environments/env.overrides.ts`.
 * Ejecutado en prestart/prebuild para alinear con el patrón del API.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const envPath = join(root, '.env');
const outPath = join(root, 'src/environments/env.overrides.ts');

const prodBuild = process.env.NODE_ENV === 'production';
const defaults = {
  NG_APP_API_BASE_URL: prodBuild ? '/api/v1' : 'http://localhost:3000/api/v1',
  NG_APP_PRODUCTION: prodBuild ? 'true' : 'false',
  NG_APP_CONTACT_WHATSAPP: '',
  NG_APP_CONTACT_EMAIL: '',
  NG_APP_COMPANY_LEGAL_NAME: 'FactoFarm S.A.C.',
  NG_APP_COMPANY_RUC: '20XXXXXXXXX',
  NG_APP_COMPANY_ADDRESS: 'Lima, Perú',
  NG_APP_SITE_URL: prodBuild ? 'https://factofarm.com' : 'http://localhost:4200',
};

const vars = { ...defaults };

if (existsSync(envPath)) {
  for (const rawLine of readFileSync(envPath, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
}

const production = vars.NG_APP_PRODUCTION === 'true';

const content = `/** Generado por scripts/sync-env.mjs — no editar a mano */
export const envOverrides = {
  production: ${production},
  apiBaseUrl: ${JSON.stringify(vars.NG_APP_API_BASE_URL)},
  contactWhatsApp: ${JSON.stringify(vars.NG_APP_CONTACT_WHATSAPP ?? '')},
  contactEmail: ${JSON.stringify(vars.NG_APP_CONTACT_EMAIL ?? '')},
  company: {
    legalName: ${JSON.stringify(vars.NG_APP_COMPANY_LEGAL_NAME ?? 'FactoFarm S.A.C.')},
    ruc: ${JSON.stringify(vars.NG_APP_COMPANY_RUC ?? '20XXXXXXXXX')},
    address: ${JSON.stringify(vars.NG_APP_COMPANY_ADDRESS ?? 'Lima, Perú')},
  },
  siteUrl: ${JSON.stringify(vars.NG_APP_SITE_URL ?? (production ? 'https://factofarm.com' : 'http://localhost:4200'))},
};
`;

writeFileSync(outPath, content, 'utf8');
console.info('[sync-env] env.overrides.ts actualizado desde .env');
