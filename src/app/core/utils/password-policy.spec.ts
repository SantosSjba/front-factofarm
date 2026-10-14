import { passwordPolicyError } from './password-policy';
describe('Contrato de contraseña con el backend', () => {
  it('acepta una contraseña completa y rechaza falta de complejidad', () => {
    expect(passwordPolicyError('Test123!')).toBeNull();
    expect(passwordPolicyError('simplepass')).not.toBeNull();
  });
  it('rechaza truncamiento tanto en texto ASCII como Unicode', () => {
    expect(passwordPolicyError('A1!' + 'a'.repeat(69))).toBeNull();
    expect(passwordPolicyError('A1!' + 'a'.repeat(70))).not.toBeNull();
    expect(passwordPolicyError('A1!' + '😀'.repeat(18))).not.toBeNull();
  });
});
