import { COOKIE_KEYS, getRequestCookie } from '@/lib/cookies';
import { hasSupabaseServerConfig, userEmailFromToken } from '@/lib/supabase';
import { initiateMpesaStkPush, processCardDeposit, type PaymentMethodType } from '@/lib/payment';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function trustedHeaderEmail(request: Request) {
  const id = request.headers.get('oai-authenticated-user-id');
  const email = request.headers.get('oai-authenticated-user-email')?.trim().toLowerCase();
  return id && email ? email : null;
}

async function identity(request: Request) {
  const token =
    request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] ||
    getRequestCookie(request, COOKIE_KEYS.AUTH_TOKEN) ||
    getRequestCookie(request, 'sb-access-token');

  if (token && hasSupabaseServerConfig()) {
    const email = await userEmailFromToken(token);
    if (email) return email;
  }

  const trustedEmail = trustedHeaderEmail(request);
  if (trustedEmail) return trustedEmail;

  // If in localhost/sandbox development environment, allow fallback
  const isPreview = process.env.NODE_ENV !== 'production';
  if (isPreview) {
    return 'demo@expenseiq.local';
  }

  throw new Error('Sign in to deposit funds into your business wallet.');
}

export async function POST(request: Request) {
  try {
    const email = await identity(request);
    const body = (await request.json()) as Record<string, unknown>;
    const method = body.method as PaymentMethodType;
    const amount = Number(body.amount);
    const businessId = String(body.businessId || '');
    const businessName = String(body.businessName || 'ExpenseIQ Business');

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return Response.json({ error: 'Enter a valid positive deposit amount.' }, { status: 400 });
    }

    if (!businessId) {
      return Response.json({ error: 'Business ID is required.' }, { status: 400 });
    }

    if (method === 'mpesa') {
      const phoneNumber = String(body.phoneNumber || body.phone || '');
      const result = await initiateMpesaStkPush({
        phoneNumber,
        amount,
        businessId,
        businessName,
        accountReference: String(body.reference || ''),
      });
      return Response.json({
        ...result,
        method: 'mpesa',
        depositedBy: email,
      });
    }

    if (method === 'card') {
      const result = await processCardDeposit({
        cardNumber: String(body.cardNumber || ''),
        expiry: String(body.expiry || ''),
        cvc: String(body.cvc || ''),
        cardholderName: String(body.cardholderName || ''),
        amount,
        currency: String(body.currency || 'KES'),
        businessId,
      });
      return Response.json({
        ...result,
        method: 'card',
        depositedBy: email,
      });
    }

    if (method === 'bank') {
      const reference = String(body.reference || `BANK-${Date.now().toString(36).toUpperCase()}`);
      return Response.json({
        success: true,
        method: 'bank',
        reference,
        message: 'Bank transfer reference logged for wallet credit.',
        depositedBy: email,
      });
    }

    return Response.json({ error: 'Unsupported payment method.' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Deposit initiation failed.';
    return Response.json({ error: message }, { status: 400 });
  }
}
