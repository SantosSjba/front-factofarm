import { isOptionalEmail } from '../../../../core/utils/form-validators';
import { isValidRuc } from '../../../../core/utils/peru-documents';

/** Reglas de `CreateTenantDto` / `UpdateTenantDto` (nombre 2–200, RUC 11 dígitos, correo). */
export function validateTenantFields(nombre: string, ruc: string, email: string): string | null {
  if (nombre.trim().length < 2) return 'El nombre comercial debe tener al menos 2 caracteres.';
  const r = ruc.trim();
  if (r && (!/^\d{11}$/.test(r) || !isValidRuc(r))) return 'El RUC no es válido (11 dígitos con dígito verificador SUNAT).';
  if (!isOptionalEmail(email)) return 'El correo de contacto no es válido.';
  return null;
}
