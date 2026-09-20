import { enhanceTable, isTableEligible } from './table-cards';

function mountTable(html: string): HTMLTableElement {
  document.body.innerHTML = `<div class="overflow-x-auto" style="width: 360px">${html}</div>`;
  return document.body.querySelector('table') as HTMLTableElement;
}

describe('table-cards', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('marca título, campos y acciones desde el thead', () => {
    const table = mountTable(`
      <table class="min-w-full">
        <thead>
          <tr>
            <th>#</th>
            <th>Nombre</th>
            <th>Código</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>Oficina Principal</td>
            <td>0000</td>
            <td><button type="button">Editar</button></td>
          </tr>
        </tbody>
      </table>
    `);

    enhanceTable(table);

    const cells = table.tBodies[0].rows[0].cells;
    expect(cells[0].dataset['role']).toBe('index');
    expect(cells[1].dataset['role']).toBe('title');
    expect(cells[1].dataset['label']).toBe('Nombre');
    expect(cells[2].dataset['role']).toBe('field');
    expect(cells[2].dataset['label']).toBe('Código');
    expect(cells[3].dataset['role']).toBe('actions');
    expect(table.classList.contains('ff-table-cards')).toBe(true);
  });

  it('detecta la última columna vacía como acciones si tiene botones', () => {
    const table = mountTable(`
      <table>
        <thead>
          <tr><th>Documento</th><th>Saldo</th><th></th></tr>
        </thead>
        <tbody>
          <tr>
            <td>F001-1</td>
            <td>S/ 10.00</td>
            <td><button type="button">Cobrar</button></td>
          </tr>
        </tbody>
      </table>
    `);

    enhanceTable(table);
    expect(table.tBodies[0].rows[0].cells[2].dataset['role']).toBe('actions');
  });

  it('no altera tablas con data-table-cards="off"', () => {
    const table = mountTable(`
      <table data-table-cards="off">
        <thead><tr><th>A</th><th>B</th></tr></thead>
        <tbody><tr><td>1</td><td>2</td></tr></tbody>
      </table>
    `);

    expect(isTableEligible(table)).toBe(false);
    enhanceTable(table);
    expect(table.classList.contains('ff-table-cards')).toBe(false);
  });
});
