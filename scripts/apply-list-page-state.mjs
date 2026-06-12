#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../src/app/modules/admin/pages');

const LIST_PAGES = [
  ['formas-farmaceuticas', 'listQuery', 'totalRows()', 'No hay formas farmacéuticas registradas'],
  ['unidades', 'listQuery', 'totalRows()', 'No hay unidades registradas'],
  ['laboratorios', 'listQuery', 'totalRows()', 'No hay laboratorios registrados'],
  ['vias-administracion', 'listQuery', 'totalRows()', 'No hay vías de administración registradas'],
  ['principios-activos', 'listQuery', 'totalRows()', 'No hay principios activos registrados'],
  ['series', 'listQuery', 'totalRows()', 'No hay series registradas'],
  ['clientes', 'listQuery', 'totalRows()', 'No hay clientes registrados'],
  ['inventario-movimientos', 'listQuery', 'totalRows()', 'No hay movimientos registrados'],
  ['conjuntos-packs-promociones', 'listQuery', 'totalRows()', 'No hay conjuntos o promociones registrados'],
  ['lotes', 'lotsQuery', 'totalRows()', 'No hay lotes registrados'],
  ['productos', 'listQuery', 'totalRows()', 'No hay productos registrados'],
  ['servicios', 'listQuery', 'totalRows()', 'No hay servicios registrados'],
];

function patchTs(tsPath) {
  let src = fs.readFileSync(tsPath, 'utf8');
  if (src.includes('QueryPageStatePipe')) return;
  if (!src.includes('@Component({')) return;

  src = src.replace(
    "import { Component",
    "import { QueryPageStatePipe } from '../../../../shared/pipes/query-page-state.pipe';\nimport { Component",
  );
  src = src.replace(/imports:\s*\[/, 'imports: [\n    QueryPageStatePipe,');
  fs.writeFileSync(tsPath, src);
}

function patchListPage(folder, queryName, countExpr, emptyTitle) {
  const htmlPath = path.join(ROOT, folder, `${folder}.component.html`);
  const tsPath = path.join(ROOT, folder, `${folder}.component.ts`);
  if (!fs.existsSync(htmlPath)) return false;

  let html = fs.readFileSync(htmlPath, 'utf8');
  if (html.includes('queryPageState')) return false;
  if (!html.includes(`${queryName}.isError()`)) return false;

  html = html.replace(
    /@if\s*\(\s*\w+Query\.isError\(\)\s*\)\s*\{[\s\S]*?<\/div>\s*\}\s*\n?/g,
    '',
  );

  html = html.replace(
    /<app-component-card([^>]*)>/,
    `@let listState = ${queryName} | queryPageState: ${countExpr};\n\n<app-component-card$1\n  [loading]="listState.loading"\n  [error]="listState.error"\n  [empty]="listState.empty"\n  emptyTitle="${emptyTitle}"\n  (retry)="refetchRows()">`,
  );

  html = html.replace(
    /@empty\s*\{[\s\S]*?@if\s*\([^)]*isPending\(\)[^)]*\)[\s\S]*?\}[\s\S]*?\}/g,
    `@empty {\n            <tr>\n              <td colspan="99" class="px-5 py-4 text-center text-theme-sm text-gray-500">\n                Sin coincidencias para los filtros aplicados.\n              </td>\n            </tr>\n          }`,
  );

  patchTs(tsPath);
  fs.writeFileSync(htmlPath, html);
  return true;
}

for (const [folder, query, count, empty] of LIST_PAGES) {
  if (patchListPage(folder, query, count, empty)) {
    console.log('patched', folder);
  }
}
