import { avatarColorClass, nameInitials } from './avatar-text.component';

describe('nameInitials', () => {
  it('usa primer nombre + apellido paterno con dos nombres y dos apellidos', () => {
    expect(nameInitials('Santos Jesús Bernui Acevedo')).toBe('SB');
  });

  it('usa las dos primeras palabras con un nombre y dos apellidos', () => {
    expect(nameInitials('Leidy Bernui Baltazar')).toBe('LB');
    expect(nameInitials('Esmeralda Correa')).toBe('EC');
  });

  it('con una sola palabra toma dos letras', () => {
    expect(nameInitials('admin')).toBe('AD');
  });

  it('ignora sufijos entre paréntesis y espacios extra', () => {
    expect(nameInitials('  Ana   Pérez (soporte) ')).toBe('AP');
  });

  it('devuelve ? sin nombre', () => {
    expect(nameInitials('')).toBe('?');
    expect(nameInitials(null)).toBe('?');
  });
});

describe('avatarColorClass', () => {
  it('es estable para el mismo nombre', () => {
    expect(avatarColorClass('Leidy Bernui')).toBe(avatarColorClass('Leidy Bernui'));
  });
});
