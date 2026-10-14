/** Política compartida por los formularios; coincide con la validación del backend. */
export function passwordPolicyError(password: string): string | null {
  if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (new TextEncoder().encode(password).length > 72) return 'La contraseña es demasiado larga. Usa menos caracteres.';
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return 'Incluye mayúscula, minúscula, número y carácter especial.';
  }
  return null;
}
