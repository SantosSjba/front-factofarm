import { HttpErrorResponse } from '@angular/common/http';
import { httpErrorMessage } from './http-error-message';

describe('httpErrorMessage', () => {
  it('usa el mensaje del backend', () => {
    const err = new HttpErrorResponse({ status: 409, error: { message: 'Ya existe un registro con ese RUC.' } });
    expect(httpErrorMessage(err, 'x')).toBe('Ya existe un registro con ese RUC.');
  });

  it('une mensajes en arreglo', () => {
    const err = new HttpErrorResponse({ status: 400, error: { message: ['A.', 'B.'] } });
    expect(httpErrorMessage(err, 'x')).toBe('A. B.');
  });

  it('explica estados sin cuerpo', () => {
    expect(httpErrorMessage(new HttpErrorResponse({ status: 0 }), 'x')).toContain('conexión');
    expect(httpErrorMessage(new HttpErrorResponse({ status: 413 }), 'x')).toContain('tamaño');
    expect(httpErrorMessage(new HttpErrorResponse({ status: 418 }), 'fallback')).toBe('fallback');
  });

  it('ignora páginas HTML de proxies', () => {
    const err = new HttpErrorResponse({ status: 502, error: '<html>Bad gateway</html>' });
    expect(httpErrorMessage(err, 'x')).toContain('no está disponible');
  });

  it('muestra validaciones propias pero no errores de ejecución', () => {
    expect(httpErrorMessage(new Error('Indique el lote'), 'x')).toBe('Indique el lote');
    expect(httpErrorMessage(new TypeError('Cannot read properties of undefined'), 'x')).toBe('x');
  });
});
