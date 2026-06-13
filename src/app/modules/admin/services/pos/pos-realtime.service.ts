import { Injectable, inject } from '@angular/core';
import { io, type Socket } from 'socket.io-client';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/services/auth.service';
import type { SunatDocumentStatus } from '../../models/directory.models';

export const POS_REALTIME_EVENTS = {
  STOCK_UPDATED: 'stock.updated',
  SALE_COMPLETED: 'sale.completed',
  BILLING_STATUS: 'billing.status',
} as const;

export type BillingStatusPayload = {
  saleId: string;
  sunatStatus: SunatDocumentStatus;
  sunatCodigo?: string | null;
  sunatDescripcion?: string | null;
};

type EventHandler = {
  onStockUpdated?: (payload: { warehouseId: string; productId?: string }) => void;
  onSaleCompleted?: (payload: {
    saleId: string;
    total: string;
    documentType: string;
    serie?: string | null;
    numero?: string | null;
  }) => void;
  onBillingStatus?: (payload: BillingStatusPayload) => void;
};

@Injectable({ providedIn: 'root' })
export class PosRealtimeService {
  private readonly auth = inject(AuthService);
  private socket: Socket | null = null;
  private handlers: EventHandler = {};

  connect(handlers: EventHandler) {
    this.handlers = handlers;
    const token = this.auth.getAccessToken();
    if (!token) return;

    if (this.socket?.connected) return;

    const origin = environment.apiBaseUrl.replace(/\/api\/v1\/?$/, '');
    this.socket = io(`${origin}/realtime`, {
      transports: ['websocket'],
      auth: { token },
    });

    this.socket.on(POS_REALTIME_EVENTS.STOCK_UPDATED, (payload) => {
      this.handlers.onStockUpdated?.(payload);
    });
    this.socket.on(POS_REALTIME_EVENTS.SALE_COMPLETED, (payload) => {
      this.handlers.onSaleCompleted?.(payload);
    });
    this.socket.on(POS_REALTIME_EVENTS.BILLING_STATUS, (payload) => {
      this.handlers.onBillingStatus?.(payload);
    });
  }

  joinSale(saleId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('join-sale', saleId);
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.handlers = {};
  }
}
