import { createHmac, timingSafeEqual } from 'node:crypto';

type CheckoutInput = {
  transactionId: string;
  title: string;
  amount: string;
  payerEmail?: string;
};

type MercadoPagoPayment = {
  id?: string;
  status?: string;
  external_reference?: string;
};

export class MercadoPagoAdapter {
  private readonly accessToken = process.env.MP_ACCESS_TOKEN;
  private readonly apiUrl =
    process.env.MP_API_URL ?? 'https://api.mercadopago.com';
  private readonly webhookSecret = process.env.MP_WEBHOOK_SECRET;

  async createCheckout(input: CheckoutInput) {
    if (!this.accessToken) throw new Error('PAYMENT_PROVIDER_NOT_CONFIGURED');
    const response = await fetch(`${this.apiUrl}/checkout/preferences`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': input.transactionId,
      },
      body: JSON.stringify({
        items: [
          {
            id: input.transactionId,
            title: input.title,
            quantity: 1,
            currency_id: 'BRL',
            unit_price: Number(input.amount),
          },
        ],
        external_reference: input.transactionId,
        payer: input.payerEmail ? { email: input.payerEmail } : undefined,
        notification_url: `${process.env.WEB_PUBLIC_URL ?? 'http://localhost:3000'}/api/v1/payments/webhook/mercadopago`,
        back_urls: {
          success: `${process.env.WEB_PUBLIC_URL ?? 'http://localhost:3000'}/dashboard/pagamentos?status=success`,
          failure: `${process.env.WEB_PUBLIC_URL ?? 'http://localhost:3000'}/dashboard/pagamentos?status=failure`,
          pending: `${process.env.WEB_PUBLIC_URL ?? 'http://localhost:3000'}/dashboard/pagamentos?status=pending`,
        },
        auto_return: 'approved',
      }),
    });
    if (!response.ok) throw new Error('PAYMENT_PROVIDER_ERROR');
    const data = (await response.json()) as {
      id?: string;
      init_point?: string;
      sandbox_init_point?: string;
    };
    if (!data.id || !(data.init_point || data.sandbox_init_point))
      throw new Error('PAYMENT_CHECKOUT_INVALID_RESPONSE');
    return {
      externalId: data.id,
      checkoutUrl: data.init_point ?? data.sandbox_init_point!,
    };
  }

  async getPayment(id: string): Promise<MercadoPagoPayment> {
    if (!this.accessToken) throw new Error('PAYMENT_PROVIDER_NOT_CONFIGURED');
    const response = await fetch(
      `${this.apiUrl}/v1/payments/${encodeURIComponent(id)}`,
      {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      },
    );
    if (!response.ok) throw new Error('PAYMENT_PROVIDER_ERROR');
    return (await response.json()) as MercadoPagoPayment;
  }

  verifyWebhookSignature(
    signature: string | undefined,
    requestId: string | undefined,
    dataId: string | undefined,
  ) {
    if (!this.webhookSecret || !signature || !requestId || !dataId)
      return false;
    const parts = Object.fromEntries(
      signature
        .split(',')
        .map((part) => part.split('=').map((value) => value.trim())),
    );
    if (!parts.ts || !parts.v1) return false;
    const manifest = `id:${dataId};request-id:${requestId};ts:${parts.ts};`;
    const expected = createHmac('sha256', this.webhookSecret)
      .update(manifest)
      .digest('hex');
    const received = Buffer.from(parts.v1, 'hex');
    const calculated = Buffer.from(expected, 'hex');
    return (
      received.length === calculated.length &&
      timingSafeEqual(received, calculated)
    );
  }
}
