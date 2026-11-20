import crypto from 'node:crypto';
import { getSupabaseAdmin, hasSupabaseServerConfig } from './supabase';
import type { State } from './model';
import { balance } from './model';

export interface PaystackInitParams {
  email: string;
  amount: number; // in cents / minor currency unit (e.g. 100000 for 1000 KES)
  currency?: string;
  businessId: string;
  businessName: string;
  phoneNumber?: string;
  reference?: string;
  callbackUrl?: string;
  channels?: Array<'card' | 'bank' | 'mobile_money' | 'qr' | 'ussd'>;
}

export interface PaystackInitResponse {
  success: boolean;
  authorizationUrl?: string;
  accessCode?: string;
  reference: string;
  message?: string;
  simulated: boolean;
}

export interface PaystackVerifyResponse {
  success: boolean;
  reference: string;
  amount: number;
  currency: string;
  status: 'success' | 'failed' | 'abandoned' | 'pending';
  channel?: string;
  paidAt?: string;
  customer?: {
    email: string;
    phone?: string;
  };
  authorization?: {
    last4?: string;
    brand?: string;
    bank?: string;
  };
  metadata?: Record<string, unknown>;
  simulated: boolean;
}

/**
 * Checks if live Paystack credentials exist
 */
export function hasPaystackConfig(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY && process.env.PAYSTACK_SECRET_KEY.startsWith('sk_'));
}

/**
 * Generates a unique Paystack deposit reference
 */
export function generatePaystackReference(prefix = 'PSTK'): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${ts}-${rand}`;
}

/**
 * Initializes a Paystack deposit checkout session
 * Supports M-Pesa STK Push and Visa/Mastercard cards in KES
 */
export async function initializePaystackDeposit(params: PaystackInitParams): Promise<PaystackInitResponse> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  const reference = params.reference || generatePaystackReference();
  const currency = (params.currency || 'KES').toUpperCase();

  // If live credentials are provided, call Paystack API
  if (secretKey && secretKey.startsWith('sk_')) {
    try {
      const payload = {
        email: params.email,
        amount: params.amount,
        currency,
        reference,
        channels: params.channels || ['mobile_money', 'card', 'bank'],
        callback_url: params.callbackUrl,
        metadata: {
          businessId: params.businessId,
          businessName: params.businessName,
          phoneNumber: params.phoneNumber,
          type: 'wallet_deposit',
          source: 'ExpenseIQ Business',
        },
      };

      const res = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      });

      const data = (await res.json()) as {
        status: boolean;
        message: string;
        data?: {
          authorization_url: string;
          access_code: string;
          reference: string;
        };
      };

      if (!res.ok || !data.status || !data.data) {
        throw new Error(data.message || 'Paystack initialization failed.');
      }

      return {
        success: true,
        authorizationUrl: data.data.authorization_url,
        accessCode: data.data.access_code,
        reference: data.data.reference,
        message: data.message,
        simulated: false,
      };
    } catch (err) {
      // If error occurred with network/credentials, return descriptive error
      const message = err instanceof Error ? err.message : 'Failed to connect to Paystack gateway';
      throw new Error(message);
    }
  }

  // Realistic fallback simulation for development / preview environments
  return {
    success: true,
    authorizationUrl: undefined,
    accessCode: `sim_access_${Date.now()}`,
    reference,
    message: `Simulated Paystack session ready for ${currency} ${(params.amount / 100).toLocaleString()}`,
    simulated: true,
  };
}

/**
 * Verifies transaction with Paystack by reference
 */
export async function verifyPaystackTransaction(reference: string): Promise<PaystackVerifyResponse> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (secretKey && secretKey.startsWith('sk_')) {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
      cache: 'no-store',
    });

    const data = (await res.json()) as {
      status: boolean;
      message: string;
      data?: {
        status: string;
        reference: string;
        amount: number;
        currency: string;
        channel: string;
        paid_at: string;
        customer?: {
          email: string;
          phone?: string;
        };
        authorization?: {
          last4?: string;
          brand?: string;
          bank?: string;
        };
        metadata?: Record<string, unknown>;
      };
    };

    if (!res.ok || !data.status || !data.data) {
      throw new Error(data.message || 'Paystack verification failed.');
    }

    const d = data.data;
    return {
      success: d.status === 'success',
      reference: d.reference,
      amount: d.amount,
      currency: d.currency,
      status: d.status as PaystackVerifyResponse['status'],
      channel: d.channel,
      paidAt: d.paid_at,
      customer: d.customer,
      authorization: d.authorization,
      metadata: d.metadata,
      simulated: false,
    };
  }

  // Simulation verification
  return {
    success: true,
    reference,
    amount: 100000,
    currency: 'KES',
    status: 'success',
    channel: 'mobile_money',
    paidAt: new Date().toISOString(),
    customer: { email: 'business@expenseiq.local' },
    simulated: true,
  };
}

/**
 * Verifies Paystack Webhook HMAC SHA512 signature
 */
export function verifyPaystackWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return false;

  const hash = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');
  return hash === signature;
}

export interface CreditDepositParams {
  businessId: string;
  amount: number;
  reference: string;
  email: string;
  channel?: string;
  phoneNumber?: string;
  cardLast4?: string;
  cardBrand?: string;
  note?: string;
}

export interface CreditDepositResult {
  credited: boolean;
  alreadyExists: boolean;
  balance?: number;
}

/**
 * Safely credits business wallet ledger with idempotency guards and concurrency retries
 */
export async function creditPaystackDeposit(params: CreditDepositParams): Promise<CreditDepositResult> {
  const { businessId, amount, reference, email, channel, phoneNumber, cardLast4, cardBrand, note } = params;

  if (!hasSupabaseServerConfig()) {
    return { credited: true, alreadyExists: false };
  }

  const supabase = getSupabaseAdmin();
  const TABLE = 'expenseiq_workspace';

  const paymentMethod =
    channel === 'mobile_money'
      ? 'mpesa'
      : channel === 'card'
      ? 'card'
      : channel === 'bank'
      ? 'bank'
      : 'paystack';

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase.from(TABLE).select('payload, version').eq('id', 1).maybeSingle();
    if (error || !data) throw error || new Error('Workspace not found in database');

    const state = data.payload as State;
    const business = state.businesses.find(b => b.id === businessId);
    if (!business) throw new Error(`Business ${businessId} not found`);

    // Idempotency: don't double credit if already recorded
    const existingEntry = business.ledger.find(l => l.reference === reference);
    if (existingEntry) {
      return { credited: true, alreadyExists: true, balance: balance(business) };
    }

    const defaultNote =
      note ||
      (paymentMethod === 'mpesa'
        ? `M-Pesa deposit via Paystack (${reference}${phoneNumber ? ` from ${phoneNumber}` : ''})`
        : paymentMethod === 'card'
        ? `Card deposit via Paystack (${cardBrand || 'Card'}${cardLast4 ? ` •••• ${cardLast4}` : ''} Ref: ${reference})`
        : `Paystack deposit (Ref: ${reference})`);

    business.ledger.unshift({
      id: crypto.randomUUID(),
      amount,
      note: defaultNote,
      actor: email,
      date: new Date().toISOString(),
      type: 'deposit',
      paymentMethod,
      reference,
      phoneNumber,
      cardLast4,
      cardBrand,
    });

    business.audit.unshift({
      id: crypto.randomUUID(),
      actor: email,
      action: `Deposited funds via ${paymentMethod.toUpperCase()} (Ref: ${reference})`,
      date: new Date().toISOString(),
    });

    const updateRes = await supabase
      .from(TABLE)
      .update({
        payload: state,
        version: data.version + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)
      .eq('version', data.version)
      .select('version')
      .maybeSingle();

    if (updateRes.error) throw updateRes.error;
    if (updateRes.data) {
      return { credited: true, alreadyExists: false, balance: balance(business) };
    }
  }

  throw new Error('Workspace update concurrency conflict. Please retry.');
}
