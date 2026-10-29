import { MercadoPagoAdapter } from './mercado-pago.adapter';
import { SimulatedPaymentAdapter } from './simulated-payment.adapter';

export type CheckoutInput = {
  transactionId: string;
  title: string;
  amount: string;
  payerEmail?: string;
};

export type CheckoutResult = { externalId: string; checkoutUrl: string };

export type ProviderPayment = {
  id?: string;
  status?: string;
  external_reference?: string;
};

/**
 * Adapter boundary for payment providers. The domain only depends on this
 * contract, so the simulated sandbox and Mercado Pago are interchangeable.
 */
export interface PaymentProvider {
  readonly name: 'MERCADO_PAGO' | 'SIMULATED';
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
}

export function resolvePaymentProviderName(): PaymentProvider['name'] {
  const configured = (process.env.PAYMENT_PROVIDER ?? '').trim().toLowerCase();
  if (configured === 'mercadopago') return 'MERCADO_PAGO';
  if (configured === 'simulated') return 'SIMULATED';
  // Outside production the platform runs as a study/demo environment, so no
  // real money can move unless Mercado Pago is explicitly selected.
  return process.env.NODE_ENV === 'production' ? 'MERCADO_PAGO' : 'SIMULATED';
}

export function createPaymentProvider(): PaymentProvider {
  return resolvePaymentProviderName() === 'MERCADO_PAGO'
    ? new MercadoPagoAdapter()
    : new SimulatedPaymentAdapter();
}
