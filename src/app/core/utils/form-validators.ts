/**
 * Validaciones de formularios alineadas con class-validator del backend
 * (`@IsEmail`, `@Min(0)`, `@IsInt`, `@IsUrl`), para avisar antes de enviar.
 */

/** Similar a `@IsEmail()`: usuario@dominio.tld sin espacios. */
export function isValidEmail(value: string | null | undefined): boolean {
  const v = (value ?? '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

/** Campo opcional: vacío es válido; si tiene texto debe ser correo válido. */
export function isOptionalEmail(value: string | null | undefined): boolean {
  return !(value ?? '').trim() || isValidEmail(value);
}

/** Número finito ≥ min (por defecto 0). Acepta string de input. */
export function isNumberAtLeast(value: unknown, min = 0): boolean {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  return String(value ?? '').trim() !== '' && Number.isFinite(n) && n >= min;
}

/** Entero ≥ min (por defecto 0). */
export function isIntAtLeast(value: unknown, min = 0): boolean {
  return isNumberAtLeast(value, min) && Number.isInteger(Number(value));
}

/** Vacío es válido; si tiene valor debe ser número ≥ min. */
export function isOptionalNumberAtLeast(value: unknown, min = 0): boolean {
  return String(value ?? '').trim() === '' || isNumberAtLeast(value, min);
}

/** Vacío es válido; si tiene valor debe ser entero ≥ min. */
export function isOptionalIntAtLeast(value: unknown, min = 0): boolean {
  return String(value ?? '').trim() === '' || isIntAtLeast(value, min);
}

/** Celular/teléfono: opcional `+` y 7–15 dígitos (ignora espacios y guiones). */
export function isValidPhone(value: string | null | undefined): boolean {
  return /^\+?\d{7,15}$/.test((value ?? '').replace(/[\s-]/g, ''));
}

/** Similar a `@IsUrl()`: protocolo opcional, sin espacios. Vacío es válido. */
export function isOptionalUrl(value: string | null | undefined): boolean {
  const v = (value ?? '').trim();
  if (!v) return true;
  if (/\s/.test(v)) return false;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `http://${v}`);
    return /^https?:$/.test(url.protocol) && !!url.hostname;
  } catch {
    return false;
  }
}
