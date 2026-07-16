import { environment } from '../../../environments/environment';
import type { SeoConfig } from './seo.types';

const PERU_KEYWORDS =
  'software farmacia peru, sistema botica peru, punto de venta farmacia, facturacion electronica sunat farmacia, inventario farmacia, software botica lima, gestion farmacia, ERP farmacia peru, cotizacion software farmacia';

const siteUrl = () => environment.siteUrl.replace(/\/$/, '');

export const DEFAULT_NOINDEX: SeoConfig = {
  title: 'FactoFarm',
  description: 'Panel de gestión farmacéutica FactoFarm.',
  robots: 'noindex, nofollow',
};

export const PUBLIC_SEO: Record<string, SeoConfig> = {
  '/': {
    title: 'FactoFarm | Software para farmacias y boticas en Perú',
    description:
      'Sistema integral para farmacias y boticas en Perú: POS, inventario con lotes, facturación electrónica SUNAT, compras, control de medicamentos y reportes. Solicita una demo.',
    keywords: PERU_KEYWORDS,
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    ogType: 'website',
    canonicalPath: '/',
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          name: 'FactoFarm',
          url: siteUrl(),
          logo: `${siteUrl()}/images/logo/logo-icon.svg`,
          areaServed: {
            '@type': 'Country',
            name: 'Peru',
          },
          knowsLanguage: 'es-PE',
        },
        {
          '@type': 'SoftwareApplication',
          name: 'FactoFarm',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          description:
            'Software de gestión para farmacias y boticas en Perú con POS, inventario, facturación SUNAT y reportes.',
          offers: {
            '@type': 'Offer',
            priceCurrency: 'PEN',
            availability: 'https://schema.org/InStock',
            description: 'Cotización personalizada según operación de la farmacia o botica',
          },
          audience: {
            '@type': 'BusinessAudience',
            audienceType: 'Farmacias y boticas en Perú',
          },
        },
        {
          '@type': 'WebSite',
          name: 'FactoFarm',
          url: siteUrl(),
          inLanguage: 'es-PE',
        },
      ],
    },
  },
  '/legal/privacidad': {
    title: 'Política de privacidad | FactoFarm · LPDP Perú',
    description:
      'Política de privacidad y protección de datos personales de FactoFarm conforme a la Ley N° 29733 (LPDP) en Perú.',
    keywords: 'politica privacidad farmacia, LPDP peru, proteccion datos farmacia',
    robots: 'index, follow',
    ogType: 'article',
    canonicalPath: '/legal/privacidad',
  },
  '/legal/terminos': {
    title: 'Términos de uso | FactoFarm',
    description:
      'Términos y condiciones de uso de la plataforma FactoFarm para farmacias y boticas en Perú.',
    keywords: 'terminos uso software farmacia, condiciones servicio factofarm',
    robots: 'index, follow',
    ogType: 'article',
    canonicalPath: '/legal/terminos',
  },
  '/legal/libro-reclamaciones': {
    title: 'Libro de reclamaciones virtual | FactoFarm · Ley 29571',
    description:
      'Libro de reclamaciones virtual de FactoFarm conforme al Código de Protección y Defensa del Consumidor (Ley N° 29571) e INDECOPI.',
    keywords: 'libro reclamaciones virtual peru, INDECOPI, reclamo consumidor software',
    robots: 'index, follow',
    ogType: 'website',
    canonicalPath: '/legal/libro-reclamaciones',
  },
};

export function resolveSeoConfig(path: string): SeoConfig {
  const normalized = path.split('?')[0].split('#')[0] || '/';
  if (PUBLIC_SEO[normalized]) {
    return PUBLIC_SEO[normalized];
  }
  if (normalized.startsWith('/legal/')) {
    return PUBLIC_SEO['/legal/privacidad'];
  }
  return DEFAULT_NOINDEX;
}
