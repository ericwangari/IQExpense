import { COOKIE_KEYS, getRequestCookie } from '@/lib/cookies';
import { hasSupabaseServerConfig, userEmailFromToken } from '@/lib/supabase';
import { verifyPaystackTransaction, creditPaystackDeposit } from '@/lib/paystack';

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

  if (process.env.NODE_ENV !== 'production') {
    return 'demo@expenseiq.local';
  }

  throw new Error('Sign in to verify your business deposit.');
}

export async function GET(request: Request) {
  try {
    const userEmail = await identity(request);
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference')?.trim();
    const businessId = searchParams.get('businessId')?.trim();

    if (!reference) {
      return Response.json({ error: 'Deposit reference is required.' }, { status: 400 });
    }

    if (!businessId) {
      return Response.json({ error: 'Business ID is required.' }, { status: 400 });
    }

    const verification = await verifyPaystackTransaction(reference);

    if (verification.status === 'success') {
      const creditResult = await creditPaystackDeposit({
        businessId,
        amount: verification.amount,
        reference,
        email: userEmail,
        channel: verification.channel,
        phoneNumber: verification.customer?.phone,
        cardLast4: verification.authorization?.last4,
        cardBrand: verification.authorization?.brand,
      });

      return Response.json({
        success: true,
        status: 'success',
        reference,
        amount: verification.amount,
        currency: verification.currency,
        channel: verification.channel,
        credited: creditResult.credited,
        alreadyCredited: creditResult.alreadyExists,
        balance: creditResult.balance,
        simulated: verification.simulated,
      });
    }

    return Response.json({
      success: false,
      status: verification.status,
      reference,
      message: `Transaction is currently ${verification.status}.`,
      simulated: verification.simulated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to verify Paystack transaction.';
    return Response.json({ error: message }, { status: 500 });
  }
}
