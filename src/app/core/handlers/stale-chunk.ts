/**
 * Mensaje de cada navegador cuando no se puede descargar el código de una pantalla (lazy route),
 * típico tras un deploy si el navegador conserva el index.html anterior.
 * Safari: "Importing a module script failed." · Chrome: "Failed to fetch dynamically imported module"
 * · Firefox: "error loading dynamically imported module" · webpack antiguo: "Loading chunk … failed".
 */
export const STALE_CHUNK_ERROR =
  /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Loading chunk [\w-]+ failed/i;
