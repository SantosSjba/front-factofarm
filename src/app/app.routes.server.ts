import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Qué se genera como HTML en el build (prerenderizado) y qué se sigue armando en el navegador.
 * Solo las páginas públicas e indexables se prerenderizan: así buscadores y vistas previas de
 * enlaces (WhatsApp, Facebook) reciben el contenido real. El panel sigue siendo 100% navegador.
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'legal/privacidad', renderMode: RenderMode.Prerender },
  { path: 'legal/terminos', renderMode: RenderMode.Prerender },
  { path: 'legal/libro-reclamaciones', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Client },
];
