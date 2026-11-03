import type { PaymentMethod } from '../models/directory.models';

export const POS_PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TARJETA', label: 'Tarjeta' },
  { value: 'YAPE', label: 'Yape' },
  { value: 'PLIN', label: 'Plin' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
];

/** Medios que pueden exigir código de operación (y lo exigen por defecto). */
export const CONFIGURABLE_REFERENCE_METHODS: PaymentMethod[] = ['YAPE', 'PLIN', 'TARJETA', 'TRANSFERENCIA'];

/** `required`: lista configurada en el establecimiento (`posPaymentReferenceMethods`). */
export function paymentRequiresReference(
  metodo: PaymentMethod,
  required: readonly PaymentMethod[] = CONFIGURABLE_REFERENCE_METHODS,
): boolean {
  return required.includes(metodo);
}

export type PosPaymentLine = {
  localId: string;
  metodo: PaymentMethod;
  monto: number;
  referencia: string;
};

export function createPaymentLine(
  metodo: PaymentMethod = 'EFECTIVO',
  monto = 0,
): PosPaymentLine {
  return {
    localId: crypto.randomUUID(),
    metodo,
    monto,
    referencia: '',
  };
}
