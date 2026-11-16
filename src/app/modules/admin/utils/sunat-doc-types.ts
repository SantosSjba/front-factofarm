import type { CustomerDocumentTypeDto } from '../models/directory.models';

/** Catálogo 06 de SUNAT (tipo de documento de identidad) con nombres que entiende el usuario. */
export const SUNAT_DOC_TYPE_OPTIONS = [
  { value: '6', label: 'RUC' },
  { value: '1', label: 'DNI' },
  { value: '4', label: 'Carnet de extranjería' },
  { value: '7', label: 'Pasaporte' },
  { value: '0', label: 'Otro / sin documento' },
];

/** Código SUNAT a partir del tipo de documento guardado en clientes y proveedores. */
export const SUNAT_DOC_TYPE_FROM_PARTY: Record<CustomerDocumentTypeDto, string> = {
  RUC: '6',
  DNI: '1',
  CE: '4',
  PASAPORTE: '7',
  DOC_SIN_RUC: '0',
  OTRO: '0',
};

const SHORT: Record<string, string> = { '6': 'RUC', '1': 'DNI', '4': 'CE', '7': 'Pasaporte', '0': 'Doc.' };

/** «RUC», «DNI»… para mostrar junto al número. */
export function sunatDocTypeShort(code: string | null | undefined): string {
  return (code && SHORT[code]) || 'Doc.';
}
