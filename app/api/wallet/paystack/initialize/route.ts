import { COOKIE_KEYS, getRequestCookie } from '@/lib/cookies';
import { hasSupabaseServerConfig, userEmailFromToken } from '@/lib/supabase';
import { initializePaystackDeposit } from '@/lib/paystack';

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

  throw new Error('Sign in to deposit funds into your business wallet.');
}

export async function POST(request: Request) {
  try {
    const userEmail = await identity(request);
    const body = (await request.json()) as Record<string, unknown>;

    const amount = Number(body.amount);
    if (!amount || !Number.isSafeInteger(amount) || amount <= 0) {
      return Response.json({ error: 'Enter a valid positive deposit amount in cents.' }, { status: 400 });
    }

    const businessId = String(body.businessId || '').trim();
    if (!businessId) {
      return Response.json({ error: 'Business ID is required.' }, { status: 400 });
    }

    const businessName = String(body.businessName || 'ExpenseIQ Business').trim();
    const currency = String(body.currency || 'KES').toUpperCase();
    const phoneNumber = body.phoneNumber ? String(body.phoneNumber).trim() : undefined;
    const channels = Array.isArray(body.channels) ? (body.channels as Array<'card' | 'bank' | 'mobile_money' | 'qr' | 'ussd'>) : undefined;
    const callbackUrl = body.callbackUrl ? String(body.callbackUrl) : undefined;

    const result = await initializePaystackDeposit({
      email: userEmail,
      amount,
      currency,
      businessId,
      businessName,
      phoneNumber,
      channels,
      callbackUrl,
    });

    return Response.json({
      ...result,
      userEmail,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to initialize Paystack deposit.';
    return Response.json({ error: message }, { status: 500 });
  }
}
