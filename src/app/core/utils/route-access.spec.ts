import { cleanRoutePath, isMenuPathActive } from './route-access';

describe('isMenuPathActive', () => {
  it('resalta la opción con la ruta exacta', () => {
    expect(isMenuPathActive('/lotes', '/lotes')).toBe(true);
  });

  it('ignora parámetros y fragmento de la URL', () => {
    expect(isMenuPathActive('/notas-venta?dateFrom=2026-11-01&dateTo=2026-11-16', '/notas-venta')).toBe(true);
    expect(isMenuPathActive('/productos#stock', '/productos')).toBe(true);
  });

  it('acepta la «/» final y las subrutas', () => {
    expect(isMenuPathActive('/lotes/', '/lotes')).toBe(true);
    expect(isMenuPathActive('/platform/clientes/abc', '/platform/clientes')).toBe(true);
  });

  it('no confunde rutas que solo comparten el inicio del nombre', () => {
    expect(isMenuPathActive('/reporte-kardex', '/reporte')).toBe(false);
    expect(isMenuPathActive('/dashboard', '/dash')).toBe(false);
  });

  it('la raíz solo se resalta en la raíz', () => {
    expect(isMenuPathActive('/lotes', '/')).toBe(false);
    expect(isMenuPathActive('/', '/')).toBe(true);
  });

  it('sin ruta no resalta nada', () => {
    expect(isMenuPathActive('/lotes', '')).toBe(false);
    expect(cleanRoutePath('')).toBe('/');
  });
});
