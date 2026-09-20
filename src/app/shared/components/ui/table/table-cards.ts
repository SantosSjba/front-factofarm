export type TableCardRole = 'index' | 'title' | 'field' | 'actions';

const INDEX_LABELS = new Set(['#', 'n°', 'nº', 'nro', 's. no.', 's.no.']);
const ACTION_LABEL = /acci[oó]n(es)?/i;
const NARROW_CARDS_PX = 640;
const OVERFLOW_SLACK_PX = 8;

const skipClosest =
  '[data-table-cards="off"], .ff-legal-prose, app-punto-venta, .ff-table-skip';

const observers = new WeakMap<HTMLElement, ResizeObserver>();

function normalizeLabel(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function headerLabels(table: HTMLTableElement): string[] {
  const row = table.tHead?.rows[0];
  if (!row) return [];
  return Array.from(row.cells).map((cell) => normalizeLabel(cell.textContent ?? ''));
}

function cellHasActions(cell: HTMLElement): boolean {
  return Boolean(
    cell.querySelector(
      'app-button, app-table-dropdown, button, a[href], [dropdown-button]',
    ),
  );
}

function resolveRoles(
  labels: string[],
  sampleRow: HTMLTableRowElement | undefined,
): TableCardRole[] {
  const roles: TableCardRole[] = labels.map((label) => {
    const key = label.toLowerCase();
    if (INDEX_LABELS.has(key)) return 'index';
    if (ACTION_LABEL.test(label)) return 'actions';
    return 'field';
  });

  const last = roles.length - 1;
  if (last >= 0 && roles[last] === 'field' && !labels[last]) {
    const lastCell = sampleRow?.cells[last];
    if (lastCell && cellHasActions(lastCell)) {
      roles[last] = 'actions';
    }
  }

  const titleIdx = roles.findIndex((role) => role === 'field');
  if (titleIdx >= 0) roles[titleIdx] = 'title';

  return roles;
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
  if (typeof ResizeObserver === 'undefined') return;
  if (observers.has(host)) return;
  const observer = new ResizeObserver(() => measureAndApply(table, host));
  observer.observe(host);
  observers.set(host, observer);
}

function decorateRows(table: HTMLTableElement, labels: string[], roles: TableCardRole[]): void {
  for (const body of Array.from(table.tBodies)) {
    for (const row of Array.from(body.rows)) {
      const empty = row.cells.length === 1 && row.cells[0].colSpan > 1;
      row.classList.toggle('ff-table-empty-row', empty);
      if (empty) continue;

      Array.from(row.cells).forEach((cell, index) => {
        const role = roles[index] ?? 'field';
        const label = labels[index] ?? '';
        cell.dataset['label'] = label;
        cell.dataset['role'] = role;
        cell.classList.toggle('ff-table-index', role === 'index');
        cell.classList.toggle('ff-table-title', role === 'title');
        cell.classList.toggle('ff-table-field', role === 'field');
        cell.classList.toggle('ff-table-actions', role === 'actions');
      });
    }
  }
}

export function isTableEligible(table: HTMLTableElement): boolean {
  if (table.dataset['tableCards'] === 'off') return false;
  if (table.closest(skipClosest)) return false;
  const headers = table.tHead?.rows[0]?.cells.length ?? 0;
  return headers >= 2;
}

export function enhanceTable(table: HTMLTableElement): void {
  if (!isTableEligible(table)) return;

  const labels = headerLabels(table);
  if (labels.length < 2) return;

  const sampleRow = Array.from(table.tBodies[0]?.rows ?? []).find(
    (row) => !(row.cells.length === 1 && row.cells[0].colSpan > 1),
  );
  const roles = resolveRoles(labels, sampleRow);
  const host = resolveHost(table);

  table.classList.add('ff-table-cards');
  host.classList.add('ff-table-host');

  const signature = labels.join('|');
  if (table.dataset['cardCols'] !== signature) {
    table.dataset['cardCols'] = signature;
    delete table.dataset['naturalWidth'];
  }

  decorateRows(table, labels, roles);
  observeHost(table, host);
  measureAndApply(table, host);
}

export function enhanceTablesIn(root: ParentNode = document): number {
  const tables = Array.from(root.querySelectorAll('table'));
  tables.forEach((table) => enhanceTable(table));
  return tables.length;
}
