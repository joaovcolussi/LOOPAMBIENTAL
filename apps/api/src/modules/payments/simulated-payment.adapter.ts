import type {
  CheckoutInput,
  CheckoutResult,
  PaymentProvider,
} from './payment-provider';

/**
 * Sandbox provider used by the demo environment. It never contacts a real
 * gateway: the checkout URL points to a LOOP AMBIENTAL page where the user
 * approves or refuses the simulated charge.
 */
export class SimulatedPaymentAdapter implements PaymentProvider {
  readonly name = 'SIMULATED' as const;

  createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const webUrl = process.env.WEB_PUBLIC_URL ?? 'http://localhost:3000';
    return Promise.resolve({
      externalId: `sim_${input.transactionId}`,
      checkoutUrl: `${webUrl}/pagamento-simulado/${input.transactionId}`,
    });
  }
}
