/**
 * Mensaje de cada navegador cuando no se puede descargar el código de una pantalla (lazy route),
 * típico tras un deploy si la pestaña tiene en memoria la versión anterior.
 * Safari: "Importing a module script failed." · Chrome: "Failed to fetch dynamically imported module"
 * · Firefox: "error loading dynamically imported module" · webpack antiguo: "Loading chunk … failed".
 */
export const STALE_CHUNK_ERROR =
  /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Loading chunk [\w-]+ failed/i;

const RELOAD_KEY = 'ff-stale-chunk-reload';
/** Si tras recargar vuelve a fallar en menos de esto, no se insiste (evita un bucle de recargas). */
const RETRY_WINDOW_MS = 60_000;

let reloading = false;

/** La página está por recargarse: los errores de carga que lleguen mientras tanto no son del usuario. */
export function markReloading(): void {
  reloading = true;
}

export function isReloading(): boolean {
  return reloading;
}

export function isStaleChunkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return STALE_CHUNK_ERROR.test(message);
}

/**
 * Carga completa de `url` para traer la versión publicada. Una vez por dirección y minuto: si la
 * página nueva vuelve a fallar enseguida, devuelve false y el error se muestra.
 */
export function reloadOnce(url: string): boolean {
  try {
    const last = JSON.parse(sessionStorage.getItem(RELOAD_KEY) ?? 'null') as { url: string; at: number } | null;
    if (last?.url === url && Date.now() - last.at < RETRY_WINDOW_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, JSON.stringify({ url, at: Date.now() }));
  } catch {
    // Sin sessionStorage se recarga igual: la página nueva ya trae su propio código.
  }
  markReloading();
  location.assign(url);
  return true;
}
