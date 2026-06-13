import type { PaymentMethod } from '../models/directory.models';

export const POS_PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TARJETA', label: 'Tarjeta' },
  { value: 'YAPE', label: 'Yape' },
  { value: 'PLIN', label: 'Plin' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
];

const METHODS_REQUIRING_REFERENCE: PaymentMethod[] = ['YAPE', 'PLIN', 'TARJETA', 'TRANSFERENCIA'];

export function paymentRequiresReference(metodo: PaymentMethod): boolean {
  return METHODS_REQUIRING_REFERENCE.includes(metodo);
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
