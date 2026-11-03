import { Injectable } from '@angular/core';

type Cell = string | number;

/** Columnas que no son datos: índice, selección y acciones (roles que asigna table-cards). */
const SKIP_ROLES = new Set(['actions', 'select', 'index']);
const SKIP_HEADER = /^(#|n[°º]|acci[oó]n(es)?|)$/i;
/** Montos y cantidades en formato es-PE ("S/ 1,234.50", "1,234", "-3.5", "12%"). */
const NUMERIC = /^-?(S\/\s?)?\d{1,3}(,\d{3})*(\.\d+)?%?$|^-?(S\/\s?)?\d+(\.\d+)?%?$/;
const WAIT_STEP_MS = 120;
const PAGE_TIMEOUT_MS = 10_000;

export type ExportProgress = (page: number, totalPages: number) => void;

/**
 * Exporta a Excel el listado principal de una pantalla tal como el usuario lo ve
 * (mismos filtros y columnas), recorriendo todas las páginas de su `<app-pagination>`.
 * Funciona en cualquier listado sin configurarlo uno por uno.
 */
@Injectable({ providedIn: 'root' })
export class TableExcelExportService {
  /** Tabla principal dentro de `scope` (la que tiene más filas, fuera de modales). */
  findMainTable(scope: ParentNode): HTMLTableElement | null {
    const tables = Array.from(scope.querySelectorAll<HTMLTableElement>('table')).filter(
      (t) => !t.closest('app-modal, [role="dialog"], [data-excel-ignore]') && t.tHead,
    );
    if (!tables.length) return null;
    return tables.reduce((best, t) => (bodyRows(t).length > bodyRows(best).length ? t : best), tables[0]);
  }

  hasExportableTable(scope: ParentNode): boolean {
    const table = this.findMainTable(scope);
    return !!table && columnsOf(table).length > 0;
  }

  async exportScope(scope: HTMLElement, fileBase: string, onProgress?: ExportProgress): Promise<number> {
    const table = this.findMainTable(scope);
    if (!table) throw new Error('No hay un listado para exportar en esta pantalla.');
    const pager = this.findPager(scope, table);
    const columns = columnsOf(table);
    if (!columns.length) throw new Error('El listado no tiene columnas para exportar.');

    const rows: Cell[][] = [];
    const originalPage = pager ? currentPage(pager) : 1;
    const totalPages = pager ? pageCount(pager) : 1;

    if (pager && originalPage !== 1) await this.goToPage(pager, 1, () => this.findMainTable(scope));
    for (let page = 1; page <= totalPages; page++) {
      onProgress?.(page, totalPages);
      if (pager) await waitFor(() => pageReady(pager, page, this.findMainTable(scope)), true);
      const current = this.findMainTable(scope);
      if (current) rows.push(...readRows(current, columns));
      if (page < totalPages && pager) {
        const moved = await this.goToPage(pager, page + 1, () => this.findMainTable(scope));
        if (!moved) break;
      }
    }
    if (pager && totalPages > 1 && originalPage !== totalPages) {
      await this.goToPage(pager, originalPage, () => this.findMainTable(scope));
    }

    const expected = pager ? rangeOf(pager)?.total : undefined;
    if (expected !== undefined && rows.length < expected) {
      throw new Error(`Solo se pudieron leer ${rows.length} de ${expected} filas. Espera a que cargue el listado y vuelve a intentarlo.`);
    }

    const XLSX = await import('xlsx');
    const sheet = XLSX.utils.aoa_to_sheet([columns.map((c) => c.label), ...rows]);
    sheet['!cols'] = columns.map((c, i) => ({
      wch: Math.min(48, Math.max(c.label.length, ...rows.slice(0, 200).map((r) => String(r[i] ?? '').length)) + 2),
    }));
    sheet['!autofilter'] = { ref: sheet['!ref'] ?? 'A1' };
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, sheetName(fileBase));
    XLSX.writeFile(book, `${safeFileName(fileBase)}-${today()}.xlsx`, { compression: true });
    return rows.length;
  }

  private findPager(scope: ParentNode, table: HTMLTableElement): HTMLElement | null {
    const pagers = Array.from(scope.querySelectorAll<HTMLElement>('app-pagination')).filter((p) => !p.closest('app-modal'));
    if (!pagers.length) return null;
    // La paginación que sigue a la tabla en el documento.
    return (
      pagers.find((p) => table.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_FOLLOWING) ?? pagers[0]
    );
  }

  /**
   * Navega con los botones de la paginación y espera a que la tabla muestre esa página.
   * Reintenta: al entrar a una pantalla, sus filtros pueden reiniciarla a la página 1.
   */
  private async goToPage(pager: HTMLElement, target: number, table: () => HTMLTableElement | null): Promise<boolean> {
    for (let attempt = 0; attempt < 3; attempt++) {
      for (let guard = 0; guard < 400 && currentPage(pager) !== target; guard++) {
        const direct = pager.querySelector<HTMLButtonElement>(`button[aria-label="Ir a página ${target}"]`);
        const step = currentPage(pager) < target
          ? pager.querySelector<HTMLButtonElement>('button[aria-label="Página siguiente"]')
          : pager.querySelector<HTMLButtonElement>('button[aria-label="Página anterior"]');
        const button = direct ?? step;
        if (!button || button.disabled) break;
        const from = currentPage(pager);
        button.click();
        if (!(await waitFor(() => currentPage(pager) !== from, true, 3_000))) break;
      }
      if (await waitFor(() => pageReady(pager, target, table()), true, 4_000)) return true;
    }
    return false;
  }
}

type Column = { index: number; label: string };

function bodyRows(table: HTMLTableElement): HTMLTableRowElement[] {
  return Array.from(table.tBodies)
    .flatMap((b) => Array.from(b.rows))
    .filter((r) => !(r.cells.length === 1 && r.cells[0].colSpan > 1));
}

function columnsOf(table: HTMLTableElement): Column[] {
  const head = table.tHead?.rows[table.tHead.rows.length - 1];
  if (!head) return [];
  const sample = bodyRows(table)[0];
  const out: Column[] = [];
  let index = 0;
  for (const th of Array.from(head.cells)) {
    const label = clean(th.innerText || th.textContent || '');
    const role = th.dataset['cardRole'] ?? sample?.cells[index]?.dataset['role'] ?? '';
    const onlyControls = sample?.cells[index] && !clean(sample.cells[index].innerText) && sample.cells[index].querySelector('button, input, app-checkbox');
    if (!SKIP_HEADER.test(label) && !SKIP_ROLES.has(role) && !onlyControls) out.push({ index, label });
    index += th.colSpan || 1;
  }
  return out;
}

function readRows(table: HTMLTableElement, columns: Column[]): Cell[][] {
  return bodyRows(table).map((row) => columns.map((c) => toCell(row.cells[c.index])));
}

function toCell(td: HTMLTableCellElement | undefined): Cell {
  if (!td) return '';
  // Controles de formulario dentro de la celda: su valor, no el texto del DOM.
  const control = td.querySelector<HTMLInputElement | HTMLSelectElement>('input:not([type=checkbox]), select');
  const text = clean(control ? control.value : visibleText(td));
  if (NUMERIC.test(text)) {
    const n = Number(text.replace(/S\/\s?|,|%/g, ''));
    if (Number.isFinite(n) && !/^0\d/.test(text)) return n;
  }
  return text === '—' ? '' : text;
}

/**
 * Elementos decorativos dentro de una celda que no son dato (avatar con iniciales, iconos).
 * Los botones no: un número clicable (p. ej. T. Stock) sí es dato.
 */
const DECORATION = 'app-avatar-text, [aria-hidden="true"], [role="img"], app-icon, iconify-icon, svg';

/** Texto que ve el usuario en la celda, sin las iniciales del avatar. */
function visibleText(td: HTMLTableCellElement): string {
  let text = td.innerText || td.textContent || '';
  for (const el of Array.from(td.querySelectorAll<HTMLElement>(DECORATION))) {
    const t = (el.innerText || '').trim();
    if (t) text = text.replace(t, ' ');
  }
  return text;
}

/** "Mostrando 11 a 20 de 57" → { from: 11, to: 20, total: 57 }. */
function rangeOf(pager: HTMLElement): { from: number; to: number; total: number } | null {
  const m = /Mostrando\s+(\d+)\s+a\s+(\d+)\s+de\s+(\d+)/i.exec((pager.textContent ?? '').replace(/\s+/g, ' '));
  return m ? { from: Number(m[1]), to: Number(m[2]), total: Number(m[3]) } : null;
}

/** La página `page` está pintada: la paginación la marca activa y la tabla tiene sus filas. */
function pageReady(pager: HTMLElement, page: number, table: HTMLTableElement | null): boolean {
  if (!table || isLoading(table) || currentPage(pager) !== page) return false;
  const range = rangeOf(pager);
  if (!range) return true;
  const expected = range.total === 0 ? 0 : range.to - range.from + 1;
  return bodyRows(table).length === expected;
}

function currentPage(pager: HTMLElement): number {
  const active = pager.querySelector('[aria-current="page"]');
  if (active) return Number(active.textContent?.trim()) || 1;
  const m = /Página\s+(\d+)\s+de\s+(\d+)/i.exec(pager.textContent ?? '');
  return m ? Number(m[1]) : 1;
}

function pageCount(pager: HTMLElement): number {
  const m = /Página\s+(\d+)\s+de\s+(\d+)/i.exec(pager.textContent ?? '');
  if (m) return Math.max(1, Number(m[2]));
  const nums = Array.from(pager.querySelectorAll('button[aria-label^="Ir a página"]')).map((b) => Number(b.textContent?.trim()) || 1);
  return Math.max(1, ...nums);
}

function isLoading(table: HTMLTableElement | null): boolean {
  return !table || !!table.closest('[aria-busy="true"]');
}

async function waitFor(cond: () => boolean, checkNow = false, timeoutMs = PAGE_TIMEOUT_MS): Promise<boolean> {
  if (checkNow && cond()) return true;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, WAIT_STEP_MS));
    if (cond()) {
      // Deja terminar el render de la página nueva.
      await new Promise((r) => setTimeout(r, WAIT_STEP_MS));
      return true;
    }
  }
  return false;
}

function clean(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function safeFileName(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '') || 'listado';
}

function sheetName(name: string): string {
  return name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Listado';
}
