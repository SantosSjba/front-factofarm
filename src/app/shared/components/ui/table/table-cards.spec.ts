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

  it('prefiere Nombre como título, ID como metadato y respeta columnas ocultas', () => {
    const table = mountTable(`
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th class="hidden lg:table-cell">ID</th>
            <th class="hidden lg:table-cell">Cód. Interno</th>
            <th>Nombre</th>
            <th class="hidden">Interno</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td class="hidden lg:table-cell">81921c73</td>
            <td class="hidden lg:table-cell">—</td>
            <td>AGUA SAN LUIS</td>
            <td class="hidden">x</td>
            <td><app-table-dropdown><button type="button">⋮</button></app-table-dropdown></td>
          </tr>
        </tbody>
      </table>
    `);

    enhanceTable(table);

    const cells = table.tBodies[0].rows[0].cells;
    expect(cells[1].dataset['role']).toBe('meta');
    expect(cells[2].dataset['role']).toBe('field');
    expect(cells[2].dataset['cardHidden']).toBeUndefined();
    expect(cells[3].dataset['role']).toBe('title');
    expect(cells[4].dataset['cardHidden']).toBe('');
    expect(cells[5].dataset['actionsLayout']).toBe('header');
  });

  it('manda al pie las acciones con varios botones', () => {
    const table = mountTable(`
      <table>
        <thead><tr><th>Cliente</th><th>Total</th><th>Acciones</th></tr></thead>
        <tbody>
          <tr>
            <td>Juan</td>
            <td>S/ 10.00</td>
            <td><div><button type="button">Ver</button><button type="button">Anular</button></div></td>
          </tr>
        </tbody>
      </table>
    `);

    enhanceTable(table);
    expect(table.tBodies[0].rows[0].cells[2].dataset['actionsLayout']).toBe('footer');
  });

  it('detecta la columna de selección con checkbox', () => {
    const table = mountTable(`
      <table>
        <thead><tr><th></th><th>Cuenta</th><th>Monto</th></tr></thead>
        <tbody>
          <tr><td><input type="checkbox" /></td><td>BCP</td><td>10</td></tr>
          <tr><td></td><td>BBVA</td><td>20</td></tr>
        </tbody>
      </table>
    `);

    enhanceTable(table);
    const cells = table.tBodies[0].rows[0].cells;
    expect(cells[0].dataset['role']).toBe('select');
    expect(cells[1].dataset['role']).toBe('title');
  });

  it('respeta data-card-role, colspan y marca campos anchos', () => {
    const table = mountTable(`
      <table>
        <thead>
          <tr><th>Fecha</th><th data-card-role="title">Lote</th><th>Cantidad</th><th>Observaciones</th></tr>
        </thead>
        <tbody>
          <tr>
            <td colspan="2">01/01/2026 · L-001</td>
            <td><input type="number" /></td>
            <td>Texto suficientemente largo como para ocupar todo el ancho</td>
          </tr>
          <tr>
            <td>01/01/2026</td>
            <td>L-002</td>
            <td>5</td>
            <td>Corto</td>
          </tr>
        </tbody>
      </table>
    `);

    enhanceTable(table);
    const [first, second] = Array.from(table.tBodies[0].rows);
    expect(second.cells[1].dataset['role']).toBe('title');
    expect(first.cells[1].dataset['label']).toBe('Cantidad');
    expect(first.cells[1].dataset['cardWideAuto']).toBe('');
    expect(first.cells[2].dataset['label']).toBe('Observaciones');
    expect(first.cells[2].dataset['cardWideAuto']).toBe('');
    expect(second.cells[3].dataset['cardWideAuto']).toBeUndefined();
  });
});
