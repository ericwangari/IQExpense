import { verifyPaystackWebhookSignature, creditPaystackDeposit } from '@/lib/paystack';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    // If live Paystack secret key is configured, verify HMAC signature
    if (process.env.PAYSTACK_SECRET_KEY) {
      const isValid = verifyPaystackWebhookSignature(rawBody, signature);
      if (!isValid) {
        return Response.json({ error: 'Invalid webhook signature.' }, { status: 401 });
      }
    }

    let payload: {
      event?: string;
      data?: {
        status?: string;
        reference?: string;
        amount?: number;
        currency?: string;
        channel?: string;
        customer?: { email?: string; phone?: string };
        authorization?: { last4?: string; brand?: string };
        metadata?: {
          businessId?: string;
          businessName?: string;
          phoneNumber?: string;
          type?: string;
        };
      };
    };

    try {
      payload = JSON.parse(rawBody);
    } catch {
      return Response.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }

    const { event, data } = payload;

    if (event === 'charge.success' && data && data.status === 'success') {
      const businessId = data.metadata?.businessId;
      const reference = data.reference;
      const amount = data.amount;
      const email = data.customer?.email || 'customer@paystack.com';

      if (businessId && reference && amount) {
        await creditPaystackDeposit({
          businessId,
          amount,
          reference,
          email,
          channel: data.channel,
          phoneNumber: data.metadata?.phoneNumber || data.customer?.phone,
          cardLast4: data.authorization?.last4,
          cardBrand: data.authorization?.brand,
        });
      }
    }

    return Response.json({ received: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing error';
    console.error('Paystack webhook error:', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
