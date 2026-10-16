/**
 * Convierte cualquier <table> del sistema en tarjetas cuando no cabe en su contenedor.
 * Se aplica de forma global (TableCardsService), así que todo es heurístico y genérico;
 * cada tabla puede afinar el resultado de forma declarativa:
 *
 *   <table data-table-cards="off">          → nunca pasar a tarjetas
 *   <th data-card-role="title|field|meta|actions|select|index|hidden">
 *                                           → forzar el rol de una columna
 *   <td data-card-role="…">                 → forzar el rol de una celda concreta
 *   <th data-card-wide> / <td data-card-wide>
 *                                           → el campo ocupa todo el ancho de la tarjeta
 */
export type TableCardRole = 'index' | 'title' | 'field' | 'actions' | 'meta' | 'select' | 'hidden';

const ROLES = new Set<TableCardRole>(['index', 'title', 'field', 'actions', 'meta', 'select', 'hidden']);
const INDEX_LABELS = new Set(['#', 'n°', 'nº', 'nro', 's. no.', 's.no.']);
const META_LABELS = new Set(['id', 'uuid']);
const ACTION_LABEL = /acci[oó]n(es)?/i;
/** Columnas que mejor identifican la fila, en orden de preferencia, para el título de la tarjeta. */
const TITLE_PRIORITY = [
  /^nombre/i,
  /^producto/i,
  /^raz[oó]n social/i,
  /^(documento|comprobante)/i,
  /^cliente/i,
  /^proveedor/i,
  /^paciente/i,
  /^usuario/i,
  /^(m[eé]dico|doctor)/i,
  /^descripci[oó]n/i,
];
/** `hidden` combinado con un display responsivo (lg:table-cell…) es una columna secundaria, no oculta. */
const RESPONSIVE_DISPLAY = /^(sm|md|lg|xl|2xl):(table-cell|block|flex|grid|inline)/;
const CHECKBOX = 'app-checkbox, input[type="checkbox"]';
const FORM_CONTROL =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]), select, textarea, app-form-select, app-select, app-multi-select, app-date-picker';
const ACTION_CONTROL = 'app-button, app-table-dropdown, button, a[href], [dropdown-button]';
/** Texto a partir del cual un campo se muestra a todo el ancho para no partirse en muchas líneas. */
const WIDE_TEXT_CHARS = 36;
/** Valores que las páginas usan para "sin dato". */
const EMPTY_VALUE = /^[\s—–-]*$/;
const NARROW_CARDS_PX = 640;
const OVERFLOW_SLACK_PX = 8;

const skipClosest =
  '[data-table-cards="off"], .ff-legal-prose, app-punto-venta, .ff-table-skip';

const observers = new WeakMap<HTMLElement, ResizeObserver>();
const hostTables = new WeakMap<HTMLElement, HTMLTableElement>();

interface ColumnSpec {
  label: string;
  role: TableCardRole;
  wide: boolean;
}

function normalizeLabel(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function forcedRole(cell: HTMLElement): TableCardRole | null {
  const value = cell.dataset['cardRole'] as TableCardRole | undefined;
  return value && ROLES.has(value) ? value : null;
}

function isEmptyRow(row: HTMLTableRowElement): boolean {
  return row.cells.length === 1 && row.cells[0].colSpan > 1;
}

/** Celdas de la fila con su índice de columna real (respeta colspan). */
function cellsByColumn(row: HTMLTableRowElement): Array<[HTMLTableCellElement, number]> {
  const out: Array<[HTMLTableCellElement, number]> = [];
  let column = 0;
  for (const cell of Array.from(row.cells)) {
    out.push([cell, column]);
    column += Math.max(1, cell.colSpan);
  }
  return out;
}

/** Usa la última fila del thead (la más específica) y expande los colspan. */
function headerCells(table: HTMLTableElement): HTMLTableCellElement[] {
  const rows = table.tHead?.rows;
  const row = rows?.[rows.length - 1];
  if (!row) return [];
  const cells: HTMLTableCellElement[] = [];
  for (const cell of Array.from(row.cells)) {
    for (let i = 0; i < Math.max(1, cell.colSpan); i++) cells.push(cell);
  }
  return cells;
}

function bodyRows(table: HTMLTableElement): HTMLTableRowElement[] {
  return Array.from(table.tBodies).flatMap((body) => Array.from(body.rows)).filter((row) => !isEmptyRow(row));
}

function columnCells(rows: HTMLTableRowElement[], column: number): HTMLTableCellElement[] {
  const out: HTMLTableCellElement[] = [];
  for (const row of rows) {
    const match = cellsByColumn(row).find(([, index]) => index === column);
    if (match) out.push(match[0]);
  }
  return out;
}

function isSelectColumn(header: HTMLElement, label: string, cells: () => HTMLElement[]): boolean {
  if (header.querySelector(CHECKBOX)) return true;
  if (label) return false;
  const withBox = cells().filter((cell) => cell.querySelector(CHECKBOX));
  return withBox.length > 0 && withBox.every((cell) => !normalizeLabel(cell.textContent ?? ''));
}

function resolveColumns(table: HTMLTableElement): ColumnSpec[] {
  const headers = headerCells(table);
  const rows = bodyRows(table);
  const columns: ColumnSpec[] = headers.map((header, column) => {
    const label = normalizeLabel(header.textContent ?? '');
    const wide = header.hasAttribute('data-card-wide');
    const forced = forcedRole(header);
    if (forced) return { label, role: forced, wide };

    const key = label.toLowerCase();
    let role: TableCardRole = 'field';
    if (INDEX_LABELS.has(key)) role = 'index';
    else if (META_LABELS.has(key)) role = 'meta';
    else if (ACTION_LABEL.test(label)) role = 'actions';
    else if (isSelectColumn(header, label, () => columnCells(rows, column))) role = 'select';
    return { label, role, wide };
  });

  const last = columns.length - 1;
  if (last >= 0 && columns[last].role === 'field' && !columns[last].label && !forcedRole(headers[last])) {
    if (columnCells(rows, last).some((cell) => cell.querySelector(ACTION_CONTROL))) {
      columns[last].role = 'actions';
    }
  }

  if (!columns.some((column) => column.role === 'title')) {
    const isCandidate = (column: ColumnSpec) => column.role === 'field' && !!column.label;
    const preferred = TITLE_PRIORITY.map((pattern) =>
      columns.findIndex((column) => isCandidate(column) && pattern.test(column.label)),
    ).find((index) => index >= 0);
    const titleIdx = preferred ?? columns.findIndex(isCandidate);
    if (titleIdx >= 0) columns[titleIdx].role = 'title';
  }

  return columns;
}

function isHardHidden(cell: HTMLElement): boolean {
  const classes = Array.from(cell.classList);
  return classes.includes('hidden') && !classes.some((name) => RESPONSIVE_DISPLAY.test(name));
}

/** Botones de primer nivel (sin contar el <button> interno de un app-button). */
function topLevelControls(cell: HTMLElement): Element[] {
  return Array.from(cell.querySelectorAll('app-button, button, a[href]')).filter(
    (el) => !el.parentElement?.closest('app-button, button, a[href]'),
  );
}

/**
 * Sólo cuenta lo que se ve: muchas tablas muestran botones en escritorio (`hidden md:flex`)
 * y un menú ⋮ en móvil (`md:hidden`). Sin layout (tests/SSR) se usa todo.
 */
function visibleOnly<T extends Element>(elements: T[]): T[] {
  const visible = elements.filter((el) => el.getClientRects().length > 0);
  return visible.length ? visible : elements;
}

/** Un único control compacto (menú ⋮ o botón de icono) va en la cabecera; lo demás, al pie. */
function actionsLayout(cell: HTMLElement): 'header' | 'footer' {
  const controls = visibleOnly(topLevelControls(cell));
  const dropdowns = visibleOnly(Array.from(cell.querySelectorAll('app-table-dropdown')));
  const loose = controls.filter((el) => !el.closest('app-table-dropdown'));
  if (dropdowns.length === 1 && loose.length === 0) return 'header';
  if (dropdowns.length === 0 && loose.length === 1) {
    return (loose[0].textContent ?? '').trim().length > 3 ? 'footer' : 'header';
  }
  return 'footer';
}

/**
 * Ajustes que dependen del layout real: acciones visibles a este ancho y campos cuyo
 * contenido (badges, montos largos…) no cabe en media columna → pasan a ancho completo.
 */
function layoutCards(table: HTMLTableElement, measure: boolean): void {
  for (const body of Array.from(table.tBodies)) {
    for (const row of Array.from(body.rows)) {
      for (const cell of Array.from(row.cells)) {
        const role = cell.dataset['role'];
        if (role === 'actions') cell.dataset['actionsLayout'] = actionsLayout(cell);
        if (role === 'title') {
          // Sin dato en el título (p. ej. venta sin cliente): se muestra con su etiqueta.
          toggleAttr(cell, 'cardEmpty', EMPTY_VALUE.test(cell.textContent ?? '') && !cell.querySelector('img, svg, app-icon'));
        }
        if (measure && role === 'field' && cell.scrollWidth > cell.clientWidth + 1) {
          cell.dataset['cardWideAuto'] = '';
        }
      }
    }
  }
}

function isWideField(cell: HTMLTableCellElement, column: ColumnSpec | undefined): boolean {
  if (column?.wide || cell.hasAttribute('data-card-wide')) return true;
  if (cell.colSpan > 1) return true;
  if (cell.querySelector(FORM_CONTROL)) return true;
  if (topLevelControls(cell).length > 1) return true;
  return normalizeLabel(cell.textContent ?? '').length > WIDE_TEXT_CHARS;
}

function resolveHost(table: HTMLTableElement): HTMLElement {
  return (
    table.closest<HTMLElement>('.overflow-x-auto, .max-w-full') ??
    table.parentElement ??
    table
  );
}

function setCardMode(table: HTMLTableElement, host: HTMLElement, enabled: boolean): void {
  table.classList.toggle('ff-table-is-cards', enabled);
  host.classList.toggle('ff-table-is-cards', enabled);
  table.dataset['cardMode'] = enabled ? 'on' : 'off';
  // Lo visible y lo que cabe cambian con el ancho (md:hidden…): se recalcula aquí.
  if (enabled) layoutCards(table, true);
}

function measureAndApply(table: HTMLTableElement, host: HTMLElement): void {
  const containerWidth = host.clientWidth;
  if (containerWidth <= 0) return;

  if (containerWidth < NARROW_CARDS_PX) {
    setCardMode(table, host, true);
    return;
  }

  const cachedWidth = Number(table.dataset['naturalWidth'] || 0);
  if (cachedWidth > 0) {
    setCardMode(table, host, cachedWidth > containerWidth + OVERFLOW_SLACK_PX);
    return;
  }

  const wasCards = table.classList.contains('ff-table-is-cards');
  if (wasCards) {
    setCardMode(table, host, false);
  }

  const naturalWidth = table.scrollWidth;
  table.dataset['naturalWidth'] = String(naturalWidth);
  setCardMode(table, host, naturalWidth > containerWidth + OVERFLOW_SLACK_PX);
}

function observeHost(table: HTMLTableElement, host: HTMLElement): void {
  // El host puede sobrevivir a la tabla (re-render con @if): se mide siempre la tabla actual.
  hostTables.set(host, table);
  if (typeof ResizeObserver === 'undefined') return;
  if (observers.has(host)) return;
  const observer = new ResizeObserver(() => {
    const current = hostTables.get(host);
    if (current?.isConnected) measureAndApply(current, host);
  });
  observer.observe(host);
  observers.set(host, observer);
}

function toggleAttr(cell: HTMLElement, key: string, on: boolean): void {
  if (on) cell.dataset[key] = '';
  else delete cell.dataset[key];
}

const ROLE_CLASSES: Record<TableCardRole, string> = {
  index: 'ff-table-index',
  title: 'ff-table-title',
  field: 'ff-table-field',
  actions: 'ff-table-actions',
  meta: 'ff-table-meta',
  select: 'ff-table-select',
  hidden: 'ff-table-hidden',
};

function decorateRows(table: HTMLTableElement, columns: ColumnSpec[]): void {
  for (const body of Array.from(table.tBodies)) {
    for (const row of Array.from(body.rows)) {
      const empty = isEmptyRow(row);
      row.classList.toggle('ff-table-empty-row', empty);
      if (empty) continue;

      for (const [cell, index] of cellsByColumn(row)) {
        const column = columns[index];
        const role = forcedRole(cell) ?? column?.role ?? 'field';
        cell.dataset['label'] = column?.label ?? '';
        cell.dataset['role'] = role;
        for (const [name, className] of Object.entries(ROLE_CLASSES)) {
          cell.classList.toggle(className, name === role);
        }
        toggleAttr(cell, 'cardHidden', role === 'hidden' || isHardHidden(cell));
        toggleAttr(cell, 'cardWideAuto', role === 'field' && isWideField(cell, column));
        if (role !== 'actions') delete cell.dataset['actionsLayout'];
      }
    }
  }
}

export function isTableEligible(table: HTMLTableElement): boolean {
  if (table.dataset['tableCards'] === 'off') return false;
  if (table.closest(skipClosest)) return false;
  return headerCells(table).length >= 2;
}

export function enhanceTable(table: HTMLTableElement): void {
  if (!isTableEligible(table)) return;

  const columns = resolveColumns(table);
  if (columns.length < 2) return;
  const host = resolveHost(table);

  table.classList.add('ff-table-cards');
  host.classList.add('ff-table-host');

  const signature = columns.map((column) => column.label).join('|');
  if (table.dataset['cardCols'] !== signature) {
    table.dataset['cardCols'] = signature;
    delete table.dataset['naturalWidth'];
  }

  decorateRows(table, columns);
  layoutCards(table, false);
  observeHost(table, host);
  measureAndApply(table, host);
}

export function enhanceTablesIn(root: ParentNode = document): number {
  const tables = Array.from(root.querySelectorAll('table'));
  tables.forEach((table) => enhanceTable(table));
  return tables.length;
}
